import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

const accountId  = process.env.CF_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID!;
export const bucketName = process.env.R2_BUCKET_NAME!;
const publicUrl  = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

/**
 * Convertit une URL publique R2 (r2.dev) en URL proxy interne /api/media/<key>.
 * Utilisé dans toutes les réponses API pour contourner le CORS Chrome.
 */
export function toProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (publicUrl && url.startsWith(publicUrl + "/")) {
    const key = url.slice(publicUrl.length + 1);
    return `/api/media/${key}`;
  }
  // Fallback: détecter pub-*.r2.dev
  const m = url.match(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/);
  if (m) return `/api/media/${m[1]}`;
  return url; // URL externe (Cloudflare Stream, etc.) — inchangée
}

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export type MediaKind = "image" | "video" | "audio" | "doc";

const EXT_MAP: Record<string, MediaKind> = {
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image", heic: "image",
  mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video",
  mp3: "audio", ogg: "audio", wav: "audio", m4a: "audio", aac: "audio",
  pdf: "doc", doc: "doc", docx: "doc", xls: "doc", xlsx: "doc",
  ppt: "doc", pptx: "doc", txt: "doc", csv: "doc", zip: "doc",
};

export function detectKind(filename: string): MediaKind {
  const ext = path.extname(filename).replace(".", "").toLowerCase();
  return EXT_MAP[ext] ?? "doc";
}

/**
 * Key format (v2): {kind}/{userId}/{year}/{month}/{uuid}{ext}
 * Encodes ownership directly in the path; 5 path segments total.
 */
export function buildKey(filename: string, kind: MediaKind, userId: number): string {
  const ext   = path.extname(filename) || ".bin";
  const uuid  = crypto.randomBytes(16).toString("hex");
  const now   = new Date();
  const year  = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${kind}/${userId}/${year}/${month}/${uuid}${ext}`;
}

export function buildPublicUrl(key: string): string {
  return `${publicUrl}/${key}`;
}

/**
 * Extracts the R2 storage key from a public URL.
 * Returns null if the URL does not match the configured public URL prefix.
 */
export function extractKeyFromUrl(url: string | null | undefined): string | null {
  if (!url || !publicUrl) return null;
  const prefix = publicUrl + "/";
  if (url.startsWith(prefix)) return url.slice(prefix.length);
  return null;
}

/**
 * Returns the userId encoded in a v2 key, or null for legacy keys / invalid format.
 * v2 key: {kind}/{userId}/{year}/{month}/{uuid}{ext}  (5 segments)
 */
export function ownerIdFromKey(key: string): number | null {
  const parts = key.split("/");
  if (parts.length < 5) return null;
  const id = Number(parts[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Upload an object to R2 with long-lived cache headers. */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket:       bucketName,
    Key:          key,
    Body:         body,
    ContentType:  contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));
}

/** Delete an object from R2. */
export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key:    key,
  }));
}

/** Delete multiple R2 objects — best-effort, individual failures are ignored. */
export async function deleteObjects(keys: (string | null | undefined)[]): Promise<void> {
  const valid = keys.filter((k): k is string => !!k);
  await Promise.all(valid.map(k => deleteObject(k).catch(() => {})));
}

/** Generate a pre-signed PUT URL — client uploads directly to R2. */
export async function createPresignedUpload(filename: string, contentType: string, userId: number): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
  kind: MediaKind;
}> {
  const kind = detectKind(filename);
  const key  = buildKey(filename, kind, userId);

  const command = new PutObjectCommand({
    Bucket:      bucketName,
    Key:         key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

  return { uploadUrl, publicUrl: buildPublicUrl(key), key, kind };
}

export interface R2Object {
  key: string;
  lastModified: Date;
  size: number;
}

/**
 * List all objects in the R2 bucket (paginated).
 * Optionally filter by prefix (e.g. "image/" or "video/").
 */
export async function listAllObjects(prefix?: string): Promise<R2Object[]> {
  const results: R2Object[] = [];
  let continuationToken: string | undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket:            bucketName,
      Prefix:            prefix,
      ContinuationToken: continuationToken,
      MaxKeys:           1000,
    });
    const response = await r2.send(cmd);
    for (const obj of (response.Contents ?? []) as _Object[]) {
      if (obj.Key && obj.LastModified && obj.Size != null) {
        results.push({
          key:          obj.Key,
          lastModified: obj.LastModified,
          size:         obj.Size,
        });
      }
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return results;
}
