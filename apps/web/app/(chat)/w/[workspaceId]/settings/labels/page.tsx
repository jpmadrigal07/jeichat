import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkspaceLabelsPanel } from '../_components/workspace-labels-panel';

export default async function WorkspaceLabelsSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex max-w-3xl flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <WorkspaceLabelsPanel workspaceId={workspaceId} />
    </Suspense>
  );
}
