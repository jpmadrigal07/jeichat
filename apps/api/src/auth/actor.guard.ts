import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth';
import { BOT_ALLOWED_KEY, type RequestActor } from './actor';
import { BotsService } from '../bots/bots.service';
import { parseBotAuthorization } from '../bots/bot-token';

type ActorRequest = {
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string>;
  path?: string;
  url?: string;
  originalUrl?: string;
  session?: unknown;
  user?: unknown;
  actor?: RequestActor;
};

@Injectable()
export class ActorGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly botsService: BotsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<ActorRequest>();
    const path = request.originalUrl ?? request.url ?? request.path ?? '';
    if (path.startsWith('/api/auth')) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>('PUBLIC', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const header = Array.isArray(request.headers.authorization)
      ? request.headers.authorization[0]
      : request.headers.authorization;
    const botToken = parseBotAuthorization(header);

    if (botToken) {
      const bot = await this.botsService.resolveToken(botToken);
      await this.botsService.consumeRateLimit(bot.id);

      const workspaceId = request.params?.workspaceId;
      if (workspaceId && workspaceId !== bot.workspaceId) {
        throw new ForbiddenException('Bot is not in this workspace');
      }
      const channelId = request.params?.channelId;
      if (channelId) {
        await this.botsService.assertChannelWorkspace(
          channelId,
          bot.workspaceId,
        );
      }

      const botAllowed = this.reflector.getAllAndOverride<boolean>(
        BOT_ALLOWED_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (!botAllowed) {
        throw new ForbiddenException();
      }

      request.actor = {
        userId: bot.userId,
        kind: 'bot',
        workspaceId: bot.workspaceId,
        botId: bot.id,
      };
      return true;
    }

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });
    request.session = session;
    request.user = session?.user ?? null;

    const isOptional = this.reflector.getAllAndOverride<boolean>('OPTIONAL', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!session && isOptional) return true;
    if (!session?.user) {
      throw new UnauthorizedException();
    }

    request.actor = {
      userId: session.user.id,
      kind: 'user',
    };
    return true;
  }
}
