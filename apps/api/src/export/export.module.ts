import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
