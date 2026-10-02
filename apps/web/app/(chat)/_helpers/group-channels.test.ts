import { describe, expect, it } from 'vitest';
import type { Channel } from '../_libs/channels';
import {
  groupChannelsByParent,
  removedDmsWithDepartedPeers,
} from './group-channels';

function dm(
  id: string,
  createdAt: string,
  lastMessageAt?: string | null,
  dmHiddenAt?: string | null,
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
    dmHiddenAt,
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

describe('groupChannelsByParent hidden DMs', () => {
  it('leaves out a DM the viewer removed from their list', () => {
    const { dms } = groupChannelsByParent([
      dm(
        'removed',
        '2026-01-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
        '2026-03-01T00:00:00.000Z',
      ),
      dm('kept', '2026-01-02T00:00:00.000Z', '2026-02-02T00:00:00.000Z'),
    ]);

    expect(dms.map((channel) => channel.id)).toEqual(['kept']);
  });

  it('leaves out a removed DM that never had a message', () => {
    const { dms } = groupChannelsByParent([
      dm('empty', '2026-01-01T00:00:00.000Z', null, '2026-01-02T00:00:00.000Z'),
    ]);

    expect(dms).toEqual([]);
  });

  it('brings a removed DM back once a newer message arrives', () => {
    const { dms } = groupChannelsByParent([
      dm(
        'replied',
        '2026-01-01T00:00:00.000Z',
        '2026-03-02T00:00:00.000Z',
        '2026-03-01T00:00:00.000Z',
      ),
    ]);

    expect(dms.map((channel) => channel.id)).toEqual(['replied']);
  });
});

describe('removedDmsWithDepartedPeers', () => {
  function withPeer(channel: Channel, inWorkspace: boolean): Channel {
    return {
      ...channel,
      dmPeer: { id: `u-${channel.id}`, name: channel.id, image: null, inWorkspace },
    };
  }

  it('lists removed DMs whose peer has left, newest first', () => {
    const removed = removedDmsWithDepartedPeers([
      withPeer(dm('older', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'), false),
      withPeer(dm('newer', '2026-01-02T00:00:00.000Z', '2026-05-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z'), false),
    ]);

    expect(removed.map((channel) => channel.id)).toEqual(['newer', 'older']);
  });

  it('skips removed DMs with someone still in the workspace', () => {
    // Those are reachable by starting a DM with the member.
    const removed = removedDmsWithDepartedPeers([
      withPeer(dm('member', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'), true),
    ]);

    expect(removed).toEqual([]);
  });

  it('skips DMs that are still in the list', () => {
    const removed = removedDmsWithDepartedPeers([
      withPeer(dm('visible', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'), false),
    ]);

    expect(removed).toEqual([]);
  });
});

describe('groupChannelsByParent voice channels', () => {
  function channel(
    id: string,
    channelType: Channel['channelType'],
    createdAt: string,
  ): Channel {
    return { ...dm(id, createdAt), channelType, isPrivate: false };
  }

  it('lists voice channels apart from text channels, oldest first', () => {
    const { topLevel, voice } = groupChannelsByParent([
      channel('lounge', 'voice', '2026-03-01T00:00:00.000Z'),
      channel('general', 'channel', '2026-01-01T00:00:00.000Z'),
      channel('standup', 'voice', '2026-02-01T00:00:00.000Z'),
    ]);

    expect(topLevel.map((c) => c.id)).toEqual(['general']);
    expect(voice.map((c) => c.id)).toEqual(['standup', 'lounge']);
  });
});
