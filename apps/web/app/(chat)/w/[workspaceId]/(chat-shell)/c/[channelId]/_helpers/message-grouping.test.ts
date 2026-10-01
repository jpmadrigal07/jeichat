import { describe, expect, it } from 'vitest';
import type { Message } from '../_libs/messages';
import {
  isGroupedWithPrevious,
  MESSAGE_GROUP_WINDOW_MS,
} from './message-grouping';

const BASE = Date.parse('2026-09-24T08:28:00.000Z');

function message(overrides: Partial<Message> & { offsetMs?: number }): Message {
  const { offsetMs = 0, ...rest } = overrides;
  const createdAt = new Date(BASE + offsetMs).toISOString();
  return {
    id: 'm',
    channelId: 'c',
    senderId: 'john',
    content: 'hi',
    createdAt,
    updatedAt: createdAt,
    sender: null,
    attachments: [],
    reactions: [],
    replyToId: null,
    replyTo: null,
    ...rest,
  };
}

describe('isGroupedWithPrevious', () => {
  it('does not group when there is no previous message', () => {
    expect(isGroupedWithPrevious(message({}), null)).toBe(false);
  });

  it('groups the same sender within the window', () => {
    const previous = message({ id: 'a' });
    const current = message({ id: 'b', offsetMs: 60_000 });
    expect(isGroupedWithPrevious(current, previous)).toBe(true);
  });

  it('groups at exactly the window boundary', () => {
    const previous = message({ id: 'a' });
    const current = message({ id: 'b', offsetMs: MESSAGE_GROUP_WINDOW_MS });
    expect(isGroupedWithPrevious(current, previous)).toBe(true);
  });

  it('starts a new group once the gap exceeds the window', () => {
    const previous = message({ id: 'a' });
    const current = message({
      id: 'b',
      offsetMs: MESSAGE_GROUP_WINDOW_MS + 1,
    });
    expect(isGroupedWithPrevious(current, previous)).toBe(false);
  });

  it('does not group different senders', () => {
    const previous = message({ id: 'a', senderId: 'john' });
    const current = message({ id: 'b', senderId: 'jake', offsetMs: 1_000 });
    expect(isGroupedWithPrevious(current, previous)).toBe(false);
  });

  it('measures the gap from the previous message, not the first in the group', () => {
    const first = message({ id: 'a' });
    const second = message({ id: 'b', offsetMs: 8 * 60_000 });
    const third = message({ id: 'c', offsetMs: 16 * 60_000 });
    expect(isGroupedWithPrevious(second, first)).toBe(true);
    expect(isGroupedWithPrevious(third, second)).toBe(true);
  });

  it('keeps replies as the head of a group', () => {
    const previous = message({ id: 'a' });
    const current = message({ id: 'b', offsetMs: 1_000, replyToId: 'x' });
    expect(isGroupedWithPrevious(current, previous)).toBe(false);
  });

  it('does not group when the previous message is newer', () => {
    const previous = message({ id: 'a', offsetMs: 5_000 });
    const current = message({ id: 'b' });
    expect(isGroupedWithPrevious(current, previous)).toBe(false);
  });
});
