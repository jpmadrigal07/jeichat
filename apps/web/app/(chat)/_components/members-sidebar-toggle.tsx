'use client';

import { Users } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMembersSidebarOpen } from '../_hooks/use-members-sidebar';

export function MembersSidebarToggle() {
  const { open, setOpen } = useMembersSidebarOpen();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          pressed={open}
          onPressedChange={setOpen}
          aria-label={open ? 'Hide members' : 'Show members'}
        >
          <Users />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        {open ? 'Hide members' : 'Show members'}
      </TooltipContent>
    </Tooltip>
  );
}
