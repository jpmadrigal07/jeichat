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
import type { auth } from '../auth/auth';
import { MessagesService } from './messages.service';

@Controller('channels/:channelId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(
    @Param('channelId') channelId: string,
    @Body() body: { content: string; attachmentIds?: string[] },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.messagesService.create(
      channelId,
      session.user.id,
      body.content ?? '',
      body.attachmentIds ?? [],
    );
  }

  @Get()
  findAll(
    @Param('channelId') channelId: string,
    @Query('cursor') cursor: string | undefined,
    @Query('around') around: string | undefined,
    @Query('direction') direction: string | undefined,
    @Query('limit') limit: string | undefined,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.messagesService.findAll(channelId, session.user.id, {
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
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.messagesService.update(
      channelId,
      id,
      session.user.id,
      body.content,
    );
  }

  @Delete(':id')
  remove(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.messagesService.remove(channelId, id, session.user.id);
  }

  @Post(':id/pin')
  pin(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.messagesService.pin(channelId, id, session.user.id);
  }

  @Delete(':id/pin')
  unpin(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.messagesService.unpin(channelId, id, session.user.id);
  }

  @Post(':id/reactions')
  toggleReaction(
    @Param('channelId') channelId: string,
    @Param('id') id: string,
    @Body() body: { emoji?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.messagesService.toggleReaction(
      channelId,
      id,
      session.user.id,
      body.emoji ?? '',
    );
  }
}
