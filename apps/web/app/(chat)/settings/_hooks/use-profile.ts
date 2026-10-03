'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { updateProfileName, uploadProfilePhoto } from '../_libs/profile';
import { workspacesQueryKey } from '../../_libs/workspaces';

export function useUpdateProfileName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfileName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadProfilePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const { error } = await authClient.changePassword({
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        throw new Error(error.message ?? 'Could not change password');
      }
    },
  });
}
