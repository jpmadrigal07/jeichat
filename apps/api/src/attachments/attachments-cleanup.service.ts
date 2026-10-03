import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { attachments } from '../database/schema';
import { StorageService } from '../storage/storage.service';

const STALE_PENDING_MS = 60 * 60 * 1000;

/** Hourly sweep for pending rows with no message (see docs/attachments/06). */
@Injectable()
export class AttachmentsCleanupService {
  private readonly logger = new Logger(AttachmentsCleanupService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
  ) {}

  @Cron('0 * * * *')
  async sweep(): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_PENDING_MS);
    const stale = await this.drizzle.db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.status, 'pending'),
          isNull(attachments.messageId),
          lt(attachments.createdAt, cutoff),
        ),
      );

    if (stale.length === 0) return;

    this.logger.log(
      `Sweeping ${stale.length} stale pending attachment(s) older than 1h`,
    );

    for (const row of stale) {
      await this.storage.delete(row.storageKey).catch((error) => {
        this.logger.warn(
          `Failed to delete R2 object ${row.storageKey} for attachment ${row.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
      await this.drizzle.db
        .delete(attachments)
        .where(eq(attachments.id, row.id));
    }
  }
}
