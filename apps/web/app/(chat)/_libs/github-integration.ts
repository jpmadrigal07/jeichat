import { api } from '@/lib/api';

export type ChannelGithubLink = {
  id: string;
  workspaceId: string;
  channelId: string;
  installationId: number;
  owner: string;
  repo: string;
  connectedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceChannelGithubLink = {
  channelId: string;
  owner: string;
  repo: string;
  channelName: string;
  ticketKey: string | null;
};

export type TicketGithubPullRequest = {
  id: string;
  ticketChannelId: string;
  owner: string;
  repo: string;
  prNumber: number;
  headRef: string;
  htmlUrl: string;
  state: string;
  merged: boolean;
  updatedAt: string;
};

export const githubIntegrationStatusQueryKey = ['github-integration', 'status'] as const;

export async function fetchGithubIntegrationStatus(ctx?: {
  signal?: AbortSignal;
}): Promise<{ configured: boolean }> {
  const { data } = await api.get<{ configured: boolean }>(
    '/integrations/github/status',
    { signal: ctx?.signal },
  );
  return data;
}

export function channelGithubLinkQueryKey(
  workspaceId: string,
  channelId: string,
) {
  return ['github-integration', 'channel-link', workspaceId, channelId] as const;
}

export async function fetchChannelGithubLink(
  workspaceId: string,
  channelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<ChannelGithubLink | null> {
  const { data } = await api.get<ChannelGithubLink | null>(
    `/integrations/github/workspaces/${workspaceId}/channels/${channelId}/link`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function disconnectChannelGithubLink(
  workspaceId: string,
  channelId: string,
): Promise<{ disconnected: boolean }> {
  const { data } = await api.delete<{ disconnected: boolean }>(
    `/integrations/github/workspaces/${workspaceId}/channels/${channelId}/link`,
  );
  return data;
}

export async function createGithubConnectBeginUrl(
  workspaceId: string,
  channelId: string,
  owner: string,
  repo: string,
): Promise<{ beginUrl: string }> {
  const params = new URLSearchParams({
    owner: owner.trim(),
    repo: repo.trim(),
  });
  const { data } = await api.post<{ beginUrl: string }>(
    `/integrations/github/workspaces/${workspaceId}/channels/${channelId}/connect?${params.toString()}`,
  );
  return data;
}

/** @deprecated Use createGithubConnectBeginUrl — install GET requires session cookies on the API host. */
export function githubInstallUrl(input: {
  workspaceId: string;
  channelId: string;
  owner: string;
  repo: string;
}): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  const params = new URLSearchParams({
    workspaceId: input.workspaceId,
    channelId: input.channelId,
    owner: input.owner.trim(),
    repo: input.repo.trim(),
  });
  return `${base}/integrations/github/install?${params.toString()}`;
}

export function ticketGithubPrsQueryKey(ticketChannelId: string) {
  return ['github-integration', 'ticket-prs', ticketChannelId] as const;
}

export async function fetchTicketGithubPullRequests(
  ticketChannelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<TicketGithubPullRequest[]> {
  const { data } = await api.get<TicketGithubPullRequest[]>(
    `/integrations/github/tickets/${ticketChannelId}/pull-requests`,
    { signal: ctx?.signal },
  );
  return data;
}

export function suggestedTicketBranchName(
  ticketKey: string | null | undefined,
  ticketNumber: number | null | undefined,
  title: string,
): string | null {
  if (!ticketKey?.trim() || !ticketNumber) return null;
  const key = ticketKey.trim().toUpperCase();
  const slug =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'work';
  return `${key}-${ticketNumber}-${slug}`;
}
