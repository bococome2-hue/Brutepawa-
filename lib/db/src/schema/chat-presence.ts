import { pgTable, integer, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { chatGroupsTable } from "./social";

export const chatPresenceSessionsTable = pgTable("chat_presence_sessions", {
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  sessionId: uuid("session_id").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
  typingGroupId: integer("typing_group_id").references(() => chatGroupsTable.id, { onDelete: "set null" }),
  typingUntil: timestamp("typing_until", { withTimezone: true }),
}, table => [
  primaryKey({ columns: [table.userId, table.sessionId] }),
  index("chat_presence_last_seen_idx").on(table.lastSeenAt),
  index("chat_presence_typing_group_idx").on(table.typingGroupId),
]);
export const insertChatPresenceSessionSchema = createInsertSchema(chatPresenceSessionsTable);
export type ChatPresenceSession = typeof chatPresenceSessionsTable.$inferSelect;
