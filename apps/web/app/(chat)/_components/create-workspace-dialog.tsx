'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCreateWorkspace } from '../_hooks/use-workspaces';

export function CreateWorkspaceDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const createWorkspace = useCreateWorkspace();
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const icon = (formData.get('icon') as string) || undefined;

    if (!name.trim()) return;

    createWorkspace.mutate(
      { name: name.trim(), icon },
      {
        onSuccess: (workspace) => {
          closeRef.current?.click();
          router.push(`/w/${workspace.id}/c/general`);
        },
      },
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              name="name"
              placeholder="e.g. Engineering"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ws-icon">Icon (emoji)</Label>
            <Input
              id="ws-icon"
              name="icon"
              placeholder="e.g. 🚀"
              maxLength={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose ref={closeRef} asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createWorkspace.isPending}>
              {createWorkspace.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
