import { Router } from "express";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, chatGroupMembersTable, chatGroupViewsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

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
  const timeZone = req.query.timezone ?? "UTC";
  if (typeof timeZone !== "string" || timeZone.length > 80) {
    res.status(400).json({ error: "Fuseau horaire invalide" }); return;
  }
  try { new Intl.DateTimeFormat("fr", { timeZone }).format(); }
  catch { res.status(400).json({ error: "Fuseau horaire invalide" }); return; }

  // Seven local calendar days including today, never a client-supplied timestamp.
  const bounds = sql`WITH bounds AS (
    SELECT date_trunc('day', timezone(${timeZone}, now())) AS today
  ), period AS (
    SELECT today, (today - interval '6 days') AT TIME ZONE ${timeZone} AS start_at,
      today AT TIME ZONE ${timeZone} AS today_at FROM bounds
  )`;
  const metrics = await db.execute(sql`${bounds}
    SELECT
      to_char(w.today - interval '6 days', 'YYYY-MM-DD') AS "periodStart",
      to_char(w.today, 'YYYY-MM-DD') AS "periodEnd",
      (SELECT count(*)::int FROM chat_group_members WHERE group_id = ${groupId}) AS "membersTotal",
      (SELECT count(*)::int FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at >= w.today_at AND created_at <= now()) AS "messagesToday",
      (SELECT count(*)::int FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at >= w.start_at AND created_at <= now()) AS "messagesLast7Days",
      (SELECT count(DISTINCT sender_id)::int FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at >= w.start_at AND created_at <= now()) AS "writersLast7Days",
      (SELECT count(*)::int FROM chat_group_views WHERE group_id = ${groupId}
        AND created_at >= w.start_at AND created_at <= now()) AS "viewsLast7Days",
      (SELECT count(DISTINCT user_id)::int FROM chat_group_views WHERE group_id = ${groupId}
        AND created_at >= w.start_at AND created_at <= now()) AS "readersLast7Days",
      (SELECT max(created_at) FROM chat_group_messages WHERE group_id = ${groupId}
        AND type = 'text' AND created_at <= now()) AS "lastMessageAt"
    FROM period w`);
  const daily = await db.execute(sql`${bounds}
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
      (SELECT count(*)::int FROM chat_group_messages WHERE group_id = ${groupId} AND type = 'text'
        AND created_at >= d.day AT TIME ZONE ${timeZone}
        AND created_at < (d.day + interval '1 day') AT TIME ZONE ${timeZone}
        AND created_at <= now()) AS messages,
      (SELECT count(*)::int FROM chat_group_views WHERE group_id = ${groupId}
        AND created_at >= d.day AT TIME ZONE ${timeZone}
        AND created_at < (d.day + interval '1 day') AT TIME ZONE ${timeZone}
        AND created_at <= now()) AS views
    FROM period w CROSS JOIN LATERAL
      generate_series(w.today - interval '6 days', w.today, interval '1 day') d(day) ORDER BY d.day`);
  const recent = await db.execute(sql`
    SELECT m.id, m.type, m.created_at AS "createdAt",
      CASE WHEN m.sender_id = 0 THEN 'BrutePawa Bot'
        ELSE coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), 'Utilisateur') END AS name
    FROM chat_group_messages m LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.group_id = ${groupId} AND m.created_at >=
      (date_trunc('day', timezone(${timeZone}, now())) - interval '6 days') AT TIME ZONE ${timeZone}
      AND m.created_at <= now()
    ORDER BY m.created_at DESC, m.id DESC LIMIT 10`);
  res.json({
    groupId, timeZone, ...metrics.rows[0], reactionsLast7Days: null,
    daily: daily.rows, recentActivity: recent.rows,
    viewDefinition: "Une vue correspond à une ouverture réelle du groupe. Les nouvelles tentatives de la même ouverture ne sont pas recomptées. L’ancien historique des vues n’est pas disponible.",
  });
});

export default router;
