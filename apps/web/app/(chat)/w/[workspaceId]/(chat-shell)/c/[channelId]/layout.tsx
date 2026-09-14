import { ArchivedTicketGate } from './_components/archived-ticket-gate';

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return (
    <ArchivedTicketGate workspaceId={workspaceId} channelId={channelId}>
      {children}
    </ArchivedTicketGate>
  );
}
