import { promises as dnsPromises, type LookupAddress } from 'node:dns';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import type { Readable } from 'node:stream';
import zlib from 'node:zlib';
import { isPublicAddress } from './address-policy';

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxRedirects?: number;
  maxHtmlBytes?: number;
  /**
   * Test-only: one origin (e.g. `http://127.0.0.1:4000`) exempt from the
   * address and port restrictions, so specs can use a loopback server while
   * every other hop, such as a redirect elsewhere, is still enforced.
   */
  allowLocalOrigin?: string;
};

export type FetchedDocument =
  | { kind: 'html'; finalUrl: string; html: string }
  | { kind: 'image'; finalUrl: string; contentType: string };

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_HTML_BYTES = 1024 * 1024;
const ALLOWED_PORTS = new Set(['', '80', '443']);
const USER_AGENT = 'Mozilla/5.0 (compatible; JeiChatBot/1.0)';
const HTML_ACCEPT = 'text/html,application/xhtml+xml,image/*;q=0.8,*/*;q=0.5';
// Some hosts (Tenor's media CDN) answer an HTML-first request for a .gif URL
// with an HTML wrapper page, so ask for the image itself when the URL looks like one.
const IMAGE_ACCEPT = 'image/*,*/*;q=0.5';
const IMAGE_PATH = /\.(?:gif|png|jpe?g|webp|avif)$/i;
const PREVIEWABLE_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
]);

/**
 * Parses `raw` and rejects anything the fetcher must not request: non-http(s)
 * schemes, embedded credentials, unusual ports, and IP-literal hosts in
 * non-public ranges. Hostnames are resolved and checked again right before
 * connecting (see `resolveCandidates`), because they carry no address yet.
 */
export function parsePublicUrl(raw: string, allowLocalOrigin?: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https URLs can be previewed');
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs with credentials are not allowed');
  }
  if (url.origin === allowLocalOrigin) return url;
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new UnsafeUrlError('Only the default http and https ports are allowed');
  }
  // WHATWG URL already normalises 0x7f.1 / 2130706433 style hosts to dotted form.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) !== 0 && !isPublicAddress(host)) {
    throw new UnsafeUrlError('Address is not publicly routable');
  }
  return url;
}

/** The host without the brackets `URL` keeps around IPv6 literals. */
function bareHost(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, '');
}

/**
 * Resolves `url`'s host to the addresses worth connecting to, refusing the
 * whole host if any answer is non-public so a mixed record set cannot slip
 * through. We connect to one of these exact addresses (see `openResponse`),
 * so DNS cannot answer differently between this check and the connection.
 */
async function resolveCandidates(
  url: URL,
  exempt: boolean,
  signal: AbortSignal,
): Promise<LookupAddress[]> {
  const host = bareHost(url);
  const literalFamily = isIP(host);
  if (literalFamily !== 0) return [{ address: host, family: literalFamily }];

  signal.throwIfAborted();
  // getaddrinfo cannot be cancelled, so stop waiting for it at the deadline.
  const deadline = new Promise<never>((_, reject) => {
    signal.addEventListener(
      'abort',
      () =>
        reject(
          signal.reason instanceof Error ? signal.reason : new Error('Aborted'),
        ),
      { once: true },
    );
  });
  const addresses = await Promise.race([
    dnsPromises.lookup(host, { all: true }),
    deadline,
  ]);

  if (
    !exempt &&
    (addresses.length === 0 ||
      addresses.some((entry) => !isPublicAddress(entry.address)))
  ) {
    throw new UnsafeUrlError('Address is not publicly routable');
  }
  // IPv4 first: a host with a broken IPv6 route should not use up the deadline.
  return [...addresses].sort((a, b) => a.family - b.family);
}

function openResponse(
  url: URL,
  address: LookupAddress,
  signal: AbortSignal,
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const secure = url.protocol === 'https:';
    const transport = secure ? https : http;
    const host = bareHost(url);
    // Connect to the vetted address ourselves instead of passing a custom
    // `lookup`: Bun 1.3.10 cannot connect through one (ECONNREFUSED). The
    // hostname still goes out as SNI, certificate name and Host header.
    const options: https.RequestOptions = {
      method: 'GET',
      host: address.address,
      port: Number(url.port) || (secure ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      agent: false,
      signal,
      ...(secure && isIP(host) === 0 ? { servername: host } : {}),
      headers: {
        Host: url.host,
        'User-Agent': USER_AGENT,
        Accept: IMAGE_PATH.test(url.pathname) ? IMAGE_ACCEPT : HTML_ACCEPT,
        'Accept-Language': 'en',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    };
    const request = transport.request(options, resolve);
    // `on`, not `once`: a request can emit several errors (Bun reports one per
    // address it tries), and an 'error' with no listener crashes the process.
    // Rejecting an already-settled promise is a no-op.
    request.on('error', reject);
    request.end();
  });
}

/** Opens a response from the first address of `url`'s host that accepts us. */
async function connect(
  url: URL,
  signal: AbortSignal,
  exempt: boolean,
): Promise<IncomingMessage> {
  const candidates = await resolveCandidates(url, exempt, signal);
  let lastError: unknown = new Error('Host did not resolve');
  for (const address of candidates) {
    try {
      return await openResponse(url, address, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

function decodeBody(response: IncomingMessage): Readable {
  switch ((response.headers['content-encoding'] ?? '').toLowerCase()) {
    case 'gzip':
    case 'x-gzip':
      return response.pipe(zlib.createGunzip());
    case 'deflate':
      return response.pipe(zlib.createInflate());
    case 'br':
      return response.pipe(zlib.createBrotliDecompress());
    default:
      return response;
  }
}

function charsetFromContentType(contentType: string): string | null {
  return /charset=["']?([\w-]+)/i.exec(contentType)?.[1] ?? null;
}

function decodeText(bytes: Buffer, contentType: string): string {
  const declared =
    charsetFromContentType(contentType) ??
    // Older pages declare the charset only in the first KB of markup.
    /<meta[^>]+charset=["']?([\w-]+)/i.exec(
      bytes.subarray(0, 1024).toString('latin1'),
    )?.[1] ??
    'utf-8';
  try {
    return new TextDecoder(declared).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/** Reads until the cap or the end of `<head>`, whichever comes first. */
async function readHead(
  response: IncomingMessage,
  maxBytes: number,
): Promise<Buffer> {
  const body = decodeBody(response);
  const chunks: Buffer[] = [];
  let total = 0;
  let previousTail = '';
  try {
    for await (const chunk of body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(buffer);
      total += buffer.length;
      const window = previousTail + buffer.toString('latin1').toLowerCase();
      if (window.includes('</head>') || total >= maxBytes) break;
      previousTail = window.slice(-7);
    }
  } finally {
    body.destroy();
    response.destroy();
  }
  return Buffer.concat(chunks).subarray(0, maxBytes);
}

/**
 * Fetches `rawUrl` for previewing, following a few redirects. Returns the
 * head of an HTML page, or just the content type for a direct image link.
 * Throws for anything unsafe, slow, oversized or unsupported.
 */
export async function safeFetchDocument(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<FetchedDocument> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    maxHtmlBytes = DEFAULT_MAX_HTML_BYTES,
    allowLocalOrigin,
  } = options;

  const deadline = AbortSignal.timeout(timeoutMs);
  let url = parsePublicUrl(rawUrl, allowLocalOrigin);

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = await connect(
      url,
      deadline,
      url.origin === allowLocalOrigin,
    );
    const status = response.statusCode ?? 0;

    if (status >= 300 && status < 400 && response.headers.location) {
      response.destroy();
      url = parsePublicUrl(
        new URL(response.headers.location, url).toString(),
        allowLocalOrigin,
      );
      continue;
    }
    if (status !== 200) {
      response.destroy();
      throw new Error(`Unexpected status ${status}`);
    }

    const contentType = (response.headers['content-type'] ?? '').toLowerCase();
    const mime = contentType.split(';')[0].trim();

    if (mime.startsWith('image/')) {
      response.destroy();
      if (!PREVIEWABLE_IMAGE_TYPES.has(mime)) {
        throw new Error(`Unsupported image type ${mime}`);
      }
      return { kind: 'image', finalUrl: url.toString(), contentType: mime };
    }
    if (mime !== 'text/html' && mime !== 'application/xhtml+xml') {
      response.destroy();
      throw new Error(`Unsupported content type ${mime || 'unknown'}`);
    }

    const bytes = await readHead(response, maxHtmlBytes);
    return {
      kind: 'html',
      finalUrl: url.toString(),
      html: decodeText(bytes, contentType),
    };
  }

  throw new Error('Too many redirects');
}
