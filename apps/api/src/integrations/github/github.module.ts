import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  forwardRef,
} from '@nestjs/common';
import { ChannelsModule } from '../../channels/channels.module';
import { GatewayModule } from '../../gateway/gateway.module';
import { WorkspacesModule } from '../../workspaces/workspaces.module';
import { GithubIntegrationController } from './github.controller';
import { GithubIntegrationService } from './github.service';
import { githubWebhookBodyMiddleware } from './github-webhook-body.middleware';

@Module({
  imports: [
    forwardRef(() => WorkspacesModule),
    forwardRef(() => ChannelsModule),
    forwardRef(() => GatewayModule),
  ],
  controllers: [GithubIntegrationController],
  providers: [GithubIntegrationService],
  exports: [GithubIntegrationService],
})
export class GithubIntegrationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(githubWebhookBodyMiddleware)
      .forRoutes({
        path: 'integrations/github/webhook',
        method: RequestMethod.POST,
      });
  }
}
