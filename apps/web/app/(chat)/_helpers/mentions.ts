export type MentionableMember = {
  userId: string;
  name: string;
  email: string;
  image?: string | null;
};

export type MentionRange = {
  start: number;
  end: number;
};

export function activeMention(
  text: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = text.slice(0, cursor);
  const at = before.lastIndexOf('@');
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(before[at - 1] ?? '')) return null;
  const query = before.slice(at + 1);
  if (query.includes('\n') || query.length > 40) return null;
  return { start: at, query };
}

export function filterMentionMembers(
  members: MentionableMember[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return members;
  return members.filter((member) => {
    const local = member.email.split('@')[0] ?? '';
    return (
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      local.toLowerCase().includes(q)
    );
  });
}

function mentionNeedles(
  member: MentionableMember,
  members: MentionableMember[],
): string[] {
  const needles: string[] = [];
  const name = member.name.trim();
  if (name) needles.push(`@${name.toLowerCase()}`);

  const first = name.split(/\s+/).filter(Boolean)[0];
  if (first && first.length >= 2) {
    const firstLower = first.toLowerCase();
    const matches = members.filter((other) => {
      const otherFirst = other.name.trim().split(/\s+/).filter(Boolean)[0];
      return otherFirst?.toLowerCase() === firstLower;
    });
    if (matches.length === 1) needles.push(`@${firstLower}`);
  }

  const local = member.email.split('@')[0]?.trim();
  if (local && local.length >= 2) needles.push(`@${local.toLowerCase()}`);

  return [...new Set(needles)].sort((a, b) => b.length - a.length);
}

export function mentionRanges(
  content: string,
  members: MentionableMember[],
): MentionRange[] {
  const lower = content.toLowerCase();
  const ranges: MentionRange[] = [];

  for (const member of members) {
    for (const needle of mentionNeedles(member, members)) {
      let from = 0;
      while (from < lower.length) {
        const index = lower.indexOf(needle, from);
        if (index === -1) break;
        const end = index + needle.length;
        const after = lower[end];
        if (!after || /[\s.,!?;:)'"]/.test(after)) {
          ranges.push({ start: index, end });
        }
        from = index + 1;
      }
    }
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: MentionRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start < last.end) continue;
    merged.push(range);
  }
  return merged;
}

export function splitMentionContent(
  content: string,
  members: MentionableMember[],
): { text: string; mention: boolean }[] {
  const ranges = mentionRanges(content, members);
  if (ranges.length === 0) return [{ text: content, mention: false }];

  const parts: { text: string; mention: boolean }[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push({ text: content.slice(cursor, range.start), mention: false });
    }
    parts.push({ text: content.slice(range.start, range.end), mention: true });
    cursor = range.end;
  }
  if (cursor < content.length) {
    parts.push({ text: content.slice(cursor), mention: false });
  }
  return parts;
}

export function insertMention(
  text: string,
  start: number,
  cursor: number,
  name: string,
) {
  return `${text.slice(0, start)}@${name} ${text.slice(cursor)}`;
}
