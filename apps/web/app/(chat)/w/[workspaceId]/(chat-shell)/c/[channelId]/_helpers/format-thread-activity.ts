export function formatThreadActivity(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatMessageCount(count: number): string {
  if (count <= 0) return 'No messages yet';
  return count === 1 ? '1 message' : `${count} messages`;
}
