import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { channelBoardHref, parseTicketLayout } from '@chat/_libs/channels';
import { ChannelView } from './channel-view';

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/login');

  const query = await searchParams;
  const viewParam = Array.isArray(query.view) ? query.view[0] : query.view;

  if (viewParam === 'threads') {
    const { workspaceId, channelId } = await params;
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (key === 'view' || value == null) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        next.append(key, item);
      }
    }
    const qs = next.toString();
    const path = channelBoardHref(workspaceId, channelId);
    redirect(qs ? `${path}?${qs}` : path);
  }

  const messageParam = Array.isArray(query.message)
    ? query.message[0]
    : query.message;

  return (
    <ChannelView
      params={params}
      userId={session.data.user.id}
      view="messages"
      layout={parseTicketLayout(query.layout)}
      highlightMessageId={messageParam ?? null}
    />
  );
}
