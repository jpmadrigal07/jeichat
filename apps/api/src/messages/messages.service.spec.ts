import { ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';

jest.mock('../gateway/chat.gateway', () => ({
  ChatGateway: class ChatGateway {},
}));

function buildService(peers: { inWorkspace: boolean }[], channelType = 'dm') {
  const channel = { id: 'dm-1', workspaceId: 'ws-1', channelType };
  const db = {
    select: () => ({
      from: () => ({ leftJoin: () => ({ where: () => peers }) }),
    }),
  };
  const permissions = {
    assertChannelPermissionByChannelId: jest.fn().mockResolvedValue(channel),
  };
  const service = new MessagesService(
    { db } as never,
    permissions as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, channel };
}

describe('MessagesService DM peer guard', () => {
  const mutations: [string, (service: MessagesService) => Promise<unknown>][] =
    [
      ['sending', (s) => s.create('dm-1', 'me', 'are you there?')],
      ['editing (also covers ticking a checkbox)', (s) => s.update('dm-1', 'm-1', 'me', 'edited')],
      ['deleting', (s) => s.remove('dm-1', 'm-1', 'me')],
      ['reacting', (s) => s.toggleReaction('dm-1', 'm-1', 'me', '👍')],
      ['pinning', (s) => s.pin('dm-1', 'm-1', 'me')],
      ['unpinning', (s) => s.unpin('dm-1', 'm-1', 'me')],
      ['removing embeds', (s) => s.removeLinkPreviews('dm-1', 'm-1', 'me')],
    ];

  it.each(mutations)(
    'refuses %s once the other person is out of the workspace',
    async (_label, run) => {
      const { service } = buildService([{ inWorkspace: false }]);

      await expect(run(service)).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('lets the DM through while the other person is still a member', async () => {
    const { service, channel } = buildService([{ inWorkspace: true }]);

    await expect(
      service['assertDmWritable'](channel, 'me'),
    ).resolves.toBeUndefined();
  });

  it('does not block a DM with nobody else in it', async () => {
    const { service, channel } = buildService([]);

    await expect(
      service['assertDmWritable'](channel, 'me'),
    ).resolves.toBeUndefined();
  });

  it('never consults DM peers for a regular channel', async () => {
    const { service, channel } = buildService(
      [{ inWorkspace: false }],
      'channel',
    );

    await expect(
      service['assertDmWritable'](channel, 'me'),
    ).resolves.toBeUndefined();
  });
});
