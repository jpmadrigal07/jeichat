import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { attachments } from '../database/schema';
import {
  StorageService,
  type StorageObject,
} from '../storage/storage.service';
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

  async streamFile(
    userId: string,
    attachmentId: string,
    options: { download: boolean; range?: string },
  ): Promise<{ object: StorageObject; contentDisposition: string }> {
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

    const range =
      typeof options.range === 'string' && /^bytes=/i.test(options.range)
        ? options.range
        : undefined;

    const object = await this.storage.getObject(row.storageKey, range);
    if (!object) {
      throw new NotFoundException();
    }

    const filename = sanitizeContentDispositionFilename(row.filename);
    const forceDownload =
      options.download || shouldForceDownloadDisposition(row.contentType);
    const contentDisposition = forceDownload
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    return { object, contentDisposition };
  }
}
