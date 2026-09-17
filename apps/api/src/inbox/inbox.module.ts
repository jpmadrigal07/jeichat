import { Module, forwardRef } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BotsModule } from '../bots/bots.module';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';

@Module({
  imports: [
    forwardRef(() => WorkspacesModule),
    forwardRef(() => GatewayModule),
    forwardRef(() => BotsModule),
  ],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
