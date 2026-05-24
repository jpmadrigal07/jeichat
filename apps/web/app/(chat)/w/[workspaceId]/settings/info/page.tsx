import { WorkspaceInfoForm } from '../_components/workspace-info-form';

export default async function WorkspaceInfoSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return <WorkspaceInfoForm workspaceId={workspaceId} />;
}
