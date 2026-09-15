'use client';

import { Switch } from '@/components/ui/switch';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { useInboxNotificationSound } from '../../_hooks/use-inbox-notification-sound';

export function InboxNotificationSoundToggle() {
  const { enabled, setEnabled } = useInboxNotificationSound();

  return (
    <Field orientation="horizontal">
      <Switch
        id="inbox-notification-sound"
        checked={enabled}
        onCheckedChange={setEnabled}
      />
      <FieldContent>
        <FieldLabel htmlFor="inbox-notification-sound">
          Notification sound
        </FieldLabel>
        <FieldDescription>
          Play JeiChat's notification sound for inbox items, new messages, and
          desktop alerts.
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}
