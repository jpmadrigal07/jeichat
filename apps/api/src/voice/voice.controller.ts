import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  AllowAnonymous,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import type { auth } from '../auth/auth';
import { VoiceService } from './voice.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller()
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Get('workspaces/:workspaceId/voice/participants')
  listParticipants(
    @Param('workspaceId') workspaceId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.voiceService.listParticipants(workspaceId, session.user.id);
  }

  @Post('workspaces/:workspaceId/voice/:channelId/token')
  createToken(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.voiceService.createToken(workspaceId, channelId, {
      id: session.user.id,
      name: session.user.name,
    });
  }

  @Post('workspaces/:workspaceId/voice/:channelId/sync')
  @HttpCode(204)
  async sync(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    await this.voiceService.syncChannel(
      workspaceId,
      channelId,
      session.user.id,
    );
  }

  /** LiveKit webhook (project settings → Webhooks); verified by its signed JWT. */
  @Post('voice/webhook')
  @AllowAnonymous()
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest,
    @Headers('authorization') authorization: string | undefined,
  ) {
    await this.voiceService.handleWebhook(req.rawBody, authorization);
    return { ok: true };
  }
}
