'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceMembersQueryKey } from '@chat/_libs/workspaces';
import {
  createWorkspaceBot,
  disableWorkspaceBot,
  fetchWorkspaceBots,
  regenerateWorkspaceBotToken,
  updateWorkspaceBot,
  workspaceBotsQueryKey,
} from '../_libs/bots';

export function useWorkspaceBots(workspaceId: string) {
  return useQuery({
    queryKey: workspaceBotsQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchWorkspaceBots(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspaceBot(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string }) =>
      createWorkspaceBot(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceBotsQueryKey(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceMembersQueryKey(workspaceId),
      });
    },
  });
}

export function useUpdateWorkspaceBot(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { botId: string; name: string }) =>
      updateWorkspaceBot(workspaceId, payload.botId, { name: payload.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceBotsQueryKey(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceMembersQueryKey(workspaceId),
      });
    },
  });
}

export function useRegenerateWorkspaceBotToken(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (botId: string) =>
      regenerateWorkspaceBotToken(workspaceId, botId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceBotsQueryKey(workspaceId),
      });
    },
  });
}

export function useDisableWorkspaceBot(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (botId: string) => disableWorkspaceBot(workspaceId, botId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceBotsQueryKey(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceMembersQueryKey(workspaceId),
      });
    },
  });
}
