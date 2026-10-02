'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHideDm } from '../_hooks/use-channels';

type DmContextMenuProps = {
  /** The sidebar row; right-clicking it opens the menu. */
  children: React.ReactNode;
  workspaceId: string;
  channelId: string;
  /** Who the conversation is with, shown in the confirmation. */
  name: string;
  /** The DM is the one currently open. */
  isActive: boolean;
};

/**
 * Right-click menu on a sidebar DM row (desktop only). Its one action takes
 * the conversation off the user's list after a confirmation; nothing is
 * deleted.
 */
export function DmContextMenu({
  children,
  workspaceId,
  channelId,
  name,
  isActive,
}: DmContextMenuProps) {
  const router = useRouter();
  // Below `md` there is no right-click, and a long press belongs to the row.
  const isMobile = useIsMobile();
  const hideDm = useHideDm(workspaceId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const afterCloseRef = useRef<(() => void) | null>(null);

  function removeFromList() {
    hideDm.mutate(channelId, {
      onSuccess: () => {
        // Don't leave the user on a conversation that just left the sidebar.
        if (isActive) router.push(`/w/${workspaceId}`);
      },
    });
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild disabled={isMobile}>
          <div className="min-w-0">{children}</div>
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-56"
          // The dialog opens once the menu has finished closing; otherwise the
          // menu pulls focus back to itself and dismisses the dialog.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const action = afterCloseRef.current;
            afterCloseRef.current = null;
            action?.();
          }}
        >
          <ContextMenuItem
            className="cursor-pointer"
            onSelect={() => {
              afterCloseRef.current = () => setConfirmOpen(true);
            }}
          >
            <ListX />
            Remove from the list
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from your list?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This only removes ${name} from your direct messages list. The conversation isn't deleted, and it will show up again if either of you sends a new message.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeFromList}>
              Remove from list
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
