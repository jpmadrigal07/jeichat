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
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/attachment-mime';
import type { PendingAttachment } from '../_hooks/use-attachment-uploads';

type AttachmentPreviewTrayProps = {
  items: PendingAttachment[];
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
  className?: string;
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
}: {
  item: PendingAttachment;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
}) {
  const isImage = !!item.previewUrl;
  const Icon = fileIcon(item.file);
  const showProgress =
    item.status === 'uploading' || item.status === 'queued';
  const isError = item.status === 'error';

  if (isImage) {
    return (
      <div
        className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted ${
          isError ? 'border-destructive' : ''
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.previewUrl!}
          alt={item.file.name}
          className="h-full w-full object-cover"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="absolute right-1 top-1 h-6 w-6 opacity-90"
          onClick={() => onRemove(item.localId)}
          aria-label={`Remove ${item.file.name}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        {isError && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute bottom-1 left-1 h-6 w-6"
            onClick={() => onRetry(item.localId)}
            aria-label={`Retry ${item.file.name}`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
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

  return (
    <Card
      className={`relative h-20 w-[220px] shrink-0 gap-0 overflow-hidden py-2 pl-3 pr-8 ${
        isError ? 'border-destructive' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-8 w-8 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{item.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatBytes(item.file.size)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="absolute right-1 top-1 h-6 w-6"
        onClick={() => onRemove(item.localId)}
        aria-label={`Remove ${item.file.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      {isError && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-1 bottom-1 h-6 w-6"
          onClick={() => onRetry(item.localId)}
          aria-label={`Retry ${item.file.name}`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
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
}: AttachmentPreviewTrayProps) {
  if (!items.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => (
        <PreviewItem
          key={item.localId}
          item={item}
          onRemove={onRemove}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
