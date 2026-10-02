'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUpdateChannel } from '../_hooks/use-channels';
import type { Channel } from '../_libs/channels';
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_META,
  TICKET_STATUSES,
  TICKET_STATUS_META,
  ticketPriorityOf,
  ticketStatusOf,
} from '../_helpers/ticket-fields';

type TicketContextMenuProps = {
  /** The sidebar ticket row; right-clicking it opens the menu. */
  children: React.ReactNode;
  workspaceId: string;
  ticket: Pick<Channel, 'id' | 'status' | 'priority'>;
};

/**
 * Right-click menu on a sidebar ticket row (desktop only) for changing its
 * status and priority without opening it.
 */
export function TicketContextMenu({
  children,
  workspaceId,
  ticket,
}: TicketContextMenuProps) {
  const isMobile = useIsMobile();
  const updateChannel = useUpdateChannel(workspaceId);
  const status = ticketStatusOf(ticket.status);
  const priority = ticketPriorityOf(ticket.priority);
  const StatusIcon = TICKET_STATUS_META[status].icon;
  const PriorityIcon = TICKET_PRIORITY_META[priority].icon;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={isMobile}>
        <div className="min-w-0">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <StatusIcon className={TICKET_STATUS_META[status].iconClassName} />
            Status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuRadioGroup
              value={status}
              onValueChange={(value) =>
                updateChannel.mutate({ channelId: ticket.id, status: value })
              }
            >
              {TICKET_STATUSES.map((value) => {
                const meta = TICKET_STATUS_META[value];
                const Icon = meta.icon;
                return (
                  <ContextMenuRadioItem key={value} value={value}>
                    <Icon className={meta.iconClassName} />
                    {meta.label}
                  </ContextMenuRadioItem>
                );
              })}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <PriorityIcon
              className={TICKET_PRIORITY_META[priority].iconClassName}
            />
            Priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuRadioGroup
              value={priority}
              onValueChange={(value) =>
                updateChannel.mutate({ channelId: ticket.id, priority: value })
              }
            >
              {TICKET_PRIORITIES.map((value) => {
                const meta = TICKET_PRIORITY_META[value];
                const Icon = meta.icon;
                return (
                  <ContextMenuRadioItem key={value} value={value}>
                    <Icon className={meta.iconClassName} />
                    {meta.label}
                  </ContextMenuRadioItem>
                );
              })}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}
