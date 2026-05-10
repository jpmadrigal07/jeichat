'use client';

import { use } from 'react';
import { Hash } from 'lucide-react';
import { useChannels } from '../../../../_hooks/use-channels';

export function ChannelView({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = use(params);
  const { data: channels } = useChannels(workspaceId);
  const channel = channels?.find((c) => c.id === channelId);

  return (
    <>
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <h1 className="font-semibold text-sm">
          {channel?.name ?? 'Loading...'}
        </h1>
        {channel?.description && (
          <span className="text-xs text-muted-foreground truncate ml-2">
            {channel.description}
          </span>
        )}
      </div>

      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Messages will appear here</p>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            Message #{channel?.name ?? '...'}
          </span>
        </div>
      </div>
    </>
  );
}
