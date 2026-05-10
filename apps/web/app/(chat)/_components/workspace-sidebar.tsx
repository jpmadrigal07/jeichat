'use client';

import { useWorkspaces } from '../_hooks/use-workspaces';
import { WorkspaceSwitcher } from './workspace-switcher';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export function WorkspaceSidebar({ user }: { user: User }) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const params = useParams<{ workspaceId?: string }>();

  return (
    <div className="flex w-[72px] flex-col items-center gap-2 bg-sidebar py-3 border-r">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-12 rounded-2xl" />
          ))}
        </div>
      ) : (
        <WorkspaceSwitcher
          workspaces={workspaces ?? []}
          activeWorkspaceId={params.workspaceId}
          user={user}
        />
      )}
      <Separator className="mx-auto w-8" />
    </div>
  );
}
