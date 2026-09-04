import { redirect } from 'next/navigation';

export default async function ChannelSettingsIndexPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;
  redirect(`/w/${workspaceId}/c/${channelId}/settings/info`);
}
