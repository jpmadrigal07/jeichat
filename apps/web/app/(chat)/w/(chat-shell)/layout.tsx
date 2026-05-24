import { getServerSession } from '@/lib/auth-server';
import { WorkspaceSidebar } from '../../_components/workspace-sidebar';
import { ChannelSidebar } from '../../_components/channel-sidebar';

export default async function ChatShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <div className="flex h-screen overflow-hidden">
      <WorkspaceSidebar user={session!.data!.user} />
      <ChannelSidebar user={session!.data!.user} />
      <main className="flex flex-1 flex-col min-w-0">{children}</main>
    </div>
  );
}
