import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import {
  AccessToken,
  ParticipantInfo_State,
  RoomServiceClient,
  TrackSource,
  WebhookReceiver,
  type ParticipantInfo,
} from 'livekit-server-sdk';
import { CHANNEL_TYPE, ChannelsService } from '../channels/channels.service';
import { DrizzleService } from '../database/drizzle.service';
import { channels } from '../database/schema';
import { ChatGateway } from '../gateway/chat.gateway';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { VOICE_CONFIG, type VoiceConfig } from './voice.config';

export type VoiceParticipant = {
  userId: string;
  name: string;
  muted: boolean;
  deafened: boolean;
  joinedAt: string;
};

export type VoiceToken = {
  serverUrl: string;
  token: string;
  roomName: string;
  /** False when the user may listen but not talk (no SEND_MESSAGES in the channel). */
  canSpeak: boolean;
};

/** Set by the client on its own participant; see `canUpdateOwnMetadata`. */
const DEAFENED_ATTRIBUTE = 'deafened';

/**
 * Every viewer of a workspace refetches participants when someone joins or
 * leaves, so a short cache keeps that fan-out to one LiveKit call per room.
 */
const PARTICIPANTS_CACHE_MS = 3_000;

/** `ParticipantInfo_Kind.STANDARD` — a person, not an agent, egress, or SIP leg. The SDK doesn't re-export the enum. */
const STANDARD_PARTICIPANT_KIND = 0;

const ROOM_CHANGE_EVENTS = new Set([
  'room_finished',
  'participant_joined',
  'participant_left',
  'participant_connection_aborted',
  'track_published',
  'track_unpublished',
]);

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly roomService: RoomServiceClient | null;
  private readonly webhookReceiver: WebhookReceiver | null;
  private readonly participantsCache = new Map<
    string,
    { expiresAt: number; participants: Promise<VoiceParticipant[]> }
  >();

  constructor(
    @Inject(VOICE_CONFIG) private readonly config: VoiceConfig | null,
    private readonly drizzle: DrizzleService,
    private readonly channelsService: ChannelsService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
    private readonly chatGateway: ChatGateway,
  ) {
    this.roomService = config
      ? new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret)
      : null;
    this.webhookReceiver = config
      ? new WebhookReceiver(config.apiKey, config.apiSecret)
      : null;
  }

  async createToken(
    workspaceId: string,
    channelId: string,
    user: { id: string; name: string },
  ): Promise<VoiceToken> {
    const config = this.requireConfig();
    await this.requireVoiceChannel(workspaceId, channelId, user.id);

    const canSpeak =
      await this.workspacePermissionsService.hasChannelPermission(
        workspaceId,
        channelId,
        user.id,
        PERMISSIONS.SEND_MESSAGES,
      );

    const roomName = this.roomNameFor(channelId);
    // Identity is the user ID, so joining from a second tab or device replaces
    // the first connection instead of showing the same person twice.
    const accessToken = new AccessToken(config.apiKey, config.apiSecret, {
      identity: user.id,
      name: user.name,
      ttl: config.tokenTtlSeconds,
    });
    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canSubscribe: true,
      canPublish: canSpeak,
      canPublishSources: canSpeak ? [TrackSource.MICROPHONE] : [],
      canPublishData: false,
      canUpdateOwnMetadata: true,
    });

    return {
      serverUrl: config.serverUrl,
      token: await accessToken.toJwt(),
      roomName,
      canSpeak,
    };
  }

  /** Who is in each voice channel the viewer can see; empty channels are omitted. */
  async listParticipants(
    workspaceId: string,
    userId: string,
  ): Promise<Record<string, VoiceParticipant[]>> {
    this.requireConfig();
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const voiceChannels = await this.drizzle.db
      .select({ id: channels.id })
      .from(channels)
      .where(
        and(
          eq(channels.workspaceId, workspaceId),
          eq(channels.channelType, CHANNEL_TYPE.VOICE),
        ),
      );
    const viewable =
      await this.workspacePermissionsService.filterViewableChannelIds(
        workspaceId,
        userId,
        voiceChannels.map((channel) => channel.id),
      );
    const channelIds = [...viewable];
    if (channelIds.length === 0) return {};

    const byRoom = await this.loadRoomParticipants(
      channelIds.map((id) => this.roomNameFor(id)),
    );

    const result: Record<string, VoiceParticipant[]> = {};
    for (const channelId of channelIds) {
      const participants = byRoom.get(this.roomNameFor(channelId)) ?? [];
      if (participants.length > 0) result[channelId] = participants;
    }
    return result;
  }

  /**
   * Called by a client right after it joins or leaves, so everyone else's
   * sidebar updates without waiting for a webhook (which can't reach a local
   * API) or the next poll.
   */
  async syncChannel(workspaceId: string, channelId: string, userId: string) {
    this.requireConfig();
    await this.requireVoiceChannel(workspaceId, channelId, userId);
    this.publishRoomChange(workspaceId, channelId);
  }

  async handleWebhook(rawBody: Buffer | undefined, authHeader?: string) {
    if (!this.webhookReceiver) {
      throw new ServiceUnavailableException('Voice is not configured');
    }
    if (!rawBody?.length) {
      throw new BadRequestException('Missing webhook body');
    }

    const event = await this.webhookReceiver
      .receive(rawBody.toString('utf8'), authHeader)
      .catch(() => {
        throw new UnauthorizedException('Invalid webhook signature');
      });

    const roomName = event.room?.name;
    if (!roomName || !ROOM_CHANGE_EVENTS.has(event.event)) return;

    const channelId = this.channelIdFromRoom(roomName);
    if (!channelId) return;

    const [channel] = await this.drizzle.db
      .select({ workspaceId: channels.workspaceId })
      .from(channels)
      .where(
        and(
          eq(channels.id, channelId),
          eq(channels.channelType, CHANNEL_TYPE.VOICE),
        ),
      );
    if (!channel) return;

    this.publishRoomChange(channel.workspaceId, channelId);
  }

  private publishRoomChange(workspaceId: string, channelId: string) {
    this.participantsCache.delete(this.roomNameFor(channelId));
    this.chatGateway.emitVoiceParticipantsChanged(workspaceId, channelId);
  }

  private async requireVoiceChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    // Checks workspace membership and VIEW_CHANNEL; 404s otherwise.
    const channel = await this.channelsService.findOne(
      workspaceId,
      channelId,
      userId,
    );
    if (channel.channelType !== CHANNEL_TYPE.VOICE) {
      throw new BadRequestException('Not a voice channel');
    }
    return channel;
  }

  private async loadRoomParticipants(
    roomNames: string[],
  ): Promise<Map<string, VoiceParticipant[]>> {
    const now = Date.now();
    const stale = roomNames.filter(
      (name) => (this.participantsCache.get(name)?.expiresAt ?? 0) <= now,
    );

    if (stale.length > 0) {
      const fetched = this.fetchRoomParticipants(stale);
      for (const name of stale) {
        this.participantsCache.set(name, {
          expiresAt: now + PARTICIPANTS_CACHE_MS,
          participants: fetched.then((rooms) => rooms.get(name) ?? []),
        });
      }
    }

    const entries = await Promise.all(
      roomNames.map(
        async (name) =>
          [
            name,
            (await this.participantsCache.get(name)?.participants) ?? [],
          ] as const,
      ),
    );
    return new Map(entries);
  }

  /** Never rejects: a LiveKit outage shows empty voice channels, not an error. */
  private async fetchRoomParticipants(
    roomNames: string[],
  ): Promise<Map<string, VoiceParticipant[]>> {
    const result = new Map<string, VoiceParticipant[]>();
    const roomService = this.roomService;
    if (!roomService) return result;

    try {
      const rooms = await roomService.listRooms(roomNames);
      const occupied = rooms.filter((room) => room.numParticipants > 0);
      await Promise.all(
        occupied.map(async (room) => {
          const participants = await roomService.listParticipants(room.name);
          result.set(
            room.name,
            participants
              .filter(isConnectedPerson)
              .map(toVoiceParticipant)
              .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt)),
          );
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Could not load LiveKit participants: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return result;
  }

  private roomNameFor(channelId: string) {
    return `${this.config?.roomPrefix ?? ''}${channelId}`;
  }

  /** Null for rooms that belong to another environment sharing the project. */
  private channelIdFromRoom(roomName: string): string | null {
    const prefix = this.config?.roomPrefix ?? '';
    if (!roomName.startsWith(prefix)) return null;
    return roomName.slice(prefix.length) || null;
  }

  private requireConfig(): VoiceConfig {
    if (!this.config) {
      throw new ServiceUnavailableException(
        'Voice channels are not configured on this server',
      );
    }
    return this.config;
  }
}

function isConnectedPerson(participant: ParticipantInfo) {
  return (
    Number(participant.kind) === STANDARD_PARTICIPANT_KIND &&
    participant.state !== ParticipantInfo_State.DISCONNECTED
  );
}

function toVoiceParticipant(participant: ParticipantInfo): VoiceParticipant {
  const microphone = participant.tracks.find(
    (track) => track.source === TrackSource.MICROPHONE,
  );
  const joinedAtMs =
    participant.joinedAtMs > 0n
      ? Number(participant.joinedAtMs)
      : Number(participant.joinedAt) * 1000;
  return {
    userId: participant.identity,
    name: participant.name,
    // No published mic (listen-only, or permission denied) reads as muted.
    muted: !microphone || microphone.muted,
    deafened: participant.attributes[DEAFENED_ATTRIBUTE] === 'true',
    joinedAt: new Date(joinedAtMs).toISOString(),
  };
}
