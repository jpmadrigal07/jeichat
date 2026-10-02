import { api } from '@/lib/api';

export type VoiceParticipant = {
  userId: string;
  name: string;
  muted: boolean;
  deafened: boolean;
  joinedAt: string;
};

/** Channel ID → who is in it. Empty voice channels are left out. */
export type VoiceParticipants = Record<string, VoiceParticipant[]>;

export type VoiceToken = {
  /** LiveKit server the browser connects to; comes from the API so self-hosting is an API-only change. */
  serverUrl: string;
  token: string;
  roomName: string;
  /** False when the viewer may listen but not talk in this channel. */
  canSpeak: boolean;
};

/** Participant attribute LiveKit carries to everyone in the room. */
export const VOICE_DEAFENED_ATTRIBUTE = 'deafened';

export function voiceParticipantsQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'voice', 'participants'] as const;
}

export async function fetchVoiceParticipants(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<VoiceParticipants> {
  const { data } = await api.get<VoiceParticipants>(
    `/workspaces/${workspaceId}/voice/participants`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function createVoiceToken(
  workspaceId: string,
  channelId: string,
): Promise<VoiceToken> {
  const { data } = await api.post<VoiceToken>(
    `/workspaces/${workspaceId}/voice/${channelId}/token`,
  );
  return data;
}

/** Tells everyone else in the workspace to refresh this channel's participants. */
export async function syncVoiceChannel(
  workspaceId: string,
  channelId: string,
): Promise<void> {
  await api.post(`/workspaces/${workspaceId}/voice/${channelId}/sync`);
}
