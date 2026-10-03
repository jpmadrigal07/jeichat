import { getServerSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { MembersView } from './_components/members-view';

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const session = await getServerSession();
  if (!session?.data?.user) redirect('/login');

  const { workspaceId } = await params;
  return (
    <MembersView workspaceId={workspaceId} userId={session.data.user.id} />
  );
}
