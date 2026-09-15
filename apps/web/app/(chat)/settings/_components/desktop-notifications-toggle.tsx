'use client';

import { Switch } from '@/components/ui/switch';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { useDesktopNotifications } from '../../_hooks/use-desktop-notifications';

export function DesktopNotificationsToggle() {
  const { enabled, permission, setEnabled } = useDesktopNotifications();
  const denied = permission === 'denied';

  return (
    <Field orientation="horizontal" data-disabled={denied || undefined}>
      <Switch
        id="desktop-notifications"
        checked={enabled && !denied}
        disabled={denied}
        onCheckedChange={setEnabled}
      />
      <FieldContent>
        <FieldLabel htmlFor="desktop-notifications">
          Desktop notifications
        </FieldLabel>
        <FieldDescription>
          {denied
            ? 'Notifications are blocked in this browser. Allow them in site settings to get a system alert for new messages.'
            : 'Show a system notification for new messages, even when JeiChat is in the background or another app is focused.'}
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}
