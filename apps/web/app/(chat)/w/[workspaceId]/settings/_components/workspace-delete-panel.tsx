'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteWorkspace,
  useWorkspaces,
} from '../../../../_hooks/use-workspaces';

export function WorkspaceDeletePanel({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const deleteWorkspace = useDeleteWorkspace();
  const router = useRouter();
  const [confirmName, setConfirmName] = useState('');

  const isOwner = workspace?.role === 'owner';

  function handleDelete() {
    if (!workspace || confirmName !== workspace.name) return;

    deleteWorkspace.mutate(workspace.id, {
      onSuccess: () => {
        router.push('/w');
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Only the workspace owner can delete this workspace.
      </p>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-destructive">Danger zone</h1>
        <p className="text-sm text-muted-foreground">
          Deleting a workspace removes all channels and messages permanently.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-destructive/20 p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ws-delete-confirm" className="text-xs">
            Type <span className="font-semibold">{workspace.name}</span> to
            confirm
          </Label>
          <Input
            id="ws-delete-confirm"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={workspace.name}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={
              confirmName !== workspace.name || deleteWorkspace.isPending
            }
            onClick={handleDelete}
          >
            {deleteWorkspace.isPending ? 'Deleting...' : 'Delete workspace'}
          </Button>
        </div>
      </div>
    </div>
  );
}
