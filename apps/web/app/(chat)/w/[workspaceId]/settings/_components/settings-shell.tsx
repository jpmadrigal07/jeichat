'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Info, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaces } from '../../../../_hooks/use-workspaces';

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
      href: `/w/${workspaceId}/settings/delete`,
      label: 'Delete workspace',
      icon: Trash2,
      ownerOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.ownerOnly || isOwner,
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-3 border-b px-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/w/${workspaceId}`}>
            <ArrowLeft />
            <span className="sr-only">Back to workspace</span>
          </Link>
        </Button>
        <div className="min-w-0">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <>
              <p className="truncate text-sm font-semibold">
                {workspace?.name ?? 'Workspace'} settings
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Manage workspace details, members, and preferences.
              </p>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 shrink-0 border-r p-3">
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

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
