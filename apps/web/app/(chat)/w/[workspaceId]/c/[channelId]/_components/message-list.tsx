'use client';

import { useRef, useEffect, useCallback } from 'react';
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
  typingUsers: string[];
};

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

export function MessageList({
  messages,
  currentUserId,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onEdit,
  onDelete,
  typingUsers,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const items = buildListItems(messages);
  const wasAtBottomRef = useRef(true);
  const prevItemCountRef = useRef(items.length);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      if (item?.type === 'date') return 40;
      return 52;
    },
    overscan: 10,
  });

  const isAtBottom = useCallback(() => {
    const el = parentRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, []);

  useEffect(() => {
    if (items.length > prevItemCountRef.current && wasAtBottomRef.current) {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    }
    prevItemCountRef.current = items.length;
  }, [items.length, virtualizer]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const handleScroll = () => {
      wasAtBottomRef.current = isAtBottom();
      if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isAtBottom]);

  useEffect(() => {
    if (items.length > 0 && prevItemCountRef.current === 0) {
      virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    }
  }, [items.length, virtualizer]);

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
                key={`date-${item.date}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
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
              key={item.message.id}
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
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
      {typingUsers.length > 0 && (
        <div className="px-4 py-1.5 text-xs text-muted-foreground">
          {typingUsers.join(', ')}{' '}
          {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}
    </div>
  );
}
