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
import { CreateWorkspaceDialog } from './create-workspace-dialog';
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
  return (
    <div className="flex flex-col items-center gap-2">
      {workspaces.map((ws) => {
        const isActive = ws.id === activeWorkspaceId;
        return (
          <Tooltip key={ws.id}>
            <TooltipTrigger asChild>
              <Link href={`/w/${ws.id}/c/general`}>
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
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{ws.name}</TooltipContent>
          </Tooltip>
        );
      })}

      <CreateWorkspaceDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-all hover:rounded-xl hover:border-primary hover:text-primary">
              <Plus className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Create workspace</TooltipContent>
        </Tooltip>
      </CreateWorkspaceDialog>
    </div>
  );
}
