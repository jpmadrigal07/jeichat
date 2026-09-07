'use client';

import { useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChannels } from '../../../_hooks/use-channels';

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: channels } = useChannels(workspaceId);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (channels && channels.length > 0) {
      const general = channels.find(
        (c) => c.name === 'general' && c.channelType !== 'dm' && !c.parentId,
      );
      const firstChannel =
        general ??
        channels.find((c) => c.channelType !== 'dm' && !c.parentId) ??
        channels[0];
      if (firstChannel) {
        startTransition(() => {
          router.replace(`/w/${workspaceId}/c/${firstChannel.id}`);
        });
      }
    }
  }, [channels, workspaceId, router]);

  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      <p className="text-sm">Loading channels...</p>
    </div>
  );
}
