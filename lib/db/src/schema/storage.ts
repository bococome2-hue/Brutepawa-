import { pgTable, serial, integer, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const storagePlansTable = pgTable("storage_plans", {
  planName:    text("plan_name").primaryKey(),
  quotaBytes:  bigint("quota_bytes", { mode: "number" }).notNull(),
  displayName: text("display_name").notNull(),
});

export const mediaFilesTable = pgTable("media_files", {
  id:         serial("id").primaryKey(),
  userId:     integer("user_id").notNull().references(() => usersTable.id),
  r2Key:      text("r2_key").notNull().unique(),
  sizeBytes:  bigint("size_bytes", { mode: "number" }).notNull(),
  kind:       text("kind").notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StoragePlan = typeof storagePlansTable.$inferSelect;
export type MediaFile   = typeof mediaFilesTable.$inferSelect;
