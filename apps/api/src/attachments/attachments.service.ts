import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { attachments } from '../database/schema';
import { STORAGE_CONFIG, type StorageConfig } from '../storage/storage.config';
import { StorageService } from '../storage/storage.service';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import {
  buildStorageKey,
  extensionForContentType,
} from './attachments.helpers';
import type { PresignUploadDto } from './dto/presign-upload.dto';
import type {
  DownloadUrlResponseDto,
  PresignUploadResponseDto,
} from './dto/presign-upload-response.dto';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
    private readonly workspacePermissions: WorkspacePermissionsService,
    @Inject(STORAGE_CONFIG) private readonly storageConfig: StorageConfig,
  ) {}

  async presignUpload(
    userId: string,
    dto: PresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
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

    const maxBytes = this.storageConfig.maxUploadBytes;
    if (dto.sizeBytes <= 0 || dto.sizeBytes > maxBytes) {
      throw new BadRequestException(`File too large (max ${maxBytes} bytes)`);
    }

    const { id, key } = buildStorageKey(
      channel.workspaceId,
      dto.channelId,
      ext,
    );

    await this.drizzle.db.insert(attachments).values({
      id,
      workspaceId: channel.workspaceId,
      channelId: dto.channelId,
      uploaderId: userId,
      storageKey: key,
      filename: dto.filename.slice(0, 255),
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
      throw new BadRequestException('Upload not found in storage');
    }

    if (head.size !== row.sizeBytes) {
      await this.drizzle.db
        .update(attachments)
        .set({ sizeBytes: head.size, status: 'uploaded' })
        .where(eq(attachments.id, attachmentId));

      return { ...row, sizeBytes: head.size, status: 'uploaded' as const };
    }

    await this.drizzle.db
      .update(attachments)
      .set({ status: 'uploaded' })
      .where(eq(attachments.id, attachmentId));

    return { ...row, status: 'uploaded' as const };
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

    const url = await this.storage.presignDownload(row.storageKey);

    return {
      url,
      filename: row.filename,
      contentType: row.contentType,
    };
  }
}
