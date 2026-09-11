'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { authClient } from '@/lib/auth-client';
import { CreateWorkspaceDialog } from './create-workspace-dialog';
import { useWorkspaces } from '../_hooks/use-workspaces';

export function WorkspaceIndex({
  canCreateWorkspace,
}: {
  canCreateWorkspace: boolean;
}) {
  const router = useRouter();
  const { data: workspaces, isLoading } = useWorkspaces();

  useEffect(() => {
    const first = workspaces?.[0];
    if (!first) return;
    router.replace(`/w/${first.id}`);
  }, [workspaces, router]);

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/login');
  }

  if (isLoading || workspaces?.length) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading workspaces…</p>
      </div>
    );
  }

  return (
    <Empty className="min-h-svh border-0">
      <EmptyHeader>
        <EmptyTitle className="text-lg font-semibold">
          Welcome to JeiChat
        </EmptyTitle>
        <EmptyDescription>
          {canCreateWorkspace
            ? "You don't have a workspace yet."
            : "You don't have a workspace yet. Ask an admin to invite you."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {canCreateWorkspace ? (
          <CreateWorkspaceDialog>
            <Button>Create workspace</Button>
          </CreateWorkspaceDialog>
        ) : null}
        <Button type="button" variant="ghost" onClick={handleSignOut}>
          <LogOut data-icon="inline-start" />
          Log out
        </Button>
      </EmptyContent>
    </Empty>
  );
}
