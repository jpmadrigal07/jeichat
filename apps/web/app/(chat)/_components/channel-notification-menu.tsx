'use client';

import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrawerClose } from '@/components/ui/drawer';
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
import { DrawerAction } from './drawer-action';
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

/** Notification level picker for the mobile channel options drawer. */
export function ChannelNotificationDrawerItems({
  workspaceId,
  channelId,
}: ChannelNotificationProps) {
  const { data: settings } = useNotificationSettings(workspaceId);
  const setLevel = useSetNotificationLevel(workspaceId);
  const current = notificationLevelOf(settings, channelId);

  return (
    <div
      role="radiogroup"
      aria-label="Notify me about"
      className="flex flex-col"
    >
      <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
        Notify me about
      </p>
      {NOTIFICATION_LEVELS.map((level) => {
        const meta = NOTIFICATION_LEVEL_META[level];
        const Icon = meta.icon;
        const selected = level === current;
        return (
          <DrawerClose key={level} asChild>
            <DrawerAction
              role="radio"
              aria-checked={selected}
              className="h-auto py-2"
              onClick={() => setLevel.mutate({ channelId, level })}
            >
              <Icon />
              <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                <span>{meta.label}</span>
                <span className="text-[0.6875rem] font-normal whitespace-normal text-muted-foreground">
                  {meta.description}
                </span>
              </div>
              {selected ? <Check className="text-foreground" /> : null}
            </DrawerAction>
          </DrawerClose>
        );
      })}
    </div>
  );
}
