import { Router } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, chatGroupMembersTable, chatGroupViewsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { statisticsRange } from "../lib/groupStatisticsRange";

const router = Router();
const visitSchema = z.object({ visitId: z.string().uuid() }).strict();

router.use(["/chat-groups/:id/statistics", "/chat-groups/:id/views"], requireAuth, async (req, res, next) => {
  const groupId = Number(req.params.id);
  if (!Number.isSafeInteger(groupId) || groupId < 1 || groupId > 2147483647) {
    res.status(400).json({ error: "Groupe invalide" }); return;
  }
  const [member] = await db.select({ id: chatGroupMembersTable.id }).from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, req.userId!)));
  if (!member) { res.status(403).json({ error: "Accès refusé" }); return; }
  res.locals.statisticsGroupId = groupId;
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

router.post("/chat-groups/:id/views", async (req, res): Promise<void> => {
  const input = visitSchema.safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: "Consultation invalide" }); return; }
  await db.insert(chatGroupViewsTable).values({
    groupId: res.locals.statisticsGroupId, userId: req.userId!, visitId: input.data.visitId,
  }).onConflictDoNothing();
  res.sendStatus(204);
});

router.get("/chat-groups/:id/statistics", async (req, res): Promise<void> => {
  const groupId: number = res.locals.statisticsGroupId;
  let range: ReturnType<typeof statisticsRange>;
  try { range = statisticsRange(req.query); }
  catch { res.status(400).json({ error: "Période ou fuseau horaire invalide (93 jours maximum)." }); return; }
  const timeZone = range.timezone;
  const result = await db.transaction(async (transaction) => {
  // Local calendar bounds; the 24h preset is genuinely rolling. All timestamps are parameterized.
  const bounds = sql`WITH bounds AS (
    SELECT date_trunc('day', timezone(${timeZone}, now())) AS today,
      ${range.startDay}::date::timestamp AS start_day, ${range.endDay}::date::timestamp AS end_day
  ), period AS (
    SELECT today, start_day, end_day,
      CASE WHEN ${range.rolling24h} THEN now() - interval '24 hours'
        ELSE start_day AT TIME ZONE ${timeZone} END AS start_at,
      least((end_day + interval '1 day') AT TIME ZONE ${timeZone}, now()) AS end_at,
      (today - interval '6 days') AT TIME ZONE ${timeZone} AS seven_at,
      today AT TIME ZONE ${timeZone} AS today_at FROM bounds
  )`;
  const metrics = await transaction.execute(sql`${bounds}
    SELECT
      to_char(w.start_day, 'YYYY-MM-DD') AS "periodStart",
      to_char(w.end_day, 'YYYY-MM-DD') AS "periodEnd",
      (SELECT count(*)::int FROM chat_group_members WHERE group_id = ${groupId}) AS "membersTotal",
      (SELECT count(*)::int FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at >= w.today_at AND created_at <= now()) AS "messagesToday",
      (SELECT count(*)::int FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at >= w.seven_at AND created_at <= now()) AS "messagesLast7Days",
      (SELECT count(DISTINCT sender_id)::int FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at >= w.seven_at AND created_at <= now()) AS "writersLast7Days",
      (SELECT count(*)::int FROM chat_group_views WHERE group_id = ${groupId}
        AND created_at >= w.seven_at AND created_at <= now()) AS "viewsLast7Days",
      (SELECT count(DISTINCT user_id)::int FROM chat_group_views WHERE group_id = ${groupId}
        AND created_at >= w.seven_at AND created_at <= now()) AS "readersLast7Days",
      (SELECT count(*)::int FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at >= w.start_at AND created_at <= w.end_at) AS "messagesInPeriod",
      (SELECT count(DISTINCT sender_id)::int FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at >= w.start_at AND created_at <= w.end_at) AS "writersInPeriod",
      (SELECT count(*)::int FROM chat_group_views WHERE group_id = ${groupId}
        AND created_at >= w.start_at AND created_at <= w.end_at) AS "viewsInPeriod",
      (SELECT count(DISTINCT user_id)::int FROM chat_group_views WHERE group_id = ${groupId}
        AND created_at >= w.start_at AND created_at <= w.end_at) AS "readersInPeriod",
      (SELECT max(created_at) FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at <= now()) AS "lastMessageAt"
    FROM period w`);
  const daily = await transaction.execute(sql`${bounds}, message_days AS (
    SELECT date_trunc('day', timezone(${timeZone}, m.created_at)) AS day, count(*)::int AS total
    FROM chat_group_messages m CROSS JOIN period w WHERE m.group_id = ${groupId}
      AND m.type = 'text' AND m.created_at >= w.start_at AND m.created_at <= w.end_at GROUP BY 1
  ), view_days AS (
    SELECT date_trunc('day', timezone(${timeZone}, v.created_at)) AS day, count(*)::int AS total
    FROM chat_group_views v CROSS JOIN period w WHERE v.group_id = ${groupId}
      AND v.created_at >= w.start_at AND v.created_at <= w.end_at GROUP BY 1
  )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
      coalesce(md.total, 0) AS messages, coalesce(vd.total, 0) AS views
    FROM period w CROSS JOIN LATERAL
      generate_series(w.start_day, w.end_day, interval '1 day') d(day)
      LEFT JOIN message_days md ON md.day = d.day LEFT JOIN view_days vd ON vd.day = d.day ORDER BY d.day`);
  const recent = await transaction.execute(sql`${bounds}
    SELECT m.id, m.type, m.created_at AS "createdAt",
      CASE WHEN m.sender_id = 0 THEN 'BrutePawa Bot'
        ELSE coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Utilisateur') END AS name
    FROM chat_group_messages m CROSS JOIN period w LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.group_id = ${groupId} AND m.created_at >= w.start_at AND m.created_at <= w.end_at
    ORDER BY m.created_at DESC, m.id DESC LIMIT 10`);
  const types = await transaction.execute(sql`${bounds}, classified AS (
    SELECT CASE
      WHEN content ~ '^__(image|sticker)__' AND content ~* '([.]gif([?/" ]|$)|giphy[.]com|tenor[.]com)' THEN 'gif'
      WHEN content ~ '^__image__' THEN 'images'
      WHEN content ~ '^__video__' THEN 'videos'
      WHEN content ~ '^__audio__' THEN 'voice'
      WHEN content ~ '^__doc__' THEN 'files'
      WHEN content ~ '^__(sticker|contact|location|poll|botmenu)__' THEN 'other'
      WHEN content ~* '(https?://|www[.])' THEN 'links'
      ELSE 'text' END AS kind
    FROM chat_group_messages m CROSS JOIN period w WHERE m.group_id = ${groupId}
      AND m.type = 'text' AND m.created_at >= w.start_at AND m.created_at <= w.end_at
  )
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE kind = 'text')::int AS text,
      count(*) FILTER (WHERE kind = 'images')::int AS images,
      count(*) FILTER (WHERE kind = 'videos')::int AS videos,
      count(*) FILTER (WHERE kind = 'voice')::int AS voice,
      count(*) FILTER (WHERE kind = 'files')::int AS files,
      count(*) FILTER (WHERE kind = 'gif')::int AS gif,
      count(*) FILTER (WHERE kind = 'links')::int AS links,
      count(*) FILTER (WHERE kind = 'other')::int AS other FROM classified`);
  return {
    groupId, timeZone, ...metrics.rows[0], reactionsLast7Days: null,
    period: range.period, customRange: range.custom, messageTypes: types.rows[0],
    growth: null, joinedInPeriod: null, leftInPeriod: null, trends: null,
    reactionsInPeriod: null, repliesInPeriod: null, sharesInPeriod: null,
    daily: daily.rows, recentActivity: recent.rows,
    viewDefinition: "Une vue correspond à une ouverture réelle du groupe. Les nouvelles tentatives de la même ouverture ne sont pas recomptées. L’ancien historique des vues n’est pas disponible.",
  };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  res.json(result);
});

export default router;
