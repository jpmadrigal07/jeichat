'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-8 w-full rounded-md border border-border bg-background px-2 text-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30';

export type AuthPanelInitialSession = Awaited<
  ReturnType<typeof authClient.getSession>
>;

type AuthPanelProps = {
  /** From {@link getServerSession} on the server — avoids an empty flash before `useSession` finishes. */
  initialSession?: AuthPanelInitialSession;
};

export function AuthPanel({ initialSession }: AuthPanelProps = {}) {
  const sessionState = authClient.useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === 'sign-up') {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split('@')[0] || 'User',
        });
        if (err) setError(err.message ?? 'Sign up failed');
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
        });
        if (err) setError(err.message ?? 'Sign in failed');
      }
    } finally {
      setPending(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    await authClient.signOut();
  }

  const user = sessionState.isPending
    ? (initialSession?.error == null && initialSession?.data?.user
        ? initialSession.data.user
        : sessionState.data?.user)
    : sessionState.data?.user;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Better Auth</CardTitle>
        <CardDescription>
          Sessions are issued by the Nest API (
          <code className="rounded bg-muted px-1 py-0.5 text-[0.65rem]">
            {baseURLDisplay()}
          </code>
          ). Enable{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[0.65rem]">
            NEXT_PUBLIC_API_CREDENTIALS=true
          </code>{' '}
          for cookie credentials on API calls.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {user ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Signed in as{' '}
              <span className="font-medium">{user.name ?? user.email}</span>
            </p>
            <Button type="button" variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'sign-in' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMode('sign-in');
                  setError(null);
                }}
              >
                Sign in
              </Button>
              <Button
                type="button"
                variant={mode === 'sign-up' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setMode('sign-up');
                  setError(null);
                }}
              >
                Sign up
              </Button>
            </div>
            {mode === 'sign-up' ? (
              <label className="flex flex-col gap-1 text-xs">
                Name
                <input
                  className={cn(inputClass)}
                  autoComplete="name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="Ada Lovelace"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs">
              Email
              <input
                className={cn(inputClass)}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Password
              <input
                className={cn(inputClass)}
                type="password"
                autoComplete={
                  mode === 'sign-up' ? 'new-password' : 'current-password'
                }
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                placeholder="••••••••"
                minLength={8}
              />
            </label>
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending
                ? 'Working…'
                : mode === 'sign-up'
                  ? 'Create account'
                  : 'Sign in'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function baseURLDisplay(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return url && url.length > 0 ? url : '(set NEXT_PUBLIC_API_URL)';
}
