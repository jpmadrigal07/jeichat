'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useChannels,
  useDeleteChannel,
} from '@chat/_hooks/use-channels';

export function ChannelDeletePanel({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}) {
  const { data: channels, isLoading } = useChannels(workspaceId);
  const channel = channels?.find((ch) => ch.id === channelId);
  const deleteChannel = useDeleteChannel(workspaceId);
  const router = useRouter();
  const [confirmName, setConfirmName] = useState('');

  function handleDelete() {
    if (!channel || confirmName !== channel.name) return;

    deleteChannel.mutate(channel.id, {
      onSuccess: () => {
        router.push(`/w/${workspaceId}`);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!channel) {
    return (
      <p className="text-sm text-muted-foreground">Channel not found.</p>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-destructive">Danger zone</h1>
        <p className="text-sm text-muted-foreground">
          Deleting a channel removes all its messages permanently.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-destructive/20 p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ch-delete-confirm" className="text-xs">
            Type <span className="font-semibold">{channel.name}</span> to
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
            {deleteChannel.isPending ? 'Deleting...' : 'Delete channel'}
          </Button>
        </div>
      </div>
    </div>
  );
}
