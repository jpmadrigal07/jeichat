import { getServerSession } from '@/lib/auth-server';
import { WorkspaceSidebar } from './workspace-sidebar';
import { ChannelSidebar } from './channel-sidebar';
import { NotificationPermissionBanner } from './notification-permission-banner';

export async function ChatShellFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <div className="flex h-svh max-h-svh overflow-hidden">
      <WorkspaceSidebar user={session!.data!.user} />
      <ChannelSidebar user={session!.data!.user} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <NotificationPermissionBanner />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
