'use client';

import { useRef, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import { useCreateChannel } from '../_hooks/use-channels';
import { useWorkspaceMembers } from '../_hooks/use-workspaces';

export function CreateChannelDialog({
  workspaceId,
  currentUserId,
  children,
}: {
  workspaceId: string;
  currentUserId: string;
  children: React.ReactNode;
}) {
  const createChannel = useCreateChannel(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  const inviteableMembers = (members ?? []).filter(
    (member) => member.userId !== currentUserId,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const ticketKey = (formData.get('ticketKey') as string).trim();
    const description = (formData.get('description') as string) || undefined;
    const memberIds = formData.getAll('memberIds').filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );

    if (!name.trim()) return;

    createChannel.mutate(
      {
        name: name.trim(),
        description,
        ticketKey: ticketKey || undefined,
        isPrivate,
        memberIds: isPrivate ? memberIds : [],
      },
      {
        onSuccess: (channel) => {
          closeRef.current?.click();
          setIsPrivate(false);
          router.push(`/w/${workspaceId}/c/${channel.id}`);
        },
      },
    );
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setIsPrivate(false);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>{children}</DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">Create channel</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-name">Channel name</Label>
            <Input
              id="ch-name"
              name="name"
              placeholder="e.g. architecture-decisions"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-key">Key</Label>
            <Input
              id="ch-key"
              name="ticketKey"
              placeholder="e.g. BOS"
              maxLength={5}
              className="uppercase"
              autoCapitalize="characters"
            />
            <p className="text-xs text-muted-foreground">
              Used in ticket IDs like BOS-1. Leave blank to generate from the
              name.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-desc">Description (optional)</Label>
            <Textarea
              id="ch-desc"
              name="description"
              placeholder="What's this channel about?"
              rows={2}
            />
          </div>
          <Field orientation="horizontal">
            <Switch
              id="ch-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
            <FieldContent>
              <FieldLabel htmlFor="ch-private">Private channel</FieldLabel>
              <FieldDescription>
                Only you and members you add can see this channel. Owners and
                Administrators always can.
              </FieldDescription>
            </FieldContent>
          </Field>
          {isPrivate ? (
            <FieldSet>
              <FieldLegend>Members</FieldLegend>
              <FieldDescription>
                You&apos;re added automatically. Choose who else can access
                this channel.
              </FieldDescription>
              {inviteableMembers.length > 0 ? (
                <ScrollArea className="max-h-48">
                  <FieldGroup className="gap-1">
                    {inviteableMembers.map((member) => (
                      <Field
                        key={member.userId}
                        orientation="horizontal"
                        className="rounded-md px-2 py-1.5"
                      >
                        <input
                          type="checkbox"
                          id={`ch-member-${member.userId}`}
                          name="memberIds"
                          value={member.userId}
                          className="size-4 accent-primary"
                        />
                        <PresenceAvatar
                          userId={member.userId}
                          name={member.name}
                          image={member.image}
                          workspaceId={workspaceId}
                          showOffline
                        />
                        <FieldLabel
                          htmlFor={`ch-member-${member.userId}`}
                          className="min-w-0 flex-1 font-normal"
                        >
                          <span className="truncate">{member.name}</span>
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No other workspace members to add yet.
                </p>
              )}
            </FieldSet>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose ref={closeRef} asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createChannel.isPending}>
              {createChannel.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
