import { ChannelInfoForm } from '../_components/channel-info-form';

export default async function ChannelInfoSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;

  return <ChannelInfoForm workspaceId={workspaceId} channelId={channelId} />;
}
