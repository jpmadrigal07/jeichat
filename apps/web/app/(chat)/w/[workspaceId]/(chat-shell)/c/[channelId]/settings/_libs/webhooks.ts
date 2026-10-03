import { api } from "@/lib/api";
import { uploadAvatar } from "@chat/_libs/avatar-upload";

export type ChannelWebhook = {
  id: string;
  channelId: string;
  userId: string;
  name: string;
  image: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
};

/** Only create and regenerate return the URL; it is never readable again. */
export type ChannelWebhookWithUrl = ChannelWebhook & { url: string };

export type ChannelWebhooksResponse = {
  canManage: boolean;
  data: ChannelWebhook[];
};

export function channelWebhooksQueryKey(
  workspaceId: string,
  channelId: string,
) {
  return [
    "workspaces",
    workspaceId,
    "channels",
    channelId,
    "webhooks",
  ] as const;
}

function webhooksPath(workspaceId: string, channelId: string) {
  return `/workspaces/${workspaceId}/channels/${channelId}/webhooks`;
}

export async function fetchChannelWebhooks(
  workspaceId: string,
  channelId: string,
  ctx?: { signal?: AbortSignal },
): Promise<ChannelWebhooksResponse> {
  const { data } = await api.get<ChannelWebhooksResponse>(
    webhooksPath(workspaceId, channelId),
    { signal: ctx?.signal },
  );
  return data;
}

export async function createChannelWebhook(
  workspaceId: string,
  channelId: string,
): Promise<ChannelWebhookWithUrl> {
  const { data } = await api.post<ChannelWebhookWithUrl>(
    webhooksPath(workspaceId, channelId),
    {},
  );
  return data;
}

export async function renameChannelWebhook(
  workspaceId: string,
  channelId: string,
  webhookId: string,
  name: string,
): Promise<ChannelWebhook> {
  const { data } = await api.patch<ChannelWebhook>(
    `${webhooksPath(workspaceId, channelId)}/${webhookId}`,
    { name },
  );
  return data;
}

export async function regenerateChannelWebhookUrl(
  workspaceId: string,
  channelId: string,
  webhookId: string,
): Promise<ChannelWebhookWithUrl> {
  const { data } = await api.post<ChannelWebhookWithUrl>(
    `${webhooksPath(workspaceId, channelId)}/${webhookId}/token`,
  );
  return data;
}

export async function deleteChannelWebhook(
  workspaceId: string,
  channelId: string,
  webhookId: string,
): Promise<void> {
  await api.delete(`${webhooksPath(workspaceId, channelId)}/${webhookId}`);
}

export function uploadChannelWebhookAvatar(
  workspaceId: string,
  channelId: string,
  webhookId: string,
  file: File,
): Promise<ChannelWebhook> {
  return uploadAvatar<ChannelWebhook>(
    `${webhooksPath(workspaceId, channelId)}/${webhookId}/avatar`,
    file,
  );
}
