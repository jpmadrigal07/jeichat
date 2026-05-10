import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { closeSharedPgPool, getSharedPgPool } from './shared-pg-pool';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor(private configService: ConfigService) {
    const connectionString =
      this.configService.get<string>('DATABASE_URL') ||
      this.configService.get<string>('POSTGRES_URL') ||
      '';

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL or POSTGRES_URL environment variable is required',
      );
    }

    const maxRaw = this.configService.get<string>('PG_POOL_MAX');
    const max = maxRaw != null ? Number(maxRaw) : 20;

    this.pool = getSharedPgPool({
      connectionString,
      max: Number.isFinite(max) && max > 0 ? max : 20,
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleInit() {
    try {
      await this.pool.query('SELECT NOW()');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Initial PostgreSQL health check failed: ${errorMessage}. ` +
          'API will keep running and reconnect on first database use.',
      );
    }
  }

  async onModuleDestroy() {
    await closeSharedPgPool();
  }
}
