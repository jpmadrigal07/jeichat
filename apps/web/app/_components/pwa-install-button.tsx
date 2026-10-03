'use client';

import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { usePwaInstall } from '@/app/_hooks/use-pwa-install';
import { promptPwaInstall } from '@/lib/pwa';

export function requestPwaInstall() {
  return promptPwaInstall().then((outcome) => {
    if (outcome === 'unavailable') {
      toast.error(
        'Install is not ready yet. Use “Install page as app…” in the browser menu.',
      );
    }
    return outcome;
  });
}

export function PwaInstallButton() {
  const { installed } = usePwaInstall();

  if (installed) {
    return (
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel>Install app</FieldLabel>
          <FieldDescription>
            JeiChat is already installed on this device.
          </FieldDescription>
        </FieldContent>
      </Field>
    );
  }

  return (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor="pwa-install">Install app</FieldLabel>
        <FieldDescription>
          Open JeiChat like an app from your desktop or home screen, without
          using the browser menu.
        </FieldDescription>
      </FieldContent>
      <Button id="pwa-install" type="button" onClick={() => void requestPwaInstall()}>
        <Download data-icon="inline-start" />
        Install
      </Button>
    </Field>
  );
}
