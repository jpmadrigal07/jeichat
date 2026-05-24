'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WorkspaceRole } from '../../../../../../../_libs/workspace-roles';
import { useAssignRoleToChannel } from '../../../../../../../_hooks/use-workspace-roles';

export function AddChannelRoleDialog({
  workspaceId,
  channelId,
  availableRoles,
}: {
  workspaceId: string;
  channelId: string;
  availableRoles: WorkspaceRole[];
}) {
  const [open, setOpen] = useState(false);
  const assignRole = useAssignRoleToChannel(workspaceId, channelId);

  function handleSelect(roleId: string) {
    assignRole.mutate(
      { roleId },
      {
        onSuccess: () => setOpen(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus />
          Add role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add role</DialogTitle>
          <DialogDescription>
            Choose a role from workspace settings to assign channel permissions.
          </DialogDescription>
        </DialogHeader>

        {availableRoles.length > 0 ? (
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {availableRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                disabled={assignRole.isPending}
                onClick={() => handleSelect(role.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span className="min-w-0 flex-1 truncate">{role.name}</span>
                {role.isAdministrator ? (
                  <Shield className="size-3 shrink-0 text-muted-foreground" />
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>No additional roles are available to add.</p>
            <p>
              Create roles in{' '}
              <Link
                href={`/w/${workspaceId}/settings/roles`}
                className="font-medium text-foreground underline underline-offset-4"
                onClick={() => setOpen(false)}
              >
                workspace settings
              </Link>
              .
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
