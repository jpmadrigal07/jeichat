import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function BotBadge({
  className,
  label = 'BOT',
}: {
  className?: string;
  label?: 'BOT' | 'WH';
}) {
  return (
    <Badge variant="secondary" className={cn('px-1 py-0 text-[10px]', className)}>
      {label}
    </Badge>
  );
}
