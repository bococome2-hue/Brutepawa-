import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

/** In-memory OTP store: userId → { code, expiresAt } */
const otpStore = new Map<number, { code: string; expiresAt: number }>();

const RECOVERY_DAYS = 30; // single source of truth

function genOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** GET /account/deletion/config — expose recovery period to frontend */
router.get("/account/deletion/config", requireAuth, (_req, res) => {
  res.json({ recoveryDays: RECOVERY_DAYS });
});

/** POST /account/deletion/request — send OTP and schedule deletion */
router.post("/account/deletion/request", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const code = genOtp();
  otpStore.set(userId, { code, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min

  // In production, send by email/SMS. For now, log it.
  console.log(`[ACCOUNT DELETION] OTP for user ${userId} (${user.email}): ${code}`);

  // Mask the email for display
  const parts = user.email.split("@");
  const masked = parts[0].slice(0, 2) + "•".repeat(Math.max(2, parts[0].length - 2)) + "@" + parts[1];

  res.json({ ok: true, maskedEmail: masked, recoveryDays: RECOVERY_DAYS });
});

/** POST /account/deletion/verify — verify OTP and schedule the deletion */
router.post("/account/deletion/verify", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { code } = req.body as { code?: string };

  const entry = otpStore.get(userId);
  if (!entry || Date.now() > entry.expiresAt) {
    res.status(400).json({ error: "Code expiré ou invalide. Veuillez recommencer." });
    return;
  }
  if (entry.code !== String(code ?? "").trim()) {
    res.status(400).json({ error: "Code incorrect." });
    return;
  }

  otpStore.delete(userId);

  const requestedAt = new Date();
  const scheduledAt = new Date(requestedAt.getTime() + RECOVERY_DAYS * 24 * 60 * 60 * 1000);

  await db.update(usersTable)
    .set({
      status: "pending_deletion",
      // @ts-ignore — columns added by migration, not yet in TS type
      deletion_requested_at: requestedAt,
      scheduled_deletion_at: scheduledAt,
    })
    .where(eq(usersTable.id, userId));

  res.json({
    ok: true,
    requestedAt: requestedAt.toISOString(),
    scheduledAt: scheduledAt.toISOString(),
    recoveryDays: RECOVERY_DAYS,
  });
});

/** DELETE /account/deletion — cancel the scheduled deletion */
router.delete("/account/deletion", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  await db.update(usersTable)
    .set({
      status: "active",
      // @ts-ignore
      deletion_requested_at: null,
      scheduled_deletion_at: null,
    })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

export default router;
