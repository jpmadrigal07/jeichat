'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { GitBranch, Unplug } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useChannels } from '@chat/_hooks/use-channels';
import { useWorkspaces } from '@chat/_hooks/use-workspaces';
import { isDmChannel } from '@chat/_helpers/channel-display';
import {
  useChannelGithubLink,
  useDisconnectChannelGithubLink,
  useGithubConnectBeginUrl,
  useGithubIntegrationStatus,
} from '@chat/_hooks/use-github-integration';

export function ChannelGithubPanel({
  workspaceId,
  channelId,
}: {
  workspaceId: string;
  channelId: string;
}) {
  const searchParams = useSearchParams();
  const ownerRef = useRef<HTMLInputElement>(null);
  const repoRef = useRef<HTMLInputElement>(null);
  const connectedToastShown = useRef(false);
  const { data: status, isLoading: statusLoading } = useGithubIntegrationStatus();
  const { data: channels, isLoading: channelsLoading } = useChannels(workspaceId);
  const { data: workspaces } = useWorkspaces();
  const channel = channels?.find((ch) => ch.id === channelId);
  const { data: link, isLoading: linkLoading } = useChannelGithubLink(
    workspaceId,
    channelId,
  );
  const disconnect = useDisconnectChannelGithubLink(workspaceId, channelId);
  const connectBegin = useGithubConnectBeginUrl(workspaceId, channelId);
  const workspace = workspaces?.find((ws) => ws.id === workspaceId);
  const canManage = workspace?.role === 'owner';

  useEffect(() => {
    if (
      searchParams.get('connected') === '1' &&
      !connectedToastShown.current
    ) {
      connectedToastShown.current = true;
      toast.success('GitHub repo linked to this channel');
    }
  }, [searchParams]);

  if (statusLoading || channelsLoading || linkLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!channel) {
    return (
      <p className="text-sm text-muted-foreground">Channel not found.</p>
    );
  }

  if (channel.parentId || isDmChannel(channel)) {
    return (
      <p className="text-sm text-muted-foreground">
        GitHub links apply to ticket board channels, not ticket threads or DMs.
      </p>
    );
  }

  if (!status?.configured) {
    return (
      <Alert className="max-w-lg">
        <GitBranch />
        <AlertTitle>GitHub integration not configured</AlertTitle>
        <AlertDescription>
          Set GITHUB_APP_ID and related env vars on the API server. See
          docs/integrations/github-tickets-bot.md.
        </AlertDescription>
      </Alert>
    );
  }

  if (!channel.ticketKey?.trim()) {
    return (
      <Alert className="max-w-lg">
        <GitBranch />
        <AlertTitle>Ticket key required</AlertTitle>
        <AlertDescription>
          Set a ticket key under General settings before connecting a repository.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">GitHub</h1>
        <p className="text-sm text-muted-foreground">
          Link one repository to this board. PRs and branches that include{' '}
          <strong>{channel.ticketKey}-&lt;number&gt;</strong> update ticket status.
        </p>
      </div>

      {link ? (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Linked repository</p>
            <p className="font-mono text-sm text-muted-foreground">
              {link.owner}/{link.repo}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a
                href={`https://github.com/${link.owner}/${link.repo}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open on GitHub
              </a>
            </Button>
            {canManage ? (
              <Button
                variant="destructive"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate()}
              >
                <Unplug className="h-4 w-4" />
                Disconnect
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            In chat, try @github status or @github help.
          </p>
        </div>
      ) : canManage ? (
        <form
          className="flex flex-col gap-4 rounded-lg border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const owner = ownerRef.current?.value.trim() ?? '';
            const repo = repoRef.current?.value.trim() ?? '';
            if (!owner || !repo) {
              toast.error('Enter owner and repository name');
              return;
            }
            connectBegin.mutate(
              { owner, repo },
              {
                onSuccess: ({ beginUrl }) => {
                  window.location.href = beginUrl;
                },
              },
            );
          }}
        >
          <Alert>
            <GitBranch />
            <AlertTitle>Connect repository</AlertTitle>
            <AlertDescription>
              You will install the JeiChat GitHub App and grant access to this
              repo. Only workspace administrators can connect.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="github-owner">Owner</Label>
              <Input
                id="github-owner"
                ref={ownerRef}
                placeholder="my-org"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="github-repo">Repository</Label>
              <Input
                id="github-repo"
                ref={repoRef}
                placeholder="my-app"
                autoComplete="off"
              />
            </div>
          </div>
          <Button type="submit" disabled={connectBegin.isPending}>
            Connect GitHub
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ask a workspace administrator to connect GitHub for this channel.
        </p>
      )}
    </div>
  );
}
