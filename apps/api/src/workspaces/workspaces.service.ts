import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { and, eq, sql, asc } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import {
  workspaces,
  channels,
  workspaceMembers,
  user,
  labels,
  channelLabels,
} from '../database/schema';
import { WorkspaceRolesService } from './workspace-roles.service';
import {
  DEFAULT_WORKSPACE_LABELS,
  LABEL_COLORS,
  parseLabelColor,
  parseLabelName,
} from '../channels/ticket-fields';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly drizzle: DrizzleService,
    @Inject(forwardRef(() => WorkspaceRolesService))
    private readonly workspaceRolesService: WorkspaceRolesService,
  ) {}

  async create(name: string, icon: string | null, userId: string) {
    const id = crypto.randomUUID();
    const channelId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const now = new Date();

    const [workspace] = await this.drizzle.db
      .insert(workspaces)
      .values({
        id,
        name,
        icon,
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await this.drizzle.db.insert(channels).values({
      id: channelId,
      workspaceId: id,
      name: 'general',
      ticketKey: 'GEN',
      createdAt: now,
      updatedAt: now,
    });

    await this.drizzle.db.insert(workspaceMembers).values({
      id: memberId,
      workspaceId: id,
      userId,
      role: 'owner',
      joinedAt: now,
    });

    await this.workspaceRolesService.ensureDefaultAdministratorRole(id, userId);
    await this.seedDefaultLabels(id);

    return workspace;
  }

  async findAllForUser(userId: string) {
    return this.drizzle.db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        icon: workspaces.icon,
        ownerId: workspaces.ownerId,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));
  }

  async findOne(id: string, userId: string) {
    await this.verifyMembership(id, userId);

    const [workspace] = await this.drizzle.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id));

    if (!workspace) throw new NotFoundException('Workspace not found');

    return workspace;
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; icon?: string | null },
  ) {
    await this.verifyOwnership(id, userId);

    const [workspace] = await this.drizzle.db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();

    return workspace;
  }

  async remove(id: string, userId: string) {
    await this.verifyOwnership(id, userId);
    await this.drizzle.db.delete(workspaces).where(eq(workspaces.id, id));
  }

  async findMembers(workspaceId: string, userId: string) {
    await this.verifyMembership(workspaceId, userId);

    return this.drizzle.db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
        name: user.name,
        email: user.email,
        image: user.image,
      })
      .from(workspaceMembers)
      .innerJoin(user, eq(workspaceMembers.userId, user.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async listMemberUserIds(workspaceId: string) {
    const rows = await this.drizzle.db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    return rows.map((row) => row.userId);
  }

  async addMember(
    workspaceId: string,
    ownerId: string,
    payload: { email?: string; userId?: string },
  ) {
    await this.verifyOwnership(workspaceId, ownerId);

    let targetUserId = payload.userId?.trim();

    if (payload.email) {
      const email = payload.email.trim().toLowerCase();
      const [targetUser] = await this.drizzle.db
        .select()
        .from(user)
        .where(sql`lower(${user.email}) = ${email}`);

      if (!targetUser) throw new NotFoundException('User not found');

      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      throw new BadRequestException('email or userId is required');
    }

    const [existingMember] = await this.drizzle.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      );

    if (existingMember) return existingMember;

    const [targetUser] = await this.drizzle.db
      .select()
      .from(user)
      .where(eq(user.id, targetUserId));

    if (!targetUser) throw new NotFoundException('User not found');

    const [member] = await this.drizzle.db
      .insert(workspaceMembers)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        userId: targetUserId,
        role: 'member',
        joinedAt: new Date(),
      })
      .returning();

    return member;
  }

  async removeMember(
    workspaceId: string,
    ownerId: string,
    targetUserId: string,
  ) {
    await this.verifyOwnership(workspaceId, ownerId);

    if (ownerId === targetUserId) {
      throw new ForbiddenException('Cannot remove yourself as owner');
    }

    const result = await this.drizzle.db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      )
      .returning();

    if (result.length === 0) {
      throw new NotFoundException('Member not found in workspace');
    }
  }

  async verifyMembership(workspaceId: string, userId: string) {
    const [member] = await this.drizzle.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      );

    if (!member) throw new ForbiddenException('Not a member of this workspace');

    return member;
  }

  async findLabels(workspaceId: string, userId: string) {
    await this.verifyMembership(workspaceId, userId);
    await this.ensureDefaultLabels(workspaceId);

    return this.drizzle.db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        usageCount: sql<number>`count(${channelLabels.channelId})::int`,
      })
      .from(labels)
      .leftJoin(channelLabels, eq(channelLabels.labelId, labels.id))
      .where(eq(labels.workspaceId, workspaceId))
      .groupBy(labels.id, labels.name, labels.color)
      .orderBy(asc(labels.name));
  }

  async createLabel(
    workspaceId: string,
    userId: string,
    data: { name: string; color?: string },
  ) {
    await this.verifyMembership(workspaceId, userId);

    const name = parseLabelName(data.name);
    const existing = await this.listLabelNames(workspaceId);

    const duplicate = existing.find(
      (label) => label.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      throw new BadRequestException('A label with this name already exists');
    }

    const color =
      data.color !== undefined
        ? parseLabelColor(data.color)
        : LABEL_COLORS[existing.length % LABEL_COLORS.length];

    const [label] = await this.drizzle.db
      .insert(labels)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        name,
        color,
        createdAt: new Date(),
      })
      .returning({
        id: labels.id,
        name: labels.name,
        color: labels.color,
      });

    return { ...label, usageCount: 0 };
  }

  async updateLabel(
    workspaceId: string,
    userId: string,
    labelId: string,
    data: { name?: string; color?: string },
  ) {
    await this.verifyMembership(workspaceId, userId);
    const current = await this.getWorkspaceLabel(workspaceId, labelId);

    const name =
      data.name !== undefined ? parseLabelName(data.name) : current.name;
    const color =
      data.color !== undefined ? parseLabelColor(data.color) : current.color;

    if (name.toLowerCase() !== current.name.toLowerCase()) {
      const existing = await this.listLabelNames(workspaceId);
      const duplicate = existing.find(
        (label) =>
          label.id !== labelId &&
          label.name.toLowerCase() === name.toLowerCase(),
      );
      if (duplicate) {
        throw new BadRequestException('A label with this name already exists');
      }
    }

    const [label] = await this.drizzle.db
      .update(labels)
      .set({ name, color })
      .where(
        and(eq(labels.id, labelId), eq(labels.workspaceId, workspaceId)),
      )
      .returning({
        id: labels.id,
        name: labels.name,
        color: labels.color,
      });

    return label;
  }

  async deleteLabel(workspaceId: string, userId: string, labelId: string) {
    await this.verifyMembership(workspaceId, userId);
    await this.getWorkspaceLabel(workspaceId, labelId);

    await this.drizzle.db
      .delete(labels)
      .where(and(eq(labels.id, labelId), eq(labels.workspaceId, workspaceId)));
  }

  private async verifyOwnership(workspaceId: string, userId: string) {
    const member = await this.verifyMembership(workspaceId, userId);

    if (member.role !== 'owner') {
      throw new ForbiddenException('Only the workspace owner can do this');
    }

    return member;
  }

  private async listLabelNames(workspaceId: string) {
    return this.drizzle.db
      .select({ id: labels.id, name: labels.name })
      .from(labels)
      .where(eq(labels.workspaceId, workspaceId));
  }

  private async getWorkspaceLabel(workspaceId: string, labelId: string) {
    const [label] = await this.drizzle.db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(labels)
      .where(
        and(eq(labels.id, labelId), eq(labels.workspaceId, workspaceId)),
      );

    if (!label) throw new NotFoundException('Label not found');
    return label;
  }

  private async seedDefaultLabels(workspaceId: string) {
    await this.drizzle.db
      .insert(labels)
      .values(
        DEFAULT_WORKSPACE_LABELS.map((label) => ({
          id: crypto.randomUUID(),
          workspaceId,
          name: label.name,
          color: label.color,
          createdAt: new Date(),
        })),
      )
      .onConflictDoNothing();
  }

  private async ensureDefaultLabels(workspaceId: string) {
    const [existing] = await this.drizzle.db
      .select({ id: labels.id })
      .from(labels)
      .where(eq(labels.workspaceId, workspaceId))
      .limit(1);
    if (existing) return;
    await this.seedDefaultLabels(workspaceId);
  }
}
