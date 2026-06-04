'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { chatMessageFooterClass } from '../../../../../../_helpers/chat-footer-classes';
import { AttachmentPickerButton } from './attachment-picker-button';
import { AttachmentPreviewTray } from './attachment-preview-tray';
import type { PendingAttachment } from '../_hooks/use-attachment-uploads';

type MessageInputProps = {
  channelName: string | undefined;
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
  onSend,
  onTyping,
  sendDisabled,
  uploads,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasSendDisabledRef = useRef(false);
  const [hasText, setHasText] = useState(false);

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
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
    focusTextarea(textareaRef.current);
  }

  function handleAutoResize(e: React.FormEvent<HTMLTextAreaElement>) {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  }

  return (
    <div className={chatMessageFooterClass}>
      <div className="flex w-full flex-col rounded-lg border bg-muted/30 px-3 py-2">
        <AttachmentPreviewTray
          items={uploads.items}
          onRemove={uploads.remove}
          onRetry={uploads.retry}
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
              setHasText(!!e.currentTarget.value.trim());
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
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
