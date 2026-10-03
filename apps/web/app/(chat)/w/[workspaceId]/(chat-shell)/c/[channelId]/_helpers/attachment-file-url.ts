/**
 * Stable, cookie-gated file URL (Slack-style).
 * Optional `NEXT_PUBLIC_FILES_URL` is for a later files CDN; default is the API origin.
 *
 * Use `||` (not `??`): Docker/Coolify bake `NEXT_PUBLIC_FILES_URL=` as `""`, and
 * empty string is not nullish — relative `/attachments/:id` then 404s on the web host.
 */
function publicOrigin(...candidates: Array<string | undefined>): string {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed.replace(/\/+$/, '');
  }
  return '';
}

export function attachmentFileUrl(
  attachmentId: string,
  options?: { download?: boolean },
): string {
  const base = publicOrigin(
    process.env.NEXT_PUBLIC_FILES_URL,
    process.env.NEXT_PUBLIC_API_URL,
  );
  const path = `/attachments/${encodeURIComponent(attachmentId)}`;
  if (options?.download) {
    return `${base}${path}?download=1`;
  }
  return `${base}${path}`;
}
