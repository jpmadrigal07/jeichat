'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  ChangePasswordForm,
  ProfileIdentityFields,
  SignOutButton,
} from './account-settings-fields';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function AccountSettings({ user }: { user: User }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center gap-3 border-b px-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/w">
            <ArrowLeft />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Settings</p>
          <p className="truncate text-xs text-muted-foreground">
            Manage your profile and appearance.
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex max-w-lg flex-col gap-6">
          <div>
            <h1 className="text-lg font-semibold">My Account</h1>
            <p className="text-sm text-muted-foreground">
              Update your photo, name, and password, or sign out of JeiChat.
            </p>
          </div>

          <ProfileIdentityFields user={user} />

          <Separator />

          <ChangePasswordForm />

          <Separator />

          <ThemeToggle />

          <Separator />

          <SignOutButton />
        </div>
      </main>
    </div>
  );
}
