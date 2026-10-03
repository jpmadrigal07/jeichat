import { Controller, Get, Param, Post } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { InboxService } from './inbox.service';

@Controller('workspaces/:workspaceId/inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  list(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.inboxService.list(workspaceId, session.user.id);
  }

  @Get('unread-count')
  unreadCount(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.inboxService.unreadCount(workspaceId, session.user.id);
  }

  @Post('read-all')
  markAllRead(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.inboxService.markAllRead(workspaceId, session.user.id);
  }

  @Post(':id/read')
  markRead(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.inboxService.markRead(workspaceId, id, session.user.id);
  }
}
