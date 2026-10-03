import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { Actor, BotAllowed, type RequestActor } from '../auth/actor';
import type { auth } from '../auth/auth';
import { BotsService } from './bots.service';

@Controller()
export class BotsController {
  constructor(private readonly botsService: BotsService) {}

  @Get('bots/@me')
  @BotAllowed()
  me(@Actor() actor: RequestActor) {
    return this.botsService.me(actor);
  }

  @Post('workspaces/:workspaceId/bots')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.botsService.create(
      workspaceId,
      session.user.id,
      body.name ?? '',
    );
  }

  @Get('workspaces/:workspaceId/bots')
  list(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.botsService.list(workspaceId, session.user.id);
  }

  @Patch('workspaces/:workspaceId/bots/:botId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Body() body: { name?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.botsService.updateName(
      workspaceId,
      botId,
      session.user.id,
      body.name ?? '',
    );
  }

  @Post('workspaces/:workspaceId/bots/:botId/token')
  regenerate(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.botsService.regenerateToken(
      workspaceId,
      botId,
      session.user.id,
    );
  }

  @Post('workspaces/:workspaceId/bots/:botId/disable')
  disable(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.botsService.disable(workspaceId, botId, session.user.id);
  }
}
