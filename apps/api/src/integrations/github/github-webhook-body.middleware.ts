import type { NextFunction, Request, Response } from 'express';

/** Captures raw body for GitHub HMAC verification and parses JSON for the handler. */
export function githubWebhookBodyMiddleware(
  req: Request & { rawBody?: Buffer },
  _res: Response,
  next: NextFunction,
): void {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  req.on('error', (err) => {
    next(err);
  });
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    req.rawBody = buf;
    if (buf.length > 0) {
      try {
        req.body = JSON.parse(buf.toString('utf8')) as unknown;
      } catch {
        req.body = {};
      }
    }
    next();
  });
}
