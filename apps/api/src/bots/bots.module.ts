import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ActorGuard } from '../auth/actor.guard';
import { GatewayModule } from '../gateway/gateway.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';

@Module({
  imports: [
    forwardRef(() => WorkspacesModule),
    forwardRef(() => GatewayModule),
  ],
  controllers: [BotsController],
  providers: [
    BotsService,
    ActorGuard,
    { provide: APP_GUARD, useClass: ActorGuard },
  ],
  exports: [BotsService],
})
export class BotsModule {}
