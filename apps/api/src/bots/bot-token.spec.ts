import {
  hashBotToken,
  botEmailLocalPart,
  parseBotAuthorization,
} from './bot-token';

describe('bot token helpers', () => {
  it('hashes the same token to a stable sha256 hex', () => {
    const hash = hashBotToken('jei_live_test');
    expect(hash).toHaveLength(64);
    expect(hashBotToken('jei_live_test')).toBe(hash);
    expect(hashBotToken('other')).not.toBe(hash);
  });

  it('parses a Bot authorization header', () => {
    expect(parseBotAuthorization('Bot abc.def')).toBe('abc.def');
    expect(parseBotAuthorization('Bearer abc')).toBeNull();
    expect(parseBotAuthorization(undefined)).toBeNull();
  });

  it('builds a mention-safe email local part from the bot name', () => {
    expect(
      botEmailLocalPart('Alerts Bot', '11111111-2222-4333-8444-555555555555'),
    ).toBe('alerts-bot-11111111');
  });
});
