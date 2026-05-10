import { existsSync } from 'node:fs';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Prefer repo-root `.env` when the process cwd is `apps/api` (turbo, nest, tests).
// When cwd is the monorepo root, use `./.env`.
const rootEnvFromApiCwd = resolve(process.cwd(), '../../.env');
const rootEnvFromMonorepoCwd = resolve(process.cwd(), '.env');

const envPath = existsSync(rootEnvFromApiCwd)
  ? rootEnvFromApiCwd
  : rootEnvFromMonorepoCwd;

config({ path: envPath });
