import { existsSync } from 'node:fs';
import path from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthIntegrationModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

// Load .env from repo root (works from apps/api/dist or apps/api/src) or cwd
const envFilePath =
  [
    path.join(__dirname, '../../../.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '../.env'),
  ].find((p) => existsSync(p)) ?? undefined;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
    }),
    DatabaseModule,
    AuthIntegrationModule,
    WorkspacesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
