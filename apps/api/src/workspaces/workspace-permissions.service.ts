import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import {
  channels,
  channelMembers,
  roleChannelPermissions,
  workspaceMembers,
  workspaceRoleMembers,
  workspaceRoles,
} from '../database/schema';
import {
  isChannelMemberPermission,
  parsePermissions,
  resolveChannelPermission,
  withDefaultMemberRole,
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
      channel.parentId ?? channel.id,
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
    const permissionChannelId =
      await this.resolvePermissionChannelId(channelId);
    if (!permissionChannelId) return false;

    const [channelMeta] = await this.drizzle.db
      .select({ channelType: channels.channelType })
      .from(channels)
      .where(eq(channels.id, permissionChannelId));

    if (channelMeta?.channelType === 'dm') {
      const access = await this.loadChannelAccessContext(userId, [
        permissionChannelId,
      ]);
      return access.memberOf.has(permissionChannelId);
    }

    const membership = await this.getMembership(workspaceId, userId);
    if (membership?.role === 'owner') return true;

    const [access, assignedRoles] = await Promise.all([
      this.loadChannelAccessContext(userId, [permissionChannelId]),
      this.getUserRoles(workspaceId, userId),
    ]);
    const roles = withDefaultMemberRole(assignedRoles, Boolean(membership));

    if (access.memberOf.has(permissionChannelId)) {
      if (isChannelMemberPermission(permission)) return true;
    }

    const overrides = await this.getChannelOverrides(
      permissionChannelId,
      roles.map((role) => role.id),
    );

    return resolveChannelPermission(roles, overrides, permission, {
      privateChannel: access.isPrivate.get(permissionChannelId) ?? false,
    });
  }

  async filterViewableChannelIds(
    workspaceId: string,
    userId: string,
    channelIds: string[],
  ): Promise<Set<string>> {
    if (channelIds.length === 0) return new Set();

    if (await this.isWorkspaceOwner(workspaceId, userId)) {
      return this.restrictDmChannelsToMembers(
        channelIds,
        new Set(channelIds),
        userId,
      );
    }

    const assignedRoles = await this.getUserRoles(workspaceId, userId);
    if (assignedRoles.some((role) => role.isAdministrator)) {
      return this.restrictDmChannelsToMembers(
        channelIds,
        new Set(channelIds),
        userId,
      );
    }

    const roles = withDefaultMemberRole(assignedRoles, true);
    const permissionChannelIds = await this.resolvePermissionChannelIds(
      channelIds,
    );
    const uniquePermissionIds = [
      ...new Set(permissionChannelIds.values()),
    ];
    const roleIds = roles.map((role) => role.id);

    const [access, overridesByChannel] = await Promise.all([
      this.loadChannelAccessContext(userId, uniquePermissionIds),
      this.getChannelOverridesForChannels(uniquePermissionIds, roleIds),
    ]);

    const viewable = new Set<string>();
    for (const channelId of channelIds) {
      const permissionChannelId =
        permissionChannelIds.get(channelId) ?? channelId;
      if (access.memberOf.has(permissionChannelId)) {
        viewable.add(channelId);
        continue;
      }
      const overrides =
        overridesByChannel.get(permissionChannelId) ?? new Map();
      if (
        resolveChannelPermission(roles, overrides, 'VIEW_CHANNEL', {
          privateChannel: access.isPrivate.get(permissionChannelId) ?? false,
        })
      ) {
        viewable.add(channelId);
      }
    }

    return this.restrictDmChannelsToMembers(channelIds, viewable, userId);
  }

  private async getDmChannelIdSet(channelIds: string[]) {
    if (channelIds.length === 0) return new Set<string>();

    const rows = await this.drizzle.db
      .select({ id: channels.id })
      .from(channels)
      .where(
        and(
          inArray(channels.id, channelIds),
          eq(channels.channelType, 'dm'),
        ),
      );

    return new Set(rows.map((row) => row.id));
  }

  private async restrictDmChannelsToMembers(
    channelIds: string[],
    viewable: Set<string>,
    userId: string,
  ) {
    const dmChannelIds = await this.getDmChannelIdSet(channelIds);
    if (dmChannelIds.size === 0) return viewable;

    const dmInViewable = [...dmChannelIds].filter((id) => viewable.has(id));
    if (dmInViewable.length === 0) return viewable;

    const access = await this.loadChannelAccessContext(userId, dmInViewable);
    const result = new Set(viewable);
    for (const dmId of dmChannelIds) {
      if (!access.memberOf.has(dmId)) {
        result.delete(dmId);
      }
    }
    return result;
  }

  private async resolvePermissionChannelId(
    channelId: string,
  ): Promise<string | null> {
    const [channel] = await this.drizzle.db
      .select({ parentId: channels.parentId })
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel) return null;
    return channel.parentId ?? channelId;
  }

  private async loadChannelAccessContext(userId: string, channelIds: string[]) {
    const isPrivate = new Map<string, boolean>();
    const memberOf = new Set<string>();
    if (channelIds.length === 0) return { isPrivate, memberOf };

    const [privacyRows, memberRows] = await Promise.all([
      this.drizzle.db
        .select({
          id: channels.id,
          isPrivate: channels.isPrivate,
        })
        .from(channels)
        .where(inArray(channels.id, channelIds)),
      this.drizzle.db
        .select({ channelId: channelMembers.channelId })
        .from(channelMembers)
        .where(
          and(
            eq(channelMembers.userId, userId),
            inArray(channelMembers.channelId, channelIds),
          ),
        ),
    ]);

    for (const row of privacyRows) {
      isPrivate.set(row.id, row.isPrivate);
    }
    for (const row of memberRows) {
      memberOf.add(row.channelId);
    }

    return { isPrivate, memberOf };
  }

  private async resolvePermissionChannelIds(
    channelIds: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (channelIds.length === 0) return result;

    const rows = await this.drizzle.db
      .select({ id: channels.id, parentId: channels.parentId })
      .from(channels)
      .where(inArray(channels.id, channelIds));

    for (const row of rows) {
      result.set(row.id, row.parentId ?? row.id);
    }

    return result;
  }

  private async getMembership(workspaceId: string, userId: string) {
    const [member] = await this.drizzle.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      );

    return member ?? null;
  }

  private async isWorkspaceOwner(workspaceId: string, userId: string) {
    const member = await this.getMembership(workspaceId, userId);
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
