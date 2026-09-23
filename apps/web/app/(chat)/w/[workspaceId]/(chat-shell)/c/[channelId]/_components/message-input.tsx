'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { SendHorizonal, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { chatMessageFooterClass } from '@chat/_helpers/chat-footer-classes';
import type { MentionableMember } from '@chat/_helpers/mentions';
import type {
  TaggableChannel,
  TaggableMessage,
  TaggableTicket,
} from '@chat/_helpers/ticket-mentions';
import { ComposerTagPicker } from '@chat/_components/composer-tag-picker';
import { useComposerTagPicker } from '@chat/_hooks/use-composer-tag-picker';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  markdownShortcutForKey,
  wrapAsMarkdownLink,
  wrapSelection,
} from '../_helpers/markdown-shortcuts';
import { messageReplySnippet } from '../_helpers/message-reply';
import { AttachmentPickerButton } from './attachment-picker-button';
import { AttachmentPreviewTray } from './attachment-preview-tray';
import type { PendingAttachment } from '../_hooks/use-attachment-uploads';

export type ComposerReplyTo = {
  id: string;
  content: string;
  sender: {
    name: string;
    image: string | null;
  } | null;
};

type MessageInputProps = {
  channelName: string | undefined;
  currentUserId: string;
  workspaceId: string;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  channels: TaggableChannel[];
  mentionMessages: TaggableMessage[];
  replyTo: ComposerReplyTo | null;
  onCancelReply: () => void;
  onSend: (content: string, attachmentIds: string[]) => void;
  onTyping: () => void;
  sendDisabled?: boolean;
  uploads: {
    items: PendingAttachment[];
    addFiles: (files: File[]) => void;
    remove: (localId: string) => void;
    retry: (localId: string) => void;
    isAnyUploading: boolean;
    readyServerIds: string[];
  };
};

function focusTextarea(textarea: HTMLTextAreaElement | null) {
  requestAnimationFrame(() => {
    textarea?.focus();
  });
}

/** Keeps desktop placeholder on one line; full name stays in the header. */
const DESKTOP_MESSAGE_PLACEHOLDER_MAX = 48;

function messageComposerPlaceholder(
  channelName: string | undefined,
  isMobile: boolean,
): string {
  if (isMobile) return 'Write a message…';
  const name = channelName?.trim() || '…';
  const label =
    name.length > DESKTOP_MESSAGE_PLACEHOLDER_MAX
      ? `${name.slice(0, DESKTOP_MESSAGE_PLACEHOLDER_MAX - 1)}…`
      : name;
  return `Message #${label}`;
}

export function MessageInput({
  channelName,
  currentUserId,
  workspaceId,
  members,
  tickets,
  channels,
  mentionMessages,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
  sendDisabled,
  uploads,
}: MessageInputProps) {
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasSendDisabledRef = useRef(false);
  const [hasText, setHasText] = useState(false);
  const picker = useComposerTagPicker({
    textareaRef,
    workspaceId,
    members,
    currentUserId,
    tickets,
    channels,
    localMessages: mentionMessages,
    onValueChange: (value) => {
      setHasText(!!value.trim());
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    },
  });

  useEffect(() => {
    focusTextarea(textareaRef.current);
  }, [channelName, replyTo?.id]);

  useEffect(() => {
    if (wasSendDisabledRef.current && !sendDisabled) {
      focusTextarea(textareaRef.current);
    }
    wasSendDisabledRef.current = !!sendDisabled;
  }, [sendDisabled]);

  const handleInput = useCallback(() => {
    if (typingTimeoutRef.current) return;
    onTyping();
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }, [onTyping]);

  const canSend =
    !uploads.isAnyUploading &&
    (hasText || uploads.readyServerIds.length > 0) &&
    !sendDisabled;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (picker.handlePickerKeyDown(e)) return;

    if (e.key === 'Escape' && replyTo) {
      e.preventDefault();
      onCancelReply();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && !e.altKey) {
      const shortcut = markdownShortcutForKey(e.key);
      if (shortcut) {
        e.preventDefault();
        applyMarkdownShortcut(shortcut);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function applyMarkdownShortcut(
    shortcut: Exclude<ReturnType<typeof markdownShortcutForKey>, null>,
  ) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const next =
      shortcut === 'link'
        ? wrapAsMarkdownLink(textarea.value, start, end)
        : wrapSelection(
            textarea.value,
            start,
            end,
            shortcut.prefix,
            shortcut.suffix,
          );
    textarea.value = next.value;
    textarea.setSelectionRange(next.selectionStart, next.selectionEnd);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function submit() {
    const value = textareaRef.current?.value.trim() ?? '';
    const hasAttachments = uploads.readyServerIds.length > 0;
    if ((!value && !hasAttachments) || !canSend) return;

    onSend(value, uploads.readyServerIds);

    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }
    setHasText(false);
    picker.syncFromTextarea();
    focusTextarea(textareaRef.current);
  }

  function handleAutoResize(e: React.FormEvent<HTMLTextAreaElement>) {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  }

  return (
    <div className={chatMessageFooterClass}>
      <div className="relative flex w-full flex-col rounded-lg border bg-muted/30 px-3 py-2">
        <ComposerTagPicker
          mentionOpen={picker.mentionOpen}
          mentionMembers={picker.mentionMembers}
          hashOpen={picker.hashOpen}
          hashItems={picker.hashItems}
          selectedIndex={picker.selectedIndex}
          isSearching={picker.isSearching}
          onMention={picker.applyMention}
          onHashItem={picker.applyHashItem}
        />
        {replyTo ? (
          <div className="mb-2 flex items-start justify-between gap-2 border-b border-border/60 pb-2">
            <div className="min-w-0">
              <p className="text-xs font-medium">
                Replying to {replyTo.sender?.name ?? 'a message'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {replyTo.content
                  ? messageReplySnippet(replyTo.content)
                  : 'Original message'}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={onCancelReply}
            >
              <X />
              <span className="sr-only">Cancel reply</span>
            </Button>
          </div>
        ) : null}
        <AttachmentPreviewTray
          items={uploads.items}
          onRemove={uploads.remove}
          onRetry={uploads.retry}
          className="border-b border-border/60 pb-2 mb-2"
        />
        <div className="flex items-end gap-2">
          <AttachmentPickerButton onAdd={uploads.addFiles} />
          <Textarea
            ref={textareaRef}
            placeholder={messageComposerPlaceholder(channelName, isMobile)}
            className="h-6 min-h-6 max-h-[200px] field-sizing-fixed resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
            rows={1}
            autoFocus
            onKeyDown={handleKeyDown}
            onSelect={picker.syncFromTextarea}
            onInput={(e) => {
              handleAutoResize(e);
              handleInput();
              setHasText(!!e.currentTarget.value.trim());
              picker.syncFromTextarea();
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onMouseDown={(e) => e.preventDefault()}
            onClick={submit}
            disabled={!canSend}
          >
            <SendHorizonal />
          </Button>
        </div>
      </div>
    </div>
  );
}
