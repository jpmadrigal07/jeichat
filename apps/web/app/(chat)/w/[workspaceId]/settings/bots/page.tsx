import { WorkspaceBotsPanel } from '../_components/workspace-bots-panel';

export default async function WorkspaceBotsSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return <WorkspaceBotsPanel workspaceId={workspaceId} />;
}
