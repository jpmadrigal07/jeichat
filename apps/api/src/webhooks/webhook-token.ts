import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const WEBHOOK_NAME_MAX_LENGTH = 80;
export const WEBHOOK_CONTENT_MAX_LENGTH = 4000;
export const MAX_WEBHOOKS_PER_CHANNEL = 10;

export function hashWebhookToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 256 bits of entropy: unguessable, so the URL itself is the credential. */
export function generateWebhookToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashWebhookToken(token) };
}

/** Constant-time check so response timing can't be used to guess the secret. */
export function webhookTokenMatches(
  token: string,
  storedHash: string | null,
): boolean {
  if (!storedHash || !token) return false;
  const actual = Buffer.from(hashWebhookToken(token), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Strips control characters and collapses whitespace; null when nothing usable is left. */
export function normalizeWebhookName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, WEBHOOK_NAME_MAX_LENGTH);
  return cleaned || null;
}

export function webhookUserEmail(webhookId: string): string {
  return `webhook-${webhookId.replace(/-/g, '')}@webhooks.invalid`;
}

export function webhookPublicUrl(webhookId: string, token: string): string {
  const base = (
    process.env.BETTER_AUTH_URL ??
    `http://localhost:${process.env.PORT ?? 3002}`
  ).replace(/\/+$/, '');
  return `${base}/webhooks/${webhookId}/${token}`;
}
