import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Param,
  Body,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import type { Permission } from './permissions';
import { WorkspaceRolesService } from './workspace-roles.service';

@Controller('workspaces/:workspaceId/roles')
export class WorkspaceRolesController {
  constructor(private readonly workspaceRolesService: WorkspaceRolesService) {}

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.findAll(workspaceId, session.user.id);
  }

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: { name: string; color?: string; permissions?: Permission[] },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.create(
      workspaceId,
      session.user.id,
      body,
    );
  }

  @Get(':roleId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.findOne(
      workspaceId,
      roleId,
      session.user.id,
    );
  }

  @Patch(':roleId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Body()
    body: {
      name?: string;
      color?: string;
      permissions?: Permission[];
      position?: number;
    },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.update(
      workspaceId,
      roleId,
      session.user.id,
      body,
    );
  }

  @Delete(':roleId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.remove(
      workspaceId,
      roleId,
      session.user.id,
    );
  }

  @Post(':roleId/members')
  addMember(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Body() body: { userId: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.addMember(
      workspaceId,
      roleId,
      session.user.id,
      body.userId,
    );
  }

  @Delete(':roleId/members/:userId')
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Param('userId') userId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.removeMember(
      workspaceId,
      roleId,
      session.user.id,
      userId,
    );
  }

  @Put(':roleId/channels/:channelId')
  setChannelPermissions(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Param('channelId') channelId: string,
    @Body()
    body: { allowPermissions: Permission[]; denyPermissions: Permission[] },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspaceRolesService.setChannelPermissions(
      workspaceId,
      roleId,
      channelId,
      session.user.id,
      body,
    );
  }
}
