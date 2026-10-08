import { Router } from "express";
import { db, coursesTable, lessonsTable, enrollmentsTable } from "@workspace/db";
import { eq, ilike, and, desc, sql } from "drizzle-orm";
import { GetCourseParams, EnrollCourseParams, EnrollCourseBody, ListCoursesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function fmtCourse(c: typeof coursesTable.$inferSelect, count = 0) {
  return { ...c, price: c.price != null ? Number(c.price) : null, enrollmentsCount: count };
}

router.get("/courses/featured", requireAuth, async (req, res): Promise<void> => {
  const courses = await db.select().from(coursesTable).orderBy(desc(coursesTable.createdAt)).limit(6);
  res.json(courses.map(c => fmtCourse(c)));
});

router.get("/courses", requireAuth, async (req, res): Promise<void> => {
  const params = ListCoursesQueryParams.safeParse(req.query);
  const conditions: ReturnType<typeof eq>[] = [];
  if (params.success && params.data.category) conditions.push(eq(coursesTable.category, params.data.category));
  if (params.success && params.data.level) conditions.push(eq(coursesTable.level, params.data.level));

  const courses = conditions.length > 0
    ? await db.select().from(coursesTable).where(and(...conditions)).orderBy(desc(coursesTable.createdAt)).limit(50)
    : await db.select().from(coursesTable).orderBy(desc(coursesTable.createdAt)).limit(50);

  const enrollCounts = await db.select({
    courseId: enrollmentsTable.courseId,
    count: sql<number>`count(*)::int`,
  }).from(enrollmentsTable).groupBy(enrollmentsTable.courseId);

  res.json(courses.map(c => {
    const ec = enrollCounts.find(e => e.courseId === c.id);
    return fmtCourse(c, ec?.count ?? 0);
  }));
});

router.get("/courses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetCourseParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, params.data.id));
  if (!course) { res.status(404).json({ error: "Course not found" }); return; }

  const lessons = await db.select().from(lessonsTable)
    .where(eq(lessonsTable.courseId, course.id))
    .orderBy(lessonsTable.order);

  const [enrollCount] = await db.select({ count: sql<number>`count(*)::int` })
    .from(enrollmentsTable).where(eq(enrollmentsTable.courseId, course.id));

  res.json({ ...fmtCourse(course, enrollCount?.count ?? 0), lessons });
});

router.post("/courses/:id/enroll", requireAuth, async (req, res): Promise<void> => {
  const params = EnrollCourseParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [enrollment] = await db.insert(enrollmentsTable).values({
    courseId: params.data.id,
    userId: req.userId!,
  }).returning();
  res.status(201).json(enrollment);
});

router.post("/courses", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { title, description, price, level, category } = req.body as {
    title?: string; description?: string; price?: number;
    level?: string; category?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "title required" }); return; }

  const [course] = await db.insert(coursesTable).values({
    title: title.trim(),
    description: description?.trim() ?? null,
    price: price != null ? String(price) : null,
    isFree: !price || price === 0,
    level: (level as any) ?? "beginner",
    category: category ?? "general",
    instructorId: userId,
    duration: 0,
  }).returning();

  res.status(201).json(fmtCourse(course));
});

router.get("/enrollments", requireAuth, async (req, res): Promise<void> => {
  const enrollments = await db.select().from(enrollmentsTable)
    .where(eq(enrollmentsTable.userId, req.userId!))
    .orderBy(desc(enrollmentsTable.enrolledAt));
  res.json(enrollments);
});

router.patch("/enrollments/:courseId", requireAuth, async (req, res): Promise<void> => {
  const courseId = Number(req.params.courseId);
  if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }
  const { progress } = req.body as { progress?: number };
  if (typeof progress !== "number") { res.status(400).json({ error: "progress required" }); return; }

  await db.update(enrollmentsTable)
    .set({ progress: Math.min(100, Math.max(0, Math.round(progress))) })
    .where(and(eq(enrollmentsTable.courseId, courseId), eq(enrollmentsTable.userId, req.userId!)));
  res.sendStatus(204);
});

export default router;
