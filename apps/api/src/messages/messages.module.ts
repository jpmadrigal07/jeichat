import { Module, forwardRef } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { InboxModule } from '../inbox/inbox.module';
import { PushModule } from '../push/push.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { BotsModule } from '../bots/bots.module';
import { GithubIntegrationModule } from '../integrations/github/github.module';
import { ChannelPinsController } from './channel-pins.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    forwardRef(() => WorkspacesModule),
    forwardRef(() => GatewayModule),
    InboxModule,
    PushModule,
    forwardRef(() => BotsModule),
    forwardRef(() => GithubIntegrationModule),
  ],
  controllers: [MessagesController, ChannelPinsController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
