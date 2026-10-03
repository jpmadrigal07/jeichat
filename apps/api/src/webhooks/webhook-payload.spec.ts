import { BadRequestException } from '@nestjs/common';
import { formatWebhookPayload } from './webhook-payload';

describe('formatWebhookPayload', () => {
  it('uses Discord-style content verbatim', () => {
    expect(formatWebhookPayload({ content: '**hi**\nthere' })).toBe(
      '**hi**\nthere',
    );
  });

  it('falls back to Slack-style text', () => {
    expect(formatWebhookPayload({ text: 'Build passed' })).toBe('Build passed');
  });

  it('renders the Coolify test notification', () => {
    expect(
      formatWebhookPayload({
        success: true,
        message: 'This is a test webhook notification from Coolify.',
        event: 'test',
        url: 'https://coolify.example.com',
      }),
    ).toBe(
      [
        '✅ **This is a test webhook notification from Coolify.**',
        '',
        '- **Event:** test',
        '- **URL:** https://coolify.example.com',
      ].join('\n'),
    );
  });

  it('renders a failed Coolify deployment with humanized keys', () => {
    const content = formatWebhookPayload({
      success: false,
      message: 'Deployment failed',
      event: 'deployment_failed',
      application_name: 'jeichat-api',
      deployment_url: 'https://coolify.example.com/d/1',
      pull_request_id: 0,
      preview_fqdn: null,
    });
    expect(content.startsWith('❌ **Deployment failed**')).toBe(true);
    expect(content).toContain('- **Application name:** jeichat-api');
    expect(content).toContain(
      '- **Deployment URL:** https://coolify.example.com/d/1',
    );
    expect(content).toContain('- **Pull request ID:** 0');
    expect(content).not.toContain('Preview');
  });

  it('gives untitled payloads a generic heading and inlines nested values', () => {
    expect(formatWebhookPayload({ status: 'up', tags: ['a', 'b'] })).toBe(
      '**Webhook notification**\n\n- **Status:** up\n- **Tags:** `["a","b"]`',
    );
  });

  it('keeps field values on one line so they cannot inject markdown blocks', () => {
    expect(
      formatWebhookPayload({ message: 'Hi', note: 'line one\n# heading' }),
    ).toBe('**Hi**\n\n- **Note:** line one # heading');
  });

  it('truncates generated content to the message limit', () => {
    const body: Record<string, string> = { message: 'Big' };
    for (let i = 0; i < 20; i += 1) body[`field_${i}`] = 'x'.repeat(500);
    expect(formatWebhookPayload(body).length).toBeLessThanOrEqual(4000);
  });

  it.each([
    ['null', null],
    ['an array', ['x']],
    ['a string', 'hello'],
    ['an empty object', {}],
    ['only blank values', { content: '  ', note: '' }],
  ])('rejects %s', (_label, body) => {
    expect(() => formatWebhookPayload(body)).toThrow(BadRequestException);
  });

  it('still rejects oversized direct content instead of cutting it', () => {
    expect(() => formatWebhookPayload({ content: 'x'.repeat(4001) })).toThrow(
      BadRequestException,
    );
  });
});
