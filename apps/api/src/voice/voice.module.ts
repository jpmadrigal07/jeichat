import {
  Module,
  RequestMethod,
  forwardRef,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { ChannelsModule } from '../channels/channels.module';
import { GatewayModule } from '../gateway/gateway.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { loadVoiceConfig, VOICE_CONFIG } from './voice.config';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { voiceWebhookBodyMiddleware } from './voice-webhook-body.middleware';

@Module({
  imports: [
    forwardRef(() => WorkspacesModule),
    forwardRef(() => GatewayModule),
    ChannelsModule,
  ],
  controllers: [VoiceController],
  providers: [
    {
      provide: VOICE_CONFIG,
      useFactory: () => loadVoiceConfig(),
    },
    VoiceService,
  ],
})
export class VoiceModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(voiceWebhookBodyMiddleware)
      .forRoutes({ path: 'voice/webhook', method: RequestMethod.POST });
  }
}
