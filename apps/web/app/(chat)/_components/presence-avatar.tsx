'use client';

import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { personInitials } from '../_helpers/ticket-fields';
import { useIsOnline } from '../_hooks/use-presence';

type PresenceAvatarProps = {
  userId: string;
  name: string;
  image?: string | null;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  workspaceId?: string;
  showOffline?: boolean;
};

export function PresenceAvatar({
  userId,
  name,
  image,
  className,
  size = 'default',
  workspaceId,
  showOffline = false,
}: PresenceAvatarProps) {
  const params = useParams<{ workspaceId?: string }>();
  const resolvedWorkspaceId = workspaceId ?? params.workspaceId;
  const online = useIsOnline(resolvedWorkspaceId, userId);

  return (
    <Avatar size={size} className={cn('shrink-0', className)}>
      <AvatarImage src={image ?? undefined} alt={name} />
      <AvatarFallback>{personInitials(name)}</AvatarFallback>
      {online ? (
        <AvatarBadge className="bg-online" />
      ) : showOffline ? (
        <AvatarBadge className="bg-muted-foreground" />
      ) : null}
    </Avatar>
  );
}
