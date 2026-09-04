'use client';

import { useSyncExternalStore } from 'react';
import {
  getMembersSidebarOpen,
  getMembersSidebarServerSnapshot,
  setMembersSidebarOpen,
  subscribeMembersSidebar,
} from '../_libs/members-sidebar';

export function useMembersSidebarOpen() {
  const open = useSyncExternalStore(
    subscribeMembersSidebar,
    getMembersSidebarOpen,
    getMembersSidebarServerSnapshot,
  );

  return { open, setOpen: setMembersSidebarOpen };
}
