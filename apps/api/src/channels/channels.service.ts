import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, gt, inArray, isNull, max, ne, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DrizzleService } from '../database/drizzle.service';
import {
  attachments,
  channelEvents,
  channelLabels,
  channelMembers,
  channelReads,
  channelWatchers,
  channels,
  labels,
  messages,
  workspaceMembers,
} from '../database/schema';
import { user } from '../database/schema/auth';
import { ChatGateway } from '../gateway/chat.gateway';
import { InboxService } from '../inbox/inbox.service';
import { StorageService } from '../storage/storage.service';
import {
  ATTACHMENT_PURPOSE,
  attachmentKindLimitMessage,
  MAX_THREAD_ATTACHMENTS,
} from '../attachments/attachments.helpers';
import {
  DEFAULT_TICKET_PRIORITY,
  DEFAULT_TICKET_STATUS,
  parseChannelKey,
  parseLabelIds,
  parseTicketDescription,
  parseTicketDueAt,
  parseTicketPriority,
  parseTicketStatus,
  parseWatcherIds,
  suggestChannelKey,
  ticketDisplayId,
  ticketPrefixOf,
} from './ticket-fields';
import {
  isParentChannelEventType,
  PARENT_CHANNEL_EVENT_TYPES,
  type TicketEvent,
  type TicketEventLabel,
  type TicketEventType,
  type TicketEventWatcher,
} from './ticket-events';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

const parentChannels = alias(channels, 'parent_channels');

const CHANNEL_TYPE = {
  CHANNEL: 'channel',
  DM: 'dm',
} as const;

type DmPeer = {
  id: string;
  name: string;
  image: string | null;
};

@Injectable()
export class ChannelsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
    private readonly storage: StorageService,
    private readonly chatGateway: ChatGateway,
    private readonly inboxService: InboxService,
  ) {}

  async create(
    workspaceId: string,
    userId: string,
    name: string,
    description: string | null,
    ticketKey?: string | null,
    isPrivate = false,
    memberIds: string[] = [],
  ) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Channel name is required');
    }

    const key =
      ticketKey !== undefined && ticketKey !== null && ticketKey.trim()
        ? parseChannelKey(ticketKey)
        : suggestChannelKey(trimmed);
    const uniqueKey = await this.allocateChannelKey(
      workspaceId,
      key,
      ticketKey !== undefined && ticketKey !== null && ticketKey.trim().length > 0,
    );

    const now = new Date();
    const [channel] = await this.drizzle.db
      .insert(channels)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        name: trimmed,
        description,
        ticketKey: uniqueKey,
        isPrivate,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const invitedIds = isPrivate
      ? [...new Set([userId, ...memberIds])]
      : memberIds;

    await this.addChannelMembers(workspaceId, channel.id, invitedIds, userId);

    return channel;
  }

  async createOrGetDm(
    workspaceId: string,
    userId: string,
    targetUserId: string,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException('Cannot message yourself');
    }

    await this.workspacesService.verifyMembership(workspaceId, userId);

    const [targetMember] = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      );

    if (!targetMember) {
      throw new BadRequestException('User is not a member of this workspace');
    }

    const pairKey = this.buildDmPairKey(userId, targetUserId);

    const [existing] = await this.drizzle.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.workspaceId, workspaceId),
          eq(channels.channelType, CHANNEL_TYPE.DM),
          eq(channels.dmPairKey, pairKey),
        ),
      );

    if (existing) {
      const [withPeers] = await this.withDmPeers([existing], userId);
      const [enriched] = await this.withThreadAttachments([withPeers]);
      return enriched;
    }

    const now = new Date();
    const [channel] = await this.drizzle.db
      .insert(channels)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        name: 'dm',
        channelType: CHANNEL_TYPE.DM,
        dmPairKey: pairKey,
        isPrivate: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.addChannelMembers(
      workspaceId,
      channel.id,
      [userId, targetUserId],
      userId,
    );

    const [withPeers] = await this.withDmPeers([channel], userId);
    const [enriched] = await this.withThreadAttachments([withPeers]);
    return enriched;
  }

  async createThread(
    workspaceId: string,
    parentId: string,
    userId: string,
    name: string,
    description: string | null,
    attachmentIds: string[] = [],
    status?: string,
  ) {
    const parent = await this.findOne(workspaceId, parentId, userId);
    if (parent.parentId) {
      throw new BadRequestException('Cannot create a ticket inside a ticket');
    }
    if (parent.channelType === CHANNEL_TYPE.DM) {
      throw new BadRequestException(
        'Tickets are not available in direct messages',
      );
    }

    await this.workspacePermissionsService.assertChannelPermission(
      workspaceId,
      parentId,
      userId,
      PERMISSIONS.SEND_MESSAGES,
    );

    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Ticket title is required');
    }

    const trimmedDescription = parseTicketDescription(description);

    if (attachmentIds.length > MAX_THREAD_ATTACHMENTS) {
      throw new BadRequestException(
        `Maximum ${MAX_THREAD_ATTACHMENTS} attachments per ticket`,
      );
    }

    const [duplicate] = await this.drizzle.db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.parentId, parentId), eq(channels.name, trimmed)));

    if (duplicate) {
      throw new BadRequestException(
        'A ticket with this title already exists in this channel',
      );
    }

    const attachmentRows = await this.loadClaimableThreadAttachments(
      parentId,
      userId,
      attachmentIds,
    );
    const kindError = attachmentKindLimitMessage(attachmentRows, 'ticket');
    if (kindError) {
      throw new BadRequestException(kindError);
    }

    const [lastTicket] = await this.drizzle.db
      .select({ last: max(channels.ticketNumber) })
      .from(channels)
      .where(eq(channels.parentId, parentId));

    const now = new Date();
    const threadId = crypto.randomUUID();
    const [thread] = await this.drizzle.db
      .insert(channels)
      .values({
        id: threadId,
        workspaceId,
        parentId,
        name: trimmed,
        description: trimmedDescription,
        status:
          status === undefined
            ? DEFAULT_TICKET_STATUS
            : parseTicketStatus(status),
        priority: DEFAULT_TICKET_PRIORITY,
        ticketNumber: (lastTicket?.last ?? 0) + 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!thread) throw new NotFoundException('Channel not found');

    if (attachmentRows.length) {
      await this.drizzle.db
        .update(attachments)
        .set({
          channelId: threadId,
          purpose: ATTACHMENT_PURPOSE.THREAD,
          status: 'uploaded',
        })
        .where(
          inArray(
            attachments.id,
            attachmentRows.map((row) => row.id),
          ),
        );
    }

    const createdEventId = crypto.randomUUID();
    await this.drizzle.db.insert(channelEvents).values({
      id: createdEventId,
      channelId: threadId,
      actorId: userId,
      type: 'ticket_created',
      fromValue: null,
      toValue: {
        name: trimmed,
        ticketNumber: thread?.ticketNumber ?? null,
      },
      createdAt: now,
    });
    const published = await this.loadTicketEventsByIds([createdEventId]);
    this.publishTicketEvents(threadId, parentId, published);

    const [enriched] = await this.withThreadAttachments([thread]);
    return enriched;
  }

  async listThreads(workspaceId: string, parentId: string, userId: string) {
    const parent = await this.findOne(workspaceId, parentId, userId);
    if (parent.parentId) {
      throw new BadRequestException('Cannot list tickets of a ticket');
    }
    if (parent.channelType === CHANNEL_TYPE.DM) {
      return [];
    }

    const threads = await this.drizzle.db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.workspaceId, workspaceId),
          eq(channels.parentId, parentId),
        ),
      );

    if (threads.length === 0) return [];

    const stats = await this.drizzle.db
      .select({
        channelId: messages.channelId,
        messageCount: count(messages.id),
        lastMessageAt: max(messages.createdAt),
      })
      .from(messages)
      .where(
        inArray(
          messages.channelId,
          threads.map((thread) => thread.id),
        ),
      )
      .groupBy(messages.channelId);

    const statsById = new Map(
      stats.map((row) => [
        row.channelId,
        {
          messageCount: Number(row.messageCount),
          lastMessageAt: row.lastMessageAt,
        },
      ]),
    );

    const sorted = threads
      .map((thread) => {
        const row = statsById.get(thread.id);
        return {
          ...thread,
          messageCount: row?.messageCount ?? 0,
          lastMessageAt: row?.lastMessageAt ?? null,
        };
      })
      .toSorted((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.createdAt).getTime();
        const bTime = new Date(b.lastMessageAt ?? b.createdAt).getTime();
        return bTime - aTime;
      });

    return this.withThreadAttachments(sorted);
  }

  async listEvents(workspaceId: string, id: string, userId: string) {
    const channel = await this.findOne(workspaceId, id, userId);
    if (channel.parentId) {
      const grouped = await this.loadTicketEvents([id]);
      return grouped.get(id) ?? [];
    }

    const children = await this.drizzle.db
      .select({ id: channels.id })
      .from(channels)
      .where(
        and(
          eq(channels.workspaceId, workspaceId),
          eq(channels.parentId, id),
        ),
      );
    const grouped = await this.loadTicketEvents(
      children.map((child) => child.id),
      [...PARENT_CHANNEL_EVENT_TYPES],
    );
    return [...grouped.values()].flat().toSorted((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt < b.createdAt ? -1 : 1;
      }
      return a.id < b.id ? -1 : 1;
    });
  }

  async findAll(workspaceId: string, userId: string) {
    const visible = await this.listViewableChannels(workspaceId, userId);
    const withPeers = await this.withDmPeers(visible, userId);
    return this.withThreadAttachments(withPeers);
  }

  async findOne(workspaceId: string, id: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, id), eq(channels.workspaceId, workspaceId)));

    if (!channel) throw new NotFoundException('Channel not found');

    const canView = await this.workspacePermissionsService.hasChannelPermission(
      workspaceId,
      id,
      userId,
      PERMISSIONS.VIEW_CHANNEL,
    );

    if (!canView) throw new NotFoundException('Channel not found');

    const [withPeers] = await this.withDmPeers([channel], userId);
    const [enriched] = await this.withThreadAttachments([withPeers]);
    return enriched;
  }

  async update(
    workspaceId: string,
    id: string,
    userId: string,
    data: {
      name?: string;
      description?: string | null;
      ticketKey?: string;
      addAttachmentIds?: string[];
      removeAttachmentIds?: string[];
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueAt?: string | null;
      labelIds?: string[];
      watcherIds?: string[];
      isPrivate?: boolean;
    },
  ) {
    const existing = await this.findOne(workspaceId, id, userId);
    const isThread = Boolean(existing.parentId);
    if (!isThread && existing.channelType === CHANNEL_TYPE.DM) {
      throw new BadRequestException('Direct messages cannot be edited');
    }
    const addAttachmentIds = [...new Set(data.addAttachmentIds ?? [])];
    const removeAttachmentIds = [...new Set(data.removeAttachmentIds ?? [])];

    const hasTicketFields =
      data.status !== undefined ||
      data.priority !== undefined ||
      data.assigneeId !== undefined ||
      data.dueAt !== undefined ||
      data.labelIds !== undefined ||
      data.watcherIds !== undefined;

    if (!isThread && (addAttachmentIds.length || removeAttachmentIds.length)) {
      throw new BadRequestException('Only tickets can have attachments');
    }
    if (!isThread && hasTicketFields) {
      throw new BadRequestException(
        'Only tickets have status, priority, assignee, due date, labels, and watchers',
      );
    }
    if (isThread && data.ticketKey !== undefined) {
      throw new BadRequestException('Only channels have a ticket key');
    }
    if (isThread && data.isPrivate !== undefined) {
      throw new BadRequestException(
        'Tickets inherit privacy from their parent channel',
      );
    }

    await this.workspacePermissionsService.assertChannelPermission(
      workspaceId,
      id,
      userId,
      isThread ? PERMISSIONS.SEND_MESSAGES : PERMISSIONS.MANAGE_CHANNEL,
    );

    const patch: {
      name?: string;
      description?: string | null;
      ticketKey?: string;
      isPrivate?: boolean;
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueAt?: Date | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (data.name !== undefined) {
      const trimmed = data.name.trim();
      if (!trimmed) {
        throw new BadRequestException(
          isThread ? 'Ticket title is required' : 'Channel name is required',
        );
      }
      if (trimmed !== existing.name) {
        if (isThread && existing.parentId) {
          const [duplicate] = await this.drizzle.db
            .select({ id: channels.id })
            .from(channels)
            .where(
              and(
                eq(channels.parentId, existing.parentId),
                eq(channels.name, trimmed),
                ne(channels.id, id),
              ),
            );
          if (duplicate) {
            throw new BadRequestException(
              'A ticket with this title already exists in this channel',
            );
          }
        }
        patch.name = trimmed;
      }
    }

    if (data.description !== undefined) {
      patch.description = isThread
        ? parseTicketDescription(data.description)
        : data.description?.trim() || null;
    }

    if (data.ticketKey !== undefined) {
      const nextKey = parseChannelKey(data.ticketKey);
      if (nextKey !== existing.ticketKey) {
        await this.assertChannelKeyAvailable(workspaceId, nextKey, id);
        patch.ticketKey = nextKey;
      }
    }

    if (data.isPrivate !== undefined) {
      patch.isPrivate = data.isPrivate;
      if (data.isPrivate) {
        await this.addChannelMembers(workspaceId, id, [userId], userId);
      }
    }

    if (data.status !== undefined) {
      patch.status = parseTicketStatus(data.status);
    }
    if (data.priority !== undefined) {
      patch.priority = parseTicketPriority(data.priority);
    }
    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null) {
        patch.assigneeId = null;
      } else {
        await this.assertTicketAssignee(workspaceId, data.assigneeId);
        patch.assigneeId = data.assigneeId;
      }
    }
    if (data.dueAt !== undefined) {
      patch.dueAt =
        data.dueAt === null ? null : parseTicketDueAt(data.dueAt);
    }

    const nextLabelIds =
      data.labelIds === undefined ? undefined : parseLabelIds(data.labelIds);
    if (nextLabelIds?.length) {
      const found = await this.drizzle.db
        .select({ id: labels.id })
        .from(labels)
        .where(
          and(
            eq(labels.workspaceId, workspaceId),
            inArray(labels.id, nextLabelIds),
          ),
        );
      if (found.length !== nextLabelIds.length) {
        throw new BadRequestException('Invalid labels');
      }
    }

    const nextWatcherIds =
      data.watcherIds === undefined
        ? undefined
        : parseWatcherIds(data.watcherIds);
    if (nextWatcherIds?.length) {
      await this.assertTicketWatchers(workspaceId, nextWatcherIds);
    }

    const addRows = await this.loadClaimableThreadAttachments(
      id,
      userId,
      addAttachmentIds,
    );

    const eventRows = isThread
      ? await this.buildTicketEvents({
          channelId: id,
          actorId: userId,
          createdAt: patch.updatedAt,
          existing: {
            status: existing.status,
            priority: existing.priority,
            assigneeId: existing.assigneeId,
            dueAt: existing.dueAt,
            labels: existing.labels,
            watchers: existing.watchers ?? [],
          },
          next: {
            status: patch.status,
            priority: patch.priority,
            assigneeId: patch.assigneeId,
            dueAt: patch.dueAt,
            labels:
              nextLabelIds === undefined
                ? undefined
                : await this.loadLabelsByIds(workspaceId, nextLabelIds),
            watchers:
              nextWatcherIds === undefined
                ? undefined
                : await this.loadWatcherBriefs(nextWatcherIds),
          },
        })
      : [];

    let removedKeys: string[] = [];

    await this.drizzle.db.transaction(async (tx) => {
      if (addAttachmentIds.length || removeAttachmentIds.length) {
        const current = await tx
          .select({
            id: attachments.id,
            storageKey: attachments.storageKey,
            contentType: attachments.contentType,
          })
          .from(attachments)
          .where(
            and(
              eq(attachments.channelId, id),
              eq(attachments.purpose, ATTACHMENT_PURPOSE.THREAD),
            ),
          );

        const currentIds = new Set(current.map((row) => row.id));
        for (const removeId of removeAttachmentIds) {
          if (!currentIds.has(removeId)) {
            throw new BadRequestException('Invalid attachment reference');
          }
        }

        const removeSet = new Set(removeAttachmentIds);
        const kept = current.filter((row) => !removeSet.has(row.id));
        const kindError = attachmentKindLimitMessage(
          [...kept, ...addRows],
          'ticket',
        );
        if (kindError) {
          throw new BadRequestException(kindError);
        }

        removedKeys = current
          .filter((row) => removeSet.has(row.id))
          .map((row) => row.storageKey);

        if (removeAttachmentIds.length) {
          await tx
            .delete(attachments)
            .where(inArray(attachments.id, removeAttachmentIds));
        }

        if (addRows.length) {
          await tx
            .update(attachments)
            .set({
              purpose: ATTACHMENT_PURPOSE.THREAD,
              status: 'uploaded',
              channelId: id,
            })
            .where(
              inArray(
                attachments.id,
                addRows.map((row) => row.id),
              ),
            );
        }
      }

      const shouldPatchChannel =
        patch.name !== undefined ||
        patch.ticketKey !== undefined ||
        patch.isPrivate !== undefined ||
        data.description !== undefined ||
        hasTicketFields ||
        addRows.length > 0 ||
        removeAttachmentIds.length > 0;

      if (shouldPatchChannel) {
        await tx.update(channels).set(patch).where(eq(channels.id, id));
      }

      if (nextLabelIds !== undefined) {
        await tx
          .delete(channelLabels)
          .where(eq(channelLabels.channelId, id));
        if (nextLabelIds.length) {
          await tx.insert(channelLabels).values(
            nextLabelIds.map((labelId) => ({
              channelId: id,
              labelId,
            })),
          );
        }
      }

      if (nextWatcherIds !== undefined) {
        await tx
          .delete(channelWatchers)
          .where(eq(channelWatchers.channelId, id));
        if (nextWatcherIds.length) {
          await tx.insert(channelWatchers).values(
            nextWatcherIds.map((userId) => ({
              channelId: id,
              userId,
            })),
          );
        }
      }

      if (eventRows.length) {
        await tx.insert(channelEvents).values(eventRows);
      }
    });

    await Promise.all(
      removedKeys.map((key) => this.storage.delete(key).catch(() => undefined)),
    );

    const [updated] = await this.drizzle.db
      .select()
      .from(channels)
      .where(eq(channels.id, id));

    if (!updated) throw new NotFoundException('Channel not found');

    const [enriched] = await this.withThreadAttachments([updated]);

    if (eventRows.length) {
      const published = await this.loadTicketEventsByIds(
        eventRows.map((row) => row.id),
      );
      this.publishTicketEvents(id, existing.parentId, published);
    }

    if (
      isThread &&
      patch.assigneeId &&
      patch.assigneeId !== existing.assigneeId
    ) {
      await this.inboxService.notifyAssigned({
        workspaceId,
        channelId: id,
        actorId: userId,
        assigneeId: patch.assigneeId,
      });
    }

    if (isThread && nextWatcherIds !== undefined) {
      const previousWatcherIds = new Set(
        (existing.watchers ?? []).map((watcher) => watcher.id),
      );
      await this.inboxService.notifyWatched({
        workspaceId,
        channelId: id,
        actorId: userId,
        watcherIds: nextWatcherIds.filter((watcherId) => !previousWatcherIds.has(watcherId)),
      });
    }

    return enriched;
  }

  async getUnreadCounts(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const workspaceChannels = await this.listViewableChannels(
      workspaceId,
      userId,
    );

    const channelIds = workspaceChannels.map((channel) => channel.id);
    if (channelIds.length === 0) return {};

    const rows = await this.drizzle.db
      .select({
        channelId: messages.channelId,
        unreadCount: count(messages.id),
      })
      .from(messages)
      .leftJoin(
        channelReads,
        and(
          eq(channelReads.channelId, messages.channelId),
          eq(channelReads.userId, userId),
        ),
      )
      .where(
        and(
          inArray(messages.channelId, channelIds),
          ne(messages.senderId, userId),
          or(
            isNull(channelReads.lastReadAt),
            gt(messages.createdAt, channelReads.lastReadAt),
          ),
        ),
      )
      .groupBy(messages.channelId);

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.channelId] = Number(row.unreadCount);
    }

    return result;
  }

  async markAsRead(workspaceId: string, channelId: string, userId: string) {
    await this.findOne(workspaceId, channelId, userId);

    const now = new Date();
    await this.drizzle.db
      .insert(channelReads)
      .values({
        userId,
        channelId,
        lastReadAt: now,
      })
      .onConflictDoUpdate({
        target: [channelReads.userId, channelReads.channelId],
        set: { lastReadAt: now },
      });
  }

  async remove(workspaceId: string, id: string, userId: string) {
    await this.findOne(workspaceId, id, userId);
    await this.workspacePermissionsService.assertChannelPermission(
      workspaceId,
      id,
      userId,
      PERMISSIONS.MANAGE_CHANNEL,
    );

    const [target] = await this.drizzle.db
      .select({ parentId: channels.parentId })
      .from(channels)
      .where(eq(channels.id, id));

    if (!target?.parentId) {
      const topLevel = await this.drizzle.db
        .select({ id: channels.id })
        .from(channels)
        .where(
          and(eq(channels.workspaceId, workspaceId), isNull(channels.parentId)),
        );

      if (topLevel.length <= 1) {
        throw new BadRequestException(
          'Cannot delete the last channel in a workspace',
        );
      }
    }

    await this.drizzle.db.delete(channels).where(eq(channels.id, id));
  }

  private async listViewableChannels(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const allChannels = await this.drizzle.db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId));

    const viewableIds =
      await this.workspacePermissionsService.filterViewableChannelIds(
        workspaceId,
        userId,
        allChannels.map((channel) => channel.id),
      );

    return allChannels.filter((channel) => viewableIds.has(channel.id));
  }

  async listMembers(workspaceId: string, channelId: string, userId: string) {
    const channel = await this.requireTopLevelChannel(
      workspaceId,
      channelId,
      userId,
    );

    const canManage =
      await this.workspacePermissionsService.hasChannelPermission(
        workspaceId,
        channelId,
        userId,
        PERMISSIONS.MANAGE_CHANNEL,
      );

    const rows = await this.drizzle.db
      .select({
        id: channelMembers.id,
        channelId: channelMembers.channelId,
        userId: channelMembers.userId,
        addedBy: channelMembers.addedBy,
        addedAt: channelMembers.addedAt,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(channelMembers)
      .innerJoin(user, eq(channelMembers.userId, user.id))
      .where(eq(channelMembers.channelId, channelId))
      .orderBy(asc(user.name));

    return {
      isPrivate: channel.isPrivate,
      canManage,
      data: rows,
    };
  }

  async addMember(
    workspaceId: string,
    channelId: string,
    actorId: string,
    targetUserId: string,
  ) {
    const channel = await this.requireTopLevelChannel(
      workspaceId,
      channelId,
      actorId,
    );

    await this.workspacePermissionsService.assertChannelPermission(
      workspaceId,
      channel.id,
      actorId,
      PERMISSIONS.MANAGE_CHANNEL,
    );

    await this.addChannelMembers(
      workspaceId,
      channelId,
      [targetUserId],
      actorId,
    );

    const listed = await this.listMembers(workspaceId, channelId, actorId);
    const member = listed.data.find((row) => row.userId === targetUserId);
    if (!member) {
      throw new BadRequestException('User must be a workspace member');
    }
    return member;
  }

  async removeMember(
    workspaceId: string,
    channelId: string,
    actorId: string,
    targetUserId: string,
  ) {
    const channel = await this.requireTopLevelChannel(
      workspaceId,
      channelId,
      actorId,
    );

    await this.workspacePermissionsService.assertChannelPermission(
      workspaceId,
      channel.id,
      actorId,
      PERMISSIONS.MANAGE_CHANNEL,
    );

    const deleted = await this.drizzle.db
      .delete(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          eq(channelMembers.userId, targetUserId),
        ),
      )
      .returning({ id: channelMembers.id });

    if (deleted.length === 0) {
      throw new NotFoundException('Channel member not found');
    }
  }

  private async requireTopLevelChannel(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    const channel = await this.findOne(workspaceId, channelId, userId);
    if (channel.parentId) {
      throw new BadRequestException(
        'Tickets inherit members from their parent channel',
      );
    }
    return channel;
  }

  private async addChannelMembers(
    workspaceId: string,
    channelId: string,
    memberIds: string[],
    addedBy: string,
  ) {
    const uniqueIds = [...new Set(memberIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    const workspaceUsers = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          inArray(workspaceMembers.userId, uniqueIds),
        ),
      );
    const allowed = new Set(workspaceUsers.map((row) => row.userId));

    const existing = await this.drizzle.db
      .select({ userId: channelMembers.userId })
      .from(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          inArray(channelMembers.userId, uniqueIds),
        ),
      );
    const already = new Set(existing.map((row) => row.userId));

    const now = new Date();
    const values = uniqueIds
      .filter((id) => allowed.has(id) && !already.has(id))
      .map((id) => ({
        id: crypto.randomUUID(),
        channelId,
        userId: id,
        addedBy,
        addedAt: now,
      }));

    if (values.length === 0) return;

    await this.drizzle.db.insert(channelMembers).values(values);
  }

  private buildDmPairKey(userId: string, targetUserId: string) {
    return [userId, targetUserId].sort().join(':');
  }

  private async withDmPeers<
    T extends { id: string; channelType: string },
  >(rows: T[], viewerId: string): Promise<Array<T & { dmPeer: DmPeer | null }>> {
    const dmChannelIds = rows
      .filter((row) => row.channelType === CHANNEL_TYPE.DM)
      .map((row) => row.id);

    if (dmChannelIds.length === 0) {
      return rows.map((row) => ({ ...row, dmPeer: null }));
    }

    const peers = await this.drizzle.db
      .select({
        channelId: channelMembers.channelId,
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(channelMembers)
      .innerJoin(user, eq(channelMembers.userId, user.id))
      .where(
        and(
          inArray(channelMembers.channelId, dmChannelIds),
          ne(channelMembers.userId, viewerId),
        ),
      );

    const peerByChannel = new Map(
      peers.map((peer) => [peer.channelId, peer]),
    );

    return rows.map((row) => ({
      ...row,
      dmPeer:
        row.channelType === CHANNEL_TYPE.DM
          ? (peerByChannel.get(row.id) ?? null)
          : null,
    }));
  }

  private async assertTicketAssignee(workspaceId: string, assigneeId: string) {
    const [member] = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, assigneeId),
        ),
      );

    if (!member) {
      throw new BadRequestException('Assignee must be a workspace member');
    }
  }

  private async assertTicketWatchers(workspaceId: string, watcherIds: string[]) {
    const found = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          inArray(workspaceMembers.userId, watcherIds),
        ),
      );

    if (found.length !== watcherIds.length) {
      throw new BadRequestException('Watchers must be workspace members');
    }
  }

  private async withThreadAttachments<
    T extends { id: string; parentId: string | null },
  >(rows: T[]) {
    const threadIds = rows
      .filter((row) => row.parentId)
      .map((row) => row.id);
    const grouped = await this.loadThreadAttachments(threadIds);
    const labeled = await this.loadTicketLabels(
      rows.filter((row) => row.parentId).map((row) => row.id),
    );
    const watched = await this.loadTicketWatchers(
      rows.filter((row) => row.parentId).map((row) => row.id),
    );

    return rows.map((row) => ({
      ...row,
      attachments: grouped.get(row.id) ?? [],
      labels: labeled.get(row.id) ?? [],
      watchers: watched.get(row.id) ?? [],
    }));
  }

  private async loadTicketLabels(channelIds: string[]) {
    const grouped = new Map<
      string,
      { id: string; name: string; color: string }[]
    >();
    if (channelIds.length === 0) return grouped;

    const rows = await this.drizzle.db
      .select({
        channelId: channelLabels.channelId,
        id: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(channelLabels)
      .innerJoin(labels, eq(channelLabels.labelId, labels.id))
      .where(inArray(channelLabels.channelId, channelIds))
      .orderBy(asc(labels.name));

    for (const row of rows) {
      const list = grouped.get(row.channelId) ?? [];
      list.push({ id: row.id, name: row.name, color: row.color });
      grouped.set(row.channelId, list);
    }

    return grouped;
  }

  private async loadTicketWatchers(channelIds: string[]) {
    const grouped = new Map<
      string,
      { id: string; name: string; image: string | null }[]
    >();
    if (channelIds.length === 0) return grouped;

    const rows = await this.drizzle.db
      .select({
        channelId: channelWatchers.channelId,
        id: user.id,
        name: user.name,
        image: user.image,
      })
      .from(channelWatchers)
      .innerJoin(user, eq(channelWatchers.userId, user.id))
      .where(inArray(channelWatchers.channelId, channelIds))
      .orderBy(asc(user.name));

    for (const row of rows) {
      const list = grouped.get(row.channelId) ?? [];
      list.push({ id: row.id, name: row.name, image: row.image });
      grouped.set(row.channelId, list);
    }

    return grouped;
  }

  private async loadThreadAttachments(channelIds: string[]) {
    const grouped = new Map<
      string,
      {
        id: string;
        filename: string;
        contentType: string;
        sizeBytes: number;
      }[]
    >();
    if (channelIds.length === 0) return grouped;

    const rows = await this.drizzle.db
      .select({
        channelId: attachments.channelId,
        id: attachments.id,
        filename: attachments.filename,
        contentType: attachments.contentType,
        sizeBytes: attachments.sizeBytes,
      })
      .from(attachments)
      .where(
        and(
          inArray(attachments.channelId, channelIds),
          eq(attachments.purpose, ATTACHMENT_PURPOSE.THREAD),
          eq(attachments.status, 'uploaded'),
        ),
      )
      .orderBy(asc(attachments.createdAt));

    for (const row of rows) {
      const list = grouped.get(row.channelId) ?? [];
      list.push({
        id: row.id,
        filename: row.filename,
        contentType: row.contentType,
        sizeBytes: row.sizeBytes,
      });
      grouped.set(row.channelId, list);
    }

    return grouped;
  }

  private async allocateChannelKey(
    workspaceId: string,
    key: string,
    explicit: boolean,
    excludeId?: string,
  ) {
    const taken = await this.channelKeyTaken(workspaceId, key, excludeId);
    if (!taken) return key;
    if (explicit) {
      throw new BadRequestException('A channel with this key already exists');
    }

    for (let n = 2; n <= 99; n += 1) {
      const suffix = String(n);
      const candidate = `${key.slice(0, Math.max(2, 5 - suffix.length))}${suffix}`;
      const exists = await this.channelKeyTaken(
        workspaceId,
        candidate,
        excludeId,
      );
      if (!exists) return candidate;
    }

    throw new BadRequestException('Could not generate a unique channel key');
  }

  private async assertChannelKeyAvailable(
    workspaceId: string,
    key: string,
    excludeId: string,
  ) {
    if (await this.channelKeyTaken(workspaceId, key, excludeId)) {
      throw new BadRequestException('A channel with this key already exists');
    }
  }

  private async channelKeyTaken(
    workspaceId: string,
    key: string,
    excludeId?: string,
  ) {
    const [existing] = await this.drizzle.db
      .select({ id: channels.id })
      .from(channels)
      .where(
        excludeId
          ? and(
              eq(channels.workspaceId, workspaceId),
              isNull(channels.parentId),
              eq(channels.ticketKey, key),
              ne(channels.id, excludeId),
            )
          : and(
              eq(channels.workspaceId, workspaceId),
              isNull(channels.parentId),
              eq(channels.ticketKey, key),
            ),
      )
      .limit(1);

    return Boolean(existing);
  }

  private async loadLabelsByIds(workspaceId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.drizzle.db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(labels)
      .where(and(eq(labels.workspaceId, workspaceId), inArray(labels.id, ids)));
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  }

  private async buildTicketEvents(input: {
    channelId: string;
    actorId: string;
    createdAt: Date;
    existing: {
      status: string | null;
      priority: string | null;
      assigneeId: string | null;
      dueAt: Date | null;
      labels: TicketEventLabel[];
      watchers: TicketEventWatcher[];
    };
    next: {
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueAt?: Date | null;
      labels?: TicketEventLabel[];
      watchers?: TicketEventWatcher[];
    };
  }) {
    const rows: {
      id: string;
      channelId: string;
      actorId: string;
      type: TicketEventType;
      fromValue: unknown;
      toValue: unknown;
      createdAt: Date;
    }[] = [];

    const push = (
      type: TicketEventType,
      fromValue: unknown,
      toValue: unknown,
    ) => {
      rows.push({
        id: crypto.randomUUID(),
        channelId: input.channelId,
        actorId: input.actorId,
        type,
        fromValue,
        toValue,
        createdAt: input.createdAt,
      });
    };

    if (
      input.next.status !== undefined &&
      input.next.status !== input.existing.status
    ) {
      push('status_changed', input.existing.status, input.next.status);
    }

    if (
      input.next.priority !== undefined &&
      input.next.priority !== input.existing.priority
    ) {
      push('priority_changed', input.existing.priority, input.next.priority);
    }

    if (
      input.next.assigneeId !== undefined &&
      input.next.assigneeId !== input.existing.assigneeId
    ) {
      const [fromAssignee, toAssignee] = await Promise.all([
        this.loadAssigneeBrief(input.existing.assigneeId),
        this.loadAssigneeBrief(input.next.assigneeId),
      ]);
      push('assignee_changed', fromAssignee, toAssignee);
    }

    if (
      input.next.dueAt !== undefined &&
      !this.sameDueAt(input.existing.dueAt, input.next.dueAt)
    ) {
      push(
        'due_changed',
        input.existing.dueAt?.toISOString() ?? null,
        input.next.dueAt?.toISOString() ?? null,
      );
    }

    if (
      input.next.labels !== undefined &&
      !this.sameLabelIds(input.existing.labels, input.next.labels)
    ) {
      push('labels_changed', input.existing.labels, input.next.labels);
    }

    if (
      input.next.watchers !== undefined &&
      !this.sameWatcherIds(input.existing.watchers, input.next.watchers)
    ) {
      push('watchers_changed', input.existing.watchers, input.next.watchers);
    }

    return rows;
  }

  private sameDueAt(current: Date | null, next: Date | null) {
    if (current === null && next === null) return true;
    if (current === null || next === null) return false;
    return current.getTime() === next.getTime();
  }

  private sameLabelIds(current: TicketEventLabel[], next: TicketEventLabel[]) {
    if (current.length !== next.length) return false;
    const currentIds = current.map((label) => label.id).toSorted();
    const nextIds = next.map((label) => label.id).toSorted();
    return currentIds.every((id, index) => id === nextIds[index]);
  }

  private sameWatcherIds(
    current: TicketEventWatcher[],
    next: TicketEventWatcher[],
  ) {
    if (current.length !== next.length) return false;
    const currentIds = current.map((watcher) => watcher.id).toSorted();
    const nextIds = next.map((watcher) => watcher.id).toSorted();
    return currentIds.every((id, index) => id === nextIds[index]);
  }

  private async loadWatcherBriefs(watcherIds: string[]) {
    if (watcherIds.length === 0) return [];
    const rows = await this.drizzle.db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, watcherIds));
    const byId = new Map(rows.map((row) => [row.id, row]));
    return watcherIds.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  }

  private async loadAssigneeBrief(assigneeId: string | null) {
    if (!assigneeId) return null;
    const [row] = await this.drizzle.db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.id, assigneeId));
    return row ?? { id: assigneeId, name: 'Unknown' };
  }

  private publishTicketEvents(
    ticketId: string,
    parentId: string | null,
    events: TicketEvent[],
  ) {
    for (const event of events) {
      this.chatGateway.emitChannelEvent(ticketId, event);
      if (parentId && isParentChannelEventType(event.type)) {
        this.chatGateway.emitChannelEvent(parentId, event);
      }
    }
  }

  private ticketEventSelect() {
    return this.drizzle.db
      .select({
        id: channelEvents.id,
        channelId: channelEvents.channelId,
        type: channelEvents.type,
        fromValue: channelEvents.fromValue,
        toValue: channelEvents.toValue,
        createdAt: channelEvents.createdAt,
        actor: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        ticketId: channels.id,
        ticketName: channels.name,
        ticketNumber: channels.ticketNumber,
        parentId: channels.parentId,
        parentName: parentChannels.name,
        parentTicketKey: parentChannels.ticketKey,
      })
      .from(channelEvents)
      .leftJoin(user, eq(channelEvents.actorId, user.id))
      .innerJoin(channels, eq(channelEvents.channelId, channels.id))
      .leftJoin(parentChannels, eq(channels.parentId, parentChannels.id));
  }

  private async loadTicketEvents(
    channelIds: string[],
    types?: TicketEventType[],
  ) {
    const grouped = new Map<string, TicketEvent[]>();
    if (channelIds.length === 0) return grouped;

    const conditions = [inArray(channelEvents.channelId, channelIds)];
    if (types?.length) {
      conditions.push(inArray(channelEvents.type, types));
    }

    const rows = await this.ticketEventSelect()
      .where(and(...conditions))
      .orderBy(asc(channelEvents.createdAt), asc(channelEvents.id));

    for (const row of rows) {
      const event = this.toTicketEvent(row);
      const list = grouped.get(event.channelId) ?? [];
      list.push(event);
      grouped.set(event.channelId, list);
    }

    return grouped;
  }

  private async loadTicketEventsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.ticketEventSelect().where(
      inArray(channelEvents.id, ids),
    );
    const byId = new Map(rows.map((row) => [row.id, this.toTicketEvent(row)]));
    return ids.flatMap((id) => {
      const event = byId.get(id);
      return event ? [event] : [];
    });
  }

  private toTicketEvent(row: {
    id: string;
    channelId: string;
    type: string;
    fromValue: unknown;
    toValue: unknown;
    createdAt: Date;
    actor: {
      id: string | null;
      name: string | null;
      image: string | null;
    } | null;
    ticketId: string | null;
    ticketName: string | null;
    ticketNumber: number | null;
    parentId: string | null;
    parentName: string | null;
    parentTicketKey: string | null;
  }): TicketEvent {
    const prefix = ticketPrefixOf({
      ticketKey: row.parentTicketKey,
      name: row.parentName ?? row.ticketName ?? '',
    });
    const ticketNumber = row.ticketNumber ?? 0;

    return {
      id: row.id,
      channelId: row.channelId,
      parentId: row.parentId,
      type: row.type as TicketEventType,
      fromValue: row.fromValue,
      toValue: row.toValue,
      createdAt: row.createdAt.toISOString(),
      actor:
        row.actor?.id && row.actor.name
          ? {
              id: row.actor.id,
              name: row.actor.name,
              image: row.actor.image,
            }
          : null,
      ticket:
        row.ticketId && row.ticketName
          ? {
              id: row.ticketId,
              name: row.ticketName,
              displayId:
                ticketNumber > 0
                  ? ticketDisplayId(prefix, ticketNumber)
                  : prefix,
            }
          : null,
    };
  }

  private async loadClaimableThreadAttachments(
    parentId: string,
    userId: string,
    attachmentIds: string[],
  ) {
    if (attachmentIds.length === 0) return [];

    const rows = await this.drizzle.db
      .select()
      .from(attachments)
      .where(
        and(
          inArray(attachments.id, attachmentIds),
          eq(attachments.uploaderId, userId),
          eq(attachments.channelId, parentId),
        ),
      );

    if (rows.length !== attachmentIds.length) {
      throw new BadRequestException('Invalid attachment reference');
    }

    for (const row of rows) {
      if (row.messageId || row.purpose === ATTACHMENT_PURPOSE.THREAD) {
        throw new BadRequestException('Invalid attachment reference');
      }
      if (row.status === 'uploaded') continue;
      const head = await this.storage.head(row.storageKey);
      if (!head) {
        throw new BadRequestException(`Attachment ${row.id} not uploaded`);
      }
    }

    return rows;
  }
}
