import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { db, usersTable, walletsTable, withDbRetry } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { signToken } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
});

router.post("/auth/register", authLimiter, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { firstName, lastName, email, phone, password, country } = parsed.data;

  let existing: typeof usersTable.$inferSelect | undefined;
  try {
    existing = await withDbRetry(() =>
      db.select().from(usersTable).where(eq(usersTable.email, email)).then((r) => r[0])
    );
  } catch (dbErr: unknown) {
    const cause = (dbErr as any)?.cause;
    const causeMsg = cause instanceof Error ? cause.message : String(cause ?? "");
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    const fullMsg = causeMsg ? `${msg} | CAUSE: ${causeMsg} | CODE: ${(cause as any)?.code ?? "?"}` : msg;
    req.log.error({ err: dbErr, cause: causeMsg, code: (cause as any)?.code }, "DB error on register lookup");
    res.status(503).json({ error: "Service temporairement indisponible, réessayez dans quelques secondes." });
    return;
  }

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let user: typeof usersTable.$inferSelect;
  try {
    user = await withDbRetry(() => db.transaction(async (tx) => {
      const [u] = await tx.insert(usersTable).values({
        firstName, lastName, email, phone, passwordHash, country,
      }).returning();
      await tx.insert(walletsTable).values({ userId: u.id });
      return u;
    }));
  } catch (dbErr: unknown) {
    req.log.error({ err: dbErr }, "DB error on register insert");
    res.status(503).json({ error: "Service temporairement indisponible, réessayez dans quelques secondes." });
    return;
  }

  const token = signToken(user.id, user.role);
  res.status(201).json({
    token,
    user: {
      id: user.id, firstName: user.firstName, lastName: user.lastName,
      email: user.email, phone: user.phone, country: user.country,
      avatarUrl: user.avatarUrl, coverUrl: user.coverUrl, bio: user.bio,
      role: user.role, status: user.status, createdAt: user.createdAt,
    },
  });
});

router.post("/auth/login", authLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const user = await withDbRetry(() =>
    db.select().from(usersTable).where(eq(usersTable.email, email)).then((r) => r[0])
  );
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id, user.role);
  res.json({
    token,
    user: {
      id: user.id, firstName: user.firstName, lastName: user.lastName,
      email: user.email, phone: user.phone, country: user.country,
      avatarUrl: user.avatarUrl, coverUrl: user.coverUrl, bio: user.bio,
      role: user.role, status: user.status, createdAt: user.createdAt,
    },
  });
});

export default router;
