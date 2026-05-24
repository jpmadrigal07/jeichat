import { SettingsShell } from './_components/settings-shell';

export default async function WorkspaceSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  return <SettingsShell workspaceId={workspaceId}>{children}</SettingsShell>;
}
