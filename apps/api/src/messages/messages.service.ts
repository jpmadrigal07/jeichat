import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { attachments, messages } from '../database/schema';
import { user } from '../database/schema/auth';
import { ChatGateway } from '../gateway/chat.gateway';
import { StorageService } from '../storage/storage.service';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';

export type MessageAttachmentPublic = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

@Injectable()
export class MessagesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
    private readonly chatGateway: ChatGateway,
    private readonly storage: StorageService,
  ) {}

  private async verifyChannelAccess(
    channelId: string,
    userId: string,
    permission:
      | typeof PERMISSIONS.VIEW_CHANNEL
      | typeof PERMISSIONS.SEND_MESSAGES,
  ) {
    return this.workspacePermissionsService.assertChannelPermissionByChannelId(
      channelId,
      userId,
      permission,
    );
  }

  private async loadAttachmentsByMessageIds(
    messageIds: string[],
  ): Promise<Map<string, MessageAttachmentPublic[]>> {
    const grouped = new Map<string, MessageAttachmentPublic[]>();
    if (!messageIds.length) return grouped;

    const attachmentRows = await this.drizzle.db
      .select({
        messageId: attachments.messageId,
        id: attachments.id,
        filename: attachments.filename,
        contentType: attachments.contentType,
        sizeBytes: attachments.sizeBytes,
      })
      .from(attachments)
      .where(inArray(attachments.messageId, messageIds));

    for (const row of attachmentRows) {
      if (!row.messageId) continue;
      const list = grouped.get(row.messageId) ?? [];
      list.push({
        id: row.id,
        filename: row.filename,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
      });
      grouped.set(row.messageId, list);
    }

    return grouped;
  }

  private async findOneWithAttachments(messageId: string) {
    const [row] = await this.drizzle.db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        sender: {
          name: user.name,
          image: user.image,
        },
      })
      .from(messages)
      .leftJoin(user, eq(messages.senderId, user.id))
      .where(eq(messages.id, messageId));

    if (!row) throw new NotFoundException('Message not found');

    const grouped = await this.loadAttachmentsByMessageIds([messageId]);
    return { ...row, attachments: grouped.get(messageId) ?? [] };
  }

  async create(
    channelId: string,
    senderId: string,
    content: string,
    attachmentIds: string[] = [],
  ) {
    await this.verifyChannelAccess(
      channelId,
      senderId,
      PERMISSIONS.SEND_MESSAGES,
    );

    if (!content.trim() && attachmentIds.length === 0) {
      throw new BadRequestException('Empty message');
    }
    if (attachmentIds.length > 10) {
      throw new BadRequestException('Maximum 10 attachments per message');
    }

    const messageId = crypto.randomUUID();
    const now = new Date();

    const rows = attachmentIds.length
      ? await this.drizzle.db
          .select()
          .from(attachments)
          .where(
            and(
              inArray(attachments.id, attachmentIds),
              eq(attachments.uploaderId, senderId),
              eq(attachments.channelId, channelId),
            ),
          )
      : [];

    if (rows.length !== attachmentIds.length) {
      throw new BadRequestException('Invalid attachment reference');
    }

    for (const row of rows) {
      if (row.messageId) {
        throw new BadRequestException('Invalid attachment reference');
      }
      if (row.status === 'uploaded') continue;
      const head = await this.storage.head(row.storageKey);
      if (!head) {
        throw new BadRequestException(`Attachment ${row.id} not uploaded`);
      }
    }

    await this.drizzle.db.transaction(async (tx) => {
      await tx.insert(messages).values({
        id: messageId,
        channelId,
        senderId,
        content,
        createdAt: now,
        updatedAt: now,
      });
      if (rows.length) {
        await tx
          .update(attachments)
          .set({ messageId, status: 'uploaded' })
          .where(inArray(attachments.id, rows.map((r) => r.id)));
      }
    });

    const message = await this.findOneWithAttachments(messageId);
    this.chatGateway.emitNewMessage(channelId, message);
    return message;
  }

  async findAll(
    channelId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ) {
    await this.verifyChannelAccess(channelId, userId, PERMISSIONS.VIEW_CHANNEL);

    const fetchLimit = Math.min(Math.max(limit, 1), 100);

    const conditions = [eq(messages.channelId, channelId)];

    if (cursor) {
      const separatorIndex = cursor.lastIndexOf('_');
      if (separatorIndex !== -1) {
        const cursorDate = new Date(cursor.slice(0, separatorIndex));
        const cursorId = cursor.slice(separatorIndex + 1);

        conditions.push(
          or(
            lt(messages.createdAt, cursorDate),
            and(eq(messages.createdAt, cursorDate), lt(messages.id, cursorId)),
          )!,
        );
      }
    }

    const rows = await this.drizzle.db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        sender: {
          name: user.name,
          image: user.image,
        },
      })
      .from(messages)
      .leftJoin(user, eq(messages.senderId, user.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(fetchLimit + 1);

    const hasMore = rows.length > fetchLimit;
    const data = hasMore ? rows.slice(0, fetchLimit) : rows;
    const last = data[data.length - 1];
    const nextCursor =
      hasMore && last ? `${last.createdAt.toISOString()}_${last.id}` : null;

    const grouped = await this.loadAttachmentsByMessageIds(
      data.map((m) => m.id),
    );
    const enriched = data.map((m) => ({
      ...m,
      attachments: grouped.get(m.id) ?? [],
    }));

    return { data: enriched, nextCursor };
  }

  async update(channelId: string, id: string, userId: string, content: string) {
    await this.verifyChannelAccess(channelId, userId, PERMISSIONS.VIEW_CHANNEL);

    const [existing] = await this.drizzle.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.channelId, channelId)));

    if (!existing) throw new NotFoundException('Message not found');

    if (existing.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    await this.drizzle.db
      .update(messages)
      .set({ content, updatedAt: new Date() })
      .where(eq(messages.id, id));

    const result = await this.findOneWithAttachments(id);
    this.chatGateway.emitMessageUpdated(channelId, result);
    return result;
  }

  async remove(channelId: string, id: string, userId: string) {
    await this.verifyChannelAccess(channelId, userId, PERMISSIONS.VIEW_CHANNEL);

    const [existing] = await this.drizzle.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.channelId, channelId)));

    if (!existing) throw new NotFoundException('Message not found');

    if (existing.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    const toDelete = await this.drizzle.db
      .select({ storageKey: attachments.storageKey })
      .from(attachments)
      .where(eq(attachments.messageId, id));

    await this.drizzle.db.delete(messages).where(eq(messages.id, id));

    void Promise.all(
      toDelete.map((a) =>
        this.storage.delete(a.storageKey).catch(() => {}),
      ),
    );

    this.chatGateway.emitMessageDeleted(channelId, id);
  }
}
