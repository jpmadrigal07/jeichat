'use client';

import { redirect } from 'next/navigation';
import { useWorkspaces } from '../_hooks/use-workspaces';

/**
 * Sends people away from a workspace that is not in their list, which is what
 * a removed member sees (live via the membership socket, or by opening an old
 * URL). It waits out in-flight refetches so a workspace that was just created
 * or joined is not mistaken for one the user lost.
 */
export function WorkspaceAccessGate({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const { data: workspaces, isFetching } = useWorkspaces();

  if (
    !isFetching &&
    workspaces &&
    !workspaces.some((workspace) => workspace.id === workspaceId)
  ) {
    redirect('/w');
  }

  return children;
}
