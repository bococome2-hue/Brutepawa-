import { Router } from "express";
import { db, groupsTable, groupMembersTable, groupPostsTable, groupJoinRequestsTable, usersTable, notificationsTable } from "@workspace/db";
import { desc, eq, and, or, sql, ilike, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { runWelcomeBot, runContentBots } from "./groupBots";
import {
  assertCommunityGroupAdmin,
  assertCommunityGroupAdminOrModerator,
} from "../lib/groupAuth";

const router = Router();

router.get("/groups", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const search = typeof req.query.search === "string" && req.query.search.trim()
    ? req.query.search.trim()
    : null;
  const country = typeof req.query.country === "string" && req.query.country.trim()
    ? req.query.country.trim()
    : null;
  const category = typeof req.query.category === "string" && req.query.category.trim()
    ? req.query.category.trim()
    : null;

  // Get group IDs the user is a member of (includes groups they created if auto-joined)
  const myMemberships = await db
    .select({ groupId: groupMembersTable.groupId })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, userId));
  const myGroupIds = myMemberships.map(m => m.groupId);

  // Visibility: public groups OR groups created by user OR groups user is member of
  const visibilityCondition = myGroupIds.length > 0
    ? or(eq(groupsTable.privacy, "public"), eq(groupsTable.createdById, userId), inArray(groupsTable.id, myGroupIds))!
    : or(eq(groupsTable.privacy, "public"), eq(groupsTable.createdById, userId))!;

  const extraConditions: ReturnType<typeof eq>[] = [];
  if (search) extraConditions.push(sql`search_vector @@ websearch_to_tsquery('french', unaccent(${search}))` as unknown as ReturnType<typeof eq>);
  if (country) extraConditions.push(ilike(groupsTable.country, `%${country}%`));
  if (category) extraConditions.push(eq(groupsTable.category, category));

  const whereClause = extraConditions.length > 0
    ? and(visibilityCondition, ...extraConditions)
    : visibilityCondition;

  const rows = await db
    .select({
      id: groupsTable.id,
      name: groupsTable.name,
      description: groupsTable.description,
      category: groupsTable.category,
      emoji: groupsTable.emoji,
      coverUrl: groupsTable.coverUrl,
      country: groupsTable.country,
      privacy: groupsTable.privacy,
      membersCount: groupsTable.membersCount,
      createdById: groupsTable.createdById,
      createdAt: groupsTable.createdAt,
    })
    .from(groupsTable)
    .where(whereClause)
    .orderBy(desc(groupsTable.membersCount), desc(groupsTable.createdAt))
    .limit(search ? 10 : 50);

  if (rows.length === 0) {
    res.json([]);
    return;
  }

  const groupIds = rows.map(r => r.id);
  const memberships = await db
    .select({ groupId: groupMembersTable.groupId })
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.userId, userId),
        inArray(groupMembersTable.groupId, groupIds),
      ),
    );

  const memberSet = new Set(memberships.map(m => m.groupId));

  res.json(rows.map(r => ({ ...r, isMember: memberSet.has(r.id) })));
});

router.post("/groups", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { name, description, category, emoji, isPrivate } = req.body as {
    name?: string; description?: string; category?: string;
    emoji?: string; isPrivate?: boolean;
  };
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }

  const [group] = await db.insert(groupsTable).values({
    name: name.trim(),
    description: description?.trim() ?? null,
    category: category ?? null,
    emoji: emoji ?? "👥",
    privacy: isPrivate ? "private" : "public",
    createdById: userId,
    membersCount: 1,
  }).returning();

  await db.insert(groupMembersTable).values({
    groupId: group.id,
    userId,
    role: "admin",
  });

  res.status(201).json({ ...group, isMember: true });
});

router.get("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const [membership] = await db
    .select({ id: groupMembersTable.id, role: groupMembersTable.role })
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    )
    .limit(1);

  const isMember = Boolean(membership);

  if (group.privacy === "private" && !isMember) {
    const [joinReq] = await db
      .select({ id: groupJoinRequestsTable.id, status: groupJoinRequestsTable.status })
      .from(groupJoinRequestsTable)
      .where(
        and(
          eq(groupJoinRequestsTable.groupId, groupId),
          eq(groupJoinRequestsTable.userId, userId),
        ),
      )
      .orderBy(desc(groupJoinRequestsTable.createdAt))
      .limit(1);

    res.json({
      id: group.id,
      name: group.name,
      emoji: group.emoji,
      category: group.category,
      coverUrl: group.coverUrl,
      country: group.country,
      privacy: group.privacy,
      membersCount: group.membersCount,
      createdAt: group.createdAt,
      description: null,
      isMember: false,
      memberRole: null,
      joinRequestStatus: joinReq?.status ?? null,
    });
    return;
  }

  res.json({ ...group, isMember, memberRole: membership?.role ?? null, joinRequestStatus: null });
});

router.patch("/groups/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const membership = await assertCommunityGroupAdmin(res, groupId, userId);
  if (!membership) return;

  const { name, description, category, coverUrl, privacy } = req.body as {
    name?: string;
    description?: string;
    category?: string;
    coverUrl?: string | null;
    privacy?: string;
  };

  if (name !== undefined && !name.trim()) {
    res.status(400).json({ error: "Le nom du groupe est requis" });
    return;
  }

  if (privacy !== undefined && !["public", "private"].includes(privacy)) {
    res.status(400).json({ error: "Valeur de confidentialité invalide" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (category !== undefined) updates.category = category;
  if (coverUrl !== undefined) updates.coverUrl = coverUrl ?? null;
  if (privacy !== undefined) updates.privacy = privacy;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Aucune modification fournie" });
    return;
  }

  const [updated] = await db
    .update(groupsTable)
    .set(updates)
    .where(eq(groupsTable.id, groupId))
    .returning();

  res.json(updated);
});

router.post("/groups/:id/join", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [group] = await db
    .select({ id: groupsTable.id, privacy: groupsTable.privacy })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  if (group.privacy === "private") {
    res.status(403).json({ error: "Ce groupe est privé. Utilisez la demande d'adhésion." });
    return;
  }

  const [existing] = await db
    .select({ id: groupMembersTable.id })
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    res.json({ ok: true, alreadyMember: true });
    return;
  }

  await db.insert(groupMembersTable).values({ groupId, userId, role: "member" });
  await db
    .update(groupsTable)
    .set({ membersCount: sql`${groupsTable.membersCount} + 1` })
    .where(eq(groupsTable.id, groupId));

  runWelcomeBot(groupId, userId).catch(() => {});

  res.json({ ok: true });
});

router.delete("/groups/:id/leave", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [existing] = await db
    .select({ id: groupMembersTable.id })
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    res.json({ ok: true, wasNotMember: true });
    return;
  }

  await db
    .delete(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    );

  await db
    .update(groupsTable)
    .set({ membersCount: sql`GREATEST(${groupsTable.membersCount} - 1, 0)` })
    .where(eq(groupsTable.id, groupId));

  res.json({ ok: true });
});

router.get("/groups/:id/posts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [group] = await db
    .select({ id: groupsTable.id, privacy: groupsTable.privacy })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  if (group.privacy === "private") {
    const [membership] = await db
      .select({ id: groupMembersTable.id })
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, userId),
        ),
      )
      .limit(1);
    if (!membership) {
      res.status(403).json({ error: "Accès réservé aux membres" });
      return;
    }
  }

  const posts = await db
    .select({
      id: groupPostsTable.id,
      content: groupPostsTable.content,
      imageUrl: groupPostsTable.imageUrl,
      createdAt: groupPostsTable.createdAt,
      authorId: usersTable.id,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
      authorAvatarUrl: usersTable.avatarUrl,
    })
    .from(groupPostsTable)
    .innerJoin(usersTable, eq(groupPostsTable.userId, usersTable.id))
    .where(eq(groupPostsTable.groupId, groupId))
    .orderBy(desc(groupPostsTable.createdAt))
    .limit(50);

  res.json(posts);
});

router.post("/groups/:id/posts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [group] = await db
    .select({ id: groupsTable.id, privacy: groupsTable.privacy })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const [membership] = await db
    .select({ id: groupMembersTable.id })
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, userId),
      ),
    )
    .limit(1);

  if (!membership) {
    res.status(403).json({ error: "Vous devez être membre pour publier dans ce groupe" });
    return;
  }

  const { content, imageUrl } = req.body as { content?: string; imageUrl?: string };
  if (!content?.trim()) {
    res.status(400).json({ error: "Le contenu est requis" });
    return;
  }

  const [post] = await db
    .insert(groupPostsTable)
    .values({ groupId, userId, content: content.trim(), imageUrl: imageUrl ?? null })
    .returning();

  const botResult = await runContentBots(groupId, userId, post.id, content.trim());
  if (botResult.blocked) {
    res.status(422).json({ error: botResult.reason ?? "Message bloqué par le bot de modération." });
    return;
  }

  res.status(201).json(post);
});

router.get("/groups/:id/members", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [membership] = await db
    .select({ role: groupMembersTable.role })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
    .limit(1);

  if (!membership) {
    res.status(403).json({ error: "Accès réservé aux membres" });
    return;
  }

  const members = await db
    .select({
      memberId: groupMembersTable.id,
      role: groupMembersTable.role,
      joinedAt: groupMembersTable.joinedAt,
      userId: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(groupMembersTable)
    .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, groupId))
    .orderBy(
      sql`CASE WHEN ${groupMembersTable.role} = 'admin' THEN 0 WHEN ${groupMembersTable.role} = 'moderator' THEN 1 ELSE 2 END`,
      desc(groupMembersTable.joinedAt),
    )
    .limit(200);

  res.json({ members, myRole: membership.role });
});

router.delete("/groups/:id/members/:targetUserId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  const targetUserId = parseInt(req.params.targetUserId, 10);

  if (isNaN(groupId) || isNaN(targetUserId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  if (targetUserId === userId) {
    res.status(400).json({ error: "Utilisez la route /leave pour quitter le groupe" });
    return;
  }

  const myMembership = await assertCommunityGroupAdminOrModerator(res, groupId, userId);
  if (!myMembership) return;

  const [target] = await db
    .select({ role: groupMembersTable.role })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "Membre introuvable" });
    return;
  }

  if (target.role === "admin") {
    res.status(403).json({ error: "Impossible de retirer un administrateur" });
    return;
  }

  if (target.role === "moderator" && myMembership.role !== "admin") {
    res.status(403).json({ error: "Seul l'admin peut retirer un modérateur" });
    return;
  }

  await db
    .delete(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)));

  await db
    .update(groupsTable)
    .set({ membersCount: sql`GREATEST(${groupsTable.membersCount} - 1, 0)` })
    .where(eq(groupsTable.id, groupId));

  res.json({ ok: true });
});

router.patch("/groups/:id/members/:targetUserId/role", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  const targetUserId = parseInt(req.params.targetUserId, 10);

  if (isNaN(groupId) || isNaN(targetUserId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { role } = req.body as { role?: string };
  if (!role || !["member", "moderator"].includes(role)) {
    res.status(400).json({ error: "Rôle invalide. Valeurs possibles: member, moderator" });
    return;
  }

  const membership = await assertCommunityGroupAdmin(res, groupId, userId);
  if (!membership) return;

  const [target] = await db
    .select({ role: groupMembersTable.role })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "Membre introuvable" });
    return;
  }

  if (target.role === "admin") {
    res.status(403).json({ error: "Impossible de changer le rôle d'un administrateur" });
    return;
  }

  await db
    .update(groupMembersTable)
    .set({ role })
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, targetUserId)));

  res.json({ ok: true, role });
});

router.post("/groups/:id/join-requests", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [group] = await db
    .select({ id: groupsTable.id, privacy: groupsTable.privacy })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) {
    res.status(404).json({ error: "Groupe introuvable" });
    return;
  }

  if (group.privacy !== "private") {
    res.status(400).json({ error: "Ce groupe est public, rejoignez-le directement" });
    return;
  }

  const [existing] = await db
    .select({ id: groupMembersTable.id })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
    .limit(1);

  if (existing) {
    res.json({ ok: true, alreadyMember: true });
    return;
  }

  const [pendingReq] = await db
    .select({ id: groupJoinRequestsTable.id, status: groupJoinRequestsTable.status })
    .from(groupJoinRequestsTable)
    .where(
      and(
        eq(groupJoinRequestsTable.groupId, groupId),
        eq(groupJoinRequestsTable.userId, userId),
      ),
    )
    .orderBy(desc(groupJoinRequestsTable.createdAt))
    .limit(1);

  if (pendingReq && pendingReq.status === "pending") {
    res.json({ ok: true, status: "pending", requestId: pendingReq.id });
    return;
  }

  const [created] = await db
    .insert(groupJoinRequestsTable)
    .values({ groupId, userId, status: "pending" })
    .returning();

  res.status(201).json({ ok: true, status: "pending", requestId: created.id });
});

router.get("/groups/:id/join-requests", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const membership = await assertCommunityGroupAdminOrModerator(res, groupId, userId);
  if (!membership) return;

  const requests = await db
    .select({
      requestId: groupJoinRequestsTable.id,
      status: groupJoinRequestsTable.status,
      createdAt: groupJoinRequestsTable.createdAt,
      userId: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(groupJoinRequestsTable)
    .innerJoin(usersTable, eq(groupJoinRequestsTable.userId, usersTable.id))
    .where(
      and(
        eq(groupJoinRequestsTable.groupId, groupId),
        eq(groupJoinRequestsTable.status, "pending"),
      ),
    )
    .orderBy(desc(groupJoinRequestsTable.createdAt))
    .limit(100);

  res.json(requests);
});

router.patch("/groups/:id/join-requests/:requestId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const groupId = parseInt(req.params.id, 10);
  const requestId = parseInt(req.params.requestId, 10);

  if (isNaN(groupId) || isNaN(requestId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { action } = req.body as { action?: string };
  if (!action || !["approve", "reject"].includes(action)) {
    res.status(400).json({ error: "Action invalide. Valeurs possibles: approve, reject" });
    return;
  }

  const membership = await assertCommunityGroupAdminOrModerator(res, groupId, userId);
  if (!membership) return;

  const [joinReq] = await db
    .select()
    .from(groupJoinRequestsTable)
    .where(
      and(
        eq(groupJoinRequestsTable.id, requestId),
        eq(groupJoinRequestsTable.groupId, groupId),
      ),
    )
    .limit(1);

  if (!joinReq) {
    res.status(404).json({ error: "Demande introuvable" });
    return;
  }

  if (joinReq.status !== "pending") {
    res.status(400).json({ error: "Cette demande a déjà été traitée" });
    return;
  }

  const [group] = await db
    .select({ name: groupsTable.name })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  const groupName = group?.name ?? "le groupe";

  if (action === "approve") {
    const [alreadyMember] = await db
      .select({ id: groupMembersTable.id })
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, joinReq.userId)))
      .limit(1);

    if (!alreadyMember) {
      await db.insert(groupMembersTable).values({ groupId, userId: joinReq.userId, role: "member" });
      await db
        .update(groupsTable)
        .set({ membersCount: sql`${groupsTable.membersCount} + 1` })
        .where(eq(groupsTable.id, groupId));
      runWelcomeBot(groupId, joinReq.userId).catch(() => {});
    }

    await db
      .update(groupJoinRequestsTable)
      .set({ status: "approved" })
      .where(eq(groupJoinRequestsTable.id, requestId));

    await db.insert(notificationsTable).values({
      userId: joinReq.userId,
      type: "group",
      actorId: userId,
      action: `Votre demande de rejoindre "${groupName}" a été approuvée`,
      link: `/groups/${groupId}`,
    });
  } else {
    await db
      .update(groupJoinRequestsTable)
      .set({ status: "rejected" })
      .where(eq(groupJoinRequestsTable.id, requestId));

    await db.insert(notificationsTable).values({
      userId: joinReq.userId,
      type: "group",
      actorId: userId,
      action: `Votre demande de rejoindre "${groupName}" a été refusée`,
      link: `/groups/${groupId}`,
    });
  }

  res.json({ ok: true, action });
});

export default router;
