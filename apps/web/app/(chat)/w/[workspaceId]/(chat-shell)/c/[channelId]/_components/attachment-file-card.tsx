'use client';

import { Download, FileText, Film, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatBytes } from '@/lib/attachment-mime';
import { cn } from '@/lib/utils';
import { attachmentFileUrl } from '../_helpers/attachment-file-url';
import type { MessageAttachment } from '../_libs/messages';

type AttachmentFileCardProps = {
  attachment: MessageAttachment;
  className?: string;
};

function fileIcon(contentType: string) {
  if (contentType.startsWith('video/')) return Film;
  if (contentType.startsWith('audio/')) return Music;
  return FileText;
}

export function AttachmentFileCard({
  attachment,
  className,
}: AttachmentFileCardProps) {
  const Icon = fileIcon(attachment.contentType);
  const href = attachmentFileUrl(attachment.id, { download: true });

  return (
    <Card
      className={cn(
        'w-fit max-w-72 flex-row items-center gap-2 py-1.5 pl-2 pr-1',
        className,
      )}
    >
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="min-w-0 flex-1 truncate font-medium">
            {attachment.filename}
          </p>
        </TooltipTrigger>
        <TooltipContent side="top">{attachment.filename}</TooltipContent>
      </Tooltip>
      <span className="shrink-0 text-muted-foreground tabular-nums">
        {formatBytes(attachment.sizeBytes)}
      </span>
      <Button
        size="icon-sm"
        variant="ghost"
        className="shrink-0"
        asChild
      >
        <a
          href={href}
          download={attachment.filename}
          aria-label={`Download ${attachment.filename}`}
        >
          <Download />
        </a>
      </Button>
    </Card>
  );
}
