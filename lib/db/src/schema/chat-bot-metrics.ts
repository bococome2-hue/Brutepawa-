import { date, integer, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { chatGroupsTable } from "./social";

export const chatBotMetricsTable = pgTable("chat_bot_metrics", {
  groupId: integer("group_id").notNull().references(() => chatGroupsTable.id, { onDelete: "cascade" }),
  day: date("day", { mode: "string" }).notNull(),
  analyzed: integer("analyzed").notNull().default(0),
  blocked: integer("blocked").notNull().default(0),
  spam: integer("spam").notNull().default(0),
  links: integer("links").notNull().default(0),
  trackingSince: timestamp("tracking_since", { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.groupId, t.day] })]);
export const insertChatBotMetricSchema = createInsertSchema(chatBotMetricsTable);
export type ChatBotMetric = typeof chatBotMetricsTable.$inferSelect;
