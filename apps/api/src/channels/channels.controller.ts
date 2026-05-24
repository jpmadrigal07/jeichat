import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
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
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { name: string; description?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.create(
      workspaceId,
      session.user.id,
      body.name,
      body.description ?? null,
    );
  }

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.findAll(workspaceId, session.user.id);
  }

  @Get('unread-counts')
  getUnreadCounts(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.getUnreadCounts(
      workspaceId,
      session.user.id,
    );
  }

  @Post(':id/read')
  markAsRead(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.markAsRead(
      workspaceId,
      id,
      session.user.id,
    );
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

  @Get(':id')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.findOne(workspaceId, id, session.user.id);
  }

  @Patch(':id')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string | null },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.update(workspaceId, id, session.user.id, body);
  }

  @Delete(':id')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.channelsService.remove(workspaceId, id, session.user.id);
  }
}
