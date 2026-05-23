'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserMinus } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useUpdateWorkspace,
  useDeleteWorkspace,
  useWorkspaceMembers,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
} from '../_hooks/use-workspaces';
import type { Workspace } from '../_libs/workspaces';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(
    open ? workspace.id : '',
  );
  const addMember = useAddWorkspaceMember(workspace.id);
  const removeMember = useRemoveWorkspaceMember(workspace.id);
  const router = useRouter();
  const [confirmName, setConfirmName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const isOwner = workspace.role === 'owner';

  function close() {
    setConfirmName('');
    setInviteEmail('');
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

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    addMember.mutate(
      { email },
      {
        onSuccess: () => setInviteEmail(''),
      },
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
      <DialogContent key={workspace.id} className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>
            Update your workspace, manage members, or delete it permanently.
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
            <h4 className="text-sm font-medium">Members</h4>
            <p className="text-xs text-muted-foreground">
              {isOwner
                ? 'Invite people by email. They must already have a JeiChat account.'
                : 'People who belong to this workspace.'}
            </p>
          </div>

          {isOwner ? (
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
              />
              <Button
                type="submit"
                disabled={addMember.isPending || !inviteEmail.trim()}
              >
                {addMember.isPending ? 'Adding...' : 'Add'}
              </Button>
            </form>
          ) : null}

          <div className="flex flex-col gap-1">
            {membersLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : members && members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  {member.role === 'owner' ? (
                    <Badge variant="secondary">Owner</Badge>
                  ) : isOwner ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate(member.userId)}
                    >
                      <UserMinus />
                      <span className="sr-only">Remove {member.name}</span>
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
          </div>
        </div>

        {isOwner ? (
          <>
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
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
