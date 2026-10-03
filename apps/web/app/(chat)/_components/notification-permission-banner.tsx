'use client';

import { Bell, X } from 'lucide-react';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNotificationPermissionBanner } from '../_hooks/use-notification-permission-guidance';

export function NotificationPermissionBanner() {
  const { help, dismiss, ask } = useNotificationPermissionBanner();
  if (!help) return null;

  return (
    <div className="shrink-0 border-b p-3">
      <Alert>
        <Bell />
        <AlertTitle>{help.title}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          <p>{help.description}</p>
          {help.canAsk ? (
            <Button type="button" size="sm" onClick={() => void ask()}>
              Allow
            </Button>
          ) : null}
        </AlertDescription>
        <AlertAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss notification help"
            onClick={dismiss}
          >
            <X />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}
