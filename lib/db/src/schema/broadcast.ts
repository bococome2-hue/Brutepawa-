import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const broadcastListsTable = pgTable("broadcast_lists", {
  id:          serial("id").primaryKey(),
  ownerId:     integer("owner_id").notNull(),
  name:        text("name").notNull(),
  description: text("description"),
  color:       text("color").notNull().default("#22C55E"),
  emoji:       text("emoji").notNull().default("📢"),
  coverImage:  text("cover_image"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const broadcastMembersTable = pgTable("broadcast_members", {
  id:          serial("id").primaryKey(),
  broadcastId: integer("broadcast_id").notNull(),
  userId:      integer("user_id").notNull(),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("uq_bc_member").on(t.broadcastId, t.userId),
  index("idx_bc_members_bid").on(t.broadcastId),
]);

export const broadcastMessagesTable = pgTable("broadcast_messages", {
  id:          serial("id").primaryKey(),
  broadcastId: integer("broadcast_id").notNull(),
  senderId:    integer("sender_id").notNull(),
  messageType: text("message_type").notNull().default("text"),
  content:     text("content").notNull().default(""),
  mediaUrl:    text("media_url"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  index("idx_bc_messages_bid").on(t.broadcastId),
  index("idx_bc_messages_ts").on(t.createdAt),
]);

export const broadcastReceiptsTable = pgTable("broadcast_message_receipts", {
  id:          serial("id").primaryKey(),
  messageId:   integer("message_id").notNull(),
  recipientId: integer("recipient_id").notNull(),
  delivered:   boolean("delivered").notNull().default(false),
  seen:        boolean("seen").notNull().default(false),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  seenAt:      timestamp("seen_at", { withTimezone: true }),
}, t => [
  uniqueIndex("uq_bc_receipt").on(t.messageId, t.recipientId),
]);

export const broadcastNotificationsTable = pgTable("broadcast_notifications", {
  id:                   serial("id").primaryKey(),
  broadcastId:          integer("broadcast_id").notNull(),
  userId:               integer("user_id").notNull(),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  soundEnabled:         boolean("sound_enabled").notNull().default(true),
  vibrationEnabled:     boolean("vibration_enabled").notNull().default(true),
  highPriority:         boolean("high_priority").notNull().default(true),
  muteUntil:            timestamp("mute_until", { withTimezone: true }),
}, t => [
  uniqueIndex("uq_bc_notif").on(t.broadcastId, t.userId),
]);

export const broadcastExportsTable = pgTable("broadcast_exports", {
  id:          serial("id").primaryKey(),
  broadcastId: integer("broadcast_id").notNull(),
  exportType:  text("export_type").notNull(),
  fileUrl:     text("file_url"),
  status:      text("status").notNull().default("pending"),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
