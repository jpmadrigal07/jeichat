'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { chatMessageFooterClass } from '@chat/_helpers/chat-footer-classes';
import {
  personInitials,
  TICKET_STATUS_META,
  ticketStatusOf,
} from '@chat/_helpers/ticket-fields';
import {
  filterMentionMembers,
  insertMention,
  type MentionableMember,
} from '@chat/_helpers/mentions';
import {
  activeComposerTag,
  filterTaggableTickets,
  insertTicketTag,
  type ComposerTag,
  type TaggableTicket,
} from '@chat/_helpers/ticket-mentions';
import {
  markdownShortcutForKey,
  wrapAsMarkdownLink,
  wrapSelection,
} from '../_helpers/markdown-shortcuts';
import { AttachmentPickerButton } from './attachment-picker-button';
import { AttachmentPreviewTray } from './attachment-preview-tray';
import type { PendingAttachment } from '../_hooks/use-attachment-uploads';

type MessageInputProps = {
  channelName: string | undefined;
  currentUserId: string;
  members: MentionableMember[];
  tickets: TaggableTicket[];
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

export function MessageInput({
  channelName,
  currentUserId,
  members,
  tickets,
  onSend,
  onTyping,
  sendDisabled,
  uploads,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasSendDisabledRef = useRef(false);
  const [hasText, setHasText] = useState(false);
  const [composerTag, setComposerTag] = useState<ComposerTag | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionMembers = filterMentionMembers(
    members.filter((member) => member.userId !== currentUserId),
    composerTag?.type === 'mention' ? composerTag.query : '',
  ).slice(0, 8);
  const mentionTickets = filterTaggableTickets(
    tickets,
    composerTag?.type === 'ticket' ? composerTag.query : '',
  ).slice(0, 8);
  const mentionOpen =
    composerTag?.type === 'mention' && mentionMembers.length > 0;
  const ticketOpen =
    composerTag?.type === 'ticket' && mentionTickets.length > 0;
  const pickerItems = mentionOpen ? mentionMembers : mentionTickets;
  const pickerOpen = mentionOpen || ticketOpen;
  const selectedIndex = pickerOpen
    ? Math.min(mentionIndex, pickerItems.length - 1)
    : 0;

  useEffect(() => {
    focusTextarea(textareaRef.current);
  }, [channelName]);

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

  function applyInsertedText(next: string, caret: number) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.value = next;
    textarea.setSelectionRange(caret, caret);
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    setHasText(!!next.trim());
    setComposerTag(null);
    setMentionIndex(0);
    focusTextarea(textarea);
  }

  function applyMention(member: MentionableMember) {
    const textarea = textareaRef.current;
    if (!textarea || composerTag?.type !== 'mention') return;
    const cursor = textarea.selectionStart ?? textarea.value.length;
    const next = insertMention(
      textarea.value,
      composerTag.start,
      cursor,
      member.name,
    );
    applyInsertedText(next, composerTag.start + member.name.length + 2);
  }

  function applyTicketTag(ticket: TaggableTicket) {
    const textarea = textareaRef.current;
    if (!textarea || composerTag?.type !== 'ticket') return;
    const cursor = textarea.selectionStart ?? textarea.value.length;
    const next = insertTicketTag(
      textarea.value,
      composerTag.start,
      cursor,
      ticket.displayId,
    );
    applyInsertedText(next, composerTag.start + ticket.displayId.length + 2);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (pickerOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((index) => (index + 1) % pickerItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(
          (index) => (index - 1 + pickerItems.length) % pickerItems.length,
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (mentionOpen) {
          const member = mentionMembers[selectedIndex];
          if (member) applyMention(member);
        } else {
          const ticket = mentionTickets[selectedIndex];
          if (ticket) applyTicketTag(ticket);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setComposerTag(null);
        return;
      }
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
    setComposerTag(null);
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
        {mentionOpen ? (
          <div className="absolute inset-x-0 bottom-full z-10 mb-1 overflow-hidden rounded-md border bg-popover p-1 shadow-md">
            {mentionMembers.map((member, index) => (
              <Button
                key={member.userId}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start font-normal',
                  index === selectedIndex && 'bg-muted',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applyMention(member)}
              >
                <Avatar className="size-5">
                  <AvatarImage src={member.image ?? undefined} alt="" />
                  <AvatarFallback>{personInitials(member.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{member.name}</span>
              </Button>
            ))}
          </div>
        ) : null}
        {ticketOpen ? (
          <div className="absolute inset-x-0 bottom-full z-10 mb-1 overflow-hidden rounded-md border bg-popover p-1 shadow-md">
            {mentionTickets.map((ticket, index) => {
              const meta = TICKET_STATUS_META[ticketStatusOf(ticket.status)];
              const StatusIcon = meta.icon;
              return (
                <Button
                  key={ticket.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start font-normal',
                    index === selectedIndex && 'bg-muted',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyTicketTag(ticket)}
                >
                  <StatusIcon
                    data-icon="inline-start"
                    className={meta.iconClassName}
                  />
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {ticket.displayId}
                  </span>
                  <span className="truncate">{ticket.name}</span>
                </Button>
              );
            })}
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
            placeholder={`Message #${channelName ?? '...'}`}
            className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            rows={1}
            autoFocus
            onKeyDown={handleKeyDown}
            onInput={(e) => {
              handleAutoResize(e);
              handleInput();
              const target = e.currentTarget;
              setHasText(!!target.value.trim());
              const next = activeComposerTag(
                target.value,
                target.selectionStart ?? target.value.length,
              );
              setComposerTag(next);
              setMentionIndex(0);
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
