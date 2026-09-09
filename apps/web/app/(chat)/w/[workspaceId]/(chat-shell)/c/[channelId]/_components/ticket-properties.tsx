'use client';

import type { ReactNode } from 'react';
import { Calendar as CalendarIcon, UserRound } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useUpdateChannel } from '@chat/_hooks/use-channels';
import { useWorkspaceMembers } from '@chat/_hooks/use-workspaces';
import type { Channel } from '@chat/_libs/channels';
import { TicketLabelsMenu } from './ticket-property-menus';
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_META,
  TICKET_STATUSES,
  TICKET_STATUS_META,
  ticketPriorityOf,
  ticketStatusOf,
} from '@chat/_helpers/ticket-fields';

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-1">
      <span className="truncate px-2 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function TicketProperties({
  workspaceId,
  channel,
  className,
}: {
  workspaceId: string;
  channel: Channel;
  className?: string;
}) {
  const updateChannel = useUpdateChannel(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const status = ticketStatusOf(channel.status);
  const priority = ticketPriorityOf(channel.priority);
  const StatusIcon = TICKET_STATUS_META[status].icon;
  const PriorityIcon = TICKET_PRIORITY_META[priority].icon;
  const assignee = members?.find(
    (member) => member.userId === channel.assigneeId,
  );
  const dueDate = channel.dueAt ? new Date(channel.dueAt) : undefined;

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <p className="px-2 text-xs font-medium text-muted-foreground">
        Properties
      </p>
      <div className="flex flex-col gap-1.5">
        <PropertyRow label="Status">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <StatusIcon
                  data-icon="inline-start"
                  className={TICKET_STATUS_META[status].iconClassName}
                />
                {TICKET_STATUS_META[status].label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={status}
                  onValueChange={(value) =>
                    updateChannel.mutate({
                      channelId: channel.id,
                      status: value,
                    })
                  }
                >
                  {TICKET_STATUSES.map((value) => {
                    const Icon = TICKET_STATUS_META[value].icon;
                    return (
                      <DropdownMenuRadioItem key={value} value={value}>
                        <Icon
                          className={TICKET_STATUS_META[value].iconClassName}
                        />
                        {TICKET_STATUS_META[value].label}
                      </DropdownMenuRadioItem>
                    );
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </PropertyRow>

        <PropertyRow label="Priority">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <PriorityIcon
                  data-icon="inline-start"
                  className={TICKET_PRIORITY_META[priority].iconClassName}
                />
                {TICKET_PRIORITY_META[priority].label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={priority}
                  onValueChange={(value) =>
                    updateChannel.mutate({
                      channelId: channel.id,
                      priority: value,
                    })
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
        </PropertyRow>

        <PropertyRow label="Labels">
          <TicketLabelsMenu
            workspaceId={workspaceId}
            channelId={channel.id}
            selected={channel.labels ?? []}
            size="sm"
            className="w-full justify-start"
          />
        </PropertyRow>

        <PropertyRow label="Assignee">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                {assignee ? (
                  <Avatar size="sm">
                    <AvatarImage src={assignee.image ?? undefined} alt="" />
                    <AvatarFallback>
                      {assignee.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <UserRound data-icon="inline-start" />
                )}
                {assignee?.name ?? 'Unassigned'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-48">
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={channel.assigneeId ?? 'unassigned'}
                  onValueChange={(value) =>
                    updateChannel.mutate({
                      channelId: channel.id,
                      assigneeId: value === 'unassigned' ? null : value,
                    })
                  }
                >
                  <DropdownMenuRadioItem value="unassigned">
                    <UserRound />
                    Unassigned
                  </DropdownMenuRadioItem>
                  {(members ?? []).map((member) => (
                    <DropdownMenuRadioItem
                      key={member.userId}
                      value={member.userId}
                    >
                      <Avatar size="sm">
                        <AvatarImage src={member.image ?? undefined} alt="" />
                        <AvatarFallback>
                          {member.name.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {member.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </PropertyRow>

        <PropertyRow label="Due date">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <CalendarIcon data-icon="inline-start" />
                {dueDate ? format(dueDate, 'MMM d') : 'Empty'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={(date) =>
                  updateChannel.mutate({
                    channelId: channel.id,
                    dueAt: date ? date.toISOString() : null,
                  })
                }
              />
              {dueDate ? (
                <div className="border-t p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      updateChannel.mutate({
                        channelId: channel.id,
                        dueAt: null,
                      })
                    }
                  >
                    Clear due date
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </PropertyRow>
      </div>
    </div>
  );
}
