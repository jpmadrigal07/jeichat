'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useChannels } from '@chat/_hooks/use-channels';
import { isTicketArchived } from '@chat/_helpers/ticket-fields';
import { channelPageHref } from '@chat/_libs/channels';

export function ArchivedTicketGate({
  workspaceId,
  channelId,
  children,
}: {
  workspaceId: string;
  channelId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { data: channels } = useChannels(workspaceId);
  const channel = channels?.find((item) => item.id === channelId);
  const parentId = channel?.parentId;
  const archived = Boolean(channel && isTicketArchived(channel));

  useEffect(() => {
    if (!parentId || !archived) return;
    router.replace(channelPageHref(workspaceId, parentId));
  }, [archived, parentId, router, workspaceId]);

  if (parentId && archived) return null;

  return children;
}
