import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  vapidPublicKey(@Session() _session: UserSession<typeof auth>) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? '' };
  }

  @Post('subscribe')
  subscribe(
    @Session() session: UserSession<typeof auth>,
    @Body()
    body: {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    },
    @Headers('user-agent') userAgent?: string,
  ) {
    if (
      typeof body?.endpoint !== 'string' ||
      !body.endpoint.trim() ||
      typeof body.keys?.p256dh !== 'string' ||
      typeof body.keys?.auth !== 'string'
    ) {
      throw new BadRequestException('Invalid push subscription');
    }

    return this.pushService.subscribe(
      session.user.id,
      {
        endpoint: body.endpoint.trim(),
        keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
      },
      userAgent,
    );
  }

  @Post('unsubscribe')
  unsubscribe(
    @Session() session: UserSession<typeof auth>,
    @Body() body: { endpoint?: string },
  ) {
    if (typeof body?.endpoint !== 'string' || !body.endpoint.trim()) {
      throw new BadRequestException('endpoint is required');
    }
    return this.pushService.unsubscribe(session.user.id, body.endpoint.trim());
  }
}
