import { api } from '@/lib/api';
import { ApiError, isApiError, parseNestErrorBody } from '@/lib/api-error';

const ZIP_TIMEOUT_MS = 120_000;

export async function fetchExportMarkdown(
  channelId: string,
  from?: string,
  to?: string,
  ctx?: { signal?: AbortSignal },
): Promise<string> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const { data } = await api.get<string>(
    `/channels/${channelId}/export`,
    { params, signal: ctx?.signal, responseType: 'text' },
  );
  return data;
}

export async function fetchExportZip(
  channelId: string,
  from: string,
  to: string,
  ctx?: { signal?: AbortSignal },
): Promise<{ blob: Blob; filename: string }> {
  try {
    const response = await api.get<Blob>(
      `/channels/${channelId}/export/zip`,
      {
        params: { from, to },
        signal: ctx?.signal,
        responseType: 'blob',
        timeout: ZIP_TIMEOUT_MS,
        maxContentLength: Infinity,
        headers: { Accept: 'application/zip' },
      },
    );

    return {
      blob: response.data,
      filename:
        filenameFromDisposition(response.headers['content-disposition']) ??
        'export.zip',
    };
  } catch (error) {
    throw await apiErrorFromZipFailure(error);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function filenameFromDisposition(header: string | undefined): string | null {
  if (!header) return null;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return utf[1];
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;]+)/i.exec(header);
  return plain?.[1]?.trim() ?? null;
}

async function apiErrorFromZipFailure(error: unknown): Promise<ApiError> {
  if (!isApiError(error) || !(error.body instanceof Blob)) {
    return isApiError(error)
      ? error
      : new ApiError({
          message:
            error instanceof Error ? error.message : 'Failed to export zip',
          cause: error,
        });
  }

  const text = await error.body.text();
  try {
    const parsed = parseNestErrorBody(JSON.parse(text) as unknown);
    if (parsed) {
      return new ApiError({
        message: parsed.message,
        statusCode: parsed.statusCode ?? error.statusCode,
        nestError: parsed.nestError,
        cause: error,
      });
    }
  } catch {
    // Body was not Nest JSON; fall through to raw text.
  }

  if (text.trim()) {
    return new ApiError({
      message: text.trim(),
      statusCode: error.statusCode,
      cause: error,
    });
  }

  return error;
}
