import { ChannelNotificationsPanel } from '../_components/channel-notifications-panel';

export default async function ChannelNotificationsSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return (
    <ChannelNotificationsPanel
      workspaceId={workspaceId}
      channelId={channelId}
    />
  );
}
