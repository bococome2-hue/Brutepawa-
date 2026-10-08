import { pgTable, text, serial, timestamp, numeric, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XOF"),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("active"),
  sellerId: integer("seller_id").notNull(),
  location: text("location"),
  viewsCount: integer("views_count").default(0),
  condition: text("condition").default("Neuf"),
  isVerified: boolean("is_verified").default(false),
  discountPct: integer("discount_pct"),
  city: text("city"),
  countryCode: text("country_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("XOF"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const marketplaceServicesTable = pgTable("marketplace_services", {
  id:           serial("id").primaryKey(),
  userId:       integer("user_id").notNull().default(1),
  name:         text("name").notNull(),
  profession:   text("profession").notNull(),
  description:  text("description"),
  price:        numeric("price", { precision: 15, scale: 2 }),
  currency:     text("currency").notNull().default("XOF"),
  country:      text("country"),
  city:         text("city"),
  rating:       numeric("rating", { precision: 3, scale: 1 }).default("5.0"),
  reviewsCount: integer("reviews_count").default(0),
  avatarUrl:    text("avatar_url"),
  coverColor:   text("cover_color").default("#22C55E"),
  isVerified:   boolean("is_verified").default(true),
  status:       text("status").notNull().default("active"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketplaceFavoritesTable = pgTable("marketplace_favorites", {
  id:        serial("id").primaryKey(),
  userId:    integer("user_id").notNull(),
  itemType:  text("item_type").notNull(),
  itemId:    integer("item_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("mp_fav_unique").on(t.userId, t.itemType, t.itemId)]);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema   = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product       = typeof productsTable.$inferSelect;
export type InsertOrder   = z.infer<typeof insertOrderSchema>;
export type Order         = typeof ordersTable.$inferSelect;
export type MarketplaceService  = typeof marketplaceServicesTable.$inferSelect;
export type MarketplaceFavorite = typeof marketplaceFavoritesTable.$inferSelect;
