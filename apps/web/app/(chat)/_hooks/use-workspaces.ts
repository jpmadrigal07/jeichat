'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  fetchWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  workspacesQueryKey,
  workspaceMembersQueryKey,
} from '../_libs/workspaces';

export function useWorkspaces() {
  return useQuery({
    queryKey: workspacesQueryKey,
    queryFn: ({ signal }) => fetchWorkspaces({ signal }),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; icon?: string | null }) =>
      updateWorkspace(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceMembersQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchWorkspaceMembers(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useAddWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string }) =>
      addWorkspaceMember(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceMembersQueryKey(workspaceId),
      });
    },
  });
}

export function useRemoveWorkspaceMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeWorkspaceMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceMembersQueryKey(workspaceId),
      });
    },
  });
}
