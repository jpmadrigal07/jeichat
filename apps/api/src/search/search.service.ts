import { Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { attachments, channels, messages } from '../database/schema';
import { user } from '../database/schema/auth';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import {
  isSearchQueryEmpty,
  parseSearchQuery,
} from './search-query';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 200;

function likeContains(value: string) {
  return `%${value.replace(/[%_]/g, '')}%`;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
  ) {}

  async search(
    workspaceId: string,
    userId: string,
    rawQuery: string,
    limit = DEFAULT_LIMIT,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);
    const parsed = parseSearchQuery(q);
    if (!q || isSearchQueryEmpty(parsed)) {
      return [];
    }

    const workspaceChannels = await this.drizzle.db
      .select({
        id: channels.id,
        name: channels.name,
        parentId: channels.parentId,
      })
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId));

    const viewableIds =
      await this.workspacePermissionsService.filterViewableChannelIds(
        workspaceId,
        userId,
        workspaceChannels.map((channel) => channel.id),
      );

    let channelIds = workspaceChannels
      .filter((channel) => viewableIds.has(channel.id))
      .map((channel) => channel.id);

    if (parsed.in) {
      const needle = parsed.in.toLowerCase();
      const matched = workspaceChannels.filter(
        (channel) =>
          viewableIds.has(channel.id) &&
          channel.name.toLowerCase().includes(needle),
      );
      channelIds = matched.map((channel) => channel.id);
    }

    if (channelIds.length === 0) return [];

    const conditions = [inArray(messages.channelId, channelIds)];

    if (parsed.text) {
      conditions.push(ilike(messages.content, likeContains(parsed.text)));
    }
    if (parsed.from) {
      conditions.push(ilike(user.name, likeContains(parsed.from)));
    }
    if (parsed.mentions) {
      conditions.push(
        ilike(messages.content, likeContains(`@${parsed.mentions}`)),
      );
    }
    if (parsed.has === 'file') {
      conditions.push(
        sql`exists (select 1 from attachments where attachments.message_id = ${messages.id})`,
      );
    }
    if (parsed.has === 'link') {
      conditions.push(sql`${messages.content} ~* 'https?://'`);
    }

    const capped = Math.min(Math.max(limit, 1), MAX_LIMIT);

    const rows = await this.drizzle.db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        channelName: channels.name,
        channelParentId: channels.parentId,
        senderName: user.name,
        senderImage: user.image,
      })
      .from(messages)
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .innerJoin(user, eq(messages.senderId, user.id))
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(capped);

    const messageIds = rows.map((row) => row.id);
    const attachmentMessageIds = new Set<string>();
    if (messageIds.length > 0) {
      const attachmentRows = await this.drizzle.db
        .select({ messageId: attachments.messageId })
        .from(attachments)
        .where(inArray(attachments.messageId, messageIds));
      for (const row of attachmentRows) {
        if (row.messageId) attachmentMessageIds.add(row.messageId);
      }
    }

    return rows.map((row) => ({
      id: row.id,
      channelId: row.channelId,
      senderId: row.senderId,
      content: row.content,
      createdAt: row.createdAt,
      hasAttachment: attachmentMessageIds.has(row.id),
      channel: {
        id: row.channelId,
        name: row.channelName,
        parentId: row.channelParentId,
      },
      sender: {
        name: row.senderName,
        image: row.senderImage,
      },
    }));
  }
}
