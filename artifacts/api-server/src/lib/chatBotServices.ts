import {
  db, chatBotSettingsTable, chatBotLogsTable, chatBotMetricsTable,
  chatGroupMembersTable, chatGroupMessagesTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { botSettingsSchema, defaultBotSettings, type BotSettings } from "./chatBotConfig";

export type BotTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class BotError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function lockBotGroup(tx: BotTx, groupId: number) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${groupId}, -1)`);
}
export async function readBotSettings(tx: Pick<typeof db, "select">, groupId: number): Promise<BotSettings> {
  const [row] = await tx.select().from(chatBotSettingsTable).where(eq(chatBotSettingsTable.groupId, groupId));
  if (!row) return botSettingsSchema.parse(defaultBotSettings);
  const legacy = JSON.parse(row.settings);
  // Preserve explicitly disabled legacy anti-spam rather than enabling flood by migration.
  return botSettingsSchema.parse({ antiFlood: legacy.antiSpam, ...legacy });
}
export async function botAdmin(tx: BotTx, groupId: number, userId: number) {
  const [member] = await tx.select().from(chatGroupMembersTable).where(and(
    eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId),
  )).for("share");
  if (!member || member.role === "member") throw new BotError(403, "Réservé aux administrateurs du groupe");
  return member;
}
export function assertBotPermission(settings: BotSettings, key: keyof BotSettings["permissions"]) {
  if (!settings.permissions[key]) throw new BotError(403, "Cette permission du bot n'est pas autorisée dans ce groupe");
}
export async function botNote(tx: BotTx, groupId: number, actorId: number | null, targetUserId: number | null,
  action: string, detail: string, extra: { messageId?: number; expiresAt?: Date; requestId?: string; metadata?: Record<string, unknown> } = {}) {
  await tx.insert(chatBotLogsTable).values({ groupId, actorId, targetUserId, action, detail, ...extra });
}
export async function botMessage(tx: BotTx, groupId: number, text: string) {
  const [msg] = await tx.insert(chatGroupMessagesTable).values({
    groupId, senderId: 0, type: "system", content: `BrutePawa Bot — ${text}`,
  }).returning();
  return msg!;
}
export async function recordBotMetrics(tx: BotTx, groupId: number, values: { analyzed?: number; blocked?: number; spam?: number; links?: number }) {
  const day = new Date().toISOString().slice(0, 10);
  const increments = { analyzed: values.analyzed ?? 0, blocked: values.blocked ?? 0, spam: values.spam ?? 0, links: values.links ?? 0 };
  await tx.insert(chatBotMetricsTable).values({ groupId, day, ...increments }).onConflictDoUpdate({
    target: [chatBotMetricsTable.groupId, chatBotMetricsTable.day],
    set: {
      analyzed: sql`${chatBotMetricsTable.analyzed} + ${increments.analyzed}`,
      blocked: sql`${chatBotMetricsTable.blocked} + ${increments.blocked}`,
      spam: sql`${chatBotMetricsTable.spam} + ${increments.spam}`,
      links: sql`${chatBotMetricsTable.links} + ${increments.links}`,
    },
  });
}
