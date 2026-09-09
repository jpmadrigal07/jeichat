'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  countAttachmentKinds,
  formatBytes,
  isImageFile,
  MAX_ATTACHMENT_BYTES,
  MAX_DOCUMENT_ATTACHMENTS,
  MAX_IMAGE_ATTACHMENTS,
  mimeTypeForFile,
  validateFiles,
  type AttachmentKindCounts,
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
  const tooManyImages = byKind.get('too-many-images');
  const tooManyDocuments = byKind.get('too-many-documents');

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
  if (tooManyImages?.length) {
    toast.error(`Max ${MAX_IMAGE_ATTACHMENTS} images`);
  }
  if (tooManyDocuments?.length) {
    toast.error(`Max ${MAX_DOCUMENT_ATTACHMENTS} documents`);
  }
}

function uploadErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === 'Network Error') {
      return 'Upload blocked — check R2 bucket CORS allows PUT from this site';
    }
    return err.message;
  }
  return 'Upload failed';
}

export function useAttachmentUploads(
  channelId: string,
  options?: { onUploaded?: (attachmentId: string) => void },
) {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const abortControllersRef = useRef(new Map<string, AbortController>());
  const onUploadedRef = useRef(options?.onUploaded);
  onUploadedRef.current = options?.onUploaded;

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
        const contentType = mimeTypeForFile(file);
        const presign = await fetchPresign(
          {
            channelId,
            filename: file.name,
            contentType,
            sizeBytes: file.size,
          },
          { signal: controller.signal },
        );

        updateItem(localId, { serverId: presign.attachmentId });

        await putToR2(
          presign.uploadUrl,
          file,
          contentType,
          (progress) => updateItem(localId, { progress }),
          controller.signal,
        );

        updateItem(localId, { status: 'uploaded', progress: 1 });
        onUploadedRef.current?.(presign.attachmentId);
      } catch (err) {
        if (controller.signal.aborted) return;
        updateItem(localId, {
          status: 'error',
          error: uploadErrorMessage(err),
        });
      } finally {
        abortControllersRef.current.delete(localId);
      }
    },
    [channelId, updateItem],
  );

  const addFiles = useCallback(
    (files: File[], alreadyAttached?: AttachmentKindCounts) => {
      if (!files.length) return;

      const pending = countAttachmentKinds(
        itemsRef.current.map((item) => item.file),
      );
      const { accepted, rejected } = validateFiles(files, {
        images: pending.images + (alreadyAttached?.images ?? 0),
        documents: pending.documents + (alreadyAttached?.documents ?? 0),
      });
      toastRejections(rejected);
      if (!accepted.length) return;

      const newItems: PendingAttachment[] = accepted.map((file) => ({
        localId: crypto.randomUUID(),
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
        status: 'queued' as const,
        progress: 0,
        serverId: null,
        error: null,
      }));

      setItems((current) => [...current, ...newItems]);

      for (const item of newItems) {
        void runUpload(item.localId, item.file);
      }
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

  const removeByServerId = useCallback(
    (serverId: string) => {
      const item = itemsRef.current.find((i) => i.serverId === serverId);
      if (item) remove(item.localId);
    },
    [remove],
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
    removeByServerId,
    retry,
    reset,
    isAnyUploading,
    readyServerIds,
  };
}
