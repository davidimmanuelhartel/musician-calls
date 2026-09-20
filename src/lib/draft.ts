'use client';
export type Draft = { values: Record<string, string>; files: File[] };
let cachedFiles: File[] | undefined;
let pendingWrite: Promise<void> = Promise.resolve();
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tutti-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readDraft(): Promise<Draft | undefined> {
  await pendingWrite.catch(() => undefined);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readonly');
    const values = tx.objectStore('drafts').get('values');
    const files = tx.objectStore('drafts').get('files');
    tx.oncomplete = () => {
      db.close();
      cachedFiles = files.result || [];
      resolve(values.result ? { values: values.result, files: cachedFiles! } : undefined);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export function writeDraft(draft: Draft) {
  // Serialize writes, including route changes, and avoid copying up to 200 MB of PDFs on each keystroke.
  pendingWrite = pendingWrite
    .catch(() => undefined)
    .then(async () => {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('drafts', 'readwrite');
        tx.objectStore('drafts').put(draft.values, 'values');
        if (cachedFiles !== draft.files) tx.objectStore('drafts').put(draft.files, 'files');
        tx.oncomplete = () => {
          cachedFiles = draft.files;
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      });
    });
  return pendingWrite;
}
export async function clearDraft() {
  await pendingWrite.catch(() => undefined);
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').clear();
    tx.oncomplete = () => {
      cachedFiles = undefined;
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
