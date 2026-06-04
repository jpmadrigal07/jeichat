import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import {
  channels,
  roleChannelPermissions,
  user,
  workspaceMembers,
  workspaceRoleMembers,
  workspaceRoles,
} from '../database/schema';
import {
  ALL_PERMISSIONS,
  DEFAULT_ADMIN_ROLE_NAME,
  parsePermissions,
  type Permission,
} from './permissions';
import { WorkspacesService } from './workspaces.service';

function serializePermissions(permissions: Permission[]): string {
  return JSON.stringify(permissions);
}

type RoleRow = typeof workspaceRoles.$inferSelect;

function formatRole(role: RoleRow, memberCount = 0) {
  return {
    id: role.id,
    workspaceId: role.workspaceId,
    name: role.name,
    color: role.color,
    permissions: parsePermissions(role.permissions),
    isAdministrator: role.isAdministrator,
    isDefault: role.isDefault,
    position: role.position,
    memberCount,
  };
}

@Injectable()
export class WorkspaceRolesService {
  constructor(
    private readonly drizzle: DrizzleService,
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService,
  ) {}

  async ensureDefaultAdministratorRole(
    workspaceId: string,
    creatorUserId: string,
  ) {
    const [existing] = await this.drizzle.db
      .select()
      .from(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.workspaceId, workspaceId),
          eq(workspaceRoles.isDefault, true),
        ),
      )
      .limit(1);

    if (existing) {
      await this.ensureRoleMember(existing.id, creatorUserId);
      return existing.id;
    }

    const roleId = crypto.randomUUID();

    await this.drizzle.db.insert(workspaceRoles).values({
      id: roleId,
      workspaceId,
      name: DEFAULT_ADMIN_ROLE_NAME,
      color: '#e74c3c',
      permissions: serializePermissions([]),
      isAdministrator: true,
      isDefault: true,
      position: 0,
    });

    await this.ensureRoleMember(roleId, creatorUserId);

    return roleId;
  }

  async findAll(workspaceId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    await this.dedupeDefaultAdministratorRoles(workspaceId);

    const hasDefaultAdmin = await this.drizzle.db
      .select({ id: workspaceRoles.id })
      .from(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.workspaceId, workspaceId),
          eq(workspaceRoles.isDefault, true),
        ),
      )
      .limit(1);

    if (hasDefaultAdmin.length === 0) {
      const [ownerMember] = await this.drizzle.db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.role, 'owner'),
          ),
        );

      if (ownerMember) {
        await this.ensureDefaultAdministratorRole(
          workspaceId,
          ownerMember.userId,
        );
      }
    }

    const roles = await this.drizzle.db
      .select()
      .from(workspaceRoles)
      .where(eq(workspaceRoles.workspaceId, workspaceId))
      .orderBy(asc(workspaceRoles.position), asc(workspaceRoles.name));

    const memberCounts = await this.drizzle.db
      .select({
        roleId: workspaceRoleMembers.roleId,
        count: sql<number>`count(*)::int`,
      })
      .from(workspaceRoleMembers)
      .innerJoin(
        workspaceRoles,
        eq(workspaceRoleMembers.roleId, workspaceRoles.id),
      )
      .where(eq(workspaceRoles.workspaceId, workspaceId))
      .groupBy(workspaceRoleMembers.roleId);

    const countByRoleId = new Map(
      memberCounts.map((row) => [row.roleId, row.count]),
    );

    return roles.map((role) =>
      formatRole(role, countByRoleId.get(role.id) ?? 0),
    );
  }

  async findOne(workspaceId: string, roleId: string, userId: string) {
    await this.workspacesService.verifyMembership(workspaceId, userId);
    const role = await this.getRoleInWorkspace(workspaceId, roleId);

    const members = await this.drizzle.db
      .select({
        id: workspaceRoleMembers.id,
        userId: workspaceRoleMembers.userId,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(workspaceRoleMembers)
      .innerJoin(user, eq(workspaceRoleMembers.userId, user.id))
      .where(eq(workspaceRoleMembers.roleId, roleId));

    const channelPermissions = await this.drizzle.db
      .select({
        id: roleChannelPermissions.id,
        channelId: roleChannelPermissions.channelId,
        channelName: channels.name,
        allowPermissions: roleChannelPermissions.allowPermissions,
        denyPermissions: roleChannelPermissions.denyPermissions,
      })
      .from(roleChannelPermissions)
      .innerJoin(channels, eq(roleChannelPermissions.channelId, channels.id))
      .where(
        and(
          eq(roleChannelPermissions.roleId, roleId),
          eq(channels.workspaceId, workspaceId),
        ),
      );

    return {
      ...formatRole(role, members.length),
      members,
      channelPermissions: channelPermissions.map((row) => ({
        id: row.id,
        channelId: row.channelId,
        channelName: row.channelName,
        allowPermissions: parsePermissions(row.allowPermissions),
        denyPermissions: parsePermissions(row.denyPermissions),
      })),
    };
  }

  async findChannelRolePermissions(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await this.workspacesService.verifyMembership(workspaceId, userId);

    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(
        and(eq(channels.id, channelId), eq(channels.workspaceId, workspaceId)),
      );

    if (!channel) throw new NotFoundException('Channel not found');

    const roles = await this.drizzle.db
      .select()
      .from(workspaceRoles)
      .where(eq(workspaceRoles.workspaceId, workspaceId))
      .orderBy(asc(workspaceRoles.position), asc(workspaceRoles.name));

    const channelPermissions = await this.drizzle.db
      .select()
      .from(roleChannelPermissions)
      .where(eq(roleChannelPermissions.channelId, channelId));

    const permsByRoleId = new Map(
      channelPermissions.map((row) => [row.roleId, row]),
    );

    return roles
      .filter((role) => role.isAdministrator || permsByRoleId.has(role.id))
      .map((role) => {
        const row = permsByRoleId.get(role.id);
        return {
          id: role.id,
          name: role.name,
          color: role.color,
          isAdministrator: role.isAdministrator,
          allowPermissions: parsePermissions(row?.allowPermissions ?? '[]'),
          denyPermissions: parsePermissions(row?.denyPermissions ?? '[]'),
        };
      });
  }

  async assignRoleToChannel(
    workspaceId: string,
    channelId: string,
    roleId: string,
    userId: string,
  ) {
    await this.verifyCanManageRoles(workspaceId, userId);

    const role = await this.getRoleInWorkspace(workspaceId, roleId);

    if (role.isAdministrator) {
      throw new BadRequestException(
        'Administrator role is always present in every channel',
      );
    }

    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(
        and(eq(channels.id, channelId), eq(channels.workspaceId, workspaceId)),
      );

    if (!channel) throw new NotFoundException('Channel not found');

    const [existing] = await this.drizzle.db
      .select()
      .from(roleChannelPermissions)
      .where(
        and(
          eq(roleChannelPermissions.roleId, roleId),
          eq(roleChannelPermissions.channelId, channelId),
        ),
      );

    if (existing) {
      return {
        id: role.id,
        name: role.name,
        color: role.color,
        isAdministrator: role.isAdministrator,
        allowPermissions: parsePermissions(existing.allowPermissions),
        denyPermissions: parsePermissions(existing.denyPermissions),
      };
    }

    const [created] = await this.drizzle.db
      .insert(roleChannelPermissions)
      .values({
        id: crypto.randomUUID(),
        roleId,
        channelId,
        allowPermissions: serializePermissions([]),
        denyPermissions: serializePermissions([]),
      })
      .returning();

    return {
      id: role.id,
      name: role.name,
      color: role.color,
      isAdministrator: role.isAdministrator,
      allowPermissions: parsePermissions(created.allowPermissions),
      denyPermissions: parsePermissions(created.denyPermissions),
    };
  }

  async removeRoleFromChannel(
    workspaceId: string,
    channelId: string,
    roleId: string,
    userId: string,
  ) {
    await this.verifyCanManageRoles(workspaceId, userId);

    const role = await this.getRoleInWorkspace(workspaceId, roleId);

    if (role.isAdministrator) {
      throw new ForbiddenException(
        'Cannot remove Administrator role from a channel',
      );
    }

    const result = await this.drizzle.db
      .delete(roleChannelPermissions)
      .where(
        and(
          eq(roleChannelPermissions.roleId, roleId),
          eq(roleChannelPermissions.channelId, channelId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new NotFoundException('Role is not assigned to this channel');
    }
  }

  async create(
    workspaceId: string,
    userId: string,
    payload: { name: string; color?: string; permissions?: Permission[] },
  ) {
    await this.verifyCanManageRoles(workspaceId, userId);

    const name = payload.name.trim();
    if (!name) throw new BadRequestException('Role name is required');

    const permissions = (payload.permissions ?? []).filter((p) =>
      ALL_PERMISSIONS.includes(p),
    );

    const [{ maxPosition }] = await this.drizzle.db
      .select({
        maxPosition: sql<number>`coalesce(max(${workspaceRoles.position}), -1)::int`,
      })
      .from(workspaceRoles)
      .where(eq(workspaceRoles.workspaceId, workspaceId));

    const [role] = await this.drizzle.db
      .insert(workspaceRoles)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        name,
        color: payload.color ?? '#99aab5',
        permissions: serializePermissions(permissions),
        isAdministrator: false,
        isDefault: false,
        position: maxPosition + 1,
      })
      .returning();

    return formatRole(role, 0);
  }

  async update(
    workspaceId: string,
    roleId: string,
    userId: string,
    payload: {
      name?: string;
      color?: string;
      permissions?: Permission[];
      position?: number;
    },
  ) {
    await this.verifyCanManageRoles(workspaceId, userId);
    const role = await this.getRoleInWorkspace(workspaceId, roleId);

    if (role.isDefault && payload.name && payload.name !== role.name) {
      throw new ForbiddenException(
        'Cannot rename the default Administrator role',
      );
    }

    const updates: Partial<typeof workspaceRoles.$inferInsert> = {};

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) throw new BadRequestException('Role name is required');
      updates.name = name;
    }

    if (payload.color !== undefined) updates.color = payload.color;

    if (payload.permissions !== undefined) {
      if (role.isAdministrator) {
        throw new ForbiddenException(
          'Administrator role permissions cannot be changed',
        );
      }
      updates.permissions = serializePermissions(
        payload.permissions.filter((p) => ALL_PERMISSIONS.includes(p)),
      );
    }

    if (payload.position !== undefined) updates.position = payload.position;

    const [updated] = await this.drizzle.db
      .update(workspaceRoles)
      .set(updates)
      .where(eq(workspaceRoles.id, roleId))
      .returning();

    return formatRole(updated);
  }

  async remove(workspaceId: string, roleId: string, userId: string) {
    await this.verifyCanManageRoles(workspaceId, userId);
    const role = await this.getRoleInWorkspace(workspaceId, roleId);

    if (role.isDefault) {
      throw new ForbiddenException(
        'Cannot delete the default Administrator role',
      );
    }

    await this.drizzle.db
      .delete(workspaceRoles)
      .where(eq(workspaceRoles.id, roleId));
  }

  async addMember(
    workspaceId: string,
    roleId: string,
    userId: string,
    targetUserId: string,
  ) {
    await this.verifyCanManageRoles(workspaceId, userId);
    await this.getRoleInWorkspace(workspaceId, roleId);
    await this.workspacesService.verifyMembership(workspaceId, targetUserId);

    const [existing] = await this.drizzle.db
      .select()
      .from(workspaceRoleMembers)
      .where(
        and(
          eq(workspaceRoleMembers.roleId, roleId),
          eq(workspaceRoleMembers.userId, targetUserId),
        ),
      );

    if (existing) return existing;

    const [member] = await this.drizzle.db
      .insert(workspaceRoleMembers)
      .values({
        id: crypto.randomUUID(),
        roleId,
        userId: targetUserId,
      })
      .returning();

    return member;
  }

  async removeMember(
    workspaceId: string,
    roleId: string,
    userId: string,
    targetUserId: string,
  ) {
    await this.verifyCanManageRoles(workspaceId, userId);
    const role = await this.getRoleInWorkspace(workspaceId, roleId);

    if (role.isDefault) {
      const [adminCount] = await this.drizzle.db
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaceRoleMembers)
        .where(eq(workspaceRoleMembers.roleId, roleId));

      if (adminCount.count <= 1) {
        throw new ForbiddenException(
          'Cannot remove the last member from the Administrator role',
        );
      }
    }

    const result = await this.drizzle.db
      .delete(workspaceRoleMembers)
      .where(
        and(
          eq(workspaceRoleMembers.roleId, roleId),
          eq(workspaceRoleMembers.userId, targetUserId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new NotFoundException('Member not found in role');
    }
  }

  async setChannelPermissions(
    workspaceId: string,
    roleId: string,
    channelId: string,
    userId: string,
    payload: { allowPermissions: Permission[]; denyPermissions: Permission[] },
  ) {
    await this.verifyCanManageRoles(workspaceId, userId);
    const role = await this.getRoleInWorkspace(workspaceId, roleId);

    if (role.isAdministrator) {
      throw new ForbiddenException(
        'Administrator role has all channel permissions by default',
      );
    }

    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(
        and(eq(channels.id, channelId), eq(channels.workspaceId, workspaceId)),
      );

    if (!channel) throw new NotFoundException('Channel not found');

    const allowPermissions = payload.allowPermissions.filter((p) =>
      ALL_PERMISSIONS.includes(p),
    );
    const denyPermissions = payload.denyPermissions.filter((p) =>
      ALL_PERMISSIONS.includes(p),
    );

    const [existing] = await this.drizzle.db
      .select()
      .from(roleChannelPermissions)
      .where(
        and(
          eq(roleChannelPermissions.roleId, roleId),
          eq(roleChannelPermissions.channelId, channelId),
        ),
      );

    if (existing) {
      const [updated] = await this.drizzle.db
        .update(roleChannelPermissions)
        .set({
          allowPermissions: serializePermissions(allowPermissions),
          denyPermissions: serializePermissions(denyPermissions),
        })
        .where(eq(roleChannelPermissions.id, existing.id))
        .returning();

      return {
        id: updated.id,
        channelId: updated.channelId,
        channelName: channel.name,
        allowPermissions,
        denyPermissions,
      };
    }

    const [created] = await this.drizzle.db
      .insert(roleChannelPermissions)
      .values({
        id: crypto.randomUUID(),
        roleId,
        channelId,
        allowPermissions: serializePermissions(allowPermissions),
        denyPermissions: serializePermissions(denyPermissions),
      })
      .returning();

    return {
      id: created.id,
      channelId: created.channelId,
      channelName: channel.name,
      allowPermissions,
      denyPermissions,
    };
  }

  private async getRoleInWorkspace(workspaceId: string, roleId: string) {
    const [role] = await this.drizzle.db
      .select()
      .from(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.id, roleId),
          eq(workspaceRoles.workspaceId, workspaceId),
        ),
      );

    if (!role) throw new NotFoundException('Role not found');

    return role;
  }

  private async ensureRoleMember(roleId: string, userId: string) {
    const [existing] = await this.drizzle.db
      .select()
      .from(workspaceRoleMembers)
      .where(
        and(
          eq(workspaceRoleMembers.roleId, roleId),
          eq(workspaceRoleMembers.userId, userId),
        ),
      );

    if (existing) return;

    await this.drizzle.db.insert(workspaceRoleMembers).values({
      id: crypto.randomUUID(),
      roleId,
      userId,
    });
  }

  private async dedupeDefaultAdministratorRoles(workspaceId: string) {
    const defaults = await this.drizzle.db
      .select()
      .from(workspaceRoles)
      .where(
        and(
          eq(workspaceRoles.workspaceId, workspaceId),
          eq(workspaceRoles.isDefault, true),
        ),
      )
      .orderBy(asc(workspaceRoles.position));

    if (defaults.length <= 1) return;

    const [keep, ...duplicates] = defaults;

    for (const duplicate of duplicates) {
      const members = await this.drizzle.db
        .select()
        .from(workspaceRoleMembers)
        .where(eq(workspaceRoleMembers.roleId, duplicate.id));

      for (const member of members) {
        await this.ensureRoleMember(keep.id, member.userId);
      }

      await this.drizzle.db
        .delete(workspaceRoles)
        .where(eq(workspaceRoles.id, duplicate.id));
    }
  }

  private async verifyCanManageRoles(workspaceId: string, userId: string) {
    const member = await this.workspacesService.verifyMembership(
      workspaceId,
      userId,
    );

    if (member.role === 'owner') return member;

    throw new ForbiddenException('Only the workspace owner can manage roles');
  }
}
