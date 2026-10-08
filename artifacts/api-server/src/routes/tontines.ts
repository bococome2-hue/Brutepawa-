import { Router } from "express";
import { db, tontinesTable, tontineMembersTable, contributionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateTontineBody, GetTontineParams, ContributeBody, ContributeParams, JoinTontineBody, JoinTontineParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { pushToUserDevice } from "./push";

const router = Router();

router.get("/tontines", requireAuth, async (req, res): Promise<void> => {
  // ?scope=open → return all tontines (for discovery)
  if (req.query.scope === "open") {
    const all = await db.select().from(tontinesTable);
    const result = await Promise.all(all.map(async t => {
      const members = await db.select().from(tontineMembersTable).where(eq(tontineMembersTable.tontineId, t.id));
      return { ...t, contributionAmount: Number(t.contributionAmount), membersCount: members.length };
    }));
    res.json(result);
    return;
  }

  // default → return only tontines the user belongs to
  const memberships = await db.select().from(tontineMembersTable).where(eq(tontineMembersTable.userId, req.userId!));
  const ids = memberships.map(m => m.tontineId);

  if (ids.length === 0) { res.json([]); return; }

  const tontines = await db.select().from(tontinesTable);
  const myTontines = tontines.filter(t => ids.includes(t.id));

  const membersCount = await Promise.all(myTontines.map(async t => {
    const members = await db.select().from(tontineMembersTable).where(eq(tontineMembersTable.tontineId, t.id));
    return { id: t.id, count: members.length };
  }));

  res.json(myTontines.map(t => ({
    ...t,
    contributionAmount: Number(t.contributionAmount),
    membersCount: membersCount.find(m => m.id === t.id)?.count ?? 0,
  })));
});

router.post("/tontines", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTontineBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [tontine] = await db.insert(tontinesTable).values({
    ...parsed.data,
    contributionAmount: String(parsed.data.contributionAmount),
    createdById: req.userId!,
  }).returning();

  await db.insert(tontineMembersTable).values({ tontineId: tontine.id, userId: req.userId!, turnOrder: 1 });

  res.status(201).json({ ...tontine, contributionAmount: Number(tontine.contributionAmount), membersCount: 1 });
});


router.get("/tontines/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTontineParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [tontine] = await db.select().from(tontinesTable).where(eq(tontinesTable.id, params.data.id));
  if (!tontine) { res.status(404).json({ error: "Tontine not found" }); return; }

  const members = await db.select().from(tontineMembersTable).where(eq(tontineMembersTable.tontineId, tontine.id));
  const contributions = await db.select().from(contributionsTable).where(eq(contributionsTable.tontineId, tontine.id));

  res.json({
    ...tontine,
    contributionAmount: Number(tontine.contributionAmount),
    members,
    contributions: contributions.map(c => ({ ...c, amount: Number(c.amount) })),
  });
});

router.post("/tontines/:id/contribute", requireAuth, async (req, res): Promise<void> => {
  const pParams = ContributeParams.safeParse({ id: Number(req.params.id) });
  const pBody = ContributeBody.safeParse(req.body);
  if (!pParams.success || !pBody.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [contrib] = await db.insert(contributionsTable).values({
    tontineId: pParams.data.id,
    userId: req.userId!,
    amount: String(pBody.data.amount),
    round: 1,
    status: "paid",
  }).returning();

  // Push au créateur de la tontine
  const [tontine] = await db.select({ name: tontinesTable.name, createdById: tontinesTable.createdById })
    .from(tontinesTable).where(eq(tontinesTable.id, pParams.data.id));
  const [contributor] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, req.userId!));
  if (tontine && tontine.createdById !== req.userId!) {
    const name = contributor ? `${contributor.firstName} ${contributor.lastName}`.trim() : "Un membre";
    pushToUserDevice(tontine.createdById, {
      title: `🤝 Nouvelle contribution — ${tontine.name}`,
      body: `${name} a cotisé ${Number(pBody.data.amount).toLocaleString("fr-FR")} XOF`,
      tag: `contrib-${contrib.id}`,
      data: { url: `/tontines/${pParams.data.id}` },
    }).catch(() => {});
  }

  res.status(201).json({ ...contrib, amount: Number(contrib.amount) });
});

router.post("/tontines/:id/members", requireAuth, async (req, res): Promise<void> => {
  const pParams = JoinTontineParams.safeParse({ id: Number(req.params.id) });
  const pBody = JoinTontineBody.safeParse(req.body);
  if (!pParams.success) { res.status(400).json({ error: "Invalid id" }); return; }

  const existing = await db.select().from(tontineMembersTable)
    .where(eq(tontineMembersTable.tontineId, pParams.data.id));

  const [member] = await db.insert(tontineMembersTable).values({
    tontineId: pParams.data.id,
    userId: req.userId!,
    turnOrder: existing.length + 1,
  }).returning();

  // Push au créateur : nouveau membre
  const [tontine] = await db.select({ name: tontinesTable.name, createdById: tontinesTable.createdById })
    .from(tontinesTable).where(eq(tontinesTable.id, pParams.data.id));
  const [joiner] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, req.userId!));
  if (tontine && tontine.createdById !== req.userId!) {
    const name = joiner ? `${joiner.firstName} ${joiner.lastName}`.trim() : "Quelqu'un";
    pushToUserDevice(tontine.createdById, {
      title: `👥 Nouveau membre — ${tontine.name}`,
      body: `${name} a rejoint votre tontine`,
      tag: `join-tontine-${pParams.data.id}-${req.userId}`,
      data: { url: `/tontines/${pParams.data.id}` },
    }).catch(() => {});
  }

  res.status(201).json(member);
});

export default router;
