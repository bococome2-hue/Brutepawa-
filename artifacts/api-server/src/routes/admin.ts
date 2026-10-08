import { Router } from "express";
import { db, usersTable, transactionsTable, productsTable, jobsTable, coursesTable, userReportsTable } from "@workspace/db";
import { eq, ilike, desc, sql, asc } from "drizzle-orm";
import { ListAdminUsersQueryParams, UpdateUserStatusParams, UpdateUserStatusBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();

router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [totalTransactions] = await db.select({ count: sql<number>`count(*)::int` }).from(transactionsTable);
  const [totalProducts] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
  const [totalJobs] = await db.select({ count: sql<number>`count(*)::int` }).from(jobsTable);
  const [totalCourses] = await db.select({ count: sql<number>`count(*)::int` }).from(coursesTable);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [newUsersToday] = await db.select({ count: sql<number>`count(*)::int` })
    .from(usersTable).where(sql`created_at >= ${today}`);
  const [activeUsers] = await db.select({ count: sql<number>`count(*)::int` })
    .from(usersTable).where(eq(usersTable.status, "active"));

  const [revenue] = await db.select({ total: sql<number>`coalesce(sum(amount::numeric), 0)::float` })
    .from(transactionsTable).where(eq(transactionsTable.status, "completed"));

  res.json({
    totalUsers: totalUsers.count,
    totalTransactions: totalTransactions.count,
    totalProducts: totalProducts.count,
    totalJobs: totalJobs.count,
    totalCourses: totalCourses.count,
    totalRevenue: revenue.total ?? 0,
    newUsersToday: newUsersToday.count,
    activeUsers: activeUsers.count,
  });
});

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const params = ListAdminUsersQueryParams.safeParse(req.query);
  const page = params.success ? (params.data.page ?? 1) : 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  let users;
  if (params.success && params.data.search) {
    users = await db.select().from(usersTable)
      .where(ilike(usersTable.email, `%${params.data.search}%`))
      .orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
  } else {
    users = await db.select().from(usersTable)
      .orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
  }

  res.json(users.map(u => ({
    id: u.id, firstName: u.firstName, lastName: u.lastName,
    email: u.email, phone: u.phone, country: u.country,
    avatarUrl: u.avatarUrl, bio: u.bio,
    role: u.role, status: u.status, createdAt: u.createdAt,
  })));
});

router.patch("/admin/users/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateUserStatusParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateUserStatusBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [user] = await db.update(usersTable)
    .set({ status: body.data.status })
    .where(eq(usersTable.id, params.data.id))
    .returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json({
    id: user.id, firstName: user.firstName, lastName: user.lastName,
    email: user.email, phone: user.phone, country: user.country,
    avatarUrl: user.avatarUrl, bio: user.bio,
    role: user.role, status: user.status, createdAt: user.createdAt,
  });
});

router.get("/admin/reports", requireAdmin, async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const sort = req.query.sort === "asc" ? "asc" : "desc";
  const status = typeof req.query.status === "string" && req.query.status !== "all"
    ? req.query.status : null;
  const limit = 20;
  const offset = (page - 1) * limit;

  const baseQuery = db
    .select({
      id: userReportsTable.id,
      reason: userReportsTable.reason,
      status: userReportsTable.status,
      createdAt: userReportsTable.createdAt,
      reporterId: userReportsTable.reporterId,
      reportedId: userReportsTable.reportedId,
    })
    .from(userReportsTable)
    .$dynamic();

  const withStatus = status
    ? baseQuery.where(eq(userReportsTable.status, status))
    : baseQuery;

  const ordered = sort === "asc"
    ? withStatus.orderBy(asc(userReportsTable.createdAt))
    : withStatus.orderBy(desc(userReportsTable.createdAt));

  const rows = await ordered.limit(limit).offset(offset);

  const reporterIds = [...new Set(rows.map(r => r.reporterId))];
  const reportedIds = [...new Set(rows.map(r => r.reportedId))];
  const allIds = [...new Set([...reporterIds, ...reportedIds])];

  let userMap: Record<number, { firstName: string; lastName: string; avatarUrl: string | null }> = {};
  if (allIds.length > 0) {
    const users = await db.select({
      id: usersTable.id,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      avatarUrl: usersTable.avatarUrl,
    }).from(usersTable).where(sql`${usersTable.id} = ANY(${allIds})`);
    for (const u of users) userMap[u.id] = u;
  }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(userReportsTable)
    .where(status ? eq(userReportsTable.status, status) : sql`1=1`);

  res.json({
    reports: rows.map(r => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      reporter: userMap[r.reporterId]
        ? { id: r.reporterId, firstName: userMap[r.reporterId].firstName, lastName: userMap[r.reporterId].lastName, avatarUrl: userMap[r.reporterId].avatarUrl }
        : { id: r.reporterId, firstName: "Utilisateur", lastName: `#${r.reporterId}`, avatarUrl: null },
      reported: userMap[r.reportedId]
        ? { id: r.reportedId, firstName: userMap[r.reportedId].firstName, lastName: userMap[r.reportedId].lastName, avatarUrl: userMap[r.reportedId].avatarUrl }
        : { id: r.reportedId, firstName: "Utilisateur", lastName: `#${r.reportedId}`, avatarUrl: null },
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.patch("/admin/reports/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const action = req.body?.action;
  if (action !== "reviewed" && action !== "dismissed") {
    res.status(400).json({ error: "action must be 'reviewed' or 'dismissed'" });
    return;
  }

  const [updated] = await db
    .update(userReportsTable)
    .set({ status: action })
    .where(eq(userReportsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Report not found" }); return; }

  res.json({ id: updated.id, status: updated.status });
});

export default router;
