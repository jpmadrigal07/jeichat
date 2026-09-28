import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { channelNotificationSettings, channels } from '../database/schema';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  DEFAULT_NOTIFICATION_LEVEL,
  parseNotificationLevel,
  type NotificationLevel,
} from './notification-level';

@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
  ) {}

  /** The user's non-default settings in a workspace, keyed by channel id. */
  async list(
    workspaceId: string,
    userId: string,
  ): Promise<Record<string, NotificationLevel>> {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const rows = await this.drizzle.db
      .select({
        channelId: channelNotificationSettings.channelId,
        level: channelNotificationSettings.level,
      })
      .from(channelNotificationSettings)
      .innerJoin(
        channels,
        eq(channelNotificationSettings.channelId, channels.id),
      )
      .where(
        and(
          eq(channelNotificationSettings.userId, userId),
          eq(channels.workspaceId, workspaceId),
        ),
      );

    const settings: Record<string, NotificationLevel> = {};
    for (const row of rows) {
      const level = parseNotificationLevel(row.level);
      if (level) settings[row.channelId] = level;
    }
    return settings;
  }

  async set(
    workspaceId: string,
    channelId: string,
    userId: string,
    level: NotificationLevel,
  ) {
    const channel =
      await this.workspacePermissionsService.assertChannelPermissionByChannelId(
        channelId,
        userId,
        PERMISSIONS.VIEW_CHANNEL,
      );
    if (channel.workspaceId !== workspaceId) {
      throw new NotFoundException('Channel not found');
    }
    if (channel.parentId || channel.channelType === 'dm') {
      throw new BadRequestException(
        'Notification settings only apply to channels',
      );
    }

    if (level === DEFAULT_NOTIFICATION_LEVEL) {
      await this.drizzle.db
        .delete(channelNotificationSettings)
        .where(
          and(
            eq(channelNotificationSettings.userId, userId),
            eq(channelNotificationSettings.channelId, channelId),
          ),
        );
    } else {
      await this.drizzle.db
        .insert(channelNotificationSettings)
        .values({ userId, channelId, level, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [
            channelNotificationSettings.userId,
            channelNotificationSettings.channelId,
          ],
          set: { level, updatedAt: new Date() },
        });
    }

    return { channelId, level };
  }

  /** Levels for the given users in one channel; missing users are "all". */
  async listLevels(
    channelId: string,
    userIds: string[],
  ): Promise<Map<string, NotificationLevel>> {
    const levels = new Map<string, NotificationLevel>();
    if (userIds.length === 0) return levels;

    const rows = await this.drizzle.db
      .select({
        userId: channelNotificationSettings.userId,
        level: channelNotificationSettings.level,
      })
      .from(channelNotificationSettings)
      .where(
        and(
          eq(channelNotificationSettings.channelId, channelId),
          inArray(channelNotificationSettings.userId, userIds),
        ),
      );

    for (const row of rows) {
      const level = parseNotificationLevel(row.level);
      if (level) levels.set(row.userId, level);
    }
    return levels;
  }
}
