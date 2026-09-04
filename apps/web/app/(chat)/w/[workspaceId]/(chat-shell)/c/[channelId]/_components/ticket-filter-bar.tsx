'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  ChevronDown,
  CircleCheck,
  Search,
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useWorkspaceLabels, useWorkspaceMembers } from '@chat/_hooks/use-workspaces';
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_META,
  labelColorClass,
} from '@chat/_helpers/ticket-fields';
import {
  TICKET_ASSIGNEE_ME,
  TICKET_ASSIGNEE_UNASSIGNED,
  TICKET_FILTER_PARAM,
  applyMyIssuesParams,
  clearMyIssuesParams,
  clearTicketFilterParams,
  hasActiveTicketFilters,
  isMyIssuesFilter,
  parseTicketFilters,
  type TicketCompletedFilter,
  type TicketDueFilter,
} from '@chat/_helpers/ticket-filters';
import { BoardDisplayMenu } from './board-display-menu';
import type { TicketLayout } from '@chat/_libs/channels';

const ANY_VALUE = 'any';

type TicketFilterBarProps = {
  workspaceId: string;
  channelId: string;
  layout: TicketLayout;
};

export function TicketFilterBar({
  workspaceId,
  channelId,
  layout,
}: TicketFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseTicketFilters(searchParams);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { data: labels } = useWorkspaceLabels(workspaceId);
  const filtersActive = hasActiveTicketFilters(filters);
  const myIssuesActive = isMyIssuesFilter(filters);

  const selectedMember = members?.find(
    (member) => member.userId === filters.assignee,
  );
  const selectedLabel = labels?.find((label) => label.id === filters.labelId);

  function replace(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function setFilter(key: string, value: string | null) {
    replace((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  const assigneeLabel =
    filters.assignee === TICKET_ASSIGNEE_ME
      ? 'Me'
      : filters.assignee === TICKET_ASSIGNEE_UNASSIGNED
        ? 'Unassigned'
        : (selectedMember?.name ?? 'Assignee');

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2">
      <Button
        variant={myIssuesActive ? 'secondary' : 'outline'}
        size="sm"
        onClick={() =>
          replace((params) => {
            if (myIssuesActive) {
              clearMyIssuesParams(params);
              return;
            }
            applyMyIssuesParams(params);
          })
        }
      >
        <UserRound data-icon="inline-start" />
        My tickets
      </Button>

      <FilterMenu
        label={assigneeLabel}
        active={filters.assignee !== null}
        icon={UserRound}
      >
        <DropdownMenuRadioGroup
          value={filters.assignee ?? ANY_VALUE}
          onValueChange={(value) =>
            setFilter(
              TICKET_FILTER_PARAM.assignee,
              value === ANY_VALUE ? null : value,
            )
          }
        >
          <DropdownMenuGroup>
            <DropdownMenuRadioItem value={ANY_VALUE}>
              Anyone
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={TICKET_ASSIGNEE_ME}>
              Me
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={TICKET_ASSIGNEE_UNASSIGNED}>
              Unassigned
            </DropdownMenuRadioItem>
          </DropdownMenuGroup>
          {members && members.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Members</DropdownMenuLabel>
              <DropdownMenuGroup>
                {members.map((member) => (
                  <DropdownMenuRadioItem
                    key={member.userId}
                    value={member.userId}
                  >
                    {member.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuRadioGroup>
      </FilterMenu>

      <FilterMenu
        label={
          filters.priority
            ? TICKET_PRIORITY_META[filters.priority].label
            : 'Priority'
        }
        active={filters.priority !== null}
      >
        <DropdownMenuRadioGroup
          value={filters.priority ?? ANY_VALUE}
          onValueChange={(value) =>
            setFilter(
              TICKET_FILTER_PARAM.priority,
              value === ANY_VALUE ? null : value,
            )
          }
        >
          <DropdownMenuGroup>
            <DropdownMenuRadioItem value={ANY_VALUE}>
              Any priority
            </DropdownMenuRadioItem>
            {TICKET_PRIORITIES.map((priority) => {
              const PriorityIcon = TICKET_PRIORITY_META[priority].icon;
              return (
                <DropdownMenuRadioItem key={priority} value={priority}>
                  <PriorityIcon
                    className={TICKET_PRIORITY_META[priority].iconClassName}
                  />
                  {TICKET_PRIORITY_META[priority].label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </FilterMenu>

      <FilterMenu
        label={selectedLabel?.name ?? 'Label'}
        active={filters.labelId !== null}
        icon={Tag}
      >
        <DropdownMenuRadioGroup
          value={filters.labelId ?? ANY_VALUE}
          onValueChange={(value) =>
            setFilter(
              TICKET_FILTER_PARAM.label,
              value === ANY_VALUE ? null : value,
            )
          }
        >
          <DropdownMenuGroup>
            <DropdownMenuRadioItem value={ANY_VALUE}>
              Any label
            </DropdownMenuRadioItem>
            {(labels ?? []).map((label) => (
              <DropdownMenuRadioItem key={label.id} value={label.id}>
                <span
                  className={cn('size-2 rounded-full', labelColorClass(label.color))}
                />
                {label.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </FilterMenu>

      <FilterMenu
        label={
          filters.due === 'overdue'
            ? 'Overdue'
            : filters.due === 'week'
              ? 'Due this week'
              : 'Due date'
        }
        active={filters.due !== null}
        icon={Calendar}
      >
        <DropdownMenuRadioGroup
          value={filters.due ?? ANY_VALUE}
          onValueChange={(value) =>
            setFilter(
              TICKET_FILTER_PARAM.due,
              value === ANY_VALUE ? null : value,
            )
          }
        >
          <DropdownMenuGroup>
            <DropdownMenuRadioItem value={ANY_VALUE}>
              Any due date
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={'overdue' satisfies TicketDueFilter}>
              Overdue
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value={'week' satisfies TicketDueFilter}>
              Due this week
            </DropdownMenuRadioItem>
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </FilterMenu>

      <FilterMenu
        label={filters.completed === 'none' ? 'Hide completed' : 'Completed'}
        active={filters.completed === 'none'}
        icon={CircleCheck}
      >
        <DropdownMenuRadioGroup
          value={filters.completed}
          onValueChange={(value) =>
            setFilter(
              TICKET_FILTER_PARAM.completed,
              value === 'none' ? ('none' satisfies TicketCompletedFilter) : null,
            )
          }
        >
          <DropdownMenuGroup>
            <DropdownMenuRadioItem value="all">
              All
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="none">
              Hide completed
            </DropdownMenuRadioItem>
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
      </FilterMenu>

      {filtersActive ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => replace(clearTicketFilterParams)}
        >
          <X data-icon="inline-start" />
          Clear
        </Button>
      ) : null}

      <div className="relative min-w-40 max-w-64 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={filters.q}
          onChange={(event) =>
            setFilter(
              TICKET_FILTER_PARAM.q,
              event.target.value ? event.target.value : null,
            )
          }
          placeholder="Search tickets..."
          aria-label="Search tickets"
          className="pl-7"
        />
      </div>

      <div className="ml-auto">
        <BoardDisplayMenu
          workspaceId={workspaceId}
          channelId={channelId}
          layout={layout}
        />
      </div>
    </div>
  );
}

function FilterMenu({
  label,
  active,
  icon: Icon,
  children,
}: {
  label: string;
  active: boolean;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={active ? 'secondary' : 'outline'} size="sm">
          {Icon ? <Icon data-icon="inline-start" /> : null}
          <span className="max-w-28 truncate">{label}</span>
          <ChevronDown data-icon="inline-end" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
