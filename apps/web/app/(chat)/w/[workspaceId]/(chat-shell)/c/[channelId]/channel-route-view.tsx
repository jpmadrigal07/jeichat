'use client';

import { use, type ComponentProps } from 'react';
import { useChannels } from '@chat/_hooks/use-channels';
import { isVoiceChannel } from '@chat/_helpers/channel-display';
import { ChannelView } from './channel-view';
import { VoiceChannelView } from './_components/voice-channel-view';

/** Voice channels have no messages, so they get the call view instead of the chat. */
export function ChannelRouteView(props: ComponentProps<typeof ChannelView>) {
  const { workspaceId, channelId } = use(props.params);
  const { data: channels } = useChannels(workspaceId);
  const channel = channels?.find((c) => c.id === channelId);

  if (channel && isVoiceChannel(channel)) {
    return <VoiceChannelView workspaceId={workspaceId} channel={channel} />;
  }
  return <ChannelView {...props} />;
}
