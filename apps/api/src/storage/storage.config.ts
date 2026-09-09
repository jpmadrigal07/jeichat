import { Logger } from '@nestjs/common';

const logger = new Logger('StorageConfig');

export type StorageConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
  presignExpiresSeconds: number;
  maxUploadBytes: number;
};

export const STORAGE_CONFIG = Symbol('STORAGE_CONFIG');

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function loadStorageConfig(): StorageConfig {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim() || undefined;

  const missing: string[] = [];
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!bucket) missing.push('R2_BUCKET');

  if (missing.length > 0) {
    const message = `R2 storage is not configured. Set ${missing.join(', ')} in .env (see .env.example). Attachment uploads require Cloudflare R2.`;
    logger.error(message);
    throw new Error(message);
  }

  return {
    accountId: accountId!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucket: bucket!,
    publicUrl,
    presignExpiresSeconds: parsePositiveInt(
      process.env.R2_PRESIGN_EXPIRES_SECONDS,
      600,
    ),
    maxUploadBytes: parsePositiveInt(
      process.env.R2_MAX_UPLOAD_BYTES,
      52_428_800,
    ),
  };
}
