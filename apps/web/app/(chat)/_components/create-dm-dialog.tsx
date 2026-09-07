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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import { useCreateOrGetDm } from '../_hooks/use-channels';
import { useWorkspaceMembers } from '../_hooks/use-workspaces';

export function CreateDmDialog({
  workspaceId,
  currentUserId,
  children,
}: {
  workspaceId: string;
  currentUserId: string;
  children: React.ReactNode;
}) {
  const createDm = useCreateOrGetDm(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);

  const inviteableMembers = (members ?? []).filter(
    (member) => member.userId !== currentUserId,
  );

  function startDm(targetUserId: string) {
    createDm.mutate(targetUserId, {
      onSuccess: (channel) => {
        closeRef.current?.click();
        router.push(`/w/${workspaceId}/c/${channel.id}`);
      },
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a direct message</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-72">
          <div className="flex flex-col gap-1 pr-3">
            {inviteableMembers.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">
                No other members in this workspace.
              </p>
            ) : (
              inviteableMembers.map((member) => (
                <Button
                  key={member.userId}
                  type="button"
                  variant="ghost"
                  className="justify-start gap-2 px-2"
                  disabled={createDm.isPending}
                  onClick={() => startDm(member.userId)}
                >
                  <PresenceAvatar
                    userId={member.userId}
                    name={member.name}
                    image={member.image}
                    size="sm"
                    showOffline
                  />
                  <span className="truncate">{member.name}</span>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogClose ref={closeRef} className="sr-only">
          Close
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
