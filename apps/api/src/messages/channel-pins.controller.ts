import { Controller, Get, Param } from '@nestjs/common';
import { Actor, BotAllowed, type RequestActor } from '../auth/actor';
import { MessagesService } from './messages.service';

@Controller('channels/:channelId/pins')
@BotAllowed()
export class ChannelPinsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findAll(
    @Param('channelId') channelId: string,
    @Actor() actor: RequestActor,
  ) {
    return this.messagesService.listPins(channelId, actor.userId);
  }
}
