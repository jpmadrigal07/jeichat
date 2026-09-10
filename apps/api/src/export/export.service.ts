import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, inArray, lte, or } from 'drizzle-orm';
import type { Response } from 'express';
import { ZipFile } from 'yazl';
import { ATTACHMENT_PURPOSE } from '../attachments/attachments.helpers';
import { DrizzleService } from '../database/drizzle.service';
import { attachments, channels, messages, workspaces } from '../database/schema';
import { user } from '../database/schema/auth';
import { StorageService } from '../storage/storage.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  embedAttachmentMarkdown,
  embedDescriptionMarkdown,
  embedMessageMarkdown,
  embedTicketAttachmentsMarkdown,
  sanitizeDownloadBasename,
  zipEntryFilename,
} from './export-markdown';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_EXPORT_ZIP_BYTES = 200 * 1024 * 1024;

type ExportAttachmentRow = {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  entryName: string;
};

type ExportMessageRow = {
  id: string;
  content: string;
  createdAt: Date;
  senderName: string | null;
  sourceLabel: string | null;
  attachments: ExportAttachmentRow[];
};

type TicketAttachmentGroup = {
  sourceLabel: string | null;
  attachments: ExportAttachmentRow[];
};

type PreparedChannelExport = {
  markdown: string;
  zipMarkdown: string;
  files: ExportAttachmentRow[];
  basename: string;
};

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
    private readonly storage: StorageService,
  ) {}

  async exportChannelAsMarkdown(
    channelId: string,
    userId: string,
    from?: string,
    to?: string,
  ) {
    const prepared = await this.prepareChannelExport(
      channelId,
      userId,
      from,
      to,
    );
    return {
      content: prepared.markdown,
      filename: `${prepared.basename}.md`,
    };
  }

  async exportChannelAsZip(
    channelId: string,
    userId: string,
    res: Response,
    from?: string,
    to?: string,
  ) {
    const prepared = await this.prepareChannelExport(
      channelId,
      userId,
      from,
      to,
    );

    const totalBytes = prepared.files.reduce(
      (sum, file) => sum + file.sizeBytes,
      0,
    );
    if (totalBytes > MAX_EXPORT_ZIP_BYTES) {
      throw new BadRequestException(
        'Export is too large to include files. Narrow the date range or download markdown only.',
      );
    }

    const zipName = `${prepared.basename}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      contentDispositionAttachment(zipName),
    );

    const zipfile = new ZipFile();
    zipfile.once('error', (error: Error) => {
      if (!res.destroyed) res.destroy(error);
    });
    const piping = pipeline(zipfile.outputStream as Readable, res);

    zipfile.addBuffer(
      Buffer.from(prepared.zipMarkdown, 'utf8'),
      'messages.md',
    );

    for (const file of prepared.files) {
      const object = await this.storage.getObject(file.storageKey);
      if (!object) {
        this.logger.warn(
          `Export skipped missing object ${file.storageKey} for attachment ${file.id}`,
        );
        continue;
      }
      const buffer = await readableToBuffer(object.body);
      zipfile.addBuffer(buffer, `files/${file.entryName}`, {
        compress: false,
      });
    }

    zipfile.end();
    await piping;
  }

  private async prepareChannelExport(
    channelId: string,
    userId: string,
    from?: string,
    to?: string,
  ): Promise<PreparedChannelExport> {
    const [channel] = await this.drizzle.db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel) throw new NotFoundException('Channel not found');

    await this.workspacesService.verifyMembership(channel.workspaceId, userId);

    const [workspace] = await this.drizzle.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, channel.workspaceId));

    if (!from || !to) {
      throw new BadRequestException('From and To dates are required');
    }

    const fromDate = parseExportDate(from, 'From');
    const toDate = parseExportDate(to, 'To');
    if (fromDate > toDate) {
      throw new BadRequestException('From date must be on or before To date');
    }

    const maxTo = addUtcMonths(fromDate, 1).getTime() + MS_PER_DAY - 1;
    if (toDate.getTime() > maxTo) {
      throw new BadRequestException('Export range cannot exceed 1 month');
    }

    const exportChannelScope = channel.parentId
      ? eq(channels.id, channelId)
      : or(eq(channels.id, channelId), eq(channels.parentId, channelId));

    const exportChannels = await this.drizzle.db
      .select({
        id: channels.id,
        name: channels.name,
        ticketKey: channels.ticketKey,
      })
      .from(channels)
      .where(exportChannelScope);

    const channelIds = exportChannels.map((row) => row.id);
    const sourceLabelByChannelId = new Map(
      exportChannels.map((row) => [
        row.id,
        row.id === channelId ? null : channelSourceLabel(row),
      ]),
    );

    const rows = await this.drizzle.db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderName: user.name,
      })
      .from(messages)
      .leftJoin(user, eq(messages.senderId, user.id))
      .where(
        and(
          inArray(messages.channelId, channelIds),
          gte(messages.createdAt, fromDate),
          lte(messages.createdAt, toDate),
        ),
      )
      .orderBy(asc(messages.createdAt));

    const attachmentsByMessageId = await this.loadAttachmentsByMessageIds(
      rows.map((row) => row.id),
    );
    const threadAttachmentsByChannelId =
      await this.loadThreadAttachmentsByChannelIds(channelIds);

    const messagesForMarkdown: ExportMessageRow[] = rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      senderName: row.senderName,
      sourceLabel: sourceLabelByChannelId.get(row.channelId) ?? null,
      attachments: attachmentsByMessageId.get(row.id) ?? [],
    }));

    const ticketGroups: TicketAttachmentGroup[] = exportChannels.flatMap(
      (exportChannel) => {
        const ticketFiles =
          threadAttachmentsByChannelId.get(exportChannel.id) ?? [];
        if (ticketFiles.length === 0) return [];
        return [
          {
            sourceLabel:
              sourceLabelByChannelId.get(exportChannel.id) ?? null,
            attachments: ticketFiles,
          },
        ];
      },
    );

    const files = uniqueAttachments([
      ...ticketGroups.flatMap((group) => group.attachments),
      ...messagesForMarkdown.flatMap((row) => row.attachments),
    ]);
    const date = new Date().toISOString().slice(0, 10);
    const basename = sanitizeDownloadBasename(
      `${workspace.name}-${channel.name}-${date}`,
    );

    return {
      markdown: this.buildMarkdown(
        workspace,
        channel,
        messagesForMarkdown,
        ticketGroups,
        from,
        to,
        false,
      ),
      zipMarkdown: this.buildMarkdown(
        workspace,
        channel,
        messagesForMarkdown,
        ticketGroups,
        from,
        to,
        true,
      ),
      files,
      basename,
    };
  }

  private async loadAttachmentsByMessageIds(
    messageIds: string[],
  ): Promise<Map<string, ExportAttachmentRow[]>> {
    const grouped = new Map<string, ExportAttachmentRow[]>();
    if (!messageIds.length) return grouped;

    const rows = await this.drizzle.db
      .select({
        messageId: attachments.messageId,
        id: attachments.id,
        filename: attachments.filename,
        contentType: attachments.contentType,
        sizeBytes: attachments.sizeBytes,
        storageKey: attachments.storageKey,
      })
      .from(attachments)
      .where(
        and(
          inArray(attachments.messageId, messageIds),
          eq(attachments.status, 'uploaded'),
        ),
      );

    for (const row of rows) {
      if (!row.messageId) continue;
      const list = grouped.get(row.messageId) ?? [];
      list.push(toExportAttachment(row));
      grouped.set(row.messageId, list);
    }

    return grouped;
  }

  private async loadThreadAttachmentsByChannelIds(
    channelIds: string[],
  ): Promise<Map<string, ExportAttachmentRow[]>> {
    const grouped = new Map<string, ExportAttachmentRow[]>();
    if (!channelIds.length) return grouped;

    const rows = await this.drizzle.db
      .select({
        channelId: attachments.channelId,
        id: attachments.id,
        filename: attachments.filename,
        contentType: attachments.contentType,
        sizeBytes: attachments.sizeBytes,
        storageKey: attachments.storageKey,
      })
      .from(attachments)
      .where(
        and(
          inArray(attachments.channelId, channelIds),
          eq(attachments.purpose, ATTACHMENT_PURPOSE.THREAD),
          eq(attachments.status, 'uploaded'),
        ),
      )
      .orderBy(asc(attachments.createdAt));

    for (const row of rows) {
      const list = grouped.get(row.channelId) ?? [];
      list.push(toExportAttachment(row));
      grouped.set(row.channelId, list);
    }

    return grouped;
  }

  private buildMarkdown(
    workspace: { name: string },
    channel: { name: string; description: string | null },
    rows: ExportMessageRow[],
    ticketGroups: TicketAttachmentGroup[],
    from: string | undefined,
    to: string | undefined,
    linkFiles: boolean,
  ) {
    const lines: string[] = [];
    const attachmentCount =
      rows.reduce((sum, row) => sum + row.attachments.length, 0) +
      ticketGroups.reduce((sum, group) => sum + group.attachments.length, 0);

    lines.push(`# ${workspace.name} / #${channel.name}`);
    lines.push('');

    if (channel.description) {
      lines.push(embedDescriptionMarkdown(channel.description));
      lines.push('');
    }

    const ticketSection = embedTicketAttachmentsMarkdown(
      ticketGroups,
      linkFiles,
    );
    if (ticketSection) {
      lines.push(ticketSection);
    }

    const today = new Date().toISOString().slice(0, 10);
    const dateRangeFrom = from
      ? from.slice(0, 10)
      : (rows[0]?.createdAt.toISOString().slice(0, 10) ?? today);
    const dateRangeTo = to
      ? to.slice(0, 10)
      : (rows[rows.length - 1]?.createdAt.toISOString().slice(0, 10) ?? today);

    lines.push(`**Exported:** ${today}  `);
    lines.push(`**Messages:** ${rows.length}  `);
    lines.push(`**Attachments:** ${attachmentCount}  `);
    lines.push(`**Date range:** ${dateRangeFrom} — ${dateRangeTo}`);
    lines.push('');
    lines.push('---');

    const grouped = this.groupByDate(rows);

    for (const [date, msgs] of grouped) {
      lines.push('');
      lines.push(`### ${date}`);
      lines.push('');

      for (const msg of msgs) {
        const time = msg.createdAt.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        const source = msg.sourceLabel ? ` · ${msg.sourceLabel}` : '';
        lines.push(
          `**${msg.senderName ?? 'Unknown'}** (${time})${source}:  `,
        );

        const body = embedMessageMarkdown(msg.content);
        if (body.trim()) {
          lines.push(body);
        }

        for (const attachment of msg.attachments) {
          const relativePath = linkFiles
            ? `files/${attachment.entryName}`
            : undefined;
          lines.push(embedAttachmentMarkdown(attachment, relativePath));
          lines.push('');
        }

        if (msg.attachments.length === 0) {
          lines.push('');
        }
      }

      lines.push('---');
    }

    return lines.join('\n');
  }

  private groupByDate(rows: ExportMessageRow[]) {
    const map = new Map<string, ExportMessageRow[]>();

    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(row);
    }

    return map;
  }
}

function toExportAttachment(row: {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
}): ExportAttachmentRow {
  return {
    id: row.id,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    entryName: zipEntryFilename(row.id, row.filename),
  };
}

function uniqueAttachments(
  files: ExportAttachmentRow[],
): ExportAttachmentRow[] {
  const byId = new Map<string, ExportAttachmentRow>();
  for (const file of files) {
    byId.set(file.id, file);
  }
  return [...byId.values()];
}

async function readableToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function contentDispositionAttachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function channelSourceLabel(channel: {
  name: string;
  ticketKey: string | null;
}): string {
  return channel.ticketKey
    ? `${channel.ticketKey} ${channel.name}`
    : `#${channel.name}`;
}

function parseExportDate(value: string, label: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid ${label} date`);
  }
  return date;
}

function addUtcMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
