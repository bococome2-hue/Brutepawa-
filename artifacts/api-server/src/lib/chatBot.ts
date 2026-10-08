import { createHash } from "node:crypto";
import {
  db, chatBotSettingsTable, chatBotSanctionsTable, chatBotLogsTable,
  chatGroupsTable, chatGroupMembersTable, chatGroupMessagesTable, usersTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { botSettingsSchema, defaultBotSettings, prohibitedContent, type BotSettings, type BotAction } from "./chatBotConfig";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class BotError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const targetWhere = (groupId: number, userId: number) =>
  and(eq(chatBotSanctionsTable.groupId, groupId), eq(chatBotSanctionsTable.userId, userId));

export async function readBotSettings(tx: Pick<typeof db, "select">, groupId: number): Promise<BotSettings> {
  const [row] = await tx.select().from(chatBotSettingsTable).where(eq(chatBotSettingsTable.groupId, groupId));
  return row ? botSettingsSchema.parse(JSON.parse(row.settings)) : { ...defaultBotSettings };
}

async function lockMember(tx: Tx, groupId: number, userId: number) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${groupId}, ${userId})`);
}

async function sanction(tx: Tx, groupId: number, userId: number) {
  await tx.insert(chatBotSanctionsTable).values({ groupId, userId }).onConflictDoNothing();
  const [row] = await tx.select().from(chatBotSanctionsTable).where(targetWhere(groupId, userId));
  return row!;
}

async function note(tx: Tx, groupId: number, actorId: number | null, targetUserId: number | null, action: string, detail: string) {
  await tx.insert(chatBotLogsTable).values({ groupId, actorId, targetUserId, action, detail });
}

async function botMessage(tx: Tx, groupId: number, text: string) {
  const [msg] = await tx.insert(chatGroupMessagesTable).values({
    groupId, senderId: 0, type: "system", content: `BrutePawa Bot — ${text}`,
  }).returning();
  return msg!;
}

async function applyWarning(tx: Tx, groupId: number, userId: number, settings: BotSettings, actorId: number | null, reason: string) {
  const row = await sanction(tx, groupId, userId);
  const warnings = row.warnings + 1;
  const banned = warnings >= settings.warnBeforeBan;
  const mute = !banned && warnings >= settings.warnBeforeMute;
  const mutedUntil = mute ? new Date(Date.now() + settings.muteMinutes * 60_000) : row.mutedUntil;
  await tx.update(chatBotSanctionsTable).set({ warnings, banned, mutedUntil }).where(targetWhere(groupId, userId));
  if (banned) {
    await tx.delete(chatGroupMembersTable).where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId)));
  }
  const action = banned ? "ban" : mute ? "mute" : "warn";
  const result = banned ? "banni du groupe" : mute ? `interdit d’écrire pendant ${settings.muteMinutes} minutes` : "averti";
  await note(tx, groupId, actorId, userId, action, `${reason} — avertissement ${warnings}, ${result}`);
  const [user] = await tx.select({ firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable).where(eq(usersTable.id, userId));
  await botMessage(tx, groupId, `${user ? `${user.firstName} ${user.lastName}` : `Membre #${userId}`} : ${reason}. Avertissement ${warnings}, ${result}.`);
  return { action, error: `Message bloqué : ${reason}. Avertissement ${warnings} : vous êtes ${result}.` };
}

export async function performBotAction(tx: Tx, groupId: number, actorId: number, input: BotAction, settings: BotSettings) {
  if (input.action === "delete") {
    const [message] = await tx.delete(chatGroupMessagesTable)
      .where(and(eq(chatGroupMessagesTable.groupId, groupId), eq(chatGroupMessagesTable.id, input.messageId!))).returning();
    if (!message) throw new BotError(404, "Message introuvable dans ce groupe");
    await note(tx, groupId, actorId, message.senderId, "delete", `Message #${message.id} supprimé : ${input.reason || "Modération"}`);
    return;
  }
  const userId = input.targetUserId!;
  await lockMember(tx, groupId, userId);
  const [target] = await tx.select().from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId))).for("update");
  if (target && target.role !== "member") throw new BotError(403, "Le propriétaire et les administrateurs sont protégés");
  if (!target && ["warn", "mute", "ban"].includes(input.action)) throw new BotError(404, "Ce membre n’est pas dans le groupe");
  const [user] = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) throw new BotError(404, "Utilisateur introuvable");
  const current = await sanction(tx, groupId, userId);
  if (input.action === "warn") {
    await applyWarning(tx, groupId, userId, settings, actorId, input.reason || "Avertissement administrateur");
    return;
  }
  switch (input.action) {
    case "mute":
      await tx.update(chatBotSanctionsTable).set({ mutedUntil: new Date(Date.now() + (input.durationMinutes ?? settings.muteMinutes) * 60_000) }).where(targetWhere(groupId, userId));
      break;
    case "unmute":
      await tx.update(chatBotSanctionsTable).set({ mutedUntil: null }).where(targetWhere(groupId, userId));
      break;
    case "ban":
      await tx.update(chatBotSanctionsTable).set({ banned: true, mutedUntil: null }).where(targetWhere(groupId, userId));
      await tx.delete(chatGroupMembersTable).where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId)));
      break;
    case "unban":
      await tx.update(chatBotSanctionsTable).set({ banned: false }).where(targetWhere(groupId, userId));
      break;
    case "reset":
      await tx.update(chatBotSanctionsTable).set({ warnings: 0 }).where(targetWhere(groupId, userId));
      break;
  }
  const description = {
    mute: `Écriture bloquée pendant ${input.durationMinutes ?? settings.muteMinutes} minutes`,
    unmute: "Écriture rétablie", ban: "Bannissement", unban: "Bannissement levé",
    reset: `Avertissements réinitialisés (ancien total : ${current.warnings})`,
  }[input.action];
  await note(tx, groupId, actorId, userId, input.action, `${description} : ${input.reason || "Action administrateur"}`);
  await botMessage(tx, groupId, `${description} pour le membre #${userId}.`);
}

/** Commit violations and sanctions, but never commit a rejected member message. */
export async function moderatedChatMessage(groupId: number, userId: number, content: string): Promise<
  { blocked: true; error: string; action: string } |
  { blocked: false; message: typeof chatGroupMessagesTable.$inferSelect; bot: boolean }
> {
  return db.transaction(async tx => {
    await lockMember(tx, groupId, userId);
    const [member] = await tx.select().from(chatGroupMembersTable)
      .where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId)));
    if (!member) throw new BotError(403, "Accès refusé");
    const [existing] = await tx.select().from(chatBotSanctionsTable).where(targetWhere(groupId, userId));
    if (member.role === "member" && existing?.banned) throw new BotError(403, "Vous êtes banni de ce groupe");
    if (member.role === "member" && existing?.mutedUntil && existing.mutedUntil.getTime() > Date.now()) {
      throw new BotError(403, `Vous ne pouvez pas écrire avant ${existing.mutedUntil.toLocaleString("fr-FR")}`);
    }
    const settings = await readBotSettings(tx, groupId);
    const [group] = await tx.select().from(chatGroupsTable).where(eq(chatGroupsTable.id, groupId));
    if (!group) throw new BotError(404, "Groupe introuvable");
    if (settings.enabled && content.startsWith("/")) {
      const [command, ...args] = content.split(/\s+/);
      const commands = ["/warn", "/mute", "/ban", "/unmute", "/unban", "/delete"];
      if (commands.includes(command!)) {
        if (member.role === "member") throw new BotError(403, "Cette commande est réservée aux administrateurs");
        const target = Number(args[0]);
        if (!Number.isSafeInteger(target) || target <= 0) throw new BotError(400, `Utilisation : ${command} ID${command === "/mute" ? " minutes" : ""} raison`);
        const durationMinutes = command === "/mute" ? Number(args[1] ?? settings.muteMinutes) : undefined;
        if (durationMinutes !== undefined && (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440)) throw new BotError(400, "La durée doit être comprise entre 1 et 1440 minutes");
        await performBotAction(tx, groupId, userId, {
          action: command!.slice(1) as BotAction["action"],
          ...(command === "/delete" ? { messageId: target } : { targetUserId: target }),
          durationMinutes, reason: args.slice(command === "/mute" ? 2 : 1).join(" ").slice(0, 500),
        }, settings);
        return { blocked: false as const, message: await botMessage(tx, groupId, `Commande ${command} exécutée.`), bot: true };
      }
    }
    const rulesCommand = settings.enabled && content.split(/\s+/)[0] === "/rules";
    if (member.role === "member" && !group.permSendMsgs && !rulesCommand) throw new BotError(403, "Seuls les administrateurs peuvent envoyer des messages dans ce groupe");
    if (member.role === "member" && !group.permSendMedia && /^__(audio|video|sticker|image|doc|location)__/.test(content)) {
      throw new BotError(403, "Les médias ne sont pas autorisés dans ce groupe");
    }
    if (settings.enabled && member.role === "member") {
      const row = await sanction(tx, groupId, userId);
      const now = Date.now();
      const recent = row.recentMessages.filter(entry => entry.time > now - settings.windowSeconds * 1000);
      const fingerprint = createHash("sha256").update(content.normalize("NFKC").trim().toLowerCase()).digest("hex");
      let reason = prohibitedContent(content, settings);
      if (!reason && settings.antiSpam && (recent.length >= settings.maxMessages || recent.some(entry => entry.fingerprint === fingerprint))) reason = "Spam ou message répété";
      await tx.update(chatBotSanctionsTable).set({
        recentMessages: [...recent, { time: now, fingerprint }].slice(-31),
      }).where(targetWhere(groupId, userId));
      if (reason) {
        const result = await applyWarning(tx, groupId, userId, settings, null, reason);
        return { blocked: true as const, ...result };
      }
    }
    if (rulesCommand) return { blocked: false as const, message: await botMessage(tx, groupId, settings.rules || "Aucune règle définie."), bot: true };
    const [message] = await tx.insert(chatGroupMessagesTable).values({ groupId, senderId: userId, content, type: "text" }).returning();
    return { blocked: false as const, message: message!, bot: false };
  });
}

/** Membership insertion and ban check share the same transaction/lock as bans. */
export async function addChatMembers(groupId: number, userIds: number[]) {
  return db.transaction(async tx => {
    const addedIds: number[] = [];
    for (const userId of [...new Set(userIds)].sort((a, b) => a - b)) {
    await lockMember(tx, groupId, userId);
    const [restriction] = await tx.select().from(chatBotSanctionsTable).where(targetWhere(groupId, userId));
    if (restriction?.banned) throw new BotError(403, "Un membre banni ne peut pas rejoindre avant la levée du bannissement");
    const [added] = await tx.insert(chatGroupMembersTable).values({ groupId, userId, role: "member" }).onConflictDoNothing().returning();
    if (added) {
      addedIds.push(userId);
      const settings = await readBotSettings(tx, groupId);
      if (settings.enabled && settings.welcomeMessage.trim()) {
        const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, userId));
        const [group] = await tx.select().from(chatGroupsTable).where(eq(chatGroupsTable.id, groupId));
        const text = settings.welcomeMessage.replaceAll("{username}", user ? `${user.firstName} ${user.lastName}`.trim() : `#${userId}`).replaceAll("{group}", group?.name ?? "");
        await botMessage(tx, groupId, text);
        await note(tx, groupId, null, userId, "welcome", "Message de bienvenue envoyé");
      }
    }
    }
    return addedIds;
  });
}

export async function addChatMember(groupId: number, userId: number) {
  return (await addChatMembers(groupId, [userId])).includes(userId);
}
