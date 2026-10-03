import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DrizzleService } from '../database/drizzle.service';
import { channelWebhooks, channels, user } from '../database/schema';
import { BotRateLimiter } from '../bots/bot-rate-limiter';
import { MessagesService } from '../messages/messages.service';
import { UsersService } from '../users/users.service';
import { PERMISSIONS } from '../workspaces/permissions';
import { WorkspacePermissionsService } from '../workspaces/workspace-permissions.service';
import { formatWebhookPayload } from './webhook-payload';
import {
  MAX_WEBHOOKS_PER_CHANNEL,
  generateWebhookToken,
  normalizeWebhookName,
  webhookPublicUrl,
  webhookTokenMatches,
  webhookUserEmail,
} from './webhook-token';

const DEFAULT_WEBHOOK_NAME = 'Webhook';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createdByUser = alias(user, 'webhook_created_by');

export class WebhookRateLimitedException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      {
        statusCode: 429,
        message: 'Too Many Requests',
        retryAfter: retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

type ChannelRow = typeof channels.$inferSelect;

@Injectable()
export class WebhooksService {
  // Short burst plus a sustained cap, per webhook. Checked only after the secret
  // matches, so strangers can't burn a real integration's quota.
  private readonly burstLimiter = new BotRateLimiter({
    keyPrefix: 'webhook-burst',
    windowMs: 2_000,
    maxHits: 5,
  });
  private readonly sustainedLimiter = new BotRateLimiter({
    keyPrefix: 'webhook-rl',
    windowMs: 60_000,
    maxHits: 30,
  });

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly permissions: WorkspacePermissionsService,
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
  ) {}

  async list(workspaceId: string, channelId: string, actorId: string) {
    const channel = await this.requireWebhookChannel(workspaceId, channelId);
    const canManage = await this.permissions.hasChannelPermission(
      channel.workspaceId,
      channel.id,
      actorId,
      PERMISSIONS.MANAGE_CHANNEL,
    );
    if (!canManage) {
      await this.permissions.assertChannelPermission(
        channel.workspaceId,
        channel.id,
        actorId,
        PERMISSIONS.VIEW_CHANNEL,
      );
      return { canManage: false, data: [] };
    }

    const rows = await this.selectPublic()
      .where(
        and(
          eq(channelWebhooks.channelId, channel.id),
          isNull(channelWebhooks.deletedAt),
        ),
      )
      .orderBy(desc(channelWebhooks.createdAt));
    return { canManage: true, data: rows.map(toPublic) };
  }

  async create(
    workspaceId: string,
    channelId: string,
    actorId: string,
    rawName: unknown,
  ) {
    const channel = await this.requireManageableChannel(
      workspaceId,
      channelId,
      actorId,
    );
    const name =
      rawName === undefined
        ? DEFAULT_WEBHOOK_NAME
        : normalizeWebhookName(rawName);
    if (!name) throw new BadRequestException('Webhook name is required');

    const [{ active }] = await this.drizzle.db
      .select({ active: count() })
      .from(channelWebhooks)
      .where(
        and(
          eq(channelWebhooks.channelId, channel.id),
          isNull(channelWebhooks.deletedAt),
        ),
      );
    if (active >= MAX_WEBHOOKS_PER_CHANNEL) {
      throw new BadRequestException(
        `A channel can have at most ${MAX_WEBHOOKS_PER_CHANNEL} webhooks`,
      );
    }

    const webhookId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const now = new Date();
    const { token, tokenHash } = generateWebhookToken();

    await this.drizzle.db.transaction(async (tx) => {
      // Deliberately not a workspace member: it can't sign in, read channels,
      // be mentioned, or show up in member lists. It only authors messages.
      await tx.insert(user).values({
        id: userId,
        name,
        email: webhookUserEmail(webhookId),
        emailVerified: true,
        image: null,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(channelWebhooks).values({
        id: webhookId,
        workspaceId: channel.workspaceId,
        channelId: channel.id,
        userId,
        createdById: actorId,
        tokenHash,
        createdAt: now,
        updatedAt: now,
      });
    });

    return {
      ...(await this.findPublic(webhookId)),
      url: webhookPublicUrl(webhookId, token),
    };
  }

  async rename(
    workspaceId: string,
    channelId: string,
    webhookId: string,
    actorId: string,
    rawName: unknown,
  ) {
    const webhook = await this.requireManageableWebhook(
      workspaceId,
      channelId,
      webhookId,
      actorId,
    );
    const name = normalizeWebhookName(rawName);
    if (!name) throw new BadRequestException('Webhook name is required');

    await this.drizzle.db
      .update(user)
      .set({ name, updatedAt: new Date() })
      .where(eq(user.id, webhook.userId));
    return this.findPublic(webhook.id);
  }

  /** Issues a new secret; the old URL stops working immediately. */
  async regenerateToken(
    workspaceId: string,
    channelId: string,
    webhookId: string,
    actorId: string,
  ) {
    const webhook = await this.requireManageableWebhook(
      workspaceId,
      channelId,
      webhookId,
      actorId,
    );
    const { token, tokenHash } = generateWebhookToken();
    await this.drizzle.db
      .update(channelWebhooks)
      .set({ tokenHash, updatedAt: new Date() })
      .where(eq(channelWebhooks.id, webhook.id));
    return {
      ...(await this.findPublic(webhook.id)),
      url: webhookPublicUrl(webhook.id, token),
    };
  }

  async remove(
    workspaceId: string,
    channelId: string,
    webhookId: string,
    actorId: string,
  ) {
    const webhook = await this.requireManageableWebhook(
      workspaceId,
      channelId,
      webhookId,
      actorId,
    );
    // Soft delete: past messages keep their author and badge, the secret is gone.
    await this.drizzle.db
      .update(channelWebhooks)
      .set({ tokenHash: null, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(channelWebhooks.id, webhook.id));
    return { id: webhook.id };
  }

  async presignAvatar(
    workspaceId: string,
    channelId: string,
    webhookId: string,
    actorId: string,
    payload: { filename: string; contentType: string; sizeBytes: number },
  ) {
    const webhook = await this.requireManageableWebhook(
      workspaceId,
      channelId,
      webhookId,
      actorId,
    );
    return this.usersService.presignAvatar(webhook.userId, payload);
  }

  async completeAvatar(
    workspaceId: string,
    channelId: string,
    webhookId: string,
    actorId: string,
    key: string,
  ) {
    const webhook = await this.requireManageableWebhook(
      workspaceId,
      channelId,
      webhookId,
      actorId,
    );
    await this.usersService.completeAvatar(webhook.userId, key);
    return this.findPublic(webhook.id);
  }

  /** Public entry point: the URL secret is the only credential. */
  async execute(webhookId: string, token: string, body: unknown) {
    // Same answer for a bad id, a bad secret, or a deleted webhook, so the
    // endpoint never confirms which webhooks exist.
    const unknown = new NotFoundException('Unknown webhook');
    if (!UUID_RE.test(webhookId)) throw unknown;

    const [row] = await this.drizzle.db
      .select({ webhook: channelWebhooks, channel: channels })
      .from(channelWebhooks)
      .innerJoin(channels, eq(channels.id, channelWebhooks.channelId))
      .where(eq(channelWebhooks.id, webhookId));
    if (
      !row ||
      row.webhook.deletedAt ||
      !webhookTokenMatches(token, row.webhook.tokenHash)
    ) {
      throw unknown;
    }

    if (!(await this.burstLimiter.consume(row.webhook.id))) {
      throw new WebhookRateLimitedException(2);
    }
    if (!(await this.sustainedLimiter.consume(row.webhook.id))) {
      throw new WebhookRateLimitedException(60);
    }

    const content = formatWebhookPayload(body);
    if (!isWebhookChannel(row.channel)) {
      throw new ForbiddenException('This channel no longer accepts webhooks');
    }

    void this.drizzle.db
      .update(channelWebhooks)
      .set({ lastUsedAt: new Date() })
      .where(eq(channelWebhooks.id, row.webhook.id))
      .catch(() => undefined);

    const message = await this.messagesService.createFromWebhook(
      row.channel,
      row.webhook.userId,
      content,
    );
    return {
      id: message.id,
      channelId: message.channelId,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  private async requireWebhookChannel(workspaceId: string, channelId: string) {
    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(
        and(eq(channels.id, channelId), eq(channels.workspaceId, workspaceId)),
      );
    if (!channel) throw new NotFoundException('Channel not found');
    if (!isWebhookChannel(channel)) {
      throw new BadRequestException(
        'Webhooks are only available in text channels',
      );
    }
    return channel;
  }

  private async requireManageableChannel(
    workspaceId: string,
    channelId: string,
    actorId: string,
  ) {
    const channel = await this.requireWebhookChannel(workspaceId, channelId);
    await this.permissions.assertChannelPermission(
      channel.workspaceId,
      channel.id,
      actorId,
      PERMISSIONS.MANAGE_CHANNEL,
    );
    return channel;
  }

  private async requireManageableWebhook(
    workspaceId: string,
    channelId: string,
    webhookId: string,
    actorId: string,
  ) {
    const channel = await this.requireManageableChannel(
      workspaceId,
      channelId,
      actorId,
    );
    const [webhook] = await this.drizzle.db
      .select()
      .from(channelWebhooks)
      .where(
        and(
          eq(channelWebhooks.id, webhookId),
          eq(channelWebhooks.channelId, channel.id),
          isNull(channelWebhooks.deletedAt),
        ),
      );
    if (!webhook) throw new NotFoundException('Webhook not found');
    return webhook;
  }

  private selectPublic() {
    return this.drizzle.db
      .select({
        id: channelWebhooks.id,
        channelId: channelWebhooks.channelId,
        userId: channelWebhooks.userId,
        name: user.name,
        image: user.image,
        lastUsedAt: channelWebhooks.lastUsedAt,
        createdAt: channelWebhooks.createdAt,
        createdById: channelWebhooks.createdById,
        createdByName: createdByUser.name,
      })
      .from(channelWebhooks)
      .innerJoin(user, eq(user.id, channelWebhooks.userId))
      .leftJoin(
        createdByUser,
        eq(createdByUser.id, channelWebhooks.createdById),
      )
      .$dynamic();
  }

  private async findPublic(webhookId: string) {
    const [row] = await this.selectPublic().where(
      eq(channelWebhooks.id, webhookId),
    );
    if (!row) throw new NotFoundException('Webhook not found');
    return toPublic(row);
  }
}

/** Top-level text channels only: no DMs, voice rooms, or ticket threads. */
function isWebhookChannel(channel: ChannelRow): boolean {
  return channel.channelType === 'channel' && !channel.parentId;
}

function toPublic(row: {
  id: string;
  channelId: string;
  userId: string;
  name: string;
  image: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  createdById: string | null;
  createdByName: string | null;
}) {
  return {
    id: row.id,
    channelId: row.channelId,
    userId: row.userId,
    name: row.name,
    image: row.image,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    createdBy: row.createdById
      ? { id: row.createdById, name: row.createdByName ?? 'Unknown' }
      : null,
  };
}
