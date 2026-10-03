import { BadRequestException } from '@nestjs/common';
import { WEBHOOK_CONTENT_MAX_LENGTH } from './webhook-token';

const TITLE_KEYS = ['message', 'title', 'summary', 'event'] as const;
const MAX_FIELDS = 25;
const MAX_VALUE_LENGTH = 500;

/**
 * Turns a webhook request body into message Markdown. Accepts Discord-style
 * `{ content }`, Slack-style `{ text }`, or any flat JSON object (Coolify,
 * Uptime Kuma, CI tools…), which is rendered as a heading plus a field list.
 */
export function formatWebhookPayload(body: unknown): string {
  if (!isRecord(body)) {
    throw new BadRequestException('Body must be a JSON object');
  }

  const direct = nonBlankString(body.content) ?? nonBlankString(body.text);
  const content = direct ?? formatGenericPayload(body);
  if (!content) {
    throw new BadRequestException('content is required');
  }
  if (direct && content.length > WEBHOOK_CONTENT_MAX_LENGTH) {
    throw new BadRequestException(
      `content must be at most ${WEBHOOK_CONTENT_MAX_LENGTH} characters`,
    );
  }
  return truncate(content, WEBHOOK_CONTENT_MAX_LENGTH);
}

function formatGenericPayload(body: Record<string, unknown>): string | null {
  const titleKey = TITLE_KEYS.find((key) => nonBlankString(body[key]));
  const title = titleKey ? singleLine(String(body[titleKey])) : null;
  const status =
    body.success === true ? '✅ ' : body.success === false ? '❌ ' : '';

  const fields = Object.entries(body)
    .filter(([key]) => key !== titleKey && key !== 'success')
    .map(([key, value]) => {
      const rendered = formatValue(value);
      return rendered ? `- **${humanizeKey(key)}:** ${rendered}` : null;
    })
    .filter((line): line is string => line !== null)
    .slice(0, MAX_FIELDS);

  if (!title && fields.length === 0) return null;

  const heading = `${status}**${title ?? 'Webhook notification'}**`;
  return fields.length ? `${heading}\n\n${fields.join('\n')}` : heading;
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const text = singleLine(value);
    if (!text) return null;
    return truncate(text, MAX_VALUE_LENGTH);
  }
  const json = JSON.stringify(value);
  return json && json !== '{}' && json !== '[]'
    ? `\`${truncate(json, MAX_VALUE_LENGTH).replace(/`/g, "'")}\``
    : null;
}

/** `deployment_url` / `serverName` → `Deployment URL` / `Server name`. */
function humanizeKey(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      ['url', 'uuid', 'id', 'fqdn', 'ip'].includes(word)
        ? word.toUpperCase()
        : word,
    );
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function nonBlankString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
