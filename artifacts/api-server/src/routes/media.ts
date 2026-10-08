/**
 * GET /api/media/*key
 * Proxy léger pour les fichiers R2 — résout le CORS Chrome/Firefox.
 * Utilise fetch() côté serveur (pas d'Origin header = R2 répond 200).
 */
import { Router } from "express";

const R2_PUBLIC = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const router = Router();

async function serveMedia(req: any, res: any, headOnly = false) {
  const key = req.params.key as string;
  if (!key || !R2_PUBLIC) { res.status(400).end(); return; }

  const origin = `${R2_PUBLIC}/${key}`;

  try {
    const upstream = await fetch(origin, { method: headOnly ? "HEAD" : "GET" });

    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/octet-stream");
    const len = upstream.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);

    if (headOnly) { res.status(200).end(); return; }

    const buf = await upstream.arrayBuffer();
    res.status(200).end(Buffer.from(buf));
  } catch (err: any) {
    console.error("[media proxy] fetch error:", err?.message);
    res.status(502).end();
  }
}

router.get("/api/media/*key",     (req, res) => serveMedia(req, res, false));
router.head("/api/media/*key",    (req, res) => serveMedia(req, res, true));
router.options("/api/media/*key", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.sendStatus(204);
});

export default router;
