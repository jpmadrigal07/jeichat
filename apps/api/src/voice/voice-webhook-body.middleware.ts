import type { NextFunction, Request, Response } from 'express';

/**
 * LiveKit posts webhooks as `application/webhook+json`, which the global JSON
 * parser skips, so the stream is still unread here. The signature covers the
 * exact bytes, so keep them raw for `WebhookReceiver`.
 */
export function voiceWebhookBodyMiddleware(
  req: Request & { rawBody?: Buffer },
  _res: Response,
  next: NextFunction,
): void {
  if (req.rawBody || req.readableEnded) {
    next();
    return;
  }
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });
  req.on('error', (err) => {
    next(err);
  });
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
}
