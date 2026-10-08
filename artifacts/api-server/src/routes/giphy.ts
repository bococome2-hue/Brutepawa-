import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const QuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  type: z.enum(["gifs", "stickers"]).optional().default("gifs"),
  limit: z.coerce.number().int().min(1).max(30).optional().default(18),
});

router.get("/giphy", requireAuth, async (req, res): Promise<void> => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Paramètres GIPHY invalides" });
    return;
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "GIPHY n'est pas configuré" });
    return;
  }

  const { q, type, limit } = parsed.data;
  const endpoint = q ? "search" : "trending";
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(limit),
    rating: "pg-13",
    lang: "fr",
  });
  if (q) params.set("q", q);

  try {
    const response = await fetch(`https://api.giphy.com/v1/${type}/${endpoint}?${params}`);
    if (!response.ok) {
      req.log.warn({ statusCode: response.status }, "GIPHY request failed");
      res.status(502).json({ error: "GIPHY est temporairement indisponible" });
      return;
    }

    const payload = await response.json() as {
      data?: Array<{
        id: string;
        title?: string;
        images?: {
          fixed_width_small?: { url?: string; webp?: string };
          fixed_width?: { url?: string; webp?: string };
          original?: { url?: string; webp?: string };
        };
      }>;
    };

    const items = (payload.data ?? []).flatMap(item => {
      const previewUrl = item.images?.fixed_width_small?.webp
        ?? item.images?.fixed_width?.webp
        ?? item.images?.fixed_width?.url;
      const url = item.images?.original?.webp ?? item.images?.original?.url;
      return previewUrl && url ? [{ id: item.id, title: item.title ?? "", previewUrl, url }] : [];
    });
    res.json({ items });
  } catch (error) {
    req.log.error({ err: error }, "GIPHY request error");
    res.status(502).json({ error: "Impossible de joindre GIPHY" });
  }
});

export default router;