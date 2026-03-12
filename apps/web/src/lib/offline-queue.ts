/**
 * IndexedDB-based offline sync queue (T-0118)
 * 
 * Queues quiz attempts and checklist completions when offline.
 * Auto-syncs when connectivity is restored via `navigator.onLine` + `online` event.
 */

const DB_NAME = 'ttndd-offline';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';

// ── IndexedDB helpers ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export interface OfflineQueueItem {
  id?: number;
  type: 'quiz_attempt' | 'checklist_completion';
  entityId: string;
  data: Record<string, unknown>;
  clientTimestamp: string;
  retries: number;
}

// ── Queue operations ──

export async function enqueue(item: Omit<OfflineQueueItem, 'id' | 'retries' | 'clientTimestamp'>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.add({
    ...item,
    clientTimestamp: new Date().toISOString(),
    retries: 0,
  });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dequeueAll(): Promise<OfflineQueueItem[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeItem(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Auto-sync logic ──

let syncInProgress = false;

export async function syncQueue(apiBaseUrl: string, authToken: string): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  if (syncInProgress) return { synced: 0, failed: 0, remaining: 0 };
  syncInProgress = true;

  try {
    const items = await dequeueAll();
    if (items.length === 0) return { synced: 0, failed: 0, remaining: 0 };

    const response = await fetch(`${apiBaseUrl}/api/v1/lms/offline-packs/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        results: items.map(({ type, entityId, data, clientTimestamp }) => ({
          type, entityId, data, clientTimestamp,
        })),
      }),
    });

    if (!response.ok) {
      return { synced: 0, failed: items.length, remaining: items.length };
    }

    const result = await response.json();
    let synced = 0;
    let failed = 0;

    for (const r of result.results) {
      if (r.status === 'synced' || r.status === 'skipped') {
        synced++;
      } else {
        failed++;
      }
    }

    // Clear successfully synced items
    if (synced > 0) {
      await clearQueue();
    }

    return { synced, failed, remaining: failed };
  } finally {
    syncInProgress = false;
  }
}

// ── Auto-sync on connectivity restore ──

export function initAutoSync(apiBaseUrl: string, getAuthToken: () => string | null): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', async () => {
    const token = getAuthToken();
    if (token) {
      console.log('[OfflineQueue] Online detected — syncing...');
      const result = await syncQueue(apiBaseUrl, token);
      console.log(`[OfflineQueue] Sync complete: ${result.synced} synced, ${result.failed} failed`);
    }
  });

  // Listen for service worker sync trigger
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', async (event) => {
      if (event.data?.type === 'SYNC_TRIGGER') {
        const token = getAuthToken();
        if (token) {
          await syncQueue(apiBaseUrl, token);
        }
      }
    });
  }
}
