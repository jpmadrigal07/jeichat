import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { MyTicketsView } from './_components/my-tickets-view';

export default async function MyTicketsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/login');

  const { workspaceId } = await params;
  return (
    <MyTicketsView workspaceId={workspaceId} userId={session.data.user.id} />
  );
}
