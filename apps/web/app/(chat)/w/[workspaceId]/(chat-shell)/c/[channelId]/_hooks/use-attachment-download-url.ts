'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAttachmentDownloadUrl } from '../_libs/messages';

export function attachmentDownloadQueryKey(attachmentId: string) {
  return ['attachment-download', attachmentId] as const;
}

export function useAttachmentDownloadUrl(
  attachmentId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: attachmentDownloadQueryKey(attachmentId),
    queryFn: ({ signal }) =>
      fetchAttachmentDownloadUrl(attachmentId, { signal }),
    enabled: enabled && !!attachmentId,
    staleTime: 5 * 60 * 1000,
  });
}
