'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PresenceAvatar } from './presence-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';
import { chatUserFooterClass } from '../_helpers/chat-footer-classes';
import {
  profileSettingsHref,
  UserSettingsDialogHost,
} from './user-settings-dialog';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function UserBar({ user }: { user: User }) {
  return (
    <>
      <Suspense
        fallback={
          <UserBarChrome user={user} settingsHref="?settings=account" />
        }
      >
        <UserBarWithSearch user={user} />
      </Suspense>
      <UserSettingsDialogHost user={user} />
    </>
  );
}

function UserBarWithSearch({ user }: { user: User }) {
  const searchParams = useSearchParams();
  return (
    <UserBarChrome
      user={user}
      settingsHref={profileSettingsHref('account', searchParams)}
    />
  );
}

function UserBarChrome({
  user,
  settingsHref,
}: {
  user: User;
  settingsHref: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/');
  }

  return (
    <div className={chatUserFooterClass}>
      <div className="flex h-11 w-full items-center gap-1 rounded-lg border bg-muted/30 px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-sidebar-accent"
            >
              <PresenceAvatar
                userId={user.id}
                name={user.name}
                image={user.image}
                className="size-7"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground leading-tight">
                  {user.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href={settingsHref}>
                <Settings />
                My Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground',
          )}
          asChild
        >
          <Link href={settingsHref}>
            <Settings />
            <span className="sr-only">Account settings</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
