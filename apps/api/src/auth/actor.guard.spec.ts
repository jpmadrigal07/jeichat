jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn((headers: unknown) => headers),
}));

jest.mock('./auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../bots/bots.service', () => ({
  BotsService: class BotsService {},
}));

import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { ActorGuard } from './actor.guard';
import { BOT_ALLOWED_KEY } from './actor';
import { auth } from './auth';
import type { BotsService } from '../bots/bots.service';

const resolvedBot = {
  id: 'bot-1',
  userId: 'user-bot',
  workspaceId: 'ws-1',
  name: 'Alerts',
  image: null,
};

function httpContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('ActorGuard', () => {
  const getSession = auth.api.getSession as jest.Mock;
  const botsService = {
    resolveToken: jest.fn(),
    consumeRateLimit: jest.fn(),
    assertChannelWorkspace: jest.fn(),
  };
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  let guard: ActorGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    botsService.resolveToken.mockResolvedValue(resolvedBot);
    botsService.consumeRateLimit.mockResolvedValue(undefined);
    botsService.assertChannelWorkspace.mockResolvedValue(undefined);
    reflector.getAllAndOverride.mockReturnValue(undefined);
    getSession.mockResolvedValue(null);
    guard = new ActorGuard(
      reflector as never,
      botsService as unknown as BotsService,
    );
  });

  it('allows non-http contexts', async () => {
    const context = {
      getType: () => 'ws',
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows Better Auth routes', async () => {
    await expect(
      guard.canActivate(
        httpContext({
          headers: {},
          originalUrl: '/api/auth/sign-in',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('allows public handlers', async () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    await expect(
      guard.canActivate(httpContext({ headers: {}, url: '/health' })),
    ).resolves.toBe(true);
  });

  it('rejects a bot token on a route that is not bot-allowed', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    await expect(
      guard.canActivate(
        httpContext({
          headers: { authorization: 'Bot jei_live_secret' },
          url: '/auth/me',
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(botsService.resolveToken).toHaveBeenCalledWith('jei_live_secret');
    expect(botsService.consumeRateLimit).toHaveBeenCalledWith('bot-1');
  });

  it('attaches a bot actor on an allowed route', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === BOT_ALLOWED_KEY) return true;
      return false;
    });
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bot jei_live_secret' },
      params: { workspaceId: 'ws-1', channelId: 'ch-1' },
      url: '/channels/ch-1/messages',
    };

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(botsService.assertChannelWorkspace).toHaveBeenCalledWith(
      'ch-1',
      'ws-1',
    );
    expect(request.actor).toEqual({
      userId: 'user-bot',
      kind: 'bot',
      workspaceId: 'ws-1',
      botId: 'bot-1',
    });
  });

  it('rejects a bot acting in another workspace', async () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === BOT_ALLOWED_KEY) return true;
      return false;
    });
    await expect(
      guard.canActivate(
        httpContext({
          headers: { authorization: ['Bot jei_live_secret'] },
          params: { workspaceId: 'ws-other' },
          url: '/workspaces/ws-other/channels',
        }),
      ),
    ).rejects.toThrow('Bot is not in this workspace');
  });

  it('attaches a user actor from a session cookie', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-1' } });
    const request: Record<string, unknown> = {
      headers: { cookie: 'session=abc' },
      url: '/workspaces',
    };

    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.actor).toEqual({ userId: 'user-1', kind: 'user' });
    expect(request.user).toEqual({ id: 'user-1' });
  });

  it('rejects a missing session', async () => {
    await expect(
      guard.canActivate(
        httpContext({
          headers: {},
          url: '/workspaces',
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
