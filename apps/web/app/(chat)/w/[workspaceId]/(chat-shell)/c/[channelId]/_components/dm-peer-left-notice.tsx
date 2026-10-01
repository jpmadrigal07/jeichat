import { UserX } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { chatMessageFooterClass } from '@chat/_helpers/chat-footer-classes';

/** Stands in for the composer once the other person has left the workspace. */
export function DmPeerLeftNotice({ name }: { name: string }) {
  return (
    <div className={cn(chatMessageFooterClass, 'items-center')}>
      <Alert>
        <UserX />
        <AlertDescription>
          {/* Explicit space: SWC drops the one after `{name}` when the text has an entity. */}
          {name}{' '}
          is no longer in this workspace, so you can&apos;t send them messages.
        </AlertDescription>
      </Alert>
    </div>
  );
}
