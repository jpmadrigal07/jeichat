import { BadRequestException } from '@nestjs/common';

export class PresignUploadDto {
  channelId!: string;
  filename!: string;
  contentType!: string;
  sizeBytes!: number;
}

export function validatePresignUploadDto(body: unknown): PresignUploadDto {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('Invalid request body');
  }

  const { channelId, filename, contentType, sizeBytes } = body as Record<
    string,
    unknown
  >;

  if (typeof channelId !== 'string' || channelId.trim().length === 0) {
    throw new BadRequestException('channelId is required');
  }

  if (typeof filename !== 'string' || filename.trim().length === 0) {
    throw new BadRequestException('filename is required');
  }

  if (filename.length > 255) {
    throw new BadRequestException('filename must be at most 255 characters');
  }

  if (typeof contentType !== 'string' || contentType.trim().length === 0) {
    throw new BadRequestException('contentType is required');
  }

  if (typeof sizeBytes !== 'number' || !Number.isInteger(sizeBytes)) {
    throw new BadRequestException('sizeBytes must be an integer');
  }

  if (sizeBytes < 1) {
    throw new BadRequestException('sizeBytes must be at least 1');
  }

  return {
    channelId: channelId.trim(),
    filename: filename.trim(),
    contentType: contentType.trim(),
    sizeBytes,
  };
}
