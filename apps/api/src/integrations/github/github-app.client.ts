import { createSign } from 'node:crypto';

const GITHUB_API = 'https://api.github.com';

function appId(): string {
  const id = process.env.GITHUB_APP_ID;
  if (!id) throw new Error('GITHUB_APP_ID is not configured');
  return id;
}

function privateKeyPem(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) throw new Error('GITHUB_APP_PRIVATE_KEY is not configured');
  return raw.replace(/\\n/g, '\n');
}

export function createGithubAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId(),
    }),
  ).toString('base64url');
  const data = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  const signature = sign.sign(privateKeyPem(), 'base64url');
  return `${data}.${signature}`;
}

export async function fetchInstallationAccessToken(
  installationId: number,
): Promise<string> {
  const jwt = createGithubAppJwt();
  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub installation token failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { token: string };
  return json.token;
}

export type GithubInstallationAccount = {
  login: string;
  type: string;
};

export async function fetchInstallationAccount(
  installationId: number,
): Promise<GithubInstallationAccount> {
  const jwt = createGithubAppJwt();
  const res = await fetch(`${GITHUB_API}/app/installations/${installationId}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub installation lookup failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    account: { login: string; type: string } | null;
  };
  if (!json.account) {
    throw new Error('GitHub installation has no account');
  }
  return { login: json.account.login, type: json.account.type };
}

export async function repositoryAccessible(
  installationId: number,
  owner: string,
  repo: string,
): Promise<boolean> {
  const token = await fetchInstallationAccessToken(installationId);
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  return res.ok;
}
