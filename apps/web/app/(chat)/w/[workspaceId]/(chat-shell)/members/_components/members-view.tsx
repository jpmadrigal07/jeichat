'use client';

import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCreateOrGetDm } from '@chat/_hooks/use-channels';
import { useOnlineUserIds } from '@chat/_hooks/use-presence';
import { useWorkspaceMembers } from '@chat/_hooks/use-workspaces';
import { useWorkspaceRootCrumb } from '@chat/_hooks/use-workspace-root-crumb';
import type { WorkspaceMember } from '@chat/_libs/workspaces';
import { BotBadge } from '@chat/_components/bot-badge';
import { ChatPageHeader } from '@chat/_components/chat-page-header';
import { ChatPane } from '@chat/_components/chat-pane';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import { WorkspaceSearch } from '@chat/_components/workspace-search';

function sortByName(a: WorkspaceMember, b: WorkspaceMember) {
  return a.name.localeCompare(b.name);
}

function MemberRow({
  member,
  online,
  disabled,
  onSelect,
}: {
  member: WorkspaceMember;
  online: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'h-auto min-h-12 w-full justify-start gap-3 rounded-none border-b px-4 py-2 font-normal',
        !online && 'opacity-70',
      )}
    >
      <PresenceAvatar
        userId={member.userId}
        name={member.name}
        image={member.image}
        showOffline
      />
      <span className="truncate text-sm font-medium">{member.name}</span>
      {member.isBot ? <BotBadge /> : null}
      {member.role === 'owner' ? (
        <Badge variant="secondary" className="ml-auto">
          Owner
        </Badge>
      ) : null}
    </Button>
  );
}

function MemberSection({
  label,
  members,
  online,
  currentUserId,
  pending,
  onSelectMember,
}: {
  label: string;
  members: WorkspaceMember[];
  online: boolean;
  currentUserId: string;
  pending: boolean;
  onSelectMember: (member: WorkspaceMember) => void;
}) {
  if (members.length === 0) return null;

  return (
    <section className="flex flex-col">
      <h2 className="border-b bg-muted/30 px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground">
        {label} — {members.length}
      </h2>
      {members.map((member) => (
        <MemberRow
          key={member.id}
          member={member}
          online={online}
          disabled={
            pending || Boolean(member.isBot) || member.userId === currentUserId
          }
          onSelect={() => onSelectMember(member)}
        />
      ))}
    </section>
  );
}

export function MembersView({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const router = useRouter();
  const { data: members, isPending } = useWorkspaceMembers(workspaceId);
  const { data: onlineIds } = useOnlineUserIds(workspaceId);
  const createDm = useCreateOrGetDm(workspaceId);
  const workspaceRoot = useWorkspaceRootCrumb(workspaceId);

  const onlineSet = new Set(onlineIds ?? []);
  const onlineMembers = (members ?? [])
    .filter((member) => onlineSet.has(member.userId))
    .sort(sortByName);
  const offlineMembers = (members ?? [])
    .filter((member) => !onlineSet.has(member.userId))
    .sort(sortByName);

  function startDm(member: WorkspaceMember) {
    if (member.userId === userId || member.isBot) return;
    createDm.mutate(member.userId, {
      onSuccess: (channel) => {
        router.push(`/w/${workspaceId}/c/${channel.id}`);
      },
    });
  }

  return (
    <ChatPane
      header={
        <ChatPageHeader
          backHref={workspaceRoot.href}
          backLabel="Back to channels"
          linearTitle="Members"
          crumbs={[{ label: 'Members' }]}
          actions={<WorkspaceSearch workspaceId={workspaceId} />}
        />
      }
    >
      {isPending ? (
        <div className="flex flex-col gap-2 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (members ?? []).length === 0 ? (
        <Empty className="flex-1 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No members yet</EmptyTitle>
            <EmptyDescription>
              People added to this workspace will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <MemberSection
            label="Online"
            members={onlineMembers}
            online
            currentUserId={userId}
            pending={createDm.isPending}
            onSelectMember={startDm}
          />
          <MemberSection
            label="Offline"
            members={offlineMembers}
            online={false}
            currentUserId={userId}
            pending={createDm.isPending}
            onSelectMember={startDm}
          />
        </div>
      )}
    </ChatPane>
  );
}
