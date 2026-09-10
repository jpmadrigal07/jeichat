import type { Channel } from '../_libs/channels';
import { isDmChannel } from './channel-display';
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

export type TaggableChannel = {
  id: string;
  name: string;
};

export type TaggableMessage = {
  id: string;
  channelId: string;
  senderName: string;
  content: string;
};

export type HashPickerItem =
  | { kind: 'ticket'; ticket: TaggableTicket }
  | { kind: 'channel'; channel: TaggableChannel }
  | { kind: 'message'; message: TaggableMessage };

export type MessageContentPart =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; text: string }
  | { kind: 'ticket'; text: string; ticketId: string; name: string }
  | { kind: 'channel'; text: string; channelId: string; name: string };

type TicketTagRange = MentionRange & { ticketId: string; name: string };
type ChannelTagRange = MentionRange & { channelId: string; name: string };

const HASH_PICKER_GROUP_LIMIT = 6;
const AFTER_TAG = /[\s.,!?;:)'"]/;

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
    .slice()
    .sort((a, b) => {
      const aNumber = Number(a.displayId.split('-').at(-1) ?? 0);
      const bNumber = Number(b.displayId.split('-').at(-1) ?? 0);
      return bNumber - aNumber;
    });
}

export function taggableChannels(channels: Channel[]): TaggableChannel[] {
  return channels
    .flatMap((item) => {
      if (item.parentId) return [];
      if (isDmChannel(item)) return [];
      const name = item.name.trim();
      if (!name) return [];
      return [{ id: item.id, name }];
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function taggableMessages(
  messages: Array<{
    id: string;
    channelId: string;
    content: string;
    sender: { name: string } | null;
  }>,
): TaggableMessage[] {
  return messages.map((message) => ({
    id: message.id,
    channelId: message.channelId,
    senderName: message.sender?.name ?? 'Unknown',
    content: message.content,
  }));
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
  | { type: 'hash'; start: number; query: string };

export function activeComposerTag(
  text: string,
  cursor: number,
): ComposerTag | null {
  const mention = activeMention(text, cursor);
  const hash = activeTicketTag(text, cursor);
  if (mention && hash) {
    return mention.start >= hash.start
      ? { type: 'mention', ...mention }
      : { type: 'hash', ...hash };
  }
  if (mention) return { type: 'mention', ...mention };
  if (hash) return { type: 'hash', ...hash };
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

export function filterTaggableChannels(
  channels: TaggableChannel[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return channels;
  return channels.filter((channel) =>
    channel.name.toLowerCase().includes(q),
  );
}

export function filterTaggableMessages(
  messages: TaggableMessage[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return messages;
  return messages.filter((message) => {
    return (
      message.senderName.toLowerCase().includes(q) ||
      message.content.toLowerCase().includes(q)
    );
  });
}

export function hashPickerItems(
  tickets: TaggableTicket[],
  channels: TaggableChannel[],
  messages: TaggableMessage[],
  query: string,
): HashPickerItem[] {
  return [
    ...filterTaggableTickets(tickets, query)
      .slice(0, HASH_PICKER_GROUP_LIMIT)
      .map((ticket) => ({ kind: 'ticket' as const, ticket })),
    ...filterTaggableChannels(channels, query)
      .slice(0, HASH_PICKER_GROUP_LIMIT)
      .map((channel) => ({ kind: 'channel' as const, channel })),
    ...filterTaggableMessages(messages, query)
      .slice(0, HASH_PICKER_GROUP_LIMIT)
      .map((message) => ({ kind: 'message' as const, message })),
  ];
}

export function insertTicketTag(
  text: string,
  start: number,
  cursor: number,
  displayId: string,
) {
  return `${text.slice(0, start)}#${displayId} ${text.slice(cursor)}`;
}

export function insertChannelTag(
  text: string,
  start: number,
  cursor: number,
  name: string,
) {
  return `${text.slice(0, start)}#${name} ${text.slice(cursor)}`;
}

export function messageMentionLabel(message: TaggableMessage): string {
  const text = message.content.replace(/\s+/g, ' ').trim();
  const snippet = text.length > 36 ? `${text.slice(0, 33)}…` : text;
  const raw = snippet
    ? `${message.senderName}: ${snippet}`
    : `${message.senderName}'s message`;
  return raw.replace(/[[\]()]/g, '');
}

export function insertMessageLink(
  text: string,
  start: number,
  cursor: number,
  label: string,
  href: string,
) {
  return `${text.slice(0, start)}[${label}](${href}) ${text.slice(cursor)}`;
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
    .slice()
    .sort((a, b) => b.needle.length - a.needle.length);

  for (const { ticket, needle } of byNeedle) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(needle, from);
      if (index === -1) break;
      const end = index + needle.length;
      const after = lower[end];
      if (!after || AFTER_TAG.test(after)) {
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

export function channelTagRanges(
  content: string,
  channels: TaggableChannel[],
): ChannelTagRange[] {
  const lower = content.toLowerCase();
  const ranges: ChannelTagRange[] = [];

  const byNeedle = channels
    .map((channel) => ({
      channel,
      needle: `#${channel.name.toLowerCase()}`,
    }))
    .slice()
    .sort((a, b) => b.needle.length - a.needle.length);

  for (const { channel, needle } of byNeedle) {
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(needle, from);
      if (index === -1) break;
      const end = index + needle.length;
      const after = lower[end];
      if (!after || AFTER_TAG.test(after)) {
        ranges.push({
          start: index,
          end,
          channelId: channel.id,
          name: channel.name,
        });
      }
      from = index + 1;
    }
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: ChannelTagRange[] = [];
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
  channels: TaggableChannel[] = [],
): MessageContentPart[] {
  type MarkedRange =
    | (MentionRange & { kind: 'mention' })
    | (TicketTagRange & { kind: 'ticket' })
    | (ChannelTagRange & { kind: 'channel' });

  const ranges: MarkedRange[] = [
    ...mentionRanges(content, members).map((range) => ({
      ...range,
      kind: 'mention' as const,
    })),
    ...ticketTagRanges(content, tickets).map((range) => ({
      ...range,
      kind: 'ticket' as const,
    })),
    ...channelTagRanges(content, channels).map((range) => ({
      ...range,
      kind: 'channel' as const,
    })),
  ].slice().sort((a, b) => a.start - b.start || b.end - a.end);

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
    } else if (range.kind === 'channel') {
      parts.push({
        kind: 'channel',
        text,
        channelId: range.channelId,
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
