import { createHmac, timingSafeEqual } from 'node:crypto';

export type GithubInstallState = {
  workspaceId: string;
  channelId: string;
  userId: string;
  owner: string;
  repo: string;
  nonce: string;
  exp: number;
};

function stateSecret(): string {
  return (
    process.env.GITHUB_STATE_SECRET ??
    process.env.GITHUB_WEBHOOK_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    ''
  );
}

export function signGithubInstallState(payload: GithubInstallState): string {
  const secret = stateSecret();
  if (!secret) {
    throw new Error('Missing GITHUB_STATE_SECRET or BETTER_AUTH_SECRET');
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyGithubInstallState(token: string): GithubInstallState {
  const secret = stateSecret();
  if (!secret) {
    throw new Error('Missing GITHUB_STATE_SECRET or BETTER_AUTH_SECRET');
  }
  const [body, sig] = token.split('.');
  if (!body || !sig) {
    throw new Error('Invalid state token');
  }
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid state signature');
  }
  const payload = JSON.parse(
    Buffer.from(body, 'base64url').toString('utf8'),
  ) as GithubInstallState;
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    throw new Error('State token expired');
  }
  return payload;
}

export function verifyGithubWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signatureHeader?.startsWith('sha256=')) {
    return false;
  }
  const expected =
    'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
