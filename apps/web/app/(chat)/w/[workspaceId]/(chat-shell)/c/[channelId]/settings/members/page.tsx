import { ChannelMembersPanel } from '../_components/channel-members-panel';

export default async function ChannelMembersSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return (
    <ChannelMembersPanel workspaceId={workspaceId} channelId={channelId} />
  );
}
