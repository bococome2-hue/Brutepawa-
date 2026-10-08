import { pgTable, integer, boolean, text, timestamp, jsonb, serial, primaryKey, index } from "drizzle-orm/pg-core";
import { chatGroupsTable } from "./social";
import { usersTable } from "./users";

export const chatBotSettingsTable = pgTable("chat_bot_settings", {
  groupId: integer("group_id").primaryKey().references(() => chatGroupsTable.id, { onDelete: "cascade" }),
  settings: text("settings").notNull(),
});

export const chatBotSanctionsTable = pgTable("chat_bot_sanctions", {
  groupId: integer("group_id").notNull().references(() => chatGroupsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  warnings: integer("warnings").notNull().default(0),
  mutedUntil: timestamp("muted_until", { withTimezone: true }),
  banned: boolean("banned").notNull().default(false),
  recentMessages: jsonb("recent_messages").$type<{ time: number; fingerprint: string }[]>().notNull().default([]),
}, t => [primaryKey({ columns: [t.groupId, t.userId] })]);

export const chatBotLogsTable = pgTable("chat_bot_logs", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => chatGroupsTable.id, { onDelete: "cascade" }),
  actorId: integer("actor_id"),
  targetUserId: integer("target_user_id"),
  action: text("action").notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("chat_bot_logs_group_idx").on(t.groupId, t.createdAt)]);
