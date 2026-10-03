'use client';

import {
  useIsMuted,
  useIsSpeaking,
  useParticipantAttribute,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import { ConnectionState, Track, type Participant } from 'livekit-client';
import { HeadphoneOff, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { personInitials } from '../_helpers/ticket-fields';
import { useVoice, useIsActiveVoiceChannel } from '../_hooks/use-voice';
import { useVoiceParticipants } from '../_hooks/use-voice-participants';
import { useWorkspaceMembers } from '../_hooks/use-workspaces';
import { VOICE_DEAFENED_ATTRIBUTE } from '../_libs/voice';

type Variant = 'sidebar' | 'tiles';

type ParticipantView = {
  userId: string;
  name: string;
  speaking: boolean;
  muted: boolean;
  deafened: boolean;
  screenSharing: boolean;
};

/**
 * Who is in a voice channel. In the channel you're connected to it's live from
 * LiveKit (with speaking rings); elsewhere it's the API's snapshot.
 */
export function VoiceChannelParticipants({
  workspaceId,
  channelId,
  variant,
  emptyState,
}: {
  workspaceId: string;
  channelId: string;
  variant: Variant;
  emptyState?: React.ReactNode;
}) {
  const { connectionState, isJoining } = useVoice();
  const isActive = useIsActiveVoiceChannel(workspaceId, channelId);
  const isLive =
    isActive &&
    !isJoining &&
    (connectionState === ConnectionState.Connected ||
      connectionState === ConnectionState.Reconnecting ||
      connectionState === ConnectionState.SignalReconnecting);

  return isLive ? (
    <LiveParticipants
      workspaceId={workspaceId}
      variant={variant}
      emptyState={emptyState}
    />
  ) : (
    <SnapshotParticipants
      workspaceId={workspaceId}
      channelId={channelId}
      variant={variant}
      emptyState={emptyState}
    />
  );
}

function SnapshotParticipants({
  workspaceId,
  channelId,
  variant,
  emptyState,
}: {
  workspaceId: string;
  channelId: string;
  variant: Variant;
  emptyState?: React.ReactNode;
}) {
  const { data } = useVoiceParticipants(workspaceId);
  const participants = data?.[channelId] ?? [];

  if (participants.length === 0) return emptyState ?? null;

  return (
    <ParticipantContainer variant={variant}>
      {participants.map((participant) => (
        <VoiceParticipantItem
          key={participant.userId}
          workspaceId={workspaceId}
          variant={variant}
          participant={{ ...participant, speaking: false }}
        />
      ))}
    </ParticipantContainer>
  );
}

function LiveParticipants({
  workspaceId,
  variant,
  emptyState,
}: {
  workspaceId: string;
  variant: Variant;
  emptyState?: React.ReactNode;
}) {
  const { room } = useVoice();
  const participants = useParticipants({ room });
  const screenShares = useTracks([Track.Source.ScreenShare], { room });
  const sharingIds = new Set(
    screenShares.map((trackRef) => trackRef.participant.identity),
  );

  if (participants.length === 0) return emptyState ?? null;

  return (
    <ParticipantContainer variant={variant}>
      {participants.map((participant) => (
        <LiveParticipantItem
          key={participant.identity}
          workspaceId={workspaceId}
          variant={variant}
          participant={participant}
          screenSharing={sharingIds.has(participant.identity)}
        />
      ))}
    </ParticipantContainer>
  );
}

function LiveParticipantItem({
  workspaceId,
  variant,
  participant,
  screenSharing,
}: {
  workspaceId: string;
  variant: Variant;
  participant: Participant;
  screenSharing: boolean;
}) {
  const speaking = useIsSpeaking(participant);
  const muted = useIsMuted({
    participant,
    source: Track.Source.Microphone,
  });
  const deafened =
    useParticipantAttribute(VOICE_DEAFENED_ATTRIBUTE, { participant }) ===
    'true';

  return (
    <VoiceParticipantItem
      workspaceId={workspaceId}
      variant={variant}
      participant={{
        userId: participant.identity,
        name: participant.name ?? participant.identity,
        speaking: speaking && !muted,
        muted,
        deafened,
        screenSharing,
      }}
    />
  );
}

function ParticipantContainer({
  variant,
  children,
}: {
  variant: Variant;
  children: React.ReactNode;
}) {
  return (
    <ul
      className={cn(
        variant === 'sidebar'
          ? 'ml-6 flex min-w-0 flex-col gap-0.5 py-0.5'
          : 'grid w-full grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3',
      )}
    >
      {children}
    </ul>
  );
}

function VoiceParticipantItem({
  workspaceId,
  variant,
  participant,
}: {
  workspaceId: string;
  variant: Variant;
  participant: ParticipantView;
}) {
  // Names and photos come from the workspace so they match the rest of the app.
  const { data: members } = useWorkspaceMembers(workspaceId);
  const member = members?.find((m) => m.userId === participant.userId);
  const name = member?.name ?? participant.name;
  const image = member?.image ?? null;

  const statusIcons = (
    <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
      {participant.screenSharing ? (
        <Badge
          variant="destructive"
          className="h-4 px-1 text-[0.5625rem] font-bold tracking-wide"
        >
          LIVE
        </Badge>
      ) : null}
      {participant.muted ? (
        <MicOff
          className={variant === 'sidebar' ? 'size-3' : 'size-4'}
          aria-label="Muted"
        />
      ) : null}
      {participant.deafened ? (
        <HeadphoneOff
          className={variant === 'sidebar' ? 'size-3' : 'size-4'}
          aria-label="Deafened"
        />
      ) : null}
    </span>
  );

  if (variant === 'sidebar') {
    return (
      <li className="flex min-w-0 items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-muted-foreground">
        <Avatar
          size="sm"
          className={cn(
            'size-5! transition-shadow',
            participant.speaking && 'ring-2 ring-online',
          )}
        >
          <AvatarImage src={image ?? undefined} alt={name} />
          <AvatarFallback className="text-[0.5625rem]">
            {personInitials(name)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            participant.speaking && 'text-foreground',
          )}
        >
          {name}
        </span>
        {statusIcons}
      </li>
    );
  }

  return (
    <li className="flex flex-col items-center gap-2 rounded-xl border bg-muted/30 px-3 py-5">
      <Avatar
        className={cn(
          'size-16 transition-shadow',
          participant.speaking &&
            'ring-3 ring-online ring-offset-2 ring-offset-background',
        )}
      >
        <AvatarImage src={image ?? undefined} alt={name} />
        <AvatarFallback className="text-lg">{personInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="flex max-w-full min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-medium">{name}</span>
        {statusIcons}
      </div>
    </li>
  );
}
