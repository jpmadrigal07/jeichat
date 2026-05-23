import { api } from '@/lib/api';

export type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  joinedAt: string;
  name: string;
  email: string;
  image: string | null;
};

export const workspacesQueryKey = ['workspaces'] as const;

export function workspaceMembersQueryKey(workspaceId: string) {
  return ['workspaces', workspaceId, 'members'] as const;
}

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

export async function fetchWorkspaceMembers(
  workspaceId: string,
  ctx?: { signal?: AbortSignal },
): Promise<WorkspaceMember[]> {
  const { data } = await api.get<WorkspaceMember[]>(
    `/workspaces/${workspaceId}/members`,
    { signal: ctx?.signal },
  );
  return data;
}

export async function addWorkspaceMember(
  workspaceId: string,
  payload: { email: string },
): Promise<WorkspaceMember> {
  const { data } = await api.post<WorkspaceMember>(
    `/workspaces/${workspaceId}/members`,
    payload,
  );
  return data;
}

export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
}
