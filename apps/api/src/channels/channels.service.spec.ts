import { BadRequestException } from '@nestjs/common';
import { ChannelsService } from './channels.service';

jest.mock('../gateway/chat.gateway', () => ({
  ChatGateway: class ChatGateway {},
}));

function buildService(channelType: string) {
  const service = new ChannelsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  jest.spyOn(service, 'findOne').mockResolvedValue({
    id: 'chan-1',
    workspaceId: 'ws-1',
    parentId: null,
    channelType,
  } as never);
  return service;
}

describe('ChannelsService DM protection', () => {
  const routes: [string, (service: ChannelsService) => Promise<unknown>][] = [
    ['deleting the channel', (s) => s.remove('ws-1', 'chan-1', 'me')],
    ['adding a participant', (s) => s.addMember('ws-1', 'chan-1', 'me', 'other')],
    ['removing a participant', (s) => s.removeMember('ws-1', 'chan-1', 'me', 'other')],
  ];

  it.each(routes)('refuses %s in a DM', async (_label, run) => {
    await expect(run(buildService('dm'))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('only lets direct messages be removed from the list', async () => {
    await expect(
      buildService('channel').hideDm('ws-1', 'chan-1', 'me'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only lets direct messages be restored to the list', async () => {
    await expect(
      buildService('channel').unhideDm('ws-1', 'chan-1', 'me'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not apply the DM rule to a regular channel', async () => {
    const service = buildService('channel');

    // Gets past the DM guard and fails later, on the stubbed permission service.
    await expect(
      service.addMember('ws-1', 'chan-1', 'me', 'other'),
    ).rejects.not.toBeInstanceOf(BadRequestException);
  });
});
