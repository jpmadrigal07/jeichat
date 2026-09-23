'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Info, Shield, Tag, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatPageHeader } from '@chat/_components/chat-page-header';
import { useWorkspaces } from '@chat/_hooks/use-workspaces';
import { useWorkspaceRootCrumb } from '@chat/_hooks/use-workspace-root-crumb';
import { useWorkspacePresenceSocket } from '@chat/_hooks/use-presence';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
};

export function SettingsShell({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: workspaces, isLoading } = useWorkspaces();
  useWorkspacePresenceSocket();
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const isOwner = workspace?.role === 'owner';

  const navItems: NavItem[] = [
    {
      href: `/w/${workspaceId}/settings/info`,
      label: 'General',
      icon: Info,
    },
    {
      href: `/w/${workspaceId}/settings/members`,
      label: 'Members',
      icon: Users,
    },
    {
      href: `/w/${workspaceId}/settings/roles`,
      label: 'Roles',
      icon: Shield,
    },
    {
      href: `/w/${workspaceId}/settings/bots`,
      label: 'Bots',
      icon: Bot,
      ownerOnly: true,
    },
    {
      href: `/w/${workspaceId}/settings/labels`,
      label: 'Labels',
      icon: Tag,
    },
    {
      href: `/w/${workspaceId}/settings/delete`,
      label: 'Delete workspace',
      icon: Trash2,
      ownerOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.ownerOnly || isOwner,
  );
  const settingsHome = `/w/${workspaceId}/settings`;
  const onSettingsHome = pathname === settingsHome;
  const workspaceRoot = useWorkspaceRootCrumb(workspaceId);
  const activeItem = visibleNavItems.find((item) => pathname === item.href);

  const headerCrumbs = onSettingsHome
    ? [
        { label: workspaceRoot.label, href: workspaceRoot.href },
        { label: 'Settings' },
      ]
    : [
        { label: workspaceRoot.label, href: workspaceRoot.href },
        { label: 'Settings', href: settingsHome },
        { label: activeItem?.label ?? 'Settings' },
      ];

  const linearTitle = onSettingsHome
    ? 'Settings'
    : (activeItem?.label ?? 'Settings');
  const linearParent = onSettingsHome
    ? { label: workspaceRoot.label, href: workspaceRoot.href }
    : { label: 'Settings', href: settingsHome };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {isLoading ? (
        <header className="flex h-12 items-center border-b px-2 md:px-4">
          <Skeleton className="h-5 w-48" />
        </header>
      ) : (
        <ChatPageHeader
          backHref={onSettingsHome ? workspaceRoot.href : settingsHome}
          backLabel={
            onSettingsHome ? 'Back to channels' : 'Back to settings'
          }
          linearTitle={linearTitle}
          linearParent={linearParent}
          crumbs={headerCrumbs}
        />
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'w-56 shrink-0 border-r p-3',
            onSettingsHome
              ? 'max-md:w-full max-md:flex-1 max-md:overflow-y-auto max-md:border-r-0'
              : 'max-md:hidden',
          )}
        >
          <nav className="flex flex-col gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                    item.ownerOnly && 'text-destructive hover:text-destructive',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main
          className={cn(
            'min-w-0 flex-1 overflow-y-auto p-4 md:p-6',
            onSettingsHome && 'max-md:hidden',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
