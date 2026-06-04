'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  formatBytes,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  mimeTypeForFile,
  validateFiles,
  type FileRejection,
} from '@/lib/attachment-mime';
import { fetchPresign, putToR2 } from '../_libs/attachments';

export type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'error';

export type PendingAttachment = {
  localId: string;
  file: File;
  previewUrl: string | null;
  status: UploadStatus;
  progress: number;
  serverId: string | null;
  error: string | null;
};

function groupRejectionsByKind(rejected: FileRejection[]) {
  const map = new Map<FileRejection['kind'], FileRejection[]>();
  for (const r of rejected) {
    const list = map.get(r.kind) ?? [];
    list.push(r);
    map.set(r.kind, list);
  }
  return map;
}

function toastRejections(rejected: FileRejection[]) {
  if (!rejected.length) return;
  const byKind = groupRejectionsByKind(rejected);
  const unsupported = byKind.get('unsupported-type');
  const tooLarge = byKind.get('too-large');
  const tooMany = byKind.get('too-many');

  if (unsupported?.length) {
    const first = unsupported[0];
    toast.error(
      unsupported.length === 1 && first
        ? `"${first.file.name}" — file type not supported`
        : `${unsupported.length} files skipped (unsupported type)`,
    );
  }
  if (tooLarge?.length) {
    toast.error(
      `${tooLarge.length} file(s) exceed the ${formatBytes(MAX_ATTACHMENT_BYTES)} limit`,
    );
  }
  if (tooMany?.length) {
    toast.error(`Max ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message`);
  }
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function useAttachmentUploads(channelId: string) {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const abortControllersRef = useRef(new Map<string, AbortController>());

  const updateItem = useCallback(
    (localId: string, patch: Partial<PendingAttachment>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.localId === localId ? { ...item, ...patch } : item,
        ),
      );
    },
    [],
  );

  const revokePreview = useCallback((item: PendingAttachment) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }, []);

  const runUpload = useCallback(
    async (localId: string, file: File) => {
      const controller = new AbortController();
      abortControllersRef.current.set(localId, controller);

      updateItem(localId, {
        status: 'uploading',
        progress: 0,
        error: null,
      });

      try {
        const presign = await fetchPresign(
          {
            channelId,
            filename: file.name,
            contentType: mimeTypeForFile(file),
            sizeBytes: file.size,
          },
          { signal: controller.signal },
        );

        updateItem(localId, { serverId: presign.attachmentId });

        await putToR2(
          presign.uploadUrl,
          file,
          (progress) => updateItem(localId, { progress }),
          controller.signal,
        );

        updateItem(localId, { status: 'uploaded', progress: 1 });
      } catch (err) {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error ? err.message : 'Upload failed';
        updateItem(localId, { status: 'error', error: message });
      } finally {
        abortControllersRef.current.delete(localId);
      }
    },
    [channelId, updateItem],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      if (!files.length) return;

      setItems((current) => {
        const { accepted, rejected } = validateFiles(files, current.length);
        toastRejections(rejected);
        if (!accepted.length) return current;

        const newItems: PendingAttachment[] = accepted.map((file) => ({
          localId: crypto.randomUUID(),
          file,
          previewUrl: isImageFile(file)
            ? URL.createObjectURL(file)
            : null,
          status: 'queued' as const,
          progress: 0,
          serverId: null,
          error: null,
        }));

        for (const item of newItems) {
          void runUpload(item.localId, item.file);
        }

        return [...current, ...newItems];
      });
    },
    [runUpload],
  );

  const remove = useCallback(
    (localId: string) => {
      const controller = abortControllersRef.current.get(localId);
      controller?.abort();
      abortControllersRef.current.delete(localId);

      setItems((prev) => {
        const item = prev.find((i) => i.localId === localId);
        if (item) revokePreview(item);
        return prev.filter((i) => i.localId !== localId);
      });
    },
    [revokePreview],
  );

  const retry = useCallback(
    (localId: string) => {
      const item = items.find((i) => i.localId === localId);
      if (!item) return;
      void runUpload(localId, item.file);
    },
    [items, runUpload],
  );

  const reset = useCallback(() => {
    for (const controller of abortControllersRef.current.values()) {
      controller.abort();
    }
    abortControllersRef.current.clear();

    setItems((prev) => {
      for (const item of prev) revokePreview(item);
      return [];
    });
  }, [revokePreview]);

  const isAnyUploading = items.some(
    (i) => i.status === 'queued' || i.status === 'uploading',
  );

  const readyServerIds = items
    .filter((i) => i.status === 'uploaded' && i.serverId)
    .map((i) => i.serverId as string);

  useEffect(() => () => reset(), [channelId, reset]);

  return {
    items,
    addFiles,
    remove,
    retry,
    reset,
    isAnyUploading,
    readyServerIds,
  };
}
