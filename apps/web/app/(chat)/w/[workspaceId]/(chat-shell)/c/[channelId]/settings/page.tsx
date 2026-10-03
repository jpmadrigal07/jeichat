'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ChannelSettingsIndexPage() {
  const { workspaceId, channelId } = useParams<{
    workspaceId: string;
    channelId: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');

    function openGeneral() {
      if (!media.matches) return;
      router.replace(`/w/${workspaceId}/c/${channelId}/settings/info`);
    }

    openGeneral();
    media.addEventListener('change', openGeneral);
    return () => media.removeEventListener('change', openGeneral);
  }, [channelId, router, workspaceId]);

  return null;
}
