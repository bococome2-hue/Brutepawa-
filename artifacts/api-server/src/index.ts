import app from "./app";
import { logger } from "./lib/logger";
import { db, databaseProvider } from "@workspace/db";
import { liveStreamsTable, usersTable, postsTable, storiesTable, productsTable } from "@workspace/db/schema";
import { eq, and, lt, or, isNotNull, isNull, sql } from "drizzle-orm";
import { deleteLiveInput } from "./lib/cloudflare-stream";
import { seedGiftCatalog } from "./routes/gifts";
import { listAllObjects, deleteObject, extractKeyFromUrl } from "./lib/r2";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  const rawDbUrl = (databaseProvider === "replit"
    ? process.env["DATABASE_URL"] : process.env["APP_DATABASE_URL"]) ?? "";
  const dbUrl = new URL(rawDbUrl);
  dbUrl.searchParams.delete("channel_binding");
  logger.info({ provider: databaseProvider, pooler: dbUrl.hostname.includes("pooler") }, "DB config");
} catch {
  logger.warn("Could not parse database URL");
}

// Auto-stop live streams that have been running too long or have no viewers
async function autoStopStaleLives() {
  const now = new Date();
  const fiveMinAgo  = new Date(now.getTime() - 5  * 60 * 1000);
  const sixtyMinAgo = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    // Find lives to stop — three independent conditions (any one is sufficient):
    // 1. Never had any viewer AND started > 5 min ago (no audience from the start).
    // 2. Had viewers, all left, and last heartbeat was > 5 min ago
    //    (viewer_count = 0 guards against premature stop if viewers are still present).
    // 3. Running longer than the per-row max_duration_minutes (default 60 min).
    // Note: broadcaster does NOT send heartbeats; last_viewer_at reflects viewer-only presence.
    const staleLives = await db
      .select({ id: liveStreamsTable.id, liveInputId: liveStreamsTable.liveInputId })
      .from(liveStreamsTable)
      .where(
        and(
          eq(liveStreamsTable.status, "live"),
          or(
            // Condition 1: never had a viewer and started > 5 min ago
            and(isNull(liveStreamsTable.lastViewerAt), lt(liveStreamsTable.startedAt, fiveMinAgo)),
            // Condition 2: had viewers but viewer_count reached 0 and no heartbeat in > 5 min
            and(
              eq(liveStreamsTable.viewerCount, 0),
              isNotNull(liveStreamsTable.lastViewerAt),
              lt(liveStreamsTable.lastViewerAt, fiveMinAgo),
            ),
            // Condition 3: max duration per DB field
            sql`${liveStreamsTable.startedAt} < NOW() - (${liveStreamsTable.maxDurationMinutes} * INTERVAL '1 minute')`,
          ),
        ),
      );

    for (const live of staleLives) {
      try {
        await deleteLiveInput(live.liveInputId);
      } catch (err) {
        logger.warn({ err, liveInputId: live.liveInputId }, "autoStop: CF deleteLiveInput failed (non-fatal)");
      }
      await db
        .update(liveStreamsTable)
        .set({ status: "ended", endedAt: now })
        .where(eq(liveStreamsTable.id, live.id));
      logger.info({ liveId: live.id }, "autoStop: ended stale live");
    }
  } catch (err) {
    logger.error({ err }, "autoStop: error running live cleanup");
  }
}

// ─── Orphan R2 cleanup ────────────────────────────────────────────────────────
// Runs once per day. Lists all R2 objects and deletes any that:
//   1. Are older than 24 hours (to skip in-flight uploads)
//   2. Have no matching URL reference in any DB table
async function cleanupOrphanedR2Objects() {
  // The shared bucket still contains Supabase media. The temporary database has
  // no references to those files; treating them as orphans would destroy them.
  if (databaseProvider === "replit") return;
  logger.info("orphanCleanup: starting");
  try {
    const allObjects = await listAllObjects();
    if (allObjects.length === 0) {
      logger.info("orphanCleanup: bucket empty or R2 not configured");
      return;
    }

    // Collect all R2 URLs stored in the database
    const [users, posts, stories, products] = await Promise.all([
      db.select({ a: usersTable.avatarUrl, b: usersTable.coverUrl }).from(usersTable),
      db.select({ a: postsTable.imageUrl,  b: postsTable.thumbnailUrl }).from(postsTable),
      db.select({ a: storiesTable.mediaUrl, b: storiesTable.thumbnailUrl }).from(storiesTable),
      db.select({ a: productsTable.imageUrl, b: productsTable.thumbnailUrl }).from(productsTable),
    ]);

    const referencedKeys = new Set<string>();
    const addKey = (url: string | null | undefined) => {
      if (!url) return;
      // extractKeyFromUrl returns null if not our R2 — safe to call on any URL
      const key = extractKeyFromUrl(url);
      if (key) referencedKeys.add(key);
    };

    for (const row of [...users, ...posts, ...stories, ...products]) {
      addKey(row.a);
      addKey(row.b);
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
    const orphans = allObjects.filter(
      obj => obj.lastModified < cutoff && !referencedKeys.has(obj.key),
    );

    logger.info(
      { total: allObjects.length, referenced: referencedKeys.size, orphans: orphans.length },
      "orphanCleanup: scan complete",
    );

    let deleted = 0;
    for (const obj of orphans) {
      try {
        await deleteObject(obj.key);
        deleted++;
      } catch (err) {
        logger.warn({ err, key: obj.key }, "orphanCleanup: delete failed (non-fatal)");
      }
    }

    logger.info({ deleted }, "orphanCleanup: done");
  } catch (err) {
    logger.error({ err }, "orphanCleanup: error (non-fatal)");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed gift catalog (idempotent — only inserts if empty)
  seedGiftCatalog().catch(err => logger.warn({ err }, "seedGiftCatalog failed (non-fatal)"));

  // Auto-stop stale lives: every 2 minutes
  setInterval(autoStopStaleLives, 2 * 60 * 1000);
  logger.info("Live auto-stop cron started (every 2 min)");

  // Orphan R2 cleanup: once per day (first run after 30 min warm-up)
  if (databaseProvider !== "replit") {
    setTimeout(() => {
      cleanupOrphanedR2Objects();
      setInterval(cleanupOrphanedR2Objects, 24 * 60 * 60 * 1000);
    }, 30 * 60 * 1000);
    logger.info("Orphan R2 cleanup cron scheduled (daily, first run in 30 min)");
  } else {
    logger.info("Orphan R2 cleanup disabled to preserve media referenced by Supabase");
  }
});
