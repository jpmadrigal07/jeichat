'use client';

import Link from 'next/link';
import { ConnectionState } from 'livekit-client';
import { Phone, Settings, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChatPageHeader } from '@chat/_components/chat-page-header';
import { ChatPane } from '@chat/_components/chat-pane';
import { ChannelTypeIcon } from '@chat/_components/channel-type-icon';
import { VoiceControlButtons } from '@chat/_components/voice-controls';
import { VoiceChannelParticipants } from '@chat/_components/voice-participant-list';
import { chatVoiceFooterClass } from '@chat/_helpers/chat-footer-classes';
import { useIsActiveVoiceChannel, useVoice } from '@chat/_hooks/use-voice';
import type { Channel } from '@chat/_libs/channels';
import { VoiceScreenShares } from './voice-screen-shares';

export function VoiceChannelView({
  workspaceId,
  channel,
}: {
  workspaceId: string;
  channel: Channel;
}) {
  const {
    join,
    activeChannel,
    connectionState,
    isJoining,
    canSpeak,
    canPlayAudio,
    startAudio,
  } = useVoice();
  const isHere = useIsActiveVoiceChannel(workspaceId, channel.id);
  const isConnectedHere =
    isHere && !isJoining && connectionState === ConnectionState.Connected;
  const settingsHref = `/w/${workspaceId}/c/${channel.id}/settings`;

  const header = (
    <ChatPageHeader
      backHref={`/w/${workspaceId}`}
      backLabel="Back to channels"
      linearTitle={channel.name}
      crumbs={[{ label: channel.name }]}
      leading={
        <ChannelTypeIcon
          isVoice
          isPrivate={channel.isPrivate}
          className="h-4 w-4 shrink-0 text-muted-foreground max-md:hidden"
        />
      }
      actions={
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link href={settingsHref} aria-label="Channel settings">
                <Settings />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Channel settings</TooltipContent>
        </Tooltip>
      }
    />
  );

  return (
    <ChatPane header={header}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        {isConnectedHere ? <VoiceScreenShares workspaceId={workspaceId} /> : null}
        <VoiceChannelParticipants
          workspaceId={workspaceId}
          channelId={channel.id}
          variant="tiles"
          emptyState={
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Volume2 />
                </EmptyMedia>
                <EmptyTitle>No one&apos;s here yet</EmptyTitle>
                <EmptyDescription>
                  {channel.description ||
                    'Join the channel and others will see you in the sidebar.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          }
        />
      </div>
      <div className={chatVoiceFooterClass}>
        {isConnectedHere && !canSpeak ? (
          <p className="text-xs text-muted-foreground">
            You can listen but not talk in this channel.
          </p>
        ) : null}
        {isConnectedHere && !canPlayAudio ? (
          <Button type="button" variant="secondary" onClick={startAudio}>
            Your browser paused audio — click to listen
          </Button>
        ) : null}
        {isConnectedHere ? (
          <VoiceControlButtons size="lg" className="gap-3" />
        ) : (
          <Button
            type="button"
            size="lg"
            disabled={isJoining}
            onClick={() => join({ workspaceId, channelId: channel.id })}
          >
            <Phone data-icon="inline-start" />
            {isHere && isJoining
              ? 'Connecting…'
              : activeChannel
                ? 'Switch to this channel'
                : 'Join voice'}
          </Button>
        )}
      </div>
    </ChatPane>
  );
}
