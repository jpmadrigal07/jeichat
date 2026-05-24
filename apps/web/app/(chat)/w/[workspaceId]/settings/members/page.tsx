import { WorkspaceMembersPanel } from '../_components/workspace-members-panel';

export default async function WorkspaceMembersSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return <WorkspaceMembersPanel workspaceId={workspaceId} />;
}
