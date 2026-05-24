'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Info, Shield, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useChannels } from '../../../../../../_hooks/use-channels';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
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
      href: `/w/${workspaceId}/c/${channelId}/settings/delete`,
      label: 'Delete channel',
      icon: Trash2,
      destructive: true,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-3 border-b px-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/w/${workspaceId}/c/${channelId}`}>
            <ArrowLeft />
            <span className="sr-only">Back to channel</span>
          </Link>
        </Button>
        <div className="min-w-0">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <>
              <p className="truncate text-sm font-semibold">
                #{channel?.name ?? 'Channel'} settings
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Update channel details, permissions, or delete it permanently.
              </p>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 shrink-0 border-r p-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
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
                    item.destructive && 'text-destructive hover:text-destructive',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
