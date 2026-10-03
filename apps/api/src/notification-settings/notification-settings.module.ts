import { Module, forwardRef } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettingsService } from './notification-settings.service';

@Module({
  imports: [forwardRef(() => WorkspacesModule)],
  controllers: [NotificationSettingsController],
  providers: [NotificationSettingsService],
  exports: [NotificationSettingsService],
})
export class NotificationSettingsModule {}
