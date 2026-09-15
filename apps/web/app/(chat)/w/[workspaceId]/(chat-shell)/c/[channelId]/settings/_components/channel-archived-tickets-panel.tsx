'use client';

import { Archive, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useArchivedChannelThreads,
  useChannels,
  useUpdateChannel,
} from '@chat/_hooks/use-channels';
import { isDmChannel } from '@chat/_helpers/channel-display';
import {
  TICKET_STATUS_META,
  ticketDisplayId,
  ticketPrefixOf,
  ticketStatusOf,
} from '@chat/_helpers/ticket-fields';

export function ChannelArchivedTicketsPanel({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}) {
  const { data: channels, isLoading: channelsLoading } =
    useChannels(workspaceId);
  const channel = channels?.find((item) => item.id === channelId);
  const isThread = Boolean(channel?.parentId);
  const isDm = isDmChannel(channel);
  const enabled = Boolean(channel && !isThread && !isDm);
  const { data: tickets, isLoading: ticketsLoading } =
    useArchivedChannelThreads(workspaceId, channelId, enabled);
  const updateChannel = useUpdateChannel(workspaceId);

  const isLoading = channelsLoading || (enabled && ticketsLoading);
  const prefix = ticketPrefixOf(channel ?? { name: '' });

  if (isLoading) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!channel || isThread || isDm) {
    return (
      <p className="text-sm text-muted-foreground">
        Archived tickets are available on top-level channels.
      </p>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Archived tickets</h1>
        <p className="text-sm text-muted-foreground">
          Archived tickets are hidden from the board. Restore one to bring it
          back. Done tickets are auto-archived after 30 days.
        </p>
      </div>

      {(tickets ?? []).length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Archive />
            </EmptyMedia>
            <EmptyTitle>No archived tickets</EmptyTitle>
            <EmptyDescription>
              Tickets you archive, and Done tickets auto-archived after 30
              days, will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead className="w-40">Status</TableHead>
              <TableHead className="w-36">Archived</TableHead>
              <TableHead className="w-32 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tickets ?? []).map((ticket) => {
              const status = ticketStatusOf(ticket.status);
              const StatusIcon = TICKET_STATUS_META[status].icon;
              const archivedAt = ticket.archivedAt
                ? new Date(ticket.archivedAt)
                : null;

              return (
                <TableRow key={ticket.id}>
                  <TableCell className="min-w-0 max-w-0">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-xs text-muted-foreground">
                        {ticket.ticketNumber
                          ? ticketDisplayId(prefix, ticket.ticketNumber)
                          : null}
                      </span>
                      <span className="truncate font-medium">{ticket.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <StatusIcon
                        className={TICKET_STATUS_META[status].iconClassName}
                      />
                      {TICKET_STATUS_META[status].label}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {archivedAt && !Number.isNaN(archivedAt.getTime())
                      ? format(archivedAt, 'MMM d, yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updateChannel.isPending}
                      onClick={() =>
                        updateChannel.mutate({
                          channelId: ticket.id,
                          archived: false,
                        })
                      }
                    >
                      <RotateCcw data-icon="inline-start" />
                      Restore
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
