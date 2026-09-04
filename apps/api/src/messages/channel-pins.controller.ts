import { Controller, Get, Param } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { MessagesService } from './messages.service';

@Controller('channels/:channelId/pins')
export class ChannelPinsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findAll(
    @Param('channelId') channelId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.messagesService.listPins(channelId, session.user.id);
  }
}
