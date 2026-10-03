'use client';

import Link from 'next/link';
import { ConnectionState } from 'livekit-client';
import {
  Headphones,
  HeadphoneOff,
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Volume2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useChannels } from '../_hooks/use-channels';
import { useWorkspaces } from '../_hooks/use-workspaces';
import { useVoice } from '../_hooks/use-voice';
import { channelPageHref } from '../_libs/channels';

/** Mute, deafen, share your screen, and hang up for the call you're in. */
export function VoiceControlButtons({
  size = 'panel',
  className,
}: {
  /** `panel` stretches the buttons across the sidebar's voice panel. */
  size?: 'panel' | 'lg';
  className?: string;
}) {
  const {
    canSpeak,
    isMuted,
    isDeafened,
    connectionState,
    isJoining,
    toggleMute,
    toggleDeafen,
    canScreenShare,
    isScreenSharing,
    toggleScreenShare,
    leave,
  } = useVoice();
  // Mute/deafen only mean something once the call is up; until then they stay neutral.
  const connected =
    !isJoining && connectionState === ConnectionState.Connected;
  const showMuted = connected && isMuted;
  const showDeafened = connected && isDeafened;
  const buttonSize = size === 'lg' ? 'icon-lg' : 'default';
  const buttonClass = size === 'lg' ? 'size-10 rounded-full' : 'h-8 w-full';
  const iconClass = size === 'lg' ? 'size-5' : 'size-4';

  const muteLabel = !connected
    ? 'Connecting…'
    : !canSpeak
      ? 'You can only listen in this channel'
      : isMuted
        ? 'Unmute'
        : 'Mute';
  const deafenLabel = isDeafened ? 'Undeafen' : 'Deafen';
  const shareLabel = isScreenSharing ? 'Stop sharing' : 'Share your screen';

  return (
    <div
      className={cn(
        size === 'lg'
          ? 'flex items-center gap-3'
          : cn('grid gap-1', canScreenShare ? 'grid-cols-4' : 'grid-cols-3'),
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={showMuted ? 'destructive' : 'ghost'}
            size={buttonSize}
            className={buttonClass}
            aria-label={muteLabel}
            aria-pressed={showMuted}
            disabled={!connected || !canSpeak}
            onClick={toggleMute}
          >
            {showMuted ? (
              <MicOff className={iconClass} />
            ) : (
              <Mic className={iconClass} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{muteLabel}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={showDeafened ? 'destructive' : 'ghost'}
            size={buttonSize}
            className={buttonClass}
            aria-label={deafenLabel}
            aria-pressed={showDeafened}
            disabled={!connected}
            onClick={toggleDeafen}
          >
            {showDeafened ? (
              <HeadphoneOff className={iconClass} />
            ) : (
              <Headphones className={iconClass} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{deafenLabel}</TooltipContent>
      </Tooltip>
      {canScreenShare ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={isScreenSharing ? 'default' : 'ghost'}
              size={buttonSize}
              className={buttonClass}
              aria-label={shareLabel}
              aria-pressed={isScreenSharing}
              disabled={!connected}
              onClick={toggleScreenShare}
            >
              {isScreenSharing ? (
                <ScreenShareOff className={iconClass} />
              ) : (
                <ScreenShare className={iconClass} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{shareLabel}</TooltipContent>
        </Tooltip>
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            size={buttonSize}
            className={buttonClass}
            aria-label="Disconnect"
            onClick={leave}
          >
            <PhoneOff className={iconClass} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Disconnect</TooltipContent>
      </Tooltip>
    </div>
  );
}

function connectionLabel(state: ConnectionState, isJoining: boolean) {
  if (isJoining || state === ConnectionState.Connecting) return 'Connecting…';
  if (
    state === ConnectionState.Reconnecting ||
    state === ConnectionState.SignalReconnecting
  ) {
    return 'Reconnecting…';
  }
  return 'Voice connected';
}

/**
 * Sits above the user bar while you're in a call, from any page, so you can
 * always see where you're connected and hang up (like Discord's voice panel).
 */
export function VoiceConnectionPanel() {
  const {
    activeChannel,
    connectionState,
    isJoining,
    canPlayAudio,
    startAudio,
  } = useVoice();
  const { data: channels } = useChannels(activeChannel?.workspaceId ?? '');
  const { data: workspaces } = useWorkspaces();

  if (!activeChannel) return null;

  const channel = channels?.find((c) => c.id === activeChannel.channelId);
  const workspace = workspaces?.find(
    (ws) => ws.id === activeChannel.workspaceId,
  );
  const connected = connectionState === ConnectionState.Connected && !isJoining;

  return (
    <div className="shrink-0 border-t p-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2">
        <div className="min-w-0 px-1">
          <p
            className={cn(
              'truncate text-xs font-semibold',
              connected ? 'text-online' : 'text-muted-foreground',
            )}
            role="status"
          >
            {connectionLabel(connectionState, isJoining)}
          </p>
          <Link
            href={channelPageHref(
              activeChannel.workspaceId,
              activeChannel.channelId,
            )}
            className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Volume2 className="size-3 shrink-0" />
            <span className="truncate">
              {channel?.name ?? 'Voice channel'}
              {workspace ? ` / ${workspace.name}` : null}
            </span>
          </Link>
        </div>
        <VoiceControlButtons />
        {connected && !canPlayAudio ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={startAudio}
          >
            Your browser paused audio — click to listen
          </Button>
        ) : null}
      </div>
    </div>
  );
}
