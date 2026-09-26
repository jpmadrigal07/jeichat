import { TicketRouteGate } from '../../_components/ticket-route-gate';

export default async function TicketLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; ticketId: string }>;
}) {
  const { workspaceId, ticketId } = await params;

  return (
    <TicketRouteGate workspaceId={workspaceId} channelId={ticketId} ticketRoute>
      {children}
    </TicketRouteGate>
  );
}
