import axios from 'axios';
import { api } from '@/lib/api';

export type PresignResponse = {
  attachmentId: string;
  uploadUrl: string;
  key: string;
};

export async function fetchPresign(
  payload: {
    channelId: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
  },
  ctx?: { signal?: AbortSignal },
): Promise<PresignResponse> {
  const { data } = await api.post<PresignResponse>(
    '/attachments/presign',
    payload,
    { signal: ctx?.signal },
  );
  return data;
}

/** Direct PUT to R2 — must not use the shared api instance (no auth cookies). */
export async function putToR2(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    withCredentials: false,
    onUploadProgress: (event) => {
      if (!event.total) return;
      onProgress?.(event.loaded / event.total);
    },
    signal,
  });
}
