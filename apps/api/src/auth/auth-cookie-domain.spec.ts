import { resolveAuthCookieDomain } from './auth-cookie-domain';

describe('resolveAuthCookieDomain', () => {
  it('returns an explicit domain without a leading dot', () => {
    expect(
      resolveAuthCookieDomain({ AUTH_COOKIE_DOMAIN: '.zkript.dev' }),
    ).toBe('zkript.dev');
  });

  it('can disable auto-detection', () => {
    expect(
      resolveAuthCookieDomain({
        AUTH_COOKIE_DOMAIN: 'false',
        BETTER_AUTH_URL: 'https://jeichat-api.zkript.dev',
        WEB_ORIGIN: 'https://jeichat.zkript.dev',
      }),
    ).toBeUndefined();
  });

  it('shares sibling production subdomains', () => {
    expect(
      resolveAuthCookieDomain({
        BETTER_AUTH_URL: 'https://jeichat-api.zkript.dev',
        WEB_ORIGIN: 'https://jeichat.zkript.dev',
      }),
    ).toBe('zkript.dev');
  });

  it('stays host-only on localhost', () => {
    expect(
      resolveAuthCookieDomain({
        BETTER_AUTH_URL: 'http://localhost:3001',
        WEB_ORIGIN: 'http://localhost:3000',
      }),
    ).toBeUndefined();
  });
});
