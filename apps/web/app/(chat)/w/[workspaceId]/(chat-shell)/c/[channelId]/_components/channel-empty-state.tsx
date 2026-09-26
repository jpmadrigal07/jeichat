import { Hash, MessageCircle } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { Channel } from '@chat/_libs/channels';
import {
  channelDisplayName,
  isDmChannel,
} from '@chat/_helpers/channel-display';

type Props = {
  channel: Channel | undefined;
};

export function ChannelEmptyState({ channel }: Props) {
  const isDm = isDmChannel(channel);
  const name = channel ? channelDisplayName(channel) : undefined;

  return (
    <Empty className='flex-1 border-0'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          {isDm ? <MessageCircle /> : <Hash />}
        </EmptyMedia>
        <EmptyTitle>
          {isDm
            ? `This is the start of your conversation${name ? ` with ${name}` : ''}`
            : `Welcome to #${name ?? 'channel'}`}
        </EmptyTitle>
        <EmptyDescription>
          {isDm
            ? 'No messages yet. Say hello to get things started.'
            : `No messages yet. This is the very beginning of the #${name ?? 'channel'} channel — send a message to kick things off.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
