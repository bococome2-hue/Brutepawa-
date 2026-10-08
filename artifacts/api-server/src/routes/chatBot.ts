import { Router } from "express";
import { db, chatBotSettingsTable, chatBotLogsTable, chatBotSanctionsTable, chatGroupMembersTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { botActionSchema, botSettingsSchema } from "../lib/chatBotConfig";
import { assertBotPermission, BotError, botAdmin, botMessage, botNote, lockBotGroup, readBotSettings } from "../lib/chatBotServices";
import { expireBotSanctions, performBotAction, sanctionWhere } from "../lib/chatBotSanctions";
import { getBotStatistics } from "./chatBotStatistics";

const router = Router();
const officialProfile = {
  name: "BrutePawa Bot", handle: "@BrutePawaBot", official: true,
  description: "Bot système officiel de protection et de modération des groupes BrutePawa.",
};
router.use("/chat-groups/:id/bot", requireAuth, async (req, res, next) => {
  const groupId = Number(req.params.id);
  if (!Number.isSafeInteger(groupId) || groupId <= 0 || groupId > 2147483647) { res.status(400).json({ error: "Groupe invalide" }); return; }
  const [member] = await db.select().from(chatGroupMembersTable).where(and(
    eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, req.userId!),
  ));
  if (!member) { res.status(403).json({ error: "Accès refusé" }); return; }
  res.locals.botGroupId = groupId;
  res.locals.botRole = member.role;
  res.set("Cache-Control", "private, no-store");
  next();
});
function errorResponse(res: import("express").Response, error: unknown) {
  if (!(error instanceof BotError)) throw error;
  res.status(error.status).json({ error: error.message });
}
router.get("/chat-groups/:id/bot/profile", async (req, res) => {
  const groupId = res.locals.botGroupId as number;
  const settings = await readBotSettings(db, groupId);
  const [sanction] = await db.select().from(chatBotSanctionsTable).where(sanctionWhere(groupId, req.userId!));
  const pendingVerification = settings.enabled && settings.verificationEnabled && !!sanction?.verificationUntil && sanction.verificationUntil.getTime() > Date.now();
  res.json({ ...officialProfile, enabled: settings.enabled, pendingVerification, verificationExpiresAt: pendingVerification ? sanction!.verificationUntil!.toISOString() : null });
});
router.post("/chat-groups/:id/bot/verify", async (req, res) => {
  try {
    await db.transaction(async tx => {
      const groupId = res.locals.botGroupId as number;
      await lockBotGroup(tx, groupId);
      const [member] = await tx.select().from(chatGroupMembersTable).where(and(
        eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, req.userId!),
      )).for("share");
      if (!member) throw new BotError(403, "Accès refusé");
      const rows = await tx.update(chatBotSanctionsTable).set({ verificationUntil: null }).where(and(
        sanctionWhere(groupId, req.userId!), sql`${chatBotSanctionsTable.verificationUntil} > now()`,
      )).returning();
      if (rows.length) await botNote(tx, groupId, req.userId!, req.userId!, "verify", "Règles acceptées par le membre (confirmation, pas un CAPTCHA)");
    });
    res.sendStatus(204);
  } catch (error) { errorResponse(res, error); }
});
router.get("/chat-groups/:id/bot/statistics", async (req, res) => {
  try {
    const groupId = res.locals.botGroupId as number;
    if (res.locals.botRole === "member") throw new BotError(403, "Réservé aux administrateurs");
    const settings = await readBotSettings(db, groupId);
    if (res.locals.botRole !== "owner") assertBotPermission(settings, "viewStats");
    const period = z.enum(["today", "seven", "thirty", "total"]).safeParse(req.query.period ?? "seven");
    if (!period.success) { res.status(400).json({ error: "Période invalide" }); return; }
    res.json(await getBotStatistics(groupId, period.data));
  } catch (error) { errorResponse(res, error); }
});
router.get("/chat-groups/:id/bot", async (req, res) => {
  try {
    const groupId = res.locals.botGroupId as number;
    if (res.locals.botRole === "member") throw new BotError(403, "Réservé aux administrateurs");
    await db.transaction(async tx => { await lockBotGroup(tx, groupId); await botAdmin(tx, groupId, req.userId!); await expireBotSanctions(tx, groupId); });
    const settings = await readBotSettings(db, groupId);
    const logs = settings.permissions.viewLogs || res.locals.botRole === "owner" ? await db.select().from(chatBotLogsTable).where(eq(chatBotLogsTable.groupId, groupId)).orderBy(desc(chatBotLogsTable.id)).limit(100) : [];
    const sanctions = await db.select({
      userId: chatBotSanctionsTable.userId, name: sql<string>`concat_ws(' ', ${usersTable.firstName}, ${usersTable.lastName})`,
      warnings: chatBotSanctionsTable.warnings, mutedUntil: chatBotSanctionsTable.mutedUntil,
      banned: chatBotSanctionsTable.banned, verificationUntil: chatBotSanctionsTable.verificationUntil,
    }).from(chatBotSanctionsTable).innerJoin(usersTable, eq(usersTable.id, chatBotSanctionsTable.userId)).where(eq(chatBotSanctionsTable.groupId, groupId));
    const members = await db.select({
      userId: chatGroupMembersTable.userId, name: sql<string>`concat_ws(' ', ${usersTable.firstName}, ${usersTable.lastName})`, role: chatGroupMembersTable.role,
    }).from(chatGroupMembersTable).innerJoin(usersTable, eq(usersTable.id, chatGroupMembersTable.userId)).where(eq(chatGroupMembersTable.groupId, groupId));
    res.json({ settings, logs, sanctions, members, profile: officialProfile, myRole: res.locals.botRole });
  } catch (error) { errorResponse(res, error); }
});
router.put("/chat-groups/:id/bot", async (req, res) => {
  const parsed = botSettingsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map(issue => issue.message).join(", ") }); return; }
  const groupId = res.locals.botGroupId as number;
  try {
    await db.transaction(async tx => {
      await lockBotGroup(tx, groupId);
      const admin = await botAdmin(tx, groupId, req.userId!);
      const old = await readBotSettings(tx, groupId);
      if (admin.role !== "owner") {
        assertBotPermission(old, "manageSettings");
        if (JSON.stringify(old.permissions) !== JSON.stringify(parsed.data.permissions)) throw new BotError(403, "Seul le propriétaire peut modifier les permissions du bot");
      }
      await tx.insert(chatBotSettingsTable).values({ groupId, settings: JSON.stringify(parsed.data) }).onConflictDoUpdate({
        target: chatBotSettingsTable.groupId, set: { settings: JSON.stringify(parsed.data) },
      });
      await botNote(tx, groupId, req.userId!, null, "settings", parsed.data.enabled ? "Configuration enregistrée : bot activé" : "Configuration enregistrée : bot désactivé",
        { metadata: { before: old, after: parsed.data } });
      if (!old.enabled && parsed.data.enabled) await botMessage(tx, groupId, "Bot officiel @BrutePawaBot actif. Je protège le groupe contre le spam et applique les règles autorisées. Consultez /help ou configurez-moi depuis les paramètres du groupe.");
    });
    res.json({ settings: parsed.data });
  } catch (error) { errorResponse(res, error); }
});
router.post("/chat-groups/:id/bot/actions", async (req, res) => {
  const parsed = botActionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map(issue => issue.message).join(", ") }); return; }
  const groupId = res.locals.botGroupId as number;
  try {
    await db.transaction(async tx => {
      await lockBotGroup(tx, groupId);
      await botAdmin(tx, groupId, req.userId!);
      const [rate] = await tx.select({ total: sql<number>`count(*)::int` }).from(chatBotLogsTable).where(and(
        eq(chatBotLogsTable.groupId, groupId), eq(chatBotLogsTable.actorId, req.userId!),
        sql`${chatBotLogsTable.createdAt} > now() - interval '10 seconds'`,
      ));
      if (rate!.total >= 20) throw new BotError(429, "Trop d'actions de modération. Veuillez patienter.");
      await performBotAction(tx, groupId, req.userId!, parsed.data, await readBotSettings(tx, groupId));
    });
    res.json({ ok: true });
  } catch (error) { errorResponse(res, error); }
});
// Do not let unsupported bot operations fall through to the app's stream/SPA handlers.
router.use("/chat-groups/:id/bot", (_req, res) => {
  res.status(404).json({ error: "Opération de modération introuvable" });
});

export default router;
