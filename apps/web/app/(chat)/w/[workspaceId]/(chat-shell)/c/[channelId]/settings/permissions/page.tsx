import { ChannelPermissionsPanel } from '../_components/channel-permissions-panel';

export default async function ChannelPermissionsSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return (
    <ChannelPermissionsPanel workspaceId={workspaceId} channelId={channelId} />
  );
}
