'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  channelGithubLinkQueryKey,
  createGithubConnectBeginUrl,
  disconnectChannelGithubLink,
  fetchChannelGithubLink,
  fetchGithubIntegrationStatus,
  fetchTicketGithubPullRequests,
  githubIntegrationStatusQueryKey,
  ticketGithubPrsQueryKey,
} from '../_libs/github-integration';

export function useGithubIntegrationStatus() {
  return useQuery({
    queryKey: githubIntegrationStatusQueryKey,
    queryFn: ({ signal }) => fetchGithubIntegrationStatus({ signal }),
  });
}

export function useChannelGithubLink(workspaceId: string, channelId: string) {
  return useQuery({
    queryKey: channelGithubLinkQueryKey(workspaceId, channelId),
    queryFn: ({ signal }) =>
      fetchChannelGithubLink(workspaceId, channelId, { signal }),
    enabled: Boolean(workspaceId && channelId),
  });
}

export function useDisconnectChannelGithubLink(
  workspaceId: string,
  channelId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectChannelGithubLink(workspaceId, channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: channelGithubLinkQueryKey(workspaceId, channelId),
      });
    },
  });
}

export function useGithubConnectBeginUrl(
  workspaceId: string,
  channelId: string,
) {
  return useMutation({
    mutationFn: ({ owner, repo }: { owner: string; repo: string }) =>
      createGithubConnectBeginUrl(workspaceId, channelId, owner, repo),
  });
}

export function useTicketGithubPullRequests(ticketChannelId: string) {
  return useQuery({
    queryKey: ticketGithubPrsQueryKey(ticketChannelId),
    queryFn: ({ signal }) =>
      fetchTicketGithubPullRequests(ticketChannelId, { signal }),
    enabled: Boolean(ticketChannelId),
  });
}
