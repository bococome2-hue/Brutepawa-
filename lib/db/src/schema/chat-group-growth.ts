import { pgTable, integer, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { chatGroupsTable } from "./social";

// Actual observed membership, not a reconstructed history of the current roster.
// One retained sample per UTC hour; a changed count updates that hour's observation.
export const chatGroupGrowthSamplesTable = pgTable("chat_group_growth_samples", {
  groupId: integer("group_id").notNull().references(() => chatGroupsTable.id, { onDelete: "cascade" }),
  sampleHour: timestamp("sample_hour", { withTimezone: true }).notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  members: integer("members").notNull(),
}, table => [
  primaryKey({ columns: [table.groupId, table.sampleHour] }),
  index("chat_group_growth_samples_group_observed_idx").on(table.groupId, table.observedAt),
]);
