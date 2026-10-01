'use client';

import { useRef, useEffect, useLayoutEffect, useCallback, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageItem } from './message-item';
import { TicketActivityItem } from './ticket-activity-item';
import type { TicketEvent } from '../_libs/channel-events';
import type { Message } from '../_libs/messages';
import { estimateLinkPreviewsHeight } from '../_helpers/link-preview-layout';
import { isGroupedWithPrevious } from '../_helpers/message-grouping';
import type { TicketTimelineEntry } from '../_helpers/merge-ticket-timeline';
import type { MentionableMember } from '@chat/_helpers/mentions';
import type {
  TaggableChannel,
  TaggableMessage,
  TaggableTicket,
} from '@chat/_helpers/ticket-mentions';

type MessageListProps = {
  entries: TicketTimelineEntry[];
  currentUserId: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  hasPreviousPage?: boolean;
  isFetchingPreviousPage?: boolean;
  fetchPreviousPage?: () => void;
  onJumpToLatest?: () => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  onJumpToReply: (messageId: string) => void;
  pendingReactionMessageId?: string;
  pinnedMessageIds: ReadonlySet<string>;
  canManageMessages: boolean;
  highlightMessageId: string | null;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  channels: TaggableChannel[];
  mentionMessages: TaggableMessage[];
  allowAllMention: boolean;
  workspaceId: string;
  showTicketLink?: boolean;
  header?: ReactNode;
};

const EDITING_ROW_ESTIMATE = 160;
const EVENT_ROW_ESTIMATE = 40;
const GROUPED_ROW_ESTIMATE = 32;
const LIST_PADDING_END = 16;

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

type ListItem =
  | { type: 'message'; message: Message; isGrouped: boolean }
  | { type: 'event'; event: TicketEvent }
  | { type: 'date'; date: string };

function createdAtOf(entry: TicketTimelineEntry): string {
  return entry.type === 'message'
    ? entry.message.createdAt
    : entry.event.createdAt;
}

function buildListItems(entries: TicketTimelineEntry[]): ListItem[] {
  const reversed = [...entries].reverse();
  const items: ListItem[] = [];
  let lastDate = '';
  // The message directly above the next entry; cleared by anything that
  // interrupts a run (date separator, ticket event).
  let previousMessage: Message | null = null;

  for (const entry of reversed) {
    const createdAt = createdAtOf(entry);
    const entryDate = new Date(createdAt).toDateString();
    if (entryDate !== lastDate) {
      items.push({ type: 'date', date: createdAt });
      lastDate = entryDate;
      previousMessage = null;
    }

    if (entry.type === 'message') {
      items.push({
        type: 'message',
        message: entry.message,
        isGrouped: isGroupedWithPrevious(entry.message, previousMessage),
      });
      previousMessage = entry.message;
    } else {
      items.push(entry);
      previousMessage = null;
    }
  }

  return items;
}

function getListItemKey(item: ListItem, editingMessageId: string | null): string {
  if (item.type === 'date') return `date-${item.date}`;
  if (item.type === 'event') return `event-${item.event.id}`;
  return editingMessageId === item.message.id
    ? `${item.message.id}-editing`
    : item.message.id;
}

export function MessageList({
  entries,
  currentUserId,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  hasPreviousPage = false,
  isFetchingPreviousPage = false,
  fetchPreviousPage,
  onJumpToLatest,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onToggleReaction,
  onReply,
  onJumpToReply,
  pendingReactionMessageId,
  pinnedMessageIds,
  canManageMessages,
  highlightMessageId,
  members,
  tickets,
  channels,
  mentionMessages,
  allowAllMention,
  workspaceId,
  showTicketLink = false,
  header,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const prevScrollMarginRef = useRef(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const items = buildListItems(entries);
  const highlightIndex = highlightMessageId
    ? items.findIndex(
        (item) =>
          item.type === 'message' && item.message.id === highlightMessageId,
      )
    : -1;
  const stickToBottomRef = useRef(true);
  const isInitialPinRef = useRef(true);
  const isAutoScrollingRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  const prevItemCountRef = useRef(0);
  const prevEditingMessageIdRef = useRef<string | null>(null);
  const pinFrameRef = useRef<number | null>(null);
  const itemCountRef = useRef(items.length);
  const wasFetchingNextPageRef = useRef(false);
  const scrollHeightBeforePrependRef = useRef(0);
  itemCountRef.current = items.length;

  useLayoutEffect(() => {
    const listEl = listRef.current;
    const headerEl = headerRef.current;
    if (!listEl) return;

    function updateMargin() {
      const node = listRef.current;
      if (!node) return;
      const nextMargin = node.offsetTop;
      setScrollMargin((current) =>
        current === nextMargin ? current : nextMargin,
      );
    }

    updateMargin();
    const observer = new ResizeObserver(updateMargin);
    if (headerEl) observer.observe(headerEl);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = parentRef.current;
    const previous = prevScrollMarginRef.current;
    if (el && previous > 0 && scrollMargin !== previous && el.scrollTop > 0) {
      el.scrollTop += scrollMargin - previous;
    }
    prevScrollMarginRef.current = scrollMargin;
  }, [scrollMargin]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    getItemKey: (index) => {
      const item = items[index];
      return item ? getListItemKey(item, editingMessageId) : index;
    },
    estimateSize: (index) => {
      const item = items[index];
      if (item?.type === 'date') return 40;
      if (item?.type === 'event') return EVENT_ROW_ESTIMATE;
      if (item?.type === 'message' && item.message.id === editingMessageId) {
        return EDITING_ROW_ESTIMATE;
      }
      // Previews are far taller than a text row; without them in the estimate
      // the list drifts while it measures rows on the way to the bottom.
      const previewsHeight =
        item?.type === 'message'
          ? estimateLinkPreviewsHeight(item.message.linkPreviews)
          : 0;
      if (item?.type === 'message' && item.isGrouped) {
        return GROUPED_ROW_ESTIMATE + previewsHeight;
      }
      return 72 + previewsHeight;
    },
    overscan: 10,
    scrollMargin,
    paddingEnd: LIST_PADDING_END,
    scrollPaddingEnd: LIST_PADDING_END,
    useAnimationFrameWithResizeObserver: true,
    onChange: (instance) => {
      if (!isInitialPinRef.current || itemCountRef.current === 0) return;
      instance.scrollToIndex(itemCountRef.current - 1, { align: 'end' });
    },
  });

  const totalSize = virtualizer.getTotalSize();

  const scrollToBottom = useCallback(() => {
    if (items.length === 0) return;
    isAutoScrollingRef.current = true;
    virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    requestAnimationFrame(() => {
      isAutoScrollingRef.current = false;
    });
  }, [items.length, virtualizer]);

  const remeasureMessageRow = useCallback(
    (messageId: string) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const index = items.findIndex(
            (item) => item.type === 'message' && item.message.id === messageId,
          );
          if (index === -1) return;

          const el = parentRef.current?.querySelector<HTMLElement>(
            `[data-index="${index}"]`,
          );
          if (el) {
            virtualizer.measureElement(el);
          }
        });
      });
    },
    [items, virtualizer],
  );

  function handleJumpToReply(messageId: string) {
    if (highlightMessageId === messageId) {
      const index = items.findIndex(
        (item) => item.type === 'message' && item.message.id === messageId,
      );
      if (index >= 0) {
        stickToBottomRef.current = false;
        isInitialPinRef.current = false;
        isAutoScrollingRef.current = true;
        virtualizer.scrollToIndex(index, { align: 'center' });
        requestAnimationFrame(() => {
          isAutoScrollingRef.current = false;
        });
      }
    }
    onJumpToReply(messageId);
  }

  useEffect(() => {
    const messageId = editingMessageId ?? prevEditingMessageIdRef.current;
    prevEditingMessageIdRef.current = editingMessageId;

    if (messageId) {
      remeasureMessageRow(messageId);
    }
  }, [editingMessageId, remeasureMessageRow]);

  const isAtBottom = useCallback(() => {
    const el = parentRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    if (isFetchingNextPage && !wasFetchingNextPageRef.current) {
      scrollHeightBeforePrependRef.current = el.scrollHeight;
    }

    if (wasFetchingNextPageRef.current && !isFetchingNextPage) {
      const heightDiff = el.scrollHeight - scrollHeightBeforePrependRef.current;
      if (heightDiff > 0) {
        el.scrollTop += heightDiff;
      }
    }

    wasFetchingNextPageRef.current = isFetchingNextPage;
  }, [isFetchingNextPage, items.length]);

  useLayoutEffect(() => {
    if (pinFrameRef.current !== null) {
      cancelAnimationFrame(pinFrameRef.current);
      pinFrameRef.current = null;
    }

    if (items.length === 0) {
      isInitialPinRef.current = highlightIndex < 0;
      stickToBottomRef.current = highlightIndex < 0;
      userHasScrolledRef.current = false;
      prevItemCountRef.current = 0;
      return;
    }

    if (highlightIndex >= 0) {
      isInitialPinRef.current = false;
      stickToBottomRef.current = false;
      return;
    }

    if (!isInitialPinRef.current) return;

    let stableFrames = 0;
    let lastTotalSize = -1;
    let frames = 0;

    const pinToBottom = () => {
      if (!isInitialPinRef.current) return;

      scrollToBottom();

      const size = virtualizer.getTotalSize();
      const atBottom = isAtBottom();

      if (size === lastTotalSize && atBottom) {
        stableFrames += 1;
        if (stableFrames >= 3) {
          isInitialPinRef.current = false;
          pinFrameRef.current = null;
          return;
        }
      } else {
        stableFrames = 0;
        lastTotalSize = size;
      }

      frames += 1;
      if (frames >= 90) {
        isInitialPinRef.current = false;
        pinFrameRef.current = null;
        return;
      }

      pinFrameRef.current = requestAnimationFrame(pinToBottom);
    };

    pinFrameRef.current = requestAnimationFrame(pinToBottom);

    return () => {
      if (pinFrameRef.current !== null) {
        cancelAnimationFrame(pinFrameRef.current);
        pinFrameRef.current = null;
      }
    };
  }, [highlightIndex, items.length, totalSize, scrollToBottom, isAtBottom, virtualizer]);

  // Rows can grow after they render (a link preview arrives, an image loads).
  // Keep a viewer who is at the live bottom there; scrolling up releases it.
  useEffect(() => {
    if (isInitialPinRef.current || hasPreviousPage) return;
    if (!stickToBottomRef.current) return;
    scrollToBottom();
  }, [totalSize, hasPreviousPage, scrollToBottom]);

  useEffect(() => {
    if (
      items.length > prevItemCountRef.current &&
      stickToBottomRef.current &&
      !hasPreviousPage &&
      !isInitialPinRef.current
    ) {
      scrollToBottom();
    }
    prevItemCountRef.current = items.length;
  }, [hasPreviousPage, items.length, scrollToBottom]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const releasePin = () => {
      isInitialPinRef.current = false;
      stickToBottomRef.current = false;
      userHasScrolledRef.current = true;
      if (pinFrameRef.current !== null) {
        cancelAnimationFrame(pinFrameRef.current);
        pinFrameRef.current = null;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        releasePin();
      } else {
        userHasScrolledRef.current = true;
      }
    };

    const handleScroll = () => {
      if (isAutoScrollingRef.current) return;

      const atBottom = isAtBottom();
      stickToBottomRef.current = atBottom;

      if (!atBottom) {
        isInitialPinRef.current = false;
        userHasScrolledRef.current = true;
      } else if (!isInitialPinRef.current) {
        userHasScrolledRef.current = false;
      }

      const fromListTop = el.scrollTop - scrollMargin;
      if (
        userHasScrolledRef.current &&
        fromListTop < 100 &&
        fromListTop >= -8 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }

      const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (
        userHasScrolledRef.current &&
        fromBottom < 100 &&
        hasPreviousPage &&
        !isFetchingPreviousPage &&
        fetchPreviousPage
      ) {
        fetchPreviousPage();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: true });
    el.addEventListener('touchstart', releasePin, { passive: true });
    el.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchstart', releasePin);
      el.removeEventListener('scroll', handleScroll);
    };
  }, [
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isAtBottom,
    isFetchingNextPage,
    isFetchingPreviousPage,
    scrollMargin,
  ]);

  useLayoutEffect(() => {
    if (highlightIndex < 0) return;
    stickToBottomRef.current = false;
    isInitialPinRef.current = false;
    isAutoScrollingRef.current = true;
    virtualizer.scrollToIndex(highlightIndex, { align: 'center' });
    requestAnimationFrame(() => {
      isAutoScrollingRef.current = false;
    });
  }, [highlightIndex, virtualizer]);

  return (
    <div ref={parentRef} className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div ref={headerRef}>
        {header}
        {isFetchingNextPage ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
      <div
        ref={listRef}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;
          const translateY = virtualRow.start - scrollMargin;

          if (item.type === 'date') {
            return (
              <div
                key={getListItemKey(item, editingMessageId)}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${translateY}px)`,
                }}
                className="flex items-center px-4"
              >
                <div className="flex-1 border-t" />
                <span className="px-3 text-xs font-medium text-muted-foreground">
                  {formatDateSeparator(item.date)}
                </span>
                <div className="flex-1 border-t" />
              </div>
            );
          }

          if (item.type === 'event') {
            return (
              <div
                key={getListItemKey(item, editingMessageId)}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${translateY}px)`,
                }}
              >
                <TicketActivityItem
                  event={item.event}
                  workspaceId={workspaceId}
                  showTicket={showTicketLink}
                />
              </div>
            );
          }

          return (
            <div
              key={getListItemKey(item, editingMessageId)}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={cn(
                'hover:z-10 focus-within:z-10',
                editingMessageId === item.message.id &&
                  'z-30 hover:z-30 focus-within:z-30',
              )}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${translateY}px)`,
              }}
            >
              <MessageItem
                message={item.message}
                isGrouped={item.isGrouped}
                isOwn={item.message.senderId === currentUserId}
                isEditing={editingMessageId === item.message.id}
                isPinned={pinnedMessageIds.has(item.message.id)}
                isHighlighted={highlightMessageId === item.message.id}
                canManageMessages={canManageMessages}
                onStartEdit={() => setEditingMessageId(item.message.id)}
                onCancelEdit={() => setEditingMessageId(null)}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
                onUnpin={onUnpin}
                onToggleReaction={onToggleReaction}
                onReply={onReply}
                onJumpToReply={handleJumpToReply}
                reactionPending={pendingReactionMessageId === item.message.id}
                members={members}
                tickets={tickets}
                channels={channels}
                mentionMessages={mentionMessages}
                allowAllMention={allowAllMention}
                currentUserId={currentUserId}
                workspaceId={workspaceId}
              />
            </div>
          );
        })}
      </div>
      {isFetchingPreviousPage ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}
      {hasPreviousPage && onJumpToLatest ? (
        <div className="sticky bottom-3 z-10 flex justify-center">
          <Button
            type="button"
            size="sm"
            className="shadow-md"
            onClick={onJumpToLatest}
          >
            <ChevronDown data-icon="inline-start" />
            Jump to latest
          </Button>
        </div>
      ) : null}
    </div>
  );
}
