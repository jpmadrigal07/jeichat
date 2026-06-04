import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { attachments } from '../database/schema';
import { StorageService } from '../storage/storage.service';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import {
  buildStorageKey,
  extensionForContentType,
  sanitizeContentDispositionFilename,
  sanitizeFilename,
  shouldForceDownloadDisposition,
} from './attachments.helpers';
import { AttachmentsRateLimitService } from './attachments-rate-limit.service';
import type { PresignUploadDto } from './dto/presign-upload.dto';
import type {
  DownloadUrlResponseDto,
  PresignUploadResponseDto,
} from './dto/presign-upload-response.dto';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly workspacePermissions: WorkspacePermissionsService,
    private readonly rateLimit: AttachmentsRateLimitService,
  ) {}

  async presignUpload(
    userId: string,
    dto: PresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
    await this.rateLimit.assertWithinLimit(userId);

    const channel =
      await this.workspacePermissions.assertChannelPermissionByChannelId(
        dto.channelId,
        userId,
        PERMISSIONS.SEND_MESSAGES,
      );

    const ext = extensionForContentType(dto.contentType);
    if (!ext) {
      throw new BadRequestException('Unsupported file type');
    }

    const maxBytes = this.storage.maxUploadBytes;
    if (dto.sizeBytes <= 0 || dto.sizeBytes > maxBytes) {
      throw new BadRequestException(`File too large (max ${maxBytes} bytes)`);
    }

    const safeFilename = sanitizeFilename(dto.filename);
    const { id, key } = buildStorageKey(channel.workspaceId, channel.id, ext);

    this.logger.log(
      `Presign request userId=${userId} channelId=${channel.id} contentType=${dto.contentType} sizeBytes=${dto.sizeBytes}`,
    );

    await this.drizzle.db.insert(attachments).values({
      id,
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      uploaderId: userId,
      storageKey: key,
      filename: safeFilename,
      contentType: dto.contentType,
      sizeBytes: dto.sizeBytes,
      status: 'pending',
    });

    const uploadUrl = await this.storage.presignUpload(
      key,
      dto.contentType,
      maxBytes,
    );

    return { attachmentId: id, uploadUrl, key };
  }

  async finalize(userId: string, attachmentId: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId));

    if (!row || row.uploaderId !== userId) {
      throw new NotFoundException();
    }

    if (row.status === 'uploaded') {
      return row;
    }

    const head = await this.storage.head(row.storageKey);
    if (!head) {
      this.logger.warn(
        `Finalize failed: object missing attachmentId=${attachmentId} storageKey=${row.storageKey}`,
      );
      throw new BadRequestException('Upload not found in storage');
    }

    const observedType = head.contentType.toLowerCase();
    const declaredType = row.contentType.toLowerCase();
    const contentTypePatch =
      observedType !== declaredType ? { contentType: head.contentType } : {};

    if (head.size !== row.sizeBytes) {
      this.logger.warn(
        `Finalize size mismatch attachmentId=${attachmentId} declared=${row.sizeBytes} actual=${head.size}`,
      );
      await this.drizzle.db
        .update(attachments)
        .set({ sizeBytes: head.size, status: 'uploaded', ...contentTypePatch })
        .where(eq(attachments.id, attachmentId));

      return {
        ...row,
        sizeBytes: head.size,
        status: 'uploaded' as const,
        ...contentTypePatch,
      };
    }

    if (Object.keys(contentTypePatch).length > 0) {
      this.logger.warn(
        `Finalize content-type mismatch attachmentId=${attachmentId} declared=${row.contentType} actual=${head.contentType}`,
      );
    }

    await this.drizzle.db
      .update(attachments)
      .set({ status: 'uploaded', ...contentTypePatch })
      .where(eq(attachments.id, attachmentId));

    return { ...row, status: 'uploaded' as const, ...contentTypePatch };
  }

  async getDownloadUrl(
    userId: string,
    attachmentId: string,
  ): Promise<DownloadUrlResponseDto> {
    const [row] = await this.drizzle.db
      .select()
      .from(attachments)
      .where(eq(attachments.id, attachmentId));

    if (!row) {
      throw new NotFoundException();
    }

    await this.workspacePermissions.assertChannelPermissionByChannelId(
      row.channelId,
      userId,
      PERMISSIONS.VIEW_CHANNEL,
    );

    const forceDownload = shouldForceDownloadDisposition(row.contentType);
    const contentDisposition = forceDownload
      ? `attachment; filename="${sanitizeContentDispositionFilename(row.filename)}"`
      : undefined;

    const url = await this.storage.presignDownload(row.storageKey, {
      contentType: row.contentType,
      contentDisposition,
    });

    return {
      url,
      filename: row.filename,
      contentType: row.contentType,
    };
  }
}
