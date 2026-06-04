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
import { useAttachmentDownloadUrl } from '../_hooks/use-attachment-download-url';
import type { MessageAttachment } from '../_libs/messages';

type AttachmentFileCardProps = {
  attachment: MessageAttachment;
};

function fileIcon(contentType: string) {
  if (contentType.startsWith('video/')) return Film;
  if (contentType.startsWith('audio/')) return Music;
  return FileText;
}

export function AttachmentFileCard({ attachment }: AttachmentFileCardProps) {
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
    <Card className="flex max-w-[320px] items-center gap-3 py-2 pl-3 pr-2">
      <Icon className="h-8 w-8 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="truncate text-sm font-medium">
              {attachment.filename}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top">{attachment.filename}</TooltipContent>
        </Tooltip>
        <p className="text-xs text-muted-foreground">
          {formatBytes(attachment.sizeBytes)}
        </p>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0"
        onClick={handleDownload}
        disabled={isFetching}
        aria-label={`Download ${attachment.filename}`}
      >
        {isFetching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
    </Card>
  );
}
