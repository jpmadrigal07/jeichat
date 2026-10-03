'use client';

import { Switch } from '@/components/ui/switch';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { useDesktopNotifications } from '../../_hooks/use-desktop-notifications';
import { useNotificationPermissionHelp } from '../../_hooks/use-notification-permission-guidance';

const DEFAULT_DESCRIPTION =
  'Show a system notification for new messages, even when JeiChat is in the background or another app is focused.';

export function DesktopNotificationsToggle() {
  const { enabled, permission, setEnabled } = useDesktopNotifications();
  const help = useNotificationPermissionHelp();
  const locked = permission === 'denied' && help?.kind !== 'ios-safari';

  return (
    <Field orientation="horizontal" data-disabled={locked || undefined}>
      <Switch
        id="desktop-notifications"
        checked={enabled && !locked}
        disabled={locked}
        onCheckedChange={setEnabled}
      />
      <FieldContent>
        <FieldLabel htmlFor="desktop-notifications">
          Desktop notifications
        </FieldLabel>
        <FieldDescription>
          {help?.description ?? DEFAULT_DESCRIPTION}
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}
