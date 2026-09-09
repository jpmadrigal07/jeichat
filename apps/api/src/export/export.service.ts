import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, inArray, lte, or } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { channels, messages, workspaces } from '../database/schema';
import { user } from '../database/schema/auth';
import { WorkspacesService } from '../workspaces/workspaces.service';
import {
  embedDescriptionMarkdown,
  embedMessageMarkdown,
} from './export-markdown';

@Injectable()
export class ExportService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async exportChannelAsMarkdown(
    channelId: string,
    userId: string,
    from?: string,
    to?: string,
  ) {
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

    const content = this.buildMarkdown(
      workspace,
      channel,
      rows.map((row) => ({
        content: row.content,
        createdAt: row.createdAt,
        senderName: row.senderName,
        sourceLabel: sourceLabelByChannelId.get(row.channelId) ?? null,
      })),
      from,
      to,
    );
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${workspace.name}-${channel.name}-${date}.md`;

    return { content, filename };
  }

  private buildMarkdown(
    workspace: { name: string },
    channel: { name: string; description: string | null },
    rows: ExportMessageRow[],
    from?: string,
    to?: string,
  ) {
    const lines: string[] = [];

    lines.push(`# ${workspace.name} / #${channel.name}`);
    lines.push('');

    if (channel.description) {
      lines.push(embedDescriptionMarkdown(channel.description));
      lines.push('');
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
        lines.push(embedMessageMarkdown(msg.content));
        lines.push('');
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

type ExportMessageRow = {
  content: string;
  createdAt: Date;
  senderName: string | null;
  sourceLabel: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
