'use client';

import { useRef, useCallback } from 'react';
import { SendHorizonal } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type MessageInputProps = {
  channelName: string | undefined;
  onSend: (content: string) => void;
  onTyping: () => void;
  disabled?: boolean;
};

export function MessageInput({
  channelName,
  onSend,
  onTyping,
  disabled,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = useCallback(() => {
    if (typingTimeoutRef.current) return;
    onTyping();
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 2000);
  }, [onTyping]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const value = textareaRef.current?.value.trim();
    if (!value) return;
    onSend(value);
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleAutoResize(e: React.FormEvent<HTMLTextAreaElement>) {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  }

  return (
    <div className="border-t p-4 shrink-0">
      <div className="flex items-end gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <Textarea
          ref={textareaRef}
          placeholder={`Message #${channelName ?? '...'}`}
          className="min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          rows={1}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            handleAutoResize(e);
            handleInput();
          }}
          disabled={disabled}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={submit}
          disabled={disabled}
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
