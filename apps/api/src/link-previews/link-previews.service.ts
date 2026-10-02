import { Injectable, Logger } from '@nestjs/common';
import { asc, eq, inArray, notInArray, and } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { messageLinkPreviews, messages } from '../database/schema';
import { buildLinkPreview, type ParsedLinkPreview } from './build-link-preview';
import { extractPreviewUrls } from './extract-urls';
import { safeFetchDocument } from './safe-fetch';

export type MessageLinkPreviewPublic = {
  id: string;
  url: string;
  kind: 'link' | 'image';
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const FAILURE_TTL_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
/** Outbound unfurls allowed at once; beyond this a preview is skipped, not queued. */
const MAX_IN_FLIGHT = 16;

type PreviewRow = typeof messageLinkPreviews.$inferSelect;

function toPublic(row: PreviewRow): MessageLinkPreviewPublic {
  return {
    id: row.id,
    url: row.url,
    kind: row.kind === 'image' ? 'image' : 'link',
    title: row.title,
    description: row.description,
    siteName: row.siteName,
    imageUrl: row.imageUrl,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
  };
}

@Injectable()
export class LinkPreviewsService {
  private readonly logger = new Logger(LinkPreviewsService.name);
  private readonly appOrigins = (process.env.WEB_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  private readonly cache = new Map<
    string,
    { expiresAt: number; preview: ParsedLinkPreview | null }
  >();
  private inFlight = 0;

  constructor(private readonly drizzle: DrizzleService) {}

  async loadByMessageIds(
    messageIds: string[],
  ): Promise<Map<string, MessageLinkPreviewPublic[]>> {
    const grouped = new Map<string, MessageLinkPreviewPublic[]>();
    if (!messageIds.length) return grouped;

    const rows = await this.drizzle.db
      .select()
      .from(messageLinkPreviews)
      .where(inArray(messageLinkPreviews.messageId, messageIds))
      .orderBy(
        asc(messageLinkPreviews.position),
        asc(messageLinkPreviews.createdAt),
      );

    for (const row of rows) {
      const list = grouped.get(row.messageId) ?? [];
      list.push(toPublic(row));
      grouped.set(row.messageId, list);
    }
    return grouped;
  }

  /**
   * Removes every preview from a message and remembers that, so editing the
   * message later does not fetch them again.
   */
  async suppressForMessage(messageId: string): Promise<void> {
    await this.drizzle.db.transaction(async (tx) => {
      await tx
        .update(messages)
        .set({ linkPreviewsSuppressed: true })
        .where(eq(messages.id, messageId));
      await tx
        .delete(messageLinkPreviews)
        .where(eq(messageLinkPreviews.messageId, messageId));
    });
  }

  /**
   * Drops previews whose URL is no longer in `content` and re-orders the rest.
   * Cheap (no network), so an edit can await it and never flash a stale card.
   */
  async reconcileForMessage(messageId: string, content: string): Promise<void> {
    const wanted = extractPreviewUrls(content, this.appOrigins);

    await this.drizzle.db
      .delete(messageLinkPreviews)
      .where(
        wanted.length
          ? and(
              eq(messageLinkPreviews.messageId, messageId),
              notInArray(messageLinkPreviews.url, wanted),
            )
          : eq(messageLinkPreviews.messageId, messageId),
      );

    const remaining = await this.drizzle.db
      .select({
        id: messageLinkPreviews.id,
        url: messageLinkPreviews.url,
        position: messageLinkPreviews.position,
      })
      .from(messageLinkPreviews)
      .where(eq(messageLinkPreviews.messageId, messageId));

    for (const row of remaining) {
      const position = wanted.indexOf(row.url);
      if (position === -1 || position === row.position) continue;
      await this.drizzle.db
        .update(messageLinkPreviews)
        .set({ position })
        .where(eq(messageLinkPreviews.id, row.id));
    }
  }

  /**
   * Unfurls URLs in `content` that have no preview yet and stores the results.
   * Returns the message's full, ordered preview list when something was added,
   * or null when nothing changed (nothing new to show, or the message is gone).
   */
  async syncForMessage(
    messageId: string,
    content: string,
  ): Promise<MessageLinkPreviewPublic[] | null> {
    const wanted = extractPreviewUrls(content, this.appOrigins);
    if (wanted.length === 0) return null;
    if (await this.isSuppressed(messageId)) return null;

    const existing = await this.drizzle.db
      .select({ url: messageLinkPreviews.url })
      .from(messageLinkPreviews)
      .where(eq(messageLinkPreviews.messageId, messageId));
    const have = new Set(existing.map((row) => row.url));

    const unfurled = new Map<string, ParsedLinkPreview>();
    await Promise.all(
      wanted
        .filter((url) => !have.has(url))
        .map(async (url) => {
          const preview = await this.unfurl(url);
          if (preview) unfurled.set(url, preview);
        }),
    );
    if (unfurled.size === 0) return null;

    // The message may have been edited, deleted or had its previews removed
    // while the pages loaded; only keep results it still wants.
    const [current] = await this.drizzle.db
      .select({
        content: messages.content,
        suppressed: messages.linkPreviewsSuppressed,
      })
      .from(messages)
      .where(eq(messages.id, messageId));
    if (!current || current.suppressed) return null;
    const currentWanted = extractPreviewUrls(current.content, this.appOrigins);

    const rows = [...unfurled]
      .filter(([url]) => currentWanted.includes(url))
      .map(([url, preview]) => ({
        id: crypto.randomUUID(),
        messageId,
        url,
        position: currentWanted.indexOf(url),
        kind: preview.kind,
        title: preview.title,
        description: preview.description,
        siteName: preview.siteName,
        imageUrl: preview.imageUrl,
        imageWidth: preview.imageWidth,
        imageHeight: preview.imageHeight,
      }));
    if (rows.length === 0) return null;

    await this.drizzle.db
      .insert(messageLinkPreviews)
      .values(rows)
      .onConflictDoNothing();

    return (await this.loadByMessageIds([messageId])).get(messageId) ?? [];
  }

  private async isSuppressed(messageId: string): Promise<boolean> {
    const [row] = await this.drizzle.db
      .select({ suppressed: messages.linkPreviewsSuppressed })
      .from(messages)
      .where(eq(messages.id, messageId));
    return row?.suppressed ?? true;
  }

  private async unfurl(url: string): Promise<ParsedLinkPreview | null> {
    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > Date.now()) return cached.preview;

    if (this.inFlight >= MAX_IN_FLIGHT) return null;
    this.inFlight += 1;
    try {
      const preview = buildLinkPreview(await safeFetchDocument(url));
      this.remember(url, preview, CACHE_TTL_MS);
      return preview;
    } catch (error) {
      this.logger.debug(
        `No preview for ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.remember(url, null, FAILURE_TTL_MS);
      return null;
    } finally {
      this.inFlight -= 1;
    }
  }

  private remember(
    url: string,
    preview: ParsedLinkPreview | null,
    ttlMs: number,
  ) {
    this.cache.delete(url);
    this.cache.set(url, { preview, expiresAt: Date.now() + ttlMs });
    if (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
  }
}
