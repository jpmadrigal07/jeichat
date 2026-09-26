import { TicketRouteGate } from './_components/ticket-route-gate';

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return (
    <TicketRouteGate workspaceId={workspaceId} channelId={channelId}>
      {children}
    </TicketRouteGate>
  );
}
