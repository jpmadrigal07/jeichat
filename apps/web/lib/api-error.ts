import { type AxiosError, CanceledError, isAxiosError } from 'axios';

/**
 * Normalized client error for Nest-style JSON bodies and Axios failures.
 * Thrown from the shared Axios instance after failed requests (including HTTP 4xx/5xx).
 */
export class ApiError extends Error {
  /** HTTP status when the server responded (omit for network / DNS / no response). */
  readonly statusCode?: number;
  /** Nest's `error` field when present (e.g. "Bad Request"). */
  readonly nestError?: string;
  /** Raw response body when JSON parsing was possible; useful for debugging. */
  readonly body?: unknown;
  /** True when the request was aborted (React Query signal or manual abort). */
  readonly isCancelled: boolean;

  constructor(options: {
    message: string;
    statusCode?: number;
    nestError?: string;
    body?: unknown;
    isCancelled?: boolean;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiError';
    this.statusCode = options.statusCode;
    this.nestError = options.nestError;
    this.body = options.body;
    this.isCancelled = options.isCancelled ?? false;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

function flattenNestMessage(message: unknown): string | undefined {
  if (typeof message === 'string') return message;
  if (Array.isArray(message))
    return message.filter((m) => typeof m === 'string').join('; ');
  return undefined;
}

/**
 * Best-effort parse of Nest's default exception JSON:
 * `{ statusCode, message: string | string[], error?: string }`.
 */
export function parseNestErrorBody(data: unknown): {
  statusCode?: number;
  message: string;
  nestError?: string;
} | null {
  if (data === null || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const hasNestShape =
    'statusCode' in o || 'message' in o || 'error' in o;
  if (!hasNestShape) return null;

  const statusCode =
    typeof o.statusCode === 'number' ? o.statusCode : undefined;
  const nestError = typeof o.error === 'string' ? o.error : undefined;
  const flat = flattenNestMessage(o.message);

  const message = flat ?? nestError ?? 'Request failed';

  return { statusCode, message, nestError };
}

function isAbortLike(error: unknown): boolean {
  if (error instanceof CanceledError) return true;
  if (isAxiosError(error) && error.code === 'ERR_CANCELED') return true;
  return false;
}

/**
 * Map any Axios failure (including HTTP errors and cancellation) to {@link ApiError}.
 */
export function axiosErrorToApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAbortLike(error)) {
    return new ApiError({
      message: 'Request cancelled',
      isCancelled: true,
      cause: error,
    });
  }

  if (!isAxiosError(error)) {
    return new ApiError({
      message:
        error instanceof Error ? error.message : 'Could not reach the API.',
      cause: error,
    });
  }

  const ax = error as AxiosError<unknown>;
  const status = ax.response?.status;
  const data = ax.response?.data;

  const parsed = parseNestErrorBody(data);
  if (parsed) {
    return new ApiError({
      message: parsed.message,
      statusCode: parsed.statusCode ?? status,
      nestError: parsed.nestError,
      body: data,
      cause: error,
    });
  }

  if (typeof data === 'string') {
    return new ApiError({
      message: data.trim() || ax.message,
      statusCode: status,
      body: data,
      cause: error,
    });
  }

  const fallback =
    status !== undefined
      ? `${ax.message} (${status})`
      : `${ax.message} (${ax.code ?? 'no response'})`;

  const detail =
    data != null && typeof data === 'object'
      ? ` ${JSON.stringify(data)}`
      : data != null
        ? ` ${String(data)}`
        : '';

  return new ApiError({
    message: `${fallback}${detail}`.trim(),
    statusCode: status,
    body: data,
    cause: error,
  });
}
