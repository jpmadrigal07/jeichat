'use client';

import type { DragEvent, FormEvent, MouseEvent, PointerEvent } from 'react';
import { useState } from 'react';
import { Check, Eye, Tag, UserRound } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useUpdateChannel } from '@chat/_hooks/use-channels';
import {
  useCreateWorkspaceLabel,
  useWorkspaceLabels,
  useWorkspaceMembers,
} from '@chat/_hooks/use-workspaces';
import type { TicketLabel, TicketWatcher } from '@chat/_libs/channels';
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_META,
  TICKET_STATUSES,
  TICKET_STATUS_META,
  labelColorClass,
  nextLabelColor,
  personInitials,
  type TicketPriority,
  type TicketStatus,
} from '@chat/_helpers/ticket-fields';

export type TicketMenuMember = {
  userId: string;
  name: string;
  image: string | null;
};

const MAX_VISIBLE_WATCHERS = 3;

function stopCardGesture(
  event: MouseEvent | PointerEvent | DragEvent,
) {
  event.stopPropagation();
  if (event.type === 'click') {
    event.preventDefault();
  }
}

function preventCardDrag(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
}

export function TicketStatusIconMenu({
  workspaceId,
  channelId,
  status,
}: {
  workspaceId: string;
  channelId: string;
  status: TicketStatus;
}) {
  const updateChannel = useUpdateChannel(workspaceId);
  const StatusIcon = TICKET_STATUS_META[status].icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="relative z-10 mt-0.5 hover:[&_svg]:brightness-75 aria-expanded:[&_svg]:brightness-75"
          aria-label="Change status"
          draggable={false}
          onClick={stopCardGesture}
          onPointerDown={stopCardGesture}
          onDragStart={preventCardDrag}
        >
          <StatusIcon
            className={cn(
              'size-3.5',
              TICKET_STATUS_META[status].iconClassName,
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(value) =>
              updateChannel.mutate({ channelId, status: value })
            }
          >
            {TICKET_STATUSES.map((value) => {
              const Icon = TICKET_STATUS_META[value].icon;
              return (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon className={TICKET_STATUS_META[value].iconClassName} />
                  {TICKET_STATUS_META[value].label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TicketPriorityIconMenu({
  workspaceId,
  channelId,
  priority,
}: {
  workspaceId: string;
  channelId: string;
  priority: TicketPriority;
}) {
  const updateChannel = useUpdateChannel(workspaceId);
  const PriorityIcon = TICKET_PRIORITY_META[priority].icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="relative z-10 rounded-full"
          aria-label="Change priority"
          draggable={false}
          onClick={stopCardGesture}
          onPointerDown={stopCardGesture}
          onDragStart={preventCardDrag}
        >
          <PriorityIcon
            className={TICKET_PRIORITY_META[priority].iconClassName}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={priority}
            onValueChange={(value) =>
              updateChannel.mutate({ channelId, priority: value })
            }
          >
            {TICKET_PRIORITIES.map((value) => {
              const Icon = TICKET_PRIORITY_META[value].icon;
              return (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon
                    className={TICKET_PRIORITY_META[value].iconClassName}
                  />
                  {TICKET_PRIORITY_META[value].label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TicketAssigneeIconMenu({
  workspaceId,
  channelId,
  assigneeId,
  members,
}: {
  workspaceId: string;
  channelId: string;
  assigneeId: string | null;
  members: TicketMenuMember[];
}) {
  const updateChannel = useUpdateChannel(workspaceId);
  const assignee = members.find((member) => member.userId === assigneeId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="relative z-10 rounded-full"
          aria-label="Change assignee"
          draggable={false}
          onClick={stopCardGesture}
          onPointerDown={stopCardGesture}
          onDragStart={preventCardDrag}
        >
          <Avatar className="size-4 [&_svg]:size-2.5">
            {assignee?.image ? (
              <AvatarImage src={assignee.image} alt="" />
            ) : null}
            <AvatarFallback className="bg-primary text-[8px] leading-none text-primary-foreground">
              {assignee ? personInitials(assignee.name) : <UserRound />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={assigneeId ?? 'unassigned'}
            onValueChange={(value) =>
              updateChannel.mutate({
                channelId,
                assigneeId: value === 'unassigned' ? null : value,
              })
            }
          >
            <DropdownMenuRadioItem value="unassigned">
              <UserRound />
              Unassigned
            </DropdownMenuRadioItem>
            {members.map((member) => (
              <DropdownMenuRadioItem key={member.userId} value={member.userId}>
                <Avatar size="sm">
                  <AvatarImage src={member.image ?? undefined} alt="" />
                  <AvatarFallback>
                    {personInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                {member.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LabelDot({ color }: { color: string }) {
  return (
    <span
      className={cn('size-2 shrink-0 rounded-full', labelColorClass(color))}
    />
  );
}

export function TicketLabelsMenu({
  workspaceId,
  channelId,
  selected,
  size = 'xs',
  className,
}: {
  workspaceId: string;
  channelId: string;
  selected: TicketLabel[];
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const updateChannel = useUpdateChannel(workspaceId);
  const { data: workspaceLabels } = useWorkspaceLabels(workspaceId);
  const createLabel = useCreateWorkspaceLabel(workspaceId);
  const selectedIds = new Set(selected.map((label) => label.id));
  const trimmed = query.trim();
  const filtered = (workspaceLabels ?? []).filter((label) =>
    label.name.toLowerCase().includes(trimmed.toLowerCase()),
  );
  const canCreate =
    trimmed.length > 0 &&
    !(workspaceLabels ?? []).some(
      (label) => label.name.toLowerCase() === trimmed.toLowerCase(),
    );

  function save(next: TicketLabel[]) {
    updateChannel.mutate({
      channelId,
      labelIds: next.map((label) => label.id),
      labels: next,
    });
  }

  function toggle(label: TicketLabel) {
    save(
      selectedIds.has(label.id)
        ? selected.filter((item) => item.id !== label.id)
        : [...selected, label],
    );
  }

  async function addCreated(event?: FormEvent) {
    event?.preventDefault();
    if (!canCreate || createLabel.isPending) return;
    const created = await createLabel.mutateAsync({
      name: trimmed,
      color: nextLabelColor(workspaceLabels?.length ?? 0),
    });
    save([...selected, created]);
    setQuery('');
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setQuery('');
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={cn(
            'relative z-10 max-w-full',
            size === 'xs' && 'h-auto px-1 py-0.5',
            className,
          )}
          aria-label="Change labels"
          draggable={false}
          onClick={stopCardGesture}
          onPointerDown={stopCardGesture}
          onDragStart={preventCardDrag}
        >
          {selected.length > 0 ? (
            <span className="flex flex-wrap items-center gap-1">
              {selected.map((label) => (
                <Badge key={label.id} variant="outline">
                  <LabelDot color={label.color} />
                  {label.name}
                </Badge>
              ))}
            </span>
          ) : (
            <>
              <Tag data-icon="inline-start" />
              Labels
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64"
        onClick={stopCardGesture}
      >
        <form className="p-1" onSubmit={addCreated}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            onPointerDown={stopCardGesture}
            placeholder="Change or add labels..."
            aria-label="Change or add labels"
          />
        </form>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {filtered.map((label) => (
            <DropdownMenuItem
              key={label.id}
              onSelect={(event) => {
                event.preventDefault();
                toggle(label);
              }}
            >
              {selectedIds.has(label.id) ? (
                <Check />
              ) : (
                <span className="size-3.5 shrink-0" />
              )}
              <LabelDot color={label.color} />
              {label.name}
            </DropdownMenuItem>
          ))}
          {canCreate ? (
            <DropdownMenuItem onSelect={() => void addCreated()}>
              Create "{trimmed}"
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TicketWatchersMenu({
  workspaceId,
  channelId,
  selected,
  size = 'xs',
  className,
}: {
  workspaceId: string;
  channelId: string;
  selected: TicketWatcher[];
  size?: 'xs' | 'sm';
  className?: string;
}) {
  const [query, setQuery] = useState('');
  const updateChannel = useUpdateChannel(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const selectedIds = new Set(selected.map((watcher) => watcher.id));
  const trimmed = query.trim().toLowerCase();
  const options: TicketWatcher[] = [
    ...selected,
    ...(members ?? [])
      .filter((member) => !selectedIds.has(member.userId))
      .map((member) => ({
        id: member.userId,
        name: member.name,
        image: member.image,
      })),
  ];
  const filtered = options.filter((watcher) =>
    watcher.name.toLowerCase().includes(trimmed),
  );

  function save(next: TicketWatcher[]) {
    updateChannel.mutate({
      channelId,
      watcherIds: next.map((watcher) => watcher.id),
      watchers: next,
    });
  }

  function toggle(watcher: TicketWatcher) {
    save(
      selectedIds.has(watcher.id)
        ? selected.filter((item) => item.id !== watcher.id)
        : [...selected, watcher],
    );
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setQuery('');
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={cn(
            'max-w-full overflow-hidden',
            size === 'xs' && 'h-auto px-1 py-0.5',
            className,
          )}
          aria-label={
            selected.length > 0
              ? `Watchers: ${selected.map((watcher) => watcher.name).join(', ')}`
              : 'Change watchers'
          }
          title={
            selected.length > 1
              ? selected.map((watcher) => watcher.name).join(', ')
              : undefined
          }
        >
          {selected.length === 0 ? (
            <>
              <Eye data-icon="inline-start" />
              Watchers
            </>
          ) : selected.length === 1 ? (
            <>
              <Avatar className="size-4">
                <AvatarImage src={selected[0]?.image ?? undefined} alt="" />
                <AvatarFallback className="text-[8px] leading-none">
                  {personInitials(selected[0]?.name ?? '')}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selected[0]?.name}</span>
            </>
          ) : (
            <AvatarGroup>
              {selected.slice(0, MAX_VISIBLE_WATCHERS).map((watcher) => (
                <Avatar
                  key={watcher.id}
                  className="size-4 [&_svg]:size-2.5"
                >
                  <AvatarImage src={watcher.image ?? undefined} alt="" />
                  <AvatarFallback className="text-[8px] leading-none">
                    {personInitials(watcher.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {selected.length > MAX_VISIBLE_WATCHERS ? (
                <AvatarGroupCount className="size-4 text-[8px] leading-none">
                  +{selected.length - MAX_VISIBLE_WATCHERS}
                </AvatarGroupCount>
              ) : null}
            </AvatarGroup>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <form className="p-1" onSubmit={(event) => event.preventDefault()}>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="Change or add watchers..."
            aria-label="Change or add watchers"
          />
        </form>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {filtered.map((watcher) => (
            <DropdownMenuItem
              key={watcher.id}
              onSelect={(event) => {
                event.preventDefault();
                toggle(watcher);
              }}
            >
              {selectedIds.has(watcher.id) ? (
                <Check />
              ) : (
                <span className="size-3.5 shrink-0" />
              )}
              <Avatar size="sm">
                <AvatarImage src={watcher.image ?? undefined} alt="" />
                <AvatarFallback>{personInitials(watcher.name)}</AvatarFallback>
              </Avatar>
              {watcher.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
