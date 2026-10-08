import { useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export type UploadStatus = "idle" | "uploading" | "done" | "error";
export type UploadPhase =
  | "idle"
  | "checking"
  | "compressing"
  | "generating-thumbnail"
  | "uploading-thumbnail"
  | "uploading"
  | "done"
  | "error";

export interface UploadedMedia {
  url: string;
  key: string;
  kind: "image" | "video" | "audio";
  filename: string;
  size: number;
  thumbnailUrl?: string;
  thumbnailKey?: string;
}

export interface UseR2Upload {
  upload: (file: File) => Promise<UploadedMedia | null>;
  uploadMultiple: (files: File[]) => Promise<UploadedMedia[]>;
  status: UploadStatus;
  phase: UploadPhase;
  progress: number;
  error: string | null;
  reset: () => void;
}

const API_BASE = "/api";
const MAX_VIDEO_DURATION_S = 180; // 3 minutes

// ─── ffmpeg.wasm singleton ────────────────────────────────────────────────────

const FFMPEG_CORE_VERSION = "0.12.9";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

let _ffmpeg: FFmpeg | null = null;
let _ffmpegLoading: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (_ffmpeg) return _ffmpeg;
  if (_ffmpegLoading) return _ffmpegLoading;

  _ffmpegLoading = (async () => {
    const f = new FFmpeg();
    await f.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    _ffmpeg = f;
    return f;
  })();

  return _ffmpegLoading;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns duration in seconds. */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    });
    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire la vidéo"));
    });
  });
}

/**
 * Compress video to 720p max using ffmpeg.wasm.
 * Falls back to the original file on any error.
 */
async function compressVideo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<File> {
  try {
    const ffmpeg = await getFFmpeg();

    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".mp4";
    const inputName  = `input${ext}`;
    const outputName = "output.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    ffmpeg.on("progress", ({ progress }) => {
      onProgress?.(Math.min(99, Math.round(progress * 100)));
    });

    // Fit within 1280×720 bounding box (handles landscape AND portrait);
    // force_original_aspect_ratio=decrease never upscales smaller videos.
    // Second scale pass rounds dimensions to even numbers (required by libx264).
    await ffmpeg.exec([
      "-i", inputName,
      "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
      "-c:v", "libx264",
      "-crf", "28",
      "-preset", "fast",
      "-maxrate", "2M",
      "-bufsize", "4M",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    ffmpeg.off("progress", () => {});

    // Clean up virtual FS
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    const blob = new Blob([data as Uint8Array], { type: "video/mp4" });

    // Only use compressed version if it's actually smaller
    if (blob.size >= file.size) return file;

    const compressedName = file.name.replace(/\.[^.]+$/, "") + "_c.mp4";
    onProgress?.(100);
    return new File([blob], compressedName, { type: "video/mp4" });
  } catch {
    // Compression failed — upload original unchanged
    return file;
  }
}

/** Captures frame at t≈1s as JPEG, returns File or null. */
function generateVideoThumbnail(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(1, video.duration > 0 ? video.duration * 0.1 : 1);
    });

    video.addEventListener("seeked", () => {
      try {
        const W = Math.min(video.videoWidth || 640, 1280);
        const H = video.videoWidth
          ? Math.round((video.videoHeight / video.videoWidth) * W)
          : 720;
        const canvas = document.createElement("canvas");
        canvas.width  = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) { cleanup(); resolve(null); return; }
        ctx.drawImage(video, 0, 0, W, H);
        canvas.toBlob((blob) => {
          cleanup();
          if (!blob) { resolve(null); return; }
          const thumbName = file.name.replace(/\.[^.]+$/, "") + "_thumb.jpg";
          resolve(new File([blob], thumbName, { type: "image/jpeg" }));
        }, "image/jpeg", 0.82);
      } catch {
        cleanup();
        resolve(null);
      }
    });

    video.addEventListener("error", () => { cleanup(); resolve(null); });
  });
}

/** Low-level XHR upload. */
function rawUpload(
  file: File,
  token: string | null,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; key: string; kind: "image" | "video" | "audio" }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/upload`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("X-Filename", file.name);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("Réponse invalide du serveur")); }
      } else {
        if (xhr.status === 401 && token) {
          localStorage.removeItem("bp_token");
          localStorage.removeItem("fb_user");
          window.dispatchEvent(new CustomEvent("bp:session-expired"));
        }
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(body.error ?? `Erreur ${xhr.status}`));
        } catch {
          reject(new Error(`Erreur ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Erreur réseau")));
    xhr.send(file);
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useR2Upload(): UseR2Upload {
  const [status,   setStatus]   = useState<UploadStatus>("idle");
  const [phase,    setPhase]    = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error,    setError]    = useState<string | null>(null);

  function reset() {
    setStatus("idle");
    setPhase("idle");
    setProgress(0);
    setError(null);
  }

  async function upload(file: File): Promise<UploadedMedia | null> {
    setError(null);
    setStatus("uploading");
    setProgress(0);

    const token   = localStorage.getItem("bp_token");
    const videoExts = /\.(mp4|mov|avi|mkv|webm|3gp|3gpp|m4v|ogv|flv|wmv)$/i;
    const isVideo = file.type.startsWith("video/") || videoExts.test(file.name);

    try {
      // ── 1. Validate video duration ────────────────────────────────────────
      if (isVideo) {
        setPhase("checking");
        try {
          const duration = await getVideoDuration(file);
          if (duration > MAX_VIDEO_DURATION_S) {
            throw new Error(
              `La vidéo dépasse 3 minutes (${Math.round(duration)}s). Limite : 3 min.`,
            );
          }
        } catch (durationErr) {
          // Browser cannot decode this video format natively (e.g. HEVC, 3gp,
          // MKV on Android). ffmpeg.wasm handles these — skip the duration check
          // and let compression attempt run. Only re-throw if it is OUR duration
          // limit error, not a codec/decode error.
          if (durationErr instanceof Error && durationErr.message.startsWith("La vidéo dépasse")) {
            throw durationErr;
          }
          // Otherwise: ignore and proceed
        }
      }

      // ── 2. Compress video ─────────────────────────────────────────────────
      let fileToUpload = file;
      if (isVideo) {
        setPhase("compressing");
        setProgress(0);
        fileToUpload = await compressVideo(file, setProgress);
      }

      // ── 3. Generate + upload thumbnail ────────────────────────────────────
      let thumbnailUrl: string | undefined;
      let thumbnailKey: string | undefined;

      if (isVideo) {
        setPhase("generating-thumbnail");
        const thumbFile = await generateVideoThumbnail(fileToUpload);

        if (thumbFile) {
          setPhase("uploading-thumbnail");
          try {
            const thumbResult = await rawUpload(thumbFile, token);
            thumbnailUrl = thumbResult.url;
            thumbnailKey = thumbResult.key;
          } catch {
            // Non-fatal — continue without thumbnail
          }
        }
      }

      // ── 4. Upload main file ───────────────────────────────────────────────
      setPhase("uploading");
      setProgress(0);

      const result = await rawUpload(fileToUpload, token, setProgress);

      setStatus("done");
      setPhase("done");
      setProgress(100);

      return {
        url:          result.url,
        key:          result.key,
        kind:         result.kind,
        filename:     file.name,
        size:         fileToUpload.size,
        thumbnailUrl,
        thumbnailKey,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload échoué";
      setError(msg);
      setStatus("error");
      setPhase("error");
      return null;
    }
  }

  async function uploadMultiple(files: File[]): Promise<UploadedMedia[]> {
    const results: UploadedMedia[] = [];
    for (let i = 0; i < files.length; i++) {
      const result = await upload(files[i]);
      if (result) results.push(result);
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }
    return results;
  }

  return { upload, uploadMultiple, status, phase, progress, error, reset };
}

/** Human-readable label for the current upload phase. */
export function phaseLabel(phase: UploadPhase, progress: number): string {
  switch (phase) {
    case "checking":              return "Vérification de la durée…";
    case "compressing":           return `Compression vidéo… ${progress}%`;
    case "generating-thumbnail":  return "Génération de la miniature…";
    case "uploading-thumbnail":   return "Upload miniature…";
    case "uploading":             return `Envoi en cours — ${progress}%`;
    case "done":                  return "Envoi terminé ✓";
    case "error":                 return "Erreur d'upload";
    default:                      return "";
  }
}
