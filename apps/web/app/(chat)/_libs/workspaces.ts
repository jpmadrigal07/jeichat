import { api } from '@/lib/api';

export type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export const workspacesQueryKey = ['workspaces'] as const;

export async function fetchWorkspaces(ctx?: {
  signal?: AbortSignal;
}): Promise<Workspace[]> {
  const { data } = await api.get<Workspace[]>('/workspaces', {
    signal: ctx?.signal,
  });
  return data;
}

export async function fetchWorkspace(
  id: string,
  ctx?: { signal?: AbortSignal },
): Promise<Workspace> {
  const { data } = await api.get<Workspace>(`/workspaces/${id}`, {
    signal: ctx?.signal,
  });
  return data;
}

export async function createWorkspace(payload: {
  name: string;
  icon?: string;
}): Promise<Workspace> {
  const { data } = await api.post<Workspace>('/workspaces', payload);
  return data;
}

export async function updateWorkspace(
  id: string,
  payload: { name?: string; icon?: string | null },
): Promise<Workspace> {
  const { data } = await api.patch<Workspace>(`/workspaces/${id}`, payload);
  return data;
}

export async function deleteWorkspace(id: string): Promise<void> {
  await api.delete(`/workspaces/${id}`);
}
