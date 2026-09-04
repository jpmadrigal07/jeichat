'use client';

import { useState } from 'react';
import { Plus, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import { useChannels, useUpdateChannel } from '@chat/_hooks/use-channels';
import {
  useAddChannelMember,
  useChannelMembers,
  useRemoveChannelMember,
} from '@chat/_hooks/use-channel-members';
import { useWorkspaceMembers } from '@chat/_hooks/use-workspaces';
import { cn } from '@/lib/utils';

export function ChannelMembersPanel({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}) {
  const { data: channels, isLoading: channelsLoading } =
    useChannels(workspaceId);
  const channel = channels?.find((ch) => ch.id === channelId);
  const isThread = Boolean(channel?.parentId);
  const { data: membersResponse, isLoading: membersLoading } =
    useChannelMembers(workspaceId, channelId, !!channel && !isThread);
  const updateChannel = useUpdateChannel(workspaceId);

  const isLoading = channelsLoading || membersLoading;
  const canManage = membersResponse?.canManage ?? false;
  const members = membersResponse?.data ?? [];
  const isPrivate = channel?.isPrivate ?? false;

  if (isLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!channel || channel.parentId) {
    return (
      <p className="text-sm text-muted-foreground">
        Tickets inherit members from their parent channel.
      </p>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">
          Choose who can see #{channel.name}. Owners and Administrators always
          have access.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Field orientation="horizontal">
          <Switch
            id="channel-private"
            checked={isPrivate}
            disabled={!canManage || updateChannel.isPending}
            onCheckedChange={(checked) =>
              updateChannel.mutate({
                channelId: channel.id,
                isPrivate: checked,
              })
            }
          />
          <FieldContent>
            <FieldLabel htmlFor="channel-private">Private channel</FieldLabel>
            <FieldDescription>
              When private, only members you add can find this channel.
            </FieldDescription>
          </FieldContent>
        </Field>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Channel members
              {members.length > 0 ? ` (${members.length})` : ''}
            </p>
            {canManage ? (
              <AddChannelMemberDialog
                workspaceId={workspaceId}
                channelId={channelId}
                addedUserIds={new Set(members.map((member) => member.userId))}
              />
            ) : null}
          </div>

          {members.length > 0 ? (
            <div className="flex flex-col gap-1">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5"
                >
                  <PresenceAvatar
                    userId={member.userId}
                    name={member.name}
                    image={member.image}
                    workspaceId={workspaceId}
                    showOffline
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  {canManage ? (
                    <RemoveChannelMemberButton
                      workspaceId={workspaceId}
                      channelId={channelId}
                      userId={member.userId}
                      name={member.name}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No members added</EmptyTitle>
                <EmptyDescription>
                  {isPrivate
                    ? 'Add people so they can see this private channel.'
                    : 'This channel is public. Add members only if you want extra access grants.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </div>
    </div>
  );
}

function RemoveChannelMemberButton({
  workspaceId,
  channelId,
  userId,
  name,
}: {
  workspaceId: string;
  channelId: string;
  userId: string;
  name: string;
}) {
  const removeMember = useRemoveChannelMember(workspaceId, channelId);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={removeMember.isPending}
      onClick={() => removeMember.mutate(userId)}
    >
      <UserMinus />
      <span className="sr-only">Remove {name}</span>
    </Button>
  );
}

function AddChannelMemberDialog({
  workspaceId,
  channelId,
  addedUserIds,
}: {
  workspaceId: string;
  channelId: string;
  addedUserIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceId);
  const addMember = useAddChannelMember(workspaceId, channelId);
  const available =
    workspaceMembers?.filter((member) => !addedUserIds.has(member.userId)) ??
    [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            Choose a workspace member who should be able to see this channel.
          </DialogDescription>
        </DialogHeader>

        {available.length > 0 ? (
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {available.map((member) => (
              <button
                key={member.userId}
                type="button"
                disabled={addMember.isPending}
                onClick={() =>
                  addMember.mutate(member.userId, {
                    onSuccess: () => setOpen(false),
                  })
                }
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                <PresenceAvatar
                  userId={member.userId}
                  name={member.name}
                  image={member.image}
                  workspaceId={workspaceId}
                  showOffline
                />
                <span className="min-w-0 flex-1 truncate">{member.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Everyone in the workspace is already in this channel.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
