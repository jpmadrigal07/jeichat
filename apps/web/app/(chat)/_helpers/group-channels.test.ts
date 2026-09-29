import { describe, expect, it } from 'vitest';
import type { Channel } from '../_libs/channels';
import { groupChannelsByParent } from './group-channels';

function dm(
  id: string,
  createdAt: string,
  lastMessageAt?: string | null,
): Channel {
  return {
    id,
    workspaceId: 'w1',
    parentId: null,
    name: id,
    description: null,
    status: null,
    priority: null,
    assigneeId: null,
    dueAt: null,
    ticketNumber: null,
    ticketKey: null,
    channelType: 'dm',
    dmPeer: null,
    isPrivate: true,
    createdAt,
    updatedAt: createdAt,
    lastMessageAt,
  };
}

describe('groupChannelsByParent DM ordering', () => {
  it('puts the DM with the newest message first', () => {
    const { dms } = groupChannelsByParent([
      dm('old-chat', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'),
      dm('hot-chat', '2026-01-02T00:00:00.000Z', '2026-09-30T10:00:00.000Z'),
      dm('mid-chat', '2026-01-03T00:00:00.000Z', '2026-06-01T00:00:00.000Z'),
    ]);

    expect(dms.map((channel) => channel.id)).toEqual([
      'hot-chat',
      'mid-chat',
      'old-chat',
    ]);
  });

  it('falls back to creation time for a DM with no messages yet', () => {
    const { dms } = groupChannelsByParent([
      dm('talked', '2026-01-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'),
      dm('just-started', '2026-09-30T09:00:00.000Z', null),
      dm('legacy', '2026-02-01T00:00:00.000Z'),
    ]);

    expect(dms.map((channel) => channel.id)).toEqual([
      'just-started',
      'talked',
      'legacy',
    ]);
  });
});
