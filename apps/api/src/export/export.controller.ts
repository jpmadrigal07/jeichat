import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import type { auth } from '../auth/auth';
import { ExportService } from './export.service';

@Controller('channels/:channelId/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  async exportChannel(
    @Param('channelId') channelId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Session() session: UserSession<typeof auth>,
    @Res() res: Response,
  ) {
    const markdown = await this.exportService.exportChannelAsMarkdown(
      channelId,
      session.user.id,
      from,
      to,
    );

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${markdown.filename}"`,
    );
    res.send(markdown.content);
  }
}
