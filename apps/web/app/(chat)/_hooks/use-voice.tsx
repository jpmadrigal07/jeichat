'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RoomAudioRenderer,
  RoomContext,
  useAudioPlayback,
  useConnectionState,
  useLocalParticipant,
  useParticipantAttribute,
} from '@livekit/components-react';
import {
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
} from 'livekit-client';
import toast from 'react-hot-toast';
import {
  createVoiceToken,
  syncVoiceChannel,
  VOICE_DEAFENED_ATTRIBUTE,
  voiceParticipantsQueryKey,
} from '../_libs/voice';
import { useVoiceParticipantsSocket } from './use-voice-participants';

export type VoiceChannelRef = { workspaceId: string; channelId: string };

type VoiceSession = VoiceChannelRef & { canSpeak: boolean };

type VoiceContextValue = {
  room: Room;
  /** The channel being joined or currently connected to; null when not in voice. */
  activeChannel: VoiceChannelRef | null;
  connectionState: ConnectionState;
  isJoining: boolean;
  canSpeak: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  /** False until the browser lets the page play audio; `startAudio` must run from a click. */
  canPlayAudio: boolean;
  startAudio: () => void;
  join: (target: VoiceChannelRef) => void;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Owns the single LiveKit room for the whole chat area, so a voice call keeps
 * running while you move between channels and workspaces, like Discord.
 */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // One Room for the app's lifetime (same lazy-instance pattern as QueryClient);
  // it reconnects to whichever channel is joined.
  const [room] = useState(
    () =>
      new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }),
  );
  // The connected channel, read from LiveKit's event callbacks rather than render.
  const sessionRef = useRef<VoiceSession | null>(null);

  useVoiceParticipantsSocket();

  const connectionState = useConnectionState(room);
  const { isMicrophoneEnabled } = useLocalParticipant({ room });
  const deafenedAttribute = useParticipantAttribute(VOICE_DEAFENED_ATTRIBUTE, {
    participant: room.localParticipant,
  });
  const { canPlayAudio, startAudio } = useAudioPlayback(room);

  const announce = (target: VoiceChannelRef) => {
    void queryClient.invalidateQueries({
      queryKey: voiceParticipantsQueryKey(target.workspaceId),
    });
    syncVoiceChannel(target.workspaceId, target.channelId).catch(
      () => undefined,
    );
  };

  const joinMutation = useMutation({
    mutationFn: async (target: VoiceChannelRef): Promise<VoiceSession> => {
      if (room.state !== ConnectionState.Disconnected) {
        await room.disconnect();
      }
      const token = await createVoiceToken(target.workspaceId, target.channelId);
      await room.connect(token.serverUrl, token.token);
      if (token.canSpeak) {
        await room.localParticipant
          .setMicrophoneEnabled(true)
          .catch(() =>
            toast.error(
              'Microphone access is blocked, so you joined muted. Allow it in your browser to talk.',
            ),
          );
      }
      return { ...target, canSpeak: token.canSpeak };
    },
    onSuccess: (session) => {
      sessionRef.current = session;
      announce(session);
    },
  });

  // LiveKit's Room is an event emitter; its disconnects (another tab joining,
  // network loss, leaving) have no React-friendly equivalent.
  useEffect(() => {
    const handleDisconnected = (reason?: DisconnectReason) => {
      const left = sessionRef.current;
      sessionRef.current = null;
      if (!left) return;
      announce(left);
      if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
        toast('You joined voice from another tab or device.');
      } else if (reason !== DisconnectReason.CLIENT_INITIATED) {
        toast.error('You were disconnected from voice.');
      }
    };
    room.on(RoomEvent.Disconnected, handleDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
    // `announce` only reads the stable queryClient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Leaving the chat area (e.g. signing out) hangs up.
  useEffect(() => {
    return () => {
      void room.disconnect();
    };
  }, [room]);

  const session =
    connectionState !== ConnectionState.Disconnected
      ? (joinMutation.data ?? null)
      : null;
  const activeChannel: VoiceChannelRef | null = joinMutation.isPending
    ? (joinMutation.variables ?? null)
    : session;
  const canSpeak = session?.canSpeak ?? false;
  const isDeafened = session !== null && deafenedAttribute === 'true';

  const value: VoiceContextValue = {
    room,
    activeChannel,
    connectionState,
    isJoining: joinMutation.isPending,
    canSpeak,
    isMuted: !isMicrophoneEnabled,
    isDeafened,
    canPlayAudio,
    startAudio: () => {
      startAudio().catch(() => undefined);
    },
    join: (target) => {
      if (joinMutation.isPending) return;
      if (
        session?.workspaceId === target.workspaceId &&
        session.channelId === target.channelId
      ) {
        return;
      }
      joinMutation.mutate(target);
    },
    leave: () => {
      void room.disconnect();
    },
    toggleMute: () => {
      if (!canSpeak) return;
      const local = room.localParticipant;
      const unmuting = !isMicrophoneEnabled;
      Promise.all([
        local.setMicrophoneEnabled(unmuting),
        // Talking while deafened makes no sense, so unmuting undeafens (as in Discord).
        unmuting && isDeafened
          ? local.setAttributes({ [VOICE_DEAFENED_ATTRIBUTE]: 'false' })
          : undefined,
      ]).catch((error: unknown) =>
        toast.error(errorMessage(error, 'Could not change your microphone')),
      );
    },
    toggleDeafen: () => {
      if (!session) return;
      const local = room.localParticipant;
      const deafening = !isDeafened;
      Promise.all([
        local.setAttributes({
          [VOICE_DEAFENED_ATTRIBUTE]: deafening ? 'true' : 'false',
        }),
        canSpeak ? local.setMicrophoneEnabled(!deafening) : undefined,
      ]).catch((error: unknown) =>
        toast.error(errorMessage(error, 'Could not change deafen')),
      );
    },
  };

  return (
    <VoiceContext.Provider value={value}>
      <RoomContext.Provider value={room}>
        {children}
        <RoomAudioRenderer room={room} muted={isDeafened} />
      </RoomContext.Provider>
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used inside VoiceProvider');
  }
  return context;
}

/** True when `channelId` in `workspaceId` is the channel you're in (or joining). */
export function useIsActiveVoiceChannel(workspaceId: string, channelId: string) {
  const { activeChannel } = useVoice();
  return (
    activeChannel?.workspaceId === workspaceId &&
    activeChannel.channelId === channelId
  );
}
