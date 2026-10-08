import { Router, type IRouter } from "express";
import { z } from "zod";

const router: IRouter = Router();
const querySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
const catalogSchema = z.object({
  results: z.array(z.object({
    kind: z.string().optional(),
    trackId: z.number().optional(),
    trackName: z.string().optional(),
    artistName: z.string().optional(),
    previewUrl: z.string().optional(),
    artworkUrl100: z.string().optional(),
    trackTimeMillis: z.number().optional(),
    primaryGenreName: z.string().optional(),
  })),
});
type Track = {
  id: string; title: string; artist: string; duration: string; genre: string;
  previewUrl: string | null; artworkUrl: string | null;
};
const cache = new Map<string, { expires: number; tracks: Track[] }>();

router.get("/music/search", async (req, res): Promise<void> => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Recherche musicale invalide." });
    return;
  }
  const { q, limit } = parsed.data;
  const key = `${q.toLowerCase()}:${limit}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    res.json({ tracks: cached.tracks });
    return;
  }
  try {
    const params = new URLSearchParams({
      term: q, entity: "song", media: "music", limit: String(limit),
    });
    const upstream = await fetch(`https://itunes.apple.com/search?${params}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) {
      req.log.warn({ statusCode: upstream.status }, "Music catalog request failed");
      res.status(502).json({ error: "Le catalogue musical est temporairement indisponible." });
      return;
    }
    const catalog = catalogSchema.parse(await upstream.json());
    const tracks: Track[] = catalog.results
      .filter(r => r.kind === "song" && r.trackId && r.trackName && r.previewUrl)
      .map(r => {
        const seconds = Math.floor((r.trackTimeMillis ?? 0) / 1000);
        return {
          id: String(r.trackId), title: r.trackName!, artist: r.artistName ?? "Artiste inconnu",
          duration: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
          genre: r.primaryGenreName ?? "Musique",
          previewUrl: r.previewUrl ?? null, artworkUrl: r.artworkUrl100 ?? null,
        };
      });
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { tracks, expires: Date.now() + 5 * 60_000 });
    res.json({ tracks });
  } catch (err) {
    req.log.warn({ err }, "Music catalog unavailable");
    res.status(502).json({ error: "Impossible de charger la musique. Réessayez dans un instant." });
  }
});

export default router;
