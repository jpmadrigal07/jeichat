'use client';

import { useRef } from 'react';
import { Pencil, Trash2, X, Check } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Message } from '../_libs/messages';

type MessageItemProps = {
  message: Message;
  isOwn: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function MessageItem({
  message,
  isOwn,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onEdit,
  onDelete,
}: MessageItemProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEdited = message.updatedAt !== message.createdAt;

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
    <div className="group flex gap-3 px-4 py-1.5 hover:bg-muted/50">
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={message.sender?.image ?? undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(message.sender?.name)}
        </AvatarFallback>
      </Avatar>

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
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
      </div>

      {isOwn && !isEditing && (
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onStartEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete message?</AlertDialogTitle>
                <AlertDialogDescription>
                  This message will be permanently deleted. This action cannot
                  be undone.
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
        </div>
      )}
    </div>
  );
}
