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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {header}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
        <MembersSidebar currentUserId={currentUserId} />
      </div>
    </div>
  );
}
