import dns, { type LookupAddress } from 'node:dns';
import { EventEmitter } from 'node:events';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import https from 'node:https';
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

describe('safeFetchDocument connecting', () => {
  type FakeRequest = EventEmitter & { end: () => void };

  /** Stubs `https.request`; `onEnd` plays the server for each attempt. */
  function stubRequest(
    onEnd: (
      request: FakeRequest,
      options: https.RequestOptions,
      respond: (response: unknown) => void,
    ) => void,
  ) {
    const calls: https.RequestOptions[] = [];
    jest.spyOn(https, 'request').mockImplementation(((
      options: https.RequestOptions,
      callback: (response: unknown) => void,
    ) => {
      calls.push(options);
      const request = new EventEmitter() as FakeRequest;
      request.end = () => onEnd(request, options, callback);
      return request;
    }) as unknown as typeof https.request);
    return calls;
  }

  function stubDns(addresses: LookupAddress[]) {
    return jest
      .spyOn(dns.promises, 'lookup')
      .mockResolvedValue(addresses as never);
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Bun emits one 'error' per address it tries; the second one used to have no
  // listener and crashed the process. Node would throw on the unhandled emit.
  it('survives a request that emits more than one error', async () => {
    const uncaught = jest.fn();
    process.on('uncaughtException', uncaught);
    stubRequest((request) => {
      setImmediate(() => request.emit('error', new Error('ECONNREFUSED ::1')));
      setImmediate(() =>
        request.emit('error', new Error('ECONNREFUSED 127.0.0.1')),
      );
    });

    await expect(safeFetchDocument('https://8.8.8.8/')).rejects.toThrow(
      'ECONNREFUSED ::1',
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    process.off('uncaughtException', uncaught);

    expect(uncaught).not.toHaveBeenCalled();
  });

  it('connects to the address it resolved and keeps the hostname for TLS', async () => {
    stubDns([{ address: '93.184.216.34', family: 4 }]);
    const calls = stubRequest((request) =>
      setImmediate(() => request.emit('error', new Error('stop'))),
    );

    await expect(
      safeFetchDocument('https://example.com/a/b?q=1#frag'),
    ).rejects.toThrow('stop');

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      host: '93.184.216.34',
      port: 443,
      path: '/a/b?q=1',
      servername: 'example.com',
    });
    expect(calls[0].headers).toMatchObject({ Host: 'example.com' });
    // A custom `lookup` is what Bun 1.3.10 cannot connect through.
    expect(calls[0]).not.toHaveProperty('lookup');
  });

  it('does not send an IP address as the TLS server name', async () => {
    const calls = stubRequest((request) =>
      setImmediate(() => request.emit('error', new Error('stop'))),
    );
    await expect(safeFetchDocument('https://8.8.8.8/')).rejects.toThrow('stop');
    expect(calls[0].host).toBe('8.8.8.8');
    expect(calls[0]).not.toHaveProperty('servername');
  });

  it('refuses a host when any DNS answer is non-public', async () => {
    stubDns([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ]);
    const calls = stubRequest(() => undefined);

    await expect(
      safeFetchDocument('https://example.com/'),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(calls).toHaveLength(0);
  });

  it('tries IPv4 first, then the next address when one fails', async () => {
    stubDns([
      { address: '2606:4700::6810:84e5', family: 6 },
      { address: '93.184.216.34', family: 4 },
    ]);
    const calls = stubRequest((request, options, respond) => {
      if (options.host === '93.184.216.34') {
        setImmediate(() => request.emit('error', new Error('ECONNREFUSED')));
        return;
      }
      respond({ statusCode: 404, headers: {}, destroy: () => undefined });
    });

    await expect(safeFetchDocument('https://example.com/')).rejects.toThrow(
      'Unexpected status 404',
    );
    expect(calls.map((call) => call.host)).toEqual([
      '93.184.216.34',
      '2606:4700::6810:84e5',
    ]);
  });
});
