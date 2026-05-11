'use client';

import { Hash } from 'lucide-react';
import type { Channel } from '../../../../../_libs/channels';
import { ExportDialog } from './export-dialog';

type ChannelHeaderProps = {
  channel: Channel | undefined;
  channelId: string;
};

export function ChannelHeader({ channel, channelId }: ChannelHeaderProps) {
  return (
    <div className="flex h-12 items-center gap-2 border-b px-4 shrink-0">
      <Hash className="h-5 w-5 text-muted-foreground" />
      <h1 className="font-semibold text-sm">
        {channel?.name ?? 'Loading...'}
      </h1>
      {channel?.description && (
        <span className="text-xs text-muted-foreground truncate ml-2">
          {channel.description}
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <ExportDialog channelId={channelId} channel={channel} />
      </div>
    </div>
  );
}
