import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { channels, messages } from '../database/schema';
import { user } from '../database/schema/auth';
import { ChatGateway } from '../gateway/chat.gateway';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
    private readonly chatGateway: ChatGateway,
  ) {}

  private async verifyChannelAccess(channelId: string, userId: string) {
    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel) throw new NotFoundException('Channel not found');

    await this.workspacesService.verifyMembership(channel.workspaceId, userId);

    return channel;
  }

  async create(channelId: string, senderId: string, content: string) {
    await this.verifyChannelAccess(channelId, senderId);

    const now = new Date();
    const [message] = await this.drizzle.db
      .insert(messages)
      .values({
        id: crypto.randomUUID(),
        channelId,
        senderId,
        content,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const [sender] = await this.drizzle.db
      .select({ name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, senderId));

    const result = { ...message, sender };
    this.chatGateway.emitNewMessage(channelId, result);
    return result;
  }

  async findAll(
    channelId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ) {
    await this.verifyChannelAccess(channelId, userId);

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
      hasMore && last
        ? `${last.createdAt.toISOString()}_${last.id}`
        : null;

    return { data, nextCursor };
  }

  async update(
    channelId: string,
    id: string,
    userId: string,
    content: string,
  ) {
    await this.verifyChannelAccess(channelId, userId);

    const [existing] = await this.drizzle.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.channelId, channelId)));

    if (!existing) throw new NotFoundException('Message not found');

    if (existing.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const [message] = await this.drizzle.db
      .update(messages)
      .set({ content, updatedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();

    const [sender] = await this.drizzle.db
      .select({ name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, message.senderId));

    const result = { ...message, sender };
    this.chatGateway.emitMessageUpdated(channelId, result);
    return result;
  }

  async remove(channelId: string, id: string, userId: string) {
    await this.verifyChannelAccess(channelId, userId);

    const [existing] = await this.drizzle.db
      .select()
      .from(messages)
      .where(and(eq(messages.id, id), eq(messages.channelId, channelId)));

    if (!existing) throw new NotFoundException('Message not found');

    if (existing.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.drizzle.db.delete(messages).where(eq(messages.id, id));
    this.chatGateway.emitMessageDeleted(channelId, id);
  }
}
