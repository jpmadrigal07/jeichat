import { ChannelWebhooksPanel } from "../_components/channel-webhooks-panel";

export default async function ChannelWebhooksSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;
  return (
    <ChannelWebhooksPanel workspaceId={workspaceId} channelId={channelId} />
  );
}
