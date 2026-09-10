/**
 * Stable, cookie-gated file URL (Slack-style).
 * Optional `NEXT_PUBLIC_FILES_URL` is for a later files CDN; default is the API origin.
 */
export function attachmentFileUrl(
  attachmentId: string,
  options?: { download?: boolean },
): string {
  const base = (
    process.env.NEXT_PUBLIC_FILES_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    ''
  ).replace(/\/+$/, '');
  const path = `/attachments/${encodeURIComponent(attachmentId)}`;
  if (options?.download) {
    return `${base}${path}?download=1`;
  }
  return `${base}${path}`;
}
