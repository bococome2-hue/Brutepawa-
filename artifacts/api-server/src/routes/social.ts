import { Router } from "express";
import { createHmac } from "node:crypto";
import { db, postsTable, postLikesTable, postReactionsTable, messagesTable, usersTable, storiesTable, userBlocksTable, notificationsTable, commentsTable, commentLikesTable, savedPostsTable, postReportsTable, friendRequestsTable, hiddenPostsTable } from "@workspace/db";
import { eq, and, or, desc, sql, gt, lt } from "drizzle-orm";
import { CreatePostBody, GetPostParams, DeletePostParams, LikePostParams, LikePostBody, SendMessageBody, GetConversationParams, ListPostsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { pushToUserDevice } from "./push";
import { pushToUser } from "./signaling";
import { extractKeyFromUrl, ownerIdFromKey } from "../lib/r2";
import { releaseStorage } from "../lib/storage";

const DELIVERY_SECRET = process.env.SESSION_SECRET ?? "bp-delivery-dev";
function makeDeliveryToken(msgId: number, toUserId: number): string {
  return createHmac("sha256", DELIVERY_SECRET).update(`${msgId}:${toUserId}`).digest("hex");
}
function verifyDeliveryToken(token: string, msgId: number, toUserId: number): boolean {
  return token === makeDeliveryToken(msgId, toUserId);
}
function makeMarkReadToken(fromUserId: number, toUserId: number): string {
  return createHmac("sha256", DELIVERY_SECRET).update(`markread:${fromUserId}:${toUserId}`).digest("hex");
}
function verifyMarkReadToken(token: string, fromUserId: number, toUserId: number): boolean {
  return token === makeMarkReadToken(fromUserId, toUserId);
}
/* Reply tokens expire after 24 h — encoded as hourly bucket in the signature */
const REPLY_EXPIRY_HOURS = 24;
function makeReplyToken(fromUserId: number, toUserId: number): string {
  const bucket = Math.floor(Date.now() / 3_600_000) + REPLY_EXPIRY_HOURS;
  const hash   = createHmac("sha256", DELIVERY_SECRET)
    .update(`reply:${fromUserId}:${toUserId}:${bucket}`)
    .digest("hex");
  return `${hash}:${bucket}`;
}
function verifyReplyToken(token: string, fromUserId: number, toUserId: number): boolean {
  const parts  = token.split(":");
  if (parts.length !== 2) return false;
  const [hash, bucketStr] = parts;
  const bucket = parseInt(bucketStr, 10);
  if (isNaN(bucket) || Math.floor(Date.now() / 3_600_000) > bucket) return false;
  const expected = createHmac("sha256", DELIVERY_SECRET)
    .update(`reply:${fromUserId}:${toUserId}:${bucket}`)
    .digest("hex");
  return hash === expected;
}

const router = Router();

/* ── Avatar icon proxy (no auth) — for push notification icons ────────────────
   Returns the sender's real profile picture proxied through the same origin so
   there are no CORS issues in the service worker.
   Falls back to a coloured initials SVG when no avatar exists. */
router.get("/users/:id/avatar-icon", async (req, res): Promise<void> => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) { res.status(400).end(); return; }

  const [user] = await db.select({
    firstName: usersTable.firstName,
    lastName:  usersTable.lastName,
    avatarUrl: usersTable.avatarUrl,
  }).from(usersTable).where(eq(usersTable.id, userId)).catch(() => []);

  // Proxy the real avatar (absolute URL — e.g. Supabase storage)
  if (user?.avatarUrl?.startsWith("http")) {
    try {
      const resp = await fetch(user.avatarUrl, { signal: AbortSignal.timeout(4000) });
      if (resp.ok) {
        const ct  = resp.headers.get("content-type") ?? "image/jpeg";
        const buf = await resp.arrayBuffer();
        res.set("Content-Type", ct);
        res.set("Cache-Control", "public, max-age=300");
        res.send(Buffer.from(buf));
        return;
      }
    } catch { /* fall through to SVG */ }
  }

  // Relative URL on same origin — redirect
  if (user?.avatarUrl && !user.avatarUrl.startsWith("http")) {
    res.redirect(user.avatarUrl);
    return;
  }

  // No avatar → generate a coloured initials SVG (192×192)
  const name     = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "";
  const initials = name.split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
  const COLORS   = ["#16C24A","#3B82F6","#F97316","#8B5CF6","#EF4444","#06B6D4","#D97706"];
  const bg       = COLORS[userId % COLORS.length];
  const svg      = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><circle cx="96" cy="96" r="96" fill="${bg}"/><text x="96" y="96" font-family="Arial,Helvetica,sans-serif" font-size="80" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text></svg>`;
  res.set("Content-Type", "image/svg+xml");
  res.set("Cache-Control", "public, max-age=60");
  res.send(svg);
});

router.get("/posts", requireAuth, async (req, res): Promise<void> => {
  const params = ListPostsQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const authorId = req.query.authorId ? Number(req.query.authorId) : null;
  const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : null;
  const limit = search ? 10 : 20;
  const offset = (page - 1) * limit;

  const me = req.userId!;
  const conditions = [eq(postsTable.isArchived, false)];
  if (authorId) conditions.push(eq(postsTable.authorId, authorId));
  if (search) conditions.push(sql`search_vector @@ websearch_to_tsquery('french', unaccent(${search}))`);
  if (!authorId) conditions.push(sql`${postsTable.id} NOT IN (SELECT post_id FROM hidden_posts WHERE user_id = ${me})`);

  const rows = await db
    .select({
      id: postsTable.id,
      authorId: postsTable.authorId,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      thumbnailUrl: postsTable.thumbnailUrl,
      musicTrackName: postsTable.musicTrackName,
      musicArtist: postsTable.musicArtist,
      musicUrl: postsTable.musicUrl,
      musicArtworkUrl: postsTable.musicArtworkUrl,
      musicDuration: postsTable.musicDuration,
      musicLikesCount: postsTable.musicLikesCount,
      likesCount: postsTable.likesCount,
      commentsCount: postsTable.commentsCount,
      isPinned: postsTable.isPinned,
      commentsDisabled: postsTable.commentsDisabled,
      audience: postsTable.audience,
      createdAt: postsTable.createdAt,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
      authorAvatarUrl: usersTable.avatarUrl,
      authorCountry: usersTable.country,
      authorProfileLocked: usersTable.profileLocked,
      authorBadgeType: usersTable.badgeType,
      location: postsTable.location,
      bgColor: postsTable.bgColor,
      mood: postsTable.mood,
      taggedUserIds: postsTable.taggedUserIds,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(...conditions))
    .orderBy(desc(postsTable.isPinned), desc(postsTable.createdAt))
    .limit(limit).offset(offset);

  // If viewing a specific locked profile, check friendship before returning any posts
  if (authorId && rows.length > 0 && rows[0].authorProfileLocked) {
    if (authorId !== me) {
      const [friendship] = await db.select({ id: friendRequestsTable.id }).from(friendRequestsTable)
        .where(and(
          eq(friendRequestsTable.status, "accepted"),
          or(
            and(eq(friendRequestsTable.fromUserId, me), eq(friendRequestsTable.toUserId, authorId)),
            and(eq(friendRequestsTable.fromUserId, authorId), eq(friendRequestsTable.toUserId, me)),
          ),
        )).limit(1);
      if (!friendship) { res.json([]); return; }
    }
  }

  const myLikes = rows.length > 0
    ? await db.select({ postId: postLikesTable.postId }).from(postLikesTable)
        .where(and(
          eq(postLikesTable.userId, req.userId!),
          sql`${postLikesTable.postId} = ANY(ARRAY[${sql.join(rows.map(r => sql`${r.id}`), sql`, `)}]::int[])`,
        ))
    : [];
  const likedSet = new Set(myLikes.map(l => l.postId));

  // Collect all unique tagged user IDs across all posts
  const allTaggedIds = new Set<number>();
  for (const r of rows) {
    if (r.taggedUserIds) {
      try {
        const ids = JSON.parse(r.taggedUserIds) as number[];
        ids.forEach(id => allTaggedIds.add(id));
      } catch { /* ignore malformed */ }
    }
  }
  // Fetch tagged users in a single query
  const taggedUsersMap = new Map<number, string>();
  if (allTaggedIds.size > 0) {
    const ids = [...allTaggedIds];
    const taggedRows = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable)
      .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`);
    for (const u of taggedRows) {
      taggedUsersMap.set(u.id, `${u.firstName} ${u.lastName}`);
    }
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(rows.map(r => {
    let taggedUsers: { id: number; name: string }[] = [];
    if (r.taggedUserIds) {
      try {
        const ids = JSON.parse(r.taggedUserIds) as number[];
        taggedUsers = ids.map(id => ({ id, name: taggedUsersMap.get(id) ?? "Utilisateur" })).filter(u => taggedUsersMap.has(u.id));
      } catch { /* ignore */ }
    }
    return {
      id: r.id,
      authorId: r.authorId,
      authorName: r.authorFirstName && r.authorLastName ? `${r.authorFirstName} ${r.authorLastName}` : "Utilisateur",
      authorAvatarUrl: r.authorAvatarUrl,
      authorCountry: r.authorCountry ?? "BJ",
      content: r.content,
      imageUrl: r.imageUrl,
      thumbnailUrl: r.thumbnailUrl,
      musicTrackName: r.musicTrackName ?? null,
      musicArtist: r.musicArtist ?? null,
      musicUrl: r.musicUrl,
      musicArtworkUrl: r.musicArtworkUrl,
      musicDuration: r.musicDuration ?? null,
      musicLikesCount: (r as { musicLikesCount?: number }).musicLikesCount ?? 0,
      likesCount: r.likesCount,
      commentsCount: r.commentsCount,
      createdAt: r.createdAt,
      liked: likedSet.has(r.id),
      isOwner: r.authorId === req.userId,
      isPinned: r.isPinned ?? false,
      commentsDisabled: r.commentsDisabled ?? false,
      audience: r.audience ?? "public",
      location: (r as { location?: string | null }).location ?? null,
      bgColor: (r as { bgColor?: string | null }).bgColor ?? null,
      mood: (r as { mood?: string | null }).mood ?? null,
      taggedUsers,
    };
  }));
});

router.post("/posts", requireAuth, async (req, res): Promise<void> => {
  // Allow empty content when a media URL is provided (video/image posts without caption)
  const rawBody = {
    ...req.body,
    content: req.body.content || (req.body.imageUrl ? "" : req.body.content),
  };
  // Validate using a relaxed schema: content optional when imageUrl present
  const hasMedia = typeof req.body.imageUrl === "string" && req.body.imageUrl.length > 0;
  const hasMusic = typeof req.body.musicTrackName === "string" && req.body.musicTrackName.length > 0;
  const contentVal = typeof rawBody.content === "string" ? rawBody.content.trim() : "";
  if (!hasMedia && !hasMusic && contentVal.length === 0) {
    res.status(400).json({ error: "Le contenu est requis si aucun média n'est joint." });
    return;
  }

  // thumbnailUrl is outside the generated schema — read directly from body
  // Treat empty string the same as absent: store null so DB constraints aren't triggered
  const rawThumb = req.body.thumbnailUrl;
  const thumbnailUrl = (typeof rawThumb === "string" && rawThumb.length > 0) ? rawThumb : null;
  const rawImage = req.body.imageUrl;
  const imageUrl = (typeof rawImage === "string" && rawImage.length > 0) ? rawImage : null;
  const musicTrackName  = typeof req.body.musicTrackName  === "string" && req.body.musicTrackName  ? req.body.musicTrackName  : null;
  const musicArtist     = typeof req.body.musicArtist     === "string" && req.body.musicArtist     ? req.body.musicArtist     : null;
  const musicUrl        = typeof req.body.musicUrl        === "string" && req.body.musicUrl        ? req.body.musicUrl        : null;
  const musicArtworkUrl = typeof req.body.musicArtworkUrl === "string" && req.body.musicArtworkUrl ? req.body.musicArtworkUrl : null;
  const musicDuration   = typeof req.body.musicDuration   === "string" && req.body.musicDuration   ? req.body.musicDuration   : null;
  const location        = typeof req.body.location        === "string" && req.body.location        ? req.body.location        : null;
  const bgColor         = typeof req.body.bgColor         === "string" && req.body.bgColor         ? req.body.bgColor         : null;
  const mood            = typeof req.body.mood            === "string" && req.body.mood            ? req.body.mood            : null;
  const rawTaggedIds    = req.body.taggedUserIds;
  const taggedUserIds   = Array.isArray(rawTaggedIds) && rawTaggedIds.length > 0
    ? JSON.stringify(rawTaggedIds.map(Number).filter(n => !isNaN(n)))
    : null;

  try {
    const [post] = await db.insert(postsTable).values({
      authorId: req.userId!,
      content: contentVal,
      imageUrl,
      thumbnailUrl,
      musicTrackName,
      musicArtist,
      musicUrl,
      musicArtworkUrl,
      musicDuration,
      location,
      bgColor,
      mood,
      taggedUserIds,
    }).returning();
    res.status(201).json(post);
  } catch (dbErr: unknown) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    const cause = (dbErr as { cause?: unknown })?.cause;
    const detail = (cause as { detail?: string; message?: string })?.message ?? (cause as { detail?: string })?.detail ?? "";
    console.error("[POST /posts] DB insert failed:", msg, "| cause:", detail);
    res.status(500).json({ error: "Erreur lors de la publication : " + (detail || msg) });
  }
});

router.get("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetPostParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [row] = await db.select({
    id:            postsTable.id,
    authorId:      postsTable.authorId,
    content:       postsTable.content,
    imageUrl:      postsTable.imageUrl,
    thumbnailUrl:  postsTable.thumbnailUrl,
    musicTrackName:  postsTable.musicTrackName,
    musicArtist:     postsTable.musicArtist,
    musicUrl:        postsTable.musicUrl,
    musicArtworkUrl: postsTable.musicArtworkUrl,
    musicDuration:   postsTable.musicDuration,
    likesCount:    postsTable.likesCount,
    commentsCount: postsTable.commentsCount,
    createdAt:     postsTable.createdAt,
    authorFirstName: usersTable.firstName,
    authorLastName:  usersTable.lastName,
    authorAvatarUrl: usersTable.avatarUrl,
    authorBadgeType: usersTable.badgeType,
  }).from(postsTable)
    .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(eq(postsTable.id, params.data.id));

  if (!row) { res.status(404).json({ error: "Post not found" }); return; }

  const [likeRow] = await db.select({ postId: postLikesTable.postId })
    .from(postLikesTable)
    .where(and(eq(postLikesTable.postId, params.data.id), eq(postLikesTable.userId, req.userId!)));

  // Reaction summary
  const reactionRows = await db.select({
    reactionType: postReactionsTable.reactionType,
    count: sql<number>`COUNT(*)::int`,
  }).from(postReactionsTable)
    .where(eq(postReactionsTable.postId, params.data.id))
    .groupBy(postReactionsTable.reactionType)
    .orderBy(desc(sql<number>`COUNT(*)`));

  const [myReactionRow] = await db.select({ reactionType: postReactionsTable.reactionType })
    .from(postReactionsTable)
    .where(and(eq(postReactionsTable.postId, params.data.id), eq(postReactionsTable.userId, req.userId!)));

  res.json({
    ...row,
    authorName: row.authorFirstName && row.authorLastName
      ? `${row.authorFirstName} ${row.authorLastName}`
      : "Utilisateur",
    liked: !!likeRow,
    userReactionType: myReactionRow?.reactionType ?? null,
    reactionSummary: reactionRows.map(r => ({ type: r.reactionType, count: r.count })),
  });
});

router.delete("/posts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePostParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  // Fetch first to get media keys for R2 cleanup
  const [post] = await db.select({
    id: postsTable.id,
    imageUrl: postsTable.imageUrl,
    thumbnailUrl: postsTable.thumbnailUrl,
  }).from(postsTable)
    .where(and(eq(postsTable.id, params.data.id), eq(postsTable.authorId, req.userId!)));

  if (!post) { res.status(404).json({ error: "Post not found" }); return; }

  await db.delete(postsTable).where(eq(postsTable.id, params.data.id));

  await releaseStorage([extractKeyFromUrl(post.imageUrl), extractKeyFromUrl(post.thumbnailUrl)]);

  res.sendStatus(204);
});

router.post("/posts/:id/music-like", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  if (!postId) { res.status(400).json({ error: "Invalid post id" }); return; }
  const userId = req.userId!;

  const existingRows = await db.execute(
    sql`SELECT id FROM music_post_likes WHERE post_id = ${postId} AND user_id = ${userId} LIMIT 1`
  );
  const existing = existingRows.rows.length > 0;

  if (existing) {
    await db.execute(sql`DELETE FROM music_post_likes WHERE post_id = ${postId} AND user_id = ${userId}`);
    await db.update(postsTable)
      .set({ musicLikesCount: sql`GREATEST(${postsTable.musicLikesCount} - 1, 0)` })
      .where(eq(postsTable.id, postId));
  } else {
    await db.execute(sql`INSERT INTO music_post_likes (post_id, user_id) VALUES (${postId}, ${userId}) ON CONFLICT DO NOTHING`);
    await db.update(postsTable)
      .set({ musicLikesCount: sql`${postsTable.musicLikesCount} + 1` })
      .where(eq(postsTable.id, postId));
  }

  const [updated] = await db.select({ musicLikesCount: postsTable.musicLikesCount })
    .from(postsTable).where(eq(postsTable.id, postId));
  res.json({ liked: !existing, musicLikesCount: updated?.musicLikesCount ?? 0 });
});

router.post("/posts/:id/like", requireAuth, async (req, res): Promise<void> => {
  const params = LikePostParams.safeParse({ id: Number(req.params.id) });
  const body = LikePostBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [existing] = await db.select().from(postLikesTable)
    .where(and(eq(postLikesTable.postId, params.data.id), eq(postLikesTable.userId, req.userId!)));

  if (body.data.action === "like" && !existing) {
    await db.insert(postLikesTable).values({ postId: params.data.id, userId: req.userId! });
    await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} + 1` }).where(eq(postsTable.id, params.data.id));
  } else if (body.data.action === "unlike" && existing) {
    await db.delete(postLikesTable).where(and(eq(postLikesTable.postId, params.data.id), eq(postLikesTable.userId, req.userId!)));
    await db.update(postsTable).set({ likesCount: sql`${postsTable.likesCount} - 1` }).where(eq(postsTable.id, params.data.id));
  }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id));

  // Push + DB notification to post author on new like
  if (body.data.action === "like" && !existing && post && post.authorId !== req.userId!) {
    const [liker] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
      .from(usersTable).where(eq(usersTable.id, req.userId!));
    const likerName = liker ? `${liker.firstName} ${liker.lastName}`.trim() : "Quelqu'un";
    pushToUserDevice(post.authorId, {
      title: "Brute Pawa",
      body: `${likerName} a aimé votre publication`,
      tag: `like-${params.data.id}`,
      data: { url: "/" },
    }).catch(() => {});
    db.insert(notificationsTable).values({
      userId: post.authorId,
      type: "like",
      actorId: req.userId!,
      actorName: likerName,
      action: "a aimé votre publication",
      link: `/profile/${req.userId!}`,
    }).catch(() => {});
  }

  res.json(post);
});

router.post("/posts/:id/react", requireAuth, async (req, res): Promise<void> => {
  const params = LikePostParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const VALID_TYPES = ["like", "adore", "top", "bravo"];
  const reactionType: string | null = req.body?.reactionType ?? null;
  if (reactionType !== null && !VALID_TYPES.includes(reactionType)) {
    res.status(400).json({ error: "Invalid reaction type" }); return;
  }

  const [existing] = await db.select({ id: postReactionsTable.id, reactionType: postReactionsTable.reactionType })
    .from(postReactionsTable)
    .where(and(eq(postReactionsTable.postId, params.data.id), eq(postReactionsTable.userId, req.userId!)));

  if (!reactionType || existing?.reactionType === reactionType) {
    // Unreact (toggle off)
    if (existing) {
      await db.delete(postReactionsTable)
        .where(and(eq(postReactionsTable.postId, params.data.id), eq(postReactionsTable.userId, req.userId!)));
      await db.update(postsTable)
        .set({ likesCount: sql`GREATEST(${postsTable.likesCount} - 1, 0)` })
        .where(eq(postsTable.id, params.data.id));
    }
  } else if (existing) {
    // Change reaction type — no count change
    await db.update(postReactionsTable)
      .set({ reactionType })
      .where(and(eq(postReactionsTable.postId, params.data.id), eq(postReactionsTable.userId, req.userId!)));
  } else {
    // New reaction
    await db.insert(postReactionsTable).values({ postId: params.data.id, userId: req.userId!, reactionType });
    await db.update(postsTable)
      .set({ likesCount: sql`${postsTable.likesCount} + 1` })
      .where(eq(postsTable.id, params.data.id));
    // Notification
    const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, params.data.id));
    if (post && post.authorId !== req.userId!) {
      const [reactor] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable).where(eq(usersTable.id, req.userId!));
      const reactorName = reactor ? `${reactor.firstName} ${reactor.lastName}`.trim() : "Quelqu'un";
      const labels: Record<string, string> = { like: "aimé", adore: "adoré", top: "trouvé top", bravo: "applaudi" };
      pushToUserDevice(post.authorId, { title: "Brute Pawa", body: `${reactorName} a ${labels[reactionType] ?? "réagi à"} votre publication`, tag: `react-${params.data.id}`, data: { url: "/" } }).catch(() => {});
      db.insert(notificationsTable).values({ userId: post.authorId, type: "like", actorId: req.userId!, actorName: reactorName, action: `a ${labels[reactionType] ?? "réagi à"} votre publication`, link: `/profile/${req.userId!}` }).catch(() => {});
    }
  }

  const [updatedPost] = await db.select({ likesCount: postsTable.likesCount }).from(postsTable).where(eq(postsTable.id, params.data.id));
  const reactionRows = await db.select({ reactionType: postReactionsTable.reactionType, count: sql<number>`COUNT(*)::int` })
    .from(postReactionsTable).where(eq(postReactionsTable.postId, params.data.id))
    .groupBy(postReactionsTable.reactionType).orderBy(desc(sql<number>`COUNT(*)`));
  const [myReactionRow] = await db.select({ reactionType: postReactionsTable.reactionType })
    .from(postReactionsTable).where(and(eq(postReactionsTable.postId, params.data.id), eq(postReactionsTable.userId, req.userId!)));

  res.json({
    userReactionType: myReactionRow?.reactionType ?? null,
    reactionSummary: reactionRows.map(r => ({ type: r.reactionType, count: r.count })),
    likesCount: updatedPost?.likesCount ?? 0,
  });
});

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;

  const blocks = await db.select({
    blockerId: userBlocksTable.blockerId,
    blockedId: userBlocksTable.blockedId,
  }).from(userBlocksTable).where(
    or(eq(userBlocksTable.blockerId, me), eq(userBlocksTable.blockedId, me))
  );
  const blockedUserIds = new Set(blocks.map(b => b.blockerId === me ? b.blockedId : b.blockerId));

  type RawMsg = { id: number; from_user_id: number; to_user_id: number; content: string; message_type: string; poll_id: number | null; is_read: boolean; is_delivered: boolean; created_at: Date };
  const _convoResult = await db.execute(sql`
     SELECT id, from_user_id, to_user_id, content, message_type, poll_id, is_read, is_delivered, created_at
    FROM (
      SELECT
         id, from_user_id, to_user_id, content, message_type, poll_id, is_read, is_delivered, created_at,
        ROW_NUMBER() OVER (
          PARTITION BY CASE WHEN from_user_id = ${me} THEN to_user_id ELSE from_user_id END
          ORDER BY created_at DESC
        ) AS rn
      FROM messages
      WHERE from_user_id = ${me} OR to_user_id = ${me}
    ) sub
    WHERE rn = 1
    ORDER BY created_at DESC
  `);
  const latestPerConvo = ((_convoResult as any).rows ?? _convoResult) as RawMsg[];

  const unreadCounts = await db.select({
    fromUserId: messagesTable.fromUserId,
    count: sql<number>`count(*)::int`,
  }).from(messagesTable)
    .where(and(eq(messagesTable.toUserId, me), eq(messagesTable.isRead, false)))
    .groupBy(messagesTable.fromUserId);
  const unreadMap = new Map(unreadCounts.map(u => [u.fromUserId, u.count]));

  const convos = latestPerConvo
    .map(m => ({
      userId:              m.from_user_id === me ? m.to_user_id : m.from_user_id,
      lastMessage:         m.content,
       messageType:         m.message_type ?? "text",
       pollId:              m.poll_id ?? null,
      lastSenderId:        m.from_user_id,
      lastMsgIsRead:       m.is_read,
      lastMsgIsDelivered:  m.is_delivered,
      unreadCount:         0,
      updatedAt:           m.created_at,
    }))
    .filter(c => !blockedUserIds.has(c.userId))
    .map(c => ({ ...c, unreadCount: unreadMap.get(c.userId) ?? 0 }));

  res.setHeader("Cache-Control", "private, no-cache");
  res.json(convos);
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const me = req.userId!;
  const toId = parsed.data.toUserId;

  // Deny if either party has blocked the other
  const [block] = await db.select().from(userBlocksTable).where(
    or(
      and(eq(userBlocksTable.blockerId, me), eq(userBlocksTable.blockedId, toId)),
      and(eq(userBlocksTable.blockerId, toId), eq(userBlocksTable.blockedId, me)),
    )
  );
  if (block) {
    res.status(403).json({ error: "Vous ne pouvez pas envoyer de message à cet utilisateur." });
    return;
  }

  const [msg] = await db.insert(messagesTable).values({
    fromUserId: me,
    toUserId: toId,
    content: parsed.data.content,
  }).returning();

  // SSE: notify recipient in real-time (if app is open)
  const recipientOnline = pushToUser(toId, "message:new", {
    id:         msg.id,
    fromUserId: me,
    toUserId:   toId,
    content:    msg.content,
     messageType: msg.messageType,
     pollId:     msg.pollId,
    createdAt:  msg.createdAt,
  });

  // Recipient is connected via SSE → immediately mark as delivered and notify sender
  if (recipientOnline) {
    db.update(messagesTable)
      .set({ isDelivered: true, deliveredAt: new Date() })
      .where(eq(messagesTable.id, msg.id))
      .catch(() => {});
    pushToUser(me, "message:delivered", { messageIds: [msg.id] });
  }

  // Push notification to recipient (if app is closed / offline)
  const [sender] = await db.select({
    firstName: usersTable.firstName,
    lastName:  usersTable.lastName,
    avatarUrl: usersTable.avatarUrl,
  }).from(usersTable).where(eq(usersTable.id, me));
  const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : "Quelqu'un";
  const origin = `${req.protocol}://${req.get("host")}`;
  /* Always use the same-origin avatar proxy — avoids CORS issues in the SW
     and falls back to a coloured initials SVG when no photo exists */
  const avatarIconUrl = `${origin}/api/users/${me}/avatar-icon`;
  const rawContent = parsed.data.content;
  const notifBody = rawContent.startsWith("__audio__")    ? "🎤 Message vocal"
    : rawContent.startsWith("__video__")    ? "📹 Message vidéo"
    : rawContent.startsWith("__sticker__")  ? "Sticker"
    : rawContent.startsWith("__image__")    ? "📷 Photo"
    : rawContent.startsWith("__doc__")      ? "📎 Document"
    : rawContent.startsWith("__location__") ? "📍 Localisation"
    : rawContent.length > 80 ? rawContent.slice(0, 80) + "…" : rawContent;
  pushToUserDevice(toId, {
    title:    senderName,
    body:     notifBody,
    /* Same-origin proxy URL — Chrome always loads this, regardless of whether
       the user has a real avatar or not. No CORS issues in the service worker. */
    icon:     avatarIconUrl,
    badge:    `${origin}/icons/badge-96.png`,
    tag:      `msg-${me}`,
    renotify: true,
    vibrate:  [200, 100, 200],
    actions:  [
      { action: "reply",     title: "↩ Répondre" },
      { action: "mark_read", title: "✓ Marquer comme lu" },
      { action: "open",      title: "💬 Ouvrir le chat" },
    ],
    data: {
      url:            `/messages?userId=${me}`,
      msgId:          msg.id,
      toUserId:       toId,
      fromUserId:     me,
      senderName,
      senderAvatarUrl: avatarIconUrl,
      deliveryToken:  makeDeliveryToken(msg.id, toId),
      markReadToken:  makeMarkReadToken(me, toId),
      replyToken:     makeReplyToken(me, toId),
    },
  }).catch(() => {});

  res.status(201).json(msg);
});

/* ── SW delivery receipt (unauthenticated, token-verified) ──────────────────
   Called by the service worker the moment a push notification is received,
   even when the app is closed. Proves Bob's device got the message → ✓✓. */
router.post("/messages/sw-delivered", async (req, res): Promise<void> => {
  const { token, msgId, toUserId } = req.body as { token?: string; msgId?: number; toUserId?: number };
  if (!token || !msgId || !toUserId || !verifyDeliveryToken(token, Number(msgId), Number(toUserId))) {
    res.status(403).json({ ok: false });
    return;
  }
  const updated = await db.update(messagesTable)
    .set({ isDelivered: true, deliveredAt: new Date() })
    .where(and(eq(messagesTable.id, Number(msgId)), eq(messagesTable.isDelivered, false)))
    .returning({ id: messagesTable.id, fromUserId: messagesTable.fromUserId })
    .catch(() => []);
  if (updated.length > 0) {
    pushToUser(updated[0].fromUserId, "message:delivered", { messageIds: [updated[0].id] });
  }
  res.json({ ok: true });
});

/* ── SW mark-read (unauthenticated, token-verified) ────────────────────────
   Called by the service worker from the "Marquer comme lu" notification action.
   Marks all messages from fromUserId to toUserId as read without opening app.
   Sends { messageIds } in the SSE event so the sender's UI updates double-ticks. */
router.post("/messages/sw-mark-read", async (req, res): Promise<void> => {
  const { token, fromUserId, toUserId } = req.body as {
    token?: string; fromUserId?: number; toUserId?: number;
  };
  if (!token || !fromUserId || !toUserId ||
      !verifyMarkReadToken(token, Number(fromUserId), Number(toUserId))) {
    res.status(403).json({ ok: false });
    return;
  }

  /* 1. Collect IDs of unread messages BEFORE the update (needed for SSE payload) */
  const unreadRows = await db
    .select({ id: messagesTable.id })
    .from(messagesTable)
    .where(and(
      eq(messagesTable.fromUserId, Number(fromUserId)),
      eq(messagesTable.toUserId,   Number(toUserId)),
      eq(messagesTable.isRead, false),
    ))
    .catch(() => [] as { id: number }[]);
  const messageIds = unreadRows.map(r => r.id);

  if (messageIds.length > 0) {
    /* 2. Mark them read */
    await db.update(messagesTable)
      .set({ isRead: true, isDelivered: true })
      .where(and(
        eq(messagesTable.fromUserId, Number(fromUserId)),
        eq(messagesTable.toUserId,   Number(toUserId)),
        eq(messagesTable.isRead, false),
      ))
      .catch(() => {});

    /* 3. Notify sender via SSE with the exact message IDs → triggers double-tick update */
    pushToUser(Number(fromUserId), "message:read", { messageIds });
  }

  res.json({ ok: true, count: messageIds.length });
});

/* ── SW inline-reply (unauthenticated, token-verified, expires in 24 h) ────
   Called by the service worker when the user types a reply directly from the
   Android notification without opening the app.
   fromUserId = original sender, toUserId = notification recipient (replier). */
router.post("/messages/sw-reply", async (req, res): Promise<void> => {
  const { token, fromUserId, toUserId, text } = req.body as {
    token?: string; fromUserId?: number; toUserId?: number; text?: string;
  };
  const content = (text ?? "").trim().slice(0, 2000);
  if (!token || !fromUserId || !toUserId || !content ||
      !verifyReplyToken(token, Number(fromUserId), Number(toUserId))) {
    res.status(403).json({ ok: false });
    return;
  }
  /* The replier (toUserId) sends a message to the original sender (fromUserId) */
  const [msg] = await db.insert(messagesTable).values({
    fromUserId: Number(toUserId),
    toUserId:   Number(fromUserId),
    content,
  }).returning().catch(() => []);

  if (!msg) { res.status(500).json({ ok: false }); return; }

  /* Real-time delivery if recipient is online */
  const recipientOnline = pushToUser(Number(fromUserId), "message:new", {
    id:         msg.id,
    fromUserId: Number(toUserId),
    toUserId:   Number(fromUserId),
    content:    msg.content,
    createdAt:  msg.createdAt,
  });
  if (recipientOnline) {
    db.update(messagesTable)
      .set({ isDelivered: true, deliveredAt: new Date() })
      .where(eq(messagesTable.id, msg.id))
      .catch(() => {});
    pushToUser(Number(toUserId), "message:delivered", { messageIds: [msg.id] });
  }

  res.json({ ok: true, msgId: msg.id });
});

router.get("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse({ userId: Number(req.params.userId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const me      = req.userId!;
  const otherId = params.data.userId;
  const before  = req.query.before ? Number(req.query.before) : null;
  const PAGE    = 100;

  const [block] = await db.select({ id: userBlocksTable.id }).from(userBlocksTable).where(
    or(
      and(eq(userBlocksTable.blockerId, me), eq(userBlocksTable.blockedId, otherId)),
      and(eq(userBlocksTable.blockerId, otherId), eq(userBlocksTable.blockedId, me)),
    )
  );
  if (block) {
    res.status(403).json({ error: "Vous ne pouvez pas accéder à cette conversation." });
    return;
  }

  const pairCond = or(
    and(eq(messagesTable.fromUserId, me),      eq(messagesTable.toUserId, otherId)),
    and(eq(messagesTable.fromUserId, otherId), eq(messagesTable.toUserId, me)),
  )!;

  const whereCond = (before !== null && !isNaN(before))
    ? and(pairCond, lt(messagesTable.id, before))
    : pairCond;

  /* Fetch PAGE+1 in DESC order so we know if more exist, then reverse to ASC */
  const raw = await db.select().from(messagesTable)
    .where(whereCond)
    .orderBy(desc(messagesTable.id))
    .limit(PAGE + 1);

  const hasMore = raw.length > PAGE;
  const msgs    = (hasMore ? raw.slice(0, PAGE) : raw).reverse();

  /* Mark as read only when the user explicitly opens the conversation (mark_read=1),
     NOT on background polls — prevents premature ✓✓ blue receipts. */
  if (req.query.mark_read === "1") {
    db.update(messagesTable)
      .set({ isRead: true, isDelivered: true })
      .where(and(
        eq(messagesTable.fromUserId, otherId),
        eq(messagesTable.toUserId, me),
        eq(messagesTable.isRead, false),
      ))
      .returning({ id: messagesTable.id })
      .then(readMsgs => {
        if (readMsgs.length > 0) {
          pushToUser(otherId, "message:read", { messageIds: readMsgs.map(m => m.id) });
        }
      })
      .catch(() => {});
  }

  res.setHeader("Cache-Control", "private, no-cache");
  res.json({ messages: msgs, hasMore });
});

router.delete("/messages/msg/:messageId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const msgId = Number(req.params.messageId);
  if (isNaN(msgId)) { res.status(400).json({ error: "messageId invalide" }); return; }

  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId));
  if (!msg) { res.status(404).json({ error: "Message non trouvé" }); return; }
  if (msg.fromUserId !== me && msg.toUserId !== me) {
    res.status(403).json({ error: "Non autorisé" }); return;
  }

  await db.delete(messagesTable).where(eq(messagesTable.id, msgId));
  res.status(204).end();
});

router.delete("/messages/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const otherId = Number(req.params.userId);
  if (isNaN(otherId)) { res.status(400).json({ error: "userId invalide" }); return; }

  await db.delete(messagesTable).where(
    or(
      and(eq(messagesTable.fromUserId, me), eq(messagesTable.toUserId, otherId)),
      and(eq(messagesTable.fromUserId, otherId), eq(messagesTable.toUserId, me)),
    )
  );
  res.status(204).end();
});

// ─── Stories ────────────────────────────────────────────────────────────────

router.get("/stories", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const rows = await db
    .select({
      id:              storiesTable.id,
      authorId:        storiesTable.authorId,
      mediaUrl:        storiesTable.mediaUrl,
      thumbnailUrl:    storiesTable.thumbnailUrl,
      content:         storiesTable.content,
      bgColor:         storiesTable.bgColor,
      emoji:           storiesTable.emoji,
      musicTrackName:  storiesTable.musicTrackName,
      musicArtist:     storiesTable.musicArtist,
      musicUrl:        storiesTable.musicUrl,
      musicArtworkUrl: storiesTable.musicArtworkUrl,
      expiresAt:       storiesTable.expiresAt,
      viewsCount:      storiesTable.viewsCount,
      createdAt:       storiesTable.createdAt,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
      authorAvatarUrl: usersTable.avatarUrl,
      authorCountry: usersTable.country,
    })
    .from(storiesTable)
    .leftJoin(usersTable, eq(storiesTable.authorId, usersTable.id))
    .where(gt(storiesTable.expiresAt, now))
    .orderBy(desc(storiesTable.createdAt));

  const authorMap = new Map<number, {
    authorId: number;
    authorName: string;
    authorAvatarUrl: string | null;
    authorCountry: string;
    stories: typeof rows;
  }>();

  for (const r of rows) {
    if (!authorMap.has(r.authorId)) {
      authorMap.set(r.authorId, {
        authorId: r.authorId,
        authorName: r.authorFirstName && r.authorLastName
          ? `${r.authorFirstName} ${r.authorLastName}` : "Utilisateur",
        authorAvatarUrl: r.authorAvatarUrl,
        authorCountry: r.authorCountry ?? "BJ",
        stories: [],
      });
    }
    authorMap.get(r.authorId)!.stories.push(r);
  }

  res.setHeader("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
  res.json(Array.from(authorMap.values()).map(a => ({
    authorId: a.authorId,
    authorName: a.authorName,
    authorAvatarUrl: a.authorAvatarUrl,
    authorCountry: a.authorCountry,
    storiesCount: a.stories.length,
    stories: a.stories.map(s => ({
      id: s.id,
      mediaUrl: s.mediaUrl,
      thumbnailUrl:    s.thumbnailUrl,
      content:         s.content,
      bgColor:         s.bgColor,
      emoji:           s.emoji,
      musicTrackName:  s.musicTrackName ?? null,
      musicArtist:     s.musicArtist ?? null,
      musicUrl:        s.musicUrl,
      musicArtworkUrl: s.musicArtworkUrl,
      expiresAt:       s.expiresAt,
      viewsCount:      s.viewsCount,
      createdAt:       s.createdAt,
    })),
    latestStoryAt: a.stories[0]?.createdAt ?? null,
  })));
});

router.post("/stories", requireAuth, async (req, res): Promise<void> => {
  const {
    mediaUrl, thumbnailUrl, content, bgColor, emoji,
    musicTrackName, musicArtist, musicUrl, musicArtworkUrl,
  } = req.body as {
    mediaUrl?: string; thumbnailUrl?: string; content?: string;
    bgColor?: string; emoji?: string;
    musicTrackName?: string | null; musicArtist?: string | null;
    musicUrl?: string | null; musicArtworkUrl?: string | null;
  };

  if (!mediaUrl && !content) {
    res.status(400).json({ error: "mediaUrl or content required" }); return;
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [story] = await db.insert(storiesTable).values({
    authorId:        req.userId!,
    mediaUrl:        mediaUrl        ?? null,
    thumbnailUrl:    thumbnailUrl    ?? null,
    content:         content         ?? null,
    bgColor:         bgColor         ?? "#1877F2",
    emoji:           emoji           ?? null,
    musicTrackName:  musicTrackName  ?? null,
    musicArtist:     musicArtist     ?? null,
    musicUrl:        musicUrl        ?? null,
    musicArtworkUrl: musicArtworkUrl ?? null,
    expiresAt,
  }).returning();

  res.status(201).json(story);
});

router.post("/stories/:id/view", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(storiesTable)
    .set({ viewsCount: sql`${storiesTable.viewsCount} + 1` })
    .where(eq(storiesTable.id, id));
  res.sendStatus(204);
});

router.delete("/stories/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [story] = await db.select({
    id: storiesTable.id,
    mediaUrl: storiesTable.mediaUrl,
    thumbnailUrl: storiesTable.thumbnailUrl,
  }).from(storiesTable)
    .where(and(eq(storiesTable.id, id), eq(storiesTable.authorId, req.userId!)));

  if (!story) { res.status(404).json({ error: "Story not found" }); return; }

  await db.delete(storiesTable).where(eq(storiesTable.id, id));

  await releaseStorage([extractKeyFromUrl(story.mediaUrl), extractKeyFromUrl(story.thumbnailUrl)]);

  res.sendStatus(204);
});

// ─── Comments ────────────────────────────────────────────────────────────────

router.get("/posts/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const userId = req.userId!;

  const rows = await db
    .select({
      id: commentsTable.id,
      postId: commentsTable.postId,
      authorId: commentsTable.authorId,
      parentId: commentsTable.parentId,
      content: commentsTable.content,
      audioUrl: commentsTable.audioUrl,
      audioDuration: commentsTable.audioDuration,
      likesCount: commentsTable.likesCount,
      createdAt: commentsTable.createdAt,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
      authorAvatarUrl: usersTable.avatarUrl,
    })
    .from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.authorId, usersTable.id))
    .where(eq(commentsTable.postId, postId))
    .orderBy(commentsTable.createdAt)
    .limit(200);

  // Fetch which comments the current user has liked
  const likedRows = rows.length
    ? await db
        .select({ commentId: commentLikesTable.commentId })
        .from(commentLikesTable)
        .where(
          and(
            eq(commentLikesTable.userId, userId),
            sql`${commentLikesTable.commentId} = ANY(ARRAY[${sql.join(rows.map(r => sql`${r.id}`), sql`, `)}]::int[])`,
          ),
        )
    : [];

  const likedSet = new Set(likedRows.map(r => r.commentId));
  res.json(rows.map(r => ({ ...r, likedByMe: likedSet.has(r.id) })));
});

router.post("/posts/:postId/comments/:commentId/like", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.postId);
  const commentId = parseInt(req.params.commentId);
  if (isNaN(postId) || isNaN(commentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const userId = req.userId!;

  // Check comment exists and belongs to this post
  const [comment] = await db
    .select({ id: commentsTable.id, likesCount: commentsTable.likesCount })
    .from(commentsTable)
    .where(and(eq(commentsTable.id, commentId), eq(commentsTable.postId, postId)));

  if (!comment) { res.status(404).json({ error: "Commentaire introuvable" }); return; }

  // Check existing like
  const [existing] = await db
    .select({ id: commentLikesTable.id })
    .from(commentLikesTable)
    .where(and(eq(commentLikesTable.commentId, commentId), eq(commentLikesTable.userId, userId)));

  let liked: boolean;
  if (existing) {
    // Unlike
    await db.delete(commentLikesTable)
      .where(and(eq(commentLikesTable.commentId, commentId), eq(commentLikesTable.userId, userId)));
    await db.update(commentsTable)
      .set({ likesCount: sql`GREATEST(${commentsTable.likesCount} - 1, 0)` })
      .where(eq(commentsTable.id, commentId));
    liked = false;
  } else {
    // Like
    await db.insert(commentLikesTable).values({ commentId, userId });
    await db.update(commentsTable)
      .set({ likesCount: sql`${commentsTable.likesCount} + 1` })
      .where(eq(commentsTable.id, commentId));
    liked = true;
  }

  const [updated] = await db
    .select({ likesCount: commentsTable.likesCount })
    .from(commentsTable)
    .where(eq(commentsTable.id, commentId));

  res.json({ liked, likesCount: updated?.likesCount ?? 0 });
});

router.post("/posts/:id/comments", requireAuth, async (req, res): Promise<void> => {
  const postId = parseInt(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const { content, parentId, audioUrl, audioDuration } = req.body as {
    content?: string;
    parentId?: number;
    audioUrl?: string;
    audioDuration?: number;
  };

  const isVoice = !!audioUrl;
  const textContent = content?.trim() ?? "";

  // Must have either text or audio
  if (!textContent && !isVoice) {
    res.status(400).json({ error: "Contenu ou vocal requis" }); return;
  }

  // Validate voice comment
  if (isVoice) {
    const R2_HOST = process.env.R2_PUBLIC_URL ?? "";
    if (!audioUrl.startsWith(R2_HOST) || !/\/(audio)\//.test(audioUrl)) {
      res.status(400).json({ error: "URL audio invalide" }); return;
    }
    if (audioDuration != null && (audioDuration < 0 || audioDuration > 60)) {
      res.status(400).json({ error: "Durée audio invalide (max 60 s)" }); return;
    }
  }

  const authorId = req.userId!;

  // Fetch post to get author id
  const [post] = await db
    .select({ authorId: postsTable.authorId })
    .from(postsTable)
    .where(eq(postsTable.id, postId));

  if (!post) { res.status(404).json({ error: "Publication introuvable" }); return; }

  // Validate parentId if provided
  let parentComment: { authorId: number } | null = null;
  if (parentId) {
    const [parent] = await db
      .select({ authorId: commentsTable.authorId })
      .from(commentsTable)
      .where(and(eq(commentsTable.id, parentId), eq(commentsTable.postId, postId)));
    if (!parent) { res.status(404).json({ error: "Commentaire parent introuvable" }); return; }
    parentComment = parent;
  }

  // Insert comment
  const [comment] = await db
    .insert(commentsTable)
    .values({
      postId,
      authorId,
      content: textContent,
      parentId: parentId ?? null,
      audioUrl: isVoice ? audioUrl : null,
      audioDuration: isVoice && audioDuration != null ? audioDuration : null,
    })
    .returning();

  // Increment commentsCount on post
  await db
    .update(postsTable)
    .set({ commentsCount: sql`${postsTable.commentsCount} + 1` })
    .where(eq(postsTable.id, postId));

  // Fetch commenter name once for notifications
  const [commenter] = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable)
    .where(eq(usersTable.id, authorId));

  const commenterName = commenter ? `${commenter.firstName} ${commenter.lastName}` : "Quelqu'un";
  const preview = isVoice ? "🎤 Message vocal" : (textContent.length > 60 ? textContent.slice(0, 60) + "…" : textContent);

  // Notify parent comment author if this is a reply (and not self)
  if (parentComment && parentComment.authorId !== authorId) {
    pushToUserDevice(parentComment.authorId, {
      title: `↩️ ${commenterName} a répondu à votre commentaire`,
      body: preview,
      url: "/",
    }).catch(() => {});
    db.insert(notificationsTable).values({
      userId: parentComment.authorId,
      type: "comment",
      actorId: authorId,
      actorName: commenterName,
      action: "a répondu à votre commentaire",
      detail: preview,
      link: `/profile/${authorId}`,
    }).catch(() => {});
  }

  // Notify post author if not self and not already notified above
  const alreadyNotified = parentComment?.authorId === post.authorId;
  if (post.authorId !== authorId && !alreadyNotified) {
    pushToUserDevice(post.authorId, {
      title: `💬 ${commenterName} a commenté votre publication`,
      body: preview,
      url: "/",
    }).catch(() => {});
    db.insert(notificationsTable).values({
      userId: post.authorId,
      type: "comment",
      actorId: authorId,
      actorName: commenterName,
      action: "a commenté votre publication",
      detail: preview,
      link: `/profile/${authorId}`,
    }).catch(() => {});
  }

  res.status(201).json(comment);
});

// ─── DELETE comment (author only) ────────────────────────────────────────────

router.delete("/posts/:postId/comments/:commentId", requireAuth, async (req, res): Promise<void> => {
  const postId    = parseInt(req.params.postId);
  const commentId = parseInt(req.params.commentId);
  if (isNaN(postId) || isNaN(commentId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const userId = req.userId!;

  const [comment] = await db
    .select({ authorId: commentsTable.authorId, audioUrl: commentsTable.audioUrl })
    .from(commentsTable)
    .where(and(eq(commentsTable.id, commentId), eq(commentsTable.postId, postId)));

  if (!comment) { res.status(404).json({ error: "Commentaire introuvable" }); return; }
  if (comment.authorId !== userId) { res.status(403).json({ error: "Non autorisé" }); return; }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));

  // Decrement post comment count
  await db
    .update(postsTable)
    .set({ commentsCount: sql`GREATEST(${postsTable.commentsCount} - 1, 0)` })
    .where(eq(postsTable.id, postId));

  // Delete audio file from R2 if present
  if (comment.audioUrl) {
    const key = comment.audioUrl.replace(/^https?:\/\/[^/]+\//, "");
    releaseStorage([key]).catch(() => {});
  }

  res.json({ ok: true });
});

// ─── Notifications ──────────────────────────────────────────────────────────

router.get("/notifications/unread-count", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  res.json({ count: row?.count ?? 0 });
});

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const rows = await db
    .select({
      id:            notificationsTable.id,
      type:          notificationsTable.type,
      actorId:       notificationsTable.actorId,
      actorName:     notificationsTable.actorName,
      actorAvatarUrl: sql<string | null>`COALESCE(${notificationsTable.actorAvatarUrl}, ${usersTable.avatarUrl})`,
      action:        notificationsTable.action,
      detail:        notificationsTable.detail,
      thumbnailUrl:  notificationsTable.thumbnailUrl,
      messageCount:  notificationsTable.messageCount,
      link:          notificationsTable.link,
      isRead:        notificationsTable.isRead,
      createdAt:     notificationsTable.createdAt,
    })
    .from(notificationsTable)
    .leftJoin(usersTable, eq(usersTable.id, notificationsTable.actorId))
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(rows.map(r => ({
    ...r,
    actorAvatarUrl: (r as any).actorAvatarUrl,
    thumbnailUrl: (r as any).thumbnailUrl,
  })));
});

router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  res.json({ ok: true });
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const notifId = parseInt(req.params.id, 10);
  if (isNaN(notifId)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, notifId), eq(notificationsTable.userId, userId)));
  res.json({ ok: true });
});

router.post("/posts/:id/archive", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const userId = req.userId!;
  const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId));
  if (!post) { res.status(404).json({ error: "Publication introuvable" }); return; }
  if (post.authorId !== userId) { res.status(403).json({ error: "Accès refusé" }); return; }
  await db.update(postsTable).set({ isArchived: true, archivedAt: new Date() }).where(eq(postsTable.id, postId));
  res.json({ ok: true });
});

router.post("/posts/:id/pin", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const userId = req.userId!;
  if (isNaN(postId)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId));
  if (!post) { res.status(404).json({ error: "Publication introuvable" }); return; }
  if (post.authorId !== userId) { res.status(403).json({ error: "Accès refusé" }); return; }
  await db.update(postsTable).set({ isPinned: false }).where(eq(postsTable.authorId, userId));
  await db.update(postsTable).set({ isPinned: true }).where(eq(postsTable.id, postId));
  res.json({ ok: true });
});

router.get("/posts/archived", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rows = await db
    .select({
      id: postsTable.id,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      archivedAt: postsTable.archivedAt,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
    })
    .from(postsTable)
    .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(postsTable.authorId, userId), eq(postsTable.isArchived, true)))
    .orderBy(desc(postsTable.archivedAt));

  res.json(rows.map(r => ({
    id: r.id,
    type: r.imageUrl ? "post" : "post",
    summary: r.content.length > 80 ? r.content.slice(0, 80) + "…" : (r.content || "a publié une photo"),
    archivedAt: r.archivedAt?.toISOString() ?? new Date().toISOString(),
    authorName: r.authorFirstName && r.authorLastName ? `${r.authorFirstName} ${r.authorLastName}` : "Vous",
  })));
});

router.post("/posts/archived/restore", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  if (ids.length === 0) { res.status(400).json({ error: "Aucun identifiant fourni" }); return; }
  await db
    .update(postsTable)
    .set({ isArchived: false, archivedAt: null })
    .where(and(eq(postsTable.authorId, userId), sql`${postsTable.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`));
  res.json({ ok: true });
});

router.get("/saved", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rows = await db
    .select({
      id: savedPostsTable.id,
      postId: savedPostsTable.postId,
      savedAt: savedPostsTable.createdAt,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      thumbnailUrl: postsTable.thumbnailUrl,
      likesCount: postsTable.likesCount,
      commentsCount: postsTable.commentsCount,
      createdAt: postsTable.createdAt,
      authorFirstName: usersTable.firstName,
      authorLastName: usersTable.lastName,
      authorAvatarUrl: usersTable.avatarUrl,
      authorCountry: usersTable.country,
    })
    .from(savedPostsTable)
    .innerJoin(postsTable, eq(savedPostsTable.postId, postsTable.id))
    .leftJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(eq(savedPostsTable.userId, userId))
    .orderBy(desc(savedPostsTable.createdAt))
    .limit(50);
  res.json(rows.map(r => ({
    id: r.id,
    postId: r.postId,
    savedAt: r.savedAt,
    content: r.content,
    imageUrl: r.imageUrl,
    thumbnailUrl: r.thumbnailUrl,
    likesCount: r.likesCount,
    commentsCount: r.commentsCount,
    createdAt: r.createdAt,
    authorName: r.authorFirstName && r.authorLastName ? `${r.authorFirstName} ${r.authorLastName}` : "Utilisateur",
    authorAvatarUrl: r.authorAvatarUrl,
    authorCountry: r.authorCountry,
  })));
});

router.post("/saved/:postId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const postId = parseInt(req.params.postId, 10);
  if (isNaN(postId)) { res.status(400).json({ error: "ID invalide" }); return; }
  const existing = await db.select().from(savedPostsTable).where(and(eq(savedPostsTable.userId, userId), eq(savedPostsTable.postId, postId)));
  if (existing.length > 0) {
    await db.delete(savedPostsTable).where(and(eq(savedPostsTable.userId, userId), eq(savedPostsTable.postId, postId)));
    res.json({ saved: false });
  } else {
    await db.insert(savedPostsTable).values({ userId, postId }).onConflictDoNothing();
    res.json({ saved: true });
  }
});

router.delete("/saved/:postId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const postId = parseInt(req.params.postId, 10);
  if (isNaN(postId)) { res.status(400).json({ error: "ID invalide" }); return; }
  await db.delete(savedPostsTable).where(and(eq(savedPostsTable.userId, userId), eq(savedPostsTable.postId, postId)));
  res.json({ ok: true });
});

router.get("/saved/check", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const idsRaw = req.query.ids;
  const ids: number[] = Array.isArray(idsRaw)
    ? idsRaw.map(Number).filter(n => !isNaN(n))
    : typeof idsRaw === "string"
    ? idsRaw.split(",").map(Number).filter(n => !isNaN(n))
    : [];
  if (ids.length === 0) { res.json({ saved: [] }); return; }
  const rows = await db
    .select({ postId: savedPostsTable.postId })
    .from(savedPostsTable)
    .where(and(eq(savedPostsTable.userId, userId), sql`${savedPostsTable.postId} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`));
  res.json({ saved: rows.map(r => r.postId) });
});

router.get("/memories", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const rows = await db
    .select({
      id: postsTable.id,
      content: postsTable.content,
      imageUrl: postsTable.imageUrl,
      thumbnailUrl: postsTable.thumbnailUrl,
      likesCount: postsTable.likesCount,
      commentsCount: postsTable.commentsCount,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .where(and(
      eq(postsTable.authorId, userId),
      eq(postsTable.isArchived, false),
      sql`EXTRACT(MONTH FROM ${postsTable.createdAt}) = ${month}`,
      sql`EXTRACT(DAY FROM ${postsTable.createdAt}) = ${day}`,
      sql`EXTRACT(YEAR FROM ${postsTable.createdAt}) < ${now.getFullYear()}`,
    ))
    .orderBy(desc(postsTable.createdAt))
    .limit(20);
  res.json(rows.map(r => ({
    ...r,
    yearsAgo: now.getFullYear() - new Date(r.createdAt).getFullYear(),
  })));
});

router.post("/posts/:id/report", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const postId = parseInt(req.params.id, 10);
  if (isNaN(postId)) { res.status(400).json({ error: "ID invalide" }); return; }
  const { reason } = req.body ?? {};
  const r = reason ? String(reason).slice(0, 200) : "spam";
  await db.insert(postReportsTable).values({ reporterId: userId, postId, reason: r }).onConflictDoNothing();
  res.json({ ok: true });
});

router.post("/posts/archived/delete", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
  if (ids.length === 0) { res.status(400).json({ error: "Aucun identifiant fourni" }); return; }
  const posts = await db
    .select({ id: postsTable.id, imageUrl: postsTable.imageUrl, thumbnailUrl: postsTable.thumbnailUrl })
    .from(postsTable)
    .where(and(eq(postsTable.authorId, userId), sql`${postsTable.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`));
  for (const p of posts) {
    if (p.imageUrl) { const k = extractKeyFromUrl(p.imageUrl); if (k && ownerIdFromKey(k) === userId) await releaseStorage(userId, k); }
    if (p.thumbnailUrl) { const k = extractKeyFromUrl(p.thumbnailUrl); if (k && ownerIdFromKey(k) === userId) await releaseStorage(userId, k); }
  }
  await db.delete(postsTable).where(and(
    eq(postsTable.authorId, userId),
    sql`${postsTable.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::int[])`,
  ));
  res.json({ ok: true });
});

/* ── Typing indicators (in-memory, expires 3s) ── */
const typingMap = new Map<string, { expiry: number; activity: string }>();
router.post("/messages/typing", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const toId = parseInt(req.body?.toUserId, 10);
  if (!toId) { res.status(400).json({ error: "toUserId required" }); return; }
  const activity = (req.body?.activity as string) || "typing";
  typingMap.set(`${me}-${toId}`, { expiry: Date.now() + 3500, activity });
  res.json({ ok: true });
});
router.get("/messages/typing/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = req.userId!;
  const otherId = parseInt(req.params.userId, 10);
  const entry = typingMap.get(`${otherId}-${me}`);
  const active = !!entry && Date.now() < entry.expiry;
  res.json({ typing: active, activity: active ? entry!.activity : "typing" });
});

/* ── Post: unpin ── */
router.post("/posts/:id/unpin", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post || post.authorId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(postsTable).set({ isPinned: false }).where(eq(postsTable.id, postId));
  res.json({ ok: true });
});

/* ── Post: hide ── */
router.post("/posts/:id/hide", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const userId = req.userId!;
  try {
    await db.insert(hiddenPostsTable).values({ userId, postId }).onConflictDoNothing();
  } catch { /* ignore */ }
  res.json({ ok: true });
});

router.delete("/posts/:id/hide", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  await db.delete(hiddenPostsTable).where(and(eq(hiddenPostsTable.userId, req.userId!), eq(hiddenPostsTable.postId, postId)));
  res.json({ ok: true });
});

/* ── Post: toggle comments ── */
router.post("/posts/:id/comments/toggle", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const [post] = await db.select({ authorId: postsTable.authorId, commentsDisabled: postsTable.commentsDisabled }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post || post.authorId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(postsTable).set({ commentsDisabled: !post.commentsDisabled }).where(eq(postsTable.id, postId));
  res.json({ ok: true, commentsDisabled: !post.commentsDisabled });
});

/* ── Post: audience ── */
router.patch("/posts/:id/audience", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const audience = req.body?.audience;
  if (!["public","friends","private"].includes(audience)) { res.status(400).json({ error: "Invalid audience" }); return; }
  const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post || post.authorId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(postsTable).set({ audience }).where(eq(postsTable.id, postId));
  res.json({ ok: true, audience });
});

/* ── Post: statistics ── */
router.get("/posts/:id/statistics", requireAuth, async (req, res): Promise<void> => {
  const postId = Number(req.params.id);
  const [post] = await db.select({ authorId: postsTable.authorId, likesCount: postsTable.likesCount, commentsCount: postsTable.commentsCount }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post || post.authorId !== req.userId) { res.status(403).json({ error: "Forbidden" }); return; }
  const [saveCount] = await db.select({ count: sql<number>`count(*)::int` }).from(savedPostsTable).where(eq(savedPostsTable.postId, postId));
  const likes = post.likesCount ?? 0;
  const comments = post.commentsCount ?? 0;
  const saves = saveCount?.count ?? 0;
  const views = Math.max(likes * 8 + comments * 12 + saves * 6, likes + comments + 1);
  const reach = Math.round(views * 1.4);
  const shares = Math.round(likes * 0.1);
  const total = likes + comments + saves + shares;
  const engagement = views > 0 ? `${((total / views) * 100).toFixed(1)}%` : "0%";
  res.json({ views, likes, comments, saves, shares, reach, engagement });
});

/* ── Link preview (OG metadata scraper) ── */
const lpCache = new Map<string, { data: object; expires: number }>();
router.get("/link-preview", async (req, res): Promise<void> => {
  const url = typeof req.query.url === "string" ? req.query.url.trim() : null;
  if (!url || !url.startsWith("http")) { res.status(400).json({ error: "url required" }); return; }
  const cached = lpCache.get(url);
  if (cached && cached.expires > Date.now()) { res.json(cached.data); return; }
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 BrutePawa/1.0 (+https://brutepawa.com) LinkPreview" },
      signal: AbortSignal.timeout(6000),
    });
    const html = await r.text();
    const getOg = (prop: string) => {
      const re1 = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i");
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i");
      return (html.match(re1) || html.match(re2))?.[1] ?? null;
    };
    const getMeta = (name: string) => {
      const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
      return html.match(re)?.[1] ?? null;
    };
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const favicon = (() => {
      const m = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
      if (!m) return null;
      const href = m[1];
      if (href.startsWith("http")) return href;
      try { return new URL(href, url).href; } catch { return null; }
    })();
    const data = {
      title: getOg("title") || titleMatch?.[1]?.trim() || null,
      description: getOg("description") || getMeta("description") || null,
      image: getOg("image") || null,
      favicon,
      siteName: getOg("site_name") || null,
      url: getOg("url") || url,
    };
    lpCache.set(url, { data, expires: Date.now() + 30 * 60_000 });
    res.json(data);
  } catch {
    res.status(500).json({ error: "fetch failed" });
  }
});

export default router;
