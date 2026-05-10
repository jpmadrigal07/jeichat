import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import {
  workspaces,
  channels,
  workspaceMembers,
  user,
} from '../database/schema';

@Injectable()
export class WorkspacesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(name: string, icon: string | null, userId: string) {
    const id = crypto.randomUUID();
    const channelId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const now = new Date();

    const [workspace] = await this.drizzle.db
      .insert(workspaces)
      .values({ id, name, icon, ownerId: userId, createdAt: now, updatedAt: now })
      .returning();

    await this.drizzle.db.insert(channels).values({
      id: channelId,
      workspaceId: id,
      name: 'general',
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

  async addMember(workspaceId: string, ownerId: string, targetUserId: string) {
    await this.verifyOwnership(workspaceId, ownerId);

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

  private async verifyOwnership(workspaceId: string, userId: string) {
    const member = await this.verifyMembership(workspaceId, userId);

    if (member.role !== 'owner') {
      throw new ForbiddenException('Only the workspace owner can do this');
    }

    return member;
  }
}
