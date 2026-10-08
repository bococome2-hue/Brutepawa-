import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export async function getBotStatistics(groupId: number, period: "today" | "seven" | "thirty" | "total") {
  const days = period === "today" ? 1 : period === "seven" ? 7 : period === "thirty" ? 30 : null;
  const start = days === null ? sql`NULL::timestamptz` : sql`date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' - (${days - 1} * interval '1 day')`;
  const result = await db.execute(sql`
    WITH range AS (SELECT ${start} AS start_at),
    metrics AS (
      SELECT coalesce(sum(analyzed), 0)::int AS analyzed,
        coalesce(sum(blocked), 0)::int AS blocked,
        coalesce(sum(spam), 0)::int AS spam, coalesce(sum(links), 0)::int AS links
      FROM chat_bot_metrics, range WHERE group_id = ${groupId}
        AND (range.start_at IS NULL OR day >= (range.start_at AT TIME ZONE 'UTC')::date)
    ),
    events AS (
      SELECT count(*) FILTER (WHERE action = 'delete')::int AS deleted,
        count(*) FILTER (WHERE action = 'warn')::int AS warnings,
        count(*) FILTER (WHERE action = 'mute')::int AS mutes,
        count(*) FILTER (WHERE action = 'kick')::int AS kicks,
        count(*) FILTER (WHERE action = 'ban')::int AS bans,
        count(DISTINCT target_user_id) FILTER (WHERE action = 'protected')::int AS protected_users
      FROM chat_bot_logs, range WHERE group_id = ${groupId}
        AND (range.start_at IS NULL OR created_at >= range.start_at)
    )
    SELECT metrics.*, events.*,
      (SELECT min(tracking_since) FROM chat_bot_metrics WHERE group_id = ${groupId}) AS tracking_since
    FROM metrics, events
  `);
  const row = result.rows[0] as Record<string, number | Date | null>;
  return {
    period, timeZone: "UTC", analyzed: Number(row.analyzed), deleted: Number(row.deleted),
    blocked: Number(row.blocked), spam: Number(row.spam), links: Number(row.links),
    warnings: Number(row.warnings), mutes: Number(row.mutes), kicks: Number(row.kicks), bans: Number(row.bans),
    protectedUsers: Number(row.protected_users),
    trackingSince: row.tracking_since ? new Date(row.tracking_since as Date).toISOString() : null,
  };
}
