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
    const media = window.matchMedia('(max-width: 767px)');

    function openFirstChannel() {
      if (media.matches || !channels?.length) return;

      const general = channels.find(
        (c) => c.name === 'general' && c.channelType !== 'dm' && !c.parentId,
      );
      const firstChannel =
        general ??
        channels.find((c) => c.channelType !== 'dm' && !c.parentId) ??
        channels[0];
      if (!firstChannel) return;

      startTransition(() => {
        router.replace(`/w/${workspaceId}/c/${firstChannel.id}`);
      });
    }

    openFirstChannel();
    media.addEventListener('change', openFirstChannel);
    return () => media.removeEventListener('change', openFirstChannel);
  }, [channels, workspaceId, router]);

  return (
    <div className="flex flex-1 items-center justify-center text-muted-foreground">
      <p className="text-sm">Loading channels...</p>
    </div>
  );
}
