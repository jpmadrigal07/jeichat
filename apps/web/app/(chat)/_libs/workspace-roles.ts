import { api } from '@/lib/api';
import type { Permission } from '../_helpers/permissions';

export type WorkspaceRole = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  permissions: Permission[];
  isAdministrator: boolean;
  isDefault: boolean;
  position: number;
  memberCount: number;
};

export type WorkspaceRoleMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
};

export type RoleChannelPermission = {
  id: string;
  channelId: string;
  channelName: string;
  allowPermissions: Permission[];
  denyPermissions: Permission[];
};

export type ChannelRolePermission = {
  id: string;
  name: string;
  color: string;
  isAdministrator: boolean;
  allowPermissions: Permission[];
  denyPermissions: Permission[];
};

export type WorkspaceRoleDetail = WorkspaceRole & {
  members: WorkspaceRoleMember[];
  channelPermissions: RoleChannelPermission[];
};

export function workspaceRolesQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'roles'] as const;
}

export function workspaceRoleQueryKey(workspaceId: string, roleId: string) {
  return ['workspaces', workspaceId, 'roles', roleId] as const;
}

export function channelRolePermissionsQueryKey(
  workspaceId: string,
  channelId: string,
) {
  return ['workspaces', workspaceId, 'channels', channelId, 'role-permissions'] as const;
}

export async function fetchWorkspaceRoles(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<WorkspaceRole[]> {
  const { data } = await api.get<WorkspaceRole[]>(
    `/workspaces/${workspaceId}/roles`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function fetchWorkspaceRole(
  workspaceId: string,
  roleId: string,
  ctx?: { signal?: AbortSignal },
): Promise<WorkspaceRoleDetail> {
  const { data } = await api.get<WorkspaceRoleDetail>(
    `/workspaces/${workspaceId}/roles/${roleId}`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function createWorkspaceRole(
  workspaceId: string,
  payload: { name: string; color?: string; permissions?: Permission[] },
): Promise<WorkspaceRole> {
  const { data } = await api.post<WorkspaceRole>(
    `/workspaces/${workspaceId}/roles`,
    payload,
  );
  return data;
}

export async function updateWorkspaceRole(
  workspaceId: string,
  roleId: string,
  payload: {
    name?: string;
    color?: string;
    permissions?: Permission[];
    position?: number;
  },
): Promise<WorkspaceRole> {
  const { data } = await api.patch<WorkspaceRole>(
    `/workspaces/${workspaceId}/roles/${roleId}`,
    payload,
  );
  return data;
}

export async function deleteWorkspaceRole(
  workspaceId: string,
  roleId: string,
): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/roles/${roleId}`);
}

export async function addRoleMember(
  workspaceId: string,
  roleId: string,
  payload: { userId: string },
): Promise<{ id: string; roleId: string; userId: string }> {
  const { data } = await api.post(
    `/workspaces/${workspaceId}/roles/${roleId}/members`,
    payload,
  );
  return data;
}

export async function removeRoleMember(
  workspaceId: string,
  roleId: string,
  userId: string,
): Promise<void> {
  await api.delete(
    `/workspaces/${workspaceId}/roles/${roleId}/members/${userId}`,
  );
}

export async function fetchChannelRolePermissions(
  workspaceId: string,
  channelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<ChannelRolePermission[]> {
  const { data } = await api.get<ChannelRolePermission[]>(
    `/workspaces/${workspaceId}/channels/${channelId}/role-permissions`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function assignRoleToChannel(
  workspaceId: string,
  channelId: string,
  payload: { roleId: string },
): Promise<ChannelRolePermission> {
  const { data } = await api.post<ChannelRolePermission>(
    `/workspaces/${workspaceId}/channels/${channelId}/role-permissions`,
    payload,
  );
  return data;
}

export async function removeRoleFromChannel(
  workspaceId: string,
  channelId: string,
  roleId: string,
): Promise<void> {
  await api.delete(
    `/workspaces/${workspaceId}/channels/${channelId}/role-permissions/${roleId}`,
  );
}

export async function setRoleChannelPermissions(
  workspaceId: string,
  roleId: string,
  channelId: string,
  payload: { allowPermissions: Permission[]; denyPermissions: Permission[] },
): Promise<RoleChannelPermission> {
  const { data } = await api.put<RoleChannelPermission>(
    `/workspaces/${workspaceId}/roles/${roleId}/channels/${channelId}`,
    payload,
  );
  return data;
}
