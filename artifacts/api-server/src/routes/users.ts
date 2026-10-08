import { Router } from "express";
import { db, usersTable, friendRequestsTable, userBlocksTable, userReportsTable, userHiddenProfilesTable, followsTable, postsTable, notificationsTable, chatGroupsTable, chatGroupMembersTable } from "@workspace/db";
import { eq, or, and, ne, ilike, sql, inArray } from "drizzle-orm";
import { UpdateMeBody, GetUserParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { pushToUserDevice } from "./push";
import { extractKeyFromUrl, ownerIdFromKey } from "../lib/r2";
import { releaseStorage } from "../lib/storage";
import { getPresence } from "../lib/presenceStore";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id, firstName: user.firstName, lastName: user.lastName,
    email: user.email, phone: user.phone, country: user.country,
    avatarUrl: user.avatarUrl, coverUrl: user.coverUrl, bio: user.bio,
    role: user.role, status: user.status, createdAt: user.createdAt,
    profileLocked: user.profileLocked ?? false,
    badgeType: user.badgeType,
    verified: user.verified ?? false,
  };
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.post("/users/me/pro", requireAuth, async (req, res): Promise<void> => {
  await db.update(usersTable).set({ role: "creator" }).where(eq(usersTable.id, req.userId!));
  res.json({ ok: true });
});

router.delete("/users/me/pro", requireAuth, async (req, res): Promise<void> => {
  await db.update(usersTable).set({ role: "user" }).where(eq(usersTable.id, req.userId!));
  res.json({ ok: true });
});

router.get("/users/:id/presence", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  res.json(getPresence(id));
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Fetch current user to find old R2 keys before overwriting them
  const [current] = await db.select({ avatarUrl: usersTable.avatarUrl, coverUrl: usersTable.coverUrl })
    .from(usersTable).where(eq(usersTable.id, req.userId!));

  const [user] = await db.update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, req.userId!))
    .returning();

  // Best-effort cleanup: delete old avatar/cover from R2 if they were replaced
  if (current) {
    const toDelete: (string | null)[] = [];
    if (parsed.data.avatarUrl && parsed.data.avatarUrl !== current.avatarUrl)
      toDelete.push(extractKeyFromUrl(current.avatarUrl));
    if (parsed.data.coverUrl && parsed.data.coverUrl !== current.coverUrl)
      toDelete.push(extractKeyFromUrl(current.coverUrl));

    const validKeys = toDelete.filter((k): k is string => !!k && ownerIdFromKey(k) === req.userId!);
    await releaseStorage(validKeys);
  }

  res.json(formatUser(user));
});

// Returns all users (except self) with their friendship status relative to the caller
// Supports ?q= for name search, ?country= for country filter
router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const country = typeof req.query.country === "string" && req.query.country.trim()
    ? req.query.country.trim()
    : null;

  const baseCondition = ne(usersTable.id, me);
  const searchCondition = q
    ? or(
        ilike(sql`(${usersTable.firstName} || ' ' || ${usersTable.lastName})`, `%${q}%`),
        ilike(usersTable.firstName, `%${q}%`),
        ilike(usersTable.lastName, `%${q}%`)
      )
    : undefined;
  const countryCondition = country ? eq(usersTable.country, country) : undefined;

  const allConditions = [baseCondition, searchCondition, countryCondition].filter(Boolean) as Parameters<typeof and>;
  const whereClause = allConditions.length > 1 ? and(...allConditions) : allConditions[0];

  const [allUsers, allRequests] = await Promise.all([
    db.select({
      id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
      country: usersTable.country, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio,
      role: usersTable.role, badgeType: usersTable.badgeType, verified: usersTable.verified,
    }).from(usersTable).where(whereClause),

    db.select().from(friendRequestsTable).where(
      or(eq(friendRequestsTable.fromUserId, me), eq(friendRequestsTable.toUserId, me))
    ),
  ]);

  type RelStatus = "none" | "pending_sent" | "pending_received" | "friends";
  const result = allUsers.map(u => {
    const req = allRequests.find(r =>
      (r.fromUserId === me && r.toUserId === u.id) ||
      (r.toUserId === me && r.fromUserId === u.id)
    );
    let friendshipStatus: RelStatus = "none";
    let requestId: number | undefined;
    if (req) {
      requestId = req.id;
      if (req.status === "accepted") friendshipStatus = "friends";
      else if (req.fromUserId === me) friendshipStatus = "pending_sent";
      else friendshipStatus = "pending_received";
    }
    return { ...u, avatarUrl: u.avatarUrl, friendshipStatus, requestId };
  });

  res.json(result);
});

// Incoming pending friend requests (people who sent a request to me)
router.get("/users/me/friend-requests", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const rows = await db
    .select({
      requestId: friendRequestsTable.id,
      createdAt: friendRequestsTable.createdAt,
      fromUserId: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      country: usersTable.country,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    })
    .from(friendRequestsTable)
    .innerJoin(usersTable, eq(usersTable.id, friendRequestsTable.fromUserId))
    .where(and(eq(friendRequestsTable.toUserId, me), eq(friendRequestsTable.status, "pending")));

  res.json(rows.map(r => ({
    id: r.requestId,
    createdAt: r.createdAt,
    fromUser: {
      id: r.fromUserId, firstName: r.firstName, lastName: r.lastName,
      country: r.country, avatarUrl: r.avatarUrl, bio: r.bio,
    },
  })));
});

// Accepted friends list
router.get("/users/me/friends", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rows = await db
    .select({
      id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName,
      country: usersTable.country, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio,
    })
    .from(usersTable)
    .innerJoin(
      friendRequestsTable,
      or(
        and(eq(friendRequestsTable.fromUserId, userId), eq(friendRequestsTable.toUserId, usersTable.id)),
        and(eq(friendRequestsTable.toUserId, userId), eq(friendRequestsTable.fromUserId, usersTable.id))
      )
    )
    .where(eq(friendRequestsTable.status, "accepted"));
  res.json(rows);
});

// Send a friend request
router.post("/users/:id/friend-request", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId) || targetId === me) { res.status(400).json({ error: "Invalid target" }); return; }

  // Check if already exists in either direction
  const [existing] = await db.select().from(friendRequestsTable).where(
    or(
      and(eq(friendRequestsTable.fromUserId, me), eq(friendRequestsTable.toUserId, targetId)),
      and(eq(friendRequestsTable.fromUserId, targetId), eq(friendRequestsTable.toUserId, me))
    )
  );
  if (existing) { res.status(409).json({ error: "Request already exists", requestId: existing.id, status: existing.status }); return; }

  const [row] = await db.insert(friendRequestsTable)
    .values({ fromUserId: me, toUserId: targetId, status: "pending" })
    .returning();

  // Push + DB notification to target
  const [requester] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, me));
  const requesterName = requester ? `${requester.firstName} ${requester.lastName}`.trim() : "Quelqu'un";
  pushToUserDevice(targetId, {
    title: "Brute Pawa",
    body: `${requesterName} vous a envoyé une demande d'amitié`,
    tag: `friend-req-${row.id}`,
    data: { url: "/community" },
  }).catch(() => {});
  db.insert(notificationsTable).values({
    userId: targetId,
    type: "friend",
    actorId: me,
    actorName: requesterName,
    action: "vous a envoyé une demande d'amitié",
    link: `/profile/${me}`,
  }).catch(() => {});

  res.status(201).json({ id: row.id, status: row.status });
});

// Accept a friend request (receiver only)
router.post("/friends/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const requestId = Number(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(friendRequestsTable).where(eq(friendRequestsTable.id, requestId));
  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  if (row.toUserId !== me) { res.status(403).json({ error: "Forbidden" }); return; }
  if (row.status !== "pending") { res.status(409).json({ error: "Already processed" }); return; }

  await db.update(friendRequestsTable).set({ status: "accepted" }).where(eq(friendRequestsTable.id, requestId));

  // Push + DB notification to the original requester
  const [acceptor] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, me));
  const acceptorName = acceptor ? `${acceptor.firstName} ${acceptor.lastName}`.trim() : "Quelqu'un";
  pushToUserDevice(row.fromUserId, {
    title: "Brute Pawa",
    body: `${acceptorName} a accepté votre demande d'amitié 🎉`,
    tag: `friend-accept-${requestId}`,
    data: { url: `/profile/${me}` },
  }).catch(() => {});
  db.insert(notificationsTable).values({
    userId: row.fromUserId,
    type: "friend",
    actorId: me,
    actorName: acceptorName,
    action: "a accepté votre demande d'amitié",
    link: `/profile/${me}`,
  }).catch(() => {});

  res.json({ ok: true });
});

// Reject or cancel a friend request
router.delete("/friends/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const requestId = Number(req.params.id);
  if (isNaN(requestId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db.select().from(friendRequestsTable).where(eq(friendRequestsTable.id, requestId));
  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  if (row.fromUserId !== me && row.toUserId !== me) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(friendRequestsTable).where(eq(friendRequestsTable.id, requestId));
  res.json({ ok: true });
});

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.get("/users/:id/stats", requireAuth, async (req, res): Promise<void> => {
  const targetId = Number(req.params.id);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [[postRow], [followersRow], [followingRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.authorId, targetId)),
    db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, targetId)),
    db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followerId, targetId)),
  ]);
  res.json({
    postsCount: postRow?.count ?? 0,
    followersCount: followersRow?.count ?? 0,
    followingCount: followingRow?.count ?? 0,
  });
});

// List all users blocked by the caller
router.get("/users/me/blocks", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const rows = await db
    .select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(userBlocksTable)
    .innerJoin(usersTable, eq(usersTable.id, userBlocksTable.blockedId))
    .where(eq(userBlocksTable.blockerId, me));
  res.json(rows);
});

// Block a user
router.post("/users/:id/block", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId) || targetId === me) { res.status(400).json({ error: "Invalid target" }); return; }

  await db.insert(userBlocksTable)
    .values({ blockerId: me, blockedId: targetId })
    .onConflictDoNothing();
  res.status(201).json({ ok: true });
});

// Unblock a user
router.delete("/users/:id/block", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid target" }); return; }

  await db.delete(userBlocksTable)
    .where(and(eq(userBlocksTable.blockerId, me), eq(userBlocksTable.blockedId, targetId)));
  res.json({ ok: true });
});

// Check if caller has blocked a user
router.get("/users/:id/block", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid target" }); return; }

  const [row] = await db.select().from(userBlocksTable)
    .where(and(eq(userBlocksTable.blockerId, me), eq(userBlocksTable.blockedId, targetId)));
  res.json({ blocked: !!row });
});

// Follow / unfollow
router.post("/users/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId) || targetId === me) { res.status(400).json({ error: "Invalid target" }); return; }
  const action = req.body.action === "unfollow" ? "unfollow" : "follow";
  if (action === "follow") {
    await db.insert(followsTable).values({ followerId: me, followingId: targetId }).onConflictDoNothing();
  } else {
    await db.delete(followsTable).where(and(eq(followsTable.followerId, me), eq(followsTable.followingId, targetId)));
  }
  res.json({ ok: true, action });
});

// Batch check which user IDs the current user follows
router.post("/users/follows/check", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const ids: number[] = Array.isArray(req.body.ids) ? req.body.ids.filter(Number.isInteger) : [];
  if (ids.length === 0) { res.json({ following: [] }); return; }
  const rows = await db.select({ followingId: followsTable.followingId })
    .from(followsTable)
    .where(and(eq(followsTable.followerId, me), inArray(followsTable.followingId, ids)));
  res.json({ following: rows.map(r => r.followingId) });
});

// Toggle profile lock
router.patch("/users/me/profile-lock", requireAuth, async (req, res): Promise<void> => {
  const locked = Boolean(req.body.locked);
  await db.update(usersTable).set({ profileLocked: locked }).where(eq(usersTable.id, req.userId!));
  res.json({ ok: true, profileLocked: locked });
});

// Report a user
router.post("/users/:id/report", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId) || targetId === me) { res.status(400).json({ error: "Invalid target" }); return; }

  const reason = typeof req.body.reason === "string" && req.body.reason.trim()
    ? req.body.reason.trim()
    : "Aucune raison précisée";
  const description = typeof req.body.description === "string" && req.body.description.trim()
    ? req.body.description.trim()
    : null;

  await db.insert(userReportsTable).values({ reporterId: me, reportedId: targetId, reason, description });
  res.status(201).json({ ok: true });
});

// Mutual friends between caller and target
router.get("/users/:id/mutual-friends", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId) || targetId === me) { res.status(400).json({ error: "Invalid target" }); return; }

  const myRows = await db.select({ fromUserId: friendRequestsTable.fromUserId, toUserId: friendRequestsTable.toUserId })
    .from(friendRequestsTable)
    .where(and(eq(friendRequestsTable.status, "accepted"), or(eq(friendRequestsTable.fromUserId, me), eq(friendRequestsTable.toUserId, me))));
  const myFriendIds = myRows.map(r => r.fromUserId === me ? r.toUserId : r.fromUserId);
  if (myFriendIds.length === 0) { res.json([]); return; }

  const theirRows = await db.select({ fromUserId: friendRequestsTable.fromUserId, toUserId: friendRequestsTable.toUserId })
    .from(friendRequestsTable)
    .where(and(eq(friendRequestsTable.status, "accepted"), or(eq(friendRequestsTable.fromUserId, targetId), eq(friendRequestsTable.toUserId, targetId))));
  const theirFriendSet = new Set(theirRows.map(r => r.fromUserId === targetId ? r.toUserId : r.fromUserId));

  const mutualIds = myFriendIds.filter(id => theirFriendSet.has(id) && id !== targetId);
  if (mutualIds.length === 0) { res.json([]); return; }

  const users = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, avatarUrl: usersTable.avatarUrl, country: usersTable.country })
    .from(usersTable).where(inArray(usersTable.id, mutualIds));
  res.json(users);
});

// Mutual groups between caller and target
router.get("/users/:id/mutual-groups", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId) || targetId === me) { res.status(400).json({ error: "Invalid target" }); return; }

  const myGroups = await db.select({ groupId: chatGroupMembersTable.groupId })
    .from(chatGroupMembersTable).where(eq(chatGroupMembersTable.userId, me));
  const myGroupIds = myGroups.map(r => r.groupId);
  if (myGroupIds.length === 0) { res.json([]); return; }

  const theirGroups = await db.select({ groupId: chatGroupMembersTable.groupId })
    .from(chatGroupMembersTable).where(and(eq(chatGroupMembersTable.userId, targetId), inArray(chatGroupMembersTable.groupId, myGroupIds)));
  const mutualGroupIds = theirGroups.map(r => r.groupId);
  if (mutualGroupIds.length === 0) { res.json([]); return; }

  const groups = await db.select({ id: chatGroupsTable.id, name: chatGroupsTable.name, avatarUrl: chatGroupsTable.avatarUrl, type: chatGroupsTable.type })
    .from(chatGroupsTable).where(inArray(chatGroupsTable.id, mutualGroupIds));
  res.json(groups);
});

// Hide a user (from suggestions / feed)
router.post("/users/:id/hide", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const targetId = Number(req.params.id);
  if (isNaN(targetId) || targetId === me) { res.status(400).json({ error: "Invalid target" }); return; }
  await db.insert(userHiddenProfilesTable).values({ hiderId: me, hiddenId: targetId }).onConflictDoNothing();
  res.status(201).json({ ok: true });
});

export default router;
