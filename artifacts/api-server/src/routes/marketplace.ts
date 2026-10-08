import { Router } from "express";
import { db, productsTable, ordersTable, marketplaceServicesTable, marketplaceFavoritesTable } from "@workspace/db";
import { eq, ilike, and, desc, or, sql } from "drizzle-orm";
import {
  CreateProductBody, GetProductParams, UpdateProductParams, UpdateProductBody,
  DeleteProductParams, ListProductsQueryParams, CreateOrderBody, GetOrderParams
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { extractKeyFromUrl, ownerIdFromKey } from "../lib/r2";
import { releaseStorage } from "../lib/storage";

const router = Router();

function fmt(p: typeof productsTable.$inferSelect) {
  return { ...p, price: Number(p.price) };
}

router.get("/products/featured", requireAuth, async (req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.status, "active"))
    .orderBy(desc(productsTable.createdAt))
    .limit(8);
  res.json(products.map(fmt));
});

router.get("/products", requireAuth, async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  const country = typeof req.query.country === "string" && req.query.country.trim()
    ? req.query.country.trim()
    : null;

  const conditions = [eq(productsTable.status, "active")];
  if (params.success && params.data.category) {
    conditions.push(eq(productsTable.category, params.data.category));
  }
  if (params.success && params.data.search) {
    conditions.push(ilike(productsTable.title, `%${params.data.search}%`));
  }
  if (country) {
    conditions.push(ilike(productsTable.location, `%${country}%`));
  }

  const products = await db.select().from(productsTable)
    .where(and(...conditions))
    .orderBy(desc(productsTable.createdAt))
    .limit(50);
  res.json(products.map(fmt));
});

router.post("/products", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // thumbnailUrl is outside the generated schema — read directly from body
  const thumbnailUrl = typeof req.body.thumbnailUrl === "string" ? req.body.thumbnailUrl : null;

  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    price: String(parsed.data.price),
    sellerId: req.userId!,
    thumbnailUrl,
  }).returning();
  res.status(201).json(fmt(product));
});

router.get("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(fmt(product));
});

router.patch("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateProductBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  // Fetch old image URLs before overwriting so we can clean up orphaned R2 objects
  const [current] = await db.select({
    imageUrl: productsTable.imageUrl,
    thumbnailUrl: productsTable.thumbnailUrl,
  }).from(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.sellerId, req.userId!)));

  if (!current) { res.status(404).json({ error: "Product not found" }); return; }

  const updateData: Record<string, unknown> = { ...body.data };
  if (body.data.price != null) updateData.price = String(body.data.price);
  if (typeof req.body.thumbnailUrl === "string") updateData.thumbnailUrl = req.body.thumbnailUrl;

  const [product] = await db.update(productsTable).set(updateData)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.sellerId, req.userId!)))
    .returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  // Best-effort cleanup: delete old R2 images if they were replaced
  const toDelete: (string | null)[] = [];
  if (body.data.imageUrl && body.data.imageUrl !== current.imageUrl)
    toDelete.push(extractKeyFromUrl(current.imageUrl));
  if (typeof req.body.thumbnailUrl === "string" && req.body.thumbnailUrl !== current.thumbnailUrl)
    toDelete.push(extractKeyFromUrl(current.thumbnailUrl));

  await releaseStorage(toDelete.filter((k): k is string => !!k && ownerIdFromKey(k) === req.userId!));

  res.json(fmt(product));
});

router.delete("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [product] = await db.select({
    id: productsTable.id,
    imageUrl: productsTable.imageUrl,
    thumbnailUrl: productsTable.thumbnailUrl,
  }).from(productsTable)
    .where(and(eq(productsTable.id, params.data.id), eq(productsTable.sellerId, req.userId!)));

  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  await db.delete(productsTable).where(eq(productsTable.id, params.data.id));

  await releaseStorage([extractKeyFromUrl(product.imageUrl), extractKeyFromUrl(product.thumbnailUrl)]);

  res.sendStatus(204);
});

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable)
    .where(eq(ordersTable.buyerId, req.userId!))
    .orderBy(desc(ordersTable.createdAt));
  res.json(orders.map(o => ({ ...o, amount: Number(o.amount) })));
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.productId));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }

  const [order] = await db.insert(ordersTable).values({
    productId: parsed.data.productId,
    buyerId: req.userId!,
    amount: product.price,
    currency: product.currency,
  }).returning();
  res.status(201).json({ ...order, amount: Number(order.amount) });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [order] = await db.select().from(ordersTable)
    .where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.buyerId, req.userId!)));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ ...order, amount: Number(order.amount) });
});

/* ── Marketplace Service Providers ─────────────────────────── */

router.get("/marketplace/services/providers", requireAuth, async (req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT
          ms.id,
          ms.user_id,
          ms.profession,
          ms.rating,
          ms.reviews_count,
          ms.avatar_url     AS service_avatar,
          ms.cover_color,
          ms.city,
          ms.country,
          ms.created_at,
          ms.description,
          ms.price,
          ms.currency,
          u.first_name,
          u.last_name,
          u.avatar_url      AS user_avatar,
          u.verified        AS user_verified,
          ROW_NUMBER() OVER (
            PARTITION BY ms.user_id
            ORDER BY ms.rating DESC NULLS LAST, ms.reviews_count DESC NULLS LAST
          ) AS rn,
          COUNT(*) OVER (PARTITION BY ms.user_id) AS services_count
        FROM marketplace_services ms
        JOIN users u ON u.id = ms.user_id
        WHERE ms.status = 'active'
      )
      SELECT
        user_id           AS "userId",
        first_name || ' ' || last_name AS name,
        profession,
        COALESCE(user_avatar, service_avatar) AS "avatarUrl",
        user_verified     AS "isVerified",
        ROUND(rating::numeric, 1)  AS rating,
        reviews_count     AS "reviewsCount",
        services_count::int AS "servicesCount",
        city,
        country,
        cover_color       AS "coverColor",
        created_at        AS "createdAt"
      FROM ranked
      WHERE rn = 1
      ORDER BY rating DESC NULLS LAST, reviews_count DESC NULLS LAST, created_at DESC
      LIMIT 20
    `);
    res.json(result.rows.map((r: any) => ({
      ...r,
      rating: r.rating != null ? Number(r.rating) : 5.0,
      reviewsCount: r.reviewsCount != null ? Number(r.reviewsCount) : 0,
      servicesCount: r.servicesCount != null ? Number(r.servicesCount) : 1,
      isVerified: r.isVerified === true || r.isVerified === "true",
    })));
  } catch (err) {
    console.error("[providers]", err);
    res.json([]);
  }
});

/* ── Marketplace Services ──────────────────────────────────── */

router.get("/marketplace/services", requireAuth, async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : null;
  const conditions = [eq(marketplaceServicesTable.status, "active")];
  if (search) {
    conditions.push(
      or(
        ilike(marketplaceServicesTable.name, `%${search}%`),
        ilike(marketplaceServicesTable.profession, `%${search}%`),
      )!
    );
  }
  const services = await db.select().from(marketplaceServicesTable)
    .where(and(...conditions))
    .orderBy(desc(marketplaceServicesTable.createdAt))
    .limit(50);
  res.json(services.map(s => ({ ...s, rating: s.rating != null ? Number(s.rating) : 5.0 })));
});

router.post("/marketplace/services", requireAuth, async (req, res): Promise<void> => {
  const { name, profession, description, price, currency, country, city, avatarUrl, coverColor } = req.body as {
    name: string; profession: string; description?: string; price?: number;
    currency?: string; country?: string; city?: string; avatarUrl?: string; coverColor?: string;
  };
  if (!name || !profession) { res.status(400).json({ error: "name and profession required" }); return; }
  const [service] = await db.insert(marketplaceServicesTable).values({
    userId: req.userId!, name, profession,
    description: description ?? null,
    price: price != null ? String(price) : null,
    currency: currency ?? "XOF",
    country: country ?? null, city: city ?? null,
    avatarUrl: avatarUrl ?? null,
    coverColor: coverColor ?? "#22C55E",
  }).returning();
  res.status(201).json({ ...service, rating: service.rating != null ? Number(service.rating) : 5.0 });
});

/* ── Marketplace Favorites ─────────────────────────────────── */

router.get("/marketplace/favorites", requireAuth, async (req, res): Promise<void> => {
  const favorites = await db.select().from(marketplaceFavoritesTable)
    .where(eq(marketplaceFavoritesTable.userId, req.userId!))
    .orderBy(desc(marketplaceFavoritesTable.createdAt));
  res.json(favorites);
});

router.post("/marketplace/favorites", requireAuth, async (req, res): Promise<void> => {
  const { itemType, itemId } = req.body as { itemType: string; itemId: number };
  if (!itemType || !itemId) { res.status(400).json({ error: "itemType and itemId required" }); return; }

  const existing = await db.select({ id: marketplaceFavoritesTable.id })
    .from(marketplaceFavoritesTable)
    .where(and(
      eq(marketplaceFavoritesTable.userId, req.userId!),
      eq(marketplaceFavoritesTable.itemType, itemType),
      eq(marketplaceFavoritesTable.itemId, itemId),
    ));

  if (existing.length > 0) {
    await db.delete(marketplaceFavoritesTable)
      .where(and(
        eq(marketplaceFavoritesTable.userId, req.userId!),
        eq(marketplaceFavoritesTable.itemType, itemType),
        eq(marketplaceFavoritesTable.itemId, itemId),
      ));
    res.json({ favorited: false });
  } else {
    await db.insert(marketplaceFavoritesTable).values({ userId: req.userId!, itemType, itemId });
    res.json({ favorited: true });
  }
});

/* ── Marketplace Search ────────────────────────────────────── */

router.get("/marketplace/search", requireAuth, async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) { res.json({ products: [], services: [], jobs: [] }); return; }

  const [products, services] = await Promise.all([
    db.select().from(productsTable)
      .where(and(eq(productsTable.status, "active"), ilike(productsTable.title, `%${q}%`)))
      .limit(20),
    db.select().from(marketplaceServicesTable)
      .where(and(eq(marketplaceServicesTable.status, "active"),
        or(ilike(marketplaceServicesTable.name, `%${q}%`), ilike(marketplaceServicesTable.profession, `%${q}%`))!))
      .limit(10),
  ]);

  res.json({
    products: products.map(p => ({ ...p, price: Number(p.price) })),
    services: services.map(s => ({ ...s, rating: s.rating != null ? Number(s.rating) : 5.0 })),
  });
});

export default router;
