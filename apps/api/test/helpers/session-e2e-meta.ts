import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type SessionE2eMeta = {
  baseUrl: string;
  origin: string;
  port: number;
  pid: number;
  runId: string;
  creatorEmails: string[];
};

export function sessionE2eMetaPath(): string {
  return join(tmpdir(), 'jeichat-session-e2e.json');
}
