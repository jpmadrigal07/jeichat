import { attachments } from '../../src/database/schema';
import { messages } from '../../src/database/schema/messages';

export type TestAttachmentRow = {
  id: string;
  workspaceId: string;
  channelId: string;
  messageId: string | null;
  uploaderId: string;
  storageKey: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  status: string;
  createdAt: Date;
};

export type TestMessageRow = {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export class AttachmentsTestStore {
  readonly attachmentRows = new Map<string, TestAttachmentRow>();
  readonly messageRows = new Map<string, TestMessageRow>();

  /** Results returned in order for each `select().from().where()` call. */
  private selectQueue: unknown[][] = [];

  /** Rows from the most recent attachment/message select (used by update). */
  lastSelectRows: unknown[] = [];

  /** Optional filter applied after queued/default attachment selects. */
  attachmentSelectFilter: ((row: TestAttachmentRow) => boolean) | null =
    null;

  reset() {
    this.attachmentRows.clear();
    this.messageRows.clear();
    this.selectQueue = [];
    this.lastSelectRows = [];
    this.attachmentSelectFilter = null;
  }

  queueSelect(...resultSets: unknown[][]) {
    this.selectQueue.push(...resultSets);
  }

  seedAttachment(row: TestAttachmentRow) {
    this.attachmentRows.set(row.id, row);
  }

  createMockDb() {
    const store = this;

    const dequeueSelect = () => store.selectQueue.shift() ?? [];

    const db = {
      insert: (table: unknown) => ({
        values: async (row: TestAttachmentRow | TestMessageRow) => {
          if (table === attachments) {
            const attachment = row as TestAttachmentRow;
            store.attachmentRows.set(attachment.id, {
              ...attachment,
              createdAt: attachment.createdAt ?? new Date(),
            });
          }
          if (table === messages) {
            const message = row as TestMessageRow;
            store.messageRows.set(message.id, message);
          }
        },
      }),
      select: () => ({
        from: (table: unknown) => ({
          where: async () => {
            let rows: unknown[] = [];
            if (table === attachments) {
              const queued = dequeueSelect();
              rows =
                queued.length > 0 ? queued : [...store.attachmentRows.values()];
              if (store.attachmentSelectFilter) {
                rows = rows.filter((row) =>
                  store.attachmentSelectFilter!(
                    row as TestAttachmentRow,
                  ),
                );
              }
            } else if (table === messages) {
              const queued = dequeueSelect();
              rows =
                queued.length > 0 ? queued : [...store.messageRows.values()];
            } else {
              rows = dequeueSelect();
            }
            store.lastSelectRows = rows;
            return rows;
          },
        }),
      }),
      update: (table: unknown) => ({
        set: (patch: Partial<TestAttachmentRow>) => ({
          where: async () => {
            if (table !== attachments) return;
            const targets = store.lastSelectRows.filter(
              (row): row is TestAttachmentRow =>
                typeof row === 'object' &&
                row !== null &&
                'id' in row &&
                typeof (row as TestAttachmentRow).id === 'string',
            );
            for (const row of targets) {
              const existing = store.attachmentRows.get(row.id);
              if (existing) {
                store.attachmentRows.set(row.id, { ...existing, ...patch });
              }
            }
          },
        }),
      }),
      transaction: async (fn: (tx: typeof db) => Promise<void>) => {
        await fn(db);
      },
    };

    return db;
  }
}
