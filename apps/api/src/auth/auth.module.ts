import { Module } from '@nestjs/common';
import { AuthModule as NestBetterAuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth';
import { AuthController } from './auth.controller';

/**
 * All Better Auth HTTP surface:
 * - Default framework routes (`/api/auth/*`, etc.) from {@link NestBetterAuthModule.forRoot}
 * - Custom routes on {@link AuthController} (e.g. `GET /auth/me`)
 */
@Module({
  imports: [
    NestBetterAuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '2mb' },
        urlencoded: { limit: '2mb', extended: true },
      },
    }),
  ],
  controllers: [AuthController],
})
export class AuthIntegrationModule {}
