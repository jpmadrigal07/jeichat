import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';

@Module({
  imports: [WorkspacesModule, GatewayModule],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}
