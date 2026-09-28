'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useChannels } from '@chat/_hooks/use-channels';
import {
  useNotificationSettings,
  useSetNotificationLevel,
} from '@chat/_hooks/use-notification-settings';
import { isDmChannel } from '@chat/_helpers/channel-display';
import {
  NOTIFICATION_LEVELS,
  NOTIFICATION_LEVEL_META,
  notificationLevelOf,
  parseNotificationLevel,
} from '@chat/_helpers/notification-level';

export function ChannelNotificationsPanel({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}) {
  const { data: channels, isLoading } = useChannels(workspaceId);
  const { data: settings } = useNotificationSettings(workspaceId);
  const setLevel = useSetNotificationLevel(workspaceId);
  const channel = channels?.find((item) => item.id === channelId);

  if (isLoading) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!channel || channel.parentId || isDmChannel(channel)) {
    return (
      <p className="text-sm text-muted-foreground">
        Notification settings are available on channels.
      </p>
    );
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Choose how you are notified about new messages in #{channel.name}.
          This only affects you; other members keep their own settings.
        </p>
      </div>

      <RadioGroup
        value={notificationLevelOf(settings, channelId)}
        onValueChange={(value) => {
          const level = parseNotificationLevel(value);
          if (level) setLevel.mutate({ channelId, level });
        }}
      >
        {NOTIFICATION_LEVELS.map((level) => {
          const meta = NOTIFICATION_LEVEL_META[level];
          const Icon = meta.icon;
          const id = `notification-level-${level}`;
          return (
            <FieldLabel key={level} htmlFor={id}>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>
                    <Icon className="size-3.5" />
                    {meta.label}
                  </FieldTitle>
                  <FieldDescription>{meta.description}</FieldDescription>
                </FieldContent>
                <RadioGroupItem value={level} id={id} />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>

      <p className="text-xs text-muted-foreground">
        Unread messages still turn the channel bold in the sidebar. Tickets keep
        their own rules: you are notified about tickets you are assigned to or
        watching.
      </p>
    </div>
  );
}
