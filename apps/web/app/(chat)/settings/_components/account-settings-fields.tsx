'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Camera, Loader2, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { personInitials } from '../../_helpers/ticket-fields';
import {
  useChangePassword,
  useUpdateProfileName,
  useUploadProfilePhoto,
} from '../_hooks/use-profile';
import { AVATAR_ACCEPT_ATTR } from '../_libs/profile';

export type ProfileUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

const MIN_PASSWORD_LENGTH = 8;

export function ProfileIdentityFields({ user }: { user: ProfileUser }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const updateName = useUpdateProfileName();
  const uploadPhoto = useUploadProfilePhoto();

  function handleSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(
      new FormData(event.currentTarget).get('name') ?? '',
    ).trim();
    if (!name || name === user.name) return;
    updateName.mutate(name, {
      onSuccess: async (data) => {
        await authClient.updateUser({
          name: data.name,
          image: data.image ?? undefined,
        });
        toast.success('Name updated');
        router.refresh();
      },
    });
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    uploadPhoto.mutate(file, {
      onSuccess: async (data) => {
        await authClient.updateUser({
          name: data.name,
          image: data.image ?? undefined,
        });
        toast.success('Photo updated');
        router.refresh();
      },
    });
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Display photo</FieldLabel>
        <div className="flex items-center gap-3">
          <Avatar className="size-16">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="text-lg">
              {personInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <input
            ref={fileRef}
            type="file"
            accept={AVATAR_ACCEPT_ATTR}
            className="sr-only"
            onChange={handlePhotoChange}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploadPhoto.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {uploadPhoto.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Camera data-icon="inline-start" />
            )}
            {uploadPhoto.isPending ? 'Uploading…' : 'Change photo'}
          </Button>
        </div>
        <FieldDescription>JPG, PNG, GIF, or WebP. Max 2 MB.</FieldDescription>
      </Field>

      <form onSubmit={handleSaveName}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="profile-name">Name</FieldLabel>
            <Input
              id="profile-name"
              name="name"
              defaultValue={user.name}
              maxLength={80}
              autoComplete="name"
              required
            />
            <FieldDescription>
              Shown in chat, tickets, and mentions.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-email">Email</FieldLabel>
            <Input
              id="profile-email"
              defaultValue={user.email}
              readOnly
              disabled
            />
          </Field>
          <Button
            type="submit"
            disabled={updateName.isPending}
            className="self-start"
          >
            {updateName.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : null}
            Save name
          </Button>
        </FieldGroup>
      </form>
    </FieldGroup>
  );
}

export function ChangePasswordForm() {
  const changePassword = useChangePassword();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get('currentPassword') ?? '');
    const newPassword = String(data.get('newPassword') ?? '');
    const confirmPassword = String(data.get('confirmPassword') ?? '');

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('New password must be different from the current one');
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset();
          toast.success('Password updated');
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldSet>
        <FieldLegend>Password</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">
              Confirm new password
            </FieldLabel>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            <FieldDescription>
              At least {MIN_PASSWORD_LENGTH} characters. Other devices will be
              signed out.
            </FieldDescription>
          </Field>
          <Button
            type="submit"
            disabled={changePassword.isPending}
            className="self-start"
          >
            {changePassword.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : null}
            Update password
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/');
  }

  return (
    <Button
      type="button"
      variant="destructive"
      className="self-start"
      onClick={handleSignOut}
    >
      <LogOut data-icon="inline-start" />
      Log out
    </Button>
  );
}
