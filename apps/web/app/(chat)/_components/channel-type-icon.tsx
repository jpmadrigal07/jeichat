import { Hash, Lock, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChannelTypeIconProps = {
  isPrivate?: boolean;
  /** Voice channels get a speaker instead of a hash. */
  isVoice?: boolean;
  className?: string;
};

export function ChannelTypeIcon({
  isPrivate = false,
  isVoice = false,
  className,
}: ChannelTypeIconProps) {
  const Icon = isVoice ? Volume2 : Hash;

  if (!isPrivate) {
    return <Icon className={cn('size-4 shrink-0', className)} aria-hidden />;
  }

  return (
    <span
      className={cn('relative inline-flex size-4 shrink-0', className)}
      aria-hidden
    >
      <Icon className="size-full [mask-image:radial-gradient(circle_at_82%_18%,transparent_30%,#000_32%)]" />
      <Lock
        className="absolute -top-[8%] -right-[8%] size-[52%] fill-current [&>path]:fill-none"
        strokeWidth={2.5}
      />
    </span>
  );
}
