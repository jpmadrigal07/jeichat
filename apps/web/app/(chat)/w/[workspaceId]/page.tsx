'use client';

import { useEffect, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChannels } from '../../_hooks/use-channels';

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: channels } = useChannels(workspaceId);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (channels && channels.length > 0) {
      const general =
        channels.find((c) => c.name === 'general') ?? channels[0];
      startTransition(() => {
        router.replace(`/w/${workspaceId}/c/${general.id}`);
      });
    }
  }, [channels, workspaceId, router]);

  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      <p className="text-sm">Loading channels...</p>
    </div>
  );
}
