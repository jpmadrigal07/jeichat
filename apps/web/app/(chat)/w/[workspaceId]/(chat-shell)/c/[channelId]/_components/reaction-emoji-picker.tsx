'use client';

import { useState } from 'react';
import { EmojiPicker } from 'frimousse';
import { SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🔥', '👀'] as const;

type ReactionEmojiPickerProps = {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  showTrigger?: boolean;
  triggerClassName?: string;
};

export function ReactionEmojiPicker({
  onSelect,
  disabled = false,
  showTrigger = true,
  triggerClassName,
}: ReactionEmojiPickerProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(emoji: string) {
    onSelect(emoji);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {showTrigger ? (
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className={cn('h-6 w-6 rounded-full', triggerClassName)}
          >
            <SmilePlus className="size-3.5" />
            <span className="sr-only">Add reaction</span>
          </Button>
        </PopoverTrigger>
      ) : null}
      <PopoverContent align="start" className="w-[320px] p-0">
        <div className="flex items-center gap-0.5 border-b p-1.5">
          {QUICK_REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-lg"
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
        <EmojiPicker.Root
          className="flex h-72 w-full flex-col"
          onEmojiSelect={({ emoji }) => handleSelect(emoji)}
        >
          <EmojiPicker.Search
            placeholder="Search emoji..."
            className="z-10 mx-2 mt-2 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <EmojiPicker.Viewport className="relative flex-1 outline-hidden">
            <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              Loading…
            </EmojiPicker.Loading>
            <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No emoji found.
            </EmojiPicker.Empty>
            <EmojiPicker.List
              className="select-none pb-1.5"
              components={{
                CategoryHeader: ({ category, ...props }) => (
                  <div
                    className="bg-popover px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground"
                    {...props}
                  >
                    {category.label}
                  </div>
                ),
                Row: ({ children, ...props }) => (
                  <div className="scroll-my-1 px-1.5" {...props}>
                    {children}
                  </div>
                ),
                Emoji: ({ emoji, ...props }) => (
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-md text-lg data-active:bg-muted"
                    {...props}
                  >
                    {emoji.emoji}
                  </button>
                ),
              }}
            />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </PopoverContent>
    </Popover>
  );
}
