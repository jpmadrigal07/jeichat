'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useChannels,
  useUpdateChannel,
} from '../../../../../../_hooks/use-channels';

export function ChannelInfoForm({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}) {
  const { data: channels, isLoading } = useChannels(workspaceId);
  const channel = channels?.find((ch) => ch.id === channelId);
  const updateChannel = useUpdateChannel(workspaceId);

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const description =
      (formData.get('description') as string).trim() || null;

    if (!name || !channel) return;

    updateChannel.mutate({ channelId: channel.id, name, description });
  }

  if (isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
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
        <h1 className="text-lg font-semibold">General</h1>
        <p className="text-sm text-muted-foreground">
          Update this channel&apos;s name and description.
        </p>
      </div>

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
    </div>
  );
}
