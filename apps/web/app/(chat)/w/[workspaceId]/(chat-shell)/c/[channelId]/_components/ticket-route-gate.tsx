'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useChannels } from '@chat/_hooks/use-channels';
import { isTicketArchived } from '@chat/_helpers/ticket-fields';
import { channelPageHref, ticketPageHref } from '@chat/_libs/channels';

/**
 * Keeps channel/ticket URLs canonical:
 * - archived tickets bounce back to their parent channel
 * - tickets opened at `/c/<ticketId>` (legacy links) move to `/c/<parentId>/b/<ticketId>`
 * - `/b/<id>` pointing at a non-ticket (or the wrong parent) is corrected
 */
export function TicketRouteGate({
  workspaceId,
  channelId,
  ticketRoute = false,
  children,
}: {
  workspaceId: string;
  channelId: string;
  ticketRoute?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: channels } = useChannels(workspaceId);
  const channel = channels?.find((item) => item.id === channelId);

  let target: string | null = null;
  if (channel?.parentId) {
    if (isTicketArchived(channel)) {
      target = channelPageHref(workspaceId, channel.parentId);
    } else {
      const canonical = ticketPageHref(workspaceId, channel.parentId, channel.id);
      if (pathname !== canonical) {
        const query = searchParams.toString();
        target = query ? `${canonical}?${query}` : canonical;
      }
    }
  } else if (channel && ticketRoute) {
    target = channelPageHref(workspaceId, channel.id);
  }

  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);

  if (target) return null;

  return children;
}
