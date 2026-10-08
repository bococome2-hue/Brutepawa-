import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const ALLOWED_THEMES  = ["light", "dark", "system"] as const;
const ALLOWED_COLORS  = ["#22C55E","#3B82F6","#EF4444","#8B5CF6","#F97316","#EC4899"] as const;
const ALLOWED_SIZES   = ["small","medium","large"] as const;

/* ── GET /api/preferences ─────────────────────────────────── */
router.get("/preferences", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const [row] = await db
    .select()
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId));

  if (!row) {
    res.json({ theme: "system", primaryColor: "#22C55E", fontSize: "medium" });
    return;
  }
  res.json({ theme: row.theme, primaryColor: row.primaryColor, fontSize: row.fontSize });
});

/* ── PUT /api/preferences ─────────────────────────────────── */
router.put("/preferences", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { theme, primaryColor, fontSize } = req.body ?? {};

  if (theme      && !ALLOWED_THEMES.includes(theme))        { res.status(400).json({ error: "Thème invalide" });         return; }
  if (primaryColor && !ALLOWED_COLORS.includes(primaryColor)) { res.status(400).json({ error: "Couleur non autorisée" });  return; }
  if (fontSize   && !ALLOWED_SIZES.includes(fontSize))      { res.status(400).json({ error: "Taille invalide" });        return; }

  const [existing] = await db
    .select({ id: userPreferencesTable.id })
    .from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, userId));

  if (existing) {
    const [updated] = await db
      .update(userPreferencesTable)
      .set({
        ...(theme        ? { theme }        : {}),
        ...(primaryColor ? { primaryColor } : {}),
        ...(fontSize     ? { fontSize }     : {}),
      })
      .where(eq(userPreferencesTable.userId, userId))
      .returning();
    res.json({ theme: updated.theme, primaryColor: updated.primaryColor, fontSize: updated.fontSize });
  } else {
    const [inserted] = await db
      .insert(userPreferencesTable)
      .values({ userId, theme: theme ?? "system", primaryColor: primaryColor ?? "#22C55E", fontSize: fontSize ?? "medium" })
      .returning();
    res.json({ theme: inserted.theme, primaryColor: inserted.primaryColor, fontSize: inserted.fontSize });
  }
});

export default router;
