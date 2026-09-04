'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Film, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatBytes } from '@/lib/attachment-mime';
import { cn } from '@/lib/utils';
import { useAttachmentDownloadUrl } from '../_hooks/use-attachment-download-url';
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
  const [fetchEnabled, setFetchEnabled] = useState(false);
  const pendingOpenRef = useRef(false);
  const Icon = fileIcon(attachment.contentType);

  const { data, isFetching } = useAttachmentDownloadUrl(
    attachment.id,
    fetchEnabled,
  );

  useEffect(() => {
    if (pendingOpenRef.current && data?.url) {
      pendingOpenRef.current = false;
      window.open(data.url, '_blank', 'noopener,noreferrer');
    }
  }, [data?.url]);

  function handleDownload() {
    if (data?.url) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
      return;
    }
    pendingOpenRef.current = true;
    setFetchEnabled(true);
  }

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
          <p className="max-w-36 truncate font-medium">
            {attachment.filename}
          </p>
        </TooltipTrigger>
        <TooltipContent side="top">{attachment.filename}</TooltipContent>
      </Tooltip>
      <span className="shrink-0 text-muted-foreground tabular-nums">
        {formatBytes(attachment.sizeBytes)}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="shrink-0"
        onClick={handleDownload}
        disabled={isFetching}
        aria-label={`Download ${attachment.filename}`}
      >
        {isFetching ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Download />
        )}
      </Button>
    </Card>
  );
}
