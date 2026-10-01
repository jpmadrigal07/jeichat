import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import zlib from 'node:zlib';
import {
  parsePublicUrl,
  safeFetchDocument,
  UnsafeUrlError,
} from './safe-fetch';

describe('parsePublicUrl', () => {
  it.each([
    'file:///etc/passwd',
    'ftp://example.com/file',
    'javascript:alert(1)',
    'http://user:pass@example.com/',
    'http://example.com:8080/',
    'http://127.0.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://2130706433/',
    'http://0x7f.1/',
    'not a url',
  ])('rejects %s', (raw) => {
    expect(() => parsePublicUrl(raw)).toThrow(UnsafeUrlError);
  });

  it.each([
    'https://example.com/path?q=1',
    'http://example.com/',
    'https://example.com:443/',
    'http://8.8.8.8/',
  ])('accepts %s', (raw) => {
    expect(() => parsePublicUrl(raw)).not.toThrow();
  });
});

describe('safeFetchDocument', () => {
  let server: http.Server;
  let base: string;
  let requestCount: number;
  let handler: (req: IncomingMessage, res: ServerResponse) => void;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      requestCount += 1;
      handler(req, res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    requestCount = 0;
    handler = (_req, res) => res.end('ok');
  });

  // Set once the server is listening; only that origin is exempt from the guards.
  const local = {
    get allowLocalOrigin() {
      return base;
    },
  };

  it('never connects to loopback by default (IP literal)', async () => {
    await expect(safeFetchDocument(`${base}/`)).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
    expect(requestCount).toBe(0);
  });

  it('never connects to a hostname that resolves to loopback', async () => {
    const port = new URL(base).port;
    await expect(
      safeFetchDocument(`http://localhost:${port}/`),
    ).rejects.toThrow();
    expect(requestCount).toBe(0);
  });

  it('returns the head of an HTML page and stops reading at </head>', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.write('<html><head><title>Hi</title></head>');
      res.write('<body>' + 'x'.repeat(5000));
      res.end();
    };
    const result = await safeFetchDocument(`${base}/page`, local);
    expect(result.kind).toBe('html');
    if (result.kind !== 'html') return;
    expect(result.html).toContain('<title>Hi</title>');
    expect(result.finalUrl).toBe(`${base}/page`);
  });

  it('decodes gzip responses', async () => {
    handler = (_req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Encoding': 'gzip',
      });
      res.end(zlib.gzipSync('<head><title>Zipped</title></head>'));
    };
    const result = await safeFetchDocument(`${base}/gz`, local);
    expect(result.kind === 'html' && result.html).toContain('Zipped');
  });

  it('honours the declared charset', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=iso-8859-1' });
      res.end(Buffer.from('<head><title>Caf\xe9</title></head>', 'latin1'));
    };
    const result = await safeFetchDocument(`${base}/latin1`, local);
    expect(result.kind === 'html' && result.html).toContain('Café');
  });

  it('caps how much of an endless body it reads', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      const timer = setInterval(() => res.write('a'.repeat(64 * 1024)), 1);
      res.once('close', () => clearInterval(timer));
    };
    const result = await safeFetchDocument(`${base}/endless`, {
      allowLocalOrigin: base,
      maxHtmlBytes: 128 * 1024,
    });
    expect(result.kind === 'html' && result.html.length).toBeLessThanOrEqual(
      128 * 1024,
    );
  });

  it('reports direct image links without downloading the body', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/gif' });
      res.end('GIF89a');
    };
    const result = await safeFetchDocument(`${base}/cat.gif`, local);
    expect(result).toEqual({
      kind: 'image',
      finalUrl: `${base}/cat.gif`,
      contentType: 'image/gif',
    });
  });

  it('asks for the image itself when the URL looks like an image', async () => {
    const accepts: string[] = [];
    handler = (req, res) => {
      accepts.push(String(req.headers.accept));
      res.writeHead(200, { 'Content-Type': 'image/gif' });
      res.end('GIF89a');
    };
    await safeFetchDocument(`${base}/m/abc/cat.gif`, local);
    await safeFetchDocument(`${base}/view/cat-gif-123`, local);
    expect(accepts[0]).toMatch(/^image\/\*/);
    expect(accepts[1]).toMatch(/^text\/html/);
  });

  it('rejects unsupported image types such as SVG', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      res.end('<svg/>');
    };
    await expect(safeFetchDocument(`${base}/a.svg`, local)).rejects.toThrow(
      /Unsupported image type/,
    );
  });

  it('rejects non-HTML content', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    };
    await expect(safeFetchDocument(`${base}/json`, local)).rejects.toThrow(
      /Unsupported content type/,
    );
  });

  it('rejects non-200 responses', async () => {
    handler = (_req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<head><title>Gone</title></head>');
    };
    await expect(safeFetchDocument(`${base}/missing`, local)).rejects.toThrow(
      /Unexpected status 404/,
    );
  });

  it('follows redirects, resolving relative locations', async () => {
    handler = (req, res) => {
      if (req.url === '/start') {
        res.writeHead(302, { Location: '/final' });
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<head><title>Final</title></head>');
    };
    const result = await safeFetchDocument(`${base}/start`, local);
    expect(result.kind === 'html' && result.finalUrl).toBe(`${base}/final`);
  });

  it('gives up after too many redirects', async () => {
    handler = (_req, res) => {
      res.writeHead(302, { Location: '/again' });
      res.end();
    };
    await expect(safeFetchDocument(`${base}/loop`, local)).rejects.toThrow(
      /Too many redirects/,
    );
  });

  it('refuses a redirect to a non-http scheme', async () => {
    handler = (_req, res) => {
      res.writeHead(302, { Location: 'file:///etc/passwd' });
      res.end();
    };
    await expect(safeFetchDocument(`${base}/r`, local)).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  it('refuses a redirect that points at a private address', async () => {
    handler = (_req, res) => {
      res.writeHead(302, {
        Location: 'http://169.254.169.254/latest/meta-data/',
      });
      res.end();
    };
    await expect(safeFetchDocument(`${base}/r`, local)).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
    // Only the first hop was requested; the metadata address was never contacted.
    expect(requestCount).toBe(1);
  });

  it('refuses a redirect to another port on the same loopback host', async () => {
    handler = (_req, res) => {
      res.writeHead(302, { Location: 'http://127.0.0.1:9/' });
      res.end();
    };
    await expect(safeFetchDocument(`${base}/r`, local)).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  it('times out slow servers', async () => {
    handler = () => {
      // Never respond.
    };
    await expect(
      safeFetchDocument(`${base}/slow`, {
        allowLocalOrigin: base,
        timeoutMs: 150,
      }),
    ).rejects.toThrow();
  });
});
