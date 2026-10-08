/**
 * BrutePawa — Unified Search API
 *
 * @openapi
 * tags:
 *   - name: Search
 *     description: Full-text search across users, groups, posts, and articles
 */
import { Router } from "express";
import { z } from "zod/v4";
import {
  db, usersTable, postsTable, groupsTable, productsTable,
  friendRequestsTable,
} from "@workspace/db";
import { desc, eq, and, or, ilike, sql, inArray, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

// ── In-memory LRU Cache (30 s TTL) ──────────────────────────────────────────
interface CacheEntry { data: unknown; exp: number }
const cacheStore = new Map<string, CacheEntry>();
function cacheGet<T>(key: string): T | null {
  const e = cacheStore.get(key);
  if (!e || Date.now() > e.exp) { cacheStore.delete(key); return null; }
  return e.data as T;
}
function cacheSet(key: string, data: unknown, ttlMs = 30_000): void {
  if (cacheStore.size > 2_000) {
    const oldest = [...cacheStore.entries()]
      .sort((a, b) => a[1].exp - b[1].exp)
      .slice(0, 400);
    oldest.forEach(([k]) => cacheStore.delete(k));
  }
  cacheStore.set(key, { data, exp: Date.now() + ttlMs });
}

// ── Rate limiter (30 req / 60 s per user) ───────────────────────────────────
interface RLEntry { count: number; resetAt: number }
const rlStore = new Map<number, RLEntry>();
function checkRL(userId: number, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const e = rlStore.get(userId);
  if (!e || now > e.resetAt) { rlStore.set(userId, { count: 1, resetAt: now + windowMs }); return true; }
  if (e.count >= limit) return false;
  e.count++; return true;
}

// ── Zod query-string schema ──────────────────────────────────────────────────
const SearchQS = z.object({
  q:       z.string().min(1).max(200).trim(),
  page:    z.coerce.number().int().min(1).max(100).optional().default(1),
  limit:   z.coerce.number().int().min(1).max(50).optional().default(20),
  country: z.string().max(100).optional(),
  region:  z.enum(["all","afrique","amerique","europe","asie","oceanie"]).optional(),
  type:    z.enum(["all","users","groups","posts","articles"]).optional().default("all"),
});

// ── DTOs ────────────────────────────────────────────────────────────────────
export interface SearchUserDTO {
  id: number; firstName: string; lastName: string;
  avatarUrl: string | null; country: string | null;
  bio: string | null; verified: boolean; followersCount: number;
  friendshipStatus: "none" | "friends" | "pending_sent" | "pending_received";
}
export interface SearchGroupDTO {
  id: number; name: string; emoji: string;
  description: string | null; membersCount: number;
  privacy: string; country: string | null; coverUrl: string | null; isMember: boolean;
}
export interface SearchPostDTO {
  id: number; authorId: number; authorName: string;
  authorAvatarUrl: string | null; content: string;
  imageUrl: string | null; thumbnailUrl: string | null;
  likesCount: number; commentsCount: number; createdAt: string;
}
export interface SearchArticleDTO {
  id: number; title: string; description: string | null;
  imageUrl: string | null; price: number; currency: string;
  category: string | null; location: string | null;
}
export interface SearchStatsDTO {
  users: number; posts: number; groups: number; articles: number;
}
export interface SearchResponseDTO {
  query: string;
  stats: SearchStatsDTO;
  users: SearchUserDTO[];
  groups: SearchGroupDTO[];
  posts: SearchPostDTO[];
  articles: SearchArticleDTO[];
  pagination: { page: number; limit: number; hasMore: boolean };
  durationMs: number;
}

// Region code → country name fragments for ILIKE filtering
const REGION_COUNTRY_FRAGMENTS: Record<string, string[]> = {
  afrique:  ["Bénin","Togo","Sénégal","Côte d'Ivoire","Mali","Burkina Faso","Niger",
             "Cameroun","Maroc","Gabon","Guinée","Nigeria","Ghana","Kenya","Tanzanie"],
  europe:   ["France","Italie","Espagne","Royaume-Uni","Allemagne","Portugal","Belgique","Suisse"],
  amerique: ["États-Unis","Canada","Brésil","Mexique","Argentine","Colombie"],
  asie:     ["Japon","Chine","Inde","Corée","Thaïlande","Vietnam","Singapour"],
  oceanie:  ["Australie","Nouvelle-Zélande","Fidji"],
};

const router = Router();

/**
 * @openapi
 * /api/search:
 *   get:
 *     summary: Unified full-text search
 *     tags: [Search]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - { name: q,       in: query, required: true,  schema: { type: string, maxLength: 200 } }
 *       - { name: page,    in: query, required: false, schema: { type: integer, default: 1 } }
 *       - { name: limit,   in: query, required: false, schema: { type: integer, default: 20, maximum: 50 } }
 *       - { name: country, in: query, required: false, schema: { type: string } }
 *       - { name: region,  in: query, required: false,
 *           schema: { type: string, enum: [all,afrique,amerique,europe,asie,oceanie] } }
 *       - { name: type,    in: query, required: false,
 *           schema: { type: string, enum: [all,users,groups,posts,articles] } }
 *     responses:
 *       200:
 *         description: Successful search response
 *       400:
 *         description: Invalid query parameters
 *       429:
 *         description: Rate limit exceeded (30 req/min)
 *       500:
 *         description: Internal search error
 */
router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  if (!checkRL(userId)) {
    res.status(429).json({ error: "Trop de requêtes. Réessayez dans 1 minute.", retryAfter: 60 });
    return;
  }

  const parsed = SearchQS.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Paramètres invalides", issues: parsed.error.issues });
    return;
  }

  const { q, page, limit, country, region, type } = parsed.data;
  const offset = (page - 1) * limit;
  const cacheKey = `search:${userId}:${q}:${page}:${limit}:${country ?? ""}:${region ?? ""}:${type}`;
  const cached = cacheGet<SearchResponseDTO>(cacheKey);
  if (cached) { res.json(cached); return; }

  const pat = `%${q}%`;
  const regionFragments = (region && region !== "all") ? (REGION_COUNTRY_FRAGMENTS[region] ?? []) : null;

  // Build country condition
  const countryCondition = country
    ? ilike(usersTable.country, `%${country}%`)
    : regionFragments && regionFragments.length > 0
      ? sql`${usersTable.country} ILIKE ANY(ARRAY[${sql.join(regionFragments.map(f => sql`${'%' + f + '%'}`), sql`, `)}])`
      : sql`true`;

  const t0 = Date.now();

  try {
    const [userRows, groupRows, postRows, articleRows, [uCnt, pCnt, gCnt, aCnt]] =
      await Promise.all([

        // ── Users ──────────────────────────────────────────────────────────
        (type === "all" || type === "users")
          ? db.select({
              id: usersTable.id,
              firstName: usersTable.firstName,
              lastName: usersTable.lastName,
              avatarUrl: usersTable.avatarUrl,
              country: usersTable.country,
              bio: usersTable.bio,
              verified: usersTable.verified,
              followersCount: sql<number>`COALESCE(${usersTable.followersCount}, 0)`,
            }).from(usersTable)
              .where(and(
                eq(usersTable.status, "active"),
                ne(usersTable.id, userId),
                or(
                  sql`(${usersTable.firstName} || ' ' || ${usersTable.lastName}) ILIKE ${pat}`,
                  ilike(usersTable.bio, pat),
                  ilike(usersTable.country, pat),
                ),
                countryCondition,
              ))
              .orderBy(desc(sql<number>`COALESCE(${usersTable.followersCount}, 0)`))
              .limit(limit).offset(offset)
          : Promise.resolve([]),

        // ── Groups ─────────────────────────────────────────────────────────
        (type === "all" || type === "groups")
          ? db.select({
              id: groupsTable.id,
              name: groupsTable.name,
              emoji: groupsTable.emoji,
              description: groupsTable.description,
              membersCount: groupsTable.membersCount,
              privacy: groupsTable.privacy,
              country: groupsTable.country,
              coverUrl: groupsTable.coverUrl,
            }).from(groupsTable)
              .where(and(
                or(
                  ilike(groupsTable.name, pat),
                  ilike(groupsTable.description, pat),
                  ilike(groupsTable.category, pat),
                ),
                country ? ilike(groupsTable.country, `%${country}%`) : sql`true`,
              ))
              .orderBy(desc(groupsTable.membersCount))
              .limit(limit).offset(offset)
          : Promise.resolve([]),

        // ── Posts ──────────────────────────────────────────────────────────
        (type === "all" || type === "posts")
          ? db.select({
              id: postsTable.id,
              authorId: postsTable.authorId,
              content: postsTable.content,
              imageUrl: postsTable.imageUrl,
              thumbnailUrl: postsTable.thumbnailUrl,
              likesCount: postsTable.likesCount,
              commentsCount: postsTable.commentsCount,
              createdAt: postsTable.createdAt,
            }).from(postsTable)
              .where(and(
                ilike(postsTable.content, pat),
                eq(postsTable.audience, "public"),
                eq(postsTable.isArchived, false),
              ))
              .orderBy(desc(postsTable.createdAt))
              .limit(20).offset(offset)
          : Promise.resolve([]),

        // ── Articles (products) ────────────────────────────────────────────
        (type === "all" || type === "articles")
          ? db.select({
              id: productsTable.id,
              title: productsTable.title,
              description: productsTable.description,
              imageUrl: productsTable.imageUrl,
              price: productsTable.price,
              currency: productsTable.currency,
              category: productsTable.category,
              location: productsTable.location,
            }).from(productsTable)
              .where(or(
                ilike(productsTable.title, pat),
                ilike(productsTable.description, pat),
              ))
              .orderBy(desc(productsTable.id))
              .limit(20)
          : Promise.resolve([]),

        // ── Stats counts (parallel) ────────────────────────────────────────
        Promise.all([
          db.select({ n: sql<number>`COUNT(*)::int` }).from(usersTable)
            .where(and(
              eq(usersTable.status, "active"),
              or(
                sql`(${usersTable.firstName} || ' ' || ${usersTable.lastName}) ILIKE ${pat}`,
                ilike(usersTable.bio, pat),
                ilike(usersTable.country, pat),
              ),
            )).then(r => r[0]?.n ?? 0),
          db.select({ n: sql<number>`COUNT(*)::int` }).from(postsTable)
            .where(and(ilike(postsTable.content, pat), eq(postsTable.isArchived, false)))
            .then(r => r[0]?.n ?? 0),
          db.select({ n: sql<number>`COUNT(*)::int` }).from(groupsTable)
            .where(or(ilike(groupsTable.name, pat), ilike(groupsTable.description, pat)))
            .then(r => r[0]?.n ?? 0),
          db.select({ n: sql<number>`COUNT(*)::int` }).from(productsTable)
            .where(or(ilike(productsTable.title, pat), ilike(productsTable.description, pat)))
            .then(r => r[0]?.n ?? 0),
        ]),
      ]);

    // ── Enrich posts with author names ─────────────────────────────────────
    const authorIds = [...new Set(postRows.map(p => p.authorId))];
    const authors = authorIds.length
      ? await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, avatarUrl: usersTable.avatarUrl })
          .from(usersTable).where(inArray(usersTable.id, authorIds))
      : [];
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));

    // ── Friendship status for found users ──────────────────────────────────
    const foundIds = userRows.map(u => u.id);
    let fsMap: Record<number, SearchUserDTO["friendshipStatus"]> = {};
    if (foundIds.length) {
      const reqs = await db.select({
        fromId: friendRequestsTable.fromUserId,
        toId:   friendRequestsTable.toUserId,
        status: friendRequestsTable.status,
      }).from(friendRequestsTable)
        .where(and(
          or(
            eq(friendRequestsTable.fromUserId, userId),
            eq(friendRequestsTable.toUserId, userId),
          ),
          inArray(
            sql`CASE WHEN ${friendRequestsTable.fromUserId} = ${userId}
                     THEN ${friendRequestsTable.toUserId}
                     ELSE ${friendRequestsTable.fromUserId} END`,
            foundIds,
          ),
        )).catch(() => []);

      fsMap = Object.fromEntries(foundIds.map(id => {
        const req = reqs.find(r =>
          (r.fromId === userId && r.toId === id) ||
          (r.toId === userId && r.fromId === id)
        );
        if (!req) return [id, "none"];
        if (req.status === "accepted") return [id, "friends"];
        if (req.fromId === userId) return [id, "pending_sent"];
        return [id, "pending_received"];
      }));
    }

    const durationMs = Date.now() - t0;

    const result: SearchResponseDTO = {
      query: q,
      stats: { users: uCnt, posts: pCnt, groups: gCnt, articles: aCnt },
      users: userRows.map(u => ({
        id: u.id, firstName: u.firstName, lastName: u.lastName,
        avatarUrl: u.avatarUrl, country: u.country, bio: u.bio,
        verified: u.verified, followersCount: u.followersCount,
        friendshipStatus: fsMap[u.id] ?? "none",
      })),
      groups: groupRows.map(g => ({
        id: g.id, name: g.name, emoji: g.emoji ?? "🏘️",
        description: g.description, membersCount: g.membersCount,
        privacy: g.privacy, country: g.country, coverUrl: g.coverUrl,
        isMember: false,
      })),
      posts: postRows.map(p => {
        const a = authorMap[p.authorId];
        return {
          id: p.id, authorId: p.authorId,
          authorName: a ? `${a.firstName} ${a.lastName}` : "Utilisateur",
          authorAvatarUrl: a?.avatarUrl ?? null,
          content: p.content, imageUrl: p.imageUrl, thumbnailUrl: p.thumbnailUrl,
          likesCount: p.likesCount, commentsCount: p.commentsCount,
          createdAt: p.createdAt.toISOString(),
        };
      }),
      articles: articleRows.map(a => ({
        id: a.id, title: a.title, description: a.description,
        imageUrl: a.imageUrl, price: a.price ?? 0, currency: a.currency ?? "XOF",
        category: a.category, location: a.location,
      })),
      pagination: { page, limit, hasMore: userRows.length === limit },
      durationMs,
    };

    // Analytics (fire-and-forget, non-blocking)
    db.execute(sql`
      INSERT INTO search_query_logs (user_id, query, results_count, region, country, duration_ms)
      VALUES (${userId}, ${q}, ${result.users.length + result.posts.length + result.groups.length},
              ${region ?? null}, ${country ?? null}, ${durationMs})
    `).catch(() => {});

    cacheSet(cacheKey, result, 30_000);
    res.json(result);
  } catch (err) {
    console.error("[search] error:", err);
    res.status(500).json({ error: "Erreur de recherche. Veuillez réessayer." });
  }
});

export default router;
