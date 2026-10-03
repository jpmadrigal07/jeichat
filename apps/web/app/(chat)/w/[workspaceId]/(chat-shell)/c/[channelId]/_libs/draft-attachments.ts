/**
 * IndexedDB store for composer attachments that haven't been sent yet, keyed
 * by channel. localStorage can't hold Files; IndexedDB structured-clones them.
 */

export type DraftAttachmentRecord = {
  localId: string;
  file: File;
  serverId: string | null;
  /** When the R2 upload finished; null if it never completed. */
  uploadedAt: number | null;
};

const DB_NAME = 'jeichat-composer-drafts';
const DB_VERSION = 1;
const STORE = 'attachments';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

function isDraftAttachmentRecord(value: unknown): value is DraftAttachmentRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.localId === 'string' && record.file instanceof File;
}

export async function loadDraftAttachments(
  channelId: string,
): Promise<DraftAttachmentRecord[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE, 'readonly')
        .objectStore(STORE)
        .get(channelId);
      request.onsuccess = () => {
        const value: unknown = request.result;
        resolve(Array.isArray(value) ? value.filter(isDraftAttachmentRecord) : []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/** An empty list deletes the channel's entry. */
export async function saveDraftAttachments(
  channelId: string,
  records: DraftAttachmentRecord[],
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      if (records.length) {
        store.put(records, channelId);
      } else {
        store.delete(channelId);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // Ignore quota / private-mode failures — the draft just won't survive.
  }
}
