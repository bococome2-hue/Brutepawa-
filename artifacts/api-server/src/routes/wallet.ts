import { Router } from "express";
import { db, walletsTable, transactionsTable, usersTable } from "@workspace/db";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { TransferBody, DepositBody, ListTransactionsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { pushToUserDevice } from "./push";

const router = Router();

router.get("/wallet", requireAuth, async (req, res): Promise<void> => {
  let [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (!wallet) {
    const [w] = await db.insert(walletsTable).values({ userId: req.userId! }).returning();
    wallet = w;
  }
  res.json({ ...wallet, balance: Number(wallet.balance) });
});

router.get("/wallet/stats", requireAuth, async (req, res): Promise<void> => {
  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  const balance = wallet ? Number(wallet.balance) : 0;

  const txs = await db.select().from(transactionsTable)
    .where(or(eq(transactionsTable.fromUserId, req.userId!), eq(transactionsTable.toUserId, req.userId!)));

  const totalIncome = txs
    .filter(t => t.toUserId === req.userId && t.status === "completed")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = txs
    .filter(t => t.fromUserId === req.userId && t.status === "completed")
    .reduce((s, t) => s + Number(t.amount), 0);

  res.json({ balance, totalIncome, totalExpenses, transactionsCount: txs.length, currency: wallet?.currency ?? "XOF" });
});

router.get("/wallet/transactions", requireAuth, async (req, res): Promise<void> => {
  const params = ListTransactionsQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 20) : 20;
  const page = params.success ? (params.data.page ?? 1) : 1;
  const offset = (page - 1) * limit;

  const txs = await db.select().from(transactionsTable)
    .where(or(eq(transactionsTable.fromUserId, req.userId!), eq(transactionsTable.toUserId, req.userId!)))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(txs.map(t => ({ ...t, amount: Number(t.amount) })));
});

router.post("/wallet/transfer", requireAuth, async (req, res): Promise<void> => {
  const parsed = TransferBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { toUserId, amount, currency, description } = parsed.data;

  const [fromWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (!fromWallet || Number(fromWallet.balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" }); return;
  }

  await db.update(walletsTable).set({ balance: String(Number(fromWallet.balance) - amount) }).where(eq(walletsTable.userId, req.userId!));

  const [toWallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, toUserId));
  if (toWallet) {
    await db.update(walletsTable).set({ balance: String(Number(toWallet.balance) + amount) }).where(eq(walletsTable.userId, toUserId));
  }

  const [tx] = await db.insert(transactionsTable).values({
    type: "transfer", amount: String(amount), currency, status: "completed",
    description: description ?? null, fromUserId: req.userId!, toUserId,
  }).returning();

  // Push au destinataire
  const [sender] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable).where(eq(usersTable.id, req.userId!));
  const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : "Quelqu'un";
  pushToUserDevice(toUserId, {
    title: `💸 Virement reçu de ${senderName}`,
    body: `${amount.toLocaleString("fr-FR")} ${currency}${description ? ` — ${description}` : ""}`,
    tag: `transfer-${tx.id}`,
    data: { url: "/wallet" },
  }).catch(() => {});

  res.status(201).json({ ...tx, amount: Number(tx.amount) });
});

router.post("/wallet/deposit", requireAuth, async (req, res): Promise<void> => {
  const parsed = DepositBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { amount, currency, operator, phone } = parsed.data;

  let [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.userId!));
  if (!wallet) {
    const [w] = await db.insert(walletsTable).values({ userId: req.userId! }).returning();
    wallet = w;
  }
  await db.update(walletsTable).set({ balance: String(Number(wallet.balance) + amount) }).where(eq(walletsTable.userId, req.userId!));

  const [tx] = await db.insert(transactionsTable).values({
    type: "deposit", amount: String(amount), currency, status: "completed",
    description: `Dépôt via ${operator.toUpperCase()} - ${phone}`,
    toUserId: req.userId!,
  }).returning();

  // Push de confirmation au déposant
  pushToUserDevice(req.userId!, {
    title: "✅ Dépôt confirmé",
    body: `${amount.toLocaleString("fr-FR")} ${currency} ajoutés via ${operator.toUpperCase()}`,
    tag: `deposit-${tx.id}`,
    data: { url: "/wallet" },
  }).catch(() => {});

  res.status(201).json({ ...tx, amount: Number(tx.amount) });
});

export default router;
