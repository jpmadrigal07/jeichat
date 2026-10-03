"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  channelWebhooksQueryKey,
  createChannelWebhook,
  deleteChannelWebhook,
  fetchChannelWebhooks,
  regenerateChannelWebhookUrl,
  renameChannelWebhook,
  uploadChannelWebhookAvatar,
} from "../_libs/webhooks";

export function useChannelWebhooks(workspaceId: string, channelId: string) {
  return useQuery({
    queryKey: channelWebhooksQueryKey(workspaceId, channelId),
    queryFn: ({ signal }) =>
      fetchChannelWebhooks(workspaceId, channelId, { signal }),
    enabled: !!workspaceId && !!channelId,
  });
}

function useInvalidateWebhooks(workspaceId: string, channelId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: channelWebhooksQueryKey(workspaceId, channelId),
    });
}

export function useCreateChannelWebhook(
  workspaceId: string,
  channelId: string,
) {
  const invalidate = useInvalidateWebhooks(workspaceId, channelId);
  return useMutation({
    mutationFn: () => createChannelWebhook(workspaceId, channelId),
    onSuccess: invalidate,
  });
}

export function useRenameChannelWebhook(
  workspaceId: string,
  channelId: string,
) {
  const invalidate = useInvalidateWebhooks(workspaceId, channelId);
  return useMutation({
    mutationFn: (input: { webhookId: string; name: string }) =>
      renameChannelWebhook(workspaceId, channelId, input.webhookId, input.name),
    onSuccess: invalidate,
  });
}

export function useRegenerateChannelWebhookUrl(
  workspaceId: string,
  channelId: string,
) {
  const invalidate = useInvalidateWebhooks(workspaceId, channelId);
  return useMutation({
    mutationFn: (webhookId: string) =>
      regenerateChannelWebhookUrl(workspaceId, channelId, webhookId),
    onSuccess: invalidate,
  });
}

export function useDeleteChannelWebhook(
  workspaceId: string,
  channelId: string,
) {
  const invalidate = useInvalidateWebhooks(workspaceId, channelId);
  return useMutation({
    mutationFn: (webhookId: string) =>
      deleteChannelWebhook(workspaceId, channelId, webhookId),
    onSuccess: invalidate,
  });
}

export function useUploadChannelWebhookAvatar(
  workspaceId: string,
  channelId: string,
) {
  const invalidate = useInvalidateWebhooks(workspaceId, channelId);
  return useMutation({
    mutationFn: (input: { webhookId: string; file: File }) =>
      uploadChannelWebhookAvatar(
        workspaceId,
        channelId,
        input.webhookId,
        input.file,
      ),
    onSuccess: invalidate,
  });
}
