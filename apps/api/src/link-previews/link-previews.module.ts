import { Module } from '@nestjs/common';
import { LinkPreviewsService } from './link-previews.service';

@Module({
  providers: [LinkPreviewsService],
  exports: [LinkPreviewsService],
})
export class LinkPreviewsModule {}
