import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChannelGithubPanel } from '../_components/channel-github-panel';

export default async function ChannelGithubSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex max-w-lg flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
        </div>
      }
    >
      <ChannelGithubPanel workspaceId={workspaceId} channelId={channelId} />
    </Suspense>
  );
}
