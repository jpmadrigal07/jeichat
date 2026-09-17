import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BotRateLimiter } from './bot-rate-limiter';
import { BotsService } from './bots.service';

jest.mock('../gateway/chat.gateway', () => ({
  ChatGateway: class ChatGateway {},
}));

describe('BotsService', () => {
  const workspacesService = {
    verifyOwnership: jest.fn(),
  };
  let service: BotsService;

  beforeEach(() => {
    jest.clearAllMocks();
    workspacesService.verifyOwnership.mockResolvedValue(undefined);
    service = new BotsService(
      {} as never,
      workspacesService as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('rejects an empty bot name on create', async () => {
    await expect(
      service.create('ws-1', 'owner-1', '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(workspacesService.verifyOwnership).toHaveBeenCalledWith(
      'ws-1',
      'owner-1',
    );
  });

  it('rejects an empty bot name on rename', async () => {
    const requireOwned = jest
      .spyOn(
        service as unknown as {
          requireOwnedBot: () => Promise<{ userId: string }>;
        },
        'requireOwnedBot',
      )
      .mockResolvedValue({ userId: 'user-bot' });

    await expect(
      service.updateName('ws-1', 'bot-1', 'owner-1', '  '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(requireOwned).toHaveBeenCalled();
  });

  it('rejects /bots/@me unless the actor is a bot', async () => {
    await expect(
      service.me({ userId: 'user-1', kind: 'user' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws 429 when the rate limiter is exhausted', async () => {
    const consume = jest
      .spyOn(BotRateLimiter.prototype, 'consume')
      .mockResolvedValue(false);
    const error = await service
      .consumeRateLimit('bot-1')
      .catch((err: unknown) => err);
    consume.mockRestore();
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  });
});
