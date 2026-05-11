'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  useUpdateChannel,
  useDeleteChannel,
} from '../_hooks/use-channels';
import type { Channel } from '../_libs/channels';

export function ChannelSettingsDialog({
  workspaceId,
  channel,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateChannel = useUpdateChannel(workspaceId);
  const deleteChannel = useDeleteChannel(workspaceId);
  const router = useRouter();
  const params = useParams<{ channelId?: string }>();
  const [confirmName, setConfirmName] = useState('');

  function close() {
    setConfirmName('');
    onOpenChange(false);
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const description =
      (formData.get('description') as string).trim() || null;

    if (!name) return;

    updateChannel.mutate(
      { channelId: channel.id, name, description },
      { onSuccess: close },
    );
  }

  function handleDelete() {
    if (confirmName !== channel.name) return;

    deleteChannel.mutate(channel.id, {
      onSuccess: () => {
        close();
        if (params.channelId === channel.id) {
          router.push(`/w/${workspaceId}`);
        }
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
      <DialogContent key={channel.id}>
        <DialogHeader>
          <DialogTitle>Channel Settings</DialogTitle>
          <DialogDescription>
            Update this channel or delete it permanently.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-settings-name">Channel name</Label>
            <Input
              id="ch-settings-name"
              name="name"
              defaultValue={channel.name}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-settings-desc">Description</Label>
            <Textarea
              id="ch-settings-desc"
              name="description"
              defaultValue={channel.description ?? ''}
              placeholder="What's this channel about?"
              rows={2}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={updateChannel.isPending}>
              {updateChannel.isPending ? 'Saving...' : 'Save changes'}
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
              Deleting a channel removes all its messages permanently.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-delete-confirm" className="text-xs">
              Type{' '}
              <span className="font-semibold">{channel.name}</span> to
              confirm
            </Label>
            <Input
              id="ch-delete-confirm"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={channel.name}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={
                confirmName !== channel.name || deleteChannel.isPending
              }
              onClick={handleDelete}
            >
              {deleteChannel.isPending
                ? 'Deleting...'
                : 'Delete channel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
