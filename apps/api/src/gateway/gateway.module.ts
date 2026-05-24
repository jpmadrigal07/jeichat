import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [WorkspacesModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
