'use client';

import { useParams } from 'next/navigation';
import { useChannels } from '@chat/_hooks/use-channels';
import { isDmPeerGone } from '@chat/_helpers/channel-display';

/** True when the channel is a DM with someone who has left the workspace. */
export function useDmPeerGone(channelId: string) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: channels } = useChannels(workspaceId);
  return isDmPeerGone(channels?.find((channel) => channel.id === channelId));
}
