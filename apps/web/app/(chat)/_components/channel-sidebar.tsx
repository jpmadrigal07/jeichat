'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Hash, Plus, ChevronDown, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChannels } from '../_hooks/use-channels';
import { useUnreadCounts } from '../_hooks/use-unread-counts';
import { useWorkspaces } from '../_hooks/use-workspaces';
import { formatUnreadCount } from '../_helpers/format-unread-count';
import { CreateChannelDialog } from './create-channel-dialog';
import { ChannelSettingsDialog } from './channel-settings-dialog';
import { UserBar } from './user-bar';
import { ResizableSidebar } from './resizable-sidebar';
import type { Channel } from '../_libs/channels';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function ChannelSidebar({ user }: { user: User }) {
  const params = useParams<{ workspaceId?: string; channelId?: string }>();
  const workspaceId = params.workspaceId;
  const { data: workspaces } = useWorkspaces();
  const { data: channels, isLoading } = useChannels(workspaceId ?? '');
  const { data: unreadCounts } = useUnreadCounts(workspaceId ?? '');
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  const activeWorkspace = workspaces?.find((ws) => ws.id === workspaceId);

  if (!workspaceId) {
    return (
      <ResizableSidebar className="border-r bg-sidebar/50">
        <div className="flex h-12 items-center px-4 font-semibold border-b">
          Select a workspace
        </div>
        <div className="flex-1" />
        <UserBar user={user} />
      </ResizableSidebar>
    );
  }

  return (
    <ResizableSidebar className="border-r bg-sidebar/50">
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
            <DropdownMenuItem asChild>
              <Link href={`/w/${workspaceId}/settings`}>
                <Settings />
                Workspace Settings
              </Link>
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
              <Button variant="ghost" size="icon-sm">
                <Plus />
                <span className="sr-only">Create channel</span>
              </Button>
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
                const unreadCount = unreadCounts?.[channel.id] ?? 0;
                const hasUnread = unreadCount > 0;
                const unreadLabel = formatUnreadCount(unreadCount);
                return (
                  <div key={channel.id} className="flex items-center gap-0.5">
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="lg"
                      className={cn(
                        'min-w-0 flex-1 justify-start gap-1.5 px-2',
                        hasUnread
                          ? 'font-semibold text-foreground'
                          : isActive
                            ? 'font-medium'
                            : 'font-normal',
                        hasUnread &&
                          !isActive &&
                          'bg-muted/50 hover:bg-muted/70',
                      )}
                      asChild
                    >
                      <Link href={`/w/${workspaceId}/c/${channel.id}`}>
                        <Hash
                          className={cn(
                            hasUnread
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}
                        />
                        <span className="truncate">{channel.name}</span>
                        {unreadLabel ? (
                          <Badge
                            variant="destructive"
                            className="ml-auto h-4 min-w-4 shrink-0 px-1 text-[0.625rem] font-semibold !bg-destructive/10 !text-destructive [a]:hover:!bg-destructive/10 [a]:hover:!text-destructive"
                          >
                            {unreadLabel}
                          </Badge>
                        ) : null}
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal />
                          <span className="sr-only">Channel options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          onSelect={() => setEditingChannel(channel)}
                        >
                          <Settings />
                          Channel Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      <UserBar user={user} />

      {editingChannel && (
        <ChannelSettingsDialog
          workspaceId={workspaceId}
          channel={editingChannel}
          open={!!editingChannel}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingChannel(null);
          }}
        />
      )}
    </ResizableSidebar>
  );
}
