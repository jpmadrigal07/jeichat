'use client';

import { use, useCallback, useMemo, useRef, useState } from 'react';
import { useChannels } from '../../../../_hooks/use-channels';
import {
  useMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
} from './_hooks/use-messages';
import { useSocket } from './_hooks/use-socket';
import { ChannelHeader } from './_components/channel-header';
import { MessageList } from './_components/message-list';
import { MessageInput } from './_components/message-input';
import { Skeleton } from '@/components/ui/skeleton';

type Props = {
  params: Promise<{ workspaceId: string; channelId: string }>;
  userId: string;
};

export function ChannelView({ params, userId }: Props) {
  const { workspaceId, channelId } = use(params);
  const { data: channels } = useChannels(workspaceId);
  const channel = channels?.find((c) => c.id === channelId);

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = useMessages(channelId);

  const sendMutation = useSendMessage(channelId);
  const editMutation = useEditMessage(channelId);
  const deleteMutation = useDeleteMessage(channelId);

  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleTyping = useCallback(
    (user: { userId: string; userName: string }) => {
      if (user.userId === userId) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(user.userId, user.userName);
        return next;
      });

      const existing = typingTimersRef.current.get(user.userId);
      if (existing) clearTimeout(existing);

      typingTimersRef.current.set(
        user.userId,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(user.userId);
            return next;
          });
          typingTimersRef.current.delete(user.userId);
        }, 3000),
      );
    },
    [userId],
  );

  const { emitTyping } = useSocket(channelId, handleTyping);

  const messages = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const typingNames = useMemo(
    () => Array.from(typingUsers.values()),
    [typingUsers],
  );

  function handleSend(content: string) {
    sendMutation.mutate(content);
  }

  function handleEdit(messageId: string, content: string) {
    editMutation.mutate({ messageId, content });
  }

  function handleDelete(messageId: string) {
    deleteMutation.mutate(messageId);
  }

  if (isLoading) {
    return (
      <>
        <ChannelHeader channel={channel} />
        <div className="flex-1 flex flex-col gap-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <ChannelHeader channel={channel} />
      <MessageList
        messages={messages}
        currentUserId={userId}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        typingUsers={typingNames}
      />
      <MessageInput
        channelName={channel?.name}
        onSend={handleSend}
        onTyping={emitTyping}
        disabled={sendMutation.isPending}
      />
    </>
  );
}
