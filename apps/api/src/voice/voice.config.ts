import { Logger } from '@nestjs/common';

const logger = new Logger('VoiceConfig');

export type VoiceConfig = {
  /** WebSocket URL browsers connect to (LiveKit Cloud `wss://…livekit.cloud` or a self-hosted server). */
  serverUrl: string;
  /** HTTP(S) URL the API uses for the LiveKit server API; differs from `serverUrl` when self-hosted on a private network. */
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  /** Prepended to channel IDs so several environments can share one LiveKit project. */
  roomPrefix: string;
  tokenTtlSeconds: number;
};

export const VOICE_CONFIG = Symbol('VOICE_CONFIG');

/** `ws://` → `http://`, `wss://` → `https://`; anything else is returned as is. */
function toHttpUrl(url: string): string {
  return url.replace(/^ws(s?):\/\//, 'http$1://');
}

/**
 * Voice is optional: without LiveKit credentials the API still boots and the
 * voice endpoints answer 503, so local dev doesn't need a LiveKit project.
 */
export function loadVoiceConfig(): VoiceConfig | null {
  const serverUrl = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!serverUrl || !apiKey || !apiSecret) {
    logger.warn(
      'LiveKit is not configured (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET); voice channels are disabled.',
    );
    return null;
  }

  const ttl = Number.parseInt(process.env.LIVEKIT_TOKEN_TTL_SECONDS ?? '', 10);

  return {
    serverUrl,
    apiUrl: toHttpUrl(process.env.LIVEKIT_API_URL?.trim() || serverUrl),
    apiKey,
    apiSecret,
    roomPrefix: process.env.LIVEKIT_ROOM_PREFIX?.trim() ?? '',
    tokenTtlSeconds: Number.isFinite(ttl) && ttl > 0 ? ttl : 600,
  };
}
