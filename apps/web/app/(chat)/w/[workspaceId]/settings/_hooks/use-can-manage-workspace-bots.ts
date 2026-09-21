'use client';

import { authClient } from '@/lib/auth-client';
import { useWorkspaces } from '@chat/_hooks/use-workspaces';
import {
  useWorkspaceRole,
  useWorkspaceRoles,
} from '@chat/_hooks/use-workspace-roles';

export function useCanManageWorkspaceBots(workspaceId: string) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id;
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: roles, isLoading: rolesLoading } = useWorkspaceRoles(workspaceId);

  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const isOwner = workspace?.role === 'owner';
  const adminRoleId = roles?.find((role) => role.isAdministrator)?.id ?? null;

  const { data: adminRole, isLoading: adminRoleLoading } = useWorkspaceRole(
    workspaceId,
    isOwner ? null : adminRoleId,
  );

  const isAdministrator =
    !isOwner &&
    Boolean(
      userId && adminRole?.members.some((member) => member.userId === userId),
    );

  const isLoading =
    sessionPending ||
    workspacesLoading ||
    rolesLoading ||
    (!isOwner && Boolean(adminRoleId) && adminRoleLoading);

  return {
    canManage: isOwner || isAdministrator,
    isLoading,
  };
}
