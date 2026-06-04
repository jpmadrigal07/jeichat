import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_CONFIG, type StorageConfig } from './storage.config';

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
    });
  }

  async presignDownload(key: string): Promise<string> {
    if (this.config.publicUrl) {
      const base = this.config.publicUrl.replace(/\/$/, '');
      return `${base}/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: this.config.presignExpiresSeconds,
    });
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
      if (error instanceof NotFound) {
        return null;
      }
      throw error;
    }
  }
}
