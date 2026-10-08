import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const friendshipsTable = pgTable("friendships", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull(),
  friendId:  integer("friend_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("friendships_pair_idx").on(t.userId, t.friendId)]);

export const userScoresTable = pgTable("user_scores", {
  id:               serial("id").primaryKey(),
  userId:           integer("user_id").notNull(),
  score:            integer("score").notNull().default(0),
  friendsPoints:    integer("friends_points").notNull().default(0),
  followersPoints:  integer("followers_points").notNull().default(0),
  postsPoints:      integer("posts_points").notNull().default(0),
  engagementPoints: integer("engagement_points").notNull().default(0),
  computedAt:       timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("user_scores_user_idx").on(t.userId)]);

export const countriesTable = pgTable("countries", {
  id:      serial("id").primaryKey(),
  name:    text("name").notNull(),
  code:    text("code").notNull(),
  flagUrl: text("flag_url"),
}, (t) => [uniqueIndex("countries_code_idx").on(t.code)]);

export const suggestionsTable = pgTable("suggestions", {
  id:              serial("id").primaryKey(),
  userId:          integer("user_id").notNull(),
  suggestedUserId: integer("suggested_user_id").notNull(),
  score:           integer("score").notNull().default(0),
  reason:          text("reason"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("suggestions_pair_idx").on(t.userId, t.suggestedUserId),
  index("suggestions_user_idx").on(t.userId),
]);

export const referralsTable = pgTable("referrals", {
  id:        serial("id").primaryKey(),
  inviterId: integer("inviter_id").notNull(),
  invitedId: integer("invited_id"),
  inviteKey: text("invite_key").notNull(),
  method:    text("method"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("referrals_key_idx").on(t.inviteKey),
  index("referrals_inviter_idx").on(t.inviterId),
]);

export type Friendship = typeof friendshipsTable.$inferSelect;
export type Country    = typeof countriesTable.$inferSelect;
export type Suggestion = typeof suggestionsTable.$inferSelect;
export type Referral   = typeof referralsTable.$inferSelect;
