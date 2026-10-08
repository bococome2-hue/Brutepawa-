import { Router } from "express";
import { db, chatBotSettingsTable, chatBotLogsTable, chatBotSanctionsTable, chatGroupMembersTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { BotError, readBotSettings, performBotAction } from "../lib/chatBot";
import { botActionSchema, botSettingsSchema } from "../lib/chatBotConfig";

const router = Router();
async function verifyAdmin(tx: Pick<typeof db, "select">, groupId: number, userId: number) {
  const [member] = await tx.select().from(chatGroupMembersTable).where(and(
    eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId),
  ));
  if (!member || member.role === "member") throw new BotError(403, "Réservé aux administrateurs du groupe");
}

router.use("/chat-groups/:id/bot", requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: "Groupe invalide" }); return; }
  const [member] = await db.select().from(chatGroupMembersTable).where(and(
    eq(chatGroupMembersTable.groupId, id), eq(chatGroupMembersTable.userId, req.userId!),
  ));
  if (!member || member.role === "member") { res.status(403).json({ error: "Réservé aux administrateurs du groupe" }); return; }
  res.set("Cache-Control", "private, no-store");
  next();
});

router.get("/chat-groups/:id/bot", async (req, res) => {
  const groupId = Number(req.params.id);
  const settings = await readBotSettings(db, groupId);
  const logs = await db.select().from(chatBotLogsTable).where(eq(chatBotLogsTable.groupId, groupId)).orderBy(desc(chatBotLogsTable.id)).limit(100);
  const sanctions = await db.select({
    userId: chatBotSanctionsTable.userId,
    name: sql<string>`concat_ws(' ', ${usersTable.firstName}, ${usersTable.lastName})`,
    warnings: chatBotSanctionsTable.warnings,
    mutedUntil: chatBotSanctionsTable.mutedUntil,
    banned: chatBotSanctionsTable.banned,
  }).from(chatBotSanctionsTable).innerJoin(usersTable, eq(usersTable.id, chatBotSanctionsTable.userId))
    .where(eq(chatBotSanctionsTable.groupId, groupId));
  const members = await db.select({
    userId: chatGroupMembersTable.userId,
    name: sql<string>`concat_ws(' ', ${usersTable.firstName}, ${usersTable.lastName})`,
    role: chatGroupMembersTable.role,
  }).from(chatGroupMembersTable).innerJoin(usersTable, eq(usersTable.id, chatGroupMembersTable.userId))
    .where(eq(chatGroupMembersTable.groupId, groupId));
  res.json({ settings, logs, sanctions, members });
});

router.put("/chat-groups/:id/bot", async (req, res) => {
  const parsed = botSettingsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map(issue => issue.message).join(", ") }); return; }
  const groupId = Number(req.params.id);
  try { await db.transaction(async tx => {
    await verifyAdmin(tx, groupId, req.userId!);
    await tx.insert(chatBotSettingsTable).values({ groupId, settings: JSON.stringify(parsed.data) })
      .onConflictDoUpdate({ target: chatBotSettingsTable.groupId, set: { settings: JSON.stringify(parsed.data) } });
    await tx.insert(chatBotLogsTable).values({
      groupId, actorId: req.userId!, action: "settings", detail: parsed.data.enabled ? "Configuration du bot enregistrée : activé" : "Configuration du bot enregistrée : désactivé",
    });
  }); } catch (error) {
    if (!(error instanceof BotError)) throw error;
    res.status(error.status).json({ error: error.message }); return;
  }
  res.json({ settings: parsed.data });
});

router.post("/chat-groups/:id/bot/actions", async (req, res) => {
  const parsed = botActionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map(issue => issue.message).join(", ") }); return; }
  const groupId = Number(req.params.id);
  try {
    await db.transaction(async tx => {
      await verifyAdmin(tx, groupId, req.userId!);
      await performBotAction(tx, groupId, req.userId!, parsed.data, await readBotSettings(tx, groupId));
    });
    res.json({ ok: true });
  } catch (error) {
    if (!(error instanceof BotError)) throw error;
    res.status(error.status).json({ error: error.message });
  }
});

export default router;
