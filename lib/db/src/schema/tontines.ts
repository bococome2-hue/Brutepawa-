import { pgTable, text, serial, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tontinesTable = pgTable("tontines", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  contributionAmount: numeric("contribution_amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XOF"),
  frequency: text("frequency").notNull().default("monthly"),
  maxMembers: integer("max_members").notNull().default(12),
  status: text("status").notNull().default("active"),
  currentRound: integer("current_round").notNull().default(1),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tontineMembersTable = pgTable("tontine_members", {
  id: serial("id").primaryKey(),
  tontineId: integer("tontine_id").notNull(),
  userId: integer("user_id").notNull(),
  turnOrder: integer("turn_order").notNull().default(0),
  hasReceived: boolean("has_received").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contributionsTable = pgTable("contributions", {
  id: serial("id").primaryKey(),
  tontineId: integer("tontine_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  round: integer("round").notNull().default(1),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTontineSchema = createInsertSchema(tontinesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTontineMemberSchema = createInsertSchema(tontineMembersTable).omit({ id: true, joinedAt: true });
export const insertContributionSchema = createInsertSchema(contributionsTable).omit({ id: true, createdAt: true });
export type InsertTontine = z.infer<typeof insertTontineSchema>;
export type Tontine = typeof tontinesTable.$inferSelect;
export type TontineMember = typeof tontineMembersTable.$inferSelect;
export type Contribution = typeof contributionsTable.$inferSelect;
