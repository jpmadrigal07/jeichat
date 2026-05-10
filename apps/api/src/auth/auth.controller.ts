import { Controller, Get } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from './auth';

/**
 * Custom auth-adjacent HTTP routes. Better Auth’s built-in handlers live under
 * `/api/auth/*` via `@thallesp/nestjs-better-auth` — see `auth.module.ts`.
 */
@Controller('auth')
export class AuthController {
  /** Requires a valid Better Auth session cookie. */
  @Get('me')
  getMe(@Session() session: UserSession<typeof auth>) {
    return {
      user: session.user,
      session: session.session,
    };
  }
}
