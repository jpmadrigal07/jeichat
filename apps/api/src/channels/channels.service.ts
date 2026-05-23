import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq, gt, inArray, isNull, ne, or } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { channelReads, channels, messages } from '../database/schema';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async create(
    workspaceId: string,
    userId: string,
    name: string,
    description: string | null,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const now = new Date();
    const [channel] = await this.drizzle.db
      .insert(channels)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        name,
        description,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return channel;
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    return this.drizzle.db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId));
  }

  async findOne(workspaceId: string, id: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, id), eq(channels.workspaceId, workspaceId)));

    if (!channel) throw new NotFoundException('Channel not found');

    return channel;
  }

  async update(
    workspaceId: string,
    id: string,
    userId: string,
    data: { name?: string; description?: string | null },
  ) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const [existing] = await this.drizzle.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, id), eq(channels.workspaceId, workspaceId)));

    if (!existing) throw new NotFoundException('Channel not found');

    const [channel] = await this.drizzle.db
      .update(channels)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(channels.id, id))
      .returning();

    return channel;
  }

  async getUnreadCounts(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const workspaceChannels = await this.drizzle.db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId));

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
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const [existing] = await this.drizzle.db
      .select()
      .from(channels)
      .where(and(eq(channels.id, id), eq(channels.workspaceId, workspaceId)));

    if (!existing) throw new NotFoundException('Channel not found');

    const allChannels = await this.drizzle.db
      .select({ id: channels.id })
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId));

    if (allChannels.length <= 1) {
      throw new BadRequestException(
        'Cannot delete the last channel in a workspace',
      );
    }

    await this.drizzle.db.delete(channels).where(eq(channels.id, id));
  }
}
