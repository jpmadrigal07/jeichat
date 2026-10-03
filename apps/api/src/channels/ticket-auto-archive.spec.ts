import {
  completedAtAfterArchiveChange,
  DEFAULT_DONE_TICKET_ARCHIVE_AFTER_DAYS,
  doneTicketArchiveCutoff,
  isDoneTicketAutoArchiveEnabled,
  nextCompletedAt,
  parseDoneTicketArchiveAfterDays,
} from './ticket-auto-archive';

describe('ticket auto-archive policy', () => {
  const now = new Date('2026-09-15T00:00:00.000Z');

  it('defaults to 30 days and treats 0 as disabled', () => {
    expect(DEFAULT_DONE_TICKET_ARCHIVE_AFTER_DAYS).toBe(30);
    expect(isDoneTicketAutoArchiveEnabled(30)).toBe(true);
    expect(isDoneTicketAutoArchiveEnabled(0)).toBe(false);
  });

  it('computes the cutoff from completedAt, not calendar month length', () => {
    expect(doneTicketArchiveCutoff(now, 30).toISOString()).toBe(
      '2026-08-16T00:00:00.000Z',
    );
  });

  it('parses integer days from numbers or numeric strings', () => {
    expect(parseDoneTicketArchiveAfterDays(14)).toBe(14);
    expect(parseDoneTicketArchiveAfterDays('0')).toBe(0);
    expect(parseDoneTicketArchiveAfterDays('365')).toBe(365);
  });

  it('rejects out-of-range or non-integer values', () => {
    expect(() => parseDoneTicketArchiveAfterDays(-1)).toThrow(
      'Done ticket auto-archive days must be between 0 and 365',
    );
    expect(() => parseDoneTicketArchiveAfterDays(1.5)).toThrow(
      'Done ticket auto-archive days must be a whole number',
    );
    expect(() => parseDoneTicketArchiveAfterDays('abc')).toThrow(
      'Done ticket auto-archive days must be a whole number',
    );
  });

  it('stamps completedAt when a ticket first becomes Done', () => {
    expect(nextCompletedAt('in_progress', 'done', now)).toBe(now);
  });

  it('clears completedAt when a ticket leaves Done', () => {
    expect(nextCompletedAt('done', 'todo', now)).toBeNull();
  });

  it('does not move completedAt when status is unchanged', () => {
    expect(nextCompletedAt('done', 'done', now)).toBeUndefined();
    expect(nextCompletedAt('todo', 'in_progress', now)).toBeUndefined();
  });

  it('restarts completedAt when a Done ticket is restored', () => {
    expect(
      completedAtAfterArchiveChange({
        currentlyArchived: true,
        nextArchived: false,
        nextStatus: 'done',
        now,
      }),
    ).toBe(now);
  });

  it('does not touch completedAt when archiving', () => {
    expect(
      completedAtAfterArchiveChange({
        currentlyArchived: false,
        nextArchived: true,
        nextStatus: 'done',
        now,
      }),
    ).toBeUndefined();
  });
});
