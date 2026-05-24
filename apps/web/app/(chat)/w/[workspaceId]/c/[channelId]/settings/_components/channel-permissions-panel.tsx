'use client';

import { Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionToggle } from '../../../../../../_components/permission-toggle';
import {
  ALL_PERMISSIONS,
  type Permission,
} from '../../../../../../_helpers/permissions';
import { useWorkspaces } from '../../../../../../_hooks/use-workspaces';
import { useChannels } from '../../../../../../_hooks/use-channels';
import {
  useWorkspaceRoles,
  useChannelRolePermissions,
  useRemoveRoleFromChannel,
  useSetRoleChannelPermissions,
} from '../../../../../../_hooks/use-workspace-roles';
import { AddChannelRoleDialog } from './add-channel-role-dialog';

export function ChannelPermissionsPanel({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}) {
  const { data: workspaces, isLoading: workspaceLoading } = useWorkspaces();
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const { data: channels, isLoading: channelLoading } = useChannels(workspaceId);
  const channel = channels?.find((ch) => ch.id === channelId);
  const { data: allRoles, isLoading: allRolesLoading } =
    useWorkspaceRoles(workspaceId);
  const { data: rolePermissions, isLoading: permissionsLoading } =
    useChannelRolePermissions(workspaceId, channelId);

  const isOwner = workspace?.role === 'owner';
  const isLoading =
    workspaceLoading || channelLoading || permissionsLoading || allRolesLoading;

  const assignedRoleIds = new Set(rolePermissions?.map((role) => role.id) ?? []);
  const availableRoles =
    allRoles?.filter(
      (role) => !role.isAdministrator && !assignedRoleIds.has(role.id),
    ) ?? [];

  if (isLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!channel) {
    return (
      <p className="text-sm text-muted-foreground">Channel not found.</p>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? `Administrator always has full access to #${channel.name}. Add other roles to configure channel-specific permissions.`
            : `Role permissions for #${channel.name}.`}
        </p>
      </div>

      {isOwner ? (
        <div className="mb-4">
          <AddChannelRoleDialog
            workspaceId={workspaceId}
            channelId={channelId}
            availableRoles={availableRoles}
          />
        </div>
      ) : null}

      {rolePermissions && rolePermissions.length > 0 ? (
        <div className="flex flex-col gap-4">
          {rolePermissions.map((role) => (
            <RoleChannelPermissions
              key={role.id}
              workspaceId={workspaceId}
              channelId={channelId}
              role={role}
              isOwner={isOwner}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No roles in this workspace.</p>
      )}
    </div>
  );
}

function RoleChannelPermissions({
  workspaceId,
  channelId,
  role,
  isOwner,
}: {
  workspaceId: string;
  channelId: string;
  role: {
    id: string;
    name: string;
    color: string;
    isAdministrator: boolean;
    allowPermissions: Permission[];
    denyPermissions: Permission[];
  };
  isOwner: boolean;
}) {
  const setChannelPermissions = useSetRoleChannelPermissions(
    workspaceId,
    role.id,
  );
  const removeRole = useRemoveRoleFromChannel(workspaceId, channelId);

  function togglePermission(
    permission: Permission,
    type: 'allow' | 'deny',
    enabled: boolean,
  ) {
    const allow = new Set(role.allowPermissions);
    const deny = new Set(role.denyPermissions);

    if (type === 'allow') {
      if (enabled) {
        allow.add(permission);
        deny.delete(permission);
      } else {
        allow.delete(permission);
      }
    } else if (enabled) {
      deny.add(permission);
      allow.delete(permission);
    } else {
      deny.delete(permission);
    }

    setChannelPermissions.mutate({
      channelId,
      allowPermissions: [...allow],
      denyPermissions: [...deny],
    });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: role.color }}
        />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{role.name}</p>
        {role.isAdministrator ? (
          <Shield className="size-3 shrink-0 text-muted-foreground" />
        ) : isOwner ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={removeRole.isPending}
            onClick={() => removeRole.mutate(role.id)}
          >
            <X />
            <span className="sr-only">Remove {role.name} from channel</span>
          </Button>
        ) : null}
      </div>

      {role.isAdministrator ? (
        <p className="text-sm text-muted-foreground">
          Administrator roles have all permissions in every channel.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Allow
            </p>
            {ALL_PERMISSIONS.map((permission) => (
              <PermissionToggle
                key={`allow-${permission}`}
                permission={permission}
                checked={role.allowPermissions.includes(permission)}
                disabled={!isOwner || setChannelPermissions.isPending}
                onChange={(enabled) =>
                  togglePermission(permission, 'allow', enabled)
                }
              />
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Deny
            </p>
            {ALL_PERMISSIONS.map((permission) => (
              <PermissionToggle
                key={`deny-${permission}`}
                permission={permission}
                checked={role.denyPermissions.includes(permission)}
                disabled={!isOwner || setChannelPermissions.isPending}
                onChange={(enabled) =>
                  togglePermission(permission, 'deny', enabled)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
