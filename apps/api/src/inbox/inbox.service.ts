import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DrizzleService } from '../database/drizzle.service';
import {
  channels,
  messages,
  notifications,
  workspaceMembers,
} from '../database/schema';
import { user } from '../database/schema/auth';
import { ChatGateway } from '../gateway/chat.gateway';
import { WorkspacesService } from '../workspaces/workspaces.service';
import type { InboxNotification, InboxNotificationType } from './inbox.types';
import { mentionedUserIds } from './mentions';

const parentChannels = alias(channels, 'parent_channels');
const actorUser = alias(user, 'actor_user');

@Injectable()
export class InboxService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const rows = await this.drizzle.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(50);

    const items = await this.loadByIds(rows.map((row) => row.id));
    const unreadCount = await this.countUnread(workspaceId, userId);
    return { items, unreadCount };
  }

  async unreadCount(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);
    return { unreadCount: await this.countUnread(workspaceId, userId) };
  }

  async markRead(workspaceId: string, notificationId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const [updated] = await this.drizzle.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });

    if (!updated) {
      const [existing] = await this.drizzle.db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.workspaceId, workspaceId),
            eq(notifications.userId, userId),
          ),
        );
      if (!existing) throw new NotFoundException('Notification not found');
    }

    return this.unreadCount(workspaceId, userId);
  }

  async markAllRead(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    await this.drizzle.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      );

    return { unreadCount: 0 };
  }

  async notifyMentions(input: {
    workspaceId: string;
    channelId: string;
    messageId: string;
    actorId: string;
    content: string;
  }) {
    const members = await this.drizzle.db
      .select({
        userId: workspaceMembers.userId,
        name: user.name,
        email: user.email,
      })
      .from(workspaceMembers)
      .innerJoin(user, eq(workspaceMembers.userId, user.id))
      .where(eq(workspaceMembers.workspaceId, input.workspaceId));

    const userIds = mentionedUserIds(input.content, members, input.actorId);
    if (userIds.length === 0) return;

    const now = new Date();
    const rows = userIds.map((recipientId) => ({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      userId: recipientId,
      actorId: input.actorId,
      type: 'mention' satisfies InboxNotificationType,
      channelId: input.channelId,
      messageId: input.messageId,
      createdAt: now,
    }));

    const inserted = await this.drizzle.db
      .insert(notifications)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: notifications.id, userId: notifications.userId });

    await this.emitInserted(
      inserted.map((row) => ({ id: row.id, userId: row.userId })),
    );
  }

  async notifyAssigned(input: {
    workspaceId: string;
    channelId: string;
    actorId: string;
    assigneeId: string;
  }) {
    if (input.assigneeId === input.actorId) return;

    const [member] = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, input.assigneeId),
        ),
      );
    if (!member) return;

    const [inserted] = await this.drizzle.db
      .insert(notifications)
      .values({
        id: crypto.randomUUID(),
        workspaceId: input.workspaceId,
        userId: input.assigneeId,
        actorId: input.actorId,
        type: 'assigned' satisfies InboxNotificationType,
        channelId: input.channelId,
        messageId: null,
        createdAt: new Date(),
      })
      .returning({ id: notifications.id, userId: notifications.userId });

    if (inserted) await this.emitInserted([inserted]);
  }

  private async countUnread(workspaceId: string, userId: string) {
    const [row] = await this.drizzle.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          isNull(notifications.readAt),
        ),
      );
    return Number(row?.value ?? 0);
  }

  private async emitInserted(rows: { id: string; userId: string }[]) {
    if (rows.length === 0) return;
    const items = await this.loadByIds(rows.map((row) => row.id));
    const userById = new Map(rows.map((row) => [row.id, row.userId]));
    for (const item of items) {
      const userId = userById.get(item.id);
      if (userId) this.chatGateway.emitInboxNotification(userId, item);
    }
  }

  private async loadByIds(ids: string[]): Promise<InboxNotification[]> {
    if (ids.length === 0) return [];

    const rows = await this.drizzle.db
      .select({
        id: notifications.id,
        workspaceId: notifications.workspaceId,
        type: notifications.type,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        actor: {
          id: actorUser.id,
          name: actorUser.name,
          image: actorUser.image,
        },
        channel: {
          id: channels.id,
          name: channels.name,
          parentId: channels.parentId,
          ticketNumber: channels.ticketNumber,
          ticketKey: channels.ticketKey,
        },
        parent: {
          id: parentChannels.id,
          name: parentChannels.name,
          ticketKey: parentChannels.ticketKey,
        },
        message: {
          id: messages.id,
          content: messages.content,
        },
      })
      .from(notifications)
      .innerJoin(actorUser, eq(notifications.actorId, actorUser.id))
      .innerJoin(channels, eq(notifications.channelId, channels.id))
      .leftJoin(parentChannels, eq(channels.parentId, parentChannels.id))
      .leftJoin(messages, eq(notifications.messageId, messages.id))
      .where(inArray(notifications.id, ids));

    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      return [
        {
          id: row.id,
          workspaceId: row.workspaceId,
          type: row.type as InboxNotificationType,
          readAt: row.readAt ? row.readAt.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
          actor: {
            id: row.actor.id,
            name: row.actor.name,
            image: row.actor.image,
          },
          channel: {
            id: row.channel.id,
            name: row.channel.name,
            parentId: row.channel.parentId,
            ticketNumber: row.channel.ticketNumber,
            ticketKey: row.channel.ticketKey,
          },
          parent: row.parent?.id
            ? {
                id: row.parent.id,
                name: row.parent.name,
                ticketKey: row.parent.ticketKey,
              }
            : null,
          message: row.message?.id
            ? { id: row.message.id, content: row.message.content }
            : null,
        },
      ];
    });
  }
}
