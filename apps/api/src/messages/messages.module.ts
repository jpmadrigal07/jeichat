import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { InboxModule } from '../inbox/inbox.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ChannelPinsController } from './channel-pins.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [WorkspacesModule, GatewayModule, InboxModule],
  controllers: [MessagesController, ChannelPinsController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
