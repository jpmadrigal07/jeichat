'use client';

import { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useWorkspaces,
  useWorkspaceMembers,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
} from '../../../../_hooks/use-workspaces';
import { getInitials } from '../_helpers/get-initials';

export function WorkspaceMembersPanel({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { data: workspaces, isLoading: workspaceLoading } = useWorkspaces();
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const { data: members, isLoading: membersLoading } =
    useWorkspaceMembers(workspaceId);
  const addMember = useAddWorkspaceMember(workspaceId);
  const removeMember = useRemoveWorkspaceMember(workspaceId);
  const [inviteEmail, setInviteEmail] = useState('');

  const isOwner = workspace?.role === 'owner';

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

  if (workspaceLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
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
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">
          {isOwner
            ? 'Invite people by email. They must already have a JeiChat account.'
            : 'People who belong to this workspace.'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
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
    </div>
  );
}
