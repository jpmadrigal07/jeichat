'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, Info, Shield, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatPageHeader } from '@chat/_components/chat-page-header';
import { useChannels } from '@chat/_hooks/use-channels';
import { useWorkspaceRootCrumb } from '@chat/_hooks/use-workspace-root-crumb';
import { channelBreadcrumbLabel, isDmChannel } from '@chat/_helpers/channel-display';
import { channelPageHref } from '@chat/_libs/channels';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  visible?: boolean;
};

export function ChannelSettingsShell({
  workspaceId,
  channelId,
  children,
}: {
  workspaceId: string;
  channelId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: channels, isLoading } = useChannels(workspaceId);
  const channel = channels?.find((ch) => ch.id === channelId);

  const navItems: NavItem[] = [
    {
      href: `/w/${workspaceId}/c/${channelId}/settings/info`,
      label: 'General',
      icon: Info,
    },
    {
      href: `/w/${workspaceId}/c/${channelId}/settings/permissions`,
      label: 'Permissions',
      icon: Shield,
    },
    {
      href: `/w/${workspaceId}/c/${channelId}/settings/members`,
      label: 'Members',
      icon: Users,
      visible: !channel?.parentId,
    },
    {
      href: `/w/${workspaceId}/c/${channelId}/settings/archived`,
      label: 'Archived tickets',
      icon: Archive,
      visible: !channel?.parentId && !isDmChannel(channel),
    },
    {
      href: `/w/${workspaceId}/c/${channelId}/settings/delete`,
      label: 'Delete channel',
      icon: Trash2,
      destructive: true,
    },
  ];

  const settingsHome = `/w/${workspaceId}/c/${channelId}/settings`;
  const onSettingsHome = pathname === settingsHome;
  const workspaceRoot = useWorkspaceRootCrumb(workspaceId);
  const visibleItems = navItems.filter((item) => item.visible !== false);
  const activeItem = visibleItems.find((item) => pathname === item.href);
  const channelHref = channelPageHref(workspaceId, channelId);

  const headerCrumbs = onSettingsHome
    ? [
        { label: workspaceRoot.label, href: workspaceRoot.href },
        {
          label: channelBreadcrumbLabel(channel),
          href: channelHref,
        },
        { label: 'Settings' },
      ]
    : [
        { label: workspaceRoot.label, href: workspaceRoot.href },
        {
          label: channelBreadcrumbLabel(channel),
          href: channelHref,
        },
        { label: 'Settings', href: settingsHome },
        { label: activeItem?.label ?? 'Settings' },
      ];

  const linearTitle = onSettingsHome
    ? 'Settings'
    : (activeItem?.label ?? 'Settings');
  const linearParent = onSettingsHome
    ? {
        label: channelBreadcrumbLabel(channel),
        href: channelHref,
      }
    : { label: 'Settings', href: settingsHome };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {isLoading ? (
        <header className="flex h-12 items-center border-b px-2 md:px-4">
          <Skeleton className="h-5 w-48" />
        </header>
      ) : (
        <ChatPageHeader
          backHref={onSettingsHome ? channelHref : settingsHome}
          backLabel={
            onSettingsHome ? 'Back to channel' : 'Back to channel settings'
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
            {navItems
              .filter((item) => item.visible !== false)
              .map((item) => {
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
                      item.destructive &&
                        'text-destructive hover:text-destructive',
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
