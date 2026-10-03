import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import type { InboxNotification, InboxNotificationType } from './inbox.types';
import { BotsService } from '../bots/bots.service';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { mentionedUserIds, mentionsAll } from './mentions';

const parentChannels = alias(channels, 'parent_channels');
const actorUser = alias(user, 'actor_user');

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
    private readonly chatGateway: ChatGateway,
    private readonly botsService: BotsService,
    private readonly notificationSettings: NotificationSettingsService,
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const channelIds = await this.listViewableChannelIds(workspaceId, userId);
    if (channelIds.length === 0) return { items: [], unreadCount: 0 };

    const rows = await this.drizzle.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          inArray(notifications.channelId, channelIds),
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(50);

    const items = await this.loadByIds(rows.map((row) => row.id));
    const unreadCount = await this.countUnread(workspaceId, userId, channelIds);
    return { items, unreadCount };
  }

  async unreadCount(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);
    const channelIds = await this.listViewableChannelIds(workspaceId, userId);
    return {
      unreadCount: await this.countUnread(workspaceId, userId, channelIds),
    };
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

  /** Users tagged by name, plus the whole channel audience for `@all`. */
  async resolveMentionedUserIds(input: {
    workspaceId: string;
    channelId: string;
    actorId: string;
    content: string;
  }): Promise<string[]> {
    if (!input.content.trim()) return [];

    const members = await this.drizzle.db
      .select({
        userId: workspaceMembers.userId,
        name: user.name,
        email: user.email,
      })
      .from(workspaceMembers)
      .innerJoin(user, eq(workspaceMembers.userId, user.id))
      .where(eq(workspaceMembers.workspaceId, input.workspaceId));

    // Workspace membership only says who can be matched by name; a tag must
    // not notify someone who can't open the channel (private channels, DMs).
    const tagged = mentionedUserIds(input.content, members, input.actorId);
    const ids =
      await this.workspacePermissionsService.filterUsersWhoCanViewChannel(
        input.workspaceId,
        input.channelId,
        tagged,
      );
    if (ids.length < tagged.length) {
      const skipped = tagged.filter((id) => !ids.includes(id));
      this.logger.log(
        `Skipped ${skipped.length} mention(s) in channel ${input.channelId}: user(s) cannot view it (${skipped.join(', ')})`,
      );
    }
    if (!mentionsAll(input.content)) return ids;

    const audience =
      await this.workspacePermissionsService.listChannelAudienceUserIds(
        input.channelId,
      );
    return [...new Set([...ids, ...audience])].filter(
      (id) => id !== input.actorId,
    );
  }

  async notifyMentions(input: {
    workspaceId: string;
    channelId: string;
    messageId: string;
    actorId: string;
    content: string;
  }) {
    await this.insertMentionNotifications({
      workspaceId: input.workspaceId,
      channelId: input.channelId,
      messageId: input.messageId,
      actorId: input.actorId,
      recipientIds: await this.botsService.excludeBots(
        await this.resolveMentionedUserIds(input),
      ),
    });
  }

  /** Inbox mentions for ticket descriptions (no message row). Only newly tagged users. */
  async notifyNewMentionsFromContentChange(input: {
    workspaceId: string;
    channelId: string;
    actorId: string;
    previousContent: string;
    nextContent: string;
  }) {
    const base = {
      workspaceId: input.workspaceId,
      channelId: input.channelId,
      actorId: input.actorId,
    };
    const [previousIds, nextIds] = await Promise.all([
      this.resolveMentionedUserIds({
        ...base,
        content: input.previousContent,
      }),
      this.resolveMentionedUserIds({
        ...base,
        content: input.nextContent,
      }),
    ]);
    const previous = new Set(previousIds);
    const added = nextIds.filter((id) => !previous.has(id));
    if (added.length === 0) return;

    await this.insertMentionNotifications({
      ...base,
      messageId: null,
      recipientIds: await this.botsService.excludeBots(added),
    });
  }

  private async insertMentionNotifications(input: {
    workspaceId: string;
    channelId: string;
    messageId: string | null;
    actorId: string;
    recipientIds: string[];
  }) {
    if (input.recipientIds.length === 0) return;

    // A muted channel stays silent, even for direct mentions and `@all`.
    const levels = await this.notificationSettings.listLevels(
      input.channelId,
      input.recipientIds,
    );
    const userIds = input.recipientIds.filter((id) => levels.get(id) !== 'muted');
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
    if (await this.botsService.isBotUser(input.assigneeId)) return;

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

  async notifyWatched(input: {
    workspaceId: string;
    channelId: string;
    actorId: string;
    watcherIds: string[];
  }) {
    const recipientIds = await this.botsService.excludeBots(
      [...new Set(input.watcherIds)].filter((id) => id !== input.actorId),
    );
    if (recipientIds.length === 0) return;

    const members = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          inArray(workspaceMembers.userId, recipientIds),
        ),
      );
    if (members.length === 0) return;

    const now = new Date();
    const rows = members.map((member) => ({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      userId: member.userId,
      actorId: input.actorId,
      type: 'watched' satisfies InboxNotificationType,
      channelId: input.channelId,
      messageId: null,
      createdAt: now,
    }));

    const inserted = await this.drizzle.db
      .insert(notifications)
      .values(rows)
      .returning({ id: notifications.id, userId: notifications.userId });

    await this.emitInserted(inserted);
  }

  async notifyTicketComments(input: {
    workspaceId: string;
    channelId: string;
    messageId: string;
    actorId: string;
    recipientIds: string[];
  }) {
    const recipientIds = await this.botsService.excludeBots(
      [...new Set(input.recipientIds)].filter((id) => id !== input.actorId),
    );
    if (recipientIds.length === 0) return;

    const members = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          inArray(workspaceMembers.userId, recipientIds),
        ),
      );
    if (members.length === 0) return;

    const now = new Date();
    const rows = members.map((member) => ({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      userId: member.userId,
      actorId: input.actorId,
      type: 'comment' satisfies InboxNotificationType,
      channelId: input.channelId,
      messageId: input.messageId,
      createdAt: now,
    }));

    const inserted = await this.drizzle.db
      .insert(notifications)
      .values(rows)
      .returning({ id: notifications.id, userId: notifications.userId });

    await this.emitInserted(inserted);
  }

  async notifyReaction(input: {
    workspaceId: string;
    channelId: string;
    messageId: string;
    actorId: string;
    recipientId: string;
    emoji: string;
  }) {
    if (input.recipientId === input.actorId) return;
    if (await this.botsService.isBotUser(input.recipientId)) return;

    const [member] = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, input.recipientId),
        ),
      );
    if (!member) return;

    const [inserted] = await this.drizzle.db
      .insert(notifications)
      .values({
        id: crypto.randomUUID(),
        workspaceId: input.workspaceId,
        userId: input.recipientId,
        actorId: input.actorId,
        type: 'reaction' satisfies InboxNotificationType,
        channelId: input.channelId,
        messageId: input.messageId,
        emoji: input.emoji,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: notifications.id, userId: notifications.userId });

    if (inserted) await this.emitInserted([inserted]);
  }

  /**
   * Channels the user can still open among those they have notifications
   * for. Anything from a channel they can't see (removed from a private
   * channel, channel made private later, tagged before this check existed)
   * stays hidden.
   */
  private async listViewableChannelIds(workspaceId: string, userId: string) {
    const rows = await this.drizzle.db
      .selectDistinct({ channelId: notifications.channelId })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
        ),
      );

    const viewable =
      await this.workspacePermissionsService.filterViewableChannelIds(
        workspaceId,
        userId,
        rows.map((row) => row.channelId),
      );
    if (viewable.size < rows.length) {
      this.logger.debug(
        `Hiding notifications from ${rows.length - viewable.size} channel(s) user ${userId} cannot view in workspace ${workspaceId}`,
      );
    }
    return [...viewable];
  }

  private async countUnread(
    workspaceId: string,
    userId: string,
    channelIds: string[],
  ) {
    if (channelIds.length === 0) return 0;

    const [row] = await this.drizzle.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.userId, userId),
          inArray(notifications.channelId, channelIds),
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
        emoji: notifications.emoji,
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
          emoji: row.emoji,
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
