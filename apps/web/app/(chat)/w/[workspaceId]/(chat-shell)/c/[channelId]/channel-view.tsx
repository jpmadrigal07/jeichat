'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChannels } from '@chat/_hooks/use-channels';
import { useWorkspaceMembers } from '@chat/_hooks/use-workspaces';
import { useMarkChannelRead } from '@chat/_hooks/use-unread-counts';
import {
  useMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
} from './_hooks/use-messages';
import {
  usePinnedMessages,
  usePinMessage,
  useUnpinMessage,
} from './_hooks/use-pins';
import { useToggleMessageReaction } from './_hooks/use-reactions';
import { flattenMessagePages } from './_libs/messages';
import { useSocket } from './_hooks/use-socket';
import { useChannelEvents } from './_hooks/use-channel-events';
import { mergeTicketTimeline } from './_helpers/merge-ticket-timeline';
import { taggableTicketsForChannel } from '@chat/_helpers/ticket-mentions';
import type { TicketLayout } from '@chat/_libs/channels';
import { ChannelHeader } from './_components/channel-header';
import { ChannelThreadCards } from './_components/channel-thread-cards';
import { ThreadIssueHeader } from './_components/thread-issue-header';
import { MessageList } from './_components/message-list';
import { MessageInput } from './_components/message-input';
import { TypingIndicator } from './_components/typing-indicator';
import { ChannelAttachmentLightbox } from './_components/channel-attachment-lightbox';
import { ChannelDropZone } from './_components/channel-drop-overlay';
import { useAttachmentUploads } from './_hooks/use-attachment-uploads';
import { usePasteAttachments } from './_hooks/use-paste-attachments';
import { ChatPane } from '@chat/_components/chat-pane';
import { Skeleton } from '@/components/ui/skeleton';
import { isDmChannel } from '@chat/_helpers/channel-display';

type Props = {
  params: Promise<{ workspaceId: string; channelId: string }>;
  userId: string;
  view: 'messages' | 'threads';
  layout: TicketLayout;
  highlightMessageId: string | null;
};

export function ChannelView({
  params,
  userId,
  view,
  layout,
  highlightMessageId,
}: Props) {
  const { workspaceId, channelId } = use(params);
  const { data: channels } = useChannels(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const channel = channels?.find((c) => c.id === channelId);
  const parentChannel = channel?.parentId
    ? channels?.find((c) => c.id === channel.parentId)
    : undefined;
  const isThread = Boolean(channel?.parentId);
  const isDm = isDmChannel(channel);
  const showThreadCards = view === 'threads' && !isThread && !isDm;
  const tickets = useMemo(
    () => taggableTicketsForChannel(channels ?? [], channel),
    [channel, channels],
  );

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending,
  } = useMessages(channelId, !showThreadCards);
  const { data: ticketEvents = [] } = useChannelEvents(
    workspaceId,
    channelId,
    !showThreadCards,
  );

  const sendMutation = useSendMessage(channelId);
  const editMutation = useEditMessage(channelId);
  const deleteMutation = useDeleteMessage(channelId);
  const pinMutation = usePinMessage(channelId);
  const unpinMutation = useUnpinMessage(channelId);
  const reactionMutation = useToggleMessageReaction(channelId, userId);
  const { data: pinsData } = usePinnedMessages(channelId, !showThreadCards);
  const pinnedMessageIds = useMemo(
    () => new Set((pinsData?.data ?? []).map((pin) => pin.messageId)),
    [pinsData],
  );
  const canManageMessages = pinsData?.canManageMessages ?? false;
  const uploads = useAttachmentUploads(channelId);
  usePasteAttachments(uploads.addFiles);
  const { mutate: markChannelRead } = useMarkChannelRead(workspaceId);

  useEffect(() => {
    markChannelRead(channelId);
  }, [channelId, markChannelRead]);

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

  const { emitTyping } = useSocket(workspaceId, channelId, userId, handleTyping);

  const messages = useMemo(
    () => flattenMessagePages(data?.pages),
    [data?.pages],
  );

  const timeline = useMemo(
    () =>
      mergeTicketTimeline(
        messages,
        ticketEvents,
        Boolean(hasNextPage),
      ),
    [hasNextPage, messages, ticketEvents],
  );

  const typingNames = useMemo(
    () => Array.from(typingUsers.values()),
    [typingUsers],
  );

  function handleSend(content: string, attachmentIds: string[]) {
    sendMutation.mutate(
      { content, attachmentIds },
      { onSuccess: () => uploads.reset() },
    );
  }

  function handleEdit(messageId: string, content: string) {
    editMutation.mutate({ messageId, content });
  }

  function handleDelete(messageId: string) {
    deleteMutation.mutate(messageId);
  }

  function handlePin(messageId: string) {
    pinMutation.mutate(messageId);
  }

  function handleUnpin(messageId: string) {
    unpinMutation.mutate(messageId);
  }

  function handleToggleReaction(messageId: string, emoji: string) {
    reactionMutation.mutate({ messageId, emoji });
  }

  const header = (
    <ChannelHeader
      channel={channel}
      parentChannel={parentChannel}
      channelId={channelId}
      workspaceId={workspaceId}
      view={view}
      layout={layout}
    />
  );

  if (showThreadCards) {
    return (
      <ChatPane header={header} currentUserId={userId}>
        <ChannelThreadCards
          workspaceId={workspaceId}
          channelId={channelId}
          layout={layout}
          userId={userId}
        />
      </ChatPane>
    );
  }

  if (isPending) {
    return (
      <ChatPane header={header} currentUserId={userId}>
        {isThread && channel ? (
          <ThreadIssueHeader
            workspaceId={workspaceId}
            channel={channel}
            parentChannel={parentChannel}
            members={members ?? []}
            tickets={tickets}
          />
        ) : null}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      </ChatPane>
    );
  }

  return (
    <ChatPane header={header} currentUserId={userId}>
      {isThread && channel ? (
        <ThreadIssueHeader
          workspaceId={workspaceId}
          channel={channel}
          parentChannel={parentChannel}
          members={members ?? []}
          tickets={tickets}
        />
      ) : null}
      <ChannelAttachmentLightbox />
      <ChannelDropZone
        onAdd={uploads.addFiles}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        <MessageList
          key={channelId}
          entries={timeline}
          currentUserId={userId}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onToggleReaction={handleToggleReaction}
          pendingReactionMessageId={
            reactionMutation.isPending
              ? reactionMutation.variables?.messageId
              : undefined
          }
          pinnedMessageIds={pinnedMessageIds}
          canManageMessages={canManageMessages}
          highlightMessageId={highlightMessageId}
          members={members ?? []}
          tickets={tickets}
          workspaceId={workspaceId}
          showTicketLink={!isThread}
        />
        <TypingIndicator users={typingNames} />
        <MessageInput
          channelName={channel?.name}
          currentUserId={userId}
          members={members ?? []}
          tickets={tickets}
          onSend={handleSend}
          onTyping={emitTyping}
          sendDisabled={sendMutation.isPending}
          uploads={uploads}
        />
      </ChannelDropZone>
    </ChatPane>
  );
}
