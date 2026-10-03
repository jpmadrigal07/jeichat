import { Module, forwardRef } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceRolesController } from './workspace-roles.controller';
import { WorkspaceRolesService } from './workspace-roles.service';
import { WorkspacePermissionsService } from './workspace-permissions.service';

@Module({
  imports: [forwardRef(() => GatewayModule)],
  controllers: [WorkspacesController, WorkspaceRolesController],
  providers: [
    WorkspacesService,
    WorkspaceRolesService,
    WorkspacePermissionsService,
  ],
  exports: [
    WorkspacesService,
    WorkspaceRolesService,
    WorkspacePermissionsService,
  ],
})
export class WorkspacesModule {}
