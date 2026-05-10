import { Pool } from 'pg';

let sharedPool: Pool | null = null;
let sharedPoolKey: string | null = null;

function poolConfigKey(connectionString: string, max: number): string {
  return `${connectionString}\0${max}`;
}

/**
 * Single `pg` pool for Postgres when both Better Auth and {@link DrizzleService} run in-process.
 * Better Auth evaluates `auth` at module load time; Nest constructs {@link DrizzleService} after,
 * so the first caller (typically `auth.ts`) creates the pool and Drizzle reuses it.
 */
export function getSharedPgPool(options: {
  connectionString: string;
  max: number;
}): Pool {
  const max =
    Number.isFinite(options.max) && options.max > 0 ? options.max : 20;
  const key = poolConfigKey(options.connectionString, max);

  if (sharedPool && sharedPoolKey === key) {
    return sharedPool;
  }

  if (sharedPool) {
    void sharedPool.end();
    sharedPool = null;
    sharedPoolKey = null;
  }

  sharedPool = new Pool({
    connectionString: options.connectionString,
    max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  sharedPoolKey = key;
  return sharedPool;
}

export async function closeSharedPgPool(): Promise<void> {
  if (sharedPool) {
    await sharedPool.end();
    sharedPool = null;
    sharedPoolKey = null;
  }
}
