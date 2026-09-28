'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  NOTIFICATION_LEVELS,
  NOTIFICATION_LEVEL_META,
  notificationLevelOf,
  parseNotificationLevel,
} from '../_helpers/notification-level';
import {
  useNotificationSettings,
  useSetNotificationLevel,
} from '../_hooks/use-notification-settings';

type ChannelNotificationProps = {
  workspaceId: string;
  channelId: string;
};

function NotificationLevelItems({
  workspaceId,
  channelId,
}: ChannelNotificationProps) {
  const { data: settings } = useNotificationSettings(workspaceId);
  const setLevel = useSetNotificationLevel(workspaceId);

  return (
    <DropdownMenuRadioGroup
      value={notificationLevelOf(settings, channelId)}
      onValueChange={(value) => {
        const level = parseNotificationLevel(value);
        if (level) setLevel.mutate({ channelId, level });
      }}
    >
      {NOTIFICATION_LEVELS.map((level) => {
        const meta = NOTIFICATION_LEVEL_META[level];
        const Icon = meta.icon;
        return (
          <DropdownMenuRadioItem key={level} value={level}>
            <Icon />
            <div className="flex flex-col">
              <span>{meta.label}</span>
              <span className="text-[0.6875rem] text-muted-foreground">
                {meta.description}
              </span>
            </div>
          </DropdownMenuRadioItem>
        );
      })}
    </DropdownMenuRadioGroup>
  );
}

/** Bell button for the channel header. The icon shows the current level. */
export function ChannelNotificationMenu({
  workspaceId,
  channelId,
}: ChannelNotificationProps) {
  const { data: settings } = useNotificationSettings(workspaceId);
  const meta = NOTIFICATION_LEVEL_META[notificationLevelOf(settings, channelId)];
  const Icon = meta.icon;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Notifications: ${meta.label}`}
            >
              <Icon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Notifications: {meta.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notify me about</DropdownMenuLabel>
        <NotificationLevelItems
          workspaceId={workspaceId}
          channelId={channelId}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Notifications" submenu for a channel's options menu in the sidebar. */
export function ChannelNotificationSubMenu({
  workspaceId,
  channelId,
}: ChannelNotificationProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Bell />
        Notifications
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-72">
        <NotificationLevelItems
          workspaceId={workspaceId}
          channelId={channelId}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
