import { Module, forwardRef } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { GatewayModule } from '../gateway/gateway.module';
import { InboxModule } from '../inbox/inbox.module';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { TicketAutoArchiveService } from './ticket-auto-archive.service';

@Module({
  imports: [
    forwardRef(() => WorkspacesModule),
    forwardRef(() => GatewayModule),
    InboxModule,
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService, TicketAutoArchiveService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
