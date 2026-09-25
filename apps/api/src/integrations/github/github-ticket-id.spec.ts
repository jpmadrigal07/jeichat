import {
  extractTicketNumbers,
  formatSuggestedBranchName,
  resolvePullRequestAutomation,
  resolvePushAutomation,
} from './github-ticket-id';

describe('github-ticket-id', () => {
  it('extracts ticket numbers case-insensitively', () => {
    expect(extractTicketNumbers('feature/ENG-42-login', 'ENG')).toEqual([42]);
    expect(extractTicketNumbers('feat/GEN-14-test-github-auto', 'GEN')).toEqual([
      14,
    ]);
    expect(extractTicketNumbers('eng-7 and ENG-7', 'eng')).toEqual([7]);
    expect(extractTicketNumbers('no-id-here', 'ENG')).toEqual([]);
  });

  it('formats branch names', () => {
    expect(formatSuggestedBranchName('eng', 12, 'Fix Login!')).toBe(
      'ENG-12-fix-login',
    );
  });

  it('maps pull request events to statuses', () => {
    expect(resolvePullRequestAutomation('opened', false, false)).toBe(
      'in_review',
    );
    expect(resolvePullRequestAutomation('reopened', false, false)).toBe(
      'in_review',
    );
    expect(resolvePullRequestAutomation('synchronize', false, false)).toBe(
      'in_review',
    );
    expect(resolvePullRequestAutomation('opened', false, true)).toBeNull();
    expect(resolvePullRequestAutomation('closed', true, false)).toBe('done');
    expect(resolvePullRequestAutomation('closed', false, false)).toBeNull();
  });

  it('maps push events to in_progress', () => {
    expect(resolvePushAutomation()).toBe('in_progress');
  });
});
