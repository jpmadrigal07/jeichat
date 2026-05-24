import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ChannelView } from './channel-view';

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/');

  return <ChannelView params={params} userId={session.data.user.id} />;
}
