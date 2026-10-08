import { Router, type IRouter } from "express";
import {
  buildKey, buildPublicUrl, detectKind, putObject,
  ownerIdFromKey,
} from "../lib/r2";
import {
  processImage, generateVideoThumbnail, compressAudioForPlayback,
  MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_AUDIO_BYTES, MAX_DOC_BYTES,
} from "../lib/media";
import { trackUploads, getUserQuota, releaseStorage } from "../lib/storage";
import { requireAuth } from "../middlewares/requireAuth";
import path from "path";

const router: IRouter = Router();

// ─── POST /api/upload ─────────────────────────────────────────────────────────

router.post(
  "/upload",
  requireAuth,
  (req, res, next) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      (req as unknown as { rawBody: Buffer }).rawBody = Buffer.concat(chunks);
      next();
    });
    req.on("error", next);
  },
  async (req, res): Promise<void> => {
    const body = (req as unknown as { rawBody: Buffer }).rawBody;
    if (!body || body.length === 0) {
      res.status(400).json({ error: "Fichier vide" });
      return;
    }

    const filename    = (req.headers["x-filename"] as string) || "upload.bin";
    const userId      = req.userId!;
    const contentType = (req.headers["content-type"] as string) ?? "";
    // If browser sends audio/* Content-Type (e.g. voice recorder sends audio/webm),
    // treat as audio even if the file extension maps to video (webm).
    const kindFromExt = detectKind(filename);
    const kind        = contentType.startsWith("audio/") ? "audio" : kindFromExt;
    const ext         = path.extname(filename).toLowerCase();

    // ── Size limits ───────────────────────────────────────────────────────────
    const sizeLimit =
      kind === "video" ? MAX_VIDEO_BYTES :
      kind === "audio" ? MAX_AUDIO_BYTES :
      kind === "doc"   ? MAX_DOC_BYTES   :
      MAX_IMAGE_BYTES;

    if (body.length > sizeLimit) {
      const mb = Math.round(sizeLimit / 1024 / 1024);
      res.status(413).json({ error: `Fichier trop volumineux — max ${mb} Mo pour ce type` });
      return;
    }

    // ── Plan-based quota check ────────────────────────────────────────────────
    try {
      const quota = await getUserQuota(userId);
      if (quota.used + body.length > quota.quota) {
        res.status(413).json({
          error: `Quota de stockage atteint (plan ${quota.planDisplayName} : ${fmtBytes(quota.quota)}). Supprime des fichiers pour libérer de l'espace.`,
          quota,
        });
        return;
      }
    } catch {
      // Non-fatal — proceed if quota lookup fails
    }

    try {
      const trackedFiles: Array<{ key: string; sizeBytes: number; kind: string }> = [];
      let mainKey: string;
      let mainBuffer: Buffer;
      let mainContentType: string;
      let thumbnailUrl: string | undefined;
      let mediumUrl: string | undefined;

      // ── Image: compress to WebP, generate thumbnail + medium ─────────────
      if (kind === "image") {
        const processed = await processImage(body);

        mainKey         = buildKey("upload.webp", "image", userId);
        mainBuffer      = processed.original.data;
        mainContentType = "image/webp";

        const thumbKey  = buildKey("thumb.webp",  "image", userId);
        const mediumKey = buildKey("medium.webp", "image", userId);

        await Promise.all([
          putObject(mainKey,   processed.original.data,  "image/webp"),
          putObject(thumbKey,  processed.thumbnail.data, "image/webp"),
          putObject(mediumKey, processed.medium.data,    "image/webp"),
        ]);

        thumbnailUrl = buildPublicUrl(thumbKey);
        mediumUrl    = buildPublicUrl(mediumKey);

        trackedFiles.push(
          { key: mainKey,   sizeBytes: processed.original.data.length,  kind: "image" },
          { key: thumbKey,  sizeBytes: processed.thumbnail.data.length, kind: "image" },
          { key: mediumKey, sizeBytes: processed.medium.data.length,    kind: "image" },
        );

      // ── Video: enforce limit, generate thumbnail ──────────────────────────
      } else if (kind === "video") {
        mainKey         = buildKey(filename, "video", userId);
        mainBuffer      = body;
        mainContentType = (req.headers["content-type"] as string) || "video/mp4";

        const thumbBuffer = await generateVideoThumbnail(body, ext);
        await putObject(mainKey, mainBuffer, mainContentType);
        trackedFiles.push({ key: mainKey, sizeBytes: mainBuffer.length, kind: "video" });

        if (thumbBuffer) {
          const thumbKey = buildKey("thumb.jpg", "image", userId);
          await putObject(thumbKey, thumbBuffer, "image/jpeg");
          thumbnailUrl = buildPublicUrl(thumbKey);
          trackedFiles.push({ key: thumbKey, sizeBytes: thumbBuffer.length, kind: "image" });
        }

      // ── Audio: encode to AAC/M4A for reliable Safari/iPhone playback ───────
      } else if (kind === "audio") {
        const compressed = await compressAudioForPlayback(body, ext || ".mp3");
        mainKey         = buildKey(`voice${compressed.ext}`, "audio", userId);
        mainBuffer      = compressed.data;
        mainContentType = compressed.contentType;
        await putObject(mainKey, mainBuffer, mainContentType);
        trackedFiles.push({ key: mainKey, sizeBytes: mainBuffer.length, kind: "audio" });

      // ── Document: store as-is ────────────────────────────────────────────
      } else {
        mainKey         = buildKey(filename, "doc", userId);
        mainBuffer      = body;
        mainContentType = (req.headers["content-type"] as string) || "application/octet-stream";
        await putObject(mainKey, mainBuffer, mainContentType);
        trackedFiles.push({ key: mainKey, sizeBytes: mainBuffer.length, kind: "doc" });
      }

      // ── Track all uploaded objects + update quota counter (best-effort) ────
      await trackUploads(trackedFiles, userId).catch(() => {});

      const totalStored = trackedFiles.reduce((s, f) => s + f.sizeBytes, 0);

      res.json({
        url:          buildPublicUrl(mainKey),
        key:          mainKey,
        kind,
        thumbnailUrl: thumbnailUrl ?? null,
        mediumUrl:    mediumUrl    ?? null,
        size:         totalStored,
      });
    } catch (err) {
      req.log.error({ err }, "R2 upload error");
      res.status(500).json({ error: "Upload échoué côté serveur" });
    }
  },
);

// ─── DELETE /api/upload/<key> ─────────────────────────────────────────────────

router.delete(
  /^\/upload\/(.+)$/,
  requireAuth,
  async (req, res): Promise<void> => {
    const key = (req.params as unknown as string[])[0];

    if (!key || !/^(image|video|audio)\//.test(key)) {
      res.status(400).json({ error: "Clé invalide" });
      return;
    }

    const ownerId = ownerIdFromKey(key);
    if (ownerId === null) {
      res.status(403).json({ error: "Ce fichier ne peut pas être supprimé via cette API" });
      return;
    }
    if (ownerId !== req.userId!) {
      res.status(403).json({ error: "Non autorisé" });
      return;
    }

    try {
      await releaseStorage([key]);
      res.json({ ok: true });
    } catch (err) {
      req.log.error({ err }, "R2 delete error");
      res.status(500).json({ error: "Suppression échouée" });
    }
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(0)} Go`;
  if (b >= 1_048_576)     return `${(b / 1_048_576).toFixed(0)} Mo`;
  return `${Math.round(b / 1024)} Ko`;
}

export default router;
