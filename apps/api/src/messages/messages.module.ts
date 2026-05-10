import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [WorkspacesModule, GatewayModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
