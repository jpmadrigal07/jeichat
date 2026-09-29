'use client';

import { useRef } from 'react';
import { Copy, Pencil, Pin, PinOff, Reply, Trash2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Message } from '../_libs/messages';
import { copyMessageText } from '../_helpers/copy-message-text';
import { QUICK_REACTIONS } from './reaction-emoji-picker';

const MENU_REACTIONS = QUICK_REACTIONS.slice(0, 6);

// Links and media keep the browser's own menu (copy link, save image, …).
const NATIVE_MENU_TARGETS = 'a, img, video, audio';

type MessageContextMenuProps = {
  /** The message row; right-clicking it opens the menu. */
  children: React.ReactNode;
  disabled?: boolean;
  message: Message;
  isOwn: boolean;
  isPinned: boolean;
  canManageMessages: boolean;
  reactionPending: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onTogglePin: () => void;
  onStartEdit: () => void;
  onRequestDelete: () => void;
};

/** Desktop counterpart of `MessageActionDrawer`, opened by right-clicking a message. */
export function MessageContextMenu({
  children,
  disabled = false,
  message,
  isOwn,
  isPinned,
  canManageMessages,
  reactionPending,
  onReact,
  onReply,
  onTogglePin,
  onStartEdit,
  onRequestDelete,
}: MessageContextMenuProps) {
  // Below `md` the action drawer (long press) takes over.
  const isMobile = useIsMobile();
  const afterCloseRef = useRef<(() => void) | null>(null);

  // Actions that move focus or open another layer wait for the menu to finish
  // closing. While it animates out, the menu pulls focus back to itself, which
  // would dismiss a popover or steal focus from the composer / edit box.
  function runAfterClose(action: () => void) {
    afterCloseRef.current = action;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        disabled={disabled || isMobile}
        // The trigger defaults to `select-none`; message text must stay selectable.
        className="select-text"
        onContextMenuCapture={(e) => {
          if (
            e.target instanceof Element &&
            e.target.closest(NATIVE_MENU_TARGETS)
          ) {
            e.stopPropagation();
          }
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        className="w-56"
        // Keep focus where the chosen action puts it (e.g. the edit textarea).
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          const action = afterCloseRef.current;
          afterCloseRef.current = null;
          action?.();
        }}
      >
        <div className="flex justify-center gap-0.5 p-0.5">
          {MENU_REACTIONS.map((emoji) => (
            <ContextMenuItem
              key={emoji}
              aria-label={`React with ${emoji}`}
              disabled={reactionPending}
              className="size-8 justify-center p-0 text-sm"
              onSelect={() => onReact(emoji)}
            >
              {emoji}
            </ContextMenuItem>
          ))}
        </div>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={() => runAfterClose(onReply)}>
          <Reply />
          Reply
        </ContextMenuItem>
        {message.content ? (
          <ContextMenuItem
            onSelect={() => void copyMessageText(message.content)}
          >
            <Copy />
            Copy text
          </ContextMenuItem>
        ) : null}
        {canManageMessages ? (
          <ContextMenuItem onSelect={onTogglePin}>
            {isPinned ? <PinOff /> : <Pin />}
            {isPinned ? 'Unpin message' : 'Pin message'}
          </ContextMenuItem>
        ) : null}
        {isOwn ? (
          <ContextMenuItem onSelect={() => runAfterClose(onStartEdit)}>
            <Pencil />
            Edit message
          </ContextMenuItem>
        ) : null}
        {isOwn ? (
          <ContextMenuItem
            variant="destructive"
            onSelect={() => runAfterClose(onRequestDelete)}
          >
            <Trash2 />
            Delete message
          </ContextMenuItem>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
