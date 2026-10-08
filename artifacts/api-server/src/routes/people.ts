import { Router } from "express";
import { db, usersTable, friendRequestsTable, notificationsTable } from "@workspace/db";
import { friendshipsTable, followsTable, countriesTable, suggestionsTable, referralsTable } from "@workspace/db";
import { eq, and, or, ne, sql, desc, not, inArray, ilike } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const FLAG: Record<string, string> = {
  BJ:"🇧🇯", TG:"🇹🇬", SN:"🇸🇳", CI:"🇨🇮", BF:"🇧🇫",
  NE:"🇳🇪", ML:"🇲🇱", CM:"🇨🇲", GH:"🇬🇭", NG:"🇳🇬",
};
const flag = (code: string) => FLAG[code] ?? "🌍";

async function userShape(row: {
  id:number; firstName:string; lastName:string; avatarUrl:string|null;
  country:string; bio:string|null; role:string; score?:number|null;
  followersCount?:number|null; followingCount?:number|null;
  friendsCount?:number|null; verified?:boolean|null; createdAt:Date;
}, meId: number, opts?: { mutualCount?: number }) {
  return {
    id:            row.id,
    fullname:      `${row.firstName} ${row.lastName}`,
    username:      `${row.firstName.toLowerCase()}${row.id}`,
    avatar:        row.avatarUrl ?? null,
    country:       row.country,
    flag:          flag(row.country),
    bio:           row.bio,
    role:          row.role,
    score:         row.score ?? 0,
    followersCount:row.followersCount ?? 0,
    followingCount:row.followingCount ?? 0,
    friendsCount:  row.friendsCount ?? 0,
    verified:      row.verified ?? false,
    mutualFriends: opts?.mutualCount ?? 0,
    createdAt:     row.createdAt,
  };
}

/* ─── Countries ─────────────────────────────────────────────────────────── */
router.get("/countries", async (_req, res): Promise<void> => {
  const rows = await db.select().from(countriesTable).orderBy(countriesTable.name);
  res.json(rows.map(r => ({ ...r, flag: flag(r.code) })));
});

/* ─── People: Suggestions ──────────────────────────────────────────────── */
router.get("/people/suggestions", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const limit = Math.min(parseInt(String((req.query as any).limit ?? 20), 10), 50);
  const country = (req.query as any).country as string | undefined;

  const [me] = await db.select({ country: usersTable.country })
    .from(usersTable).where(eq(usersTable.id, meId));
  if (!me) { res.json([]); return; }

  const myFriendRows = await db.select({ friendId: friendshipsTable.friendId })
    .from(friendshipsTable).where(eq(friendshipsTable.userId, meId));
  const myFriendIds = myFriendRows.map(r => r.friendId);

  const sentReqRows = await db.select({ toUserId: friendRequestsTable.toUserId })
    .from(friendRequestsTable)
    .where(and(eq(friendRequestsTable.fromUserId, meId), eq(friendRequestsTable.status, "pending")));
  const sentIds = sentReqRows.map(r => r.toUserId);

  const excludeIds = [...new Set([meId, ...myFriendIds, ...sentIds])];

  let q = db.select({
    id: usersTable.id,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl,
    country: usersTable.country,
    bio: usersTable.bio,
    role: usersTable.role,
    score: sql<number>`COALESCE(${usersTable.score}, 0)`,
    verified: sql<boolean>`COALESCE(${usersTable.verified}, false)`,
    followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
    followingCount: sql<number>`COALESCE(${usersTable.followingCount}, 0)`,
    friendsCount: sql<number>`COALESCE(${usersTable.friendsCount}, 0)`,
    createdAt: usersTable.createdAt,
  }).from(usersTable);

  const conditions = [ne(usersTable.id, meId)];
  if (excludeIds.length > 0) {
    conditions.push(not(inArray(usersTable.id, excludeIds)));
  }
  if (country) conditions.push(eq(usersTable.country, country));

  const rows = await q.where(and(...conditions))
    .orderBy(desc(sql`CASE WHEN ${usersTable.country} = ${me.country} THEN 1 ELSE 0 END`), desc(usersTable.score))
    .limit(limit);

  const results = await Promise.all(rows.map(async r => {
    let mutualCount = 0;
    if (myFriendIds.length > 0) {
      const [m] = await db.select({ cnt: sql<number>`COUNT(*)` })
        .from(friendshipsTable)
        .where(and(eq(friendshipsTable.userId, r.id), inArray(friendshipsTable.friendId, myFriendIds)));
      mutualCount = Number(m?.cnt ?? 0);
    }
    return userShape(r, meId, { mutualCount });
  }));
  res.json(results);
});

/* ─── People: Popular ──────────────────────────────────────────────────── */
router.get("/people/popular", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const limit = Math.min(parseInt(String((req.query as any).limit ?? 10), 10), 30);
  const rows = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl, country: usersTable.country, bio: usersTable.bio,
    role: usersTable.role, createdAt: usersTable.createdAt,
    score: sql<number>`COALESCE(${usersTable.score}, 0)`,
    verified: sql<boolean>`COALESCE(${usersTable.verified}, false)`,
    followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
    followingCount: sql<number>`COALESCE(${usersTable.followingCount}, 0)`,
    friendsCount: sql<number>`COALESCE(${usersTable.friendsCount}, 0)`,
  }).from(usersTable)
    .where(ne(usersTable.id, meId))
    .orderBy(desc(sql`COALESCE(${usersTable.followersCount}, 0)`), desc(sql`COALESCE(${usersTable.score}, 0)`))
    .limit(limit);
  const results = await Promise.all(rows.map(r => userShape(r, meId)));

  const followedRows = await db.select({ followingId: followsTable.followingId })
    .from(followsTable).where(eq(followsTable.followerId, meId));
  const followedIds = new Set(followedRows.map(r => r.followingId));
  res.json(results.map(u => ({ ...u, isFollowing: followedIds.has(u.id) })));
});

/* ─── People: New Members ──────────────────────────────────────────────── */
router.get("/people/new", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const limit = Math.min(parseInt(String((req.query as any).limit ?? 10), 10), 30);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
  const rows = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl, country: usersTable.country, bio: usersTable.bio,
    role: usersTable.role, createdAt: usersTable.createdAt,
    score: sql<number>`COALESCE(${usersTable.score}, 0)`,
    verified: sql<boolean>`COALESCE(${usersTable.verified}, false)`,
    followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
    followingCount: sql<number>`COALESCE(${usersTable.followingCount}, 0)`,
    friendsCount: sql<number>`COALESCE(${usersTable.friendsCount}, 0)`,
  }).from(usersTable)
    .where(and(ne(usersTable.id, meId), sql`${usersTable.createdAt} >= ${thirtyDaysAgo}`))
    .orderBy(desc(usersTable.createdAt))
    .limit(limit);
  const results = await Promise.all(rows.map(r => userShape(r, meId)));

  const followedRows = await db.select({ followingId: followsTable.followingId })
    .from(followsTable).where(eq(followsTable.followerId, meId));
  const followedIds = new Set(followedRows.map(r => r.followingId));
  res.json(results.map(u => ({ ...u, isFollowing: followedIds.has(u.id) })));
});

/* ─── Friends: List ────────────────────────────────────────────────────── */
router.get("/friends/list", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const friendRows = await db.select({ friendId: friendshipsTable.friendId, createdAt: friendshipsTable.createdAt })
    .from(friendshipsTable).where(eq(friendshipsTable.userId, meId))
    .orderBy(desc(friendshipsTable.createdAt));
  if (friendRows.length === 0) { res.json([]); return; }
  const friendIds = friendRows.map(r => r.friendId);
  const users = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl, country: usersTable.country, bio: usersTable.bio,
    role: usersTable.role, createdAt: usersTable.createdAt,
    score: sql<number>`COALESCE(${usersTable.score}, 0)`,
    verified: sql<boolean>`COALESCE(${usersTable.verified}, false)`,
    followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
    followingCount: sql<number>`COALESCE(${usersTable.followingCount}, 0)`,
    friendsCount: sql<number>`COALESCE(${usersTable.friendsCount}, 0)`,
  }).from(usersTable).where(inArray(usersTable.id, friendIds));
  const results = await Promise.all(users.map(r => userShape(r, meId)));
  res.json(results);
});

/* ─── Friends: Incoming Requests ───────────────────────────────────────── */
router.get("/friends/requests", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const reqs = await db.select({
    id: friendRequestsTable.id,
    fromUserId: friendRequestsTable.fromUserId,
    createdAt: friendRequestsTable.createdAt,
  }).from(friendRequestsTable)
    .where(and(eq(friendRequestsTable.toUserId, meId), eq(friendRequestsTable.status, "pending")))
    .orderBy(desc(friendRequestsTable.createdAt));
  if (reqs.length === 0) { res.json([]); return; }
  const senderIds = reqs.map(r => r.fromUserId);
  const senders = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl, country: usersTable.country, bio: usersTable.bio,
    role: usersTable.role, createdAt: usersTable.createdAt,
    score: sql<number>`COALESCE(${usersTable.score}, 0)`,
    verified: sql<boolean>`COALESCE(${usersTable.verified}, false)`,
    followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
    followingCount: sql<number>`COALESCE(${usersTable.followingCount}, 0)`,
    friendsCount: sql<number>`COALESCE(${usersTable.friendsCount}, 0)`,
  }).from(usersTable).where(inArray(usersTable.id, senderIds));
  const senderMap = new Map(senders.map(s => [s.id, s]));
  const result = await Promise.all(reqs.map(async r => {
    const s = senderMap.get(r.fromUserId);
    if (!s) return null;
    const u = await userShape(s, meId);
    return { requestId: r.id, ...u };
  }));
  res.json(result.filter(Boolean));
});

/* ─── Friends: Send Request ────────────────────────────────────────────── */
router.post("/friends/request/:userId", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const toId = parseInt(req.params.userId, 10);
  if (isNaN(toId) || toId === meId) { res.status(400).json({ error: "Invalid" }); return; }
  try {
    await db.insert(friendRequestsTable).values({ fromUserId: meId, toUserId: toId, status: "pending" })
      .onConflictDoNothing();
    const [toUser] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, avatarUrl: usersTable.avatarUrl })
      .from(usersTable).where(eq(usersTable.id, meId));
    if (toUser) {
      await db.insert(notificationsTable).values({
        userId: toId, type: "friend_request", actorId: meId,
        actorName: `${toUser.firstName} ${toUser.lastName}`,
        actorAvatarUrl: toUser.avatarUrl ?? undefined,
        action: "vous a envoyé une demande d'ami", link: `/profile/${meId}`,
      }).catch(() => {});
    }
    res.json({ ok: true });
  } catch { res.status(409).json({ error: "Already sent" }); }
});

/* ─── Friends: Accept ──────────────────────────────────────────────────── */
router.post("/friends/accept/:requestId", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const reqId = parseInt(req.params.requestId, 10);
  const [req2] = await db.select().from(friendRequestsTable)
    .where(and(eq(friendRequestsTable.id, reqId), eq(friendRequestsTable.toUserId, meId), eq(friendRequestsTable.status, "pending")));
  if (!req2) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(friendRequestsTable).set({ status: "accepted" }).where(eq(friendRequestsTable.id, reqId));
  await db.insert(friendshipsTable).values([
    { userId: meId, friendId: req2.fromUserId },
    { userId: req2.fromUserId, friendId: meId },
  ]).onConflictDoNothing();
  await db.execute(sql`UPDATE users SET friends_count = friends_count + 1 WHERE id IN (${meId}, ${req2.fromUserId})`).catch(() => {});
  res.json({ ok: true });
});

/* ─── Friends: Reject ──────────────────────────────────────────────────── */
router.post("/friends/reject/:requestId", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const reqId = parseInt(req.params.requestId, 10);
  await db.update(friendRequestsTable).set({ status: "rejected" })
    .where(and(eq(friendRequestsTable.id, reqId), eq(friendRequestsTable.toUserId, meId)));
  res.json({ ok: true });
});

/* ─── Friends: Remove ──────────────────────────────────────────────────── */
router.delete("/friends/remove/:userId", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const otherId = parseInt(req.params.userId, 10);
  await db.delete(friendshipsTable).where(or(
    and(eq(friendshipsTable.userId, meId), eq(friendshipsTable.friendId, otherId)),
    and(eq(friendshipsTable.userId, otherId), eq(friendshipsTable.friendId, meId)),
  ));
  await db.execute(sql`UPDATE users SET friends_count = GREATEST(friends_count - 1, 0) WHERE id IN (${meId}, ${otherId})`).catch(() => {});
  res.json({ ok: true });
});

/* ─── Follow ───────────────────────────────────────────────────────────── */
router.post("/follow/:userId", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const targetId = parseInt(req.params.userId, 10);
  if (isNaN(targetId) || targetId === meId) { res.status(400).json({ error: "Invalid" }); return; }
  await db.insert(followsTable).values({ followerId: meId, followingId: targetId }).onConflictDoNothing();
  await db.execute(sql`UPDATE users SET following_count = following_count + 1 WHERE id = ${meId}`).catch(() => {});
  await db.execute(sql`UPDATE users SET followers_count = followers_count + 1 WHERE id = ${targetId}`).catch(() => {});
  res.json({ ok: true });
});

router.delete("/follow/:userId", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const targetId = parseInt(req.params.userId, 10);
  await db.delete(followsTable).where(and(eq(followsTable.followerId, meId), eq(followsTable.followingId, targetId)));
  await db.execute(sql`UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = ${meId}`).catch(() => {});
  await db.execute(sql`UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = ${targetId}`).catch(() => {});
  res.json({ ok: true });
});

/* ─── Followers / Following ─────────────────────────────────────────────── */
router.get("/followers", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const rows = await db.select({ followerId: followsTable.followerId })
    .from(followsTable).where(eq(followsTable.followingId, meId)).orderBy(desc(followsTable.createdAt)).limit(50);
  if (!rows.length) { res.json([]); return; }
  const ids = rows.map(r => r.followerId);
  const users = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl, country: usersTable.country, bio: usersTable.bio,
    role: usersTable.role, createdAt: usersTable.createdAt,
    score: sql<number>`COALESCE(${usersTable.score}, 0)`,
    verified: sql<boolean>`COALESCE(${usersTable.verified}, false)`,
    followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
    followingCount: sql<number>`COALESCE(${usersTable.followingCount}, 0)`,
    friendsCount: sql<number>`COALESCE(${usersTable.friendsCount}, 0)`,
  }).from(usersTable).where(inArray(usersTable.id, ids));
  res.json(await Promise.all(users.map(r => userShape(r, meId))));
});

router.get("/following", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const rows = await db.select({ followingId: followsTable.followingId })
    .from(followsTable).where(eq(followsTable.followerId, meId)).orderBy(desc(followsTable.createdAt)).limit(50);
  if (!rows.length) { res.json([]); return; }
  const ids = rows.map(r => r.followingId);
  const users = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl, country: usersTable.country, bio: usersTable.bio,
    role: usersTable.role, createdAt: usersTable.createdAt,
    score: sql<number>`COALESCE(${usersTable.score}, 0)`,
    verified: sql<boolean>`COALESCE(${usersTable.verified}, false)`,
    followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
    followingCount: sql<number>`COALESCE(${usersTable.followingCount}, 0)`,
    friendsCount: sql<number>`COALESCE(${usersTable.friendsCount}, 0)`,
  }).from(usersTable).where(inArray(usersTable.id, ids));
  res.json(await Promise.all(users.map(r => userShape(r, meId))));
});

/* ─── Search ─────────────────────────────────────────────────────────────── */
router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const q = String((req.query as any).q ?? "").trim();
  if (!q) { res.json({ users: [], groups: [] }); return; }
  const country = (req.query as any).country as string | undefined;
  const conds = [
    ne(usersTable.id, meId),
    or(
      ilike(sql`concat(${usersTable.firstName}, ' ', ${usersTable.lastName})`, `%${q}%`),
      ilike(usersTable.bio, `%${q}%`),
    )!,
  ];
  if (country) conds.push(eq(usersTable.country, country));
  const users = await db.select({
    id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl, country: usersTable.country, bio: usersTable.bio,
    role: usersTable.role, createdAt: usersTable.createdAt,
    score: sql<number>`COALESCE(${usersTable.score}, 0)`,
    verified: sql<boolean>`COALESCE(${usersTable.verified}, false)`,
    followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
    followingCount: sql<number>`COALESCE(${usersTable.followingCount}, 0)`,
    friendsCount: sql<number>`COALESCE(${usersTable.friendsCount}, 0)`,
  }).from(usersTable).where(and(...conds))
    .orderBy(desc(sql`COALESCE(${usersTable.score}, 0)`)).limit(20);
  const results = await Promise.all(users.map(r => userShape(r, meId)));
  res.json({ users: results, groups: [] });
});

/* ─── Invite (Referral) ─────────────────────────────────────────────────── */
router.post("/invite", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const method = String((req.body as any)?.method ?? "link");
  const [row] = await db.insert(referralsTable)
    .values({ inviterId: meId, method })
    .returning({ inviteKey: referralsTable.inviteKey });
  const link = `${process.env.APP_URL ?? "https://brutepawa.com"}/join?ref=${row?.inviteKey}`;
  res.json({ ok: true, link, key: row?.inviteKey });
});

/* ─── Pending friend request count (for badge) ─────────────────────────── */
router.get("/friends/pending-count", requireAuth, async (req, res): Promise<void> => {
  const meId = (req as any).userId as number;
  const [row] = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(friendRequestsTable)
    .where(and(eq(friendRequestsTable.toUserId, meId), eq(friendRequestsTable.status, "pending")));
  res.json({ count: Number(row?.cnt ?? 0) });
});

export { router as peopleRouter };
