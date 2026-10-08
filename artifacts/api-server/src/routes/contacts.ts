import { Router } from "express";
import { sql, eq, and, or, desc, ilike } from "drizzle-orm";
import {
  db, usersTable, friendRequestsTable, friendshipsTable,
  userBlocksTable, userReportsTable,
  chatGroupsTable, chatGroupMembersTable,
  messagesTable, notificationsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getPresence } from "../lib/presenceStore";
import { pushToUserDevice } from "./push";

const router = Router();

function rows(result: unknown): any[] {
  if (Array.isArray(result)) return result;
  const r = result as any;
  return r?.rows ?? r?.rowCount !== undefined ? (r?.rows ?? []) : [];
}

function firstRow(result: unknown): any | null {
  const arr = rows(result);
  return arr[0] ?? null;
}

/* ─────────────────────────────────────────────────────────────
   GET /contacts/:userId  — profile + all relationship flags
───────────────────────────────────────────────────────────── */
router.get("/contacts/:userId", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, otherId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const rawPresence = getPresence(otherId);

  const [muteRow, pinRow, favRow] = await Promise.all([
    db.execute(sql`SELECT * FROM muted_conversations WHERE user_id = ${myId} AND other_user_id = ${otherId} LIMIT 1`),
    db.execute(sql`SELECT * FROM pinned_conversations WHERE user_id = ${myId} AND other_user_id = ${otherId} LIMIT 1`),
    db.execute(sql`SELECT * FROM favorite_contacts WHERE user_id = ${myId} AND contact_id = ${otherId} LIMIT 1`),
  ]);

  const [blockRow] = await db.select().from(userBlocksTable)
    .where(and(eq(userBlocksTable.blockerId, myId), eq(userBlocksTable.blockedId, otherId)));

  const [friendReqRow] = await db.select().from(friendRequestsTable)
    .where(or(
      and(eq(friendRequestsTable.fromUserId, myId), eq(friendRequestsTable.toUserId, otherId)),
      and(eq(friendRequestsTable.fromUserId, otherId), eq(friendRequestsTable.toUserId, myId)),
    ));

  const postsResult = await db.execute(sql`SELECT COUNT(*) AS count FROM posts WHERE author_id = ${otherId} AND is_archived = false`);
  const postsCount = parseInt(firstRow(postsResult)?.count ?? "0", 10);

  const mute = firstRow(muteRow);
  const pin  = firstRow(pinRow);
  const fav  = firstRow(favRow);

  const isMuted = !!mute && (!mute.expires_at || new Date(mute.expires_at) > new Date());

  res.json({
    id:             user.id,
    firstName:      user.firstName,
    lastName:       user.lastName,
    bio:            user.bio ?? null,
    country:        user.country,
    avatarUrl:      user.avatarUrl ?? null,
    verified:       user.verified,
    friendsCount:   user.friendsCount,
    followersCount: user.followersCount,
    postsCount,
    createdAt:      user.createdAt,
    presence:       { online: rawPresence?.online ?? false, lastSeen: rawPresence?.lastSeenAt ?? null },
    isMuted,
    muteExpiresAt:  mute?.expires_at ?? null,
    isPinned:       !!pin,
    isFavorite:     !!fav,
    isBlocked:      !!blockRow,
    friendStatus:   friendReqRow?.status ?? null,
    friendDirection: friendReqRow
      ? (friendReqRow.fromUserId === myId ? "sent" : "received")
      : null,
  });
});

/* ─────────────────────────────────────────────────────────────
   MUTE
───────────────────────────────────────────────────────────── */
router.post("/contacts/:userId/mute", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  const { duration } = req.body as { duration?: string };

  let expiresAt: Date | null = null;
  const now = new Date();
  if (duration === "8h")     expiresAt = new Date(now.getTime() + 8  * 3_600_000);
  else if (duration === "1w") expiresAt = new Date(now.getTime() + 7  * 86_400_000);
  else if (duration === "1m") expiresAt = new Date(now.getTime() + 30 * 86_400_000);

  if (expiresAt) {
    await db.execute(sql`
      INSERT INTO muted_conversations (user_id, other_user_id, expires_at)
      VALUES (${myId}, ${otherId}, ${expiresAt.toISOString()})
      ON CONFLICT (user_id, other_user_id) DO UPDATE SET expires_at = EXCLUDED.expires_at
    `);
  } else {
    await db.execute(sql`
      INSERT INTO muted_conversations (user_id, other_user_id, expires_at)
      VALUES (${myId}, ${otherId}, NULL)
      ON CONFLICT (user_id, other_user_id) DO UPDATE SET expires_at = NULL
    `);
  }
  res.json({ ok: true, expiresAt });
});

router.delete("/contacts/:userId/mute", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }
  await db.execute(sql`DELETE FROM muted_conversations WHERE user_id = ${myId} AND other_user_id = ${otherId}`);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────────
   PIN
───────────────────────────────────────────────────────────── */
router.post("/contacts/:userId/pin", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  const countResult = await db.execute(sql`SELECT COUNT(*) AS count FROM pinned_conversations WHERE user_id = ${myId}`);
  const count = parseInt(firstRow(countResult)?.count ?? "0", 10);
  if (count >= 5) { res.status(400).json({ error: "Maximum 5 conversations épinglées" }); return; }

  await db.execute(sql`
    INSERT INTO pinned_conversations (user_id, other_user_id, position)
    VALUES (${myId}, ${otherId}, ${count})
    ON CONFLICT (user_id, other_user_id) DO NOTHING
  `);
  res.json({ ok: true });
});

router.delete("/contacts/:userId/pin", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }
  await db.execute(sql`DELETE FROM pinned_conversations WHERE user_id = ${myId} AND other_user_id = ${otherId}`);
  res.json({ ok: true });
});

router.get("/contacts/me/pinned", requireAuth, async (req, res): Promise<void> => {
  const myId = req.userId!;
  const result = await db.execute(sql`
    SELECT pc.other_user_id, pc.position, pc.created_at,
           u.first_name, u.last_name, u.avatar_url
    FROM pinned_conversations pc
    JOIN users u ON u.id = pc.other_user_id
    WHERE pc.user_id = ${myId}
    ORDER BY pc.position ASC
  `);
  res.json(rows(result));
});

/* ─────────────────────────────────────────────────────────────
   FAVORITES
───────────────────────────────────────────────────────────── */
router.post("/contacts/:userId/favorite", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }
  await db.execute(sql`
    INSERT INTO favorite_contacts (user_id, contact_id)
    VALUES (${myId}, ${otherId})
    ON CONFLICT (user_id, contact_id) DO NOTHING
  `);
  res.json({ ok: true });
});

router.delete("/contacts/:userId/favorite", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }
  await db.execute(sql`DELETE FROM favorite_contacts WHERE user_id = ${myId} AND contact_id = ${otherId}`);
  res.json({ ok: true });
});

router.get("/contacts/me/favorites", requireAuth, async (req, res): Promise<void> => {
  const myId = req.userId!;
  const result = await db.execute(sql`
    SELECT fc.contact_id, fc.created_at,
           u.first_name, u.last_name, u.avatar_url, u.verified
    FROM favorite_contacts fc
    JOIN users u ON u.id = fc.contact_id
    WHERE fc.user_id = ${myId}
    ORDER BY fc.created_at DESC
  `);
  res.json(rows(result));
});

/* ─────────────────────────────────────────────────────────────
   FRIEND REQUESTS
───────────────────────────────────────────────────────────── */
router.post("/contacts/:userId/friend-request", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId) || otherId === myId) { res.status(400).json({ error: "Invalid userId" }); return; }

  const [existing] = await db.select().from(friendRequestsTable).where(
    or(
      and(eq(friendRequestsTable.fromUserId, myId), eq(friendRequestsTable.toUserId, otherId)),
      and(eq(friendRequestsTable.fromUserId, otherId), eq(friendRequestsTable.toUserId, myId)),
    ),
  );

  if (existing) { res.status(409).json({ error: "Demande déjà existante", status: existing.status }); return; }

  const [req_] = await db.insert(friendRequestsTable).values({
    fromUserId: myId, toUserId: otherId, status: "pending",
  }).returning();

  const [me] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable).where(eq(usersTable.id, myId));
  if (me) {
    await db.insert(notificationsTable).values({
      userId:    otherId,
      type:      "friend_request",
      actorId:   myId,
      actorName: `${me.firstName} ${me.lastName}`,
      action:    "vous a envoyé une demande d'ami",
      link:      `/contact/${myId}`,
    }).catch(() => {});
    pushToUserDevice(otherId, {
      title: `${me.firstName} ${me.lastName}`,
      body:  "vous a envoyé une demande d'ami",
      data:  { type: "friend_request", userId: myId },
    }).catch(() => {});
  }

  res.status(201).json(req_);
});

router.patch("/contacts/:userId/friend-request", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  const { action } = req.body as { action: "accept" | "reject" | "cancel" };

  if (action === "cancel") {
    await db.delete(friendRequestsTable).where(
      and(eq(friendRequestsTable.fromUserId, myId), eq(friendRequestsTable.toUserId, otherId)),
    );
    res.json({ ok: true });
    return;
  }

  const [reqRow] = await db.select().from(friendRequestsTable).where(
    and(eq(friendRequestsTable.fromUserId, otherId), eq(friendRequestsTable.toUserId, myId)),
  );
  if (!reqRow) { res.status(404).json({ error: "Demande introuvable" }); return; }

  if (action === "accept") {
    await db.update(friendRequestsTable).set({ status: "accepted" }).where(eq(friendRequestsTable.id, reqRow.id));
    await Promise.all([
      db.insert(friendshipsTable).values({ userId: myId, friendId: otherId }).catch(() => {}),
      db.insert(friendshipsTable).values({ userId: otherId, friendId: myId }).catch(() => {}),
      db.execute(sql`UPDATE users SET friends_count = friends_count + 1 WHERE id IN (${myId}, ${otherId})`),
    ]);
  } else {
    await db.update(friendRequestsTable).set({ status: "rejected" }).where(eq(friendRequestsTable.id, reqRow.id));
  }
  res.json({ ok: true, action });
});

/* ─────────────────────────────────────────────────────────────
   BLOCK / UNBLOCK
───────────────────────────────────────────────────────────── */
router.post("/contacts/:userId/block", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  await db.insert(userBlocksTable).values({ blockerId: myId, blockedId: otherId }).catch(() => {});
  await db.delete(friendRequestsTable).where(
    or(
      and(eq(friendRequestsTable.fromUserId, myId), eq(friendRequestsTable.toUserId, otherId)),
      and(eq(friendRequestsTable.fromUserId, otherId), eq(friendRequestsTable.toUserId, myId)),
    ),
  ).catch(() => {});
  res.json({ ok: true });
});

router.delete("/contacts/:userId/block", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }
  await db.delete(userBlocksTable).where(
    and(eq(userBlocksTable.blockerId, myId), eq(userBlocksTable.blockedId, otherId)),
  );
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────────
   REPORT
───────────────────────────────────────────────────────────── */
router.post("/contacts/:userId/report", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  const { reason, description } = req.body as { reason: string; description?: string };
  if (!reason) { res.status(400).json({ error: "Motif requis" }); return; }

  await db.insert(userReportsTable).values({
    reporterId:  myId,
    reportedId:  otherId,
    reason,
    description: description ?? null,
    status:      "pending",
  });
  res.status(201).json({ ok: true });
});

/* ─────────────────────────────────────────────────────────────
   DELETE CONVERSATION (soft delete)
───────────────────────────────────────────────────────────── */
router.delete("/contacts/:userId/conversation", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }
  await db.execute(sql`
    INSERT INTO deleted_conversations (user_id, other_user_id)
    VALUES (${myId}, ${otherId})
    ON CONFLICT (user_id, other_user_id) DO UPDATE SET deleted_at = NOW()
  `);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────────
   SEARCH IN CONVERSATION
───────────────────────────────────────────────────────────── */
router.get("/contacts/:userId/conversation/search", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "Invalid userId" }); return; }

  const q    = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const type = typeof req.query.type === "string" ? req.query.type : "messages";

  if (type === "messages") {
    const result = await db.select().from(messagesTable)
      .where(and(
        or(
          and(eq(messagesTable.fromUserId, myId), eq(messagesTable.toUserId, otherId)),
          and(eq(messagesTable.fromUserId, otherId), eq(messagesTable.toUserId, myId)),
        ),
        q ? ilike(messagesTable.content, `%${q}%`) : sql`true`,
      ))
      .orderBy(desc(messagesTable.createdAt))
      .limit(50);
    res.json(result.map(m => ({
      id:        m.id,
      content:   m.content,
      fromMe:    m.fromUserId === myId,
      createdAt: m.createdAt,
      type:      "message",
    })));
  } else {
    res.json([]);
  }
});

/* ─────────────────────────────────────────────────────────────
   LIST USER'S GROUPS (for AddToGroup)
───────────────────────────────────────────────────────────── */
router.get("/contacts/me/groups", requireAuth, async (req, res): Promise<void> => {
  const myId = req.userId!;
  const result = await db.select({
    id:        chatGroupsTable.id,
    name:      chatGroupsTable.name,
    avatarUrl: chatGroupsTable.avatarUrl,
    type:      chatGroupsTable.type,
  }).from(chatGroupsTable)
    .innerJoin(chatGroupMembersTable, eq(chatGroupMembersTable.groupId, chatGroupsTable.id))
    .where(and(
      eq(chatGroupMembersTable.userId, myId),
      eq(chatGroupsTable.type, "group"),
    ))
    .orderBy(desc(chatGroupsTable.createdAt))
    .limit(50);
  res.json(result);
});

/* ─────────────────────────────────────────────────────────────
   ADD CONTACT TO GROUP
───────────────────────────────────────────────────────────── */
router.post("/contacts/:userId/add-to-group/:groupId", requireAuth, async (req, res): Promise<void> => {
  const myId    = req.userId!;
  const userId  = parseInt(req.params.userId, 10);
  const groupId = parseInt(req.params.groupId, 10);
  if (isNaN(userId) || isNaN(groupId)) { res.status(400).json({ error: "Invalid params" }); return; }

  const [membership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, myId)));
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    res.status(403).json({ error: "Non autorisé" }); return;
  }

  await db.insert(chatGroupMembersTable).values({ groupId, userId, role: "member" }).catch(() => {});
  res.json({ ok: true });
});

export default router;
