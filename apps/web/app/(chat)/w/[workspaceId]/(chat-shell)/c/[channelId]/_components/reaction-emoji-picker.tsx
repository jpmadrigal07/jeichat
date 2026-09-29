'use client';

import { useState } from 'react';
import {
  EmojiPicker,
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListComponents,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
} from 'frimousse';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export const QUICK_REACTIONS = [
  '👍',
  '❤️',
  '😄',
  '😂',
  '🎉',
  '🔥',
  '👀',
  '💯',
] as const;

type ReactionEmojiPickerProps = {
  onSelect: (emoji: string) => void;
  /** Rendered as the popover/drawer trigger (via `asChild`). */
  children: React.ReactNode;
  /** Popover only; the mobile drawer always opens from the bottom. */
  align?: 'start' | 'center' | 'end';
  /** Popover only; the mobile drawer always opens from the bottom. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Quick-reaction row above the search box. On by default. */
  showQuickReactions?: boolean;
  /** Runs when the picker closes; call `preventDefault` to skip returning focus to the trigger. */
  onCloseAutoFocus?: (event: Event) => void;
};

type EmojiPickerBodyProps = {
  onSelect: (emoji: string) => void;
  showQuickReactions: boolean;
  className?: string;
};

function EmojiCategoryHeader({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      className="bg-popover px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground"
      {...props}
    >
      {category.label}
    </div>
  );
}

function EmojiRow({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div className="scroll-my-1 px-1.5" {...props}>
      {children}
    </div>
  );
}

function EmojiButton({ emoji, ...props }: EmojiPickerListEmojiProps) {
  return (
    <button
      type="button"
      className="flex size-8 items-center justify-center rounded-md text-lg data-active:bg-muted"
      {...props}
    >
      {emoji.emoji}
    </button>
  );
}

const EMOJI_LIST_COMPONENTS: Partial<EmojiPickerListComponents> = {
  CategoryHeader: EmojiCategoryHeader,
  Row: EmojiRow,
  Emoji: EmojiButton,
};

function EmojiPickerBody({
  onSelect,
  showQuickReactions,
  className,
}: EmojiPickerBodyProps) {
  return (
    <>
      {showQuickReactions ? (
        <div className="flex items-center gap-0.5 border-b p-1.5">
          {QUICK_REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-lg"
              onClick={() => onSelect(emoji)}
            >
              {emoji}
            </Button>
          ))}
        </div>
      ) : null}
      <EmojiPicker.Root
        className={cn('flex w-full flex-col', className)}
        onEmojiSelect={({ emoji }) => onSelect(emoji)}
      >
        <EmojiPicker.Search
          placeholder="Search emoji..."
          className="z-10 mx-2 mt-2 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
        {/* `data-vaul-no-drag` keeps scrolling the list from dragging the mobile drawer shut. */}
        <EmojiPicker.Viewport
          data-vaul-no-drag
          className="relative flex-1 outline-hidden"
        >
          <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </EmojiPicker.Loading>
          <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No emoji found.
          </EmojiPicker.Empty>
          <EmojiPicker.List
            className="select-none pb-1.5"
            components={EMOJI_LIST_COMPONENTS}
          />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>
    </>
  );
}

export function ReactionEmojiPicker({
  onSelect,
  children,
  align = 'start',
  side,
  showQuickReactions = true,
  onCloseAutoFocus,
}: ReactionEmojiPickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  function handleSelect(emoji: string) {
    onSelect(emoji);
    setOpen(false);
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent
          // Don't auto-focus search on open: it would raise the keyboard over the emoji grid.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={onCloseAutoFocus}
          className="pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <DrawerTitle className="sr-only">Choose an emoji</DrawerTitle>
          <DrawerDescription className="sr-only">
            Search or browse emoji to add.
          </DrawerDescription>
          <EmojiPickerBody
            onSelect={handleSelect}
            showQuickReactions={showQuickReactions}
            className="mt-2 h-[min(28rem,55dvh)]"
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-[min(20rem,calc(100vw-1rem))] p-0"
      >
        <EmojiPickerBody
          onSelect={handleSelect}
          showQuickReactions={showQuickReactions}
          className="h-72"
        />
      </PopoverContent>
    </Popover>
  );
}
