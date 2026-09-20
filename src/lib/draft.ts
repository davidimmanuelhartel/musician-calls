'use client';
export type Draft = { values: Record<string, string>; files: File[] };
const cachedFiles = new Map<string, File[]>();
let pendingWrite: Promise<void> = Promise.resolve();
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tutti-drafts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readDraft(scope: string): Promise<Draft | undefined> {
  await pendingWrite.catch(() => undefined);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readonly');
    const values = tx.objectStore('drafts').get(`${scope}:values`);
    const files = tx.objectStore('drafts').get(`${scope}:files`);
    tx.oncomplete = () => {
      db.close();
      cachedFiles.set(scope, files.result || []);
      resolve(
        values.result ? { values: values.result, files: cachedFiles.get(scope)! } : undefined,
      );
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export function writeDraft(scope: string, draft: Draft) {
  // Serialize writes, including route changes, and avoid copying up to 200 MB of PDFs on each keystroke.
  pendingWrite = pendingWrite
    .catch(() => undefined)
    .then(async () => {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('drafts', 'readwrite');
        tx.objectStore('drafts').put(draft.values, `${scope}:values`);
        if (cachedFiles.get(scope) !== draft.files)
          tx.objectStore('drafts').put(draft.files, `${scope}:files`);
        tx.oncomplete = () => {
          cachedFiles.set(scope, draft.files);
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
export async function clearDraft(scope: string) {
  await pendingWrite.catch(() => undefined);
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').delete(`${scope}:values`);
    tx.objectStore('drafts').delete(`${scope}:files`);
    tx.oncomplete = () => {
      cachedFiles.delete(scope);
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
