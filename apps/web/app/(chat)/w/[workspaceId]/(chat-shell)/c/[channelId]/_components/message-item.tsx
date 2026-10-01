'use client';

import { useState } from 'react';
import {
  Pencil,
  Pin,
  PinOff,
  Reply,
  SmilePlus,
  Trash2,
} from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { BotBadge } from '@chat/_components/bot-badge';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Message, MessageReplyTo } from '../_libs/messages';
import { messageReplySnippet } from '../_helpers/message-reply';
import { useLongPress } from '../_hooks/use-long-press';
import { MessageActionDrawer } from './message-action-drawer';
import { MessageAttachments } from './message-attachments';
import { MessageContextMenu } from './message-context-menu';
import { MessageMarkdown } from './message-markdown';
import { MessageReactions } from './message-reactions';
import { QUICK_REACTIONS, ReactionEmojiPicker } from './reaction-emoji-picker';
import type { MentionableMember } from '@chat/_helpers/mentions';
import type {
  TaggableChannel,
  TaggableMessage,
  TaggableTicket,
} from '@chat/_helpers/ticket-mentions';
import { MessageEditComposer } from './message-edit-composer';

type MessageItemProps = {
  message: Message;
  /** Continues the previous message's group: avatar and name are hidden. */
  isGrouped: boolean;
  isOwn: boolean;
  isEditing: boolean;
  isPinned: boolean;
  isHighlighted: boolean;
  canManageMessages: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEdit: (messageId: string, content: string) => void | Promise<unknown>;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onReply: (messageId: string) => void;
  onJumpToReply: (messageId: string) => void;
  reactionPending?: boolean;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  channels: TaggableChannel[];
  mentionMessages: TaggableMessage[];
  allowAllMention: boolean;
  currentUserId: string;
  workspaceId: string;
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MessageReplyPreview({
  replyToId,
  replyTo,
  onJumpToReply,
}: {
  replyToId: string | null;
  replyTo: MessageReplyTo | null;
  onJumpToReply: (messageId: string) => void;
}) {
  if (!replyToId) return null;
  if (!replyTo) {
    return (
      <p className="mb-1 text-xs italic text-muted-foreground">
        Original message was deleted
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="mb-1 h-auto w-full justify-start gap-2 px-2 py-1"
      onClick={() => onJumpToReply(replyTo.id)}
    >
      <span className="h-8 w-0.5 shrink-0 rounded-full bg-muted-foreground/50" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-xs font-semibold">
          {replyTo.sender?.name ?? 'Unknown'}
          {replyTo.sender?.isBot ? ' (bot)' : ''}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {messageReplySnippet(replyTo.content)}
        </span>
      </span>
    </Button>
  );
}

// Toolbar reactions shown before the full picker, like Discord's hover bar.
const TOOLBAR_REACTIONS = QUICK_REACTIONS.slice(0, 3);

function MessageHoverAction({
  label,
  destructive = false,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  label: string;
  destructive?: boolean;
}) {
  // Props are spread onto the Button so this can also be an `asChild`
  // trigger (e.g. for the emoji picker popover).
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          {...props}
          className={cn(
            'rounded-sm',
            destructive &&
              'text-destructive hover:bg-destructive/10 hover:text-destructive',
            className,
          )}
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
  isGrouped,
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
  onReply,
  onJumpToReply,
  reactionPending = false,
  members,
  tickets,
  channels,
  mentionMessages,
  allowAllMention,
  currentUserId,
  workspaceId,
}: MessageItemProps) {
  const [openPanel, setOpenPanel] = useState<'actions' | 'delete' | null>(null);
  const isEdited = message.updatedAt !== message.createdAt;
  const showActions = !isEditing;
  const longPress = useLongPress(() => setOpenPanel('actions'), {
    // Below `md` the hover toolbar is hidden, so long press replaces it.
    enabled: () =>
      showActions && window.matchMedia('(max-width: 767px)').matches,
  });

  // Grouped messages have no header to hold "(edited)" / "Pinned", so they sit
  // beside the text instead.
  const showGroupedStatus = isGrouped && (isEdited || isPinned);
  const statusMarkers = (
    <>
      {isEdited && <span className="text-xs text-muted-foreground">(edited)</span>}
      {isPinned ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Pin className="size-3" />
          Pinned
        </span>
      ) : null}
    </>
  );

  function handleTogglePin() {
    if (isPinned) onUnpin(message.id);
    else onPin(message.id);
  }

  return (
    <>
      <MessageContextMenu
        disabled={!showActions}
        message={message}
        isOwn={isOwn}
        isPinned={isPinned}
        canManageMessages={canManageMessages}
        reactionPending={reactionPending}
        onReact={(emoji) => onToggleReaction(message.id, emoji)}
        onReply={() => onReply(message.id)}
        onTogglePin={handleTogglePin}
        onStartEdit={onStartEdit}
        onRequestDelete={() => setOpenPanel('delete')}
      >
        <div
          {...longPress}
          className={cn(
            'group relative flex gap-3 px-4 hover:bg-muted/50',
            // Group heads carry the gap between groups; grouped rows sit tight.
            isGrouped ? 'py-0.5' : 'pb-0.5 pt-2.5',
            // Long press opens the action drawer on mobile, so suppress the
            // native text selection / callout it would otherwise trigger.
            showActions &&
              'max-md:select-none max-md:[-webkit-touch-callout:none]',
            isHighlighted && 'bg-accent/50',
            openPanel === 'actions' && 'bg-muted/50',
            // Right-click menu is open on this message.
            'data-[state=open]:bg-muted/50',
          )}
        >
          {isGrouped ? (
            // Same width as the avatar so grouped text stays aligned.
            <div className="flex h-5 w-8 shrink-0 items-center justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'cursor-default whitespace-nowrap text-[10px] text-muted-foreground',
                      'opacity-0 group-hover:opacity-100',
                      'group-data-[state=open]:opacity-100',
                    )}
                  >
                    {formatTime(message.createdAt)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {formatFullDate(message.createdAt)}
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <PresenceAvatar
              userId={message.senderId}
              name={message.sender?.name ?? 'Unknown'}
              image={message.sender?.image}
              workspaceId={workspaceId}
              className="mt-0.5"
            />
          )}

          <div className="min-w-0 flex-1">
            {isGrouped ? null : (
              <div className="mb-0.5 flex items-baseline gap-2">
                <span className="text-sm font-semibold truncate">
                  {message.sender?.name ?? 'Unknown'}
                </span>
                {message.sender?.isBot ? <BotBadge /> : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground shrink-0 cursor-default">
                      {formatTime(message.createdAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {formatFullDate(message.createdAt)}
                  </TooltipContent>
                </Tooltip>
                {statusMarkers}
              </div>
            )}

            {isEditing ? (
              <MessageEditComposer
                initialContent={message.content}
                workspaceId={workspaceId}
                currentUserId={currentUserId}
                members={members}
                tickets={tickets}
                channels={channels}
                mentionMessages={mentionMessages}
                allowAllMention={allowAllMention}
                onSave={(value) => {
                  if (value !== message.content) {
                    onEdit(message.id, value);
                  }
                  onCancelEdit();
                }}
                onCancel={onCancelEdit}
              />
            ) : (
              <>
                <MessageReplyPreview
                  replyToId={message.replyToId}
                  replyTo={message.replyTo}
                  onJumpToReply={onJumpToReply}
                />
                <div
                  className={cn(
                    // Wraps below the text when the message leaves no room.
                    showGroupedStatus &&
                      'flex flex-wrap items-baseline-last gap-x-2',
                  )}
                >
                  {message.content ? (
                    <MessageMarkdown
                      content={message.content}
                      className="min-w-0 max-w-full text-sm break-words"
                      members={members}
                      tickets={tickets}
                      channels={channels}
                      workspaceId={workspaceId}
                      onContentChange={
                        isOwn ? (next) => onEdit(message.id, next) : undefined
                      }
                    />
                  ) : null}
                  {showGroupedStatus ? (
                    <div className="flex items-center gap-2">{statusMarkers}</div>
                  ) : null}
                </div>
                <MessageAttachments
                  attachments={message.attachments}
                  className="mt-1.5"
                />
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
                'absolute -top-3 right-4 z-10 hidden items-center rounded-md border bg-popover p-0.5 shadow-md md:flex',
                'pointer-events-none opacity-0',
                'group-hover:pointer-events-auto group-hover:opacity-100',
                'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
                // Stay visible while the emoji picker popover is open.
                'has-data-[state=open]:pointer-events-auto has-data-[state=open]:opacity-100',
              )}
            >
              {TOOLBAR_REACTIONS.map((emoji) => (
                <MessageHoverAction
                  key={emoji}
                  label={`React with ${emoji}`}
                  disabled={reactionPending}
                  className="text-xs"
                  onClick={() => onToggleReaction(message.id, emoji)}
                >
                  {emoji}
                </MessageHoverAction>
              ))}
              <ReactionEmojiPicker
                align="end"
                onSelect={(emoji) => onToggleReaction(message.id, emoji)}
              >
                <MessageHoverAction
                  label="Add reaction"
                  disabled={reactionPending}
                >
                  <SmilePlus />
                </MessageHoverAction>
              </ReactionEmojiPicker>
              <Separator
                orientation="vertical"
                className="mx-0.5 h-4 data-vertical:self-center"
              />
              <MessageHoverAction
                label="Reply"
                onClick={() => onReply(message.id)}
              >
                <Reply />
              </MessageHoverAction>
              {canManageMessages ? (
                <MessageHoverAction
                  label={isPinned ? 'Unpin message' : 'Pin message'}
                  onClick={handleTogglePin}
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
                <MessageHoverAction
                  label="Delete message"
                  destructive
                  onClick={() => setOpenPanel('delete')}
                >
                  <Trash2 />
                </MessageHoverAction>
              ) : null}
            </div>
          ) : null}
        </div>
      </MessageContextMenu>

      <MessageActionDrawer
        open={openPanel === 'actions'}
        onOpenChange={(open) => setOpenPanel(open ? 'actions' : null)}
        message={message}
        isOwn={isOwn}
        isPinned={isPinned}
        canManageMessages={canManageMessages}
        reactionPending={reactionPending}
        onReact={(emoji) => onToggleReaction(message.id, emoji)}
        onReply={() => onReply(message.id)}
        onTogglePin={handleTogglePin}
        onStartEdit={onStartEdit}
        onRequestDelete={() => setOpenPanel('delete')}
      />

      {isOwn ? (
        <AlertDialog
          open={openPanel === 'delete'}
          onOpenChange={(open) => setOpenPanel(open ? 'delete' : null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete message?</AlertDialogTitle>
              <AlertDialogDescription>
                This message will be permanently deleted. This action cannot be
                undone.
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
    </>
  );
}
