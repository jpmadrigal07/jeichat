'use client';

import { useRef } from 'react';
import { Pencil, Pin, PinOff, Trash2, X, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Message } from '../_libs/messages';
import { MessageAttachments } from './message-attachments';
import { MessageMarkdown } from './message-markdown';
import { MessageReactions } from './message-reactions';
import type { MentionableMember } from '@chat/_helpers/mentions';
import type {
  TaggableChannel,
  TaggableTicket,
} from '@chat/_helpers/ticket-mentions';

type MessageItemProps = {
  message: Message;
  isOwn: boolean;
  isEditing: boolean;
  isPinned: boolean;
  isHighlighted: boolean;
  canManageMessages: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  reactionPending?: boolean;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  channels: TaggableChannel[];
  workspaceId: string;
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function MessageHoverAction({
  label,
  onClick,
  destructive = false,
  children,
}: {
  label: string;
  onClick?: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(
            'rounded-sm',
            destructive &&
              'text-destructive hover:bg-destructive/10 hover:text-destructive',
          )}
          onClick={onClick}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function MessageItem({
  message,
  isOwn,
  isEditing,
  isPinned,
  isHighlighted,
  canManageMessages,
  onStartEdit,
  onCancelEdit,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onToggleReaction,
  reactionPending = false,
  members,
  tickets,
  channels,
  workspaceId,
}: MessageItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEdited = message.updatedAt !== message.createdAt;
  const showActions = (isOwn || canManageMessages) && !isEditing;

  function handleSaveEdit() {
    const value = textareaRef.current?.value.trim();
    if (value && value !== message.content) {
      onEdit(message.id, value);
    }
    onCancelEdit();
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      onCancelEdit();
    }
  }

  return (
    <div
      className={cn(
        'group relative flex gap-3 px-4 py-1.5 hover:bg-muted/50',
        isHighlighted && 'bg-accent/50',
      )}
    >
      <PresenceAvatar
        userId={message.senderId}
        name={message.sender?.name ?? 'Unknown'}
        image={message.sender?.image}
        workspaceId={workspaceId}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold truncate">
            {message.sender?.name ?? 'Unknown'}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatTime(message.createdAt)}
          </span>
          {isEdited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
          {isPinned ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Pin className="size-3" />
              Pinned
            </span>
          ) : null}
        </div>

        {isEditing ? (
          <div className="mt-1">
            <Textarea
              ref={textareaRef}
              defaultValue={message.content}
              onKeyDown={handleEditKeyDown}
              className="min-h-[60px] text-sm resize-none"
              autoFocus
            />
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {message.content ? (
              <MessageMarkdown
                content={message.content}
                className="text-sm break-words"
                members={members}
                tickets={tickets}
                channels={channels}
                workspaceId={workspaceId}
              />
            ) : null}
            <MessageAttachments attachments={message.attachments} />
            <MessageReactions
              reactions={message.reactions ?? []}
              onToggle={(emoji) => onToggleReaction(message.id, emoji)}
              disabled={reactionPending}
            />
          </>
        )}
      </div>

      {showActions ? (
        <div
          className={cn(
            'absolute -top-3 right-4 z-10 flex items-center rounded-md border bg-popover p-0.5 shadow-md',
            'pointer-events-none opacity-0',
            'group-hover:pointer-events-auto group-hover:opacity-100',
            'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
          )}
        >
          {canManageMessages ? (
            <MessageHoverAction
              label={isPinned ? 'Unpin message' : 'Pin message'}
              onClick={() =>
                isPinned ? onUnpin(message.id) : onPin(message.id)
              }
            >
              {isPinned ? <PinOff /> : <Pin />}
            </MessageHoverAction>
          ) : null}
          {isOwn ? (
            <MessageHoverAction label="Edit message" onClick={onStartEdit}>
              <Pencil />
            </MessageHoverAction>
          ) : null}
          {isOwn ? (
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 />
                      <span className="sr-only">Delete message</span>
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Delete message</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This message will be permanently deleted. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => onDelete(message.id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
