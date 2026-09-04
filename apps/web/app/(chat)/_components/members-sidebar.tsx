'use client';

import { useParams } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useWorkspaceMembers } from '../_hooks/use-workspaces';
import { useOnlineUserIds } from '../_hooks/use-presence';
import { useMembersSidebarOpen } from '../_hooks/use-members-sidebar';
import type { WorkspaceMember } from '../_libs/workspaces';
import { PresenceAvatar } from './presence-avatar';

function sortByName(a: WorkspaceMember, b: WorkspaceMember) {
  return a.name.localeCompare(b.name);
}

function MemberRow({
  member,
  online,
}: {
  member: WorkspaceMember;
  online: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1 hover:bg-sidebar-accent',
        !online && 'opacity-70',
      )}
    >
      <PresenceAvatar
        userId={member.userId}
        name={member.name}
        image={member.image}
        size="sm"
        showOffline
      />
      <span className="truncate text-sm">{member.name}</span>
    </div>
  );
}

function MemberSection({
  label,
  members,
  online,
}: {
  label: string;
  members: WorkspaceMember[];
  online: boolean;
}) {
  if (members.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5 px-2">
      <p className="px-2 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground">
        {label} — {members.length}
      </p>
      {members.map((member) => (
        <MemberRow key={member.id} member={member} online={online} />
      ))}
    </div>
  );
}

export function MembersSidebar() {
  const params = useParams<{ workspaceId?: string }>();
  const workspaceId = params.workspaceId;
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId ?? '');
  const { data: onlineIds } = useOnlineUserIds(workspaceId);
  const { open } = useMembersSidebarOpen();
  const onlineSet = new Set(onlineIds ?? []);

  if (!workspaceId || !open) return null;

  const onlineMembers = (members ?? [])
    .filter((member) => onlineSet.has(member.userId))
    .sort(sortByName);
  const offlineMembers = (members ?? [])
    .filter((member) => !onlineSet.has(member.userId))
    .sort(sortByName);

  return (
    <aside className="flex h-full min-h-0 w-60 shrink-0 flex-col overflow-hidden border-l bg-sidebar/50">
      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <ScrollArea className="h-full">
          <MemberSection label="Online" members={onlineMembers} online />
          <MemberSection label="Offline" members={offlineMembers} online={false} />
        </ScrollArea>
      )}
    </aside>
  );
}
