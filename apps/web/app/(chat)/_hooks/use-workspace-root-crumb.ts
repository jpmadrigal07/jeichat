import { useWorkspaces } from '@chat/_hooks/use-workspaces';

export function useWorkspaceRootCrumb(workspaceId: string) {
  const { data: workspaces } = useWorkspaces();
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);

  return {
    href: `/w/${workspaceId}`,
    label: workspace?.name ?? 'Channels',
  };
}
