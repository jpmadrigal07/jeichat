import { Injectable, Logger } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import webpush from 'web-push';
import { DrizzleService } from '../database/drizzle.service';
import { pushSubscriptions } from '../database/schema';
import type { PushNotificationPayload } from './push-payload';

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function isExpiredPushSubscription(error: unknown) {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return false;
  }
  const statusCode = error.statusCode;
  return statusCode === 404 || statusCode === 410;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly configured: boolean;

  constructor(private readonly drizzle: DrizzleService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:jeichat@localhost';
    this.configured = Boolean(publicKey && privateKey);
    if (this.configured && publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      this.logger.warn('VAPID keys are not set; web push is disabled');
    }
  }

  async subscribe(
    userId: string,
    subscription: PushSubscriptionInput,
    userAgent?: string,
  ) {
    const now = new Date();
    const [existing] = await this.drizzle.db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

    if (existing) {
      await this.drizzle.db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: userAgent ?? null,
          updatedAt: now,
        })
        .where(eq(pushSubscriptions.id, existing.id));
      return { id: existing.id };
    }

    const id = crypto.randomUUID();
    await this.drizzle.db.insert(pushSubscriptions).values({
      id,
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.drizzle.db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.endpoint, endpoint),
          eq(pushSubscriptions.userId, userId),
        ),
      );
    return { ok: true as const };
  }

  async notifyUsers(userIds: string[], payload: PushNotificationPayload) {
    if (!this.configured || userIds.length === 0) return;

    const uniqueIds = [...new Set(userIds)];
    const rows = await this.drizzle.db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, uniqueIds));

    await Promise.all(rows.map((row) => this.sendToSubscription(row, payload)));
  }

  private async sendToSubscription(
    row: typeof pushSubscriptions.$inferSelect,
    payload: PushNotificationPayload,
  ) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        JSON.stringify(payload),
        { TTL: 86_400, urgency: 'high' },
      );
    } catch (error) {
      if (isExpiredPushSubscription(error)) {
        await this.drizzle.db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, row.id));
        return;
      }
      this.logger.warn(
        `Failed to push to ${row.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
