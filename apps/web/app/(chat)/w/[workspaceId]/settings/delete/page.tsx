import { WorkspaceDeletePanel } from '../_components/workspace-delete-panel';

export default async function WorkspaceDeleteSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return <WorkspaceDeletePanel workspaceId={workspaceId} />;
}
