'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
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
  ScreenSharePresets,
  Track,
  type LocalTrackPublication,
  type VideoPreset,
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

/**
 * Screen share quality levels. Above 360p, simulcast also sends lower copies so
 * each viewer gets the one that fits their window and connection.
 */
const SCREEN_SHARE_QUALITY = {
  '360p': {
    preset: ScreenSharePresets.h360fps15,
    simulcastLayers: [],
  },
  '720p': {
    preset: ScreenSharePresets.h720fps15,
    simulcastLayers: [ScreenSharePresets.h360fps15],
  },
  /** ~2.5 Mbps; keeps text and code sharp. */
  '1080p': {
    preset: ScreenSharePresets.h1080fps15,
    simulcastLayers: [ScreenSharePresets.h720fps15, ScreenSharePresets.h360fps15],
  },
} satisfies Record<string, { preset: VideoPreset; simulcastLayers: VideoPreset[] }>;

/** 360p while testing; raise to '720p' or '1080p' when ready. */
const SCREEN_SHARE = SCREEN_SHARE_QUALITY['360p'];

const noopSubscribe = () => () => {};

/** Phones and some browsers (iOS Safari) can't capture the screen at all. */
function useCanCaptureScreen() {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.mediaDevices?.getDisplayMedia === 'function',
    () => false,
  );
}

type VoiceContextValue = {
  room: Room;
  /** The channel being joined or currently connected to; null when not in voice. */
  activeChannel: VoiceChannelRef | null;
  connectionState: ConnectionState;
  isJoining: boolean;
  canSpeak: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  /** True when this browser can share a screen and you're allowed to. */
  canScreenShare: boolean;
  isScreenSharing: boolean;
  /** False until the browser lets the page play audio; `startAudio` must run from a click. */
  canPlayAudio: boolean;
  startAudio: () => void;
  join: (target: VoiceChannelRef) => void;
  leave: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleScreenShare: () => void;
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
        // Only pull screen shares at the size they're shown, and stop sending
        // simulcast layers nobody is watching.
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          // Screen share is the only video, so this only affects it.
          simulcast: SCREEN_SHARE.simulcastLayers.length > 0,
          screenShareEncoding: SCREEN_SHARE.preset.encoding,
          screenShareSimulcastLayers: SCREEN_SHARE.simulcastLayers,
        },
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
  const { isMicrophoneEnabled, isScreenShareEnabled } = useLocalParticipant({
    room,
  });
  const canCaptureScreen = useCanCaptureScreen();
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
    // Stopping from the browser's own "Stop sharing" bar skips toggleScreenShare.
    const handleLocalTrackUnpublished = (publication: LocalTrackPublication) => {
      if (publication.source !== Track.Source.ScreenShare) return;
      if (sessionRef.current) announce(sessionRef.current);
    };
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
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
    canScreenShare: canSpeak && canCaptureScreen,
    isScreenSharing: session !== null && isScreenShareEnabled,
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
    toggleScreenShare: () => {
      if (!session || !canSpeak) return;
      const sharing = !isScreenShareEnabled;
      room.localParticipant
        .setScreenShareEnabled(sharing, {
          audio: true,
          resolution: SCREEN_SHARE.preset.resolution,
          contentHint: 'detail',
          selfBrowserSurface: 'exclude',
          surfaceSwitching: 'include',
        })
        // Others' sidebars show a LIVE badge from the participants snapshot.
        .then(() => announce(session))
        .catch((error: unknown) => {
          // Closing the browser's picker isn't an error worth reporting.
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            return;
          }
          toast.error(errorMessage(error, 'Could not share your screen'));
        });
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
