'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkspaceRoles,
  fetchWorkspaceRole,
  fetchChannelRolePermissions,
  assignRoleToChannel,
  removeRoleFromChannel,
  createWorkspaceRole,
  updateWorkspaceRole,
  deleteWorkspaceRole,
  addRoleMember,
  removeRoleMember,
  setRoleChannelPermissions,
  workspaceRolesQueryKey,
  workspaceRoleQueryKey,
  channelRolePermissionsQueryKey,
} from '../_libs/workspace-roles';
import type { Permission } from '../_helpers/permissions';

export function useWorkspaceRoles(workspaceId: string) {
  return useQuery({
    queryKey: workspaceRolesQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchWorkspaceRoles(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useWorkspaceRole(workspaceId: string, roleId: string | null) {
  return useQuery({
    queryKey: workspaceRoleQueryKey(workspaceId, roleId ?? ''),
    queryFn: ({ signal }) =>
      fetchWorkspaceRole(workspaceId, roleId!, { signal }),
    enabled: !!workspaceId && !!roleId,
  });
}

export function useChannelRolePermissions(
  workspaceId: string,
  channelId: string,
) {
  return useQuery({
    queryKey: channelRolePermissionsQueryKey(workspaceId, channelId),
    queryFn: ({ signal }) =>
      fetchChannelRolePermissions(workspaceId, channelId, { signal }),
    enabled: !!workspaceId && !!channelId,
  });
}

export function useAssignRoleToChannel(workspaceId: string, channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { roleId: string }) =>
      assignRoleToChannel(workspaceId, channelId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelRolePermissionsQueryKey(workspaceId, channelId),
      });
    },
  });
}

export function useRemoveRoleFromChannel(
  workspaceId: string,
  channelId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) =>
      removeRoleFromChannel(workspaceId, channelId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelRolePermissionsQueryKey(workspaceId, channelId),
      });
    },
  });
}

export function useCreateWorkspaceRole(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      color?: string;
      permissions?: Permission[];
    }) => createWorkspaceRole(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceRolesQueryKey(workspaceId),
      });
    },
  });
}

export function useUpdateWorkspaceRole(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      ...payload
    }: {
      roleId: string;
      name?: string;
      color?: string;
      permissions?: Permission[];
    }) => updateWorkspaceRole(workspaceId, roleId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceRolesQueryKey(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceRoleQueryKey(workspaceId, variables.roleId),
      });
    },
  });
}

export function useDeleteWorkspaceRole(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => deleteWorkspaceRole(workspaceId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceRolesQueryKey(workspaceId),
      });
    },
  });
}

export function useAddRoleMember(workspaceId: string, roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { userId: string }) =>
      addRoleMember(workspaceId, roleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceRolesQueryKey(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceRoleQueryKey(workspaceId, roleId),
      });
    },
  });
}

export function useRemoveRoleMember(workspaceId: string, roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      removeRoleMember(workspaceId, roleId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceRolesQueryKey(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceRoleQueryKey(workspaceId, roleId),
      });
    },
  });
}

export function useSetRoleChannelPermissions(
  workspaceId: string,
  roleId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      channelId,
      allowPermissions,
      denyPermissions,
    }: {
      channelId: string;
      allowPermissions: Permission[];
      denyPermissions: Permission[];
    }) =>
      setRoleChannelPermissions(workspaceId, roleId, channelId, {
        allowPermissions,
        denyPermissions,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceRoleQueryKey(workspaceId, roleId),
      });
      queryClient.invalidateQueries({
        queryKey: channelRolePermissionsQueryKey(
          workspaceId,
          variables.channelId,
        ),
      });
    },
  });
}
