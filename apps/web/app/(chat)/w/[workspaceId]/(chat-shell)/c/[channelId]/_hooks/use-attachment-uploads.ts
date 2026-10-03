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
import {
  loadDraftAttachments,
  saveDraftAttachments,
  type DraftAttachmentRecord,
} from '../_libs/draft-attachments';

export type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'error';

export type PendingAttachment = {
  localId: string;
  file: File;
  previewUrl: string | null;
  status: UploadStatus;
  progress: number;
  serverId: string | null;
  error: string | null;
  uploadedAt?: number;
  insertMarkdownOnComplete?: boolean;
};

/**
 * The API sweeps unsent attachments after 1h, so a restored draft re-uploads
 * anything older than this rather than sending an id that may be gone.
 */
const DRAFT_SERVER_ID_MAX_AGE_MS = 45 * 60 * 1000;

/** Changes only when the persisted shape changes — not on progress ticks. */
function draftSignature(items: PendingAttachment[]) {
  return items
    .map((item) => `${item.localId}:${item.uploadedAt ? item.serverId : ''}`)
    .join('|');
}

function toDraftRecord(item: PendingAttachment): DraftAttachmentRecord {
  return {
    localId: item.localId,
    file: item.file,
    serverId: item.uploadedAt ? item.serverId : null,
    uploadedAt: item.uploadedAt ?? null,
  };
}

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
  options?: {
    onUploaded?: (attachmentId: string) => void;
    onFileUploaded?: (attachmentId: string, file: File) => void;
    /** Keep un-sent attachments in IndexedDB so they survive navigation. */
    persistDraft?: boolean;
  },
) {
  const persistDraft = options?.persistDraft ?? false;
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const abortControllersRef = useRef(new Map<string, AbortController>());
  const onUploadedRef = useRef(options?.onUploaded);
  onUploadedRef.current = options?.onUploaded;
  const onFileUploadedRef = useRef(options?.onFileUploaded);
  onFileUploadedRef.current = options?.onFileUploaded;

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
        uploadedAt: undefined,
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

        const pending = itemsRef.current.find((item) => item.localId === localId);
        updateItem(localId, {
          status: 'uploaded',
          progress: 1,
          uploadedAt: Date.now(),
        });
        onUploadedRef.current?.(presign.attachmentId);
        if (pending?.insertMarkdownOnComplete) {
          onFileUploadedRef.current?.(presign.attachmentId, file);
        }
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
    (
      files: File[],
      alreadyAttached?: AttachmentKindCounts,
      options?: { insertMarkdownOnComplete?: boolean },
    ) => {
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
        insertMarkdownOnComplete: options?.insertMarkdownOnComplete,
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

  // Channel whose draft has been restored; saving before that would overwrite
  // the stored draft with the empty initial state.
  const hydratedChannelRef = useRef<string | null>(null);
  const savedSignatureRef = useRef('');

  useEffect(() => {
    hydratedChannelRef.current = null;
    if (!persistDraft || !channelId) return;
    let cancelled = false;
    void loadDraftAttachments(channelId).then((records) => {
      if (cancelled) return;
      const now = Date.now();
      const restored: PendingAttachment[] = records.map((record) => {
        const fresh =
          record.serverId !== null &&
          record.uploadedAt !== null &&
          now - record.uploadedAt < DRAFT_SERVER_ID_MAX_AGE_MS;
        return {
          localId: record.localId,
          file: record.file,
          previewUrl: isImageFile(record.file)
            ? URL.createObjectURL(record.file)
            : null,
          status: fresh ? 'uploaded' : 'queued',
          progress: fresh ? 1 : 0,
          serverId: fresh ? record.serverId : null,
          error: null,
          uploadedAt: fresh ? (record.uploadedAt ?? undefined) : undefined,
        };
      });
      const existingIds = new Set(itemsRef.current.map((i) => i.localId));
      const added = restored.filter((item) => !existingIds.has(item.localId));
      savedSignatureRef.current = draftSignature(restored);
      hydratedChannelRef.current = channelId;
      // Always set so files added while loading get saved alongside.
      setItems((current) => [...added, ...current]);
      for (const item of added) {
        if (item.status === 'queued') void runUpload(item.localId, item.file);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [channelId, persistDraft, runUpload]);

  useEffect(() => {
    if (!persistDraft || hydratedChannelRef.current !== channelId) return;
    const signature = draftSignature(items);
    if (signature === savedSignatureRef.current) return;
    savedSignatureRef.current = signature;
    void saveDraftAttachments(channelId, items.map(toDraftRecord));
  }, [channelId, items, persistDraft]);

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
