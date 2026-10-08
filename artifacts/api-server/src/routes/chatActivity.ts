import { Router } from "express";
import { z } from "zod";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db, chatGroupMembersTable, chatPresenceSessionsTable as sessions, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();
const sessionSchema = z.object({ sessionId: z.string().uuid(), online: z.boolean() });
const typingSchema = z.object({ sessionId: z.string().uuid(), typing: z.boolean() });
const onlineCutoff = () => new Date(Date.now() - 30_000);

router.post("/presence/session", requireAuth, async (req, res): Promise<void> => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Session invalide" }); return; }
  const { sessionId, online } = parsed.data;
  const userId = req.userId!;
  const ownSession = and(eq(sessions.userId, userId), eq(sessions.sessionId, sessionId));
  if (!online) {
    await db.delete(sessions).where(ownSession);
  } else {
    const now = new Date();
    await db.insert(sessions).values({ userId, sessionId, lastSeenAt: now })
      .onConflictDoUpdate({ target: [sessions.userId, sessions.sessionId], set: { lastSeenAt: now } });
    await db.delete(sessions).where(lt(sessions.lastSeenAt, new Date(Date.now() - 10 * 60_000)));
  }
  res.sendStatus(204);
});

async function hasMembership(groupId: number, userId: number) {
  const [member] = await db.select({ userId: chatGroupMembersTable.userId }).from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId)));
  return Boolean(member);
}

router.post("/chat-groups/:id/typing", requireAuth, async (req, res): Promise<void> => {
  const groupId = Number(req.params.id);
  const parsed = typingSchema.safeParse(req.body);
  if (!Number.isSafeInteger(groupId) || groupId < 1 || !parsed.success) {
    res.status(400).json({ error: "Activité invalide" }); return;
  }
  const userId = req.userId!;
  if (!await hasMembership(groupId, userId)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const { sessionId, typing } = parsed.data;
  const ownSession = and(eq(sessions.userId, userId), eq(sessions.sessionId, sessionId));
  if (!typing) {
    await db.update(sessions).set({ typingGroupId: null, typingUntil: null })
      .where(and(ownSession, eq(sessions.typingGroupId, groupId)));
  } else {
    const now = new Date();
    const values = { lastSeenAt: now, typingGroupId: groupId, typingUntil: new Date(Date.now() + 5_000) };
    await db.insert(sessions).values({ userId, sessionId, ...values })
      .onConflictDoUpdate({ target: [sessions.userId, sessions.sessionId], set: values });
  }
  res.sendStatus(204);
});

router.get("/chat-groups/:id/activity", requireAuth, async (req, res): Promise<void> => {
  const groupId = Number(req.params.id);
  if (!Number.isSafeInteger(groupId) || groupId < 1) { res.status(400).json({ error: "Groupe invalide" }); return; }
  const me = req.userId!;
  if (!await hasMembership(groupId, me)) { res.status(403).json({ error: "Accès refusé" }); return; }
  const members = await db.select({ userId: chatGroupMembersTable.userId }).from(chatGroupMembersTable)
    .where(eq(chatGroupMembersTable.groupId, groupId));
  const active = members.length ? await db.select({
    userId: sessions.userId, groupId: sessions.typingGroupId, typingUntil: sessions.typingUntil,
    firstName: usersTable.firstName, lastName: usersTable.lastName,
  }).from(sessions).innerJoin(usersTable, eq(usersTable.id, sessions.userId))
    .where(and(inArray(sessions.userId, members.map(m => m.userId)), gt(sessions.lastSeenAt, onlineCutoff()))) : [];
  const typing = new Map<number, { userId: number; name: string }>();
  for (const session of active) {
    if (session.userId !== me && session.groupId === groupId && session.typingUntil && session.typingUntil > new Date()) {
      typing.set(session.userId, { userId: session.userId, name: `${session.firstName} ${session.lastName}`.trim() });
    }
  }
  res.json({ membersCount: members.length, onlineCount: new Set(active.map(s => s.userId)).size, typing: [...typing.values()] });
});

export default router;
