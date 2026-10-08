import { Router } from "express";
import { db, pagesTable, pageFollowersTable, pageRolesTable, pageInvitationsTable, usersTable, friendshipsTable } from "@workspace/db";
import { desc, eq, and, or, sql, ilike, inArray, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

/* ── List pages ──────────────────────────────────────────────────── */
router.get("/pages", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const filter = (req.query.filter as string) ?? "all";
  const search = (req.query.search as string) ?? "";

  if (filter === "mine") {
    const rows = await db
      .select({
        id: pagesTable.id,
        name: pagesTable.name,
        username: pagesTable.username,
        category: pagesTable.category,
        description: pagesTable.description,
        emoji: pagesTable.emoji,
        avatarUrl: pagesTable.avatarUrl,
        coverUrl: pagesTable.coverUrl,
        verified: pagesTable.verified,
        followersCount: pagesTable.followersCount,
        createdById: pagesTable.createdById,
        createdAt: pagesTable.createdAt,
      })
      .from(pagesTable)
      .where(eq(pagesTable.createdById, userId))
      .orderBy(desc(pagesTable.createdAt))
      .limit(50);
    res.json(rows); return;
  }

  if (filter === "invitations") {
    const rows = await db
      .select({
        id: pageInvitationsTable.id,
        pageId: pageInvitationsTable.pageId,
        invitedBy: pageInvitationsTable.invitedBy,
        status: pageInvitationsTable.status,
        invitedAt: pageInvitationsTable.invitedAt,
        pageName: pagesTable.name,
        pageAvatar: pagesTable.avatarUrl,
        pageCategory: pagesTable.category,
        pageFollowers: pagesTable.followersCount,
        inviterName: usersTable.firstName,
      })
      .from(pageInvitationsTable)
      .leftJoin(pagesTable, eq(pagesTable.id, pageInvitationsTable.pageId))
      .leftJoin(usersTable, eq(usersTable.id, pageInvitationsTable.invitedBy))
      .where(and(eq(pageInvitationsTable.invitedUserId, userId), eq(pageInvitationsTable.status, "pending")))
      .orderBy(desc(pageInvitationsTable.invitedAt))
      .limit(50);
    res.json(rows); return;
  }

  const conds = [];
  if (search.trim()) {
    conds.push(ilike(pagesTable.name, `%${search.trim()}%`));
  }
  const whereClause = conds.length > 0 ? and(eq(pagesTable.isPublic, true), ...conds) : eq(pagesTable.isPublic, true);

  const rows = await db
    .select({
      id: pagesTable.id,
      name: pagesTable.name,
      username: pagesTable.username,
      category: pagesTable.category,
      description: pagesTable.description,
      emoji: pagesTable.emoji,
      avatarUrl: pagesTable.avatarUrl,
      coverUrl: pagesTable.coverUrl,
      verified: pagesTable.verified,
      followersCount: pagesTable.followersCount,
      createdById: pagesTable.createdById,
      createdAt: pagesTable.createdAt,
    })
    .from(pagesTable)
    .where(whereClause)
    .orderBy(desc(pagesTable.followersCount), desc(pagesTable.createdAt))
    .limit(50);

  const followedIds = (await db
    .select({ pageId: pageFollowersTable.pageId })
    .from(pageFollowersTable)
    .where(eq(pageFollowersTable.userId, userId))).map(r => r.pageId);

  res.json(rows.map(p => ({ ...p, isFollowed: followedIds.includes(p.id), isOwner: p.createdById === userId })));
});

/* ── Create page ─────────────────────────────────────────────────── */
router.post("/pages", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { name, category, description, emoji, username, website, email, phone, address, timezone, actionButton, avatarUrl, coverUrl, coverVideoUrl, isPublic } = req.body as Record<string, string | boolean | undefined>;

  if (!name || !category) {
    res.status(400).json({ error: "Nom et catégorie requis" }); return;
  }

  const [page] = await db.insert(pagesTable).values({
    name: String(name),
    category: String(category),
    description: description ? String(description) : undefined,
    emoji: emoji ? String(emoji) : "📢",
    username: username ? String(username) : undefined,
    website: website ? String(website) : undefined,
    email: email ? String(email) : undefined,
    phone: phone ? String(phone) : undefined,
    address: address ? String(address) : undefined,
    timezone: timezone ? String(timezone) : undefined,
    actionButton: actionButton ? String(actionButton) : "Aucun",
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    coverUrl: coverUrl ? String(coverUrl) : undefined,
    coverVideoUrl: coverVideoUrl ? String(coverVideoUrl) : undefined,
    isPublic: isPublic !== false,
    createdById: userId,
  }).returning();

  await db.insert(pageRolesTable).values({ pageId: page.id, userId, role: "owner" }).onConflictDoNothing();

  res.status(201).json(page);
});

/* ── Get page ────────────────────────────────────────────────────── */
router.get("/pages/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, pageId));
  if (!page) { res.status(404).json({ error: "Page introuvable" }); return; }

  const [follow] = await db.select().from(pageFollowersTable)
    .where(and(eq(pageFollowersTable.pageId, pageId), eq(pageFollowersTable.userId, userId)));

  const [role] = await db.select().from(pageRolesTable)
    .where(and(eq(pageRolesTable.pageId, pageId), eq(pageRolesTable.userId, userId)));

  res.json({
    ...page,
    isFollowed: !!follow,
    isOwner: page.createdById === userId,
    myRole: role?.role ?? null,
  });
});

/* ── Update page ─────────────────────────────────────────────────── */
router.patch("/pages/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [page] = await db.select({ createdById: pagesTable.createdById }).from(pagesTable).where(eq(pagesTable.id, pageId));
  if (!page) { res.status(404).json({ error: "Page introuvable" }); return; }

  const [role] = await db.select({ role: pageRolesTable.role }).from(pageRolesTable)
    .where(and(eq(pageRolesTable.pageId, pageId), eq(pageRolesTable.userId, userId)));
  const canEdit = page.createdById === userId || (role && ["owner","admin","editor"].includes(role.role));
  if (!canEdit) { res.status(403).json({ error: "Accès refusé" }); return; }

  const { name, category, description, emoji, username, website, email, phone, address, timezone, actionButton, avatarUrl, coverUrl, coverVideoUrl, isPublic } = req.body as Record<string, string | boolean | undefined>;

  const updated: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updated.name = String(name);
  if (category !== undefined) updated.category = String(category);
  if (description !== undefined) updated.description = String(description);
  if (emoji !== undefined) updated.emoji = String(emoji);
  if (username !== undefined) updated.username = username ? String(username) : null;
  if (website !== undefined) updated.website = website ? String(website) : null;
  if (email !== undefined) updated.email = email ? String(email) : null;
  if (phone !== undefined) updated.phone = phone ? String(phone) : null;
  if (address !== undefined) updated.address = address ? String(address) : null;
  if (timezone !== undefined) updated.timezone = String(timezone);
  if (actionButton !== undefined) updated.actionButton = String(actionButton);
  if (avatarUrl !== undefined) updated.avatarUrl = avatarUrl ? String(avatarUrl) : null;
  if (coverUrl !== undefined) updated.coverUrl = coverUrl ? String(coverUrl) : null;
  if (coverVideoUrl !== undefined) updated.coverVideoUrl = coverVideoUrl ? String(coverVideoUrl) : null;
  if (isPublic !== undefined) updated.isPublic = isPublic !== false;

  const [upd] = await db.update(pagesTable).set(updated).where(eq(pagesTable.id, pageId)).returning();
  res.json(upd);
});

/* ── Delete page ─────────────────────────────────────────────────── */
router.delete("/pages/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [page] = await db.select({ createdById: pagesTable.createdById }).from(pagesTable).where(eq(pagesTable.id, pageId));
  if (!page) { res.status(404).json({ error: "Page introuvable" }); return; }
  if (page.createdById !== userId) { res.status(403).json({ error: "Accès refusé" }); return; }

  await db.delete(pageFollowersTable).where(eq(pageFollowersTable.pageId, pageId));
  await db.delete(pageRolesTable).where(eq(pageRolesTable.pageId, pageId));
  await db.delete(pageInvitationsTable).where(eq(pageInvitationsTable.pageId, pageId));
  await db.delete(pagesTable).where(eq(pagesTable.id, pageId));
  res.json({ ok: true });
});

/* ── Follow / Unfollow ───────────────────────────────────────────── */
router.post("/pages/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.insert(pageFollowersTable).values({ pageId, userId }).onConflictDoNothing();
  await db.update(pagesTable)
    .set({ followersCount: sql`${pagesTable.followersCount} + 1` })
    .where(eq(pagesTable.id, pageId));
  res.json({ ok: true });
});

router.delete("/pages/:id/follow", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const del = await db.delete(pageFollowersTable)
    .where(and(eq(pageFollowersTable.pageId, pageId), eq(pageFollowersTable.userId, userId)));
  if ((del.rowCount ?? 0) > 0) {
    await db.update(pagesTable)
      .set({ followersCount: sql`GREATEST(${pagesTable.followersCount} - 1, 0)` })
      .where(eq(pagesTable.id, pageId));
  }
  res.json({ ok: true });
});

/* ── Roles / Team ────────────────────────────────────────────────── */
router.get("/pages/:id/roles", requireAuth, async (req, res): Promise<void> => {
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select({
      userId: pageRolesTable.userId,
      role: pageRolesTable.role,
      addedAt: pageRolesTable.addedAt,
      name: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(pageRolesTable)
    .leftJoin(usersTable, eq(usersTable.id, pageRolesTable.userId))
    .where(eq(pageRolesTable.pageId, pageId))
    .orderBy(pageRolesTable.addedAt);
  res.json(rows);
});

router.post("/pages/:id/roles", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [page] = await db.select({ createdById: pagesTable.createdById }).from(pagesTable).where(eq(pagesTable.id, pageId));
  if (!page || page.createdById !== userId) { res.status(403).json({ error: "Accès refusé" }); return; }

  const { targetUserId, role } = req.body as { targetUserId: number; role: string };
  if (!targetUserId || !role) { res.status(400).json({ error: "Paramètres manquants" }); return; }

  await db.insert(pageRolesTable).values({ pageId, userId: targetUserId, role }).onConflictDoNothing();
  res.json({ ok: true });
});

router.patch("/pages/:id/roles/:targetId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  const targetId = parseInt(req.params.targetId, 10);
  if (isNaN(pageId) || isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [page] = await db.select({ createdById: pagesTable.createdById }).from(pagesTable).where(eq(pagesTable.id, pageId));
  if (!page || page.createdById !== userId) { res.status(403).json({ error: "Accès refusé" }); return; }

  const { role } = req.body as { role: string };
  await db.update(pageRolesTable).set({ role }).where(and(eq(pageRolesTable.pageId, pageId), eq(pageRolesTable.userId, targetId)));
  res.json({ ok: true });
});

router.delete("/pages/:id/roles/:targetId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  const targetId = parseInt(req.params.targetId, 10);
  if (isNaN(pageId) || isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [page] = await db.select({ createdById: pagesTable.createdById }).from(pagesTable).where(eq(pagesTable.id, pageId));
  if (!page || page.createdById !== userId) { res.status(403).json({ error: "Accès refusé" }); return; }

  await db.delete(pageRolesTable).where(and(eq(pageRolesTable.pageId, pageId), eq(pageRolesTable.userId, targetId)));
  res.json({ ok: true });
});

/* ── Invite friends to follow ────────────────────────────────────── */
router.post("/pages/:id/invite", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { targetUserIds } = req.body as { targetUserIds: number[] };
  if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
    res.status(400).json({ error: "Aucun destinataire" }); return;
  }

  const values = targetUserIds.map(tid => ({ pageId, invitedBy: userId, invitedUserId: tid, status: "pending" }));
  await db.insert(pageInvitationsTable).values(values).onConflictDoNothing();
  res.json({ ok: true, count: targetUserIds.length });
});

router.post("/pages/invitations/:id/accept", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const invId = parseInt(req.params.id, 10);
  if (isNaN(invId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [inv] = await db.select().from(pageInvitationsTable)
    .where(and(eq(pageInvitationsTable.id, invId), eq(pageInvitationsTable.invitedUserId, userId)));
  if (!inv) { res.status(404).json({ error: "Invitation introuvable" }); return; }

  await db.update(pageInvitationsTable).set({ status: "accepted" }).where(eq(pageInvitationsTable.id, invId));
  await db.insert(pageFollowersTable).values({ pageId: inv.pageId, userId }).onConflictDoNothing();
  await db.update(pagesTable)
    .set({ followersCount: sql`${pagesTable.followersCount} + 1` })
    .where(eq(pagesTable.id, inv.pageId));
  res.json({ ok: true });
});

router.post("/pages/invitations/:id/decline", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const invId = parseInt(req.params.id, 10);
  if (isNaN(invId)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(pageInvitationsTable).set({ status: "declined" })
    .where(and(eq(pageInvitationsTable.id, invId), eq(pageInvitationsTable.invitedUserId, userId)));
  res.json({ ok: true });
});

/* ── Stats ───────────────────────────────────────────────────────── */
router.get("/pages/:id/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [page] = await db.select({ createdById: pagesTable.createdById, followersCount: pagesTable.followersCount, name: pagesTable.name })
    .from(pagesTable).where(eq(pagesTable.id, pageId));
  if (!page || page.createdById !== userId) { res.status(403).json({ error: "Accès refusé" }); return; }

  const [countRow] = await db.select({ count: sql<number>`count(*)::int` })
    .from(pageFollowersTable).where(eq(pageFollowersTable.pageId, pageId));

  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return {
      day: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      views: Math.floor(Math.random() * 2000 + 500),
    };
  });

  res.json({
    followersCount: countRow?.count ?? 0,
    viewsTotal: Math.floor((countRow?.count ?? 0) * 3.2 + 1200),
    newFollowers: Math.floor((countRow?.count ?? 0) * 0.08 + 12),
    interactions: Math.floor((countRow?.count ?? 0) * 0.31 + 80),
    clicks: Math.floor((countRow?.count ?? 0) * 0.07 + 10),
    viewsGrowth: 22.1,
    followersGrowth: 16.3,
    interactionsGrowth: 31.9,
    clicksGrowth: 8.7,
    chart,
  });
});

/* ── Suggest friends to invite ───────────────────────────────────── */
router.get("/pages/:id/suggest-friends", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const pageId = parseInt(req.params.id, 10);
  if (isNaN(pageId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const followedIds = (await db.select({ userId: pageFollowersTable.userId })
    .from(pageFollowersTable).where(eq(pageFollowersTable.pageId, pageId))).map(r => r.userId);

  const invitedIds = (await db.select({ invitedUserId: pageInvitationsTable.invitedUserId })
    .from(pageInvitationsTable).where(and(eq(pageInvitationsTable.pageId, pageId), eq(pageInvitationsTable.status, "pending"))))
    .map(r => r.invitedUserId);

  const excludeIds = [...new Set([userId, ...followedIds, ...invitedIds])];

  const friends = await db
    .select({
      id: usersTable.id,
      name: sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
      avatarUrl: usersTable.avatarUrl,
      country: usersTable.country,
    })
    .from(friendshipsTable)
    .innerJoin(usersTable, eq(usersTable.id, friendshipsTable.friendId))
    .where(excludeIds.length > 1
      ? and(eq(friendshipsTable.userId, userId), sql`${usersTable.id} NOT IN (${sql.join(excludeIds.map(id => sql`${id}`), sql`, `)})`)
      : eq(friendshipsTable.userId, userId)
    )
    .limit(20);

  res.json(friends);
});

export default router;
