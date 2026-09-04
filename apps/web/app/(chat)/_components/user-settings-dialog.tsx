'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Palette, UserRound } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import {
  ChangePasswordForm,
  ProfileIdentityFields,
  SignOutButton,
  type ProfileUser,
} from '../settings/_components/account-settings-fields';

export const PROFILE_SETTINGS_PARAM = 'settings';
export type ProfileSettingsTab = 'account' | 'appearance';

const NAV_ITEMS: {
  tab: ProfileSettingsTab;
  label: string;
  icon: typeof UserRound;
}[] = [
  { tab: 'account', label: 'My Account', icon: UserRound },
  { tab: 'appearance', label: 'Appearance', icon: Palette },
];

export function profileSettingsHref(
  tab: ProfileSettingsTab = 'account',
  search?: Pick<URLSearchParams, 'toString'>,
) {
  const params = new URLSearchParams(search?.toString() ?? '');
  params.set(PROFILE_SETTINGS_PARAM, tab);
  return `?${params.toString()}`;
}

export function UserSettingsDialogHost({ user }: { user: ProfileUser }) {
  return (
    <Suspense fallback={null}>
      <UserSettingsDialogFromSearch user={user} />
    </Suspense>
  );
}

function UserSettingsDialogFromSearch({ user }: { user: ProfileUser }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = searchParams.get(PROFILE_SETTINGS_PARAM);
  const open = raw !== null;
  const tab: ProfileSettingsTab =
    raw === 'appearance' ? 'appearance' : 'account';

  return (
    <UserSettingsDialog
      user={user}
      tab={tab}
      open={open}
      search={searchParams}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete(PROFILE_SETTINGS_PARAM);
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
      }}
    />
  );
}

function UserSettingsDialog({
  user,
  tab,
  open,
  search,
  onOpenChange,
}: {
  user: ProfileUser;
  tab: ProfileSettingsTab;
  open: boolean;
  search: Pick<URLSearchParams, 'toString'>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(40rem,calc(100vh-2rem))] w-full max-w-4xl gap-0 overflow-hidden p-0 text-sm sm:max-w-4xl">
        <DialogTitle className="sr-only">User settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your profile, password, and appearance.
        </DialogDescription>

        <aside className="flex w-48 shrink-0 flex-col gap-1 border-r bg-muted/30 p-3">
          <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
            User settings
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.tab;
            return (
              <Link
                key={item.tab}
                href={profileSettingsHref(item.tab, search)}
                replace
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </aside>

        <ScrollArea className="h-full min-w-0 flex-1">
          <div className="flex flex-col gap-6 p-6 pr-12">
            {tab === 'account' ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold">My Account</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your photo, name, and password, or sign out of
                    JeiChat.
                  </p>
                </div>
                <ProfileIdentityFields user={user} />
                <Separator />
                <ChangePasswordForm />
                <Separator />
                <SignOutButton />
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-semibold">Appearance</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose how JeiChat looks on this device.
                  </p>
                </div>
                <ThemeToggle />
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
