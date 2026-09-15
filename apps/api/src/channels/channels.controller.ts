import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { Actor, BotAllowed, type RequestActor } from '../auth/actor';
import type { auth } from '../auth/auth';
import { ChannelsService } from './channels.service';
import { WorkspaceRolesService } from '../workspaces/workspace-roles.service';

@Controller('workspaces/:workspaceId/channels')
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly workspaceRolesService: WorkspaceRolesService,
  ) {}

  @Post()
  @BotAllowed()
  create(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      ticketKey?: string;
      isPrivate?: boolean;
      memberIds?: string[];
    },
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.create(
      workspaceId,
      actor.userId,
      body.name,
      body.description ?? null,
      body.ticketKey,
      Boolean(body.isPrivate),
      Array.isArray(body.memberIds) ? body.memberIds : [],
    );
  }

  @Get()
  @BotAllowed()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.findAll(workspaceId, actor.userId);
  }

  @Get('unread-counts')
  getUnreadCounts(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.getUnreadCounts(workspaceId, session.user.id);
  }

  @Post('dms')
  createDm(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { userId: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.createOrGetDm(
      workspaceId,
      session.user.id,
      body.userId,
    );
  }

  @Get(':id/events')
  @BotAllowed()
  listEvents(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.listEvents(workspaceId, id, actor.userId);
  }

  @Get(':id/threads')
  @BotAllowed()
  listThreads(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Query('archived') archived: string | undefined,
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.listThreads(
      workspaceId,
      id,
      actor.userId,
      archived === 'true',
    );
  }

  @Post(':id/threads')
  @BotAllowed()
  createThread(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      description?: string;
      attachmentIds?: string[];
      status?: string;
    },
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.createThread(
      workspaceId,
      id,
      actor.userId,
      body.name ?? '',
      body.description ?? null,
      body.attachmentIds ?? [],
      body.status,
    );
  }

  @Post(':id/read')
  markAsRead(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.markAsRead(workspaceId, id, session.user.id);
  }

  @Post(':id/role-permissions')
  assignRole(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { roleId: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.assignRoleToChannel(
      workspaceId,
      id,
      body.roleId,
      session.user.id,
    );
  }

  @Delete(':id/role-permissions/:roleId')
  removeRole(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.removeRoleFromChannel(
      workspaceId,
      id,
      roleId,
      session.user.id,
    );
  }

  @Get(':id/role-permissions')
  getRolePermissions(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.findChannelRolePermissions(
      workspaceId,
      id,
      session.user.id,
    );
  }

  @Get(':id/members')
  @BotAllowed()
  listMembers(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.listMembers(workspaceId, id, actor.userId);
  }

  @Post(':id/members')
  @BotAllowed()
  addMember(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { userId: string },
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.addMember(
      workspaceId,
      id,
      actor.userId,
      body.userId,
    );
  }

  @Delete(':id/members/:userId')
  @BotAllowed()
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.removeMember(
      workspaceId,
      id,
      actor.userId,
      userId,
    );
  }

  @Get(':id')
  @BotAllowed()
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.findOne(workspaceId, id, actor.userId);
  }

  @Patch(':id')
  @BotAllowed()
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string | null;
      ticketKey?: string;
      addAttachmentIds?: string[];
      removeAttachmentIds?: string[];
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueAt?: string | null;
      labelIds?: string[];
      watcherIds?: string[];
      isPrivate?: boolean;
      archived?: boolean;
    },
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.update(workspaceId, id, actor.userId, body);
  }

  @Delete(':id')
  @BotAllowed()
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Actor() actor: RequestActor,
  ) {
    return this.channelsService.remove(workspaceId, id, actor.userId);
  }
}
