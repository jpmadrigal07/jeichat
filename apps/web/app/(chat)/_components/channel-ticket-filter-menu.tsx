'use client';

import { Check, ListFilter, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
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
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DEFAULT_SIDEBAR_TICKET_FILTER,
  hasActiveSidebarTicketFilter,
  isSidebarStatusChecked,
  toggleSidebarStatus,
  type SidebarTicketFilter,
} from '../_helpers/sidebar-ticket-filter';
import { TICKET_STATUSES, TICKET_STATUS_META } from '../_helpers/ticket-fields';
import { DrawerAction } from './drawer-action';

type ChannelTicketFilterMenuProps = {
  channelName: string;
  filter: SidebarTicketFilter;
  onChange: (filter: SidebarTicketFilter) => void;
};

function FilterToggleRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <DrawerAction role="checkbox" aria-checked={checked} onClick={onToggle}>
      {children}
      {checked ? <Check className="ml-auto text-foreground" /> : null}
    </DrawerAction>
  );
}

/**
 * Ticket filter on a sidebar channel row. Desktop gets a dropdown; on mobile
 * it is a bottom drawer that stays open so several filters can be toggled.
 */
export function ChannelTicketFilterMenu({
  channelName,
  filter,
  onChange,
}: ChannelTicketFilterMenuProps) {
  const isMobile = useIsMobile();
  const active = hasActiveSidebarTicketFilter(filter);

  const trigger = (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="icon-sm"
      className="hover:bg-transparent dark:hover:bg-transparent"
      aria-pressed={active}
    >
      <ListFilter className="size-3.5" />
      <span className="sr-only">Filter tickets</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent
          className="pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          // The drawer is portaled but React events still bubble to the
          // sidebar row, whose long-press starts drag-to-reorder.
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DrawerHeader className="gap-0.5 px-4 pt-3 pb-2 text-left">
            <DrawerTitle>Filter tickets</DrawerTitle>
            <DrawerDescription className="truncate">
              {channelName}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-col overflow-y-auto">
            <div className="flex flex-col p-2">
              <FilterToggleRow
                checked={filter.assignedToMe}
                onToggle={() =>
                  onChange({ ...filter, assignedToMe: !filter.assignedToMe })
                }
              >
                <UserRound />
                Assigned to me
              </FilterToggleRow>
            </div>

            <Separator className="mx-3 data-horizontal:w-auto" />

            <div className="flex flex-col p-2">
              <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                Ticket status
              </p>
              {TICKET_STATUSES.map((status) => {
                const meta = TICKET_STATUS_META[status];
                const Icon = meta.icon;
                return (
                  <FilterToggleRow
                    key={status}
                    checked={isSidebarStatusChecked(filter, status)}
                    onToggle={() =>
                      onChange(toggleSidebarStatus(filter, status))
                    }
                  >
                    <Icon className={meta.iconClassName} />
                    {meta.label}
                  </FilterToggleRow>
                );
              })}
            </div>

            <Separator className="mx-3 data-horizontal:w-auto" />

            {/* Always rendered so the drawer doesn't grow (and shift the rows
                under the user's finger) when the first filter is toggled. */}
            <div className="flex flex-col p-2">
              <DrawerClose asChild>
                <DrawerAction
                  disabled={!active}
                  onClick={() => onChange(DEFAULT_SIDEBAR_TICKET_FILTER)}
                >
                  Reset filters
                </DrawerAction>
              </DrawerClose>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
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
          <DropdownMenuLabel>Ticket status</DropdownMenuLabel>
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
