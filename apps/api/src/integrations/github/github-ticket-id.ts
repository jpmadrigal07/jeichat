import type { TicketStatus } from '../../channels/ticket-fields';

const KEY_ESCAPE = /[.*+?^${}()|[\]\\]/g;

export function ticketIdPattern(ticketKey: string): RegExp {
  const escaped = ticketKey.trim().replace(KEY_ESCAPE, '\\$&');
  return new RegExp(`\\b${escaped}-(\\d+)\\b`, 'gi');
}

export function extractTicketNumbers(
  text: string,
  ticketKey: string,
): number[] {
  const key = ticketKey.trim();
  if (!key || !text) return [];

  const pattern = ticketIdPattern(key);
  const found = new Set<number>();
  for (const match of text.matchAll(pattern)) {
    const num = Number(match[1]);
    if (Number.isInteger(num) && num > 0) {
      found.add(num);
    }
  }
  return [...found];
}

export function formatSuggestedBranchName(
  ticketKey: string,
  ticketNumber: number,
  slug: string,
): string {
  const key = ticketKey.trim().toUpperCase();
  const safeSlug =
    slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'work';
  return `${key}-${ticketNumber}-${safeSlug}`;
}

export type GithubAutomationTarget = {
  ticketNumber: number;
  status: TicketStatus;
};

export function resolvePullRequestAutomation(
  action: string,
  merged: boolean,
  draft: boolean,
): TicketStatus | null {
  if (action === 'opened' && !draft) return 'in_review';
  if (action === 'ready_for_review') return 'in_review';
  if (action === 'closed') {
    if (merged) return 'done';
    return null;
  }
  return null;
}

export function resolvePushAutomation(): TicketStatus {
  return 'in_progress';
}
