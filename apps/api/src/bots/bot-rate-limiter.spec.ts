const mockIncr = jest.fn();
const mockPexpire = jest.fn();

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    pexpire: mockPexpire,
  })),
}));

import { BotRateLimiter } from './bot-rate-limiter';

describe('BotRateLimiter', () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    }
    if (originalToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    }
    mockIncr.mockReset();
    mockPexpire.mockReset();
  });

  describe('in-memory', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it('allows up to 60 hits in the window and rejects the next', async () => {
      const limiter = new BotRateLimiter();
      for (let i = 0; i < 60; i += 1) {
        await expect(limiter.consume('bot-a')).resolves.toBe(true);
      }
      await expect(limiter.consume('bot-a')).resolves.toBe(false);
    });

    it('tracks bots independently', async () => {
      const limiter = new BotRateLimiter();
      for (let i = 0; i < 60; i += 1) {
        await limiter.consume('bot-a');
      }
      await expect(limiter.consume('bot-a')).resolves.toBe(false);
      await expect(limiter.consume('bot-b')).resolves.toBe(true);
    });
  });

  describe('redis', () => {
    beforeEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    });

    it('sets expiry on the first increment and allows counts within the cap', async () => {
      mockIncr.mockResolvedValueOnce(1);
      mockPexpire.mockResolvedValueOnce(1);
      const limiter = new BotRateLimiter();
      await expect(limiter.consume('bot-a')).resolves.toBe(true);
      expect(mockIncr).toHaveBeenCalledWith('bot-rl:bot-a');
      expect(mockPexpire).toHaveBeenCalledWith('bot-rl:bot-a', 10_000);
    });

    it('rejects when redis count is above the cap', async () => {
      mockIncr.mockResolvedValueOnce(61);
      const limiter = new BotRateLimiter();
      await expect(limiter.consume('bot-a')).resolves.toBe(false);
      expect(mockPexpire).not.toHaveBeenCalled();
    });
  });
});
