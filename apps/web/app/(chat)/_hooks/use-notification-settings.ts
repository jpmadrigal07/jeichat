'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { withNotificationLevel } from '../_helpers/notification-level';
import {
  fetchNotificationSettings,
  notificationSettingsQueryKey,
  updateNotificationLevel,
  type NotificationLevel,
  type NotificationSettings,
} from '../_libs/notification-settings';

export function useNotificationSettings(workspaceId: string) {
  return useQuery({
    queryKey: notificationSettingsQueryKey(workspaceId),
    queryFn: ({ signal }) => fetchNotificationSettings(workspaceId, { signal }),
    enabled: !!workspaceId,
  });
}

export function useSetNotificationLevel(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = notificationSettingsQueryKey(workspaceId);

  return useMutation({
    mutationFn: ({
      channelId,
      level,
    }: {
      channelId: string;
      level: NotificationLevel;
    }) => updateNotificationLevel(workspaceId, channelId, level),
    // Apply the change right away so the bell and sidebar update instantly.
    onMutate: async ({ channelId, level }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationSettings>(queryKey);
      queryClient.setQueryData<NotificationSettings>(queryKey, (current) =>
        withNotificationLevel(current, channelId, level),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
