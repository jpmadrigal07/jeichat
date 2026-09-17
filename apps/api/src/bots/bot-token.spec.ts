import {
  BOT_TOKEN_PREFIX,
  hashBotToken,
  generateBotToken,
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

  it('generates a prefixed token whose hash and prefix match', () => {
    const generated = generateBotToken();
    expect(generated.token.startsWith(BOT_TOKEN_PREFIX)).toBe(true);
    expect(generated.tokenHash).toBe(hashBotToken(generated.token));
    expect(generated.tokenPrefix).toBe(
      generated.token.slice(0, BOT_TOKEN_PREFIX.length + 4),
    );
    expect(generateBotToken().token).not.toBe(generated.token);
  });

  it('parses a Bot authorization header', () => {
    expect(parseBotAuthorization('Bot abc.def')).toBe('abc.def');
    expect(parseBotAuthorization('  bot   abc.def')).toBe('abc.def');
    expect(parseBotAuthorization('Bearer abc')).toBeNull();
    expect(parseBotAuthorization('Bot')).toBeNull();
    expect(parseBotAuthorization(undefined)).toBeNull();
  });

  it('builds a mention-safe email local part from the bot name', () => {
    expect(
      botEmailLocalPart('Alerts Bot', '11111111-2222-4333-8444-555555555555'),
    ).toBe('alerts-bot-11111111');
    expect(
      botEmailLocalPart('!!!', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
    ).toBe('bot-aaaaaaaa');
    expect(
      botEmailLocalPart(
        'A Very Long Bot Display Name That Overflows',
        '11111111-2222-4333-8444-555555555555',
      ),
    ).toBe('a-very-long-bot-display--11111111');
  });
});
