import { Module, forwardRef } from '@nestjs/common';
import { BotsModule } from '../bots/bots.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [forwardRef(() => WorkspacesModule), forwardRef(() => BotsModule)],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
