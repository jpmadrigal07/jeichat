'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Field>
      <FieldLabel>Appearance</FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        value={theme ?? 'system'}
        onValueChange={(value) => {
          if (value) setTheme(value);
        }}
        className="w-full"
      >
        {THEMES.map((item) => {
          const Icon = item.icon;
          return (
            <ToggleGroupItem
              key={item.value}
              value={item.value}
              aria-label={item.label}
              className="flex-1"
            >
              <Icon data-icon="inline-start" />
              {item.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </Field>
  );
}

export function ThemeModeButton({
  className,
}: {
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'shrink-0 text-muted-foreground hover:text-foreground',
        className,
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
