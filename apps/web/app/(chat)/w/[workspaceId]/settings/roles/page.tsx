import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkspaceRolesPanel } from '../_components/workspace-roles-panel';

export default async function WorkspaceRolesSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex max-w-4xl flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <WorkspaceRolesPanel workspaceId={workspaceId} />
    </Suspense>
  );
}
