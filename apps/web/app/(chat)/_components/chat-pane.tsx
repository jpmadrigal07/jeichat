'use client';

import { MembersSidebar } from './members-sidebar';

export function ChatPane({
  header,
  children,
  currentUserId,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  currentUserId: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {header}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        <MembersSidebar currentUserId={currentUserId} />
      </div>
    </div>
  );
}
