import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import {
  channels,
  roleChannelPermissions,
  workspaceMembers,
  workspaceRoleMembers,
  workspaceRoles,
} from '../database/schema';
import {
  parsePermissions,
  resolveChannelPermission,
  type ChannelPermissionOverride,
  type Permission,
} from './permissions';

@Injectable()
export class WorkspacePermissionsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async assertChannelPermission(
    workspaceId: string,
    channelId: string,
    userId: string,
    permission: Permission,
  ) {
    const allowed = await this.hasChannelPermission(
      workspaceId,
      channelId,
      userId,
      permission,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission for this channel',
      );
    }
  }

  async assertChannelPermissionByChannelId(
    channelId: string,
    userId: string,
    permission: Permission,
  ) {
    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel) throw new NotFoundException('Channel not found');

    await this.assertChannelPermission(
      channel.workspaceId,
      channelId,
      userId,
      permission,
    );

    return channel;
  }

  async hasChannelPermission(
    workspaceId: string,
    channelId: string,
    userId: string,
    permission: Permission,
  ): Promise<boolean> {
    if (await this.isWorkspaceOwner(workspaceId, userId)) return true;

    const roles = await this.getUserRoles(workspaceId, userId);
    const overrides = await this.getChannelOverrides(
      channelId,
      roles.map((role) => role.id),
    );

    return resolveChannelPermission(roles, overrides, permission);
  }

  async filterViewableChannelIds(
    workspaceId: string,
    userId: string,
    channelIds: string[],
  ): Promise<Set<string>> {
    if (channelIds.length === 0) return new Set();

    if (await this.isWorkspaceOwner(workspaceId, userId)) {
      return new Set(channelIds);
    }

    const roles = await this.getUserRoles(workspaceId, userId);
    if (roles.some((role) => role.isAdministrator)) {
      return new Set(channelIds);
    }

    const roleIds = roles.map((role) => role.id);
    const overridesByChannel = await this.getChannelOverridesForChannels(
      channelIds,
      roleIds,
    );

    const viewable = new Set<string>();
    for (const channelId of channelIds) {
      const overrides = overridesByChannel.get(channelId) ?? new Map();
      if (resolveChannelPermission(roles, overrides, 'VIEW_CHANNEL')) {
        viewable.add(channelId);
      }
    }

    return viewable;
  }

  private async isWorkspaceOwner(workspaceId: string, userId: string) {
    const [member] = await this.drizzle.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      );

    return member?.role === 'owner';
  }

  private async getUserRoles(workspaceId: string, userId: string) {
    const rows = await this.drizzle.db
      .select({
        id: workspaceRoles.id,
        isAdministrator: workspaceRoles.isAdministrator,
        permissions: workspaceRoles.permissions,
      })
      .from(workspaceRoleMembers)
      .innerJoin(
        workspaceRoles,
        eq(workspaceRoleMembers.roleId, workspaceRoles.id),
      )
      .where(
        and(
          eq(workspaceRoleMembers.userId, userId),
          eq(workspaceRoles.workspaceId, workspaceId),
        ),
      );

    return rows.map((row) => ({
      id: row.id,
      isAdministrator: row.isAdministrator,
      permissions: parsePermissions(row.permissions),
    }));
  }

  private async getChannelOverrides(channelId: string, roleIds: string[]) {
    if (roleIds.length === 0) return new Map();

    const rows = await this.drizzle.db
      .select()
      .from(roleChannelPermissions)
      .where(
        and(
          eq(roleChannelPermissions.channelId, channelId),
          inArray(roleChannelPermissions.roleId, roleIds),
        ),
      );

    return new Map(
      rows.map((row) => [
        row.roleId,
        {
          allowPermissions: parsePermissions(row.allowPermissions),
          denyPermissions: parsePermissions(row.denyPermissions),
        },
      ]),
    );
  }

  private async getChannelOverridesForChannels(
    channelIds: string[],
    roleIds: string[],
  ) {
    const result = new Map<string, Map<string, ChannelPermissionOverride>>();

    if (channelIds.length === 0 || roleIds.length === 0) return result;

    const rows = await this.drizzle.db
      .select()
      .from(roleChannelPermissions)
      .where(
        and(
          inArray(roleChannelPermissions.channelId, channelIds),
          inArray(roleChannelPermissions.roleId, roleIds),
        ),
      );

    for (const row of rows) {
      if (!result.has(row.channelId)) {
        result.set(row.channelId, new Map());
      }
      result.get(row.channelId)!.set(row.roleId, {
        allowPermissions: parsePermissions(row.allowPermissions),
        denyPermissions: parsePermissions(row.denyPermissions),
      });
    }

    return result;
  }
}
