'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Shield, Trash2, UserMinus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { PermissionToggle } from '@chat/_components/permission-toggle';
import {
  ALL_PERMISSIONS,
  type Permission,
} from '@chat/_helpers/permissions';
import { useWorkspaces, useWorkspaceMembers } from '@chat/_hooks/use-workspaces';
import {
  useWorkspaceRoles,
  useWorkspaceRole,
  useCreateWorkspaceRole,
  useUpdateWorkspaceRole,
  useDeleteWorkspaceRole,
  useAddRoleMember,
  useRemoveRoleMember,
} from '@chat/_hooks/use-workspace-roles';
import { getInitials } from '../_helpers/get-initials';

const ROLE_COLORS = [
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#2ecc71',
  '#3498db',
  '#9b59b6',
  '#99aab5',
];

function RoleEditor({
  workspaceId,
  roleId,
  isOwner,
}: {
  workspaceId: string;
  roleId: string;
  isOwner: boolean;
}) {
  const { data: role, isLoading } = useWorkspaceRole(workspaceId, roleId);
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceId);
  const updateRole = useUpdateWorkspaceRole(workspaceId);
  const deleteRole = useDeleteWorkspaceRole(workspaceId);
  const addMember = useAddRoleMember(workspaceId, roleId);
  const removeMember = useRemoveRoleMember(workspaceId, roleId);
  const router = useRouter();
  const searchParams = useSearchParams();

  const clearSelection = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('role');
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!role) {
    return (
      <p className="text-sm text-muted-foreground">Role not found.</p>
    );
  }

  const roleMemberIds = new Set(role.members.map((m) => m.userId));
  const availableMembers =
    workspaceMembers?.filter((m) => !roleMemberIds.has(m.userId)) ?? [];

  function toggleWorkspacePermission(permission: Permission, enabled: boolean) {
    const next = enabled
      ? [...role!.permissions, permission]
      : role!.permissions.filter((p) => p !== permission);
    updateRole.mutate({ roleId, permissions: next });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isOwner && !role.isDefault ? (
            <Input
              key={role.id}
              defaultValue={role.name}
              className="mb-2 max-w-xs text-lg font-semibold"
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== role.name) {
                  updateRole.mutate({ roleId, name });
                }
              }}
            />
          ) : (
            <h2 className="text-lg font-semibold">{role.name}</h2>
          )}
          {role.isAdministrator ? (
            <p className="text-sm text-muted-foreground">
              Members with this role have all permissions in every channel.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Configure workspace permissions and members for this role.
            </p>
          )}
        </div>
        {role.isDefault ? (
          <Badge variant="secondary">Default</Badge>
        ) : isOwner ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete role?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the &ldquo;{role.name}&rdquo;
                  role. Members will lose permissions granted by this role.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteRole.mutate(roleId, { onSuccess: clearSelection });
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      {isOwner ? (
        <div>
          <Label className="mb-2">Role color</Label>
          <div className="flex flex-wrap gap-2">
            {ROLE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Set role color ${color}`}
                className={cn(
                  'size-7 rounded-full border-2 transition-transform hover:scale-110',
                  role.color === color
                    ? 'border-foreground'
                    : 'border-transparent',
                )}
                style={{ backgroundColor: color }}
                onClick={() => updateRole.mutate({ roleId, color })}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!role.isAdministrator ? (
        <>
          <Separator />
          <section>
            <h3 className="mb-2 text-sm font-medium">Workspace permissions</h3>
            <div className="flex flex-col">
              {ALL_PERMISSIONS.map((permission) => (
                <PermissionToggle
                  key={permission}
                  permission={permission}
                  checked={role.permissions.includes(permission)}
                  disabled={!isOwner || updateRole.isPending}
                  onChange={(enabled) =>
                    toggleWorkspacePermission(permission, enabled)
                  }
                />
              ))}
            </div>
          </section>
        </>
      ) : null}

      <Separator />
      <section>
        <h3 className="mb-2 text-sm font-medium">
          Members — {role.members.length}
        </h3>
        {isOwner && availableMembers.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {availableMembers.map((member) => (
              <Button
                key={member.userId}
                type="button"
                variant="outline"
                size="sm"
                disabled={addMember.isPending}
                onClick={() => addMember.mutate({ userId: member.userId })}
              >
                <Plus className="size-3" />
                {member.name}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          {role.members.length > 0 ? (
            role.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-md px-2 py-1.5"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>
                {isOwner ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={removeMember.isPending}
                    onClick={() => removeMember.mutate(member.userId)}
                  >
                    <UserMinus />
                    <span className="sr-only">Remove {member.name}</span>
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No members assigned to this role.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export function WorkspaceRolesPanel({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRoleId = searchParams.get('role');

  const { data: workspaces, isLoading: workspaceLoading } = useWorkspaces();
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const { data: roles, isLoading: rolesLoading } =
    useWorkspaceRoles(workspaceId);
  const createRole = useCreateWorkspaceRole(workspaceId);

  const isOwner = workspace?.role === 'owner';

  function selectRole(roleId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('role', roleId);
    router.replace(`?${params.toString()}`);
  }

  function handleCreateRole() {
    createRole.mutate(
      { name: 'New role', color: '#99aab5' },
      {
        onSuccess: (role) => selectRole(role.id),
      },
    );
  }

  if (workspaceLoading) {
    return (
      <div className="flex max-w-4xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  const activeRoleId =
    selectedRoleId && roles?.some((r) => r.id === selectedRoleId)
      ? selectedRoleId
      : roles?.[0]?.id ?? null;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Roles</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? 'Create roles and assign workspace permissions to control what members can do.'
            : 'Roles and their permissions in this workspace.'}
        </p>
      </div>

      <div className="flex gap-6">
        <aside className="w-52 shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              ROLES
            </span>
            {isOwner ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={createRole.isPending}
                onClick={handleCreateRole}
              >
                <Plus />
                <span className="sr-only">Create role</span>
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col gap-0.5">
            {rolesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))
            ) : roles && roles.length > 0 ? (
              roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => selectRole(role.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    activeRoleId === role.id
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <span className="truncate">{role.name}</span>
                  {role.isAdministrator ? (
                    <Shield className="ml-auto size-3 shrink-0 opacity-60" />
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-2 text-xs text-muted-foreground">No roles yet.</p>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {activeRoleId ? (
            <RoleEditor
              workspaceId={workspaceId}
              roleId={activeRoleId}
              isOwner={isOwner}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a role to view or edit its permissions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
