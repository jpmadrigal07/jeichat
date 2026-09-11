import { Module, forwardRef } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [forwardRef(() => WorkspacesModule)],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
