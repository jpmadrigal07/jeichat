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
