export const AVATAR_MIME_ALLOWLIST: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const AVATAR_FILE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|gif|webp)$/i;

export function extensionForAvatarType(contentType: string): string | null {
  return AVATAR_MIME_ALLOWLIST[contentType.toLowerCase()] ?? null;
}

export function buildAvatarKey(
  userId: string,
  ext: string,
): { id: string; key: string; file: string } {
  const id = crypto.randomUUID();
  const file = `${id}.${ext}`;
  return { id, file, key: `avatars/${userId}/${file}` };
}

export function isAvatarFileName(file: string): boolean {
  return AVATAR_FILE_RE.test(file);
}

export function avatarStorageKey(userId: string, file: string): string {
  return `avatars/${userId}/${file}`;
}

export function avatarPublicPath(userId: string, file: string): string {
  return `/users/${userId}/avatar/${file}`;
}

export function parseOwnedAvatarFile(
  image: string | null | undefined,
  userId: string,
): string | null {
  if (!image) return null;
  const marker = `/users/${userId}/avatar/`;
  const index = image.lastIndexOf(marker);
  if (index === -1) return null;
  const file = image.slice(index + marker.length).split('?')[0];
  if (!file || !isAvatarFileName(file)) return null;
  return file;
}
