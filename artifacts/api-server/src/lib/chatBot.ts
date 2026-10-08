import { createHash } from "node:crypto";
import {
  db, chatBotSanctionsTable, chatGroupsTable, chatGroupMembersTable,
  chatGroupMessagesTable, usersTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { isMediaMessage, normalizeModerationText, prohibitedContent, renderWelcome } from "./chatBotConfig";
import { BotError, botAdmin, botMessage, botNote, lockBotGroup, readBotSettings, recordBotMetrics } from "./chatBotServices";
import { performBotAction, readSanction, sanctionWhere } from "./chatBotSanctions";
import { executeBotCommand, PUBLIC_BOT_COMMANDS, ADMIN_BOT_COMMANDS } from "./chatBotCommands";
export { BotError, readBotSettings } from "./chatBotServices";
export { performBotAction } from "./chatBotSanctions";

/** Rules execute and violations commit atomically, but blocked member content is never inserted. */
export async function moderatedChatMessage(groupId: number, userId: number, content: string): Promise<
  { blocked: true; error: string; action: string } |
  { blocked: false; message: typeof chatGroupMessagesTable.$inferSelect; bot: boolean }
> {
  return db.transaction(async tx => {
    await lockBotGroup(tx, groupId);
    const [member] = await tx.select().from(chatGroupMembersTable).where(and(
      eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId),
    )).for("share");
    if (!member) throw new BotError(403, "Accès refusé");
    const settings = await readBotSettings(tx, groupId);
    const [group] = await tx.select().from(chatGroupsTable).where(eq(chatGroupsTable.id, groupId));
    if (!group) throw new BotError(404, "Groupe introuvable");
    const command = content.split(/\s+/)[0]!;
    const publicCommand = settings.enabled && PUBLIC_BOT_COMMANDS.has(command);
    const [existing] = await tx.select().from(chatBotSanctionsTable).where(sanctionWhere(groupId, userId));
    if (member.role === "member" && existing?.banned) throw new BotError(403, "Vous êtes banni de ce groupe");
    // Manual sanctions remain in effect when automatic protection is disabled.
    if (member.role === "member" && existing?.mutedUntil && existing.mutedUntil.getTime() > Date.now()) {
      throw new BotError(403, `Vous ne pouvez pas écrire avant ${existing.mutedUntil.toLocaleString("fr-FR")}`);
    }
    if (member.role === "member" && settings.enabled && settings.verificationEnabled && existing?.verificationUntil &&
      existing.verificationUntil.getTime() > Date.now() && !publicCommand) {
      throw new BotError(403, "Confirmez les règles du groupe avec le bouton « Je suis humain » avant d'écrire");
    }
    if (member.role === "member" && !group.permSendMsgs && !publicCommand) throw new BotError(403, "Seuls les administrateurs peuvent envoyer des messages dans ce groupe");
    if (member.role === "member" && !group.permSendMedia && isMediaMessage(content)) throw new BotError(403, "Les médias ne sont pas autorisés dans ce groupe");
    if (settings.enabled) {
      // Commands obey the same bounded server-side message rate as normal messages.
      const row = await readSanction(tx, groupId, userId);
      const now = Date.now();
      const recent = row.recentMessages.filter(entry => entry.time > now - settings.windowSeconds * 1000);
      const fingerprint = createHash("sha256").update(normalizeModerationText(content).trim().replace(/\s+/g, " ")).digest("hex");
      if (recent.length >= 30) throw new BotError(429, "Trop de requêtes au bot. Veuillez patienter.");
      await tx.update(chatBotSanctionsTable).set({ recentMessages: [...recent, { time: now, fingerprint }].slice(-31) }).where(sanctionWhere(groupId, userId));
      await recordBotMetrics(tx, groupId, { analyzed: 1 });
      if (PUBLIC_BOT_COMMANDS.has(command) || ADMIN_BOT_COMMANDS.has(command)) {
        const response = await executeBotCommand(tx, groupId, userId, member.role, content, settings);
        if (response) return { blocked: false as const, message: response, bot: true };
      }
      if (member.role === "member") {
        let reason = prohibitedContent(content, settings);
        let rule = reason === "Lien non autorisé" ? "links" : reason ? "words" : "";
        if (!reason && settings.antiFlood && recent.length >= settings.maxMessages) { reason = "Messages envoyés trop rapidement"; rule = "flood"; }
        if (!reason && settings.antiSpam && recent.filter(entry => entry.fingerprint === fingerprint).length >= settings.duplicateThreshold - 1) { reason = "Messages identiques répétés"; rule = "spam"; }
        const media = isMediaMessage(content);
        const mediaFingerprint = createHash("sha256").update("__media__").digest("hex");
        // Media events share a marker so different uploads are counted as a flood.
        if (media) {
          const mediaCount = recent.filter(entry => entry.fingerprint === mediaFingerprint).length;
          if (!reason && settings.antiSpam && mediaCount >= settings.maxMedia) { reason = "Flood de médias"; rule = "spam"; }
          await tx.update(chatBotSanctionsTable).set({ recentMessages: [...recent, { time: now, fingerprint: mediaFingerprint }].slice(-31) }).where(sanctionWhere(groupId, userId));
        }
        if (!reason && settings.antiSpam && (content.match(/@[\p{L}\p{N}_-]+/gu)?.length ?? 0) > settings.maxMentions) { reason = "Trop de mentions dans un message"; rule = "spam"; }
        if (!reason && settings.newMemberProtection && member.joinedAt.getTime() > now - settings.protectionMinutes * 60_000 &&
          (media || prohibitedContent(content, { ...settings, blockLinks: true, wordFilter: false }) !== null)) {
          reason = "Les nouveaux membres ne peuvent pas encore publier de liens ou de médias"; rule = "new_member";
        }
        // Opting out of an action permission does not grant the bot an implicit deletion right.
        const deletionAllowed = media ? settings.permissions.deleteMedia : rule === "links" ? settings.permissions.deleteLinks : settings.permissions.deleteMessages;
        if (reason && deletionAllowed) {
          await recordBotMetrics(tx, groupId, { blocked: 1, spam: rule === "spam" || rule === "flood" ? 1 : 0, links: rule === "links" ? 1 : 0 });
          await botNote(tx, groupId, null, userId, "blocked", reason, { metadata: { rule, contentFingerprint: fingerprint } });
          const configured = settings.violationAction;
          const action = configured !== "delete" && settings.permissions[configured] ? configured : "blocked";
          if (action !== "blocked") {
            await performBotAction(tx, groupId, null, { action, targetUserId: userId, reason }, settings);
          }
          return { blocked: true as const, error: `Message bloqué : ${reason}. Veuillez patienter ou consulter les règles du groupe.`, action };
        }
      }
    }
    const [message] = await tx.insert(chatGroupMessagesTable).values({ groupId, senderId: userId, content, type: "text" }).returning();
    return { blocked: false as const, message: message!, bot: false };
  });
}

/** Inserts, bans and welcomes use the same group lock and transaction as sanctions. */
export async function addChatMembers(groupId: number, userIds: number[], actorId?: number) {
  return db.transaction(async tx => {
    await lockBotGroup(tx, groupId);
    if (actorId !== undefined) await botAdmin(tx, groupId, actorId);
    const addedIds: number[] = [];
    const settings = await readBotSettings(tx, groupId);
    const [group] = await tx.select().from(chatGroupsTable).where(eq(chatGroupsTable.id, groupId));
    if (!group) throw new BotError(404, "Groupe introuvable");
    for (const userId of [...new Set(userIds)].sort((a, b) => a - b)) {
      const [restriction] = await tx.select().from(chatBotSanctionsTable).where(sanctionWhere(groupId, userId));
      if (restriction?.banned) throw new BotError(403, "Un membre banni ne peut pas rejoindre avant la levée du bannissement");
      const [added] = await tx.insert(chatGroupMembersTable).values({ groupId, userId, role: "member" }).onConflictDoNothing().returning();
      if (!added) continue;
      addedIds.push(userId);
      if (!settings.enabled) continue;
      if (settings.newMemberProtection || settings.verificationEnabled) {
        await readSanction(tx, groupId, userId);
        await tx.update(chatBotSanctionsTable).set({
          verificationUntil: settings.verificationEnabled ? new Date(Date.now() + settings.verificationMinutes * 60_000) : null,
        }).where(sanctionWhere(groupId, userId));
        await botNote(tx, groupId, null, userId, "protected", "Protection d'un nouveau membre", { metadata: { verification: settings.verificationEnabled } });
      }
      if (settings.welcomeEnabled && settings.welcomeMessage.trim()) {
        const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId));
        const [count] = await tx.select({ total: sql<number>`count(*)::int` }).from(chatGroupMembersTable).where(eq(chatGroupMembersTable.groupId, groupId));
        await botMessage(tx, groupId, renderWelcome(settings.welcomeMessage, {
          username: user ? `${user.firstName} ${user.lastName}`.trim() : `#${userId}`,
          groupName: group.name, date: new Date().toLocaleDateString("fr-FR", { timeZone: "UTC" }), memberCount: count!.total,
        }));
        await botNote(tx, groupId, null, userId, "welcome", "Message de bienvenue envoyé");
      }
    }
    return addedIds;
  });
}
export async function addChatMember(groupId: number, userId: number, actorId?: number) {
  return (await addChatMembers(groupId, [userId], actorId)).includes(userId);
}
