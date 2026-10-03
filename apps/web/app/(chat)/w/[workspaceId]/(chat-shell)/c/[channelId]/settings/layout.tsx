import { ChannelSettingsShell } from './_components/settings-shell';

export default async function ChannelSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return (
    <ChannelSettingsShell workspaceId={workspaceId} channelId={channelId}>
      {children}
    </ChannelSettingsShell>
  );
}
