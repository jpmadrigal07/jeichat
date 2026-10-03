import { BadRequestException } from '@nestjs/common';

/** Default days a ticket stays Done before it is archived. */
export const DEFAULT_DONE_TICKET_ARCHIVE_AFTER_DAYS = 30;

/** `0` disables auto-archive so a future settings UI can turn it off. */
export const MIN_DONE_TICKET_ARCHIVE_AFTER_DAYS = 0;
export const MAX_DONE_TICKET_ARCHIVE_AFTER_DAYS = 365;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isDoneTicketAutoArchiveEnabled(days: number) {
  return days > 0;
}

export function doneTicketArchiveCutoff(now: Date, days: number) {
  return new Date(now.getTime() - days * MS_PER_DAY);
}

export function parseDoneTicketArchiveAfterDays(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed)) {
    throw new BadRequestException(
      'Done ticket auto-archive days must be a whole number',
    );
  }
  if (
    parsed < MIN_DONE_TICKET_ARCHIVE_AFTER_DAYS ||
    parsed > MAX_DONE_TICKET_ARCHIVE_AFTER_DAYS
  ) {
    throw new BadRequestException(
      `Done ticket auto-archive days must be between ${MIN_DONE_TICKET_ARCHIVE_AFTER_DAYS} and ${MAX_DONE_TICKET_ARCHIVE_AFTER_DAYS}`,
    );
  }
  return parsed;
}

/** `undefined` means leave `completedAt` unchanged. */
export function nextCompletedAt(
  currentStatus: string | null,
  nextStatus: string,
  now: Date,
): Date | null | undefined {
  if (nextStatus === currentStatus) return undefined;
  if (nextStatus === 'done') return now;
  if (currentStatus === 'done') return null;
  return undefined;
}

/** Restoring a Done ticket restarts the auto-archive clock. */
export function completedAtAfterArchiveChange(input: {
  currentlyArchived: boolean;
  nextArchived: boolean;
  nextStatus: string | null;
  now: Date;
}): Date | undefined {
  if (input.nextArchived === input.currentlyArchived) return undefined;
  if (input.nextArchived) return undefined;
  if (input.nextStatus === 'done') return input.now;
  return undefined;
}
