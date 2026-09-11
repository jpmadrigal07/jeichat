export const DEFAULT_WORKSPACE_CREATOR_EMAILS = [
  'jp.madrigal07@gmail.com',
] as const;

export function parseWorkspaceCreatorEmails(
  raw: string | undefined = process.env.NEXT_PUBLIC_WORKSPACE_CREATOR_EMAILS ??
    process.env.WORKSPACE_CREATOR_EMAILS,
): Set<string> {
  const source = raw?.trim()
    ? raw.split(',')
    : DEFAULT_WORKSPACE_CREATOR_EMAILS;
  return new Set(
    [...source].map((email) => email.trim().toLowerCase()).filter(Boolean),
  );
}

export function canCreateWorkspace(
  email: string | null | undefined,
  allowlist = parseWorkspaceCreatorEmails(),
): boolean {
  if (!email?.trim()) return false;
  return allowlist.has(email.trim().toLowerCase());
}
