'use client';

import { Copy, GitPullRequest } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useTicketGithubPullRequests } from '@chat/_hooks/use-github-integration';
import { suggestedTicketBranchName } from '@chat/_libs/github-integration';
import type { Channel } from '@chat/_libs/channels';

export function TicketGithubSection({
  boardTicketKey,
  channel,
}: {
  boardTicketKey: string | null | undefined;
  channel: Channel;
}) {
  const { data: pullRequests } = useTicketGithubPullRequests(channel.id);
  const branchName = suggestedTicketBranchName(
    boardTicketKey,
    channel.ticketNumber,
    channel.name,
  );

  if (!pullRequests?.length && !branchName) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 border-t pt-2">
      <p className="px-2 text-xs font-medium text-muted-foreground">GitHub</p>
      {branchName ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start font-mono text-xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(branchName);
              toast.success('Branch name copied');
            } catch {
              toast.error('Could not copy');
            }
          }}
        >
          <Copy data-icon="inline-start" className="size-3.5" />
          {branchName}
        </Button>
      ) : null}
      {pullRequests?.map((pr) => (
        <Button
          key={pr.id}
          variant="ghost"
          size="sm"
          className="h-auto w-full justify-start py-1.5 text-left"
          asChild
        >
          <a href={pr.htmlUrl} target="_blank" rel="noopener noreferrer">
            <GitPullRequest
              data-icon="inline-start"
              className="size-3.5 shrink-0"
            />
            <span className="truncate">
              #{pr.prNumber} {pr.headRef}
              {pr.merged ? ' (merged)' : ''}
            </span>
          </a>
        </Button>
      ))}
    </div>
  );
}
