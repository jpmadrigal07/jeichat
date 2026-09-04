'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

export type AuthPanelInitialSession = Awaited<
  ReturnType<typeof authClient.getSession>
>;

export type AuthMode = 'sign-in' | 'sign-up';

type AuthPanelProps = {
  mode?: AuthMode;
  /** From {@link getServerSession} on the server — avoids an empty flash before `useSession` finishes. */
  initialSession?: AuthPanelInitialSession;
};

export function AuthPanel({
  mode = 'sign-in',
  initialSession,
}: AuthPanelProps = {}) {
  const sessionState = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isSignUp = mode === 'sign-up';

  const user = sessionState.isPending
    ? initialSession?.error == null && initialSession?.data?.user
      ? initialSession.data.user
      : sessionState.data?.user
    : sessionState.data?.user;

  function enterApp() {
    window.location.assign('/w');
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    const name = String(data.get('name') ?? '').trim();

    startTransition(async () => {
      setError(null);
      if (mode === 'sign-up') {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0] || 'User',
        });
        if (err) {
          setError(err.message ?? 'Sign up failed');
          return;
        }
        enterApp();
        return;
      }

      const { error: err } = await authClient.signIn.email({
        email,
        password,
      });
      if (err) {
        setError(err.message ?? 'Sign in failed');
        return;
      }
      enterApp();
    });
  }

  async function handleSignOut() {
    setError(null);
    await authClient.signOut();
  }

  const submitLabel = pending
    ? 'Please wait...'
    : isSignUp
      ? 'Create account'
      : 'Log in';

  return (
    <Card className="w-full max-w-md gap-6 py-6">
      <CardHeader>
        <CardTitle>
          {isSignUp ? 'Create an account' : 'Welcome back'}
        </CardTitle>
        <CardDescription>
          {isSignUp
            ? 'Join your team on JeiChat.'
            : "We're glad you're here."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {user ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Signed in as{' '}
              <span className="font-medium">{user.name ?? user.email}</span>
            </p>
            <Button type="button" className="w-full" asChild>
              <a href="/w">Continue</a>
            </Button>
            <Button type="button" variant="outline" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FieldGroup>
              {isSignUp ? (
                <Field>
                  <FieldLabel htmlFor="auth-name">Name</FieldLabel>
                  <Input
                    id="auth-name"
                    name="name"
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                  />
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="auth-email">Email</FieldLabel>
                <Input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="auth-password">Password</FieldLabel>
                <Input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
                {isSignUp ? (
                  <FieldDescription>At least 8 characters.</FieldDescription>
                ) : null}
              </Field>
            </FieldGroup>

            {error ? <FieldError>{error}</FieldError> : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={pending}
            >
              {pending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : null}
              {submitLabel}
            </Button>
          </form>
        )}
      </CardContent>

      {user ? null : (
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
            <Button variant="link" size="sm" className="h-auto px-0" asChild>
              <Link href={isSignUp ? '/' : '/?mode=sign-up'}>
                {isSignUp ? 'Log in' : 'Register'}
              </Link>
            </Button>
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
