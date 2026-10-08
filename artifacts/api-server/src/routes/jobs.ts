import { Router } from "express";
import { db, jobsTable, applicationsTable } from "@workspace/db";
import { eq, ilike, and, desc } from "drizzle-orm";
import { CreateJobBody, GetJobParams, ApplyToJobParams, ApplyToJobBody, ListJobsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function fmtJob(j: typeof jobsTable.$inferSelect) {
  return { ...j, salary: j.salary != null ? Number(j.salary) : null };
}

router.get("/jobs", requireAuth, async (req, res): Promise<void> => {
  const params = ListJobsQueryParams.safeParse(req.query);
  const country = typeof req.query.country === "string" && req.query.country.trim()
    ? req.query.country.trim()
    : null;
  const conditions = [eq(jobsTable.status, "open")];
  if (params.success && params.data.type) conditions.push(eq(jobsTable.type, params.data.type));
  if (params.success && params.data.search) conditions.push(ilike(jobsTable.title, `%${params.data.search}%`));
  if (params.success && params.data.location) conditions.push(ilike(jobsTable.location, `%${params.data.location}%`));
  if (country) conditions.push(ilike(jobsTable.location, `%${country}%`));

  const jobs = await db.select().from(jobsTable).where(and(...conditions)).orderBy(desc(jobsTable.createdAt)).limit(50);
  res.json(jobs.map(fmtJob));
});

router.post("/jobs", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [job] = await db.insert(jobsTable).values({
    ...parsed.data,
    salary: parsed.data.salary != null ? String(parsed.data.salary) : null,
    postedById: req.userId!,
  }).returning();
  res.status(201).json(fmtJob(job));
});

router.get("/jobs/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(fmtJob(job));
});

router.post("/jobs/:id/apply", requireAuth, async (req, res): Promise<void> => {
  const pParams = ApplyToJobParams.safeParse({ id: Number(req.params.id) });
  const pBody = ApplyToJobBody.safeParse(req.body);
  if (!pParams.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const [app] = await db.insert(applicationsTable).values({
    jobId: pParams.data.id,
    applicantId: req.userId!,
    coverLetter: pBody.success ? (pBody.data.coverLetter ?? null) : null,
    cvUrl: pBody.success ? (pBody.data.cvUrl ?? null) : null,
  }).returning();
  res.status(201).json(app);
});

router.get("/applications", requireAuth, async (req, res): Promise<void> => {
  const apps = await db.select().from(applicationsTable)
    .where(eq(applicationsTable.applicantId, req.userId!))
    .orderBy(desc(applicationsTable.createdAt));
  res.json(apps);
});

export default router;
