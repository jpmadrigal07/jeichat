'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CreateWorkspaceDialog } from './create-workspace-dialog';
import { useInactiveWorkspaceUnreadTotals } from '../_hooks/use-inactive-workspace-unread-totals';
import { formatUnreadCount } from '../_helpers/format-unread-count';
import type { Workspace } from '../_libs/workspaces';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  user: _user,
}: {
  workspaces: Workspace[];
  activeWorkspaceId?: string;
  user: User;
}) {
  const unreadTotals = useInactiveWorkspaceUnreadTotals(
    workspaces,
    activeWorkspaceId,
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {workspaces.map((ws) => {
        const isActive = ws.id === activeWorkspaceId;
        const unreadLabel = isActive
          ? null
          : formatUnreadCount(unreadTotals[ws.id] ?? 0);
        return (
          <Tooltip key={ws.id}>
            <TooltipTrigger asChild>
              <Link href={`/w/${ws.id}`} className="relative">
                <Avatar
                  className={cn(
                    'h-12 w-12 transition-all',
                    isActive
                      ? 'rounded-xl ring-2 ring-primary'
                      : 'rounded-2xl hover:rounded-xl',
                  )}
                >
                  <AvatarFallback
                    className={cn(
                      'text-sm font-medium',
                      isActive && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {ws.icon ?? getInitials(ws.name)}
                  </AvatarFallback>
                </Avatar>
                {unreadLabel ? (
                  <Badge
                    variant="destructive"
                    className="pointer-events-none absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full border-2 border-sidebar px-1 text-[0.625rem] font-semibold !bg-destructive !text-destructive-foreground"
                  >
                    {unreadLabel}
                  </Badge>
                ) : null}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {ws.name}
              {unreadLabel ? ` (${unreadTotals[ws.id]} unread)` : ''}
            </TooltipContent>
          </Tooltip>
        );
      })}

      <CreateWorkspaceDialog>
        <button className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-all hover:rounded-xl hover:border-primary hover:text-primary">
          <Plus className="h-5 w-5" />
          <span className="sr-only">Create workspace</span>
        </button>
      </CreateWorkspaceDialog>
    </div>
  );
}
