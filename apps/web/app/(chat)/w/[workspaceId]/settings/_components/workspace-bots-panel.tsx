'use client';

import { useRef } from 'react';
import { Bot, Copy, KeyRound, Pencil, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import { BotBadge } from '@chat/_components/bot-badge';
import { useWorkspaces } from '@chat/_hooks/use-workspaces';
import { useCanManageWorkspaceBots } from '../_hooks/use-can-manage-workspace-bots';
import {
  useCreateWorkspaceBot,
  useDisableWorkspaceBot,
  useRegenerateWorkspaceBotToken,
  useUpdateWorkspaceBot,
  useWorkspaceBots,
} from '../_hooks/use-bots';

export function WorkspaceBotsPanel({ workspaceId }: { workspaceId: string }) {
  const { data: workspaces, isLoading: workspaceLoading } = useWorkspaces();
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const { data: bots, isLoading: botsLoading } = useWorkspaceBots(workspaceId);
  const createBot = useCreateWorkspaceBot(workspaceId);
  const updateBot = useUpdateWorkspaceBot(workspaceId);
  const regenerate = useRegenerateWorkspaceBotToken(workspaceId);
  const disableBot = useDisableWorkspaceBot(workspaceId);
  const nameRef = useRef<HTMLInputElement>(null);
  const revealedToken = createBot.data?.token ?? regenerate.data?.token ?? null;
  const { canManage, isLoading: canManageLoading } =
    useCanManageWorkspaceBots(workspaceId);

  if (workspaceLoading || canManageLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <p className="text-sm text-muted-foreground">Workspace not found.</p>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Bots</h1>
        <p className="text-sm text-muted-foreground">
          Create workspace bots that can send messages and manage tickets.
        </p>
      </div>

      <Alert className="mb-6">
        <Bot />
        <AlertTitle>Default bot role</AlertTitle>
        <AlertDescription>
          New bots get the Bot role with view and send access. Assigning extra
          roles replaces those implicit everyone grants — keep VIEW_CHANNEL and
          SEND_MESSAGES on at least one of the bot&apos;s roles.
        </AlertDescription>
      </Alert>

      {canManage ? (
        <form
          className="mb-6 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const name = nameRef.current?.value.trim() ?? '';
            if (!name) return;
            createBot.mutate(
              { name },
              {
                onSuccess: () => {
                  if (nameRef.current) nameRef.current.value = '';
                },
              },
            );
          }}
        >
          <Input
            ref={nameRef}
            name="name"
            placeholder="Alerts bot"
            required
          />
          <Button type="submit" disabled={createBot.isPending}>
            <Plus />
            Create
          </Button>
        </form>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          Only the workspace owner or an administrator can create or disable
          bots.
        </p>
      )}

      <div className="flex flex-col gap-1">
        {botsLoading ? (
          Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))
        ) : bots && bots.length > 0 ? (
          bots.map((bot) => (
            <div
              key={bot.id}
              className="flex items-center gap-3 rounded-md px-2 py-2"
            >
              <PresenceAvatar
                userId={bot.userId}
                name={bot.name}
                image={bot.image}
                workspaceId={workspaceId}
                showOffline
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  <span className="truncate">{bot.name}</span>
                  <BotBadge />
                  {bot.disabledAt ? (
                    <Badge variant="outline">Disabled</Badge>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  Token {bot.tokenPrefix}…
                </p>
              </div>
              {canManage && !bot.disabledAt ? (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={updateBot.isPending}
                    onClick={() => {
                      const name = window.prompt('Bot name', bot.name)?.trim();
                      if (!name || name === bot.name) return;
                      updateBot.mutate({ botId: bot.id, name });
                    }}
                  >
                    <Pencil />
                    <span className="sr-only">Rename {bot.name}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={regenerate.isPending}
                    onClick={() => regenerate.mutate(bot.id)}
                  >
                    <KeyRound />
                    <span className="sr-only">Regenerate token</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disableBot.isPending}
                    onClick={() => disableBot.mutate(bot.id)}
                  >
                    Disable
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No bots yet.</p>
        )}
      </div>

      <Dialog
        open={Boolean(revealedToken)}
        onOpenChange={(open) => {
          if (!open) {
            createBot.reset();
            regenerate.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy this token now</DialogTitle>
            <DialogDescription>
              It will not be shown again. Treat it like a password.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bot-token">Bot token</Label>
            <div className="flex gap-2">
              <Input
                id="bot-token"
                readOnly
                value={revealedToken ?? ''}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (!revealedToken) return;
                  await navigator.clipboard.writeText(revealedToken);
                  toast.success('Token copied');
                }}
              >
                <Copy />
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
