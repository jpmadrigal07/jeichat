'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  useUpdateWorkspace,
  useDeleteWorkspace,
} from '../_hooks/use-workspaces';
import type { Workspace } from '../_libs/workspaces';

export function WorkspaceSettingsDialog({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const router = useRouter();
  const [confirmName, setConfirmName] = useState('');

  function close() {
    setConfirmName('');
    onOpenChange(false);
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const icon = (formData.get('icon') as string).trim() || null;

    if (!name) return;

    updateWorkspace.mutate(
      { id: workspace.id, name, icon },
      { onSuccess: close },
    );
  }

  function handleDelete() {
    if (confirmName !== workspace.name) return;

    deleteWorkspace.mutate(workspace.id, {
      onSuccess: () => {
        close();
        router.push('/w');
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent key={workspace.id}>
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>
            Update your workspace or delete it permanently.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-settings-name">Workspace name</Label>
            <Input
              id="ws-settings-name"
              name="name"
              defaultValue={workspace.name}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-settings-icon">Icon (emoji)</Label>
            <Input
              id="ws-settings-icon"
              name="icon"
              defaultValue={workspace.icon ?? ''}
              placeholder="e.g. \u{1F680}"
              maxLength={2}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={updateWorkspace.isPending}>
              {updateWorkspace.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>

        <Separator />

        <div className="flex flex-col gap-3">
          <div>
            <h4 className="text-sm font-medium text-destructive">
              Danger zone
            </h4>
            <p className="text-xs text-muted-foreground">
              Deleting a workspace removes all channels and messages
              permanently.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-delete-confirm" className="text-xs">
              Type{' '}
              <span className="font-semibold">{workspace.name}</span> to
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
              {deleteWorkspace.isPending
                ? 'Deleting...'
                : 'Delete workspace'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
