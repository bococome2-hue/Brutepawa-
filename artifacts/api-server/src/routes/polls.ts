import { Router } from "express";
import { and, eq, or, sql, desc, lt, inArray } from "drizzle-orm";
import {
  db, pollsTable, pollOptionsTable, pollVotesTable, pollFollowsTable, pollViewsTable,
  messagesTable, usersTable, userBlocksTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { pushToUser } from "./signaling";
import { getPresence } from "../lib/presenceStore";

const router = Router();
const MAX_QUESTION = 500, MAX_OPTION = 200;
const decodeCursor = (value: unknown): { votedAt: string; userId: number } | null => {
  if (typeof value !== "string") return null;
  try {
    const x = JSON.parse(Buffer.from(value, "base64url").toString());
    return typeof x.votedAt === "string" && Number.isInteger(x.userId) ? x : null;
  } catch { return null; }
};
const encodeCursor = (votedAt: Date, userId: number) =>
  Buffer.from(JSON.stringify({ votedAt: votedAt.toISOString(), userId })).toString("base64url");

async function canAccessPoll(pollId: number, me: number) {
  const [row] = await db.select({ id: pollsTable.id }).from(pollsTable)
    .innerJoin(messagesTable, eq(messagesTable.pollId, pollsTable.id))
    .where(and(eq(pollsTable.id, pollId), or(eq(messagesTable.fromUserId, me), eq(messagesTable.toUserId, me)))).limit(1);
  return !!row;
}

async function pollDetail(pollId: number, me: number) {
  const [poll] = await db.select({
    id: pollsTable.id, question: pollsTable.question, multipleChoice: pollsTable.multipleChoice,
    expiresAt: pollsTable.expiresAt, createdAt: pollsTable.createdAt, isPinned: pollsTable.isPinned,
    creatorId: usersTable.id, creatorFirstName: usersTable.firstName,
    creatorLastName: usersTable.lastName, creatorAvatarUrl: usersTable.avatarUrl,
  }).from(pollsTable).leftJoin(usersTable, eq(pollsTable.creatorId, usersTable.id))
    .where(eq(pollsTable.id, pollId));
  if (!poll) return null;
  const options = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, pollId)).orderBy(pollOptionsTable.position);
  const counts = await db.select({ optionId: pollVotesTable.optionId, count: sql<number>`count(*)::int` })
    .from(pollVotesTable).where(eq(pollVotesTable.pollId, pollId)).groupBy(pollVotesTable.optionId);
  const countMap = new Map(counts.map(v => [v.optionId, v.count]));
  const [participantRow] = await db.select({ count: sql<number>`count(distinct ${pollVotesTable.userId})::int` })
    .from(pollVotesTable).where(eq(pollVotesTable.pollId, pollId));
  const [selectionRow] = await db.select({ count: sql<number>`count(*)::int` })
    .from(pollVotesTable).where(eq(pollVotesTable.pollId, pollId));
  const mine = await db.select({ optionId: pollVotesTable.optionId }).from(pollVotesTable)
    .where(and(eq(pollVotesTable.pollId, pollId), eq(pollVotesTable.userId, me)));
  const [follow] = await db.select({ id: pollFollowsTable.id }).from(pollFollowsTable)
    .where(and(eq(pollFollowsTable.pollId, pollId), eq(pollFollowsTable.userId, me))).limit(1);
  const [views] = await db.select({ count: sql<number>`count(*)::int` }).from(pollViewsTable).where(eq(pollViewsTable.pollId, pollId));
  const total = participantRow?.count ?? 0;
  const previews = await db.execute(sql`
    SELECT option_id, id, avatar_url AS "avatarUrl",
      concat(first_name, ' ', last_name) AS name
    FROM (
      SELECT v.option_id, u.id, u.avatar_url, u.first_name, u.last_name,
        row_number() OVER (PARTITION BY v.option_id ORDER BY v.voted_at DESC, v.id DESC) AS rn
      FROM poll_votes v JOIN users u ON u.id = v.user_id
      WHERE v.poll_id = ${pollId} AND u.avatar_url IS NOT NULL
    ) ranked WHERE rn <= 5
  `);
  const previewRows = ((previews as any).rows ?? previews) as Array<{ option_id: number; id: number; avatarUrl: string; name: string }>;
  return {
    id: poll.id, creator: { userId: poll.creatorId, name: `${poll.creatorFirstName ?? ""} ${poll.creatorLastName ?? ""}`.trim() || "Utilisateur", avatarUrl: poll.creatorAvatarUrl },
    question: poll.question, multipleChoice: poll.multipleChoice, expiresAt: poll.expiresAt, createdAt: poll.createdAt,
    canManage: poll.creatorId === me, isClosed: !!poll.expiresAt && poll.expiresAt <= new Date(), isPinned: poll.isPinned,
    totalVotes: total, totalSelections: selectionRow?.count ?? 0, uniqueParticipants: total, viewsCount: views?.count ?? 0,
    followedByMe: !!follow, myOptionIds: mine.map(v => v.optionId),
    popular: total >= 100 || (views?.count ?? 0) >= 1000,
    options: options.map(o => ({ id: o.id, text: o.label, position: o.position, voteCount: countMap.get(o.id) ?? 0,
      percentage: total ? Math.round(((countMap.get(o.id) ?? 0) / total) * 10000) / 100 : 0,
      votersPreview: previewRows.filter(a => a.option_id === o.id).map(a => ({ userId: a.id, name: a.name?.trim() || "Utilisateur", avatarUrl: a.avatarUrl })),
      remainingVoters: Math.max(0, (countMap.get(o.id) ?? 0) - previewRows.filter(a => a.option_id === o.id).length),
    })),
  };
}

router.post("/polls", requireAuth, async (req, res): Promise<void> => {
  const { recipientId, question, options, multipleChoice, expiresAt } = req.body ?? {};
  if (!Number.isInteger(recipientId) || recipientId === req.userId || typeof question !== "string" || !question.trim() || question.trim().length > MAX_QUESTION ||
      !Array.isArray(options) || options.length < 2 || options.length > 50 ||
      options.some((x: unknown) => typeof x !== "string" || !(x as string).trim() || (x as string).trim().length > MAX_OPTION) || typeof multipleChoice !== "boolean") {
    res.status(400).json({ error: "Invalid poll input" }); return;
  }
  const me = req.userId!;
  const [recipient] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, recipientId)).limit(1);
  if (!recipient) { res.status(404).json({ error: "Recipient not found" }); return; }
  const [blocked] = await db.select({ id: userBlocksTable.id }).from(userBlocksTable).where(or(
    and(eq(userBlocksTable.blockerId, me), eq(userBlocksTable.blockedId, recipientId)),
    and(eq(userBlocksTable.blockerId, recipientId), eq(userBlocksTable.blockedId, me)),
  )).limit(1);
  if (blocked) { res.status(403).json({ error: "Vous ne pouvez pas envoyer de message à cet utilisateur." }); return; }
  const expiry = expiresAt == null ? null : new Date(expiresAt);
  if (expiry && (Number.isNaN(expiry.getTime()) || expiry <= new Date())) { res.status(400).json({ error: "Expiration must be in the future" }); return; }
  const result = await db.transaction(async tx => {
    const [poll] = await tx.insert(pollsTable).values({ creatorId: me, question: question.trim(), multipleChoice, expiresAt: expiry }).returning();
    const inserted = await tx.insert(pollOptionsTable).values(options.map((label: string, position: number) => ({ pollId: poll.id, label: label.trim(), position }))).returning();
    const [message] = await tx.insert(messagesTable).values({ fromUserId: me, toUserId: recipientId, content: question.trim(), messageType: "poll", pollId: poll.id }).returning();
    return { poll, options: inserted, message };
  });
  const detail = await pollDetail(result.poll.id, me);
  const sseMessage = { ...result.message, messageType: "poll", pollId: result.poll.id };
  pushToUser(recipientId, "message:new", sseMessage);
  res.status(201).json({ message: sseMessage, poll: detail });
});

router.get("/polls/:id", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id);
  if (!Number.isInteger(pollId) || pollId < 1) { res.status(400).json({ error: "Invalid poll id" }); return; }
  if (!await canAccessPoll(pollId, req.userId!)) { res.status(403).json({ error: "Poll access denied" }); return; }
  const detail = await pollDetail(pollId, req.userId!);
  if (!detail) { res.status(404).json({ error: "Poll not found" }); return; }
  res.json(detail);
});

router.patch("/polls/:id", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id);
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const options: unknown = req.body?.options;
  if (!Number.isInteger(pollId) || pollId < 1 || !question || question.length > MAX_QUESTION ||
      !Array.isArray(options) || options.length < 2 || options.length > 50 ||
      options.some(x => typeof x !== "string" || !x.trim() || x.trim().length > MAX_OPTION)) {
    res.status(400).json({ error: "Invalid poll input" }); return;
  }
  const [poll] = await db.select({ creatorId: pollsTable.creatorId }).from(pollsTable).where(eq(pollsTable.id, pollId)).limit(1);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
  if (poll.creatorId !== req.userId) { res.status(403).json({ error: "Only the poll author can edit it" }); return; }
  const currentOptions = await db.select({ id: pollOptionsTable.id }).from(pollOptionsTable)
    .where(eq(pollOptionsTable.pollId, pollId)).orderBy(pollOptionsTable.position);
  if (currentOptions.length !== options.length) {
    res.status(400).json({ error: "The number of options cannot change after publication" }); return;
  }
  await db.transaction(async tx => {
    await tx.update(pollsTable).set({ question }).where(eq(pollsTable.id, pollId));
    await tx.update(messagesTable).set({ content: question }).where(eq(messagesTable.pollId, pollId));
    for (let index = 0; index < currentOptions.length; index += 1) {
      await tx.update(pollOptionsTable).set({ label: (options[index] as string).trim(), position: index })
        .where(eq(pollOptionsTable.id, currentOptions[index].id));
    }
  });
  res.json(await pollDetail(pollId, req.userId!));
});

router.post("/polls/:id/close", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id);
  if (!Number.isInteger(pollId) || pollId < 1) { res.status(400).json({ error: "Invalid poll id" }); return; }
  const [poll] = await db.select({ creatorId: pollsTable.creatorId }).from(pollsTable).where(eq(pollsTable.id, pollId)).limit(1);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
  if (poll.creatorId !== req.userId) { res.status(403).json({ error: "Only the poll author can close it" }); return; }
  await db.update(pollsTable).set({ expiresAt: new Date() }).where(eq(pollsTable.id, pollId));
  res.json(await pollDetail(pollId, req.userId!));
});

router.put("/polls/:id/pin", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id), pinned = req.body?.pinned;
  if (!Number.isInteger(pollId) || pollId < 1 || typeof pinned !== "boolean") { res.status(400).json({ error: "Invalid input" }); return; }
  const [poll] = await db.select({ creatorId: pollsTable.creatorId }).from(pollsTable).where(eq(pollsTable.id, pollId)).limit(1);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
  if (poll.creatorId !== req.userId) { res.status(403).json({ error: "Only the poll author can pin it" }); return; }
  await db.update(pollsTable).set({ isPinned: pinned }).where(eq(pollsTable.id, pollId));
  res.json(await pollDetail(pollId, req.userId!));
});

router.delete("/polls/:id", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id);
  if (!Number.isInteger(pollId) || pollId < 1) { res.status(400).json({ error: "Invalid poll id" }); return; }
  const [poll] = await db.select({ creatorId: pollsTable.creatorId }).from(pollsTable).where(eq(pollsTable.id, pollId)).limit(1);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
  if (poll.creatorId !== req.userId) { res.status(403).json({ error: "Only the poll author can delete it" }); return; }
  await db.transaction(async tx => {
    await tx.delete(messagesTable).where(eq(messagesTable.pollId, pollId));
    await tx.delete(pollsTable).where(eq(pollsTable.id, pollId));
  });
  res.status(204).end();
});

router.post("/polls/:id/votes", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id), optionIds: unknown = req.body?.optionIds;
  if (!Number.isInteger(pollId) || !Array.isArray(optionIds) || optionIds.length < 1 ||
      optionIds.some(x => !Number.isInteger(x)) || new Set(optionIds).size !== optionIds.length) {
    res.status(400).json({ error: "Invalid optionIds" }); return;
  }
  const me = req.userId!;
  if (!await canAccessPoll(pollId, me)) { res.status(403).json({ error: "Poll access denied" }); return; }
  const detail = await db.transaction(async tx => {
    const [poll] = await tx.select().from(pollsTable).where(eq(pollsTable.id, pollId)).for("update");
    if (!poll) return { error: "not_found" as const };
    if (poll.expiresAt && poll.expiresAt <= new Date()) return { error: "expired" as const };
    if (!poll.multipleChoice && optionIds.length !== 1) return { error: "single_choice" as const };
    const owned = await tx.select({ id: pollOptionsTable.id }).from(pollOptionsTable)
      .where(and(eq(pollOptionsTable.pollId, pollId), sql`${pollOptionsTable.id} IN (${sql.join((optionIds as number[]).map(x => sql`${x}`), sql`, `)})`));
    if (owned.length !== optionIds.length) return { error: "option" as const };
    await tx.delete(pollVotesTable).where(and(eq(pollVotesTable.pollId, pollId), eq(pollVotesTable.userId, me)));
    await tx.insert(pollVotesTable).values((optionIds as number[]).map(optionId => ({ pollId, optionId, userId: me })));
    return { ok: true as const };
  });
  if ("error" in detail) { res.status(detail.error === "not_found" ? 404 : 400).json({ error: detail.error }); return; }
  const refreshed = await pollDetail(pollId, me); res.json(refreshed);
});

router.put("/polls/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id), following = req.body?.following;
  if (!Number.isInteger(pollId) || typeof following !== "boolean") { res.status(400).json({ error: "Invalid input" }); return; }
  if (!await canAccessPoll(pollId, req.userId!)) { res.status(403).json({ error: "Poll access denied" }); return; }
  if (following) await db.insert(pollFollowsTable).values({ pollId, userId: req.userId! }).onConflictDoNothing();
  else await db.delete(pollFollowsTable).where(and(eq(pollFollowsTable.pollId, pollId), eq(pollFollowsTable.userId, req.userId!)));
  res.json({ followedByMe: following });
});

router.post("/polls/:id/view", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id);
  if (!Number.isInteger(pollId) || pollId < 1 || !await canAccessPoll(pollId, req.userId!)) { res.status(403).json({ error: "Poll access denied" }); return; }
  await db.insert(pollViewsTable).values({ pollId, userId: req.userId! }).onConflictDoNothing();
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(pollViewsTable).where(eq(pollViewsTable.pollId, pollId));
  res.json({ viewsCount: row?.count ?? 0 });
});

router.get("/polls/:id/voters", requireAuth, async (req, res): Promise<void> => {
  const pollId = Number(req.params.id), optionId = req.query.optionId ? Number(req.query.optionId) : null;
  if (!Number.isInteger(pollId) || pollId < 1 || !await canAccessPoll(pollId, req.userId!)) { res.status(403).json({ error: "Poll access denied" }); return; }
  if (optionId !== null && (!Number.isInteger(optionId) || !(await db.select({ id: pollOptionsTable.id }).from(pollOptionsTable).where(and(eq(pollOptionsTable.id, optionId), eq(pollOptionsTable.pollId, pollId))).limit(1))[0])) { res.status(400).json({ error: "Invalid option filter" }); return; }
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50), cursor = decodeCursor(req.query.cursor);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const cursorWhere = cursor ? sql`AND (latest_voted_at, user_id) < (${new Date(cursor.votedAt)}, ${cursor.userId})` : sql``;
  const optionWhere = optionId ? sql`AND v.option_id = ${optionId}` : sql``;
  const searchWhere = search ? sql`AND concat(u.first_name, ' ', u.last_name) ILIKE ${`%${search}%`}` : sql``;
  const raw = await db.execute(sql`
    SELECT user_id, latest_voted_at, first_name, last_name, avatar_url
    FROM (
      SELECT v.user_id, max(v.voted_at) AS latest_voted_at, u.first_name, u.last_name, u.avatar_url
      FROM poll_votes v JOIN users u ON u.id = v.user_id
      WHERE v.poll_id = ${pollId} ${optionWhere} ${searchWhere}
      GROUP BY v.user_id, u.first_name, u.last_name, u.avatar_url
    ) voters WHERE 1=1 ${cursorWhere}
    ORDER BY latest_voted_at DESC, user_id DESC LIMIT ${limit + 1}
  `);
  const rows = ((raw as any).rows ?? raw) as Array<{ user_id: number; latest_voted_at: Date; first_name: string; last_name: string; avatar_url: string | null }>;
  const page = rows.slice(0, limit);
  const ids = page.map(r => r.user_id);
  const selections = ids.length ? await db.select({ userId: pollVotesTable.userId, optionId: pollVotesTable.optionId, label: pollOptionsTable.label })
    .from(pollVotesTable).leftJoin(pollOptionsTable, eq(pollVotesTable.optionId, pollOptionsTable.id))
    .where(and(eq(pollVotesTable.pollId, pollId), inArray(pollVotesTable.userId, ids))) : [];
  const byUser = new Map<number, typeof selections>();
  for (const s of selections) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]);
  const voters = page.map(r => ({ userId: r.user_id, name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Utilisateur", avatarUrl: r.avatar_url, isOnline: getPresence(r.user_id).online, votedAt: r.latest_voted_at, optionIds: (byUser.get(r.user_id) ?? []).map(x => x.optionId), optionLabels: (byUser.get(r.user_id) ?? []).map(x => x.label) }));
  const next = rows.length > limit ? encodeCursor(page[page.length - 1].latest_voted_at, page[page.length - 1].user_id) : null;
  res.json({ voters, nextCursor: next });
});

export default router;