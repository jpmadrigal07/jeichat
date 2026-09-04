import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { parseTicketLayout } from '@chat/_libs/channels';
import { ChannelView } from './channel-view';

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
  searchParams: Promise<{
    view?: string | string[];
    layout?: string | string[];
    message?: string | string[];
  }>;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/');

  const query = await searchParams;
  const viewParam = Array.isArray(query.view) ? query.view[0] : query.view;
  const messageParam = Array.isArray(query.message)
    ? query.message[0]
    : query.message;

  return (
    <ChannelView
      params={params}
      userId={session.data.user.id}
      view={viewParam === 'threads' ? 'threads' : 'messages'}
      layout={parseTicketLayout(query.layout)}
      highlightMessageId={messageParam ?? null}
    />
  );
}
