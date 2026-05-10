'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Hash, Plus, ChevronDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useChannels } from '../_hooks/use-channels';
import { useWorkspaces } from '../_hooks/use-workspaces';
import { CreateChannelDialog } from './create-channel-dialog';
import { WorkspaceSettingsDialog } from './workspace-settings-dialog';

export function ChannelSidebar() {
  const params = useParams<{ workspaceId?: string; channelId?: string }>();
  const workspaceId = params.workspaceId;
  const { data: workspaces } = useWorkspaces();
  const { data: channels, isLoading } = useChannels(workspaceId ?? '');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeWorkspace = workspaces?.find((ws) => ws.id === workspaceId);

  if (!workspaceId) {
    return (
      <div className="flex w-60 flex-col border-r bg-sidebar/50">
        <div className="flex h-12 items-center px-4 font-semibold border-b">
          Select a workspace
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-60 flex-col border-r bg-sidebar/50">
      <div className="flex h-12 items-center px-4 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 truncate font-semibold text-sm hover:text-foreground/80 transition-colors">
              <span className="truncate">
                {activeWorkspace?.name ?? 'Workspace'}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Workspace Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-medium uppercase text-muted-foreground">
              Channels
            </span>
            <CreateChannelDialog workspaceId={workspaceId}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Plus className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Create channel</TooltipContent>
              </Tooltip>
            </CreateChannelDialog>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {channels?.map((channel) => {
                const isActive = channel.id === params.channelId;
                return (
                  <Button
                    key={channel.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'justify-start gap-1.5 h-8 px-2 font-normal',
                      isActive && 'font-medium',
                    )}
                    asChild
                  >
                    <Link href={`/w/${workspaceId}/c/${channel.id}`}>
                      <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{channel.name}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {activeWorkspace && (
        <WorkspaceSettingsDialog
          workspace={activeWorkspace}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </div>
  );
}
