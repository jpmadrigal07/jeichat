'use client';

import Link from 'next/link';
import {
  Calendar,
  CircleDot,
  Plus,
  SignalMedium,
  Tag,
  UserRound,
} from 'lucide-react';
import { channelPageHref } from '@chat/_libs/channels';
import {
  isParentChannelEventType,
  type TicketEvent,
} from '../_libs/channel-events';
import { formatTicketEvent } from '../_helpers/format-ticket-event';

type TicketActivityItemProps = {
  event: TicketEvent;
  workspaceId: string;
  showTicket?: boolean;
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function EventIcon({ type }: { type: TicketEvent['type'] }) {
  const className = 'size-3.5';
  switch (type) {
    case 'ticket_created':
      return <Plus className={className} />;
    case 'status_changed':
      return <CircleDot className={className} />;
    case 'priority_changed':
      return <SignalMedium className={className} />;
    case 'assignee_changed':
      return <UserRound className={className} />;
    case 'due_changed':
      return <Calendar className={className} />;
    case 'labels_changed':
      return <Tag className={className} />;
  }
}

export function TicketActivityItem({
  event,
  workspaceId,
  showTicket = false,
}: TicketActivityItemProps) {
  const copy = formatTicketEvent(event);
  const ticket = event.ticket;

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 text-xs text-muted-foreground">
      <span className="flex size-8 shrink-0 items-center justify-center">
        <EventIcon type={event.type} />
      </span>
      <p className="min-w-0 flex-1">
        <span className="font-medium text-foreground/80">{copy.actorName}</span>{' '}
        {ticket && showTicket && isParentChannelEventType(event.type) ? (
          <>
            {copy.verb}{' '}
            <Link
              href={channelPageHref(workspaceId, ticket.id)}
              title={ticket.name}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              #{ticket.displayId}
            </Link>{' '}
            {ticket.name}
            {copy.detail ? ` ${copy.detail}` : null}
          </>
        ) : (
          copy.text
        )}
      </p>
      <span className="shrink-0">{formatTime(event.createdAt)}</span>
    </div>
  );
}
