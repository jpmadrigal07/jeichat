import type { Channel } from '../_libs/channels';

export function isDmChannel(
  channel: Pick<Channel, 'channelType'> | null | undefined,
) {
  return channel?.channelType === 'dm';
}

/**
 * A DM whose other person has left the workspace: still readable, but nothing
 * in it can be changed. Strict `=== false` so an API that omits the flag never
 * locks a DM.
 */
export function isDmPeerGone(
  channel: Pick<Channel, 'channelType' | 'dmPeer'> | null | undefined,
) {
  return (
    isDmChannel(channel) &&
    channel?.dmPeer != null &&
    channel.dmPeer.inWorkspace === false
  );
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
