'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function WorkspaceSettingsIndexPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const router = useRouter();

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');

    function openGeneral() {
      if (!media.matches) return;
      router.replace(`/w/${workspaceId}/settings/info`);
    }

    openGeneral();
    media.addEventListener('change', openGeneral);
    return () => media.removeEventListener('change', openGeneral);
  }, [router, workspaceId]);

  return null;
}
