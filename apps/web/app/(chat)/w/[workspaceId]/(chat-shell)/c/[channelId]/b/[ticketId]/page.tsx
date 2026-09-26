import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { parseTicketLayout } from '@chat/_libs/channels';
import { ChannelView } from '../../channel-view';

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; channelId: string; ticketId: string }>;
  searchParams: Promise<{
    layout?: string | string[];
    message?: string | string[];
  }>;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/login');

  const query = await searchParams;
  const messageParam = Array.isArray(query.message)
    ? query.message[0]
    : query.message;

  return (
    <ChannelView
      params={params.then(({ workspaceId, ticketId }) => ({
        workspaceId,
        channelId: ticketId,
      }))}
      userId={session.data.user.id}
      view="messages"
      layout={parseTicketLayout(query.layout)}
      highlightMessageId={messageParam ?? null}
    />
  );
}
