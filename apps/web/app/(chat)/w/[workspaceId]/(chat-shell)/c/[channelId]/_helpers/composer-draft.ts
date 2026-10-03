const COMPOSER_DRAFT_STORAGE_PREFIX = 'jeichat:composer-draft:v1:';

function composerDraftKey(channelId: string) {
  return `${COMPOSER_DRAFT_STORAGE_PREFIX}${channelId}`;
}

export function readComposerDraft(channelId: string): string {
  try {
    return localStorage.getItem(composerDraftKey(channelId)) ?? '';
  } catch {
    return '';
  }
}

/** Empty / whitespace-only drafts remove the key so storage doesn't accumulate. */
export function writeComposerDraft(channelId: string, value: string) {
  try {
    const key = composerDraftKey(channelId);
    if (value.trim()) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
}
