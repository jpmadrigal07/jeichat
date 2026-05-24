'use client';

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { MessageItem } from './message-item';
import type { Message } from '../_libs/messages';

type MessageListProps = {
  messages: Message[];
  currentUserId: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
};

const EDITING_ROW_ESTIMATE = 160;

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
  | { type: 'message'; message: Message }
  | { type: 'date'; date: string };

function buildListItems(messages: Message[]): ListItem[] {
  const reversed = [...messages].reverse();
  const items: ListItem[] = [];
  let lastDate = '';

  for (const msg of reversed) {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      items.push({ type: 'date', date: msg.createdAt });
      lastDate = msgDate;
    }
    items.push({ type: 'message', message: msg });
  }

  return items;
}

function getListItemKey(item: ListItem, editingMessageId: string | null): string {
  if (item.type === 'date') return `date-${item.date}`;
  return editingMessageId === item.message.id
    ? `${item.message.id}-editing`
    : item.message.id;
}

export function MessageList({
  messages,
  currentUserId,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onEdit,
  onDelete,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const items = buildListItems(messages);
  const stickToBottomRef = useRef(true);
  const isInitialPinRef = useRef(true);
  const isAutoScrollingRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  const prevItemCountRef = useRef(0);
  const prevEditingMessageIdRef = useRef<string | null>(null);
  const pinFrameRef = useRef<number | null>(null);
  const itemCountRef = useRef(items.length);
  itemCountRef.current = items.length;

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
      if (item?.type === 'message' && item.message.id === editingMessageId) {
        return EDITING_ROW_ESTIMATE;
      }
      return 72;
    },
    overscan: 10,
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
    if (pinFrameRef.current !== null) {
      cancelAnimationFrame(pinFrameRef.current);
      pinFrameRef.current = null;
    }

    if (items.length === 0) {
      isInitialPinRef.current = true;
      stickToBottomRef.current = true;
      userHasScrolledRef.current = false;
      prevItemCountRef.current = 0;
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
  }, [items.length, totalSize, scrollToBottom, isAtBottom, virtualizer]);

  useEffect(() => {
    if (
      items.length > prevItemCountRef.current &&
      stickToBottomRef.current &&
      !isInitialPinRef.current
    ) {
      scrollToBottom();
    }
    prevItemCountRef.current = items.length;
  }, [items.length, scrollToBottom]);

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

      if (
        userHasScrolledRef.current &&
        el.scrollTop < 100 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isAtBottom]);

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0">
      {isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          if (!item) return null;

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
                  transform: `translateY(${virtualRow.start}px)`,
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
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageItem
                message={item.message}
                isOwn={item.message.senderId === currentUserId}
                isEditing={editingMessageId === item.message.id}
                onStartEdit={() => setEditingMessageId(item.message.id)}
                onCancelEdit={() => setEditingMessageId(null)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
