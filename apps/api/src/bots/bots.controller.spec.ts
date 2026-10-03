jest.mock('./bots.service', () => ({
  BotsService: class BotsService {},
}));

import { BotsController } from './bots.controller';
import type { BotsService } from './bots.service';

describe('BotsController', () => {
  const botsService = {
    me: jest.fn(),
    create: jest.fn(),
    list: jest.fn(),
    updateName: jest.fn(),
    regenerateToken: jest.fn(),
    disable: jest.fn(),
  };
  const session = { user: { id: 'owner-1' } };
  let controller: BotsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new BotsController(botsService as unknown as BotsService);
  });

  it('forwards bot identity from the actor', () => {
    const actor = {
      userId: 'user-bot',
      kind: 'bot' as const,
      workspaceId: 'ws-1',
    };
    void controller.me(actor);
    expect(botsService.me).toHaveBeenCalledWith(actor);
  });

  it('creates a bot as the session user', () => {
    void controller.create('ws-1', { name: 'Alerts' }, session as never);
    expect(botsService.create).toHaveBeenCalledWith(
      'ws-1',
      'owner-1',
      'Alerts',
    );
  });

  it('defaults a missing create name to an empty string', () => {
    void controller.create('ws-1', {}, session as never);
    expect(botsService.create).toHaveBeenCalledWith('ws-1', 'owner-1', '');
  });

  it('lists, renames, regenerates, and disables through the service', () => {
    void controller.list('ws-1', session as never);
    void controller.update(
      'ws-1',
      'bot-1',
      { name: 'Pager' },
      session as never,
    );
    void controller.regenerate('ws-1', 'bot-1', session as never);
    void controller.disable('ws-1', 'bot-1', session as never);

    expect(botsService.list).toHaveBeenCalledWith('ws-1', 'owner-1');
    expect(botsService.updateName).toHaveBeenCalledWith(
      'ws-1',
      'bot-1',
      'owner-1',
      'Pager',
    );
    expect(botsService.regenerateToken).toHaveBeenCalledWith(
      'ws-1',
      'bot-1',
      'owner-1',
    );
    expect(botsService.disable).toHaveBeenCalledWith(
      'ws-1',
      'bot-1',
      'owner-1',
    );
  });
});
