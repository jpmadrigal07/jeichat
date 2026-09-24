'use client';

import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChannelSidebar } from './channel-sidebar';
import { NotificationPermissionBanner } from './notification-permission-banner';
import { WorkspaceSidebar } from './workspace-sidebar';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function ChatShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const isDirectory = pathname === `/w/${workspaceId}`;

  return (
    <div className="flex h-svh max-h-svh min-h-0 flex-col overflow-hidden">
      <NotificationPermissionBanner />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          className={cn(
            'flex min-h-0 min-w-0',
            isDirectory ? 'max-md:flex-1' : 'max-md:hidden',
          )}
        >
          <div className="flex h-full max-md:hidden">
            <WorkspaceSidebar user={user} />
          </div>
          <ChannelSidebar user={user} />
        </div>
        <main
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
            isDirectory && 'max-md:hidden',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
