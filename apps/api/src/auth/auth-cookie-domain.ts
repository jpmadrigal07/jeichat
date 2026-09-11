type EnvLike = Record<string, string | undefined>;

function hostnameOf(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url.trim()).hostname || null;
  } catch {
    return null;
  }
}

function sharedParentDomain(hosts: string[]): string | null {
  const labels = hosts.map((host) =>
    host.toLowerCase().split('.').filter(Boolean),
  );
  if (labels.some((parts) => parts.length < 2)) return null;

  const first = labels[0];
  if (!first) return null;

  const shared: string[] = [];
  for (let i = 1; i <= first.length; i += 1) {
    const label = first[first.length - i];
    if (!label || !labels.every((parts) => parts[parts.length - i] === label)) {
      break;
    }
    shared.unshift(label);
  }

  if (shared.length < 2) return null;
  return shared.join('.');
}

/**
 * Cookie Domain for split web/API hosts on the same parent (e.g. jeichat.zkript.dev
 * + jeichat-api.zkript.dev → zkript.dev). Host-only cookies stay on the API host and
 * Next.js never sees the session.
 *
 * Set AUTH_COOKIE_DOMAIN to override. Use `false` to disable auto-detection.
 */
export function resolveAuthCookieDomain(
  env: EnvLike = process.env,
): string | undefined {
  const explicit = env.AUTH_COOKIE_DOMAIN?.trim();
  if (explicit === 'false' || explicit === 'none') return undefined;
  if (explicit) return explicit.replace(/^\./, '');

  const apiHost = hostnameOf(env.BETTER_AUTH_URL);
  const webHosts = (env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origin) => hostnameOf(origin))
    .filter((host): host is string => Boolean(host));

  if (!apiHost || webHosts.length === 0) return undefined;
  if (webHosts.every((host) => host === apiHost)) return undefined;

  return sharedParentDomain([apiHost, ...webHosts]) ?? undefined;
}
