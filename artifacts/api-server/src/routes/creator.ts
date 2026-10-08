import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  walletsTable, giftTransactionsTable, creatorWithdrawalsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { usersTable } from "@workspace/db/schema";

const router = Router();

// Conversion rate: 1 token = 5 XOF
const TOKEN_TO_XOF = 5;
// Minimum withdrawal: 5000 XOF = 1000 tokens
const MIN_WITHDRAW_TOKENS = 1000;

// GET /api/creator/wallet — token balance + XOF equivalent + today/month revenue
router.get("/creator/wallet", requireAuth, async (req, res) => {
  const userId = req.userId!;

  let [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId));
  if (!wallet) {
    [wallet] = await db.insert(walletsTable).values({ userId }).returning();
  }

  const tokenBalance = wallet.tokenBalance ?? 0;
  const xofBalance   = tokenBalance * TOKEN_TO_XOF;

  // Today and this month boundaries
  const now          = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ todayTokens }] = await db
    .select({ todayTokens: sql<number>`coalesce(sum(${giftTransactionsTable.tokenAmount})::int, 0)` })
    .from(giftTransactionsTable)
    .where(and(
      eq(giftTransactionsTable.receiverId, userId),
      gte(giftTransactionsTable.createdAt, startOfDay),
    ));

  const [{ monthTokens }] = await db
    .select({ monthTokens: sql<number>`coalesce(sum(${giftTransactionsTable.tokenAmount})::int, 0)` })
    .from(giftTransactionsTable)
    .where(and(
      eq(giftTransactionsTable.receiverId, userId),
      gte(giftTransactionsTable.createdAt, startOfMonth),
    ));

  res.json({
    tokenBalance,
    xofBalance,
    tokenToXof:    TOKEN_TO_XOF,
    minWithdrawTokens: MIN_WITHDRAW_TOKENS,
    revenueToday:  { tokens: todayTokens,  xof: todayTokens  * TOKEN_TO_XOF },
    revenueMonth:  { tokens: monthTokens,  xof: monthTokens  * TOKEN_TO_XOF },
  });
});

// GET /api/creator/top-donors — top 10 donors for this creator
router.get("/creator/top-donors", requireAuth, async (req, res) => {
  const userId = req.userId!;

  const donors = await db
    .select({
      senderId:    giftTransactionsTable.senderId,
      senderName:  giftTransactionsTable.senderName,
      totalTokens: sql<number>`sum(${giftTransactionsTable.tokenAmount})::int`,
      giftsCount:  sql<number>`count(*)::int`,
    })
    .from(giftTransactionsTable)
    .where(eq(giftTransactionsTable.receiverId, userId))
    .groupBy(giftTransactionsTable.senderId, giftTransactionsTable.senderName)
    .orderBy(desc(sql`sum(${giftTransactionsTable.tokenAmount})`))
    .limit(10);

  res.json(donors);
});

// POST /api/creator/withdraw — request withdrawal
const WithdrawBody = z.object({
  paymentMethod: z.enum(["orange", "mtn", "wave"]),
  paymentPhone:  z.string().min(6),
  tokensAmount:  z.number().int().positive(),
});

router.post("/creator/withdraw", requireAuth, async (req, res) => {
  const parsed = WithdrawBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Corps invalide" }); return; }
  const { paymentMethod, paymentPhone, tokensAmount } = parsed.data;
  const userId = req.userId!;

  if (tokensAmount < MIN_WITHDRAW_TOKENS) {
    res.status(400).json({
      error: `Le retrait minimum est de ${MIN_WITHDRAW_TOKENS} jetons (${(MIN_WITHDRAW_TOKENS * TOKEN_TO_XOF).toLocaleString("fr-FR")} XOF).`,
    });
    return;
  }

  // Debit + create withdrawal atomically; conditional update prevents concurrent overdraw
  let withdrawal;
  try {
    withdrawal = await db.transaction(async (trx) => {
      await trx.insert(walletsTable).values({ userId }).onConflictDoNothing();
      const debit = await trx.update(walletsTable)
        .set({ tokenBalance: sql`${walletsTable.tokenBalance} - ${tokensAmount}` })
        .where(and(eq(walletsTable.userId, userId), gte(walletsTable.tokenBalance, tokensAmount)))
        .returning({ id: walletsTable.id });
      if (debit.length === 0) throw new Error("INSUFFICIENT_TOKENS");

      const [w] = await trx.insert(creatorWithdrawalsTable).values({
        creatorId:     userId,
        tokensAmount,
        xofAmount:     tokensAmount * TOKEN_TO_XOF,
        status:        "pending",
        paymentMethod,
        paymentPhone,
      }).returning();
      return w;
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_TOKENS") {
      res.status(400).json({ error: "Solde de jetons insuffisant pour ce retrait." });
      return;
    }
    req.log.error({ err }, "Withdrawal failed");
    res.status(500).json({ error: "Erreur lors du retrait" });
    return;
  }

  res.status(201).json(withdrawal);
});

// GET /api/creator/withdrawals — withdrawal history
router.get("/creator/withdrawals", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const withdrawals = await db
    .select()
    .from(creatorWithdrawalsTable)
    .where(eq(creatorWithdrawalsTable.creatorId, userId))
    .orderBy(desc(creatorWithdrawalsTable.createdAt))
    .limit(50);
  res.json(withdrawals);
});

// GET /api/admin/withdrawals — list all withdrawals (admin only), optional ?status=
router.get("/admin/withdrawals", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé" }); return;
  }

  const statusFilter = req.query.status as string | undefined;
  const validStatuses = ["pending", "validated", "paid", "rejected"] as const;

  const rows = await db
    .select({
      id:            creatorWithdrawalsTable.id,
      creatorId:     creatorWithdrawalsTable.creatorId,
      creatorName:   sql<string>`${usersTable.firstName} || ' ' || ${usersTable.lastName}`,
      tokensAmount:  creatorWithdrawalsTable.tokensAmount,
      xofAmount:     creatorWithdrawalsTable.xofAmount,
      status:        creatorWithdrawalsTable.status,
      paymentMethod: creatorWithdrawalsTable.paymentMethod,
      paymentPhone:  creatorWithdrawalsTable.paymentPhone,
      adminNote:     creatorWithdrawalsTable.adminNote,
      createdAt:     creatorWithdrawalsTable.createdAt,
    })
    .from(creatorWithdrawalsTable)
    .leftJoin(usersTable, eq(usersTable.id, creatorWithdrawalsTable.creatorId))
    .where(
      statusFilter && validStatuses.includes(statusFilter as typeof validStatuses[number])
        ? eq(creatorWithdrawalsTable.status, statusFilter as typeof validStatuses[number])
        : undefined
    )
    .orderBy(desc(creatorWithdrawalsTable.createdAt))
    .limit(200);

  res.json(rows);
});

// PATCH /api/admin/withdrawals/:id — admin validate/reject
const AdminPatchBody = z.object({
  action:    z.enum(["validated", "paid", "rejected"]),
  adminNote: z.string().optional(),
});

router.patch("/admin/withdrawals/:id", requireAuth, async (req, res) => {
  // Check admin role
  const userId = req.userId!;
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Accès refusé" }); return;
  }

  const id     = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = AdminPatchBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Corps invalide" }); return; }
  const { action, adminNote } = parsed.data;

  const [withdrawal] = await db
    .select()
    .from(creatorWithdrawalsTable)
    .where(eq(creatorWithdrawalsTable.id, id));

  if (!withdrawal) { res.status(404).json({ error: "Retrait introuvable" }); return; }

  // If rejecting, refund tokens
  if (action === "rejected" && withdrawal.status === "pending") {
    await db.transaction(async (trx) => {
      await trx.update(walletsTable)
        .set({ tokenBalance: sql`${walletsTable.tokenBalance} + ${withdrawal.tokensAmount}` })
        .where(eq(walletsTable.userId, withdrawal.creatorId));
      await trx.update(creatorWithdrawalsTable)
        .set({ status: "rejected", adminNote: adminNote ?? null })
        .where(eq(creatorWithdrawalsTable.id, id));
    });
  } else {
    await db.update(creatorWithdrawalsTable)
      .set({ status: action, adminNote: adminNote ?? null })
      .where(eq(creatorWithdrawalsTable.id, id));
  }

  const [updated] = await db.select().from(creatorWithdrawalsTable).where(eq(creatorWithdrawalsTable.id, id));
  res.json(updated);
});

export default router;
