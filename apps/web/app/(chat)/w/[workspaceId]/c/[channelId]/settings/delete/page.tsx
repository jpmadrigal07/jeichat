import { ChannelDeletePanel } from '../_components/channel-delete-panel';

export default async function ChannelDeleteSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return (
    <ChannelDeletePanel workspaceId={workspaceId} channelId={channelId} />
  );
}
