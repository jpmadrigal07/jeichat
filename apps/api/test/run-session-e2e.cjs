#!/usr/bin/env node
/**
 * Skip session e2e locally when TEST_DATABASE_URL is unset.
 * Fail hard in CI so Turbo cannot report a silent green skip.
 */
const ci = process.env.CI === 'true';
const url = process.env.TEST_DATABASE_URL?.trim();

if (!url) {
  if (ci) {
    console.error(
      'TEST_DATABASE_URL is required when CI=true (session e2e cannot skip).',
    );
    process.exit(1);
  }
  console.warn(
    'Skipping session e2e: TEST_DATABASE_URL is unset. Create database jeichat_test and export TEST_DATABASE_URL to run it.',
  );
  process.exit(0);
}

const { spawnSync } = require('node:child_process');
const result = spawnSync(
  'bunx',
  ['jest', '--config', './test/jest-session-e2e.json', '--runInBand', ...process.argv.slice(2)],
  { stdio: 'inherit', cwd: require('node:path').join(__dirname, '..'), env: process.env },
);
process.exit(result.status ?? 1);
