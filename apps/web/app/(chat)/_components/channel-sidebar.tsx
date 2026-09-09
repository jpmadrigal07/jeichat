'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  MoreHorizontal,
  Inbox,
  ListFilter,
  UserRound,
  MessagesSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChannels } from '../_hooks/use-channels';
import { ChannelTypeIcon } from './channel-type-icon';
import { useUnreadCounts } from '../_hooks/use-unread-counts';
import { useInboxSocket, useInboxUnreadCount } from '../_hooks/use-inbox';
import { useWorkspaces } from '../_hooks/use-workspaces';
import { formatUnreadCount } from '../_helpers/format-unread-count';
import {
  groupChannelsByParent,
  groupTicketsByStatus,
  isTicketStatusOpenByDefault,
} from '../_helpers/group-channels';
import {
  TICKET_STATUSES,
  TICKET_STATUS_META,
  ticketDisplayId,
  ticketPrefixOf,
  personInitials,
  type TicketStatus,
} from '../_helpers/ticket-fields';
import { isAssignedOpenTicket } from '../_helpers/ticket-filters';
import {
  DEFAULT_SIDEBAR_TICKET_FILTER,
  channelSidebarTicketFilter,
  filterSidebarTickets,
  hasActiveSidebarTicketFilter,
  isSidebarStatusChecked,
  toggleSidebarStatus,
  type SidebarTicketFilter,
} from '../_helpers/sidebar-ticket-filter';
import { useSidebarTicketFilters } from '../_hooks/use-sidebar-ticket-filter';
import type { Channel } from '../_libs/channels';
import { CreateChannelDialog } from './create-channel-dialog';
import { CreateDmDialog } from './create-dm-dialog';
import {
  CreateThreadDialogHost,
  createThreadHref,
} from './create-thread-dialog';
import { PresenceAvatar } from './presence-avatar';
import { channelDisplayName } from '../_helpers/channel-display';
import { UserBar } from './user-bar';
import { ResizableSidebar } from './resizable-sidebar';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function ChannelSidebar({ user }: { user: User }) {
  const params = useParams<{ workspaceId?: string; channelId?: string }>();
  const pathname = usePathname();
  const workspaceId = params.workspaceId;
  const { data: workspaces } = useWorkspaces();
  const { data: channels, isLoading } = useChannels(workspaceId ?? '');
  const { data: unreadCounts } = useUnreadCounts(workspaceId ?? '');
  const { data: inboxUnread } = useInboxUnreadCount(workspaceId ?? '');
  useInboxSocket(workspaceId ?? '');
  const { filters: sidebarFilters, setChannelFilter } =
    useSidebarTicketFilters(workspaceId ?? '');

  const activeWorkspace = workspaces?.find((ws) => ws.id === workspaceId);
  const { topLevel, dms, threadsByParent } = groupChannelsByParent(channels ?? []);
  const myIssues = (channels ?? [])
    .filter((channel) => isAssignedOpenTicket(channel, user.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

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
        <div className="flex flex-col gap-3 px-2 py-2">
          <ChannelNavLink
            href={`/w/${workspaceId}/inbox`}
            name="Inbox"
            icon={Inbox}
            isActive={pathname === `/w/${workspaceId}/inbox`}
            unreadCount={inboxUnread?.unreadCount ?? 0}
            className="w-full"
          />

          {isLoading ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <MyIssuesNav
                workspaceId={workspaceId}
                tickets={myIssues}
                channels={channels ?? []}
                activeChannelId={params.channelId}
                unreadCounts={unreadCounts}
              />

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="px-1 text-xs font-medium text-muted-foreground">
                    Channels
                  </span>
                  <CreateChannelDialog
                    workspaceId={workspaceId}
                    currentUserId={user.id}
                  >
                    <Button variant="ghost" size="icon-sm" className="size-7">
                      <Plus />
                      <span className="sr-only">Create channel</span>
                    </Button>
                  </CreateChannelDialog>
                </div>
                {topLevel.map((channel) => {
                  const channelFilter = channelSidebarTicketFilter(
                    sidebarFilters,
                    channel.id,
                  );
                  const threads = filterSidebarTickets(
                    threadsByParent.get(channel.id) ?? [],
                    channelFilter,
                    user.id,
                    params.channelId,
                  );
                  const isActive = channel.id === params.channelId;
                  return (
                    <div key={channel.id} className="flex flex-col gap-0.5">
                      <div
                        className={cn(
                          'flex items-center rounded-md',
                          isActive
                            ? 'bg-secondary text-secondary-foreground'
                            : 'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
                        )}
                      >
                        <ChannelNavLink
                          href={`/w/${workspaceId}/c/${channel.id}`}
                          name={channel.name}
                          isPrivate={channel.isPrivate}
                          isActive={isActive}
                          showActiveBackground={false}
                          unreadCount={unreadCounts?.[channel.id] ?? 0}
                          className="min-w-0 flex-1 hover:bg-transparent dark:hover:bg-transparent"
                        />
                        <ChannelTicketFilterMenu
                          filter={channelFilter}
                          onChange={(next) =>
                            setChannelFilter(channel.id, next)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:bg-transparent dark:hover:bg-transparent"
                          asChild
                        >
                          <Link href={createThreadHref(channel.id)}>
                            <Plus />
                            <span className="sr-only">Create ticket</span>
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="hover:bg-transparent dark:hover:bg-transparent"
                            >
                              <MoreHorizontal />
                              <span className="sr-only">Channel options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/w/${workspaceId}/c/${channel.id}/settings`}
                              >
                                <Settings />
                                Channel Settings
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {threads.length > 0 ? (
                        <div className="ml-4 flex flex-col gap-0.5 border-l pl-1">
                          {groupTicketsByStatus(threads).map((group) => (
                            <TicketStatusGroup
                              key={group.status}
                              workspaceId={workspaceId}
                              status={group.status}
                              tickets={group.tickets}
                              activeChannelId={params.channelId}
                              unreadCounts={unreadCounts}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <DirectMessagesNav
                workspaceId={workspaceId}
                currentUserId={user.id}
                dms={dms}
                activeChannelId={params.channelId}
                unreadCounts={unreadCounts}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      <UserBar user={user} />
      <CreateThreadDialogHost workspaceId={workspaceId} />
    </ResizableSidebar>
  );
}

function ChannelTicketFilterMenu({
  filter,
  onChange,
}: {
  filter: SidebarTicketFilter;
  onChange: (filter: SidebarTicketFilter) => void;
}) {
  const active = hasActiveSidebarTicketFilter(filter);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={active ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="hover:bg-transparent dark:hover:bg-transparent"
          aria-pressed={active}
        >
          <ListFilter />
          <span className="sr-only">Filter tickets</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={filter.assignedToMe}
            onCheckedChange={(checked) =>
              onChange({ ...filter, assignedToMe: checked === true })
            }
            onSelect={(event) => event.preventDefault()}
          >
            <UserRound />
            Assigned to me
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {TICKET_STATUSES.map((status) => {
            const meta = TICKET_STATUS_META[status];
            const Icon = meta.icon;
            return (
              <DropdownMenuCheckboxItem
                key={status}
                checked={isSidebarStatusChecked(filter, status)}
                onCheckedChange={() =>
                  onChange(toggleSidebarStatus(filter, status))
                }
                onSelect={(event) => event.preventDefault()}
              >
                <Icon className={meta.iconClassName} />
                {meta.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuGroup>
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => onChange(DEFAULT_SIDEBAR_TICKET_FILTER)}
              >
                Reset filters
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function myIssueLabel(ticket: Channel, channels: Channel[]) {
  const parent = channels.find((channel) => channel.id === ticket.parentId);
  if (!parent || !ticket.ticketNumber) return ticket.name;
  return `${ticketDisplayId(ticketPrefixOf(parent), ticket.ticketNumber)} ${ticket.name}`;
}

function MyIssuesNav({
  workspaceId,
  tickets,
  channels,
  activeChannelId,
  unreadCounts,
}: {
  workspaceId: string;
  tickets: Channel[];
  channels: Channel[];
  activeChannelId: string | undefined;
  unreadCounts: Record<string, number> | undefined;
}) {
  const hasActiveTicket = tickets.some((ticket) => ticket.id === activeChannelId);

  return (
    <Collapsible
      defaultOpen={tickets.length > 0 || hasActiveTicket}
      className="group/my-issues flex flex-col gap-0.5"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full min-w-0 justify-start px-2 font-normal text-muted-foreground"
        >
          <ChevronRight
            data-icon="inline-start"
            className="transition-transform group-data-[state=open]/my-issues:rotate-90"
          />
          <span className="text-xs font-medium">My tickets</span>
          <Badge variant="secondary" className="ml-auto">
            {tickets.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-4 flex flex-col gap-0.5 border-l pl-1">
        {tickets.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No open tickets assigned to you
          </p>
        ) : (
          tickets.map((ticket) => (
            <ChannelNavLink
              key={ticket.id}
              href={`/w/${workspaceId}/c/${ticket.id}`}
              name={myIssueLabel(ticket, channels)}
              isActive={ticket.id === activeChannelId}
              unreadCount={unreadCounts?.[ticket.id] ?? 0}
              className="w-full"
            />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function TicketStatusGroup({
  workspaceId,
  status,
  tickets,
  activeChannelId,
  unreadCounts,
}: {
  workspaceId: string;
  status: TicketStatus;
  tickets: Channel[];
  activeChannelId: string | undefined;
  unreadCounts: Record<string, number> | undefined;
}) {
  const meta = TICKET_STATUS_META[status];
  const StatusIcon = meta.icon;
  const hasActiveTicket = tickets.some((ticket) => ticket.id === activeChannelId);

  return (
    <Collapsible
      defaultOpen={isTicketStatusOpenByDefault(status, hasActiveTicket)}
      className="group/status flex flex-col gap-0.5"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full min-w-0 justify-start px-2 font-normal text-muted-foreground"
        >
          <ChevronRight
            data-icon="inline-start"
            className="transition-transform group-data-[state=open]/status:rotate-90"
          />
          <StatusIcon className={meta.iconClassName} />
          <span className="truncate">{meta.label}</span>
          <Badge variant="secondary" className="ml-auto">
            {tickets.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-4 flex flex-col gap-0.5 border-l pl-1">
        {tickets.map((ticket) => (
          <ChannelNavLink
            key={ticket.id}
            href={`/w/${workspaceId}/c/${ticket.id}`}
            name={ticket.name}
            isActive={ticket.id === activeChannelId}
            unreadCount={unreadCounts?.[ticket.id] ?? 0}
            className="w-full"
          />
        ))}
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
      className="group/dms flex flex-col gap-0.5"
    >
      <div
        className={cn(
          'flex min-w-0 items-center rounded-md',
          hasActiveDm
            ? 'bg-secondary text-secondary-foreground'
            : 'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
        )}
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="min-w-0 flex-1 justify-start px-1 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent aria-expanded:text-foreground dark:hover:bg-transparent dark:aria-expanded:bg-transparent"
          >
            <ChevronRight
              data-icon="inline-start"
              className="size-3.5 transition-transform group-data-[state=open]/dms:rotate-90"
            />
            <MessagesSquare className="size-4 shrink-0" />
            <span className="truncate text-xs font-medium">Direct messages</span>
          </Button>
        </CollapsibleTrigger>
        <CreateDmDialog workspaceId={workspaceId} currentUserId={currentUserId}>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent dark:aria-expanded:bg-transparent"
          >
            <Plus />
            <span className="sr-only">Start direct message</span>
          </Button>
        </CreateDmDialog>
      </div>
      <CollapsibleContent className="flex flex-col gap-0.5 pl-5">
        {dms.length === 0 ? (
          <p className="px-1 py-0.5 text-[0.6875rem] text-muted-foreground">
            Message a teammate
          </p>
        ) : (
          dms.map((channel) => (
            <DmNavLink
              key={channel.id}
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
        'h-6 min-w-0 w-full justify-start gap-1 px-1',
        hasUnread
          ? 'font-semibold text-foreground'
          : isActive
            ? 'font-medium'
            : 'font-normal',
        hasUnread && !isActive && 'bg-muted/50 hover:bg-muted/70',
      )}
      asChild
    >
      <Link href={href}>
        {peer ? (
          <PresenceAvatar
            userId={peer.userId}
            name={peer.name}
            image={peer.image}
            className="size-4! [&_[data-slot=avatar-fallback]]:text-[0.5rem] [&_[data-slot=avatar-badge]]:size-1.5 [&_[data-slot=avatar-badge]]:ring-1"
          />
        ) : (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[0.5rem] font-medium">
            {personInitials(name)}
          </span>
        )}
        <span className="truncate text-[0.6875rem] leading-none">{name}</span>
        {unreadLabel ? (
          <Badge
            variant="destructive"
            className="ml-auto h-3.5 min-w-3.5 shrink-0 px-1 text-[0.5625rem] font-semibold bg-destructive/10! text-destructive! [a]:hover:bg-destructive/10! [a]:hover:text-destructive!"
          >
            {unreadLabel}
          </Badge>
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
  className?: string;
  showActiveBackground?: boolean;
}) {
  const hasUnread = unreadCount > 0;
  const unreadLabel = formatUnreadCount(unreadCount);
  const iconClass = hasUnread ? 'text-foreground' : 'text-muted-foreground';

  return (
    <Button
      variant={isActive && showActiveBackground ? 'secondary' : 'ghost'}
      size="lg"
      className={cn(
        'min-w-0 justify-start gap-1.5 px-2',
        hasUnread
          ? 'font-semibold text-foreground'
          : isActive
            ? 'font-medium'
            : 'font-normal',
        hasUnread && !isActive && 'bg-muted/50 hover:bg-muted/70',
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
          <ChannelTypeIcon isPrivate={isPrivate} className={iconClass} />
        ) : Icon ? (
          <Icon className={iconClass} />
        ) : null}
        <span className="truncate">{name}</span>
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
  );
}
