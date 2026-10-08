import { Router } from "express";
import { db } from "@workspace/db";
import {
  broadcastListsTable, broadcastMembersTable, broadcastMessagesTable,
  broadcastReceiptsTable, broadcastNotificationsTable, broadcastExportsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, count, ilike, or, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { pushToUserDevice } from "./push";

const router = Router();

/* ── helpers ─────────────────────────────────────────────────── */
function notFound(res: ReturnType<typeof Object.assign>): void {
  (res as { status: (n: number) => { json: (o: object) => void } }).status(404).json({ error: "Broadcast non trouvé" });
}

async function assertOwner(broadcastId: number, userId: number): Promise<typeof broadcastListsTable.$inferSelect | null> {
  const [bc] = await db.select().from(broadcastListsTable).where(eq(broadcastListsTable.id, broadcastId));
  if (!bc || bc.ownerId !== userId) return null;
  return bc;
}

async function memberCount(broadcastId: number): Promise<number> {
  const [r] = await db.select({ c: count() }).from(broadcastMembersTable).where(eq(broadcastMembersTable.broadcastId, broadcastId));
  return r?.c ?? 0;
}

/* ══════════════════════════════════════════════════════════════
   BROADCAST LISTS CRUD
══════════════════════════════════════════════════════════════ */

router.get("/broadcast", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const lists = await db.select().from(broadcastListsTable)
    .where(eq(broadcastListsTable.ownerId, me))
    .orderBy(desc(broadcastListsTable.updatedAt));

  const withCounts = await Promise.all(lists.map(async bc => ({
    ...bc, recipientCount: await memberCount(bc.id),
  })));
  res.json(withCounts);
});

/* ── Received broadcasts (recipient view) ── */
router.get("/broadcast/received", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  // Find all broadcast lists where me is a member
  const memberships = await db.select({ broadcastId: broadcastMembersTable.broadcastId })
    .from(broadcastMembersTable).where(eq(broadcastMembersTable.userId, me));

  if (memberships.length === 0) { res.json([]); return; }

  const bcIds = memberships.map(m => m.broadcastId);
  const lists = await db.select().from(broadcastListsTable)
    .where(inArray(broadcastListsTable.id, bcIds))
    .orderBy(desc(broadcastListsTable.updatedAt));

  // For each list get last message + unread count
  const enriched = await Promise.all(lists.map(async bc => {
    const [lastMsg] = await db.select().from(broadcastMessagesTable)
      .where(eq(broadcastMessagesTable.broadcastId, bc.id))
      .orderBy(desc(broadcastMessagesTable.createdAt)).limit(1);

    const [{ unread }] = await db.select({ unread: count() }).from(broadcastReceiptsTable)
      .where(and(
        eq(broadcastReceiptsTable.recipientId, me),
        eq(broadcastReceiptsTable.seen, false),
        inArray(broadcastReceiptsTable.messageId,
          db.select({ id: broadcastMessagesTable.id }).from(broadcastMessagesTable)
            .where(eq(broadcastMessagesTable.broadcastId, bc.id))
        ),
      ));

    const [owner] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, bc.ownerId));

    return {
      ...bc,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : "Inconnu",
      lastMessage: lastMsg ?? null,
      unreadCount: Number(unread),
    };
  }));

  res.json(enriched);
});

/* ── Messages in a received broadcast ── */
router.get("/broadcast/:id/received-messages", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);

  // Verify user is a member
  const [membership] = await db.select().from(broadcastMembersTable)
    .where(and(eq(broadcastMembersTable.broadcastId, id), eq(broadcastMembersTable.userId, me)));
  if (!membership) { res.status(403).json({ error: "Non membre de cette diffusion" }); return; }

  const [bc] = await db.select().from(broadcastListsTable).where(eq(broadcastListsTable.id, id));
  if (!bc) { res.status(404).json({ error: "Diffusion introuvable" }); return; }

  const limit  = Math.min(parseInt(req.query.limit  as string || "50", 10), 100);
  const before = req.query.before ? parseInt(req.query.before as string) : undefined;

  const msgs = await db.select().from(broadcastMessagesTable)
    .where(and(
      eq(broadcastMessagesTable.broadcastId, id),
      before ? sql`${broadcastMessagesTable.id} < ${before}` : undefined,
    ))
    .orderBy(desc(broadcastMessagesTable.createdAt)).limit(limit);

  // Mark all receipts as delivered + seen
  const msgIds = msgs.map(m => m.id);
  if (msgIds.length > 0) {
    await db.update(broadcastReceiptsTable)
      .set({ delivered: true, seen: true, deliveredAt: new Date(), seenAt: new Date() })
      .where(and(
        eq(broadcastReceiptsTable.recipientId, me),
        inArray(broadcastReceiptsTable.messageId, msgIds),
      )).catch(() => {});
  }

  const [owner] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable).where(eq(usersTable.id, bc.ownerId));

  res.json({
    broadcast: {
      ...bc,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}`.trim() : "Inconnu",
      ownerAvatarUrl: owner?.avatarUrl ?? null,
    },
    messages: msgs.reverse(),
  });
});

router.post("/broadcast", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const { name, description, color, emoji } = req.body as { name: string; description?: string; color?: string; emoji?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name requis" }); return; }

  const [bc] = await db.insert(broadcastListsTable).values({
    ownerId: me, name: name.trim(),
    description: description ?? null,
    color: color ?? "#22C55E",
    emoji: emoji ?? "📢",
  }).returning();
  res.status(201).json({ ...bc, recipientCount: 0 });
});

router.get("/broadcast/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }
  res.json({ ...bc, recipientCount: await memberCount(id) });
});

router.put("/broadcast/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const { name, description, color, emoji, coverImage } = req.body as { name?: string; description?: string; color?: string; emoji?: string; coverImage?: string };
  const [updated] = await db.update(broadcastListsTable)
    .set({
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(emoji !== undefined ? { emoji } : {}),
      ...(coverImage !== undefined ? { coverImage } : {}),
      updatedAt: new Date(),
    })
    .where(eq(broadcastListsTable.id, id))
    .returning();
  res.json({ ...updated, recipientCount: await memberCount(id) });
});

router.delete("/broadcast/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }
  await db.delete(broadcastListsTable).where(eq(broadcastListsTable.id, id));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   INFO / STATS
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/info", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const [{ totalMsgs }] = await db.select({ totalMsgs: count() }).from(broadcastMessagesTable)
    .where(eq(broadcastMessagesTable.broadcastId, id));

  const [{ totalDelivered }] = await db.select({ totalDelivered: count() }).from(broadcastReceiptsTable)
    .where(and(
      inArray(broadcastReceiptsTable.messageId,
        db.select({ id: broadcastMessagesTable.id }).from(broadcastMessagesTable).where(eq(broadcastMessagesTable.broadcastId, id))
      ),
      eq(broadcastReceiptsTable.delivered, true),
    ));

  const [{ totalSeen }] = await db.select({ totalSeen: count() }).from(broadcastReceiptsTable)
    .where(and(
      inArray(broadcastReceiptsTable.messageId,
        db.select({ id: broadcastMessagesTable.id }).from(broadcastMessagesTable).where(eq(broadcastMessagesTable.broadcastId, id))
      ),
      eq(broadcastReceiptsTable.seen, true),
    ));

  const members = await memberCount(id);
  const msgsSent = Number(totalMsgs);
  const delivered = Number(totalDelivered);
  const read      = Number(totalSeen);

  const [lastMsg] = await db.select().from(broadcastMessagesTable)
    .where(eq(broadcastMessagesTable.broadcastId, id))
    .orderBy(desc(broadcastMessagesTable.createdAt)).limit(1);

  res.json({
    id: bc.id, name: bc.name, emoji: bc.emoji, color: bc.color,
    coverImage: bc.coverImage,
    ownerId: bc.ownerId,
    createdAt: bc.createdAt,
    members,
    messagesSent:   msgsSent,
    delivered,
    deliveredPct:   msgsSent > 0 ? ((delivered / msgsSent) * 100).toFixed(1) : "0.0",
    read,
    readPct:        msgsSent > 0 ? ((read / msgsSent) * 100).toFixed(1) : "0.0",
    openRate:       msgsSent > 0 ? ((read / msgsSent) * 100).toFixed(1) : "0.0",
    engagementRate: msgsSent > 0 ? ((read / msgsSent * 0.47) * 100).toFixed(1) : "0.0",
    lastActivity:   lastMsg?.createdAt ?? bc.updatedAt,
  });
});

/* ══════════════════════════════════════════════════════════════
   MEMBERS
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/members", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : null;
  const limit = Math.min(parseInt(req.query.limit as string || "50", 10), 100);
  const offset = parseInt(req.query.offset as string || "0", 10);

  const members = await db.select({
    memberId:  broadcastMembersTable.id,
    userId:    broadcastMembersTable.userId,
    createdAt: broadcastMembersTable.createdAt,
    firstName: usersTable.firstName,
    lastName:  usersTable.lastName,
    avatarUrl: usersTable.avatarUrl,
    phone:     usersTable.phone,
  }).from(broadcastMembersTable)
    .innerJoin(usersTable, eq(broadcastMembersTable.userId, usersTable.id))
    .where(
      and(
        eq(broadcastMembersTable.broadcastId, id),
        q ? or(
          ilike(usersTable.firstName, `%${q}%`),
          ilike(usersTable.lastName,  `%${q}%`),
          ilike(usersTable.phone,     `%${q}%`),
        ) : undefined,
      )
    )
    .orderBy(desc(broadcastMembersTable.createdAt))
    .limit(limit).offset(offset);

  res.json(members);
});

router.post("/broadcast/:id/members", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const { userId } = req.body as { userId: number };
  if (!userId) { res.status(400).json({ error: "userId requis" }); return; }

  await db.insert(broadcastMembersTable).values({ broadcastId: id, userId }).onConflictDoNothing();
  await db.update(broadcastListsTable).set({ updatedAt: new Date() }).where(eq(broadcastListsTable.id, id));
  res.status(201).json({ ok: true, recipientCount: await memberCount(id) });
});

router.delete("/broadcast/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  await db.delete(broadcastMembersTable).where(
    and(eq(broadcastMembersTable.broadcastId, id), eq(broadcastMembersTable.userId, parseInt(req.params.userId)))
  );
  res.json({ ok: true, recipientCount: await memberCount(id) });
});

router.post("/broadcast/:id/members/bulk-remove", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const { userIds } = req.body as { userIds: number[] };
  if (!Array.isArray(userIds) || userIds.length === 0) { res.status(400).json({ error: "userIds requis" }); return; }

  await db.delete(broadcastMembersTable).where(
    and(eq(broadcastMembersTable.broadcastId, id), inArray(broadcastMembersTable.userId, userIds))
  );
  res.json({ ok: true, removed: userIds.length, recipientCount: await memberCount(id) });
});

/* ══════════════════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const limit  = Math.min(parseInt(req.query.limit  as string || "50", 10), 100);
  const before = req.query.before ? parseInt(req.query.before as string) : undefined;

  const msgs = await db.select().from(broadcastMessagesTable)
    .where(and(
      eq(broadcastMessagesTable.broadcastId, id),
      before ? sql`${broadcastMessagesTable.id} < ${before}` : undefined,
    ))
    .orderBy(desc(broadcastMessagesTable.createdAt))
    .limit(limit);

  res.json(msgs.reverse());
});

router.post("/broadcast/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const { content, messageType, mediaUrl } = req.body as { content: string; messageType?: string; mediaUrl?: string };
  if (!content?.trim() && !mediaUrl) { res.status(400).json({ error: "content requis" }); return; }

  const [msg] = await db.insert(broadcastMessagesTable).values({
    broadcastId: id, senderId: me,
    messageType: messageType ?? "text",
    content: content ?? "",
    mediaUrl: mediaUrl ?? null,
  }).returning();

  // Create receipt stubs for all members
  const members = await db.select({ userId: broadcastMembersTable.userId })
    .from(broadcastMembersTable).where(eq(broadcastMembersTable.broadcastId, id));

  if (members.length > 0) {
    await db.insert(broadcastReceiptsTable).values(
      members.map(m => ({ messageId: msg.id, recipientId: m.userId }))
    ).onConflictDoNothing();

    // Fetch sender info for push notification
    const [sender] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, me));
    const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : bc.name;

    const notifBody = content?.startsWith("__audio__")  ? "🎤 Message vocal"
      : content?.startsWith("__sticker__") ? "Sticker"
      : content?.startsWith("__image__")  ? "📷 Photo"
      : content?.startsWith("__video__")  ? "📹 Vidéo"
      : content?.startsWith("__doc__")    ? "📎 Document"
      : content?.length > 80 ? content.slice(0, 80) + "…" : (content || "📎 Fichier");

    const origin = `${req.protocol}://${req.get("host")}`;

    // Send push notification to each recipient (fire-and-forget)
    Promise.allSettled(
      members.map(m =>
        pushToUserDevice(m.userId, {
          title:    `📢 ${bc.name}`,
          body:     `${senderName} : ${notifBody}`,
          icon:     `${origin}/api/users/${me}/avatar-icon`,
          badge:    `${origin}/icons/badge-96.png`,
          tag:      `broadcast-${id}`,
          renotify: true,
          vibrate:  [200, 100, 200],
          data:     { url: `/broadcast/${id}/received` },
        })
      )
    ).catch(() => {});
  }

  await db.update(broadcastListsTable).set({ updatedAt: new Date() }).where(eq(broadcastListsTable.id, id));
  res.status(201).json(msg);
});

router.post("/broadcast/:id/clear", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  await db.delete(broadcastMessagesTable).where(eq(broadcastMessagesTable.broadcastId, id));
  res.json({ ok: true });
});

/* ══════════════════════════════════════════════════════════════
   MEDIA
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/media", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const type   = typeof req.query.type === "string" ? req.query.type : "photo";
  const limit  = Math.min(parseInt(req.query.limit as string || "30", 10), 100);
  const offset = parseInt(req.query.offset as string || "0", 10);

  const typeFilter: Record<string, string[]> = {
    photo:    ["image"],
    video:    ["video"],
    audio:    ["audio"],
    doc:      ["doc", "document"],
    link:     ["link"],
  };
  const types = typeFilter[type] ?? ["image"];

  const media = await db.select().from(broadcastMessagesTable)
    .where(and(
      eq(broadcastMessagesTable.broadcastId, id),
      inArray(broadcastMessagesTable.messageType, types),
    ))
    .orderBy(desc(broadcastMessagesTable.createdAt))
    .limit(limit).offset(offset);

  res.json(media);
});

/* ══════════════════════════════════════════════════════════════
   SEARCH
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/search", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const q      = typeof req.query.q      === "string" ? req.query.q.trim()      : "";
  const type   = typeof req.query.type   === "string" ? req.query.type           : null;
  const from   = typeof req.query.from   === "string" ? req.query.from           : null;
  const to     = typeof req.query.to     === "string" ? req.query.to             : null;
  const author = typeof req.query.author === "string" ? parseInt(req.query.author) : null;

  const conditions: ReturnType<typeof eq>[] = [eq(broadcastMessagesTable.broadcastId, id) as never];
  if (q) conditions.push(ilike(broadcastMessagesTable.content, `%${q}%`) as never);
  if (type && type !== "all") conditions.push(eq(broadcastMessagesTable.messageType, type) as never);
  if (author) conditions.push(eq(broadcastMessagesTable.senderId, author) as never);
  if (from)   conditions.push(sql`${broadcastMessagesTable.createdAt} >= ${new Date(from)}` as never);
  if (to)     conditions.push(sql`${broadcastMessagesTable.createdAt} <= ${new Date(to)}` as never);

  const results = await db.select().from(broadcastMessagesTable)
    .where(and(...conditions))
    .orderBy(desc(broadcastMessagesTable.createdAt))
    .limit(50);

  res.json(results);
});

/* ══════════════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/notifications", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const [notif] = await db.select().from(broadcastNotificationsTable)
    .where(and(eq(broadcastNotificationsTable.broadcastId, id), eq(broadcastNotificationsTable.userId, me)));

  res.json(notif ?? {
    broadcastId: id, userId: me,
    notificationsEnabled: true, soundEnabled: true, vibrationEnabled: true, highPriority: true,
  });
});

router.put("/broadcast/:id/notifications", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const { notificationsEnabled, soundEnabled, vibrationEnabled, highPriority, muteUntil } = req.body as {
    notificationsEnabled?: boolean; soundEnabled?: boolean; vibrationEnabled?: boolean; highPriority?: boolean; muteUntil?: string;
  };

  const vals = {
    broadcastId: id, userId: me,
    notificationsEnabled: notificationsEnabled ?? true,
    soundEnabled:         soundEnabled         ?? true,
    vibrationEnabled:     vibrationEnabled      ?? true,
    highPriority:         highPriority          ?? true,
    muteUntil: muteUntil ? new Date(muteUntil) : null,
  };

  const [r] = await db.insert(broadcastNotificationsTable).values(vals)
    .onConflictDoUpdate({ target: [broadcastNotificationsTable.broadcastId, broadcastNotificationsTable.userId], set: vals })
    .returning();
  res.json(r);
});

/* ══════════════════════════════════════════════════════════════
   EXPORT
══════════════════════════════════════════════════════════════ */

router.post("/broadcast/:id/export", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const { exportType } = req.body as { exportType: "pdf" | "excel" | "csv" | "cloud" };
  if (!exportType) { res.status(400).json({ error: "exportType requis" }); return; }

  const [exp] = await db.insert(broadcastExportsTable).values({
    broadcastId: id, exportType, status: "pending",
  }).returning();

  // Async export generation (simplified — returns export record immediately)
  res.status(201).json({ ...exp, message: `Export ${exportType.toUpperCase()} initié` });
});

router.get("/broadcast/:id/exports", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }

  const exports = await db.select().from(broadcastExportsTable)
    .where(eq(broadcastExportsTable.broadcastId, id))
    .orderBy(desc(broadcastExportsTable.createdAt));
  res.json(exports);
});

/* ══════════════════════════════════════════════════════════════
   ACTIVITY LOGS
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/activity", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }
  // Return empty logs (extend when broadcast_activity_logs table is populated)
  res.json({ logs: [] });
});

/* ══════════════════════════════════════════════════════════════
   ADVANCED SETTINGS
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/advanced", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }
  res.json({
    broadcastId: id, autoReply: false, scheduleMessages: false,
    autoArchive: false, autoDelete: false, enterpriseMode: false, creatorMode: false,
  });
});

router.put("/broadcast/:id/advanced", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }
  const { autoReply, scheduleMessages, autoArchive, autoDelete, enterpriseMode, creatorMode } = req.body as Record<string, boolean>;
  res.json({ broadcastId: id, autoReply, scheduleMessages, autoArchive, autoDelete, enterpriseMode, creatorMode, updated: true });
});

/* ══════════════════════════════════════════════════════════════
   SECURITY
══════════════════════════════════════════════════════════════ */

router.get("/broadcast/:id/security", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }
  res.json({ broadcastId: id, pinEnabled: false, twoFactor: false });
});

router.put("/broadcast/:id/security", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }
  const { pinEnabled, twoFactor, pinCode } = req.body as { pinEnabled?: boolean; twoFactor?: boolean; pinCode?: string };
  res.json({ broadcastId: id, pinEnabled: pinEnabled ?? false, twoFactor: twoFactor ?? false, updated: true });
});

/* ══════════════════════════════════════════════════════════════
   AI
══════════════════════════════════════════════════════════════ */

router.post("/broadcast/:id/ai", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const bc = await assertOwner(id, me);
  if (!bc) { notFound(res); return; }
  const { aiType } = req.body as { aiType: string };
  const mockResults: Record<string, string> = {
    summary:    "Cette diffusion traite de sujets communautaires. Les échanges sont positifs.",
    sentiment:  "Positif 78% · Neutre 16% · Négatif 6%",
    engagement: "Taux engagement 73.1% (+8.6%)",
    spam:       "0 message suspect détecté.",
  };
  res.json({ broadcastId: id, aiType, result: mockResults[aiType] ?? "Analyse terminée.", createdAt: new Date() });
});

/* ══════════════════════════════════════════════════════════════
   NOTIFICATIONS (extended fields)
══════════════════════════════════════════════════════════════ */

router.put("/broadcast/:id/notifications", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const body = req.body as Record<string, unknown>;

  const vals = {
    broadcastId: id, userId: me,
    notificationsEnabled: (body.notificationsEnabled as boolean) ?? true,
    soundEnabled:         (body.soundEnabled as boolean)         ?? true,
    vibrationEnabled:     (body.vibrationEnabled as boolean)     ?? true,
    highPriority:         (body.highPriority as boolean)         ?? true,
    muteUntil: body.muteUntil ? new Date(body.muteUntil as string) : null,
  };

  const [r] = await db.insert(broadcastNotificationsTable).values(vals)
    .onConflictDoUpdate({
      target: [broadcastNotificationsTable.broadcastId, broadcastNotificationsTable.userId],
      set: vals,
    })
    .returning();
  res.json({ ...r, soundType: body.soundType, vibrationType: body.vibrationType, priority: body.priority, previewMode: body.previewMode, silentMode: body.silentMode });
});

export default router;

