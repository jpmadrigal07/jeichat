import type { Channel } from '../_libs/channels';

export function isDmChannel(
  channel: Pick<Channel, 'channelType'> | null | undefined,
) {
  return channel?.channelType === 'dm';
}

export function channelDisplayName(channel: Channel): string {
  if (isDmChannel(channel) && channel.dmPeer) {
    return channel.dmPeer.name;
  }
  return channel.name;
}

/** Label for GitHub-style header breadcrumbs (includes # for channels). */
export function channelBreadcrumbLabel(
  channel: Pick<Channel, 'channelType' | 'name' | 'dmPeer'> | null | undefined,
  fallback = 'Channel',
): string {
  if (!channel) return fallback;
  if (isDmChannel(channel)) {
    return channel.dmPeer?.name ?? channel.name ?? fallback;
  }
  return `# ${channel.name}`;
}
