import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Redis } from '@upstash/redis';

const PRESIGN_LIMIT_PER_MINUTE = 60;

@Injectable()
export class AttachmentsRateLimitService {
  private readonly logger = new Logger(AttachmentsRateLimitService.name);
  private readonly redis: Redis | null;

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    this.redis = url && token ? new Redis({ url, token }) : null;

    if (!this.redis) {
      this.logger.debug(
        'Presign rate limiting disabled (UPSTASH_REDIS_REST_URL/TOKEN not set)',
      );
    }
  }

  async assertWithinLimit(userId: string): Promise<void> {
    if (!this.redis) return;

    const minute = Math.floor(Date.now() / 60_000);
    const key = `attachments-presign:${userId}:${minute}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 60);
    }

    if (count > PRESIGN_LIMIT_PER_MINUTE) {
      throw new HttpException(
        'Too many upload requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
