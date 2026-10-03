import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { canCreateWorkspace } from '../_helpers/workspace-creation';
import { WorkspaceIndex } from '../_components/workspace-index';

export default async function WorkspaceIndexPage() {
  const session = await getServerSession();
  const user = session?.data?.user;
  if (!user) redirect('/login');

  return (
    <WorkspaceIndex canCreateWorkspace={canCreateWorkspace(user.email)} />
  );
}
