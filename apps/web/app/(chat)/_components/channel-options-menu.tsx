'use client';

import Link from 'next/link';
import { MoreHorizontal, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ChannelNotificationDrawerItems,
  ChannelNotificationSubMenu,
} from './channel-notification-menu';
import { DrawerAction } from './drawer-action';

type ChannelOptionsMenuProps = {
  workspaceId: string;
  channelId: string;
  channelName: string;
};

/**
 * "…" menu on a sidebar channel row. Desktop gets a dropdown; on mobile the
 * Notifications submenu would open off-screen, so it becomes a bottom drawer.
 */
export function ChannelOptionsMenu({
  workspaceId,
  channelId,
  channelName,
}: ChannelOptionsMenuProps) {
  const isMobile = useIsMobile();
  const settingsHref = `/w/${workspaceId}/c/${channelId}/settings`;

  const trigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      className="hover:bg-transparent dark:hover:bg-transparent"
    >
      <MoreHorizontal className="size-3.5" />
      <span className="sr-only">Channel options</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent
          className="pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          // The drawer is portaled but React events still bubble to the
          // sidebar row, whose long-press starts drag-to-reorder.
          onPointerDown={(event) => event.stopPropagation()}
        >
          <DrawerHeader className="gap-0.5 px-4 pt-3 pb-2 text-left">
            <DrawerTitle className="truncate">{channelName}</DrawerTitle>
            <DrawerDescription>Channel options</DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col p-2">
            <DrawerClose asChild>
              <DrawerAction asChild>
                <Link href={settingsHref}>
                  <Settings />
                  Channel Settings
                </Link>
              </DrawerAction>
            </DrawerClose>
          </div>

          <Separator className="mx-3 data-horizontal:w-auto" />

          <div className="p-2">
            <ChannelNotificationDrawerItems
              workspaceId={workspaceId}
              channelId={channelId}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <Settings />
            Channel Settings
          </Link>
        </DropdownMenuItem>
        <ChannelNotificationSubMenu
          workspaceId={workspaceId}
          channelId={channelId}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
