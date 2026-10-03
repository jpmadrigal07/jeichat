import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BotRateLimiter } from '../bots/bot-rate-limiter';
import { generateWebhookToken } from './webhook-token';
import {
  WebhookRateLimitedException,
  WebhooksService,
} from './webhooks.service';

jest.mock('../messages/messages.service', () => ({
  MessagesService: class MessagesService {},
}));
jest.mock('../users/users.service', () => ({
  UsersService: class UsersService {},
}));

const WEBHOOK_ID = '7b0c1f5e-2f43-4c2a-9a52-0d5a4c1e9f11';

describe('WebhooksService.execute', () => {
  const { token, tokenHash } = generateWebhookToken();
  const messagesService = { createFromWebhook: jest.fn() };
  let row: {
    webhook: {
      id: string;
      userId: string;
      tokenHash: string | null;
      deletedAt: Date | null;
    };
    channel: { id: string; channelType: string; parentId: string | null };
  } | null;
  let service: WebhooksService;

  beforeEach(() => {
    jest.restoreAllMocks();
    messagesService.createFromWebhook.mockReset().mockResolvedValue({
      id: 'msg-1',
      channelId: 'ch-1',
      content: 'hi',
      createdAt: new Date(0),
    });
    row = {
      webhook: {
        id: WEBHOOK_ID,
        userId: 'wh-user',
        tokenHash,
        deletedAt: null,
      },
      channel: { id: 'ch-1', channelType: 'channel', parentId: null },
    };
    const chain = {
      select: () => chain,
      from: () => chain,
      innerJoin: () => chain,
      where: () => Promise.resolve(row ? [row] : []),
      update: () => ({
        set: () => ({ where: () => Promise.resolve() }),
      }),
    };
    service = new WebhooksService(
      { db: chain } as never,
      {} as never,
      messagesService as never,
      {} as never,
    );
  });

  it('posts the content as the webhook user', async () => {
    await expect(
      service.execute(WEBHOOK_ID, token, { content: 'hi' }),
    ).resolves.toMatchObject({ id: 'msg-1' });
    expect(messagesService.createFromWebhook).toHaveBeenCalledWith(
      row?.channel,
      'wh-user',
      'hi',
    );
  });

  it.each([
    ['a malformed id', 'not-a-uuid', token],
    ['a wrong token', WEBHOOK_ID, 'nope'],
  ])('answers 404 for %s', async (_label, id, secret) => {
    await expect(
      service.execute(id, secret, { content: 'hi' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(messagesService.createFromWebhook).not.toHaveBeenCalled();
  });

  it('answers 404 once the webhook is deleted', async () => {
    row!.webhook.deletedAt = new Date();
    row!.webhook.tokenHash = null;
    await expect(
      service.execute(WEBHOOK_ID, token, { content: 'hi' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not spend the rate limit on a wrong token', async () => {
    const consume = jest.spyOn(BotRateLimiter.prototype, 'consume');
    await service
      .execute(WEBHOOK_ID, 'nope', { content: 'hi' })
      .catch(() => undefined);
    expect(consume).not.toHaveBeenCalled();
  });

  it('throws 429 with a retry hint when rate limited', async () => {
    jest.spyOn(BotRateLimiter.prototype, 'consume').mockResolvedValue(false);
    const error = await service
      .execute(WEBHOOK_ID, token, { content: 'hi' })
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(WebhookRateLimitedException);
    expect((error as WebhookRateLimitedException).getStatus()).toBe(429);
    expect(messagesService.createFromWebhook).not.toHaveBeenCalled();
  });

  it.each([
    ['missing content', {}],
    ['blank content', { content: '   ' }],
    ['non-string content', { content: 5 }],
    ['oversized content', { content: 'x'.repeat(4001) }],
  ])('rejects %s', async (_label, body) => {
    await expect(
      service.execute(WEBHOOK_ID, token, body),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses channels that no longer accept webhooks', async () => {
    row!.channel.channelType = 'voice';
    await expect(
      service.execute(WEBHOOK_ID, token, { content: 'hi' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
