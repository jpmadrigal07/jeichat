'use client';

import {
  FileText,
  Film,
  Music,
  RotateCcw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/attachment-mime';
import type { PendingAttachment } from '../_hooks/use-attachment-uploads';

type AttachmentPreviewTrayProps = {
  items: PendingAttachment[];
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
  className?: string;
  compact?: boolean;
};

function fileIcon(file: File) {
  if (file.type.startsWith('video/')) return Film;
  if (file.type.startsWith('audio/')) return Music;
  return FileText;
}

function PreviewItem({
  item,
  onRemove,
  onRetry,
  compact,
}: {
  item: PendingAttachment;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
  compact?: boolean;
}) {
  const isImage = !!item.previewUrl;
  const Icon = fileIcon(item.file);
  const showProgress =
    item.status === 'uploading' || item.status === 'queued';
  const isError = item.status === 'error';

  if (isImage) {
    return (
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-lg border bg-muted',
          compact ? 'size-12' : 'size-20',
          isError && 'border-destructive',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl!}
          alt={item.file.name}
          className="size-full object-cover"
        />
        <Button
          type="button"
          size="icon-xs"
          variant="secondary"
          className="absolute right-0.5 top-0.5 opacity-90"
          onClick={() => onRemove(item.localId)}
          aria-label={`Remove ${item.file.name}`}
        >
          <X />
        </Button>
        {isError && (
          <Button
            type="button"
            size="icon-xs"
            variant="secondary"
            className="absolute bottom-0.5 left-0.5"
            onClick={() => onRetry(item.localId)}
            aria-label={`Retry ${item.file.name}`}
          >
            <RotateCcw />
          </Button>
        )}
        {showProgress && (
          <div className="absolute inset-x-0 bottom-0 px-1 pb-1">
            <Progress value={item.progress * 100} className="h-1" />
          </div>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          'relative max-w-44',
          isError && 'rounded-md ring-1 ring-destructive',
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full pr-7"
            >
              <Icon data-icon="inline-start" />
              <span className="min-w-0 truncate">{item.file.name}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {item.file.name} · {formatBytes(item.file.size)}
          </TooltipContent>
        </Tooltip>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="absolute right-0.5 top-1/2 -translate-y-1/2"
          onClick={() => onRemove(item.localId)}
          aria-label={`Remove ${item.file.name}`}
        >
          <X />
        </Button>
        {isError ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="absolute right-5 top-1/2 -translate-y-1/2"
            onClick={() => onRetry(item.localId)}
            aria-label={`Retry ${item.file.name}`}
          >
            <RotateCcw />
          </Button>
        ) : null}
        {showProgress ? (
          <div className="absolute inset-x-1 bottom-0.5">
            <Progress value={item.progress * 100} className="h-0.5" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'relative h-20 w-[220px] shrink-0 gap-0 overflow-hidden py-2 pl-3 pr-8',
        isError && 'border-destructive',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-8 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{item.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(item.file.size)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="absolute right-1 top-1"
        onClick={() => onRemove(item.localId)}
        aria-label={`Remove ${item.file.name}`}
      >
        <X />
      </Button>
      {isError && (
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="absolute right-1 bottom-1"
          onClick={() => onRetry(item.localId)}
          aria-label={`Retry ${item.file.name}`}
        >
          <RotateCcw />
        </Button>
      )}
      {showProgress && (
        <div className="absolute inset-x-0 bottom-0 px-2 pb-1">
          <Progress value={item.progress * 100} className="h-1" />
        </div>
      )}
    </Card>
  );
}

export function AttachmentPreviewTray({
  items,
  onRemove,
  onRetry,
  className,
  compact,
}: AttachmentPreviewTrayProps) {
  if (!items.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((item) => (
        <PreviewItem
          key={item.localId}
          item={item}
          onRemove={onRemove}
          onRetry={onRetry}
          compact={compact}
        />
      ))}
    </div>
  );
}
