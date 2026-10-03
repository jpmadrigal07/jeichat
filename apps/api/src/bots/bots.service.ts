import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { bots, channels, user, workspaceMembers } from '../database/schema';
import { ChatGateway } from '../gateway/chat.gateway';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import { WorkspaceRolesService } from '../workspaces/workspace-roles.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BotRateLimiter } from './bot-rate-limiter';
import { botEmailLocalPart, generateBotToken, hashBotToken } from './bot-token';

export type ResolvedBot = {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  image: string | null;
};

@Injectable()
export class BotsService {
  private readonly rateLimiter = new BotRateLimiter();

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
    private readonly workspaceRolesService: WorkspaceRolesService,
    private readonly workspacePermissionsService: WorkspacePermissionsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async create(workspaceId: string, ownerId: string, name: string) {
    await this.workspacesService.verifyOwnership(workspaceId, ownerId);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Bot name is required');
    }

    const botId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const now = new Date();
    const { token, tokenHash, tokenPrefix } = generateBotToken();
    const email = `${botEmailLocalPart(trimmed, botId)}@bots.invalid`;

    await this.drizzle.db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name: trimmed,
        email,
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(bots).values({
        id: botId,
        userId,
        workspaceId,
        ownerId,
        tokenHash,
        tokenPrefix,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(workspaceMembers).values({
        id: crypto.randomUUID(),
        workspaceId,
        userId,
        role: 'member',
        joinedAt: now,
      });
    });

    const roleId =
      await this.workspaceRolesService.ensureDefaultBotRole(workspaceId);
    await this.workspaceRolesService.ensureRoleMemberPublic(roleId, userId);
    void this.chatGateway.resyncBotChannelRooms(workspaceId);

    return this.toPublic(botId, token);
  }

  async list(workspaceId: string, actorId: string) {
    await this.workspacesService.verifyMembership(workspaceId, actorId);
    const rows = await this.drizzle.db
      .select({
        id: bots.id,
        userId: bots.userId,
        workspaceId: bots.workspaceId,
        ownerId: bots.ownerId,
        tokenPrefix: bots.tokenPrefix,
        disabledAt: bots.disabledAt,
        lastUsedAt: bots.lastUsedAt,
        createdAt: bots.createdAt,
        name: user.name,
        image: user.image,
        email: user.email,
      })
      .from(bots)
      .innerJoin(user, eq(bots.userId, user.id))
      .where(eq(bots.workspaceId, workspaceId));

    return rows.map((row) => ({
      ...row,
      isBot: true as const,
    }));
  }

  async regenerateToken(workspaceId: string, botId: string, ownerId: string) {
    const bot = await this.requireOwnedBot(workspaceId, botId, ownerId);
    const { token, tokenHash, tokenPrefix } = generateBotToken();
    await this.drizzle.db
      .update(bots)
      .set({
        tokenHash,
        tokenPrefix,
        updatedAt: new Date(),
      })
      .where(eq(bots.id, bot.id));
    this.chatGateway.disconnectUserSockets(bot.userId);
    return this.toPublic(bot.id, token);
  }

  async disable(workspaceId: string, botId: string, ownerId: string) {
    const bot = await this.requireOwnedBot(workspaceId, botId, ownerId);
    if (bot.disabledAt) return this.toPublic(bot.id);
    await this.drizzle.db
      .update(bots)
      .set({ disabledAt: new Date(), updatedAt: new Date() })
      .where(eq(bots.id, bot.id));
    this.chatGateway.disconnectUserSockets(bot.userId);
    return this.toPublic(bot.id);
  }

  async updateName(
    workspaceId: string,
    botId: string,
    ownerId: string,
    name: string,
  ) {
    const bot = await this.requireOwnedBot(workspaceId, botId, ownerId);
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Bot name is required');
    }
    await this.drizzle.db
      .update(user)
      .set({ name: trimmed, updatedAt: new Date() })
      .where(eq(user.id, bot.userId));
    return this.toPublic(bot.id);
  }

  async me(actor: { userId: string; kind: string; workspaceId?: string }) {
    if (actor.kind !== 'bot' || !actor.workspaceId) {
      throw new ForbiddenException('Bot token required');
    }
    const [row] = await this.drizzle.db
      .select({
        id: bots.id,
        userId: bots.userId,
        workspaceId: bots.workspaceId,
        disabledAt: bots.disabledAt,
        name: user.name,
        image: user.image,
      })
      .from(bots)
      .innerJoin(user, eq(bots.userId, user.id))
      .where(eq(bots.userId, actor.userId));

    if (!row || row.disabledAt) {
      throw new UnauthorizedException();
    }

    const allChannels = await this.drizzle.db
      .select({
        id: channels.id,
        name: channels.name,
        parentId: channels.parentId,
        channelType: channels.channelType,
        isPrivate: channels.isPrivate,
      })
      .from(channels)
      .where(eq(channels.workspaceId, row.workspaceId));
    const viewableIds =
      await this.workspacePermissionsService.filterViewableChannelIds(
        row.workspaceId,
        row.userId,
        allChannels.map((channel) => channel.id),
      );

    return {
      id: row.id,
      userId: row.userId,
      workspaceId: row.workspaceId,
      name: row.name,
      image: row.image,
      bot: true as const,
      channels: allChannels.filter((channel) => viewableIds.has(channel.id)),
    };
  }

  async listActiveBots(workspaceId: string) {
    return this.drizzle.db
      .select({ userId: bots.userId })
      .from(bots)
      .where(and(eq(bots.workspaceId, workspaceId), isNull(bots.disabledAt)));
  }

  async resolveToken(token: string): Promise<ResolvedBot> {
    const tokenHash = hashBotToken(token);
    const [row] = await this.drizzle.db
      .select({
        id: bots.id,
        userId: bots.userId,
        workspaceId: bots.workspaceId,
        disabledAt: bots.disabledAt,
        name: user.name,
        image: user.image,
      })
      .from(bots)
      .innerJoin(user, eq(bots.userId, user.id))
      .where(eq(bots.tokenHash, tokenHash));

    if (!row || row.disabledAt) {
      throw new UnauthorizedException('Invalid bot token');
    }

    void this.drizzle.db
      .update(bots)
      .set({ lastUsedAt: new Date() })
      .where(eq(bots.id, row.id));

    return {
      id: row.id,
      userId: row.userId,
      workspaceId: row.workspaceId,
      name: row.name,
      image: row.image,
    };
  }

  async consumeRateLimit(botId: string) {
    const ok = await this.rateLimiter.consume(botId);
    if (!ok) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async assertChannelWorkspace(channelId: string, workspaceId: string) {
    const [channel] = await this.drizzle.db
      .select({ workspaceId: channels.workspaceId })
      .from(channels)
      .where(eq(channels.id, channelId));
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.workspaceId !== workspaceId) {
      throw new ForbiddenException('Bot is not in this workspace');
    }
  }

  async isBotUser(userId: string): Promise<boolean> {
    const [row] = await this.drizzle.db
      .select({ id: bots.id })
      .from(bots)
      .where(eq(bots.userId, userId))
      .limit(1);
    return Boolean(row);
  }

  async botUserIdSet(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const rows = await this.drizzle.db
      .select({ userId: bots.userId })
      .from(bots)
      .where(inArray(bots.userId, userIds));
    return new Set(rows.map((row) => row.userId));
  }

  async excludeBots(userIds: string[]): Promise<string[]> {
    const botIds = await this.botUserIdSet(userIds);
    return userIds.filter((id) => !botIds.has(id));
  }

  async findBotWorkspace(userId: string): Promise<string | null> {
    const [row] = await this.drizzle.db
      .select({ workspaceId: bots.workspaceId })
      .from(bots)
      .where(and(eq(bots.userId, userId), isNull(bots.disabledAt)))
      .limit(1);
    return row?.workspaceId ?? null;
  }

  private async requireOwnedBot(
    workspaceId: string,
    botId: string,
    ownerId: string,
  ) {
    await this.workspacesService.verifyOwnership(workspaceId, ownerId);
    const [bot] = await this.drizzle.db
      .select()
      .from(bots)
      .where(and(eq(bots.id, botId), eq(bots.workspaceId, workspaceId)));
    if (!bot) throw new NotFoundException('Bot not found');
    return bot;
  }

  private async toPublic(botId: string, token?: string) {
    const [row] = await this.drizzle.db
      .select({
        id: bots.id,
        userId: bots.userId,
        workspaceId: bots.workspaceId,
        ownerId: bots.ownerId,
        tokenPrefix: bots.tokenPrefix,
        disabledAt: bots.disabledAt,
        lastUsedAt: bots.lastUsedAt,
        createdAt: bots.createdAt,
        name: user.name,
        image: user.image,
        email: user.email,
      })
      .from(bots)
      .innerJoin(user, eq(bots.userId, user.id))
      .where(eq(bots.id, botId));

    if (!row) throw new NotFoundException('Bot not found');
    return {
      ...row,
      isBot: true as const,
      ...(token ? { token } : {}),
    };
  }
}
