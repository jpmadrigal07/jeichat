import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { parseNotificationLevel } from './notification-level';
import { NotificationSettingsService } from './notification-settings.service';

@Controller('workspaces/:workspaceId/notification-settings')
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
  ) {}

  @Get()
  list(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.notificationSettingsService.list(workspaceId, session.user.id);
  }

  @Put(':channelId')
  set(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Body() body: { level?: unknown },
    @Session() session: UserSession<typeof auth>,
  ) {
    const level = parseNotificationLevel(body?.level);
    if (!level) {
      throw new BadRequestException(
        'level must be one of: all, mentions, muted',
      );
    }
    return this.notificationSettingsService.set(
      workspaceId,
      channelId,
      session.user.id,
      level,
    );
  }
}
