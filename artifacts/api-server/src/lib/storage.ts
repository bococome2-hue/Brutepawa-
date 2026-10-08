import { db, usersTable, mediaFilesTable, storagePlansTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { deleteObject } from "./r2";
import type { MediaKind } from "./r2";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileTrack {
  key:       string;
  sizeBytes: number;
  kind:      MediaKind | string;
}

export interface QuotaInfo {
  used:            number;
  quota:           number;
  remaining:       number;
  percent:         number;
  plan:            string;
  planDisplayName: string;
}

// ─── Track uploads ────────────────────────────────────────────────────────────

/**
 * Register one or more R2 uploads in the media_files tracking table
 * and increment the user's cached total_storage_bytes.
 */
export async function trackUploads(files: FileTrack[], userId: number): Promise<void> {
  if (files.length === 0) return;

  await db
    .insert(mediaFilesTable)
    .values(files.map(f => ({ userId, r2Key: f.key, sizeBytes: f.sizeBytes, kind: f.kind })))
    .onConflictDoNothing();

  const total = files.reduce((s, f) => s + f.sizeBytes, 0);
  await db
    .execute(sql`UPDATE users SET total_storage_bytes = total_storage_bytes + ${total} WHERE id = ${userId}`)
    .catch(() => {});
}

// ─── Release storage ─────────────────────────────────────────────────────────

/**
 * Delete R2 objects by key, remove their tracking rows, and decrement
 * the owning user's total_storage_bytes. Best-effort — never throws.
 */
export async function releaseStorage(keys: (string | null | undefined)[]): Promise<void> {
  const validKeys = keys.filter((k): k is string => !!k);
  if (validKeys.length === 0) return;

  // Look up tracked rows to get sizes and user IDs before deleting
  const tracked = await db
    .select({ userId: mediaFilesTable.userId, r2Key: mediaFilesTable.r2Key, sizeBytes: mediaFilesTable.sizeBytes })
    .from(mediaFilesTable)
    .where(inArray(mediaFilesTable.r2Key, validKeys))
    .catch(() => [] as typeof mediaFilesTable.$inferSelect[]);

  // Delete from R2 + remove tracking rows in parallel
  await Promise.all([
    ...validKeys.map(k => deleteObject(k).catch(() => {})),
    tracked.length > 0
      ? db.delete(mediaFilesTable).where(inArray(mediaFilesTable.r2Key, tracked.map(f => f.r2Key))).catch(() => {})
      : Promise.resolve(),
  ]);

  // Decrement each owner's storage counter
  const byUser = new Map<number, number>();
  for (const f of tracked) {
    byUser.set(f.userId, (byUser.get(f.userId) ?? 0) + Number(f.sizeBytes));
  }
  for (const [uid, bytes] of byUser) {
    await db
      .execute(sql`UPDATE users SET total_storage_bytes = GREATEST(0, total_storage_bytes - ${bytes}) WHERE id = ${uid}`)
      .catch(() => {});
  }
}

// ─── Quota lookup ─────────────────────────────────────────────────────────────

const DEFAULT_QUOTA = 1_073_741_824; // 1 GB fallback

export async function getUserQuota(userId: number): Promise<QuotaInfo> {
  const [user] = await db
    .select({ totalStorageBytes: sql<number>`total_storage_bytes`, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) throw new Error("Utilisateur introuvable");

  const [plan] = await db
    .select({ quotaBytes: storagePlansTable.quotaBytes, displayName: storagePlansTable.displayName })
    .from(storagePlansTable)
    .where(eq(storagePlansTable.planName, user.role));

  const quota = plan?.quotaBytes ?? DEFAULT_QUOTA;
  const used  = Number(user.totalStorageBytes) || 0;

  return {
    used,
    quota,
    remaining:       Math.max(0, quota - used),
    percent:         quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0,
    plan:            user.role,
    planDisplayName: plan?.displayName ?? "Gratuit",
  };
}

// ─── Recalculate from DB (for cron accuracy) ─────────────────────────────────

/**
 * Recalculate a user's total_storage_bytes from the media_files table.
 * Called by the cleanup cron to resync the cached counter.
 */
export async function resyncStorageCounter(userId: number): Promise<void> {
  await db.execute(sql`
    UPDATE users
    SET total_storage_bytes = COALESCE(
      (SELECT SUM(size_bytes) FROM media_files WHERE user_id = ${userId}), 0
    )
    WHERE id = ${userId}
  `).catch(() => {});
}
