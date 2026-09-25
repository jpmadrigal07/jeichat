'use client';

import { Copy, Pencil, Pin, PinOff, Reply, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Message } from '../_libs/messages';
import { messageReplySnippet } from '../_helpers/message-reply';
import { QUICK_REACTIONS } from './reaction-emoji-picker';

type MessageActionDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

function DrawerAction({
  onClick,
  destructive = false,
  children,
}: {
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className={cn(
        'h-11 w-full justify-start gap-3 px-3 text-sm',
        destructive &&
          'text-destructive hover:bg-destructive/10 hover:text-destructive',
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** Mobile replacement for the hover toolbar, opened by long-pressing a message. */
export function MessageActionDrawer({
  open,
  onOpenChange,
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
}: MessageActionDrawerProps) {
  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  async function handleCopy() {
    onOpenChange(false);
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy message');
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        // Keep focus where the chosen action puts it (e.g. the edit textarea).
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <DrawerHeader className="gap-0.5 px-4 pt-3 pb-2 text-left">
          <DrawerTitle className="truncate">
            {message.sender?.name ?? 'Unknown'}
          </DrawerTitle>
          <DrawerDescription className="truncate">
            {messageReplySnippet(message.content)}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex justify-between gap-1 px-3 pb-2">
          {QUICK_REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="secondary"
              disabled={reactionPending}
              className="size-11 rounded-full p-0 text-xl"
              onClick={() => run(() => onReact(emoji))}
            >
              {emoji}
              <span className="sr-only">React with {emoji}</span>
            </Button>
          ))}
        </div>

        <Separator className="mx-3 w-auto" />

        <div className="flex flex-col p-2">
          <DrawerAction onClick={() => run(onReply)}>
            <Reply />
            Reply
          </DrawerAction>
          {message.content ? (
            <DrawerAction onClick={handleCopy}>
              <Copy />
              Copy text
            </DrawerAction>
          ) : null}
          {canManageMessages ? (
            <DrawerAction onClick={() => run(onTogglePin)}>
              {isPinned ? <PinOff /> : <Pin />}
              {isPinned ? 'Unpin message' : 'Pin message'}
            </DrawerAction>
          ) : null}
          {isOwn ? (
            <DrawerAction onClick={() => run(onStartEdit)}>
              <Pencil />
              Edit message
            </DrawerAction>
          ) : null}
          {isOwn ? (
            <DrawerAction destructive onClick={onRequestDelete}>
              <Trash2 />
              Delete message
            </DrawerAction>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
