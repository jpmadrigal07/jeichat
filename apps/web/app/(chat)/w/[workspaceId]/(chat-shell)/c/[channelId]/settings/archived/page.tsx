import { ChannelArchivedTicketsPanel } from '../_components/channel-archived-tickets-panel';

export default async function ChannelArchivedTicketsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return (
    <ChannelArchivedTicketsPanel
      workspaceId={workspaceId}
      channelId={channelId}
    />
  );
}
