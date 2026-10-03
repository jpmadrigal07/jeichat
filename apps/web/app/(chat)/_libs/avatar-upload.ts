import axios from "axios";
import { api } from "@/lib/api";

export const AVATAR_ACCEPT_ATTR =
  "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";

const AVATAR_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * Presign → direct PUT to storage → confirm. `basePath` is the avatar
 * resource, e.g. `/users/me/avatar`; the API exposes `${basePath}/presign`.
 */
export async function uploadAvatar<T>(
  basePath: string,
  file: File,
): Promise<T> {
  const contentType = file.type.toLowerCase();
  if (!AVATAR_CONTENT_TYPES.includes(contentType)) {
    throw new Error("Use a JPG, PNG, GIF, or WebP image");
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    throw new Error("Image must be under 2 MB");
  }
  const { data: presign } = await api.post<{ uploadUrl: string; key: string }>(
    `${basePath}/presign`,
    { filename: file.name, contentType, sizeBytes: file.size },
  );

  await axios.put(presign.uploadUrl, file, {
    headers: { "Content-Type": contentType },
    withCredentials: false,
  });

  const { data } = await api.post<T>(basePath, { key: presign.key });
  return data;
}
