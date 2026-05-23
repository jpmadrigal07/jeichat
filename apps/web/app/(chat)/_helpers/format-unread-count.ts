export function formatUnreadCount(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? '9+' : String(count);
}
