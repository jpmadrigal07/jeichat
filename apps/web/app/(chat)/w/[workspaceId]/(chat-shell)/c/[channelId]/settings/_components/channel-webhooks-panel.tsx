"use client";

import { useRef } from "react";
import toast from "react-hot-toast";
import {
  Camera,
  ChevronDown,
  Clock,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  Webhook,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AVATAR_ACCEPT_ATTR } from "@chat/_libs/avatar-upload";
import { personInitials } from "@chat/_helpers/ticket-fields";
import {
  useChannelWebhooks,
  useCreateChannelWebhook,
  useDeleteChannelWebhook,
  useRegenerateChannelWebhookUrl,
  useRenameChannelWebhook,
  useUploadChannelWebhookAvatar,
} from "../_hooks/use-webhooks";
import type { ChannelWebhook } from "../_libs/webhooks";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ChannelWebhooksPanel({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}) {
  const { data, isLoading } = useChannelWebhooks(workspaceId, channelId);
  const create = useCreateChannelWebhook(workspaceId, channelId);
  const regenerate = useRegenerateChannelWebhookUrl(workspaceId, channelId);
  const revealedUrl = create.data?.url ?? regenerate.data?.url ?? null;

  if (isLoading) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const webhooks = data?.data ?? [];
  const canManage = data?.canManage ?? false;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Let other apps and scripts post messages into this channel with a
          simple HTTP request.
        </p>
      </div>

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          You need the Manage channel permission to view or create webhooks.
        </p>
      ) : (
        <>
          <Alert className="mb-6">
            <ShieldAlert />
            <AlertTitle>Keep webhook URLs secret</AlertTitle>
            <AlertDescription>
              Anyone with the URL can post here, so it is shown only once. Lost
              it or think it leaked? Regenerate it — the old URL stops working
              immediately. Each webhook is limited to 30 messages a minute, and
              @mentions in webhook messages never notify anyone.
            </AlertDescription>
          </Alert>

          <Button
            className="mb-6"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            New webhook
          </Button>

          {webhooks.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Webhook />
                </EmptyMedia>
                <EmptyTitle>No webhooks yet</EmptyTitle>
                <EmptyDescription>
                  Create one to get a URL that posts into this channel.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {webhooks.map((webhook) => (
                <WebhookCard
                  key={webhook.id}
                  workspaceId={workspaceId}
                  channelId={channelId}
                  webhook={webhook}
                  regenerating={
                    regenerate.isPending && regenerate.variables === webhook.id
                  }
                  onRegenerate={() => regenerate.mutate(webhook.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog
        open={Boolean(revealedUrl)}
        onOpenChange={(open) => {
          if (!open) {
            create.reset();
            regenerate.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your webhook URL now</DialogTitle>
            <DialogDescription>
              It will not be shown again. Treat it like a password — anyone who
              has it can post in this channel.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex min-w-0 gap-2">
                <Input
                  id="webhook-url"
                  readOnly
                  className="min-w-0 font-mono text-xs"
                  value={revealedUrl ?? ""}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!revealedUrl) return;
                    await navigator.clipboard.writeText(revealedUrl);
                    toast.success("Webhook URL copied");
                  }}
                >
                  <Copy data-icon="inline-start" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium">Try it</p>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {`curl -X POST '<webhook URL>' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"content": "Hello from a webhook"}'`}
              </pre>
              <p className="text-xs text-muted-foreground">
                Send JSON with a <code>content</code> string (up to 4,000
                characters, Markdown supported). Add <code>?wait=true</code> to
                get the created message back instead of an empty 204.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WebhookCard({
  workspaceId,
  channelId,
  webhook,
  regenerating,
  onRegenerate,
}: {
  workspaceId: string;
  channelId: string;
  webhook: ChannelWebhook;
  regenerating: boolean;
  onRegenerate: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const rename = useRenameChannelWebhook(workspaceId, channelId);
  const uploadAvatar = useUploadChannelWebhookAvatar(workspaceId, channelId);
  const remove = useDeleteChannelWebhook(workspaceId, channelId);

  function saveName(input: HTMLInputElement) {
    const name = input.value.trim();
    if (!name) {
      input.value = webhook.name;
      return;
    }
    if (name === webhook.name) return;
    rename.mutate(
      { webhookId: webhook.id, name },
      {
        onSuccess: () => toast.success("Webhook renamed"),
        onError: () => {
          input.value = webhook.name;
        },
      },
    );
  }

  return (
    <Collapsible className="group/webhook rounded-lg border bg-card">
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg p-4 text-left hover:bg-accent/40">
        <WebhookAvatar webhook={webhook} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{webhook.name}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Clock className="size-3 shrink-0" />
            Created on {dateFormat.format(new Date(webhook.createdAt))}
            {webhook.createdBy ? ` by ${webhook.createdBy.name}` : ""}
          </p>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/webhook:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="flex flex-col gap-4 border-t p-4 sm:flex-row">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              className="group/avatar relative rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              disabled={uploadAvatar.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <WebhookAvatar webhook={webhook} className="size-20" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100">
                {uploadAvatar.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Camera className="size-5" />
                )}
              </span>
              <span className="sr-only">Change {webhook.name} avatar</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={AVATAR_ACCEPT_ATTR}
              className="sr-only"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                uploadAvatar.mutate(
                  { webhookId: webhook.id, file },
                  { onSuccess: () => toast.success("Avatar updated") },
                );
              }}
            />
            <span className="text-[10px] text-muted-foreground">Max 2 MB</span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const input = event.currentTarget.elements.namedItem("name");
                if (input instanceof HTMLInputElement) saveName(input);
              }}
            >
              <Label htmlFor={`webhook-name-${webhook.id}`}>Name</Label>
              <Input
                key={webhook.name}
                id={`webhook-name-${webhook.id}`}
                name="name"
                defaultValue={webhook.name}
                maxLength={80}
                autoComplete="off"
                disabled={rename.isPending}
                onBlur={(event) => saveName(event.currentTarget)}
              />
            </form>

            <p className="text-xs text-muted-foreground">
              {webhook.lastUsedAt
                ? `Last used ${dateFormat.format(new Date(webhook.lastUsedAt))}`
                : "Never used"}
            </p>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={regenerating}>
                    {regenerating ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : (
                      <KeyRound data-icon="inline-start" />
                    )}
                    Regenerate URL
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate webhook URL?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The current URL stops working right away. Anything using
                      it will need the new one.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onRegenerate}>
                      Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={remove.isPending}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete webhook
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {webhook.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Its URL stops working immediately. Messages it already
                      posted stay in the channel.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() =>
                        remove.mutate(webhook.id, {
                          onSuccess: () => toast.success("Webhook deleted"),
                        })
                      }
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function WebhookAvatar({
  webhook,
  className,
}: {
  webhook: ChannelWebhook;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={webhook.image ?? undefined} alt={webhook.name} />
      <AvatarFallback>{personInitials(webhook.name)}</AvatarFallback>
    </Avatar>
  );
}
