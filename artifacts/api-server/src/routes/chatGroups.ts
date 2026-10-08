import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, chatGroupsTable, chatGroupMembersTable, chatGroupMessagesTable, chatGroupInviteLinksTable, usersTable } from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { pushToUserDevice } from "./push";
import { assertChatGroupAdminOrOwner } from "../lib/groupAuth";
import { sql } from "drizzle-orm";
import { moderatedChatMessage, addChatMember, addChatMembers, BotError } from "../lib/chatBot";

const router = Router();

// ── Audit helpers ────────────────────────────────────────────────────────────

/** Write an audit entry using an existing transaction/db handle. Throws on failure. */
async function writeAudit(tx: Pick<typeof db, "execute">, groupId: number, actorId: number, event: string, targetId?: number, detail?: string) {
  await tx.execute(sql`
    INSERT INTO chat_group_audit_log (group_id, actor_id, target_id, event, detail)
    VALUES (${groupId}, ${actorId}, ${targetId ?? null}, ${event}::chat_group_audit_event, ${detail ?? null})
  `);
}

/** Best-effort audit for non-critical events — logs errors but never breaks the caller. */
async function logAudit(groupId: number, actorId: number, event: string, targetId?: number, detail?: string) {
  try {
    await writeAudit(db, groupId, actorId, event, targetId, detail);
  } catch (err) {
    console.error("[audit-log] Failed to write audit entry", { groupId, actorId, event, targetId, err });
  }
}

router.get("/chat-groups", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;

  const memberships = await db.select({
    groupId: chatGroupMembersTable.groupId,
    role: chatGroupMembersTable.role,
  }).from(chatGroupMembersTable).where(eq(chatGroupMembersTable.userId, me));

  if (memberships.length === 0) { res.json([]); return; }

  const groupIds = memberships.map(m => m.groupId);
  const groups = await db.select().from(chatGroupsTable)
    .where(inArray(chatGroupsTable.id, groupIds));

  const memberRows = await db.select({ groupId: chatGroupMembersTable.groupId })
    .from(chatGroupMembersTable).where(inArray(chatGroupMembersTable.groupId, groupIds));

  const lastMsgs = await Promise.all(groupIds.map(async gid => {
    const [msg] = await db.select().from(chatGroupMessagesTable)
      .where(eq(chatGroupMessagesTable.groupId, gid))
      .orderBy(desc(chatGroupMessagesTable.createdAt)).limit(1);
    return { groupId: gid, msg };
  }));

  const memberCountMap: Record<number, number> = {};
  memberRows.forEach(m => { memberCountMap[m.groupId] = (memberCountMap[m.groupId] ?? 0) + 1; });
  const lastMsgMap: Record<number, typeof lastMsgs[0]> = {};
  lastMsgs.forEach(l => { lastMsgMap[l.groupId] = l; });
  const roleMap: Record<number, string> = {};
  memberships.forEach(m => { roleMap[m.groupId] = m.role; });

  const result = groups.map(g => ({
    id: g.id,
    name: g.name,
    avatarUrl: g.avatarUrl,
    type: g.type,
    membersCount: memberCountMap[g.id] ?? 0,
    lastMessage: lastMsgMap[g.id]?.msg?.content ?? "",
    lastMessageAt: lastMsgMap[g.id]?.msg?.createdAt?.toISOString() ?? g.updatedAt.toISOString(),
    unread: 0,
    role: roleMap[g.id] ?? "member",
    updatedAt: g.updatedAt.toISOString(),
  }));

  result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  res.json(result);
});

router.post("/chat-groups", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const { name, type = "group", memberIds = [] } = req.body as { name: string; type?: string; memberIds?: number[] };

  if (!name || name.trim().length < 1) { res.status(400).json({ error: "Nom requis" }); return; }

  const [group] = await db.insert(chatGroupsTable).values({
    name: name.trim(),
    type: type === "channel" ? "channel" : "group",
    createdById: me,
  }).returning();

  const allMemberIds = [me, ...memberIds.filter((id: number) => id !== me)];
  await db.insert(chatGroupMembersTable).values(
    allMemberIds.map((uid: number) => ({
      groupId: group.id,
      userId: uid,
      role: uid === me ? "owner" as const : "member" as const,
    }))
  ).onConflictDoNothing();

  await db.insert(chatGroupMessagesTable).values({
    groupId: group.id,
    senderId: me,
    content: `Groupe "${group.name}" créé`,
    type: "system",
  });

  // Log added members
  if (memberIds.length > 0) {
    await logAudit(group.id, me, "member_added", undefined, `${memberIds.length} membre(s) ajouté(s) à la création`);
  }

  res.status(201).json({ ...group, createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString() });
});

router.get("/chat-groups/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [group] = await db.select().from(chatGroupsTable).where(eq(chatGroupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Groupe introuvable" }); return; }

  const [membership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, me)));
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }

  const members = await db.select({
    userId: chatGroupMembersTable.userId,
    role: chatGroupMembersTable.role,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl,
  }).from(chatGroupMembersTable)
    .leftJoin(usersTable, eq(chatGroupMembersTable.userId, usersTable.id))
    .where(eq(chatGroupMembersTable.groupId, id));

  res.json({
    id: group.id, name: group.name, avatarUrl: group.avatarUrl, type: group.type,
    createdById: group.createdById,
    createdAt: group.createdAt.toISOString(), updatedAt: group.updatedAt.toISOString(),
    role: membership.role,
    members,
  });
});

router.get("/chat-groups/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [membership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, me)));
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }

  const msgs = await db.select({
    id: chatGroupMessagesTable.id,
    groupId: chatGroupMessagesTable.groupId,
    senderId: chatGroupMessagesTable.senderId,
    content: chatGroupMessagesTable.content,
    type: chatGroupMessagesTable.type,
    createdAt: chatGroupMessagesTable.createdAt,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
  }).from(chatGroupMessagesTable)
    .leftJoin(usersTable, eq(chatGroupMessagesTable.senderId, usersTable.id))
    .where(eq(chatGroupMessagesTable.groupId, id))
    .orderBy(desc(chatGroupMessagesTable.id))
    .limit(200);

  res.json(msgs.reverse().map(m => ({
    id: m.id, groupId: m.groupId, senderId: m.senderId,
    content: m.content, type: m.type,
    createdAt: m.createdAt.toISOString(),
    senderName: m.senderId === 0 ? "BrutePawa Bot" : m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : `#${m.senderId}`,
  })));
});

router.post("/chat-groups/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { content } = req.body as { content: string };
  if (typeof content !== "string" || content.trim().length === 0 || content.length > 20_000) { res.status(400).json({ error: "Le message doit contenir entre 1 et 20 000 caractères" }); return; }

  const [membership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, me)));
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }

  let moderated;
  try {
    moderated = await moderatedChatMessage(id, me, content.trim());
  } catch (error) {
    if (!(error instanceof BotError)) throw error;
    res.status(error.status).json({ error: error.message }); return;
  }
  if (moderated.blocked) {
    res.status(422).json({ error: moderated.error, moderation: moderated.action }); return;
  }
  const msg = moderated.message;
  if (moderated.bot) {
    res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString(), senderName: "BrutePawa Bot" });
    return;
  }

  const [user] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, me));
  const senderName = user ? `${user.firstName} ${user.lastName}`.trim() : `#${me}`;

  // Push à tous les membres du groupe sauf l'expéditeur
  const [group] = await db.select({ name: chatGroupsTable.name })
    .from(chatGroupsTable).where(eq(chatGroupsTable.id, id));
  const allMembers = await db.select({ userId: chatGroupMembersTable.userId })
    .from(chatGroupMembersTable).where(eq(chatGroupMembersTable.groupId, id));
  const otherMembers = allMembers.filter(m => m.userId !== me);
  const raw = content.trim();
  const preview = raw.startsWith("__audio__")    ? "🎤 Message vocal"
    : raw.startsWith("__video__")    ? "📹 Message vidéo"
    : raw.startsWith("__sticker__")  ? "Sticker"
    : raw.startsWith("__image__")    ? "📷 Photo"
    : raw.startsWith("__doc__")      ? "📎 Document"
    : raw.startsWith("__location__") ? "📍 Localisation"
    : raw.length > 80 ? raw.slice(0, 80) + "…" : raw;
  otherMembers.forEach(m => {
    pushToUserDevice(m.userId, {
      title: `💬 ${group?.name ?? "Groupe"} — ${senderName}`,
      body: preview,
      tag: `chat-group-${id}`,
      data: { url: `/chat-groups/${id}` },
    }).catch(() => {});
  });

  res.status(201).json({
    ...msg,
    createdAt: msg.createdAt.toISOString(),
    senderName,
  });
});

router.patch("/chat-groups/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const membership = await assertChatGroupAdminOrOwner(res, id, me);
  if (!membership) return;

  const { name, avatarUrl } = req.body as { name?: string; avatarUrl?: string };
  const updates: Record<string, unknown> = {};
  if (name) updates.name = name.trim();
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  const [updated] = await db.update(chatGroupsTable).set(updates)
    .where(eq(chatGroupsTable.id, id)).returning();

  const parts: string[] = [];
  if (name) parts.push(`nom → "${name.trim()}"`);
  if (avatarUrl !== undefined) parts.push("avatar mis à jour");
  await logAudit(id, me, "group_updated", undefined, parts.join(", ") || "paramètres mis à jour");

  res.json(updated);
});

router.delete("/chat-groups/:id/leave", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  // Verify the caller is actually a member before deleting or logging
  const [existing] = await db.select({ id: chatGroupMembersTable.id })
    .from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, me)));
  if (!existing) { res.status(404).json({ error: "Vous n'êtes pas membre de ce groupe" }); return; }

  await db.delete(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, me)));

  // Best-effort log — leave is already committed above
  await logAudit(id, me, "member_left", me);

  res.json({ ok: true });
});

router.post("/chat-groups/:id/members", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const membership = await assertChatGroupAdminOrOwner(res, id, me);
  if (!membership) return;

  const { userIds } = req.body as { userIds: number[] };
  if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > 1000 || userIds.some(uid => !Number.isSafeInteger(uid) || uid <= 0)) { res.status(400).json({ error: "userIds requis (1 à 1000 identifiants valides)" }); return; }

  try {
    await addChatMembers(id, userIds, me);
  } catch (error) {
    if (!(error instanceof BotError)) throw error;
    res.status(error.status).json({ error: error.message }); return;
  }

  await logAudit(id, me, "member_added", undefined, `${userIds.length} membre(s) ajouté(s)`);

  res.json({ ok: true });
});

// ── KICK / BAN a member ──────────────────────────────────────────────────────
router.delete("/chat-groups/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const targetId = parseInt(req.params.userId);
  if (isNaN(id) || isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [membership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, me)));
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    res.status(403).json({ error: "Accès refusé" }); return;
  }

  // Cannot kick an owner
  const [targetMembership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, targetId)));
  if (!targetMembership) { res.status(404).json({ error: "Membre introuvable" }); return; }
  if (targetMembership.role === "owner") { res.status(403).json({ error: "Impossible d'exclure le propriétaire" }); return; }

  // Atomic: kick + audit in a single transaction
  await db.transaction(async (tx) => {
    await tx.delete(chatGroupMembersTable)
      .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, targetId)));
    await writeAudit(tx, id, me, "member_kicked", targetId);
  });

  res.json({ ok: true });
});

// ── CHANGE a member's role ───────────────────────────────────────────────────
router.patch("/chat-groups/:id/members/:userId/role", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  const targetId = parseInt(req.params.userId);
  if (isNaN(id) || isNaN(targetId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [membership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, me)));
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    res.status(403).json({ error: "Accès refusé" }); return;
  }

  const { role } = req.body as { role: string };
  if (!["admin", "member"].includes(role)) { res.status(400).json({ error: "Rôle invalide (admin|member)" }); return; }

  // Only owner can promote to admin
  if (role === "admin" && membership.role !== "owner") {
    res.status(403).json({ error: "Seul le propriétaire peut promouvoir un admin" }); return;
  }

  const [targetMembership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, targetId)));
  if (!targetMembership) { res.status(404).json({ error: "Membre introuvable" }); return; }
  if (targetMembership.role === "owner") { res.status(403).json({ error: "Impossible de modifier le rôle du propriétaire" }); return; }

  const roleLabel = role === "admin" ? "Administrateur" : "Membre";

  // Atomic: role update + audit in a single transaction
  await db.transaction(async (tx) => {
    await tx.update(chatGroupMembersTable)
      .set({ role: role as "admin" | "member" })
      .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, targetId)));
    await writeAudit(tx, id, me, "role_changed", targetId, `→ ${roleLabel}`);
  });

  res.json({ ok: true });
});

// ── AUDIT LOG ────────────────────────────────────────────────────────────────
router.get("/chat-groups/:id/audit-log", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [membership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, me)));
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }
  if (membership.role !== "owner" && membership.role !== "admin") {
    res.status(403).json({ error: "Réservé aux administrateurs" }); return;
  }

  const limit = Math.min(parseInt(String(req.query.limit ?? "100")), 200);
  const eventFilter = req.query.event as string | undefined;

  let query = sql`
    SELECT
      l.id, l.group_id, l.actor_id, l.target_id, l.event, l.detail, l.created_at,
      a.first_name AS actor_first, a.last_name AS actor_last, a.avatar_url AS actor_avatar,
      t.first_name AS target_first, t.last_name AS target_last, t.avatar_url AS target_avatar
    FROM chat_group_audit_log l
    LEFT JOIN users a ON a.id = l.actor_id
    LEFT JOIN users t ON t.id = l.target_id
    WHERE l.group_id = ${id}
    ${eventFilter ? sql`AND l.event = ${eventFilter}::chat_group_audit_event` : sql``}
    ORDER BY l.created_at DESC
    LIMIT ${limit}
  `;

  const rows = await db.execute(query) as unknown as { rows: Record<string, unknown>[] };
  const entries = (rows.rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    groupId: r.group_id,
    actorId: r.actor_id,
    targetId: r.target_id ?? null,
    event: r.event,
    detail: r.detail ?? null,
    createdAt: r.created_at,
    actorName: r.actor_first && r.actor_last ? `${r.actor_first} ${r.actor_last}` : `#${r.actor_id}`,
    actorAvatar: r.actor_avatar ?? null,
    targetName: r.target_first && r.target_last ? `${r.target_first} ${r.target_last}` : (r.target_id ? `#${r.target_id}` : null),
    targetAvatar: r.target_avatar ?? null,
  }));

  res.json(entries);
});

/* ── Group management: members / admins / settings / invite links / permissions / reactions ── */

async function getMembership(groupId: number, userId: number) {
  const [membership] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId)));
  return membership;
}

function isGroupAdmin(m?: { role: string }) {
  return !!m && (m.role === "owner" || m.role === "admin");
}

function parseGroupId(raw: string): number | null {
  const id = parseInt(raw);
  return isNaN(id) ? null : id;
}

async function fetchMembers(groupId: number) {
  return db.select({
    userId: chatGroupMembersTable.userId,
    role: chatGroupMembersTable.role,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
    avatarUrl: usersTable.avatarUrl,
    joinedAt: chatGroupMembersTable.joinedAt,
  }).from(chatGroupMembersTable)
    .leftJoin(usersTable, eq(chatGroupMembersTable.userId, usersTable.id))
    .where(eq(chatGroupMembersTable.groupId, groupId));
}

// GET members, grouped in sections
router.get("/chat-groups/:id/members", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }

  const members = await fetchMembers(id);
  const admins = members.filter(m => m.role === "owner" || m.role === "admin");
  const others = members.filter(m => m.role === "member");
  res.json({ admins, bots: [], others, total: members.length, myRole: membership.role });
});

// Change a member's role (promote/demote)
router.patch("/chat-groups/:id/members/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  const targetId = parseGroupId(req.params.userId);
  if (id === null || targetId === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const target = await getMembership(id, targetId);
  if (!target) { res.status(404).json({ error: "Membre introuvable" }); return; }
  if (target.role === "owner") { res.status(403).json({ error: "Impossible de modifier le propriétaire" }); return; }

  const { role } = req.body as { role?: string };
  if (role !== "admin" && role !== "member") { res.status(400).json({ error: "Rôle invalide" }); return; }
  if (role === "admin" && membership!.role !== "owner") {
    res.status(403).json({ error: "Seul le propriétaire peut promouvoir un admin" }); return;
  }

  await db.transaction(async (tx) => {
    await tx.update(chatGroupMembersTable).set({ role })
      .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, targetId)));
    await writeAudit(tx, id, me, "role_changed", targetId, `→ ${role === "admin" ? "Administrateur" : "Membre"}`);
  });
  res.json({ ok: true });
});

// (Eject is handled by the DELETE /chat-groups/:id/members/:userId route above, with audit logging.)

// List admins
router.get("/chat-groups/:id/admins", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }

  const members = await fetchMembers(id);
  res.json(members.filter(m => m.role === "owner" || m.role === "admin"));
});

// Promote to admin
router.post("/chat-groups/:id/admins", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!membership || membership.role !== "owner") { res.status(403).json({ error: "Seul le propriétaire peut promouvoir un admin" }); return; }

  const { userId } = req.body as { userId?: number };
  if (!userId || typeof userId !== "number") { res.status(400).json({ error: "userId requis" }); return; }
  const target = await getMembership(id, userId);
  if (!target) { res.status(404).json({ error: "Membre introuvable" }); return; }
  if (target.role === "owner") { res.status(400).json({ error: "Déjà propriétaire" }); return; }

  await db.transaction(async (tx) => {
    await tx.update(chatGroupMembersTable).set({ role: "admin" })
      .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, userId)));
    await writeAudit(tx, id, me, "role_changed", userId, "→ Administrateur");
  });
  res.json({ ok: true });
});

// Demote an admin
router.delete("/chat-groups/:id/admins/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  const targetId = parseGroupId(req.params.userId);
  if (id === null || targetId === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const target = await getMembership(id, targetId);
  if (!target) { res.status(404).json({ error: "Membre introuvable" }); return; }
  if (target.role === "owner") { res.status(403).json({ error: "Impossible de rétrograder le propriétaire" }); return; }

  await db.transaction(async (tx) => {
    await tx.update(chatGroupMembersTable).set({ role: "member" })
      .where(and(eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, targetId)));
    await writeAudit(tx, id, me, "role_changed", targetId, "→ Membre");
  });
  res.json({ ok: true });
});

function settingsPayload(g: typeof chatGroupsTable.$inferSelect) {
  let reactEmojis: string[] = [];
  try { reactEmojis = JSON.parse(g.reactEmojis) as string[]; } catch { /* ignore */ }
  return {
    hideMembers: g.hideMembers,
    antiSpam: g.antiSpam,
    topicsEnabled: g.topicsEnabled,
    permissions: {
      sendMsgs: g.permSendMsgs,
      sendMedia: g.permSendMedia,
      addUsers: g.permAddUsers,
      pinMsgs: g.permPinMsgs,
      modTitles: g.permModTitles,
      modExchange: g.permModExchange,
    },
    chargeTokens: g.chargeTokens,
    tokenPrice: g.tokenPrice,
    reactMode: g.reactMode as "all" | "some" | "none",
    reactEmojis,
  };
}

// GET all group settings (any member can read)
router.get("/chat-groups/:id/settings", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }

  const [group] = await db.select().from(chatGroupsTable).where(eq(chatGroupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Groupe introuvable" }); return; }
  res.json(settingsPayload(group));
});

// PATCH general settings (hideMembers, antiSpam, topicsEnabled) — admin only
router.patch("/chat-groups/:id/settings", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const { hideMembers, antiSpam, topicsEnabled } = req.body as { hideMembers?: boolean; antiSpam?: boolean; topicsEnabled?: boolean };
  const updates: Record<string, unknown> = {};
  if (typeof hideMembers === "boolean") updates.hideMembers = hideMembers;
  if (typeof antiSpam === "boolean") updates.antiSpam = antiSpam;
  if (typeof topicsEnabled === "boolean") updates.topicsEnabled = topicsEnabled;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Aucune modification" }); return; }

  const [updated] = await db.update(chatGroupsTable).set(updates).where(eq(chatGroupsTable.id, id)).returning();
  res.json(settingsPayload(updated));
});

// GET permissions
router.get("/chat-groups/:id/permissions", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }

  const [group] = await db.select().from(chatGroupsTable).where(eq(chatGroupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Groupe introuvable" }); return; }
  const p = settingsPayload(group);
  res.json({ permissions: p.permissions, chargeTokens: p.chargeTokens, tokenPrice: p.tokenPrice });
});

// PATCH permissions — admin only
router.patch("/chat-groups/:id/permissions", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const body = req.body as {
    permissions?: Partial<Record<"sendMsgs"|"sendMedia"|"addUsers"|"pinMsgs"|"modTitles"|"modExchange", boolean>>;
    chargeTokens?: boolean; tokenPrice?: number;
  };
  const updates: Record<string, unknown> = {};
  const p = body.permissions ?? {};
  if (typeof p.sendMsgs === "boolean") updates.permSendMsgs = p.sendMsgs;
  if (typeof p.sendMedia === "boolean") updates.permSendMedia = p.sendMedia;
  if (typeof p.addUsers === "boolean") updates.permAddUsers = p.addUsers;
  if (typeof p.pinMsgs === "boolean") updates.permPinMsgs = p.pinMsgs;
  if (typeof p.modTitles === "boolean") updates.permModTitles = p.modTitles;
  if (typeof p.modExchange === "boolean") updates.permModExchange = p.modExchange;
  if (typeof body.chargeTokens === "boolean") updates.chargeTokens = body.chargeTokens;
  if (typeof body.tokenPrice === "number" && body.tokenPrice >= 1 && body.tokenPrice <= 35000) updates.tokenPrice = Math.round(body.tokenPrice);
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Aucune modification" }); return; }

  const [updated] = await db.update(chatGroupsTable).set(updates).where(eq(chatGroupsTable.id, id)).returning();
  const s = settingsPayload(updated);
  res.json({ permissions: s.permissions, chargeTokens: s.chargeTokens, tokenPrice: s.tokenPrice });
});

// GET reactions config
router.get("/chat-groups/:id/reactions", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!membership) { res.status(403).json({ error: "Accès refusé" }); return; }

  const [group] = await db.select().from(chatGroupsTable).where(eq(chatGroupsTable.id, id));
  if (!group) { res.status(404).json({ error: "Groupe introuvable" }); return; }
  const s = settingsPayload(group);
  res.json({ mode: s.reactMode, emojis: s.reactEmojis });
});

// PATCH reactions config — admin only
router.patch("/chat-groups/:id/reactions", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const { mode, emojis } = req.body as { mode?: string; emojis?: string[] };
  const updates: Record<string, unknown> = {};
  if (mode !== undefined) {
    if (mode !== "all" && mode !== "some" && mode !== "none") { res.status(400).json({ error: "Mode invalide" }); return; }
    updates.reactMode = mode;
  }
  if (emojis !== undefined) {
    if (!Array.isArray(emojis) || emojis.some(e => typeof e !== "string" || e.length > 16)) { res.status(400).json({ error: "Emojis invalides" }); return; }
    updates.reactEmojis = JSON.stringify(emojis.slice(0, 50));
  }
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Aucune modification" }); return; }

  const [updated] = await db.update(chatGroupsTable).set(updates).where(eq(chatGroupsTable.id, id)).returning();
  const s = settingsPayload(updated);
  res.json({ mode: s.reactMode, emojis: s.reactEmojis });
});

function getLinkStatus(l: typeof chatGroupInviteLinksTable.$inferSelect): "active" | "expired" | "revoked" | "limit_reached" {
  if (l.revoked) return "revoked";
  if (l.expiresAt && l.expiresAt < new Date()) return "expired";
  if (l.maxUses != null && l.usesCount >= l.maxUses) return "limit_reached";
  return "active";
}

function linkPayload(l: typeof chatGroupInviteLinksTable.$inferSelect, creator?: { firstName: string | null; lastName: string | null } | null) {
  return {
    id: l.id,
    code: l.code,
    url: `brutepawa.com/join/${l.code}`,
    label: l.label,
    name: l.name,
    type: l.type as "unlimited" | "uses" | "duration" | "both",
    maxUses: l.maxUses,
    usesCount: l.usesCount,
    expiresAt: l.expiresAt?.toISOString() ?? null,
    clicksCount: l.clicksCount,
    createdById: l.createdById,
    createdByName: creator?.firstName && creator?.lastName ? `${creator.firstName} ${creator.lastName}` : null,
    revoked: l.revoked,
    revokedAt: l.revokedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    status: getLinkStatus(l),
  };
}

function genInviteCode(groupId: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let rand = "";
  for (let i = 0; i < 8; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `${groupId.toString(36)}${rand}`;
}

// List invite links (admin only)
router.get("/chat-groups/:id/invite-links", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  let links = await db.select().from(chatGroupInviteLinksTable)
    .where(eq(chatGroupInviteLinksTable.groupId, id))
    .orderBy(desc(chatGroupInviteLinksTable.createdAt));

  // Ensure the group always has a primary (non-revoked) link
  if (!links.some(l => !l.revoked)) {
    const [created] = await db.insert(chatGroupInviteLinksTable).values({
      groupId: id, code: genInviteCode(id), label: "Lien principal", createdById: me,
    }).returning();
    links = [created, ...links];
  }

  const creatorIds = [...new Set(links.map(l => l.createdById))];
  const creators = creatorIds.length > 0
    ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable).where(inArray(usersTable.id, creatorIds))
    : [];
  const creatorMap = new Map(creators.map(c => [c.id, c]));
  res.json(links.map(l => linkPayload(l, creatorMap.get(l.createdById))));
});

// Create a new invite link (admin only)
router.post("/chat-groups/:id/invite-links", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  if (id === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const { label, name, type, maxUses, expiresAt } = req.body as { label?: string; name?: string; type?: string; maxUses?: number; expiresAt?: string };
  const [created] = await db.insert(chatGroupInviteLinksTable).values({
    groupId: id,
    code: genInviteCode(id),
    label: label?.trim() || null,
    name: name?.trim() || null,
    type: type || "unlimited",
    maxUses: maxUses ?? null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdById: me,
  }).returning();
  res.status(201).json(linkPayload(created));
});

// Update an invite link (admin only)
router.patch("/chat-groups/:id/invite-links/:linkId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  const linkId = parseGroupId(req.params.linkId);
  if (id === null || linkId === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const [link] = await db.select().from(chatGroupInviteLinksTable)
    .where(and(eq(chatGroupInviteLinksTable.id, linkId), eq(chatGroupInviteLinksTable.groupId, id)));
  if (!link) { res.status(404).json({ error: "Lien introuvable" }); return; }
  if (link.revoked) { res.status(400).json({ error: "Ce lien est révoqué" }); return; }

  const { name, type, maxUses, expiresAt } = req.body as { name?: string; type?: string; maxUses?: number | null; expiresAt?: string | null };
  const updates: Partial<typeof chatGroupInviteLinksTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name?.trim() || null;
  if (type !== undefined) updates.type = type;
  if (maxUses !== undefined) updates.maxUses = maxUses ?? null;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const [updated] = await db.update(chatGroupInviteLinksTable).set(updates)
    .where(eq(chatGroupInviteLinksTable.id, linkId)).returning();
  res.json(linkPayload(updated));
});

// Get stats for an invite link (admin only)
router.get("/chat-groups/:id/invite-links/:linkId/stats", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  const linkId = parseGroupId(req.params.linkId);
  if (id === null || linkId === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const [link] = await db.select().from(chatGroupInviteLinksTable)
    .where(and(eq(chatGroupInviteLinksTable.id, linkId), eq(chatGroupInviteLinksTable.groupId, id)));
  if (!link) { res.status(404).json({ error: "Lien introuvable" }); return; }

  const clicks = link.clicksCount;
  const uses = link.usesCount;
  const conversionRate = clicks > 0 ? Math.round((uses / clicks) * 1000) / 10 : 0;

  // Build recent activity from group members who joined after the link was created
  const COLORS = ["#EC4899","#8B5CF6","#F97316","#22C55E","#0EA5E9","#F59E0B","#EF4444"];
  const recentMembers = await db.select({
    userId: chatGroupMembersTable.userId,
    joinedAt: chatGroupMembersTable.joinedAt,
    firstName: usersTable.firstName,
    lastName: usersTable.lastName,
  })
    .from(chatGroupMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, chatGroupMembersTable.userId))
    .where(and(
      eq(chatGroupMembersTable.groupId, id),
      sql`${chatGroupMembersTable.joinedAt} >= ${link.createdAt}`
    ))
    .orderBy(desc(chatGroupMembersTable.joinedAt))
    .limit(10);

  function timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `il y a ${diff}s`;
    if (diff < 3600) return `il y a ${Math.floor(diff/60)}mn`;
    if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`;
    return `il y a ${Math.floor(diff/86400)}j`;
  }

  const activity = recentMembers.map(m => {
    const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "Utilisateur Anonyme";
    const initials = name.split(" ").map(w=>w[0]?.toUpperCase()||"").join("").slice(0,2);
    return { userName: name, action: "A utilisé le lien", time: timeAgo(m.joinedAt), initials, color: COLORS[m.userId % COLORS.length] };
  });

  res.json({ clicks, uses, conversionRate, activity });
});

// Revoke an invite link (admin only)
router.delete("/chat-groups/:id/invite-links/:linkId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const id = parseGroupId(req.params.id);
  const linkId = parseGroupId(req.params.linkId);
  if (id === null || linkId === null) { res.status(400).json({ error: "Invalid id" }); return; }
  const membership = await getMembership(id, me);
  if (!isGroupAdmin(membership)) { res.status(403).json({ error: "Accès refusé" }); return; }

  const [link] = await db.select().from(chatGroupInviteLinksTable)
    .where(and(eq(chatGroupInviteLinksTable.id, linkId), eq(chatGroupInviteLinksTable.groupId, id)));
  if (!link) { res.status(404).json({ error: "Lien introuvable" }); return; }

  await db.update(chatGroupInviteLinksTable).set({ revoked: true, revokedAt: new Date() })
    .where(eq(chatGroupInviteLinksTable.id, linkId));
  res.json({ ok: true });
});

// Track invite link click (public, no auth)
router.post("/invite/:code/click", async (req, res): Promise<void> => {
  const { code } = req.params;
  await db.update(chatGroupInviteLinksTable)
    .set({ clicksCount: sql`${chatGroupInviteLinksTable.clicksCount} + 1` })
    .where(and(eq(chatGroupInviteLinksTable.code, code), eq(chatGroupInviteLinksTable.revoked, false)));
  res.json({ ok: true });
});

// Join via invite link (requires auth)
router.post("/invite/:code/join", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const { code } = req.params;

  const [link] = await db.select().from(chatGroupInviteLinksTable)
    .where(eq(chatGroupInviteLinksTable.code, code));
  if (!link) { res.status(404).json({ error: "Lien introuvable" }); return; }
  if (link.revoked) { res.status(410).json({ error: "Ce lien a été révoqué" }); return; }
  if (link.expiresAt && link.expiresAt < new Date()) { res.status(410).json({ error: "Ce lien a expiré" }); return; }
  if (link.maxUses != null && link.usesCount >= link.maxUses) { res.status(410).json({ error: "La limite d'utilisations est atteinte" }); return; }

  const [group] = await db.select({ id: chatGroupsTable.id, name: chatGroupsTable.name, type: chatGroupsTable.type })
    .from(chatGroupsTable).where(eq(chatGroupsTable.id, link.groupId));
  if (!group) { res.status(404).json({ error: "Groupe introuvable" }); return; }

  // Check if already member
  const [existing] = await db.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, link.groupId), eq(chatGroupMembersTable.userId, me)));
  if (existing) { res.json({ groupId: group.id, groupName: group.name, alreadyMember: true }); return; }

  // Add member + increment uses_count atomically
  try {
    await addChatMember(link.groupId, me);
  } catch (error) {
    if (!(error instanceof BotError)) throw error;
    res.status(error.status).json({ error: error.message }); return;
  }
  await db.update(chatGroupInviteLinksTable)
    .set({ usesCount: sql`${chatGroupInviteLinksTable.usesCount} + 1` })
    .where(eq(chatGroupInviteLinksTable.id, link.id));

  res.json({ groupId: group.id, groupName: group.name, alreadyMember: false });
});

export default router;
