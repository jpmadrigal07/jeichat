'use client';

import { ThemeModeButton } from '@/components/theme-toggle';
import {
  AuthPanel,
  type AuthPanelInitialSession,
  type AuthMode,
} from '@/components/auth-panel';

export function AuthPage({
  mode,
  initialSession,
}: {
  mode: AuthMode;
  initialSession?: AuthPanelInitialSession;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeModeButton />
      </div>
      <AuthPanel mode={mode} initialSession={initialSession} />
    </main>
  );
}
