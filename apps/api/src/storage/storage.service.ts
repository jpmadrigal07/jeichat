import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { STORAGE_CONFIG, type StorageConfig } from './storage.config';

export type StorageObject = {
  body: Readable;
  contentType: string;
  contentLength?: number;
  contentRange?: string;
  etag?: string;
  statusCode: 200 | 206;
};

function isMissingObject(error: unknown): boolean {
  if (error instanceof NotFound) return true;
  if (error instanceof S3ServiceException) {
    return (
      error.name === 'NoSuchKey' ||
      error.name === 'NotFound' ||
      error.$metadata.httpStatusCode === 404
    );
  }
  return false;
}

function isInvalidRange(error: unknown): boolean {
  if (!(error instanceof S3ServiceException)) return false;
  return (
    error.name === 'InvalidRange' || error.$metadata.httpStatusCode === 416
  );
}

function toNodeReadable(body: {
  transformToWebStream: () => ReadableStream;
}): Readable {
  if (body instanceof Readable) {
    return body;
  }
  return Readable.fromWeb(body.transformToWebStream() as NodeWebReadableStream);
}

export function pipeStorageObject(
  res: Response,
  object: StorageObject,
  extra: { cacheControl: string; contentDisposition?: string },
): void {
  res.status(object.statusCode);
  res.setHeader('Content-Type', object.contentType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', extra.cacheControl);
  if (object.contentLength != null) {
    res.setHeader('Content-Length', String(object.contentLength));
  }
  if (object.contentRange) {
    res.setHeader('Content-Range', object.contentRange);
  }
  if (object.etag) {
    res.setHeader('ETag', object.etag);
  }
  if (extra.contentDisposition) {
    res.setHeader('Content-Disposition', extra.contentDisposition);
  }

  object.body.once('error', () => {
    if (!res.headersSent) {
      res.status(502).end();
      return;
    }
    res.destroy();
  });
  res.once('close', () => {
    if (!object.body.destroyed && !object.body.readableEnded) {
      object.body.destroy();
    }
  });
  object.body.pipe(res);
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;

  constructor(@Inject(STORAGE_CONFIG) private readonly config: StorageConfig) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: false,
    });
  }

  get maxUploadBytes(): number {
    return this.config.maxUploadBytes;
  }

  async presignUpload(
    key: string,
    contentType: string,
    maxBytes: number,
  ): Promise<string> {
    if (maxBytes <= 0 || maxBytes > this.config.maxUploadBytes) {
      throw new Error(
        `Upload size must be between 1 and ${this.config.maxUploadBytes} bytes`,
      );
    }

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: this.config.presignExpiresSeconds,
      // Browser PUT must send the same Content-Type; sign it so R2 accepts the header.
      signableHeaders: new Set(['content-type']),
    });
  }

  async presignDownload(
    key: string,
    options?: {
      contentType?: string;
      contentDisposition?: string;
    },
  ): Promise<string> {
    if (this.config.publicUrl) {
      const base = this.config.publicUrl.replace(/\/$/, '');
      return `${base}/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ...(options?.contentType
        ? { ResponseContentType: options.contentType }
        : {}),
      ...(options?.contentDisposition
        ? { ResponseContentDisposition: options.contentDisposition }
        : {}),
    });

    return getSignedUrl(this.client, command, {
      expiresIn: this.config.presignExpiresSeconds,
    });
  }

  async getObject(key: string, range?: string): Promise<StorageObject | null> {
    try {
      return await this.fetchObject(key, range);
    } catch (error) {
      if (range && isInvalidRange(error)) {
        return this.fetchObject(key);
      }
      throw error;
    }
  }

  private async fetchObject(
    key: string,
    range?: string,
  ): Promise<StorageObject | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          ...(range ? { Range: range } : {}),
        }),
      );

      if (!result.Body) {
        return null;
      }

      return {
        body: toNodeReadable(result.Body),
        contentType: result.ContentType ?? 'application/octet-stream',
        contentLength: result.ContentLength,
        contentRange: result.ContentRange,
        etag: result.ETag,
        statusCode: result.ContentRange ? 206 : 200,
      };
    } catch (error) {
      if (isMissingObject(error)) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  async head(
    key: string,
  ): Promise<{ size: number; contentType: string } | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );

      return {
        size: result.ContentLength ?? 0,
        contentType: result.ContentType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (error instanceof NotFound || isMissingObject(error)) {
        return null;
      }
      throw error;
    }
  }
}
