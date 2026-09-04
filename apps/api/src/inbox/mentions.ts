export type MentionableMember = {
  userId: string;
  name: string;
  email: string;
};

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

function hasMentionToken(text: string, needle: string) {
  let from = 0;
  while (from < text.length) {
    const index = text.indexOf(needle, from);
    if (index === -1) return false;
    const after = text[index + needle.length];
    if (!after || /[\s.,!?;:)'"]/.test(after)) return true;
    from = index + 1;
  }
  return false;
}

export function mentionedUserIds(
  content: string,
  members: MentionableMember[],
  actorId: string,
): string[] {
  const text = content.toLowerCase();
  const ids: string[] = [];

  for (const member of members) {
    if (member.userId === actorId) continue;
    if (mentionNeedles(member, members).some((needle) => hasMentionToken(text, needle))) {
      ids.push(member.userId);
    }
  }

  return ids;
}
