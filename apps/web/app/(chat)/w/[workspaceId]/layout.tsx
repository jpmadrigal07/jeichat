import { WorkspaceAccessGate } from '@chat/_components/workspace-access-gate';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return (
    <WorkspaceAccessGate workspaceId={workspaceId}>
      {children}
    </WorkspaceAccessGate>
  );
}
