import { createHash, randomBytes } from 'node:crypto';

export const BOT_TOKEN_PREFIX = 'jei_live_';

export function hashBotToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateBotToken(): {
  token: string;
  tokenHash: string;
  tokenPrefix: string;
} {
  const token = `${BOT_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
  return {
    token,
    tokenHash: hashBotToken(token),
    tokenPrefix: token.slice(0, BOT_TOKEN_PREFIX.length + 4),
  };
}

export function parseBotAuthorization(
  header: string | undefined,
): string | null {
  if (!header) return null;
  const match = /^Bot\s+(\S+)/i.exec(header.trim());
  return match?.[1] ?? null;
}

export function botEmailLocalPart(name: string, botId: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const suffix = botId.replace(/-/g, '').slice(0, 8);
  return `${slug || 'bot'}-${suffix}`;
}
