import { ChannelView } from './channel-view';

export default function ChannelPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  return <ChannelView params={params} />;
}
