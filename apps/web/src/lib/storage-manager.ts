/**
 * Storage quota management for offline packs (T-0120)
 * 
 * Features:
 * - Check available storage quota via StorageManager API
 * - Auto-cleanup oldest packs when >80% quota used
 * - Max pack size: 50MB per course
 * - Track downloaded packs with metadata
 */

const MAX_PACK_SIZE_BYTES = 50 * 1024 * 1024; // 50MB per course
const QUOTA_THRESHOLD = 0.8; // 80% — trigger cleanup
const PACK_META_KEY = 'ttndd-offline-packs-meta';

export interface PackMeta {
  courseId: string;
  title: string;
  downloadedAt: string;
  sizeBytes: number;
  version: string;
}

// ── Quota checking ──

export async function getStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
}> {
  if (!navigator.storage?.estimate) {
    return { usageBytes: 0, quotaBytes: Infinity, percentUsed: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? Infinity;

  return {
    usageBytes: usage,
    quotaBytes: quota,
    percentUsed: quota > 0 ? usage / quota : 0,
  };
}

export async function isSpaceAvailable(requiredBytes: number): Promise<boolean> {
  const { usageBytes, quotaBytes } = await getStorageEstimate();
  return (usageBytes + requiredBytes) < (quotaBytes * QUOTA_THRESHOLD);
}

// ── Pack metadata management ──

export function getPacksMeta(): PackMeta[] {
  try {
    const raw = localStorage.getItem(PACK_META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePackMeta(meta: PackMeta): void {
  const packs = getPacksMeta();
  const idx = packs.findIndex((p) => p.courseId === meta.courseId);
  if (idx >= 0) {
    packs[idx] = meta; // Update existing
  } else {
    packs.push(meta);
  }
  localStorage.setItem(PACK_META_KEY, JSON.stringify(packs));
}

export function removePackMeta(courseId: string): void {
  const packs = getPacksMeta().filter((p) => p.courseId !== courseId);
  localStorage.setItem(PACK_META_KEY, JSON.stringify(packs));
}

// ── Size validation ──

export function validatePackSize(sizeBytes: number): { ok: boolean; reason?: string } {
  if (sizeBytes > MAX_PACK_SIZE_BYTES) {
    return {
      ok: false,
      reason: `Pack exceeds ${MAX_PACK_SIZE_BYTES / (1024 * 1024)}MB limit (actual: ${(sizeBytes / (1024 * 1024)).toFixed(1)}MB)`,
    };
  }
  return { ok: true };
}

// ── Auto-cleanup: remove oldest packs when over threshold ──

export async function cleanupIfNeeded(): Promise<string[]> {
  const { percentUsed } = await getStorageEstimate();
  if (percentUsed < QUOTA_THRESHOLD) return [];

  const packs = getPacksMeta();
  if (packs.length === 0) return [];

  // Sort by oldest first
  const sorted = [...packs].sort(
    (a, b) => new Date(a.downloadedAt).getTime() - new Date(b.downloadedAt).getTime()
  );

  const removed: string[] = [];
  const packCache = await caches.open('ttndd-v1-packs');

  // Remove oldest packs until under threshold
  for (const pack of sorted) {
    const { percentUsed: currentUsage } = await getStorageEstimate();
    if (currentUsage < QUOTA_THRESHOLD * 0.9) break; // Below 72%, stop

    // Remove from cache
    const keys = await packCache.keys();
    for (const req of keys) {
      if (req.url.includes(pack.courseId)) {
        await packCache.delete(req);
      }
    }

    removePackMeta(pack.courseId);
    removed.push(pack.courseId);
  }

  return removed;
}

// ── High-level: Download pack with validation ──

export async function downloadPack(
  courseId: string,
  title: string,
  packData: unknown,
): Promise<{ success: boolean; reason?: string }> {
  const sizeBytes = new Blob([JSON.stringify(packData)]).size;

  // Size check
  const sizeCheck = validatePackSize(sizeBytes);
  if (!sizeCheck.ok) return { success: false, reason: sizeCheck.reason };

  // Space check
  const hasSpace = await isSpaceAvailable(sizeBytes);
  if (!hasSpace) {
    // Try cleanup first
    await cleanupIfNeeded();
    const hasSpaceAfterCleanup = await isSpaceAvailable(sizeBytes);
    if (!hasSpaceAfterCleanup) {
      return { success: false, reason: 'Insufficient storage after cleanup' };
    }
  }

  // Save metadata
  savePackMeta({
    courseId,
    title,
    downloadedAt: new Date().toISOString(),
    sizeBytes,
    version: '1',
  });

  return { success: true };
}
