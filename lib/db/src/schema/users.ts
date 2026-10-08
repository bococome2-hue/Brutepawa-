import { pgTable, text, serial, integer, timestamp, bigint, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  country: text("country").notNull().default("BJ"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  bio: text("bio"),
  role: text("role").notNull().default("user"),
  badgeType: text("badge_type"),
  status: text("status").notNull().default("active"),
  totalStorageBytes: bigint("total_storage_bytes", { mode: "number" }).notNull().default(0),
  profileLocked: boolean("profile_locked").notNull().default(false),
  verified:        boolean("verified").notNull().default(false),
  score:           integer("score").notNull().default(0),
  followersCount:  integer("followers_count").notNull().default(0),
  followingCount:  integer("following_count").notNull().default(0),
  friendsCount:    integer("friends_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const userPreferencesTable = pgTable("user_preferences", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().unique(),
  theme:        text("theme").notNull().default("system"),      // light | dark | system
  primaryColor: text("primary_color").notNull().default("#22C55E"),
  fontSize:     text("font_size").notNull().default("medium"),  // small | medium | large
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
