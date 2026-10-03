import { describe, expect, it } from 'vitest';
import { buildDocumentTitle, parseDocumentTitleRoute } from './document-title';

describe('search page title', () => {
  it('recognises the workspace search route', () => {
    expect(parseDocumentTitleRoute('/w/ws1/search')).toEqual({
      kind: 'search',
      workspaceId: 'ws1',
    });
  });

  it('titles it after the workspace', () => {
    expect(
      buildDocumentTitle({
        route: { kind: 'search', workspaceId: 'ws1' },
        workspaceName: 'Koobo',
        unreadCount: 0,
      }),
    ).toBe('Search | Koobo | JeiChat');
  });
});
