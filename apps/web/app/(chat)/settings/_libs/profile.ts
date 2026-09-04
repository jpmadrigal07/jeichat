import axios from 'axios';
import { api } from '@/lib/api';

export const AVATAR_ACCEPT_ATTR =
  'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type ProfileUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function updateProfileName(name: string): Promise<ProfileUser> {
  const { data } = await api.patch<ProfileUser>('/users/me', { name });
  return data;
}

export async function uploadProfilePhoto(file: File): Promise<ProfileUser> {
  const contentType = file.type.toLowerCase();
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(contentType)) {
    throw new Error('Use a JPG, PNG, GIF, or WebP image');
  }
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
    throw new Error('Image must be under 2 MB');
  }
  const { data: presign } = await api.post<{
    uploadUrl: string;
    key: string;
  }>('/users/me/avatar/presign', {
    filename: file.name,
    contentType,
    sizeBytes: file.size,
  });

  await axios.put(presign.uploadUrl, file, {
    headers: { 'Content-Type': contentType },
    withCredentials: false,
  });

  const { data } = await api.post<ProfileUser>('/users/me/avatar', {
    key: presign.key,
  });
  return data;
}
