'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  messageNotificationHref,
  messageNotificationSnippet,
  messageNotificationTargetLabel,
} from '../_helpers/message-notification-copy';
import { personInitials } from '../_helpers/ticket-fields';
import type { MessageNotification } from '../_libs/message-notifications';

type MessageNotificationToastProps = {
  notification: MessageNotification;
  onDismiss: () => void;
};

export function showMessageNotificationToast(
  notification: MessageNotification,
) {
  toast.custom(
    (t) => (
      <MessageNotificationToast
        notification={notification}
        onDismiss={() => toast.dismiss(t.id)}
      />
    ),
    {
      id: `message-notification:${notification.message.id}`,
      duration: 6000,
      position: 'bottom-right',
    },
  );
}

function MessageNotificationToast({
  notification,
  onDismiss,
}: MessageNotificationToastProps) {
  const senderName = notification.message.sender?.name ?? 'Someone';
  const senderImage = notification.message.sender?.image;
  const target = messageNotificationTargetLabel(notification);
  const snippet = messageNotificationSnippet(notification);

  return (
    <div className="flex w-[min(20rem,calc(100vw-2rem))] items-start gap-3 rounded-lg bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
      <Link
        href={messageNotificationHref(notification)}
        className="flex min-w-0 flex-1 items-start gap-3"
        onClick={onDismiss}
      >
        <Avatar size="sm" className="mt-0.5">
          <AvatarImage src={senderImage ?? undefined} alt="" />
          <AvatarFallback>{personInitials(senderName)}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <span className="w-full truncate text-sm font-medium">
            {senderName}
          </span>
          <span className="w-full truncate text-xs text-muted-foreground">
            {target}
          </span>
          <span className="line-clamp-2 w-full text-xs text-muted-foreground">
            {snippet}
          </span>
        </span>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <X />
      </Button>
    </div>
  );
}
