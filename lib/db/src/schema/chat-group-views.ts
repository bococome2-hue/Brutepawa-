import { pgTable, integer, uuid, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { chatGroupsTable } from "./social";

// One persisted event per actual opening; retries reuse the same visit ID.
export const chatGroupViewsTable = pgTable("chat_group_views", {
  groupId: integer("group_id").notNull().references(() => chatGroupsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  visitId: uuid("visit_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.groupId, table.userId, table.visitId] }),
  index("chat_group_views_group_created_idx").on(table.groupId, table.createdAt),
]);
export const insertChatGroupViewSchema = createInsertSchema(chatGroupViewsTable).omit({ createdAt: true });
export type ChatGroupView = typeof chatGroupViewsTable.$inferSelect;
