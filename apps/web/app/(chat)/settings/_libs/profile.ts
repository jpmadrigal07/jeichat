import { api } from "@/lib/api";
import { uploadAvatar } from "@chat/_libs/avatar-upload";

export type ProfileUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export async function updateProfileName(name: string): Promise<ProfileUser> {
  const { data } = await api.patch<ProfileUser>("/users/me", { name });
  return data;
}

export function uploadProfilePhoto(file: File): Promise<ProfileUser> {
  return uploadAvatar<ProfileUser>("/users/me/avatar", file);
}
