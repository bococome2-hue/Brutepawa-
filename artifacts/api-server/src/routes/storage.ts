import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getUserQuota } from "../lib/storage";

const router = Router();

/**
 * GET /api/storage/stats
 * Returns the authenticated user's storage quota information.
 */
router.get("/storage/stats", requireAuth, async (req, res): Promise<void> => {
  try {
    const stats = await getUserQuota(req.userId!);
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "storage stats error");
    res.status(500).json({ error: "Erreur lors de la récupération des statistiques de stockage" });
  }
});

export default router;
