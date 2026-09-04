import { getServerSession } from '@/lib/auth-server';
import { WorkspaceSidebar } from './workspace-sidebar';
import { ChannelSidebar } from './channel-sidebar';

export async function ChatShellFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <div className="flex h-screen overflow-hidden">
      <WorkspaceSidebar user={session!.data!.user} />
      <ChannelSidebar user={session!.data!.user} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
