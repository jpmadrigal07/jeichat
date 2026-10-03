export function formatUnreadCount(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? '9+' : String(count);
}

export function sumUnreadCounts(
  counts: Record<string, number> | undefined,
): number {
  if (!counts) return 0;
  return Object.values(counts).reduce((total, count) => total + count, 0);
}
