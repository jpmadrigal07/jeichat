/**
 * Sends a signed GitHub `pull_request` webhook (default action: reopened).
 *
 *   bun ./scripts/simulate-github-pull-request-webhook.ts
 *   bun ./scripts/simulate-github-pull-request-webhook.ts -- --action opened
 */
import { createHmac } from 'node:crypto';
import { config } from 'dotenv';
import { join } from 'node:path';

const monorepoRoot = join(import.meta.dir, '../../..');
config({ path: join(monorepoRoot, '.env') });

function arg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1]!;
}

const owner = arg('owner', 'jpmadrigal07');
const repo = arg('repo', 'jeichat');
const branch = arg('branch', 'feat/GEN-14-test-github-automation');
const action = arg('action', 'reopened');
const prNumber = Number(arg('pr', '5'));
const secret = process.env.GITHUB_WEBHOOK_SECRET;
const target =
  process.env.GITHUB_WEBHOOK_TARGET_URL ?? 'http://localhost:3001/integrations/github/webhook';

if (!secret) {
  console.error('Missing GITHUB_WEBHOOK_SECRET in .env');
  process.exit(1);
}

const body = JSON.stringify({
  action,
  pull_request: {
    number: prNumber,
    title: 'GEN-14: test GitHub automation',
    head: { ref: branch },
    html_url: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
    state: 'open',
    merged: false,
    draft: false,
  },
  repository: { name: repo, owner: { login: owner } },
});

const signature =
  'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
const deliveryId = `local-pr-test-${Date.now()}`;

const res = await fetch(target, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Hub-Signature-256': signature,
    'X-GitHub-Event': 'pull_request',
    'X-GitHub-Delivery': deliveryId,
  },
  body,
});

const text = await res.text();
console.log(`POST ${target}`);
console.log(`pull_request.${action} ${owner}/${repo} #${prNumber}`);
console.log(`Status: ${res.status}`);
console.log(text);

if (!res.ok) {
  process.exit(1);
}
