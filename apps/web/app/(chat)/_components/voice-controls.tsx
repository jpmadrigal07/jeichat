'use client';

import Link from 'next/link';
import { ConnectionState } from 'livekit-client';
import {
  Headphones,
  HeadphoneOff,
  Mic,
  MicOff,
  PhoneOff,
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

/** Mute, deafen, and hang up for the call you're in. */
export function VoiceControlButtons({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const { canSpeak, isMuted, isDeafened, toggleMute, toggleDeafen, leave } =
    useVoice();
  const buttonSize = size === 'lg' ? 'icon-lg' : 'icon';
  const buttonClass = size === 'lg' ? 'size-10 rounded-full' : undefined;
  const iconClass = size === 'lg' ? 'size-5' : undefined;

  const muteLabel = !canSpeak
    ? 'You can only listen in this channel'
    : isMuted
      ? 'Unmute'
      : 'Mute';
  const deafenLabel = isDeafened ? 'Undeafen' : 'Deafen';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isMuted ? 'destructive' : 'ghost'}
            size={buttonSize}
            className={buttonClass}
            aria-label={muteLabel}
            aria-pressed={isMuted}
            disabled={!canSpeak}
            onClick={toggleMute}
          >
            {isMuted ? (
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
            variant={isDeafened ? 'destructive' : 'ghost'}
            size={buttonSize}
            className={buttonClass}
            aria-label={deafenLabel}
            aria-pressed={isDeafened}
            onClick={toggleDeafen}
          >
            {isDeafened ? (
              <HeadphoneOff className={iconClass} />
            ) : (
              <Headphones className={iconClass} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{deafenLabel}</TooltipContent>
      </Tooltip>
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
    <div className="shrink-0 border-t px-2 pt-2">
      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
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
        </div>
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
