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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateChannel } from '../_hooks/use-channels';

export function CreateChannelDialog({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const createChannel = useCreateChannel(workspaceId);
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = (formData.get('description') as string) || undefined;

    if (!name.trim()) return;

    createChannel.mutate(
      { name: name.trim(), description },
      {
        onSuccess: (channel) => {
          closeRef.current?.click();
          router.push(`/w/${workspaceId}/c/${channel.id}`);
        },
      },
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
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
            <Label htmlFor="ch-desc">Description (optional)</Label>
            <Textarea
              id="ch-desc"
              name="description"
              placeholder="What's this channel about?"
              rows={2}
            />
          </div>
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
