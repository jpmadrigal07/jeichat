'use client';

import { useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { chatUserFooterClass } from '../_helpers/chat-footer-classes';
import { UserSettingsDialog } from './user-settings-dialog';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserBar({ user }: { user: User }) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/');
  }

  return (
    <>
      <div className={chatUserFooterClass}>
        <div className="flex w-full items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-sidebar-accent"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-[0.625rem]">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
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
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                <Settings />
                My Account
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
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Account settings</span>
          </Button>
        </div>
      </div>

      <UserSettingsDialog
        user={user}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}
