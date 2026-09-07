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
  const iconClass = cn('size-4 shrink-0', className);

  if (isPrivate) {
    return <Lock className={iconClass} aria-hidden />;
  }

  return <Hash className={iconClass} aria-hidden />;
}
