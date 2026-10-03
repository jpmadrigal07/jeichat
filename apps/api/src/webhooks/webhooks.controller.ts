import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  AllowAnonymous,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import type { auth } from '../auth/auth';
import {
  WebhookRateLimitedException,
  WebhooksService,
} from './webhooks.service';

@Controller()
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  /**
   * Public: `curl -X POST <url> -H 'Content-Type: application/json' -d '{"content":"hi"}'`.
   * Replies 204, or 200 with the message when `?wait=true`.
   */
  @Post('webhooks/:webhookId/:token')
  @AllowAnonymous()
  async execute(
    @Param('webhookId') webhookId: string,
    @Param('token') token: string,
    @Query('wait') wait: string | undefined,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const message = await this.webhooks.execute(webhookId, token, body);
      if (wait === 'true') {
        res.status(200);
        return message;
      }
      res.status(204);
      return undefined;
    } catch (error) {
      if (error instanceof WebhookRateLimitedException) {
        res.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      throw error;
    }
  }

  @Get('workspaces/:workspaceId/channels/:channelId/webhooks')
  list(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.webhooks.list(workspaceId, channelId, session.user.id);
  }

  @Post('workspaces/:workspaceId/channels/:channelId/webhooks')
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Body() body: { name?: unknown } | undefined,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.webhooks.create(
      workspaceId,
      channelId,
      session.user.id,
      body?.name,
    );
  }

  @Patch('workspaces/:workspaceId/channels/:channelId/webhooks/:webhookId')
  rename(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('webhookId') webhookId: string,
    @Body() body: { name?: unknown } | undefined,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.webhooks.rename(
      workspaceId,
      channelId,
      webhookId,
      session.user.id,
      body?.name,
    );
  }

  @Post('workspaces/:workspaceId/channels/:channelId/webhooks/:webhookId/token')
  regenerate(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('webhookId') webhookId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.webhooks.regenerateToken(
      workspaceId,
      channelId,
      webhookId,
      session.user.id,
    );
  }

  @Delete('workspaces/:workspaceId/channels/:channelId/webhooks/:webhookId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('webhookId') webhookId: string,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.webhooks.remove(
      workspaceId,
      channelId,
      webhookId,
      session.user.id,
    );
  }

  @Post(
    'workspaces/:workspaceId/channels/:channelId/webhooks/:webhookId/avatar/presign',
  )
  presignAvatar(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('webhookId') webhookId: string,
    @Body()
    body: { filename?: string; contentType?: string; sizeBytes?: number },
    @Session() session: UserSession<typeof auth>,
  ) {
    if (
      typeof body?.filename !== 'string' ||
      typeof body.contentType !== 'string' ||
      typeof body.sizeBytes !== 'number'
    ) {
      throw new BadRequestException('Invalid request body');
    }
    return this.webhooks.presignAvatar(
      workspaceId,
      channelId,
      webhookId,
      session.user.id,
      {
        filename: body.filename,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
      },
    );
  }

  @Post(
    'workspaces/:workspaceId/channels/:channelId/webhooks/:webhookId/avatar',
  )
  completeAvatar(
    @Param('workspaceId') workspaceId: string,
    @Param('channelId') channelId: string,
    @Param('webhookId') webhookId: string,
    @Body() body: { key?: string },
    @Session() session: UserSession<typeof auth>,
  ) {
    if (typeof body?.key !== 'string' || !body.key.trim()) {
      throw new BadRequestException('key is required');
    }
    return this.webhooks.completeAvatar(
      workspaceId,
      channelId,
      webhookId,
      session.user.id,
      body.key.trim(),
    );
  }
}
