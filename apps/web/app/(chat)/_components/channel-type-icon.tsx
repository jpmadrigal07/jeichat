import { Hash, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChannelTypeIconProps = {
  isPrivate?: boolean;
  className?: string;
};

export function ChannelTypeIcon({
  isPrivate = false,
  className,
}: ChannelTypeIconProps) {
  if (!isPrivate) {
    return <Hash className={cn('size-4 shrink-0', className)} aria-hidden />;
  }

  return (
    <span
      className={cn('relative inline-flex size-4 shrink-0', className)}
      aria-hidden
    >
      <Hash className="size-full [mask-image:radial-gradient(circle_at_82%_18%,transparent_30%,#000_32%)]" />
      <Lock
        className="absolute -top-[8%] -right-[8%] size-[52%] fill-current [&>path]:fill-none"
        strokeWidth={2.5}
      />
    </span>
  );
}
