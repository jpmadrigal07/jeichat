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
import { Actor, BotAllowed, type RequestActor } from '../auth/actor';
import { MessagesService } from './messages.service';

@Controller('channels/:channelId/messages')
@BotAllowed()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(
    @Param('channelId') channelId: string,
    @Body()
    body: {
      content: string;
      attachmentIds?: string[];
      replyToId?: string | null;
    },
    @Actor() actor: RequestActor,
  ) {
    return this.messagesService.create(
      channelId,
      actor.userId,
      body.content ?? '',
      body.attachmentIds ?? [],
      body.replyToId,
    );
  }

  @Get()
  findAll(
    @Param('channelId') channelId: string,
    @Query('cursor') cursor: string | undefined,
    @Query('around') around: string | undefined,
    @Query('direction') direction: string | undefined,
    @Query('limit') limit: string | undefined,
    @Actor() actor: RequestActor,
  ) {
    return this.messagesService.findAll(channelId, actor.userId, {
      cursor,
      around,
      direction: direction === 'newer' ? 'newer' : 'older',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch(':id')
  update(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Body() body: { content: string },
    @Actor() actor: RequestActor,
  ) {
    return this.messagesService.update(
      channelId,
      id,
      actor.userId,
      body.content,
    );
  }

  @Delete(':id')
  remove(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Actor() actor: RequestActor,
  ) {
    return this.messagesService.remove(channelId, id, actor.userId);
  }

  @Post(':id/pin')
  pin(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Actor() actor: RequestActor,
  ) {
    return this.messagesService.pin(channelId, id, actor.userId);
  }

  @Delete(':id/pin')
  unpin(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Actor() actor: RequestActor,
  ) {
    return this.messagesService.unpin(channelId, id, actor.userId);
  }

  @Post(':id/reactions')
  toggleReaction(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Body() body: { emoji?: string },
    @Actor() actor: RequestActor,
  ) {
    return this.messagesService.toggleReaction(
      channelId,
      id,
      actor.userId,
      body.emoji ?? '',
    );
  }
}
