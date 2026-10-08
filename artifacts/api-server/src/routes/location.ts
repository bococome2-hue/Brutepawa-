/**
 * @module location
 * Location module — search, GPS reverse-geocode, saved/recent locations
 *
 * Endpoints:
 *   GET  /location/search         – full-text search
 *   GET  /location/popular        – ordered by usage_count
 *   GET  /location/recent         – current user's recently used
 *   GET  /location/saved          – current user's favourites
 *   POST /location/current        – reverse-geocode lat/lng (via Nominatim)
 *   POST /location/save           – add to user_saved_locations
 *   DELETE /location/save/:id     – remove from user_saved_locations
 */
import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { sql, eq, and, ilike, desc, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

/* ── In-memory cache (60 s TTL for popular list) ──────────────────────────── */
const cache = new Map<string, { data: unknown; ts: number }>();
const cached = <T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return Promise.resolve(hit.data as T);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
};

/* ── Type helpers ─────────────────────────────────────────────────────────── */
interface LocationRow {
  id: number | bigint;
  name: string;
  city: string | null;
  region: string | null;
  country: string;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  placeType: string;
}

function fmtLoc(r: LocationRow) {
  return {
    id: Number(r.id),
    name: r.name,
    city: r.city ?? null,
    region: r.region ?? null,
    country: r.country,
    countryCode: r.countryCode,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    placeType: r.placeType,
    display: [r.name, r.region, r.country].filter(Boolean).join(", "),
    flag: countryFlag(r.countryCode),
  };
}

const FLAGS: Record<string, string> = {
  BJ: "🇧🇯", CI: "🇨🇮", SN: "🇸🇳", ML: "🇲🇱", TG: "🇹🇬",
  GN: "🇬🇳", NE: "🇳🇪", BF: "🇧🇫", CM: "🇨🇲", NG: "🇳🇬",
  GH: "🇬🇭", MA: "🇲🇦", FR: "🇫🇷", CA: "🇨🇦", US: "🇺🇸",
};
function countryFlag(code: string): string { return FLAGS[code] ?? "📍"; }

/* ── GET /location/search ─────────────────────────────────────────────────── */
const SearchSchema = z.object({
  q:     z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

router.get("/location/search", requireAuth, async (req, res): Promise<void> => {
  const parsed = SearchSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "q est requis" }); return; }
  const { q, limit } = parsed.data;

  try {
    const rows = await db.execute(sql`
      SELECT id, name, city, region, country, country_code, lat, lng, place_type
      FROM   locations
      WHERE  lower(name)   ILIKE ${`%${q.toLowerCase()}%`}
          OR lower(city)   ILIKE ${`%${q.toLowerCase()}%`}
          OR lower(region) ILIKE ${`%${q.toLowerCase()}%`}
      ORDER  BY
        CASE WHEN lower(name) ILIKE ${`${q.toLowerCase()}%`} THEN 0 ELSE 1 END,
        usage_count DESC
      LIMIT  ${limit}
    `);

    res.json((rows.rows as Array<{
      id: number | bigint; name: string; city: string | null;
      region: string | null; country: string; country_code: string;
      lat: number | null; lng: number | null; place_type: string;
    }>).map(r => fmtLoc({
      id: r.id, name: r.name, city: r.city, region: r.region,
      country: r.country, countryCode: r.country_code,
      lat: r.lat, lng: r.lng, placeType: r.place_type,
    })));
  } catch {
    res.status(500).json({ error: "Erreur lors de la recherche" });
  }
});

/* ── GET /location/popular ────────────────────────────────────────────────── */
const PopularSchema = z.object({
  country: z.string().length(2).toUpperCase().optional(),
  limit:   z.coerce.number().int().min(1).max(50).default(10),
});

router.get("/location/popular", requireAuth, async (req, res): Promise<void> => {
  const parsed = PopularSchema.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { country, limit } = parsed.data;

  const cacheKey = `popular:${country ?? "ALL"}:${limit}`;
  try {
    const data = await cached(cacheKey, 60_000, async () => {
      const rows = await db.execute(sql`
        SELECT id, name, city, region, country, country_code, lat, lng, place_type
        FROM   locations
        ${country ? sql`WHERE country_code = ${country}` : sql``}
        ORDER  BY usage_count DESC
        LIMIT  ${limit}
      `);
      return (rows.rows as Array<{
        id: number | bigint; name: string; city: string | null;
        region: string | null; country: string; country_code: string;
        lat: number | null; lng: number | null; place_type: string;
      }>).map(r => fmtLoc({
        id: r.id, name: r.name, city: r.city, region: r.region,
        country: r.country, countryCode: r.country_code,
        lat: r.lat, lng: r.lng, placeType: r.place_type,
      }));
    });
    res.json(data);
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});

/* ── GET /location/recent ─────────────────────────────────────────────────── */
router.get("/location/recent", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT l.id, l.name, l.city, l.region, l.country, l.country_code, l.lat, l.lng, l.place_type
      FROM   user_recent_locations url
      JOIN   locations l ON l.id = url.location_id
      WHERE  url.user_id = ${req.userId}
      ORDER  BY url.used_at DESC
      LIMIT  10
    `);
    res.json((rows.rows as Array<{
      id: number | bigint; name: string; city: string | null;
      region: string | null; country: string; country_code: string;
      lat: number | null; lng: number | null; place_type: string;
    }>).map(r => fmtLoc({
      id: r.id, name: r.name, city: r.city, region: r.region,
      country: r.country, countryCode: r.country_code,
      lat: r.lat, lng: r.lng, placeType: r.place_type,
    })));
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});

/* ── GET /location/saved ──────────────────────────────────────────────────── */
router.get("/location/saved", requireAuth, async (req, res): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT usl.id as saved_id, usl.label, usl.icon,
             l.id, l.name, l.city, l.region, l.country, l.country_code, l.lat, l.lng, l.place_type
      FROM   user_saved_locations usl
      JOIN   locations l ON l.id = usl.location_id
      WHERE  usl.user_id = ${req.userId}
      ORDER  BY usl.created_at DESC
    `);
    res.json((rows.rows as Array<{
      saved_id: number | bigint; label: string | null; icon: string | null;
      id: number | bigint; name: string; city: string | null;
      region: string | null; country: string; country_code: string;
      lat: number | null; lng: number | null; place_type: string;
    }>).map(r => ({
      savedId: Number(r.saved_id),
      label: r.label ?? null,
      icon: r.icon ?? "📍",
      ...fmtLoc({
        id: r.id, name: r.name, city: r.city, region: r.region,
        country: r.country, countryCode: r.country_code,
        lat: r.lat, lng: r.lng, placeType: r.place_type,
      }),
    })));
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});

/* ── POST /location/current — reverse geocode via Nominatim ──────────────── */
const CurrentSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

router.post("/location/current", requireAuth, async (req, res): Promise<void> => {
  const parsed = CurrentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "lat et lng requis" }); return; }
  const { lat, lng } = parsed.data;

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
      { headers: { "User-Agent": "BrutePawa/1.0" } }
    );
    const data = await r.json() as { address?: Record<string, string>; display_name?: string };
    const addr = data.address ?? {};
    const name  = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "Position";
    const region = addr.state ?? addr.county ?? "";
    const country = addr.country ?? "Bénin";
    const countryCode = (addr.country_code ?? "bj").toUpperCase();
    const neighborhood = addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? "";

    res.json({ name, city: name, region, country, countryCode, lat, lng, neighborhood, flag: countryFlag(countryCode), display: [name, region, country].filter(Boolean).join(", ") });
  } catch {
    res.status(503).json({ error: "Service de géolocalisation indisponible" });
  }
});

/* ── POST /location/save ──────────────────────────────────────────────────── */
const SaveSchema = z.object({
  locationId: z.number().int().positive().optional(),
  name:       z.string().min(1).max(200).optional(),
  city:       z.string().max(200).optional(),
  region:     z.string().max(200).optional(),
  country:    z.string().min(1).max(200).default("Bénin"),
  countryCode:z.string().min(2).max(10).default("BJ"),
  lat:        z.number().optional(),
  lng:        z.number().optional(),
  placeType:  z.string().optional(),
  label:      z.string().max(100).optional(),
  icon:       z.string().max(10).optional(),
});

router.post("/location/save", requireAuth, async (req, res): Promise<void> => {
  const parsed = SaveSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const body = parsed.data;

  try {
    let locId = body.locationId;

    if (!locId) {
      if (!body.name) { res.status(400).json({ error: "name ou locationId requis" }); return; }
      const existing = await db.execute(sql`
        SELECT id FROM locations
        WHERE lower(name) = ${body.name.toLowerCase()}
          AND country_code = ${body.countryCode}
        LIMIT 1
      `);
      if ((existing.rows as Array<{ id: number | bigint }>).length > 0) {
        locId = Number((existing.rows as Array<{ id: number | bigint }>)[0].id);
      } else {
        const ins = await db.execute(sql`
          INSERT INTO locations (name, city, region, country, country_code, lat, lng, place_type)
          VALUES (${body.name}, ${body.city ?? null}, ${body.region ?? null}, ${body.country}, ${body.countryCode}, ${body.lat ?? null}, ${body.lng ?? null}, ${body.placeType ?? "place"})
          RETURNING id
        `);
        locId = Number((ins.rows as Array<{ id: number | bigint }>)[0].id);
      }
    }

    await db.execute(sql`
      INSERT INTO user_saved_locations (user_id, location_id, label, icon)
      VALUES (${req.userId}, ${locId}, ${body.label ?? null}, ${body.icon ?? '📍'})
      ON CONFLICT (user_id, location_id) DO UPDATE SET label = EXCLUDED.label, icon = EXCLUDED.icon
    `);

    res.status(201).json({ ok: true, locationId: locId });
  } catch {
    res.status(500).json({ error: "Erreur lors de l'enregistrement" });
  }
});

/* ── DELETE /location/save/:id ────────────────────────────────────────────── */
router.delete("/location/save/:id", requireAuth, async (req, res): Promise<void> => {
  const savedId = Number(req.params.id);
  if (!savedId || isNaN(savedId)) { res.status(400).json({ error: "id invalide" }); return; }

  try {
    await db.execute(sql`
      DELETE FROM user_saved_locations
      WHERE id = ${savedId} AND user_id = ${req.userId}
    `);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erreur" });
  }
});

export default router;
