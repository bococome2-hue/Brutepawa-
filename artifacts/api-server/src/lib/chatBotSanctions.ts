import { chatBotSanctionsTable, chatBotLogsTable, chatGroupMembersTable, chatGroupMessagesTable, usersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { isMediaMessage, type BotAction, type BotSettings } from "./chatBotConfig";
import { assertBotPermission, botAdmin, BotError, botMessage, botNote, lockBotGroup, type BotTx } from "./chatBotServices";

export const sanctionWhere = (groupId: number, userId: number) =>
  and(eq(chatBotSanctionsTable.groupId, groupId), eq(chatBotSanctionsTable.userId, userId));

export async function readSanction(tx: BotTx, groupId: number, userId: number) {
  await tx.insert(chatBotSanctionsTable).values({ groupId, userId }).onConflictDoNothing();
  const [row] = await tx.select().from(chatBotSanctionsTable).where(sanctionWhere(groupId, userId)).for("update");
  if (row!.mutedUntil && row!.mutedUntil.getTime() <= Date.now()) {
    await tx.update(chatBotSanctionsTable).set({ mutedUntil: null }).where(sanctionWhere(groupId, userId));
    await botNote(tx, groupId, null, userId, "mute_expired", "Fin automatique de la sourdine");
    row!.mutedUntil = null;
  }
  if (row!.verificationUntil && row!.verificationUntil.getTime() <= Date.now()) {
    await tx.update(chatBotSanctionsTable).set({ verificationUntil: null }).where(sanctionWhere(groupId, userId));
    await botNote(tx, groupId, null, userId, "verification_expired", "Limitation de vérification expirée automatiquement");
    row!.verificationUntil = null;
  }
  return row!;
}

export async function userDisplayName(tx: BotTx, userId: number) {
  const [user] = await tx.select({ firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) throw new BotError(404, "Utilisateur introuvable");
  return `${user.firstName} ${user.lastName}`.trim();
}

/** All entry points share one hierarchy, permission check and transactional audit. */
export async function performBotAction(tx: BotTx, groupId: number, actorId: number | null, input: BotAction, settings: BotSettings) {
  await lockBotGroup(tx, groupId);
  if (!settings.enabled) throw new BotError(409, "Activez le bot avant d'effectuer une action");
  if (actorId !== null) await botAdmin(tx, groupId, actorId);
  if (input.requestId) {
    const [already] = await tx.select().from(chatBotLogsTable).where(and(
      eq(chatBotLogsTable.groupId, groupId), eq(chatBotLogsTable.requestId, input.requestId),
    ));
    if (already) {
      if (already.actorId !== actorId || already.metadata.input !== JSON.stringify({ ...input, requestId: undefined })) {
        throw new BotError(409, "Cet identifiant de requête correspond à une autre action");
      }
      return;
    }
  }
  const extra = { requestId: input.requestId, metadata: { input: JSON.stringify({ ...input, requestId: undefined }), reason: input.reason ?? "Modération" } };
  if (input.action === "delete") {
    const [message] = await tx.select().from(chatGroupMessagesTable).where(and(
      eq(chatGroupMessagesTable.groupId, groupId), eq(chatGroupMessagesTable.id, input.messageId!),
    )).for("update");
    if (!message) throw new BotError(404, "Message introuvable dans ce groupe");
    assertBotPermission(settings, isMediaMessage(message.content) ? "deleteMedia" : "deleteMessages");
    const [sender] = await tx.select().from(chatGroupMembersTable).where(and(
      eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, message.senderId),
    ));
    if (message.type === "system" || sender?.role === "owner" || sender?.role === "admin") {
      throw new BotError(403, "Les messages du système, du propriétaire et des administrateurs sont protégés");
    }
    await tx.delete(chatGroupMessagesTable).where(eq(chatGroupMessagesTable.id, message.id));
    await botNote(tx, groupId, actorId, message.senderId, "delete", input.reason || "Message supprimé", { ...extra, messageId: message.id });
    return;
  }
  const permission = { warn: "warn", mute: "mute", unmute: "mute", kick: "kick", ban: "ban", unban: "unban", reset: "warn", verify: "warn" } as const;
  assertBotPermission(settings, permission[input.action]);
  const userId = input.targetUserId!;
  const [target] = await tx.select().from(chatGroupMembersTable).where(and(
    eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId),
  )).for("update");
  if (target && target.role !== "member") throw new BotError(403, "Le propriétaire et les administrateurs sont protégés");
  if (!target && input.action === "ban") {
    const [previous] = await tx.select().from(chatBotSanctionsTable).where(sanctionWhere(groupId, userId));
    if (previous?.banned) {
      // A repeated ban is a no-op, not a new ban statistic.
      if (input.requestId) await botNote(tx, groupId, actorId, userId, "noop", "Utilisateur déjà banni", extra);
      return;
    }
  }
  if (!target && ["warn", "mute", "kick", "ban", "verify"].includes(input.action)) throw new BotError(404, "Ce membre n'est pas dans le groupe");
  const name = await userDisplayName(tx, userId);
  const current = await readSanction(tx, groupId, userId);
  if ((input.action === "unban" && !current.banned) || (input.action === "unmute" && !current.mutedUntil) ||
    (input.action === "reset" && !current.warnings) || (input.action === "verify" && !current.verificationUntil)) {
    if (input.requestId) await botNote(tx, groupId, actorId, userId, "noop", "État déjà appliqué", extra);
    return;
  }
  const reason = input.reason || "Action administrateur";
  let expiresAt: Date | undefined;
  if (input.action === "warn") {
    const warnings = current.warnings + 1;
    await tx.update(chatBotSanctionsTable).set({ warnings }).where(sanctionWhere(groupId, userId));
    await botNote(tx, groupId, actorId, userId, "warn", `${reason} — avertissement ${warnings} / ${settings.warnBeforeBan}`, { ...extra, metadata: { ...extra.metadata, warnings } });
    let automatic: "mute" | "kick" | "ban" | null = warnings >= settings.warnBeforeBan ? settings.finalSanction : warnings >= settings.warnBeforeMute ? "mute" : null;
    if (automatic && !settings.permissions[automatic]) automatic = null;
    // Higher levels apply once at their threshold, avoiding repeated extension and notification spam.
    if (automatic && (warnings === settings.warnBeforeBan || warnings === settings.warnBeforeMute)) {
      await performBotAction(tx, groupId, null, { action: automatic, targetUserId: userId, reason: `Seuil d'avertissements atteint : ${warnings}`, durationMinutes: settings.muteMinutes }, settings);
    } else {
      await botMessage(tx, groupId, `${name} : ${reason}. Avertissement ${warnings} / ${settings.warnBeforeBan}.`);
    }
    return;
  }
  switch (input.action) {
    case "mute":
      expiresAt = new Date(Date.now() + (input.durationMinutes ?? settings.muteMinutes) * 60_000);
      await tx.update(chatBotSanctionsTable).set({ mutedUntil: expiresAt }).where(sanctionWhere(groupId, userId));
      break;
    case "unmute":
      await tx.update(chatBotSanctionsTable).set({ mutedUntil: null }).where(sanctionWhere(groupId, userId)); break;
    case "kick":
      await tx.delete(chatGroupMembersTable).where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId))); break;
    case "ban":
      await tx.update(chatBotSanctionsTable).set({ banned: true, mutedUntil: null }).where(sanctionWhere(groupId, userId));
      await tx.delete(chatGroupMembersTable).where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId))); break;
    case "unban":
      await tx.update(chatBotSanctionsTable).set({ banned: false }).where(sanctionWhere(groupId, userId)); break;
    case "reset":
      await tx.update(chatBotSanctionsTable).set({ warnings: 0 }).where(sanctionWhere(groupId, userId)); break;
    case "verify":
      await tx.update(chatBotSanctionsTable).set({ verificationUntil: null }).where(sanctionWhere(groupId, userId)); break;
  }
  const descriptions = {
    mute: `Sourdine pendant ${input.durationMinutes ?? settings.muteMinutes} minutes`,
    unmute: "Sourdine levée", kick: "Expulsion", ban: "Bannissement", unban: "Bannissement levé",
    reset: `Avertissements remis à zéro (ancien total : ${current.warnings})`, verify: "Participation validée",
  };
  await botNote(tx, groupId, actorId, userId, input.action, `${descriptions[input.action]} : ${reason}`, { ...extra, expiresAt });
  await botMessage(tx, groupId, `${name} : ${descriptions[input.action]}. Raison : ${reason}.`);
}

/** Timestamp checks enforce expiration immediately; this sweep only cleans persisted expired states and audits it. */
export async function expireBotSanctions(tx: BotTx, groupId: number) {
  const expired = await tx.update(chatBotSanctionsTable).set({ mutedUntil: null })
    .where(and(eq(chatBotSanctionsTable.groupId, groupId), sql`${chatBotSanctionsTable.mutedUntil} <= now()`))
    .returning({ userId: chatBotSanctionsTable.userId });
  for (const row of expired) await botNote(tx, groupId, null, row.userId, "mute_expired", "Fin automatique de la sourdine");
}
