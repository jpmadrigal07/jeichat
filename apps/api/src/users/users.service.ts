import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../database/drizzle.service';
import { user } from '../database/schema/auth';
import { StorageService } from '../storage/storage.service';
import {
  MAX_AVATAR_BYTES,
  avatarPublicPath,
  avatarStorageKey,
  buildAvatarKey,
  extensionForAvatarType,
  isAvatarFileName,
  parseOwnedAvatarFile,
} from './users.helpers';

@Injectable()
export class UsersService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly storage: StorageService,
  ) {}

  async updateName(userId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Name is required');
    if (trimmed.length > 80) {
      throw new BadRequestException('Name must be at most 80 characters');
    }

    const [updated] = await this.drizzle.db
      .update(user)
      .set({ name: trimmed, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      });

    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async presignAvatar(
    userId: string,
    payload: { filename: string; contentType: string; sizeBytes: number },
  ) {
    const ext = extensionForAvatarType(payload.contentType);
    if (!ext) throw new BadRequestException('Use a JPG, PNG, GIF, or WebP image');

    if (payload.sizeBytes <= 0 || payload.sizeBytes > MAX_AVATAR_BYTES) {
      throw new BadRequestException(
        `Image must be under ${Math.floor(MAX_AVATAR_BYTES / (1024 * 1024))} MB`,
      );
    }

    const { key, file } = buildAvatarKey(userId, ext);
    const uploadUrl = await this.storage.presignUpload(
      key,
      payload.contentType,
      MAX_AVATAR_BYTES,
    );

    return { uploadUrl, key, file };
  }

  async completeAvatar(userId: string, key: string) {
    const expectedPrefix = `avatars/${userId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid avatar key');
    }
    const file = key.slice(expectedPrefix.length);
    if (!isAvatarFileName(file)) {
      throw new BadRequestException('Invalid avatar key');
    }

    const head = await this.storage.head(key);
    if (!head) throw new BadRequestException('Upload not found in storage');

    const [existing] = await this.drizzle.db
      .select({ image: user.image })
      .from(user)
      .where(eq(user.id, userId));

    if (!existing) throw new NotFoundException('User not found');

    const image = this.publicAvatarUrl(userId, file);
    const [updated] = await this.drizzle.db
      .update(user)
      .set({ image, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      });

    const previousFile = parseOwnedAvatarFile(existing.image, userId);
    if (previousFile && previousFile !== file) {
      await this.storage
        .delete(avatarStorageKey(userId, previousFile))
        .catch(() => undefined);
    }

    return updated;
  }

  async getAvatarObject(userId: string, file: string) {
    if (!isAvatarFileName(file)) throw new NotFoundException();
    const key = avatarStorageKey(userId, file);
    const object = await this.storage.getObject(key);
    if (!object) throw new NotFoundException();
    return object;
  }

  private publicAvatarUrl(userId: string, file: string): string {
    const base = (
      process.env.BETTER_AUTH_URL ??
      `http://localhost:${process.env.PORT ?? 3001}`
    ).replace(/\/+$/, '');
    return `${base}${avatarPublicPath(userId, file)}`;
  }
}
