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
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  create(
    @Body() body: { name: string; icon?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.create(
      body.name,
      body.icon ?? null,
      session.user.id,
    );
  }

  @Get()
  findAll(@Session() session: UserSession<typeof auth>) {
    return this.workspacesService.findAllForUser(session.user.id);
  }

  @Get(':id/labels')
  findLabels(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.findLabels(id, session.user.id);
  }

  @Post(':id/labels')
  createLabel(
    @Param('id') id: string,
    @Body() body: { name: string; color?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.createLabel(id, session.user.id, body);
  }

  @Patch(':id/labels/:labelId')
  updateLabel(
    @Param('id') id: string,
    @Param('labelId') labelId: string,
    @Body() body: { name?: string; color?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.updateLabel(
      id,
      session.user.id,
      labelId,
      body,
    );
  }

  @Delete(':id/labels/:labelId')
  deleteLabel(
    @Param('id') id: string,
    @Param('labelId') labelId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.deleteLabel(id, session.user.id, labelId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.findOne(id, session.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; icon?: string | null },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.update(id, session.user.id, body);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.remove(id, session.user.id);
  }

  @Get(':id/members')
  findMembers(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.findMembers(id, session.user.id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() body: { email?: string; userId?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.addMember(id, session.user.id, body);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.workspacesService.removeMember(id, session.user.id, userId);
  }
}
