import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors the `paths` in tsconfig.json so tests can import app modules.
    alias: {
      '@chat': fromRoot('./app/(chat)'),
      '@': fromRoot('./'),
    },
  },
  test: {
    environment: 'node',
    passWithNoTests: true,
  },
});
