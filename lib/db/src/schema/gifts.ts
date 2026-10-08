import { pgTable, text, serial, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";

export const giftContextEnum  = pgEnum("gift_context_type",      ["video", "live"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status",  ["pending", "validated", "paid", "rejected"]);
export const tokenPurchaseStatusEnum = pgEnum("token_purchase_status", ["pending", "confirmed", "failed"]);

export const giftCatalogTable = pgTable("gift_catalog", {
  id:            serial("id").primaryKey(),
  name:          text("name").notNull(),
  iconEmoji:     text("icon_emoji").notNull(),
  iconUrl:       text("icon_url").notNull().default(""),
  tokenCost:     integer("token_cost").notNull(),
  animationType: text("animation_type").notNull().default("float"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const giftTransactionsTable = pgTable("gift_transactions", {
  id:           serial("id").primaryKey(),
  senderId:     integer("sender_id").notNull(),
  senderName:   text("sender_name").notNull().default(""),
  receiverId:   integer("receiver_id").notNull(),
  giftId:       integer("gift_id").notNull(),
  giftName:     text("gift_name").notNull().default(""),
  giftEmoji:    text("gift_emoji").notNull().default(""),
  tokenAmount:  integer("token_amount").notNull(),
  contextType:  giftContextEnum("context_type").notNull(),
  contextId:    integer("context_id").notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("gift_tx_receiver_ctx_idx").on(t.receiverId, t.contextType, t.contextId),
  index("gift_tx_context_idx").on(t.contextType, t.contextId),
]);

export const tokenPurchasesTable = pgTable("token_purchases", {
  id:            serial("id").primaryKey(),
  userId:        integer("user_id").notNull(),
  tokens:        integer("tokens").notNull(),
  amountXof:     integer("amount_xof").notNull(),
  paymentMethod: text("payment_method").notNull(),
  paymentPhone:  text("payment_phone").notNull().default(""),
  paymentRef:    text("payment_ref"),
  status:        tokenPurchaseStatusEnum("status").notNull().default("pending"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creatorWithdrawalsTable = pgTable("creator_withdrawals", {
  id:            serial("id").primaryKey(),
  creatorId:     integer("creator_id").notNull(),
  tokensAmount:  integer("tokens_amount").notNull(),
  xofAmount:     integer("xof_amount").notNull(),
  status:        withdrawalStatusEnum("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull(),
  paymentPhone:  text("payment_phone").notNull(),
  adminNote:     text("admin_note"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("creator_withdrawals_creator_idx").on(t.creatorId),
]);

export type GiftCatalogItem     = typeof giftCatalogTable.$inferSelect;
export type GiftTransaction     = typeof giftTransactionsTable.$inferSelect;
export type TokenPurchase       = typeof tokenPurchasesTable.$inferSelect;
export type CreatorWithdrawal   = typeof creatorWithdrawalsTable.$inferSelect;
