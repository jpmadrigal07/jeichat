import {
  createParamDecorator,
  SetMetadata,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';

export const BOT_ALLOWED_KEY = 'BOT_ALLOWED';

export type RequestActor = {
  userId: string;
  kind: 'user' | 'bot';
  workspaceId?: string;
  botId?: string;
};

export const BotAllowed = () => SetMetadata(BOT_ALLOWED_KEY, true);

export const Actor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestActor => {
    const request = context.switchToHttp().getRequest<{
      actor?: RequestActor;
    }>();
    if (!request.actor) {
      throw new UnauthorizedException();
    }
    return request.actor;
  },
);
