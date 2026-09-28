import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function UnreadBadge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge
      className={cn('bg-notification text-notification-foreground', className)}
    >
      {children}
    </Badge>
  );
}
