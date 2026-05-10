import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { channels, messages, workspaces } from '../database/schema';
import { user } from '../database/schema/auth';
import { WorkspacesService } from '../workspaces/workspaces.service';

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

    const conditions = [eq(messages.channelId, channelId)];
    if (from) conditions.push(gte(messages.createdAt, new Date(from)));
    if (to) conditions.push(lte(messages.createdAt, new Date(to)));

    const rows = await this.drizzle.db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        senderName: user.name,
      })
      .from(messages)
      .leftJoin(user, eq(messages.senderId, user.id))
      .where(and(...conditions))
      .orderBy(asc(messages.createdAt));

    const content = this.buildMarkdown(workspace!, channel, rows, from, to);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${workspace!.name}-${channel.name}-${date}.md`;

    return { content, filename };
  }

  private buildMarkdown(
    workspace: { name: string },
    channel: { name: string; description: string | null },
    rows: { content: string; createdAt: Date; senderName: string | null }[],
    from?: string,
    to?: string,
  ) {
    const lines: string[] = [];

    lines.push(`# ${workspace.name} / #${channel.name}`);
    lines.push('');

    if (channel.description) {
      lines.push(`> ${channel.description}`);
      lines.push('');
    }

    const today = new Date().toISOString().slice(0, 10);
    const dateRangeFrom = from ? from.slice(0, 10) : (rows[0]?.createdAt.toISOString().slice(0, 10) ?? today);
    const dateRangeTo = to ? to.slice(0, 10) : (rows[rows.length - 1]?.createdAt.toISOString().slice(0, 10) ?? today);

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
        lines.push(`**${msg.senderName ?? 'Unknown'}** (${time}):  `);
        lines.push(msg.content);
        lines.push('');
      }

      lines.push('---');
    }

    return lines.join('\n');
  }

  private groupByDate(
    rows: { content: string; createdAt: Date; senderName: string | null }[],
  ) {
    const map = new Map<
      string,
      { content: string; createdAt: Date; senderName: string | null }[]
    >();

    for (const row of rows) {
      const date = row.createdAt.toISOString().slice(0, 10);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(row);
    }

    return map;
  }
}
