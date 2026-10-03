'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChannelNotificationContextSubMenu } from './channel-notification-menu';

type ChannelContextMenuProps = {
  /** The sidebar channel row; right-clicking it opens the menu. */
  children: React.ReactNode;
  workspaceId: string;
  channelId: string;
  /** Voice channels have no messages to be notified about. */
  showNotifications?: boolean;
};

/**
 * Right-click menu on a sidebar channel row (desktop only). It offers the same
 * actions as the row's "…" button.
 */
export function ChannelContextMenu({
  children,
  workspaceId,
  channelId,
  showNotifications = true,
}: ChannelContextMenuProps) {
  // Below `md` there is no right-click, and a long press reorders the row.
  const isMobile = useIsMobile();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={isMobile}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem asChild className="cursor-pointer">
          <Link href={`/w/${workspaceId}/c/${channelId}/settings`}>
            <Settings />
            Channel Settings
          </Link>
        </ContextMenuItem>
        {showNotifications ? (
          <ChannelNotificationContextSubMenu
            workspaceId={workspaceId}
            channelId={channelId}
          />
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
