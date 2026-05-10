import { config } from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: join(monorepoRoot, '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
