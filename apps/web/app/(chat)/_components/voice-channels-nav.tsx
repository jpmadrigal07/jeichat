'use client';

import Link from 'next/link';
import { AudioLines, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useVoice, useIsActiveVoiceChannel } from '../_hooks/use-voice';
import { channelPageHref, type Channel } from '../_libs/channels';
import { ChannelContextMenu } from './channel-context-menu';
import { ChannelTypeIcon } from './channel-type-icon';
import { CreateChannelDialog } from './create-channel-dialog';
import { VoiceChannelParticipants } from './voice-participant-list';

/** Sidebar section listing voice channels with who's in each. */
export function VoiceChannelsNav({
  workspaceId,
  currentUserId,
  channels,
  activeChannelId,
}: {
  workspaceId: string;
  currentUserId: string;
  channels: Channel[];
  activeChannelId: string | undefined;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="mb-0.5 flex items-center justify-between px-1">
        <span className="px-1 text-sm font-medium text-muted-foreground">
          Voice channels
        </span>
        <CreateChannelDialog
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          defaultType="voice"
        >
          <Button variant="ghost" size="icon-sm" className="size-7">
            <Plus className="size-3.5" />
            <span className="sr-only">Create voice channel</span>
          </Button>
        </CreateChannelDialog>
      </div>
      {channels.length === 0 ? (
        <p className="px-2 text-xs text-muted-foreground">
          Add one to talk with your team
        </p>
      ) : (
        channels.map((channel) => (
          <VoiceChannelRow
            key={channel.id}
            workspaceId={workspaceId}
            channel={channel}
            isActive={channel.id === activeChannelId}
          />
        ))
      )}
    </div>
  );
}

function VoiceChannelRow({
  workspaceId,
  channel,
  isActive,
}: {
  workspaceId: string;
  channel: Channel;
  isActive: boolean;
}) {
  const { join } = useVoice();
  const isConnected = useIsActiveVoiceChannel(workspaceId, channel.id);

  return (
    <div className="flex min-w-0 flex-col">
      <ChannelContextMenu
        workspaceId={workspaceId}
        channelId={channel.id}
        showNotifications={false}
      >
        <Button
          variant={isActive ? 'secondary' : 'ghost'}
          size="lg"
          className={cn(
            'min-w-0 w-full max-w-full shrink justify-start gap-1.5 overflow-hidden px-2 text-sm',
            isActive || isConnected ? 'font-medium' : 'font-normal',
          )}
          asChild
        >
          <Link
            href={channelPageHref(workspaceId, channel.id)}
            onClick={(event) => {
              // Opening in a new tab shouldn't pull you into the call here.
              if (event.metaKey || event.ctrlKey || event.shiftKey) return;
              // Clicking a voice channel joins it, as in Discord.
              join({ workspaceId, channelId: channel.id });
            }}
          >
            <ChannelTypeIcon
              isVoice
              isPrivate={channel.isPrivate}
              className={cn(
                'size-4.5',
                isConnected ? 'text-online' : 'text-muted-foreground',
              )}
            />
            <span className="min-w-0 flex-1 truncate">{channel.name}</span>
            {isConnected ? (
              <AudioLines
                className="size-3.5 shrink-0 text-online"
                aria-label="You're connected"
              />
            ) : null}
          </Link>
        </Button>
      </ChannelContextMenu>
      <VoiceChannelParticipants
        workspaceId={workspaceId}
        channelId={channel.id}
        variant="sidebar"
      />
    </div>
  );
}
