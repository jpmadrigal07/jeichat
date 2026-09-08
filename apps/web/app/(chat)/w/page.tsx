'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CreateWorkspaceDialog } from '../_components/create-workspace-dialog';
import { useWorkspaces } from '../_hooks/use-workspaces';

export default function WorkspaceIndexPage() {
  const router = useRouter();
  const { data: workspaces, isLoading } = useWorkspaces();

  useEffect(() => {
    const first = workspaces?.[0];
    if (!first) return;
    router.replace(`/w/${first.id}`);
  }, [workspaces, router]);

  if (isLoading || workspaces?.length) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading workspaces…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h2 className="mb-2 text-lg font-semibold">Welcome to JeiChat</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          You don&apos;t have a workspace yet.
        </p>
        <CreateWorkspaceDialog>
          <Button>Create workspace</Button>
        </CreateWorkspaceDialog>
      </div>
    </div>
  );
}
