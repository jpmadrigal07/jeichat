// This runs outside of the NestJS application
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file for drizzle-kit CLI
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './src/database/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      'postgresql://localhost:5432/jeichat',
  },
});
