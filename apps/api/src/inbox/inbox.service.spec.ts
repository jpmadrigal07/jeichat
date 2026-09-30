import { Logger } from '@nestjs/common';
import { InboxService } from './inbox.service';

jest.mock('../gateway/chat.gateway', () => ({
  ChatGateway: class ChatGateway {},
}));

/** Chainable drizzle query stub that resolves to `result` when awaited. */
function query<T>(result: T) {
  const chain: Record<string, unknown> = {};
  for (const method of [
    'from',
    'innerJoin',
    'leftJoin',
    'where',
    'orderBy',
    'limit',
  ]) {
    chain[method] = jest.fn(() => chain);
  }
  chain.then = (
    resolve: (value: T) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

const members = [
  { userId: 'john', name: 'John Madrigal', email: 'john@example.com' },
  { userId: 'ramil', name: 'Ramil Kaharian', email: 'ramil@example.com' },
  { userId: 'jepoy', name: 'Jepoy Madrigal', email: 'jepoy@example.com' },
];

describe('InboxService', () => {
  const db = {
    select: jest.fn(),
    selectDistinct: jest.fn(),
    insert: jest.fn(),
  };
  const permissions = {
    filterUsersWhoCanViewChannel: jest.fn(),
    filterViewableChannelIds: jest.fn(),
    listChannelAudienceUserIds: jest.fn(),
  };
  const workspacesService = { verifyMembership: jest.fn() };
  const botsService = { excludeBots: jest.fn() };
  const notificationSettings = { listLevels: jest.fn() };
  let service: InboxService;
  let log: jest.SpyInstance;
  let debug: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    workspacesService.verifyMembership.mockResolvedValue(undefined);
    botsService.excludeBots.mockImplementation((ids: string[]) =>
      Promise.resolve(ids),
    );
    notificationSettings.listLevels.mockResolvedValue(new Map());
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    service = new InboxService(
      { db } as never,
      workspacesService as never,
      permissions as never,
      {} as never,
      botsService as never,
      notificationSettings as never,
    );
  });

  afterEach(() => {
    log.mockRestore();
    debug.mockRestore();
  });

  describe('resolveMentionedUserIds', () => {
    it('only returns tagged users who can view the channel', async () => {
      db.select.mockReturnValue(query(members));
      permissions.filterUsersWhoCanViewChannel.mockImplementation(
        (_ws: string, _channel: string, ids: string[]) =>
          Promise.resolve(ids.filter((id) => id !== 'jepoy')),
      );

      const ids = await service.resolveMentionedUserIds({
        workspaceId: 'ws-1',
        channelId: 'private-1',
        actorId: 'john',
        content: '@Ramil Kaharian @Jepoy Madrigal test',
      });

      expect(permissions.filterUsersWhoCanViewChannel).toHaveBeenCalledWith(
        'ws-1',
        'private-1',
        ['ramil', 'jepoy'],
      );
      expect(ids).toEqual(['ramil']);
      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(expect.stringContaining('private-1'));
      expect(log).toHaveBeenCalledWith(expect.stringContaining('jepoy'));
    });

    it('does not log when every tagged user can view the channel', async () => {
      db.select.mockReturnValue(query(members));
      permissions.filterUsersWhoCanViewChannel.mockImplementation(
        (_ws: string, _channel: string, ids: string[]) => Promise.resolve(ids),
      );

      await service.resolveMentionedUserIds({
        workspaceId: 'ws-1',
        channelId: 'general',
        actorId: 'john',
        content: '@Ramil Kaharian hi',
      });

      expect(log).not.toHaveBeenCalled();
    });

    it('resolves nobody when the tagged user cannot view the channel', async () => {
      db.select.mockReturnValue(query(members));
      permissions.filterUsersWhoCanViewChannel.mockResolvedValue([]);

      await expect(
        service.resolveMentionedUserIds({
          workspaceId: 'ws-1',
          channelId: 'private-1',
          actorId: 'john',
          content: '@Jepoy Madrigal test',
        }),
      ).resolves.toEqual([]);
      expect(permissions.listChannelAudienceUserIds).not.toHaveBeenCalled();
    });

    it('adds the channel audience for @all without the actor', async () => {
      db.select.mockReturnValue(query(members));
      permissions.filterUsersWhoCanViewChannel.mockResolvedValue([]);
      permissions.listChannelAudienceUserIds.mockResolvedValue([
        'john',
        'ramil',
      ]);

      await expect(
        service.resolveMentionedUserIds({
          workspaceId: 'ws-1',
          channelId: 'private-1',
          actorId: 'john',
          content: '@all standup',
        }),
      ).resolves.toEqual(['ramil']);
    });

    it('skips the lookup for empty content', async () => {
      await expect(
        service.resolveMentionedUserIds({
          workspaceId: 'ws-1',
          channelId: 'private-1',
          actorId: 'john',
          content: '   ',
        }),
      ).resolves.toEqual([]);
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('notifyMentions', () => {
    let insertedRows: { userId: string }[];
    let emitInserted: jest.SpyInstance;

    beforeEach(() => {
      insertedRows = [];
      db.select.mockReturnValue(query(members));
      db.insert.mockReturnValue({
        values: (rows: { userId: string }[]) => {
          insertedRows = rows;
          return {
            onConflictDoNothing: () => ({
              returning: () =>
                Promise.resolve(
                  rows.map((row, index) => ({
                    id: `n-${index}`,
                    userId: row.userId,
                  })),
                ),
            }),
          };
        },
      });
      emitInserted = jest
        .spyOn(
          service as unknown as { emitInserted: () => Promise<void> },
          'emitInserted',
        )
        .mockResolvedValue(undefined);
    });

    const input = {
      workspaceId: 'ws-1',
      channelId: 'private-1',
      messageId: 'msg-1',
      actorId: 'john',
      content: '@Ramil Kaharian @Jepoy Madrigal test',
    };

    it('creates inbox rows only for tagged users who can view the channel', async () => {
      permissions.filterUsersWhoCanViewChannel.mockImplementation(
        (_ws: string, _channel: string, ids: string[]) =>
          Promise.resolve(ids.filter((id) => id !== 'jepoy')),
      );

      await service.notifyMentions(input);

      expect(insertedRows.map((row) => row.userId)).toEqual(['ramil']);
      expect(emitInserted).toHaveBeenCalledWith([
        { id: 'n-0', userId: 'ramil' },
      ]);
    });

    it('creates nothing when nobody tagged can view the channel', async () => {
      permissions.filterUsersWhoCanViewChannel.mockResolvedValue([]);

      await service.notifyMentions(input);

      expect(db.insert).not.toHaveBeenCalled();
      expect(emitInserted).not.toHaveBeenCalled();
    });

    it('still skips a viewer who muted the channel', async () => {
      permissions.filterUsersWhoCanViewChannel.mockImplementation(
        (_ws: string, _channel: string, ids: string[]) => Promise.resolve(ids),
      );
      notificationSettings.listLevels.mockResolvedValue(
        new Map([['ramil', 'muted']]),
      );

      await service.notifyMentions(input);

      expect(insertedRows.map((row) => row.userId)).toEqual(['jepoy']);
    });
  });

  describe('notifyNewMentionsFromContentChange', () => {
    let insertedRows: { userId: string; messageId: string | null }[];
    let emitInserted: jest.SpyInstance;

    beforeEach(() => {
      insertedRows = [];
      db.select.mockReturnValue(query(members));
      db.insert.mockReturnValue({
        values: (rows: { userId: string; messageId: string | null }[]) => {
          insertedRows = rows;
          return {
            onConflictDoNothing: () => ({
              returning: () =>
                Promise.resolve(
                  rows.map((row, index) => ({
                    id: `n-${index}`,
                    userId: row.userId,
                  })),
                ),
            }),
          };
        },
      });
      emitInserted = jest
        .spyOn(
          service as unknown as { emitInserted: () => Promise<void> },
          'emitInserted',
        )
        .mockResolvedValue(undefined);
      permissions.filterUsersWhoCanViewChannel.mockImplementation(
        (_ws: string, _channel: string, ids: string[]) => Promise.resolve(ids),
      );
    });

    it('notifies only users newly tagged in the description', async () => {
      await service.notifyNewMentionsFromContentChange({
        workspaceId: 'ws-1',
        channelId: 'ticket-1',
        actorId: 'john',
        previousContent: '@Ramil Kaharian hello',
        nextContent: '@Ramil Kaharian @Jepoy Madrigal hello',
      });

      expect(insertedRows.map((row) => row.userId)).toEqual(['jepoy']);
      expect(insertedRows.every((row) => row.messageId === null)).toBe(true);
      expect(emitInserted).toHaveBeenCalledWith([
        { id: 'n-0', userId: 'jepoy' },
      ]);
    });

    it('creates nothing when the mention set is unchanged', async () => {
      await service.notifyNewMentionsFromContentChange({
        workspaceId: 'ws-1',
        channelId: 'ticket-1',
        actorId: 'john',
        previousContent: '@Jepoy Madrigal draft',
        nextContent: '@Jepoy Madrigal updated text',
      });

      expect(db.insert).not.toHaveBeenCalled();
      expect(emitInserted).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('returns nothing when no notification channel is viewable', async () => {
      db.selectDistinct.mockReturnValue(query([{ channelId: 'private-1' }]));
      permissions.filterViewableChannelIds.mockResolvedValue(new Set());

      await expect(service.list('ws-1', 'jepoy')).resolves.toEqual({
        items: [],
        unreadCount: 0,
      });
      expect(permissions.filterViewableChannelIds).toHaveBeenCalledWith(
        'ws-1',
        'jepoy',
        ['private-1'],
      );
      expect(db.select).not.toHaveBeenCalled();
      expect(debug).toHaveBeenCalledWith(expect.stringContaining('jepoy'));
    });

    it('does not log when every notification channel is viewable', async () => {
      db.selectDistinct.mockReturnValue(query([{ channelId: 'general' }]));
      permissions.filterViewableChannelIds.mockResolvedValue(
        new Set(['general']),
      );
      db.select.mockReturnValue(query([]));

      await service.list('ws-1', 'jepoy');

      expect(debug).not.toHaveBeenCalled();
    });
  });

  describe('unreadCount', () => {
    it('is zero when no notification channel is viewable', async () => {
      db.selectDistinct.mockReturnValue(query([{ channelId: 'private-1' }]));
      permissions.filterViewableChannelIds.mockResolvedValue(new Set());

      await expect(service.unreadCount('ws-1', 'jepoy')).resolves.toEqual({
        unreadCount: 0,
      });
      expect(db.select).not.toHaveBeenCalled();
    });

    it('counts only notifications from viewable channels', async () => {
      db.selectDistinct.mockReturnValue(
        query([{ channelId: 'general' }, { channelId: 'private-1' }]),
      );
      permissions.filterViewableChannelIds.mockResolvedValue(
        new Set(['general']),
      );
      const counted = query([{ value: 3 }]);
      db.select.mockReturnValue(counted);

      await expect(service.unreadCount('ws-1', 'jepoy')).resolves.toEqual({
        unreadCount: 3,
      });
      expect(db.select).toHaveBeenCalledTimes(1);
    });
  });
});
