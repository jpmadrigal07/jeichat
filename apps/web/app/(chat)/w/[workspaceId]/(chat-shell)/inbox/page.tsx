import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { InboxView } from './_components/inbox-view';

export default async function InboxPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/');

  const { workspaceId } = await params;
  return <InboxView workspaceId={workspaceId} userId={session.data.user.id} />;
}
