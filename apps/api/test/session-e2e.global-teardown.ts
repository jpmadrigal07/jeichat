import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { sessionE2eMetaPath, type SessionE2eMeta } from './helpers/session-e2e-meta';

export default async function globalTeardown() {
  const path = sessionE2eMetaPath();
  if (!existsSync(path)) return;

  try {
    const meta = JSON.parse(readFileSync(path, 'utf8')) as SessionE2eMeta;
    if (meta.pid) {
      try {
        process.kill(meta.pid, 'SIGTERM');
      } catch {
        // process already gone
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        process.kill(meta.pid, 'SIGKILL');
      } catch {
        // already gone
      }
    }
  } finally {
    try {
      unlinkSync(path);
    } catch {
      // ignore
    }
  }
}
