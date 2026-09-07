'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '../_libs/messages';
import { ReactionEmojiPicker } from './reaction-emoji-picker';

type MessageReactionsProps = {
  reactions: MessageReaction[];
  onToggle: (emoji: string) => void;
  disabled?: boolean;
};

function reactionTooltip(reaction: MessageReaction) {
  const names = reaction.users.map((user) => user.name);
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} and ${names.length - 5} more`;
}

export function MessageReactions({
  reactions,
  onToggle,
  disabled = false,
}: MessageReactionsProps) {
  const hasReactions = reactions.length > 0;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((reaction) => (
        <Tooltip key={reaction.emoji}>
          <TooltipTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onToggle(reaction.emoji)}
              className={cn(
                'inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs transition-colors',
                reaction.reactedByMe
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted',
              )}
            >
              <span className="text-sm leading-none">{reaction.emoji}</span>
              <span className="font-medium tabular-nums">{reaction.count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{reactionTooltip(reaction)}</TooltipContent>
        </Tooltip>
      ))}

      <ReactionEmojiPicker
        onSelect={onToggle}
        disabled={disabled}
        triggerClassName={
          hasReactions
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
        }
      />
    </div>
  );
}
