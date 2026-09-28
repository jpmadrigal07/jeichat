import { Module, forwardRef } from '@nestjs/common';
import { ChannelsModule } from '../../channels/channels.module';
import { WorkspacesModule } from '../../workspaces/workspaces.module';
import { GithubIntegrationController } from './github.controller';
import { GithubIntegrationService } from './github.service';

@Module({
  imports: [
    forwardRef(() => WorkspacesModule),
    forwardRef(() => ChannelsModule),
  ],
  controllers: [GithubIntegrationController],
  providers: [GithubIntegrationService],
  exports: [GithubIntegrationService],
})
export class GithubIntegrationModule {}
