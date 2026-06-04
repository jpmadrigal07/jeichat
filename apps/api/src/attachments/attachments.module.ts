import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AttachmentsCleanupService } from './attachments-cleanup.service';
import { AttachmentsRateLimitService } from './attachments-rate-limit.service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [AttachmentsController],
  providers: [
    AttachmentsService,
    AttachmentsCleanupService,
    AttachmentsRateLimitService,
  ],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
