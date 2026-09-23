'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkspaceMembers } from '../_hooks/use-workspaces';
import { useOnlineUserIds } from '../_hooks/use-presence';
import { useMembersSidebarOpen } from '../_hooks/use-members-sidebar';
import { useCreateOrGetDm } from '../_hooks/use-channels';
import type { WorkspaceMember } from '../_libs/workspaces';
import { PresenceAvatar } from './presence-avatar';
import { BotBadge } from './bot-badge';

function sortByName(a: WorkspaceMember, b: WorkspaceMember) {
  return a.name.localeCompare(b.name);
}

function MemberRow({
  member,
  online,
  onSelect,
  disabled,
}: {
  member: WorkspaceMember;
  online: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'h-auto w-full justify-start gap-2 rounded-md px-2 py-1 font-normal',
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
      {member.isBot ? <BotBadge /> : null}
    </Button>
  );
}

function MemberSection({
  label,
  members,
  online,
  onSelectMember,
  disabled,
}: {
  label: string;
  members: WorkspaceMember[];
  online: boolean;
  onSelectMember: (member: WorkspaceMember) => void;
  disabled: boolean;
}) {
  if (members.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5 px-2">
      <p className="px-2 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground">
        {label} — {members.length}
      </p>
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          online={online}
          disabled={disabled || Boolean(member.isBot)}
          onSelect={() => onSelectMember(member)}
        />
      ))}
    </div>
  );
}

export function MembersSidebar({ currentUserId }: { currentUserId: string }) {
  const params = useParams<{ workspaceId?: string }>();
  const workspaceId = params.workspaceId;
  const router = useRouter();
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId ?? '');
  const { data: onlineIds } = useOnlineUserIds(workspaceId);
  const { open, setOpen } = useMembersSidebarOpen();
  const createDm = useCreateOrGetDm(workspaceId ?? '');
  const onlineSet = new Set(onlineIds ?? []);

  if (!workspaceId || !open) return null;

  function startDm(member: WorkspaceMember) {
    if (member.userId === currentUserId || member.isBot) return;
    createDm.mutate(member.userId, {
      onSuccess: (channel) => {
        router.push(`/w/${workspaceId}/c/${channel.id}`);
      },
    });
  }

  const onlineMembers = (members ?? [])
    .filter((member) => onlineSet.has(member.userId))
    .sort(sortByName);
  const offlineMembers = (members ?? [])
    .filter((member) => !onlineSet.has(member.userId))
    .sort(sortByName);

  return (
    <>
      <button
        type="button"
        aria-label="Close members"
        className="fixed inset-0 z-30 bg-black/40 md:hidden"
        onClick={() => setOpen(false)}
      />
      <aside className="fixed inset-y-0 right-0 z-40 flex h-full min-h-0 w-full max-w-sm flex-col overflow-hidden border-l bg-background md:relative md:z-auto md:w-60 md:max-w-none md:shrink-0 md:bg-sidebar/50">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close members"
          onClick={() => setOpen(false)}
        >
          <ChevronLeft />
        </Button>
        <p className="text-sm font-semibold">Members</p>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <ScrollArea className="h-full">
          <MemberSection
            label="Online"
            members={onlineMembers}
            online
            disabled={createDm.isPending}
            onSelectMember={startDm}
          />
          <MemberSection
            label="Offline"
            members={offlineMembers}
            online={false}
            disabled={createDm.isPending}
            onSelectMember={startDm}
          />
        </ScrollArea>
      )}
      </aside>
    </>
  );
}
