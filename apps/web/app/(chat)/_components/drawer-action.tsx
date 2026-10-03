'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DrawerActionProps = React.ComponentProps<typeof Button> & {
  destructive?: boolean;
};

/** Full-width, touch-sized row for actions inside a bottom drawer. */
export function DrawerAction({
  destructive = false,
  asChild,
  className,
  ...props
}: DrawerActionProps) {
  return (
    <Button
      type={asChild ? undefined : 'button'}
      asChild={asChild}
      variant="ghost"
      size="lg"
      className={cn(
        'h-11 w-full justify-start gap-3 px-3 text-sm',
        destructive &&
          'text-destructive hover:bg-destructive/10 hover:text-destructive',
        className,
      )}
      {...props}
    />
  );
}
