'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useUpdateWorkspace,
  useWorkspaces,
} from '@chat/_hooks/use-workspaces';

export function WorkspaceInfoForm({ workspaceId }: { workspaceId: string }) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const updateWorkspace = useUpdateWorkspace();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const icon = (formData.get('icon') as string).trim() || null;
    const doneTicketArchiveAfterDays = Number(
      formData.get('doneTicketArchiveAfterDays'),
    );

    if (!name || !workspace) return;

    updateWorkspace.mutate({
      id: workspace.id,
      name,
      icon,
      doneTicketArchiveAfterDays,
    });
  }

  if (isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">General</h1>
        <p className="text-sm text-muted-foreground">
          Update your workspace name, icon, and ticket archive policy.
        </p>
      </div>

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
        <div className="flex flex-col gap-2">
          <Label htmlFor="ws-settings-archive-days">
            Auto-archive Done tickets after
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="ws-settings-archive-days"
              name="doneTicketArchiveAfterDays"
              type="number"
              min={0}
              max={365}
              step={1}
              defaultValue={workspace.doneTicketArchiveAfterDays ?? 30}
              className="w-24"
              required
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tickets that stay Done for this long are moved to Archived. Set to
            0 to turn auto-archive off.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={updateWorkspace.isPending}>
            {updateWorkspace.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
