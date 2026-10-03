import {
  generateWebhookToken,
  hashWebhookToken,
  normalizeWebhookName,
  webhookTokenMatches,
} from './webhook-token';

describe('webhook tokens', () => {
  it('generates distinct url-safe tokens and stores only the hash', () => {
    const a = generateWebhookToken();
    const b = generateWebhookToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.tokenHash).toBe(hashWebhookToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
  });

  it('matches only the exact token', () => {
    const { token, tokenHash } = generateWebhookToken();
    expect(webhookTokenMatches(token, tokenHash)).toBe(true);
    expect(webhookTokenMatches(`${token}x`, tokenHash)).toBe(false);
    expect(webhookTokenMatches('', tokenHash)).toBe(false);
  });

  it('never matches a deleted webhook', () => {
    expect(webhookTokenMatches('anything', null)).toBe(false);
  });
});

describe('normalizeWebhookName', () => {
  it('strips control characters and collapses whitespace', () => {
    expect(normalizeWebhookName('  Build\n\tbot\u0000 ')).toBe('Build bot');
  });

  it('caps the length at 80', () => {
    expect(normalizeWebhookName('x'.repeat(200))).toHaveLength(80);
  });

  it('rejects blank and non-string names', () => {
    expect(normalizeWebhookName('   ')).toBeNull();
    expect(normalizeWebhookName(42)).toBeNull();
    expect(normalizeWebhookName(undefined)).toBeNull();
  });
});
