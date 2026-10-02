'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import {
  AtSign,
  BellOff,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderMinus,
  Settings,
  Inbox,
  LayoutGrid,
  MessagesSquare,
  StickyNotes,
  GripVertical,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { ChannelTypeIcon } from './channel-type-icon';
import { useUnreadCounts } from '../_hooks/use-unread-counts';
import { useInboxSocket, useInboxUnreadCount } from '../_hooks/use-inbox';
import { useNotificationSettings } from '../_hooks/use-notification-settings';
import { useOnlineMemberCount } from '../_hooks/use-online-member-count';
import { useWorkspaces } from '../_hooks/use-workspaces';
import { formatUnreadCount } from '../_helpers/format-unread-count';
import { notificationLevelOf } from '../_helpers/notification-level';
import type {
  NotificationLevel,
  NotificationSettings,
} from '../_libs/notification-settings';
import {
  SIDEBAR_TICKETS_PER_STATUS,
  groupChannelsByParent,
  groupTicketsByStatus,
  isTicketStatusOpenByDefault,
} from '../_helpers/group-channels';
import {
  TICKET_STATUS_META,
  personInitials,
  type TicketStatus,
} from '../_helpers/ticket-fields';
import { isAssignedTicket } from '../_helpers/ticket-filters';
import {
  channelSidebarTicketFilter,
  filterSidebarTickets,
  type SidebarTicketFilter,
} from '../_helpers/sidebar-ticket-filter';
import { isChannelFolderCollapsed } from '../_helpers/sidebar-channel-collapse';
import { useSidebarTicketFilters } from '../_hooks/use-sidebar-ticket-filter';
import { useSidebarChannelCollapse } from '../_hooks/use-sidebar-channel-collapse';
import { useSidebarChannelOrder } from '../_hooks/use-sidebar-channel-order';
import { useLongPress } from '../_hooks/use-long-press';
import { reorderedSidebarChannelIds } from '../_helpers/sidebar-channel-order';
import {
  clearSidebarChannelDropIndicator,
  showSidebarChannelDropIndicator,
  sidebarChannelDragTargets,
  sidebarChannelIdBeforePointer,
  startSidebarChannelDrag,
} from '../_helpers/sidebar-channel-drag';
import {
  channelBoardHref,
  conversationPageHref,
  type Channel,
} from '../_libs/channels';
import { ChannelContextMenu } from './channel-context-menu';
import { ChannelOptionsMenu } from './channel-options-menu';
import { ChannelTicketFilterMenu } from './channel-ticket-filter-menu';
import { CreateChannelDialog } from './create-channel-dialog';
import { CreateDmDialog } from './create-dm-dialog';
import { DmContextMenu } from './dm-context-menu';
import { TicketContextMenu } from './ticket-context-menu';
import {
  CreateThreadDialogHost,
  createThreadHref,
} from './create-thread-dialog';
import { PresenceAvatar } from './presence-avatar';
import { UnreadBadge } from './unread-badge';
import { channelDisplayName } from '../_helpers/channel-display';
import { UserBar } from './user-bar';
import { VoiceChannelsNav } from './voice-channels-nav';
import { VoiceConnectionPanel } from './voice-controls';
import { HistoryNavButtons } from './history-nav-buttons';
import { ResizableSidebar } from './resizable-sidebar';
import { WorkspaceSwitcher } from './workspace-switcher';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function ChannelSidebar({ user }: { user: User }) {
  const params = useParams<{
    workspaceId?: string;
    channelId?: string;
    ticketId?: string;
  }>();
  const pathname = usePathname();
  const workspaceId = params.workspaceId;
  const activeChannelId = params.ticketId ?? params.channelId;
  const { data: workspaces } = useWorkspaces();
  const { data: channels, isLoading } = useChannels(workspaceId ?? '');
  const { data: unreadCounts } = useUnreadCounts(workspaceId ?? '');
  const { data: notificationSettings } = useNotificationSettings(
    workspaceId ?? '',
  );
  const { data: inboxUnread } = useInboxUnreadCount(workspaceId ?? '');
  useInboxSocket(workspaceId ?? '');
  const { filters: sidebarFilters, setChannelFilter } =
    useSidebarTicketFilters(workspaceId ?? '');
  const { collapsedIds, setChannelCollapsed } = useSidebarChannelCollapse(
    workspaceId ?? '',
  );
  const { setOrder, sortTopLevel } = useSidebarChannelOrder(workspaceId ?? '');
  const [liftedChannelId, setLiftedChannelId] = useState<string | null>(null);
  const channelListRef = useRef<HTMLDivElement>(null);

  const cancelChannelReorder = useCallback(() => {
    clearSidebarChannelDropIndicator(channelListRef.current);
    setLiftedChannelId(null);
  }, []);

  useEffect(() => {
    if (!liftedChannelId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelChannelReorder();
    };

    const onPointerDown = (event: PointerEvent) => {
      const root = channelListRef.current;
      if (!root?.contains(event.target as Node)) cancelChannelReorder();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [cancelChannelReorder, liftedChannelId]);

  const activeWorkspace = workspaces?.find((ws) => ws.id === workspaceId);
  const { topLevel, voice, dms, threadsByParent } = groupChannelsByParent(
    channels ?? [],
  );
  const orderedTopLevel = sortTopLevel(topLevel);
  const sidebarChannelIds = orderedTopLevel.map((channel) => channel.id);

  const moveSidebarChannel = useCallback(
    (channelId: string, beforeChannelId: string | null) => {
      const baseIds =
        sidebarChannelIds.length > 0
          ? sidebarChannelIds
          : topLevel.map((channel) => channel.id);
      const next = reorderedSidebarChannelIds({
        channelIds: baseIds,
        channelId,
        beforeChannelId,
      });
      if (next) setOrder(next);
      setLiftedChannelId(null);
    },
    [setOrder, sidebarChannelIds, topLevel],
  );

  const onChannelListDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const targets = sidebarChannelDragTargets(channelListRef.current);
    showSidebarChannelDropIndicator(
      channelListRef.current,
      targets,
      event.clientY,
    );
  }, []);

  const onChannelListDragLeave = useCallback(() => {
    clearSidebarChannelDropIndicator(channelListRef.current);
  }, []);

  const onChannelListDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      clearSidebarChannelDropIndicator(channelListRef.current);
      const channelId = event.dataTransfer.getData('text/plain');
      if (!channelId) return;
      const beforeChannelId = sidebarChannelIdBeforePointer(
        channelListRef.current,
        event.clientY,
      );
      moveSidebarChannel(channelId, beforeChannelId);
    },
    [moveSidebarChannel],
  );

  const onReorderPointerMove = useCallback((clientY: number) => {
    const targets = sidebarChannelDragTargets(channelListRef.current);
    showSidebarChannelDropIndicator(
      channelListRef.current,
      targets,
      clientY,
    );
  }, []);

  const onReorderPointerCommit = useCallback(
    (channelId: string, clientY: number) => {
      clearSidebarChannelDropIndicator(channelListRef.current);
      const beforeChannelId = sidebarChannelIdBeforePointer(
        channelListRef.current,
        clientY,
      );
      moveSidebarChannel(channelId, beforeChannelId);
    },
    [moveSidebarChannel],
  );

  const onReorderPointerCancel = cancelChannelReorder;
  const onlineMemberCount = useOnlineMemberCount(workspaceId);
  const myTicketsUnread = (channels ?? []).reduce((total, channel) => {
    if (!isAssignedTicket(channel, user.id)) return total;
    return total + (unreadCounts?.[channel.id] ?? 0);
  }, 0);

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
      <div className="flex h-12 min-w-0 items-center gap-1 border-b px-4">
        <Sheet key={pathname}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Switch workspace"
            >
              <LayoutGrid className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-24! gap-0 p-0 sm:max-w-24">
            <SheetHeader className="sr-only">
              <SheetTitle>Workspaces</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 justify-center overflow-y-auto py-3">
              <WorkspaceSwitcher
                workspaces={workspaces ?? []}
                activeWorkspaceId={workspaceId}
                user={user}
              />
            </div>
          </SheetContent>
        </Sheet>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex min-w-0 flex-1 items-center gap-1 text-sm font-semibold transition-colors hover:text-foreground/80">
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
        <HistoryNavButtons />
      </div>

      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-hidden [&_[data-slot=scroll-area-viewport]>div]:block! [&_[data-slot=scroll-area-viewport]>div]:min-w-0! [&_[data-slot=scroll-area-viewport]>div]:w-full!">
        <div className="flex min-w-0 flex-col gap-3 px-2 py-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <ChannelNavLink
              href={`/w/${workspaceId}/inbox`}
              name="Inbox"
              icon={Inbox}
              isActive={pathname === `/w/${workspaceId}/inbox`}
              unreadCount={inboxUnread?.unreadCount ?? 0}
              className="w-full"
            />
            <ChannelNavLink
              href={`/w/${workspaceId}/my-tickets`}
              name="My tickets"
              icon={StickyNotes}
              isActive={pathname === `/w/${workspaceId}/my-tickets`}
              unreadCount={myTicketsUnread}
              className="w-full"
            />
            <ChannelNavLink
              href={`/w/${workspaceId}/members`}
              name="Members"
              icon={Users}
              isActive={pathname === `/w/${workspaceId}/members`}
              unreadCount={0}
              onlineCount={onlineMemberCount}
              className="w-full"
            />
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="mb-0.5 px-1">
                  <div className="flex items-center justify-between">
                    <span className="px-1 text-sm font-medium text-muted-foreground">
                      Channels
                    </span>
                    <CreateChannelDialog
                      workspaceId={workspaceId}
                      currentUserId={user.id}
                    >
                      <Button variant="ghost" size="icon-sm" className="size-7">
                        <Plus className="size-3.5" />
                        <span className="sr-only">Create channel</span>
                      </Button>
                    </CreateChannelDialog>
                  </div>
                  {orderedTopLevel.length > 1 ? (
                    <span className="sr-only">
                      Hold a channel, then drag to reorder
                    </span>
                  ) : null}
                </div>
                <div
                  ref={channelListRef}
                  className="flex min-w-0 flex-col gap-0.5"
                  onDragOver={onChannelListDragOver}
                  onDragLeave={onChannelListDragLeave}
                  onDrop={onChannelListDrop}
                >
                  {orderedTopLevel.map((channel) => (
                    <ChannelFolder
                      key={channel.id}
                      workspaceId={workspaceId}
                      channel={channel}
                      tickets={threadsByParent.get(channel.id) ?? []}
                      filter={channelSidebarTicketFilter(
                        sidebarFilters,
                        channel.id,
                      )}
                      onFilterChange={(next) =>
                        setChannelFilter(channel.id, next)
                      }
                      collapsed={isChannelFolderCollapsed(
                        collapsedIds,
                        channel.id,
                      )}
                      onCollapsedChange={(next) =>
                        setChannelCollapsed(channel.id, next)
                      }
                      currentUserId={user.id}
                      activeChannelId={activeChannelId}
                      unreadCounts={unreadCounts}
                      notificationSettings={notificationSettings}
                      reorderActive={liftedChannelId !== null}
                      reorderLifted={liftedChannelId === channel.id}
                      onReorderLift={() => setLiftedChannelId(channel.id)}
                      onReorderDragEnd={() => setLiftedChannelId(null)}
                      onReorderPointerMove={onReorderPointerMove}
                      onReorderPointerCommit={onReorderPointerCommit}
                      onReorderPointerCancel={onReorderPointerCancel}
                    />
                  ))}
                </div>
              </div>

              <VoiceChannelsNav
                workspaceId={workspaceId}
                currentUserId={user.id}
                channels={voice}
                activeChannelId={activeChannelId}
              />

              <DirectMessagesNav
                workspaceId={workspaceId}
                currentUserId={user.id}
                dms={dms}
                activeChannelId={activeChannelId}
                unreadCounts={unreadCounts}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      <VoiceConnectionPanel />
      <UserBar user={user} />
      <CreateThreadDialogHost workspaceId={workspaceId} />
    </ResizableSidebar>
  );
}

function ChannelFolder({
  workspaceId,
  channel,
  tickets,
  filter,
  onFilterChange,
  collapsed,
  onCollapsedChange,
  currentUserId,
  activeChannelId,
  unreadCounts,
  notificationSettings,
  reorderActive,
  reorderLifted,
  onReorderLift,
  onReorderDragEnd,
  onReorderPointerMove,
  onReorderPointerCommit,
  onReorderPointerCancel,
}: {
  workspaceId: string;
  channel: Channel;
  tickets: Channel[];
  filter: SidebarTicketFilter;
  onFilterChange: (filter: SidebarTicketFilter) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  currentUserId: string;
  activeChannelId: string | undefined;
  unreadCounts: Record<string, number> | undefined;
  notificationSettings: NotificationSettings | undefined;
  reorderActive: boolean;
  reorderLifted: boolean;
  onReorderLift: () => void;
  onReorderDragEnd: () => void;
  onReorderPointerMove: (clientY: number) => void;
  onReorderPointerCommit: (channelId: string, clientY: number) => void;
  onReorderPointerCancel: () => void;
}) {
  const isActive = channel.id === activeChannelId;
  const visibleTickets = filterSidebarTickets(
    tickets,
    filter,
    currentUserId,
    activeChannelId,
  );
  const hasTickets = tickets.length > 0;
  const [collapseEpoch, setCollapseEpoch] = useState(0);
  const channelUnread = unreadCounts?.[channel.id] ?? 0;
  const notificationLevel = notificationLevelOf(
    notificationSettings,
    channel.id,
  );
  // Quiet channels stay bold when unread but never show the red count badge.
  const isQuiet = notificationLevel !== 'all';
  const ticketUnread =
    collapsed && hasTickets
      ? tickets.reduce(
          (total, ticket) => total + (unreadCounts?.[ticket.id] ?? 0),
          0,
        )
      : 0;
  const unreadCount = (isQuiet ? 0 : channelUnread) + ticketUnread;
  const collapseLabel = `Collapse tickets in ${channel.name}`;

  const touchReorderRef = useRef(false);
  const touchMovedRef = useRef(false);
  const dragStartedRef = useRef(false);
  const pointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [touchReorder, setTouchReorder] = useState(false);

  const TOUCH_REORDER_MOVE_PX = 12;

  const handleReorderActivate = useCallback(
    (detail: { pointerId: number; pointerType: string; target: HTMLElement }) => {
      onReorderLift();
      if (detail.pointerType === 'touch') {
        touchReorderRef.current = true;
        touchMovedRef.current = false;
        setTouchReorder(true);
        detail.target.setPointerCapture(detail.pointerId);
      }
    },
    [onReorderLift],
  );

  const longPress = useLongPress(handleReorderActivate);

  const onRowPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerOriginRef.current = { x: event.clientX, y: event.clientY };
    dragStartedRef.current = false;
    longPress.onPointerDown(event);
  };

  const onRowPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    longPress.onPointerMove(event);
    if (!touchReorderRef.current) return;
    const origin = pointerOriginRef.current;
    if (!origin) return;
    const distance = Math.hypot(
      event.clientX - origin.x,
      event.clientY - origin.y,
    );
    if (distance < TOUCH_REORDER_MOVE_PX) return;
    touchMovedRef.current = true;
    onReorderPointerMove(event.clientY);
  };

  const onRowPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (touchReorderRef.current) {
      if (touchMovedRef.current) {
        onReorderPointerCommit(channel.id, event.clientY);
      } else {
        onReorderPointerCancel();
      }
      touchReorderRef.current = false;
      setTouchReorder(false);
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Already released.
      }
    } else if (
      reorderLifted &&
      event.pointerType !== 'touch' &&
      !dragStartedRef.current
    ) {
      onReorderPointerCancel();
    }
    pointerOriginRef.current = null;
    longPress.onPointerUp();
    longPress.resetActivated();
  };

  return (
    <div
      data-sidebar-channel-id={channel.id}
      className={cn(
        'relative flex min-w-0 flex-col gap-0.5 transition-opacity duration-150',
        reorderActive && !reorderLifted && 'opacity-45',
        'data-drop-before:before:absolute data-drop-before:before:inset-x-0 data-drop-before:before:-top-0.5 data-drop-before:before:z-20 data-drop-before:before:h-0.5 data-drop-before:before:rounded-full data-drop-before:before:bg-primary',
        'data-drop-after:after:absolute data-drop-after:after:inset-x-0 data-drop-after:after:-bottom-0.5 data-drop-after:after:z-20 data-drop-after:after:h-0.5 data-drop-after:after:rounded-full data-drop-after:after:bg-primary',
      )}
    >
      <ChannelContextMenu workspaceId={workspaceId} channelId={channel.id}>
        <div
          draggable={reorderLifted && !touchReorder}
          aria-label={
            reorderLifted ? `${channel.name}, ready to drag` : undefined
          }
          className={cn(
            'flex min-h-10 min-w-0 touch-manipulation items-center overflow-hidden rounded-md transition-[box-shadow,transform,background-color] sm:min-h-8',
            isActive && !reorderLifted
              ? 'bg-secondary text-secondary-foreground'
              : !reorderLifted &&
                  'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
            reorderLifted &&
              'relative z-10 scale-[1.03] select-none border border-primary/30 bg-background shadow-lg ring-2 ring-primary',
            reorderLifted && !touchReorder && 'cursor-grab active:cursor-grabbing',
            reorderLifted && touchReorder && 'touch-none',
          )}
          onPointerDown={onRowPointerDown}
          onPointerMove={onRowPointerMove}
          onPointerUp={onRowPointerUp}
          onPointerCancel={() => {
            if (touchReorderRef.current) {
              onReorderPointerCancel();
              touchReorderRef.current = false;
              setTouchReorder(false);
            }
            longPress.onPointerCancel();
          }}
          onContextMenu={longPress.onContextMenu}
          onDragStart={(event) => {
            dragStartedRef.current = true;
            startSidebarChannelDrag(event, channel.id);
          }}
          onDragEnd={() => {
            dragStartedRef.current = false;
            onReorderDragEnd();
            longPress.resetActivated();
          }}
          onClickCapture={longPress.onClickCapture}
        >
          {reorderLifted ? (
            <GripVertical
              className="ml-1 size-4 shrink-0 text-primary motion-safe:animate-pulse"
              aria-hidden
            />
          ) : null}
          <ChannelNavLink
            href={`/w/${workspaceId}/c/${channel.id}`}
            name={channel.name}
            isPrivate={channel.isPrivate}
            isActive={isActive}
            showActiveBackground={false}
            unreadCount={unreadCount}
            quietUnread={isQuiet && channelUnread > 0}
            notificationLevel={notificationLevel}
            className={cn(
              'min-w-0 flex-1 hover:bg-transparent dark:hover:bg-transparent',
              reorderLifted && 'pointer-events-none',
            )}
          />
          <div
            className={cn(
              'flex shrink-0 items-center',
              reorderLifted && 'pointer-events-none',
            )}
          >
            <ChannelTicketFilterMenu
              channelName={channel.name}
              filter={filter}
              onChange={onFilterChange}
            />
            {hasTickets ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-transparent dark:hover:bg-transparent"
                    aria-label={collapseLabel}
                    onClick={() => {
                      onCollapsedChange(true);
                      setCollapseEpoch((epoch) => epoch + 1);
                    }}
                  >
                    <FolderMinus className="size-3.5" />
                    <span className="sr-only">{collapseLabel}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Collapse tickets</TooltipContent>
              </Tooltip>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-transparent dark:hover:bg-transparent"
              asChild
            >
              <Link href={createThreadHref(channel.id)}>
                <Plus className="size-3.5" />
                <span className="sr-only">Create ticket</span>
              </Link>
            </Button>
            <ChannelOptionsMenu
              workspaceId={workspaceId}
              channelId={channel.id}
              channelName={channel.name}
            />
          </div>
        </div>
      </ChannelContextMenu>
      {visibleTickets.length > 0 ? (
        <div className="ml-4 flex min-w-0 flex-col gap-0.5 border-l pl-1">
          {groupTicketsByStatus(visibleTickets).map((group) => (
            <TicketStatusGroup
              key={`${group.status}-${collapsed ? `collapsed-${collapseEpoch}` : 'expanded'}`}
              workspaceId={workspaceId}
              channelId={channel.id}
              status={group.status}
              tickets={group.tickets}
              activeChannelId={activeChannelId}
              unreadCounts={unreadCounts}
              forceClosed={collapsed}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TicketStatusGroup({
  workspaceId,
  channelId,
  status,
  tickets,
  activeChannelId,
  unreadCounts,
  forceClosed = false,
}: {
  workspaceId: string;
  channelId: string;
  status: TicketStatus;
  tickets: Channel[];
  activeChannelId: string | undefined;
  unreadCounts: Record<string, number> | undefined;
  forceClosed?: boolean;
}) {
  const meta = TICKET_STATUS_META[status];
  const StatusIcon = meta.icon;
  const hasActiveTicket = tickets.some((ticket) => ticket.id === activeChannelId);
  const visibleTickets = tickets.slice(0, SIDEBAR_TICKETS_PER_STATUS);
  const hasMoreTickets = tickets.length > SIDEBAR_TICKETS_PER_STATUS;

  return (
    <Collapsible
      defaultOpen={
        !forceClosed && isTicketStatusOpenByDefault(status, hasActiveTicket)
      }
      className="group/status flex min-w-0 flex-col gap-0.5"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant={hasActiveTicket ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'w-full min-w-0 max-w-full shrink justify-start overflow-hidden px-2 text-xs font-normal',
            !hasActiveTicket &&
              'text-muted-foreground aria-expanded:bg-transparent aria-expanded:text-muted-foreground aria-expanded:hover:bg-muted aria-expanded:hover:text-foreground dark:aria-expanded:hover:bg-muted/50',
          )}
        >
          <ChevronRight
            data-icon="inline-start"
            className="size-3.5 transition-transform group-data-[state=open]/status:rotate-90"
          />
          <StatusIcon
            className={cn('size-3.5', meta.iconClassName)}
          />
          <span className="truncate">{meta.label}</span>
          <Badge variant="secondary" className="ml-auto">
            {tickets.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-4 flex min-w-0 flex-col gap-0.5 border-l pl-1">
        {visibleTickets.map((ticket) => (
          <TicketContextMenu
            key={ticket.id}
            workspaceId={workspaceId}
            ticket={ticket}
          >
            <ChannelNavLink
              href={conversationPageHref(workspaceId, ticket)}
              name={ticket.name}
              isActive={ticket.id === activeChannelId}
              unreadCount={unreadCounts?.[ticket.id] ?? 0}
              className="w-full text-xs"
            />
          </TicketContextMenu>
        ))}
        {hasMoreTickets ? (
          <Button
            variant="ghost"
            size="lg"
            className="min-w-0 w-full max-w-full shrink justify-start overflow-hidden px-2 text-xs font-normal text-muted-foreground"
            asChild
          >
            <Link href={channelBoardHref(workspaceId, channelId)}>See more</Link>
          </Button>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
}

function DirectMessagesNav({
  workspaceId,
  currentUserId,
  dms,
  activeChannelId,
  unreadCounts,
}: {
  workspaceId: string;
  currentUserId: string;
  dms: Channel[];
  activeChannelId: string | undefined;
  unreadCounts: Record<string, number> | undefined;
}) {
  const hasActiveDm = dms.some((channel) => channel.id === activeChannelId);

  return (
    <Collapsible
      defaultOpen={dms.length > 0 || hasActiveDm}
      className="group/dms flex min-w-0 flex-col gap-0.5"
    >
      <div
        className={cn(
          'flex min-w-0 items-center overflow-hidden rounded-md',
          hasActiveDm
            ? 'bg-secondary text-secondary-foreground'
            : 'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
        )}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="min-w-0 flex-1 justify-start overflow-hidden px-1 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-foreground dark:hover:bg-transparent dark:aria-expanded:bg-transparent"
          >
            <ChevronRight
              data-icon="inline-start"
              className="size-4 transition-transform group-data-[state=open]/dms:rotate-90"
            />
            <MessagesSquare className="size-4.5 shrink-0" />
            <span className="truncate text-sm font-medium">
              Direct messages
            </span>
          </Button>
        </CollapsibleTrigger>
        <CreateDmDialog workspaceId={workspaceId} currentUserId={currentUserId}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent dark:aria-expanded:bg-transparent"
          >
            <Plus className="size-3.5" />
            <span className="sr-only">Start direct message</span>
          </Button>
        </CreateDmDialog>
      </div>
      <CollapsibleContent className="flex min-w-0 flex-col gap-0.5 pl-5">
        {dms.length === 0 ? (
          <p className="px-1 py-0.5 text-xs text-muted-foreground">
            Message a teammate
          </p>
        ) : (
          dms.map((channel) => (
            <DmContextMenu
              key={channel.id}
              workspaceId={workspaceId}
              channelId={channel.id}
              name={channelDisplayName(channel)}
              isActive={channel.id === activeChannelId}
            >
              <DmNavLink
                href={`/w/${workspaceId}/c/${channel.id}`}
                name={channelDisplayName(channel)}
                peer={
                  channel.dmPeer
                    ? {
                        userId: channel.dmPeer.id,
                        name: channel.dmPeer.name,
                        image: channel.dmPeer.image,
                      }
                    : undefined
                }
                isActive={channel.id === activeChannelId}
                unreadCount={unreadCounts?.[channel.id] ?? 0}
              />
            </DmContextMenu>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function DmNavLink({
  href,
  name,
  peer,
  isActive,
  unreadCount,
}: {
  href: string;
  name: string;
  peer?: { userId: string; name: string; image: string | null };
  isActive: boolean;
  unreadCount: number;
}) {
  const hasUnread = unreadCount > 0;
  const unreadLabel = formatUnreadCount(unreadCount);

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      className={cn(
        'h-8 min-w-0 w-full max-w-full shrink justify-start gap-1.5 overflow-hidden px-1',
        hasUnread
          ? 'font-semibold text-foreground'
          : isActive
            ? 'font-medium'
            : 'font-normal',
      )}
      asChild
    >
      <Link href={href}>
        {peer ? (
          <PresenceAvatar
            userId={peer.userId}
            name={peer.name}
            image={peer.image}
            size="sm"
            className="size-5! [&_[data-slot=avatar-fallback]]:text-[0.5625rem]"
          />
        ) : (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.5625rem] font-medium">
            {personInitials(name)}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-xs leading-none">
          {name}
        </span>
        {unreadLabel ? (
          <UnreadBadge className="ml-auto h-3.5 min-w-3.5 shrink-0 px-1 text-[0.5625rem] font-semibold">
            {unreadLabel}
          </UnreadBadge>
        ) : null}
      </Link>
    </Button>
  );
}

function ChannelNavLink({
  href,
  name,
  icon: Icon,
  avatar,
  isPrivate,
  isActive,
  unreadCount,
  onlineCount = 0,
  quietUnread = false,
  notificationLevel = 'all',
  className,
  showActiveBackground = true,
}: {
  href: string;
  name: string;
  icon?: typeof Inbox;
  avatar?: { userId: string; name: string; image: string | null };
  isPrivate?: boolean;
  isActive: boolean;
  unreadCount: number;
  /** Green badge with the number of people online; hidden when zero. */
  onlineCount?: number;
  /** Unread messages that shouldn't show a badge (mentions only / muted). */
  quietUnread?: boolean;
  notificationLevel?: NotificationLevel;
  className?: string;
  showActiveBackground?: boolean;
}) {
  const hasUnread = unreadCount > 0 || quietUnread;
  const unreadLabel = formatUnreadCount(unreadCount);
  const iconClass = hasUnread ? 'text-foreground' : 'text-muted-foreground';
  const isMuted = notificationLevel === 'muted';

  return (
    <Button
      variant={isActive && showActiveBackground ? 'secondary' : 'ghost'}
      size="lg"
      className={cn(
        'min-w-0 max-w-full shrink justify-start gap-1.5 overflow-hidden px-2 text-sm',
        hasUnread
          ? 'font-semibold text-foreground'
          : isActive
            ? 'font-medium'
            : 'font-normal',
        isMuted && !hasUnread && 'text-muted-foreground',
        className,
      )}
      asChild
    >
      <Link href={href}>
        {avatar ? (
          <PresenceAvatar
            userId={avatar.userId}
            name={avatar.name}
            image={avatar.image}
            size="sm"
            showOffline
          />
        ) : isPrivate !== undefined ? (
          <ChannelTypeIcon
            isPrivate={isPrivate}
            className={cn(iconClass, 'size-4.5')}
          />
        ) : Icon ? (
          <Icon className={cn('size-4.5', iconClass)} />
        ) : null}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        {notificationLevel === 'muted' ? (
          <BellOff className="size-3 shrink-0 text-muted-foreground" />
        ) : notificationLevel === 'mentions' ? (
          <AtSign className="size-3 shrink-0 text-muted-foreground" />
        ) : null}
        {unreadLabel ? (
          <UnreadBadge className="ml-auto h-4 min-w-4 shrink-0 px-1 text-[0.625rem] font-semibold">
            {unreadLabel}
          </UnreadBadge>
        ) : null}
        {onlineCount > 0 ? (
          <Badge className="ml-auto h-4 shrink-0 bg-online px-1.5 text-[0.625rem] font-semibold whitespace-nowrap text-black">
            {onlineCount > 99 ? '99+' : onlineCount} online
          </Badge>
        ) : null}
      </Link>
    </Button>
  );
}
