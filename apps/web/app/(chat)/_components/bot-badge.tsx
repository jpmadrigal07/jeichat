import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function BotBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn('px-1 py-0 text-[10px]', className)}>
      BOT
    </Badge>
  );
}
