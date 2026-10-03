import { api } from '@/lib/api';

export type WorkspaceBot = {
  id: string;
  userId: string;
  workspaceId: string;
  ownerId: string | null;
  tokenPrefix: string;
  disabledAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  name: string;
  image: string | null;
  email: string;
  isBot: true;
  token?: string;
};

export function workspaceBotsQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'bots'] as const;
}

export async function fetchWorkspaceBots(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<WorkspaceBot[]> {
  const { data } = await api.get<WorkspaceBot[]>(
    `/workspaces/${workspaceId}/bots`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function createWorkspaceBot(
  workspaceId: string,
  payload: { name: string },
): Promise<WorkspaceBot> {
  const { data } = await api.post<WorkspaceBot>(
    `/workspaces/${workspaceId}/bots`,
    payload,
  );
  return data;
}

export async function updateWorkspaceBot(
  workspaceId: string,
  botId: string,
  payload: { name: string },
): Promise<WorkspaceBot> {
  const { data } = await api.patch<WorkspaceBot>(
    `/workspaces/${workspaceId}/bots/${botId}`,
    payload,
  );
  return data;
}

export async function regenerateWorkspaceBotToken(
  workspaceId: string,
  botId: string,
): Promise<WorkspaceBot> {
  const { data } = await api.post<WorkspaceBot>(
    `/workspaces/${workspaceId}/bots/${botId}/token`,
  );
  return data;
}

export async function disableWorkspaceBot(
  workspaceId: string,
  botId: string,
): Promise<WorkspaceBot> {
  const { data } = await api.post<WorkspaceBot>(
    `/workspaces/${workspaceId}/bots/${botId}/disable`,
  );
  return data;
}
