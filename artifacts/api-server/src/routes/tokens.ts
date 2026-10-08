import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { tokenPurchasesTable, walletsTable } from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import crypto from "crypto";

const router = Router();

// Token packs available for purchase
const TOKEN_PACKS: Record<string, { tokens: number; xof: number }> = {
  pack_100:  { tokens: 100,  xof: 500   },
  pack_500:  { tokens: 500,  xof: 2500  },
  pack_2000: { tokens: 2000, xof: 10000 },
};

const PurchaseBody = z.object({
  packId:        z.enum(["pack_100", "pack_500", "pack_2000"]),
  paymentMethod: z.enum(["orange", "mtn", "wave"]),
  paymentPhone:  z.string().min(6),
});

// POST /api/tokens/purchase — creates pending purchase + returns payment instructions
router.post("/tokens/purchase", requireAuth, async (req, res) => {
  const parsed = PurchaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Corps invalide" }); return; }
  const { packId, paymentMethod, paymentPhone } = parsed.data;
  const pack   = TOKEN_PACKS[packId];
  const userId = req.userId!;

  // Generate a unique payment reference
  const paymentRef = `BP-${Date.now()}-${userId}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const [purchase] = await db.insert(tokenPurchasesTable).values({
    userId,
    tokens:        pack.tokens,
    amountXof:     pack.xof,
    paymentMethod,
    paymentPhone,
    paymentRef,
    status:        "pending",
  }).returning();

  // Return simulated MoneyFusion payment instructions
  const operatorNames: Record<string, string> = {
    orange: "Orange Money",
    mtn:    "MTN Mobile Money",
    wave:   "Wave",
  };

  res.status(201).json({
    purchaseId:   purchase.id,
    paymentRef,
    status:       "pending",
    instructions: {
      operator:  operatorNames[paymentMethod],
      phone:     paymentPhone,
      amount:    `${pack.xof.toLocaleString("fr-FR")} XOF`,
      reference: paymentRef,
      message:   `Effectue un paiement de ${pack.xof.toLocaleString("fr-FR")} FCFA via ${operatorNames[paymentMethod]} au +225 07 00 00 00 00 avec la référence : ${paymentRef}. Tes ${pack.tokens} jetons seront crédités après confirmation.`,
    },
    tokens:    pack.tokens,
    amountXof: pack.xof,
  });
});

// GET /api/tokens/purchases/:id — poll purchase status (owner only)
router.get("/tokens/purchases/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [purchase] = await db.select().from(tokenPurchasesTable).where(eq(tokenPurchasesTable.id, id));
  if (!purchase || purchase.userId !== req.userId!) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: purchase.id, status: purchase.status, tokens: purchase.tokens, amountXof: purchase.amountXof });
});

// POST /api/tokens/webhook — MoneyFusion confirmation (HMAC-verified)
// In dev/test: pass { purchaseId, status: "confirmed" } with header X-MF-Signature
router.post("/tokens/webhook", async (req, res) => {
  const secret  = process.env["MONEYFUSION_SECRET"] ?? "";
  const isDev   = process.env["NODE_ENV"] === "development";

  // Fail-closed: reject if secret is absent outside of development
  if (!secret && !isDev) {
    res.status(503).json({ error: "Webhook not configured: MONEYFUSION_SECRET required in production" });
    return;
  }

  if (secret) {
    const sig  = req.headers["x-mf-signature"] as string | undefined;
    const body = JSON.stringify(req.body);
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    if (!sig || sig !== expected) {
      res.status(401).json({ error: "Invalid signature" }); return;
    }
  }

  const { purchaseId, status } = req.body as { purchaseId?: number; status?: string };
  if (!purchaseId || !status) {
    res.status(400).json({ error: "purchaseId and status are required" }); return;
  }
  if (status !== "confirmed" && status !== "failed") {
    res.status(400).json({ error: "status must be confirmed or failed" }); return;
  }

  const [purchase] = await db.select().from(tokenPurchasesTable).where(eq(tokenPurchasesTable.id, purchaseId));
  if (!purchase) { res.status(404).json({ error: "Purchase not found" }); return; }

  // Atomic: status transition + credit in one transaction; conditional WHERE status='pending' prevents double-credit
  try {
    await db.transaction(async (trx) => {
      const updated = await trx.update(tokenPurchasesTable)
        .set({ status: status as "confirmed" | "failed" })
        .where(and(eq(tokenPurchasesTable.id, purchaseId), eq(tokenPurchasesTable.status, "pending")))
        .returning();
      if (updated.length === 0) throw new Error("ALREADY_PROCESSED");

      if (status === "confirmed") {
        await trx.insert(walletsTable).values({ userId: updated[0].userId }).onConflictDoNothing();
        await trx.update(walletsTable)
          .set({ tokenBalance: sql`${walletsTable.tokenBalance} + ${updated[0].tokens}` })
          .where(eq(walletsTable.userId, updated[0].userId));
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_PROCESSED") {
      res.status(409).json({ error: "Purchase already processed" }); return;
    }
    throw err;
  }

  res.json({ ok: true });
});

export default router;
