import { redirect } from 'next/navigation';

/** Legacy `/board` URL — the board now lives at `/b`. */
export default async function LegacyChannelBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspaceId, channelId } = await params;
  const query = await searchParams;
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      next.append(key, item);
    }
  }
  const qs = next.toString();
  const path = `/w/${workspaceId}/c/${channelId}/b`;
  redirect(qs ? `${path}?${qs}` : path);
}
