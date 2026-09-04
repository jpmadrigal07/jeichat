'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  LABEL_COLORS,
  labelColorClass,
  type LabelColor,
} from '@chat/_helpers/ticket-fields';

export function LabelColorPicker({
  color,
  onChange,
  disabled,
}: {
  color: string;
  onChange: (color: LabelColor) => void;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Change color"
        >
          <span
            className={cn('size-3.5 rounded-full', labelColorClass(color))}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto flex-row gap-0.5 p-1">
        {LABEL_COLORS.map((option) => (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={option}
            aria-pressed={option === color}
            onClick={() => onChange(option)}
          >
            <span
              className={cn(
                'size-3.5 rounded-full ring-offset-background',
                labelColorClass(option),
                option === color && 'ring-2 ring-foreground',
              )}
            />
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
