import type { Channel } from '../_libs/channels';
import {
  activeMention,
  mentionRanges,
  type MentionableMember,
  type MentionRange,
} from './mentions';
import { ticketDisplayId, ticketPrefixOf } from './ticket-fields';

export type TaggableTicket = {
  id: string;
  displayId: string;
  name: string;
  status: string | null;
};

export type MessageContentPart =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; text: string }
  | { kind: 'ticket'; text: string; ticketId: string; name: string };

type TicketTagRange = MentionRange & { ticketId: string; name: string };

export function taggableTicketsForChannel(
  channels: Channel[],
  channel: Channel | undefined,
): TaggableTicket[] {
  if (!channel) return [];

  const parent = channel.parentId
    ? (channels.find((item) => item.id === channel.parentId) ?? channel)
    : channel;
  const prefix = ticketPrefixOf(parent);

  return channels
    .flatMap((item) => {
      if (item.parentId !== parent.id) return [];
      if (item.id === channel.id) return [];
      if (!item.ticketNumber || item.ticketNumber <= 0) return [];
      return [
        {
          id: item.id,
          displayId: ticketDisplayId(prefix, item.ticketNumber),
          name: item.name,
          status: item.status,
        },
      ];
    })
    .toSorted((a, b) => {
      const aNumber = Number(a.displayId.split('-').at(-1) ?? 0);
      const bNumber = Number(b.displayId.split('-').at(-1) ?? 0);
      return bNumber - aNumber;
    });
}

export function activeTicketTag(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const hash = before.lastIndexOf('#');
  if (hash === -1) return null;
  if (hash > 0 && !/\s/.test(before[hash - 1] ?? '')) return null;
  const query = before.slice(hash + 1);
  if (query.includes('\n') || query.length > 40) return null;
  return { start: hash, query };
}

export type ComposerTag =
  | { type: 'mention'; start: number; query: string }
  | { type: 'ticket'; start: number; query: string };

export function activeComposerTag(
  text: string,
  cursor: number,
): ComposerTag | null {
  const mention = activeMention(text, cursor);
  const ticket = activeTicketTag(text, cursor);
  if (mention && ticket) {
    return mention.start >= ticket.start
      ? { type: 'mention', ...mention }
      : { type: 'ticket', ...ticket };
  }
  if (mention) return { type: 'mention', ...mention };
  if (ticket) return { type: 'ticket', ...ticket };
  return null;
}

export function filterTaggableTickets(
  tickets: TaggableTicket[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return tickets;
  return tickets.filter((ticket) => {
    const id = ticket.displayId.toLowerCase();
    return (
      id.includes(q) ||
      id.replace('-', '').includes(q.replace('-', '')) ||
      ticket.name.toLowerCase().includes(q)
    );
  });
}

export function insertTicketTag(
  text: string,
  start: number,
  cursor: number,
  displayId: string,
) {
  return `${text.slice(0, start)}#${displayId} ${text.slice(cursor)}`;
}

export function ticketTagRanges(
  content: string,
  tickets: TaggableTicket[],
): TicketTagRange[] {
  const lower = content.toLowerCase();
  const ranges: TicketTagRange[] = [];

  const byNeedle = tickets
    .map((ticket) => ({
      ticket,
      needle: `#${ticket.displayId.toLowerCase()}`,
    }))
    .toSorted((a, b) => b.needle.length - a.needle.length);

  for (const { ticket, needle } of byNeedle) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(needle, from);
      if (index === -1) break;
      const end = index + needle.length;
      const after = lower[end];
      if (!after || /[\s.,!?;:)'"]/.test(after)) {
        ranges.push({
          start: index,
          end,
          ticketId: ticket.id,
          name: ticket.name,
        });
      }
      from = index + 1;
    }
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: TicketTagRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start < last.end) continue;
    merged.push(range);
  }
  return merged;
}

export function splitMessageContent(
  content: string,
  members: MentionableMember[],
  tickets: TaggableTicket[],
): MessageContentPart[] {
  type MarkedRange =
    | (MentionRange & { kind: 'mention' })
    | (TicketTagRange & { kind: 'ticket' });

  const ranges: MarkedRange[] = [
    ...mentionRanges(content, members).map((range) => ({
      ...range,
      kind: 'mention' as const,
    })),
    ...ticketTagRanges(content, tickets).map((range) => ({
      ...range,
      kind: 'ticket' as const,
    })),
  ].toSorted((a, b) => a.start - b.start || b.end - a.end);

  const merged: MarkedRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start < last.end) continue;
    merged.push(range);
  }

  if (merged.length === 0) return [{ kind: 'text', text: content }];

  const parts: MessageContentPart[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      parts.push({ kind: 'text', text: content.slice(cursor, range.start) });
    }
    const text = content.slice(range.start, range.end);
    if (range.kind === 'ticket') {
      parts.push({
        kind: 'ticket',
        text,
        ticketId: range.ticketId,
        name: range.name,
      });
    } else {
      parts.push({ kind: 'mention', text });
    }
    cursor = range.end;
  }
  if (cursor < content.length) {
    parts.push({ kind: 'text', text: content.slice(cursor) });
  }
  return parts;
}
