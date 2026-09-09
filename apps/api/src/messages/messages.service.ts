import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, inArray, lt, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DrizzleService } from '../database/drizzle.service';
import { attachments, messages, messageReactions, pinnedMessages } from '../database/schema';
import { user } from '../database/schema/auth';
import { ChatGateway } from '../gateway/chat.gateway';
import { InboxService } from '../inbox/inbox.service';
import { StorageService } from '../storage/storage.service';
import {
  ATTACHMENT_PURPOSE,
  attachmentKindLimitMessage,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from '../attachments/attachments.helpers';
import {
  normalizeReactionEmoji,
  type MessageReactionSummary,
  type MessageReactionsPayload,
} from './message-reactions';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';

export type MessageAttachmentPublic = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export const MAX_PINNED_MESSAGES = 50;

const pinnedByUser = alias(user, 'pinned_by_user');
const reactionUser = alias(user, 'reaction_user');

@Injectable()
export class MessagesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
    private readonly chatGateway: ChatGateway,
    private readonly storage: StorageService,
    private readonly inboxService: InboxService,
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

  private async loadReactionsByMessageIds(
    messageIds: string[],
    viewerUserId: string,
  ): Promise<Map<string, MessageReactionSummary[]>> {
    const grouped = new Map<string, MessageReactionSummary[]>();
    if (!messageIds.length) return grouped;

    const rows = await this.drizzle.db
      .select({
        messageId: messageReactions.messageId,
        emoji: messageReactions.emoji,
        userId: messageReactions.userId,
        userName: reactionUser.name,
        createdAt: messageReactions.createdAt,
      })
      .from(messageReactions)
      .leftJoin(reactionUser, eq(messageReactions.userId, reactionUser.id))
      .where(inArray(messageReactions.messageId, messageIds))
      .orderBy(messageReactions.createdAt);

    const byMessage = new Map<
      string,
      Map<string, { id: string; name: string }[]>
    >();

    for (const row of rows) {
      const emojiMap =
        byMessage.get(row.messageId) ??
        new Map<string, { id: string; name: string }[]>();
      const users = emojiMap.get(row.emoji) ?? [];
      users.push({
        id: row.userId,
        name: row.userName ?? 'Unknown',
      });
      emojiMap.set(row.emoji, users);
      byMessage.set(row.messageId, emojiMap);
    }

    for (const messageId of messageIds) {
      const emojiMap = byMessage.get(messageId);
      if (!emojiMap) {
        grouped.set(messageId, []);
        continue;
      }

      const summaries = [...emojiMap.entries()].map(([emoji, users]) => ({
        emoji,
        count: users.length,
        reactedByMe: users.some((entry) => entry.id === viewerUserId),
        users,
      }));

      grouped.set(messageId, summaries);
    }

    return grouped;
  }

  private async findOneWithAttachments(messageId: string, viewerUserId?: string) {
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
    const reactions = await this.loadReactionsByMessageIds(
      [messageId],
      viewerUserId ?? row.senderId,
    );
    return {
      ...row,
      attachments: grouped.get(messageId) ?? [],
      reactions: reactions.get(messageId) ?? [],
    };
  }

  async create(
    channelId: string,
    senderId: string,
    content: string,
    attachmentIds: string[] = [],
  ) {
    const channel = await this.verifyChannelAccess(
      channelId,
      senderId,
      PERMISSIONS.SEND_MESSAGES,
    );

    if (!content.trim() && attachmentIds.length === 0) {
      throw new BadRequestException('Empty message');
    }
    if (attachmentIds.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new BadRequestException(
        `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message`,
      );
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
              eq(attachments.purpose, ATTACHMENT_PURPOSE.MESSAGE),
            ),
          )
      : [];

    if (rows.length !== attachmentIds.length) {
      throw new BadRequestException('Invalid attachment reference');
    }

    const kindError = attachmentKindLimitMessage(rows, 'message');
    if (kindError) {
      throw new BadRequestException(kindError);
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

    const message = await this.findOneWithAttachments(messageId, senderId);
    this.chatGateway.emitNewMessage(channelId, message);
    if (content.trim()) {
      await this.inboxService.notifyMentions({
        workspaceId: channel.workspaceId,
        channelId,
        messageId,
        actorId: senderId,
        content,
      });
    }
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
    const reactionsGrouped = await this.loadReactionsByMessageIds(
      data.map((m) => m.id),
      userId,
    );
    const enriched = data.map((m) => ({
      ...m,
      attachments: grouped.get(m.id) ?? [],
      reactions: reactionsGrouped.get(m.id) ?? [],
    }));

    return { data: enriched, nextCursor };
  }

  async update(channelId: string, id: string, userId: string, content: string) {
    const channel = await this.verifyChannelAccess(
      channelId,
      userId,
      PERMISSIONS.VIEW_CHANNEL,
    );

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

    const result = await this.findOneWithAttachments(id, userId);
    this.chatGateway.emitMessageUpdated(channelId, result);
    if (content.trim()) {
      await this.inboxService.notifyMentions({
        workspaceId: channel.workspaceId,
        channelId,
        messageId: id,
        actorId: userId,
        content,
      });
    }
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

  async toggleReaction(
    channelId: string,
    messageId: string,
    userId: string,
    rawEmoji: string,
  ): Promise<MessageReactionsPayload> {
    const channel = await this.verifyChannelAccess(
      channelId,
      userId,
      PERMISSIONS.VIEW_CHANNEL,
    );

    const emoji = normalizeReactionEmoji(rawEmoji);

    const [existingMessage] = await this.drizzle.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.channelId, channelId)));

    if (!existingMessage) throw new NotFoundException('Message not found');

    const [existingReaction] = await this.drizzle.db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, userId),
          eq(messageReactions.emoji, emoji),
        ),
      );

    if (existingReaction) {
      await this.drizzle.db
        .delete(messageReactions)
        .where(eq(messageReactions.id, existingReaction.id));
    } else {
      await this.drizzle.db.insert(messageReactions).values({
        id: crypto.randomUUID(),
        messageId,
        userId,
        emoji,
        createdAt: new Date(),
      });

      if (existingMessage.senderId !== userId) {
        await this.inboxService.notifyReaction({
          workspaceId: channel.workspaceId,
          channelId,
          messageId,
          actorId: userId,
          recipientId: existingMessage.senderId,
          emoji,
        });
      }
    }

    const reactionsGrouped = await this.loadReactionsByMessageIds(
      [messageId],
      userId,
    );
    const payload: MessageReactionsPayload = {
      messageId,
      channelId,
      reactions: reactionsGrouped.get(messageId) ?? [],
    };

    this.chatGateway.emitMessageReactionsUpdated(channelId, payload);
    return payload;
  }

  async listPins(channelId: string, userId: string) {
    const channel = await this.verifyChannelAccess(
      channelId,
      userId,
      PERMISSIONS.VIEW_CHANNEL,
    );

    const canManageMessages =
      await this.workspacePermissionsService.hasChannelPermission(
        channel.workspaceId,
        channel.parentId ?? channel.id,
        userId,
        PERMISSIONS.MANAGE_MESSAGES,
      );

    return {
      canManageMessages,
      data: await this.listPinsForChannel(channelId, userId),
    };
  }

  async pin(channelId: string, messageId: string, userId: string) {
    await this.workspacePermissionsService.assertChannelPermissionByChannelId(
      channelId,
      userId,
      PERMISSIONS.MANAGE_MESSAGES,
    );

    const [existingMessage] = await this.drizzle.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.channelId, channelId)));

    if (!existingMessage) throw new NotFoundException('Message not found');

    const [alreadyPinned] = await this.drizzle.db
      .select()
      .from(pinnedMessages)
      .where(
        and(
          eq(pinnedMessages.channelId, channelId),
          eq(pinnedMessages.messageId, messageId),
        ),
      );

    if (alreadyPinned) {
      return this.findOnePin(channelId, messageId, userId);
    }

    const [countRow] = await this.drizzle.db
      .select({ value: count() })
      .from(pinnedMessages)
      .where(eq(pinnedMessages.channelId, channelId));

    if ((countRow?.value ?? 0) >= MAX_PINNED_MESSAGES) {
      throw new BadRequestException(
        `This channel already has ${MAX_PINNED_MESSAGES} pinned messages`,
      );
    }

    await this.drizzle.db.insert(pinnedMessages).values({
      id: crypto.randomUUID(),
      channelId,
      messageId,
      pinnedBy: userId,
      pinnedAt: new Date(),
    });

    const pin = await this.findOnePin(channelId, messageId, userId);
    this.chatGateway.emitMessagePinned(channelId, pin);
    return pin;
  }

  async unpin(channelId: string, messageId: string, userId: string) {
    await this.workspacePermissionsService.assertChannelPermissionByChannelId(
      channelId,
      userId,
      PERMISSIONS.MANAGE_MESSAGES,
    );

    const [existing] = await this.drizzle.db
      .select()
      .from(pinnedMessages)
      .where(
        and(
          eq(pinnedMessages.channelId, channelId),
          eq(pinnedMessages.messageId, messageId),
        ),
      );

    if (!existing) throw new NotFoundException('Pinned message not found');

    await this.drizzle.db
      .delete(pinnedMessages)
      .where(eq(pinnedMessages.id, existing.id));

    this.chatGateway.emitMessageUnpinned(channelId, messageId);
  }

  private async findOnePin(channelId: string, messageId: string, userId: string) {
    const listed = await this.listPinsForChannel(channelId, userId);
    const pin = listed.find((row) => row.messageId === messageId);
    if (!pin) throw new NotFoundException('Pinned message not found');
    return pin;
  }

  private async listPinsForChannel(channelId: string, viewerUserId: string) {
    const rows = await this.drizzle.db
      .select({
        id: pinnedMessages.id,
        channelId: pinnedMessages.channelId,
        messageId: pinnedMessages.messageId,
        pinnedBy: pinnedMessages.pinnedBy,
        pinnedAt: pinnedMessages.pinnedAt,
        pinnedByName: pinnedByUser.name,
        pinnedByImage: pinnedByUser.image,
        messageIdValue: messages.id,
        messageChannelId: messages.channelId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        senderName: user.name,
        senderImage: user.image,
      })
      .from(pinnedMessages)
      .innerJoin(messages, eq(pinnedMessages.messageId, messages.id))
      .leftJoin(user, eq(messages.senderId, user.id))
      .leftJoin(pinnedByUser, eq(pinnedMessages.pinnedBy, pinnedByUser.id))
      .where(eq(pinnedMessages.channelId, channelId))
      .orderBy(desc(pinnedMessages.pinnedAt));

    const grouped = await this.loadAttachmentsByMessageIds(
      rows.map((row) => row.messageId),
    );
    const reactionsGrouped = await this.loadReactionsByMessageIds(
      rows.map((row) => row.messageId),
      viewerUserId,
    );

    return rows.map((row) => ({
      id: row.id,
      channelId: row.channelId,
      messageId: row.messageId,
      pinnedBy: row.pinnedBy,
      pinnedAt: row.pinnedAt,
      pinnedByUser: row.pinnedByName
        ? { name: row.pinnedByName, image: row.pinnedByImage }
        : null,
      message: {
        id: row.messageIdValue,
        channelId: row.messageChannelId,
        senderId: row.senderId,
        content: row.content,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        sender: row.senderName
          ? { name: row.senderName, image: row.senderImage }
          : null,
        attachments: grouped.get(row.messageId) ?? [],
        reactions: reactionsGrouped.get(row.messageId) ?? [],
      },
    }));
  }
}
