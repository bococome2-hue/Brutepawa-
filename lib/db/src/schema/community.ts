import { pgTable, text, serial, timestamp, integer, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"),
  emoji: text("emoji").notNull().default("🏘️"),
  coverUrl: text("cover_url"),
  country: text("country"),
  privacy: text("privacy").notNull().default("public"),
  createdById: integer("created_by_id").notNull(),
  membersCount: integer("members_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const groupMembersTable = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pagesTable = pgTable("pages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username"),
  description: text("description"),
  category: text("category").notNull().default("general"),
  emoji: text("emoji").notNull().default("📢"),
  avatarUrl: text("avatar_url"),
  coverUrl: text("cover_url"),
  coverVideoUrl: text("cover_video_url"),
  country: text("country"),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  timezone: text("timezone").default("(GMT+01:00) Afrique de l'Ouest"),
  actionButton: text("action_button").default("Aucun"),
  verified: boolean("verified").notNull().default(false),
  isPublic: boolean("is_public").notNull().default(true),
  createdById: integer("created_by_id").notNull(),
  followersCount: integer("followers_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [uniqueIndex("pages_username_idx").on(t.username)]);

export const pageFollowersTable = pgTable("page_followers", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  userId: integer("user_id").notNull(),
  followedAt: timestamp("followed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("page_followers_pair_idx").on(t.pageId, t.userId),
  index("page_followers_page_idx").on(t.pageId),
]);

export const pageRolesTable = pgTable("page_roles", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("editor"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("page_roles_pair_idx").on(t.pageId, t.userId),
  index("page_roles_page_idx").on(t.pageId),
]);

export const pageInvitationsTable = pgTable("page_invitations", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  invitedBy: integer("invited_by").notNull(),
  invitedUserId: integer("invited_user_id").notNull(),
  status: text("status").notNull().default("pending"),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("page_invitations_pair_idx").on(t.pageId, t.invitedUserId),
  index("page_invitations_page_idx").on(t.pageId),
]);

export const groupPostsTable = pgTable("group_posts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupJoinRequestsTable = pgTable("group_join_requests", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const groupBotsTable = pgTable("group_bots", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  botType: text("bot_type").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  settings: text("settings").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const botLogsTable = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull(),
  botType: text("bot_type").notNull(),
  action: text("action").notNull(),
  targetUserId: integer("target_user_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true, updatedAt: true, membersCount: true });
export const insertPageSchema = createInsertSchema(pagesTable).omit({ id: true, createdAt: true, updatedAt: true, followersCount: true });
export type Group = typeof groupsTable.$inferSelect;
export type GroupMember = typeof groupMembersTable.$inferSelect;
export type GroupPost = typeof groupPostsTable.$inferSelect;
export type GroupJoinRequest = typeof groupJoinRequestsTable.$inferSelect;
export type Page = typeof pagesTable.$inferSelect;
export type PageFollower = typeof pageFollowersTable.$inferSelect;
export type PageRole = typeof pageRolesTable.$inferSelect;
export type PageInvitation = typeof pageInvitationsTable.$inferSelect;
export type GroupBot = typeof groupBotsTable.$inferSelect;
export type BotLog = typeof botLogsTable.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertPage = z.infer<typeof insertPageSchema>;
