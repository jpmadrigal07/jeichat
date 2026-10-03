'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import {
  fetchVoiceParticipants,
  voiceParticipantsQueryKey,
} from '../_libs/voice';

/**
 * Joins and leaves arrive over the socket; the slow poll catches anyone who
 * closed a tab, since a local API can't receive LiveKit webhooks.
 */
const VOICE_PARTICIPANTS_POLL_MS = 30_000;

export function useVoiceParticipants(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: voiceParticipantsQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchVoiceParticipants(workspaceId, { signal }),
    enabled: !!workspaceId && enabled,
    refetchInterval: VOICE_PARTICIPANTS_POLL_MS,
    // Voice may be unconfigured on this server (503); the sidebar just shows nobody.
    retry: false,
    meta: { silent: true },
  });
}

/** Refetches participants when the API reports someone joined or left. */
export function useVoiceParticipantsSocket() {
  const queryClient = useQueryClient();

  // Socket.IO is an imperative subscription with no query-based equivalent.
  useEffect(() => {
    const socket = getSocket();
    const handleChanged = (payload: { workspaceId: string }) => {
      void queryClient.invalidateQueries({
        queryKey: voiceParticipantsQueryKey(payload.workspaceId),
      });
    };
    socket.on('voice_participants_changed', handleChanged);
    return () => {
      socket.off('voice_participants_changed', handleChanged);
    };
  }, [queryClient]);
}
