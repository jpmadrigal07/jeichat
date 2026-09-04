'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  fetchWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  fetchWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  fetchWorkspaceLabels,
  createWorkspaceLabel,
  updateWorkspaceLabel,
  deleteWorkspaceLabel,
  workspacesQueryKey,
  workspaceMembersQueryKey,
  workspaceLabelsQueryKey,
} from '../_libs/workspaces';
import { channelsQueryKey } from '../_libs/channels';

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

export function useWorkspaceLabels(workspaceId: string) {
  return useQuery({
    queryKey: workspaceLabelsQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchWorkspaceLabels(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspaceLabel(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; color?: string }) =>
      createWorkspaceLabel(workspaceId, payload),
    onSuccess: () => {
      invalidateWorkspaceLabels(queryClient, workspaceId);
    },
  });
}

export function useUpdateWorkspaceLabel(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      labelId,
      ...payload
    }: {
      labelId: string;
      name?: string;
      color?: string;
    }) => updateWorkspaceLabel(workspaceId, labelId, payload),
    onSuccess: () => {
      invalidateWorkspaceLabels(queryClient, workspaceId);
    },
  });
}

export function useDeleteWorkspaceLabel(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (labelId: string) =>
      deleteWorkspaceLabel(workspaceId, labelId),
    onSuccess: () => {
      invalidateWorkspaceLabels(queryClient, workspaceId);
    },
  });
}

function invalidateWorkspaceLabels(
  queryClient: QueryClient,
  workspaceId: string,
) {
  queryClient.invalidateQueries({
    queryKey: workspaceLabelsQueryKey(workspaceId),
  });
  queryClient.invalidateQueries({
    queryKey: channelsQueryKey(workspaceId),
  });
}
