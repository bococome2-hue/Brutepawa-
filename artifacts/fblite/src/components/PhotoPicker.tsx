import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

/* ─── Types ──────────────────────────────────────────────── */
interface PickedPhoto {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: "photo" | "video";
}

export interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (files: File[]) => void;
  maxFiles?: number;
  defaultTab?: "photos" | "videos";
}

/* ─── Constants ──────────────────────────────────────────── */
const G = "#22C55E";

/* ─── Tab icons ──────────────────────────────────────────── */
function IconPhoto({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill={active ? G : "currentColor"} />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" opacity=".6" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

/* ─── Video duration formatter ───────────────────────────── */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─── Video thumbnail tile ───────────────────────────────── */
function VideoThumbnail({ src }: { src: string }) {
  const [duration, setDuration] = useState<number | null>(null);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <video
        src={src}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={e => {
          const d = (e.currentTarget as HTMLVideoElement).duration;
          if (isFinite(d)) setDuration(d);
        }}
      />
      {/* Play overlay */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.18)",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "rgba(255,255,255,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="#111827">
            <polygon points="8 5 19 12 8 19 8 5" />
          </svg>
        </div>
      </div>
      {/* Duration badge — bottom left */}
      {duration !== null && (
        <div style={{
          position: "absolute", bottom: 5, left: 5,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
          padding: "2px 5px",
          borderRadius: 5,
          letterSpacing: "0.3px",
        }}>
          {formatDuration(duration)}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

/* ═══════════════════════════════════════════════════════════
   PhotoPicker
═══════════════════════════════════════════════════════════ */
export default function PhotoPicker({ open, onClose, onConfirm, maxFiles = 10, defaultTab = "photos" }: Props) {
  const [media, setMedia] = useState<PickedPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"photos" | "albums" | "videos" | "favoris">(defaultTab);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  /* Helper: active input ref based on current tab */
  const activeInput = () => tab === "videos" ? videoInputRef : photoInputRef;

  /* Sync tab when defaultTab prop changes (e.g. reopened on videos) */
  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  /* Tab switch — no auto-trigger; user opens gallery deliberately */
  const handleTabChange = (newTab: typeof tab) => {
    setTab(newTab);
  };

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* Reset on close */
  const handleClose = () => {
    setMedia([]);
    setSelectedIds([]);
    setSearch("");
    setTab(defaultTab);
    onClose();
  };

  /* Handle file selection from either input */
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>, mediaType: "photo" | "video") => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (e.target) e.target.value = "";
    const newItems: PickedPhoto[] = files.map(f => ({
      id: uid(),
      file: f,
      previewUrl: URL.createObjectURL(f),
      mediaType,
    }));
    setMedia(prev => [...prev, ...newItems]);
    /* Auto-select new ones up to max */
    setSelectedIds(prev => {
      const added = newItems.map(p => p.id);
      const combined = [...prev, ...added];
      return combined.slice(0, maxFiles);
    });
  };

  /* Toggle a media item in/out of selection */
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= maxFiles) return prev;
      return [...prev, id];
    });
  };

  /* Confirm selection */
  const handleConfirm = () => {
    const ordered = selectedIds
      .map(id => media.find(p => p.id === id))
      .filter(Boolean) as PickedPhoto[];
    onConfirm(ordered.map(p => p.file));
    handleClose();
  };

  /* Derived */
  const selectedCount = selectedIds.length;
  const firstSelectedItem = media.find(p => p.id === selectedIds[0]);

  /* Filter by tab, then by search */
  const tabFiltered = tab === "videos"
    ? media.filter(m => m.mediaType === "video")
    : tab === "photos"
    ? media.filter(m => m.mediaType === "photo")
    : media;

  const filtered = search.trim()
    ? tabFiltered.filter(p => p.file.name.toLowerCase().includes(search.toLowerCase()))
    : tabFiltered;

  const isVideoTab = tab === "videos";

  const TABS = [
    { id: "photos",  label: "Photos",  Icon: () => <IconPhoto active={tab === "photos"} /> },
    { id: "albums",  label: "Albums",  Icon: IconFolder },
    { id: "videos",  label: "Vidéos",  Icon: IconPlay },
    { id: "favoris", label: "Favoris", Icon: IconHeart },
  ] as const;

  if (!open) return null;

  return createPortal(
    <>
      {/* ── Backdrop ─────────────────────────────────────── */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.45)",
          animation: "ppBackdrop 0.22s ease both",
        }}
      />

      {/* ── Sheet ────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#fff",
          display: "flex", flexDirection: "column",
          animation: "ppSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) both",
          overflow: "hidden",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Green handle ───────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 44, height: 5, borderRadius: 4, background: G }} />
        </div>

        {/* ── Header ─────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", padding: "8px 16px 12px", gap: 12, flexShrink: 0 }}>
          {/* BrutePawa logo */}
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: `linear-gradient(135deg,#16A34A,${G})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(34,197,94,0.30)",
          }}>
            <span style={{ color: "#fff", fontSize: 24, fontWeight: 900, fontFamily: "Georgia, serif", lineHeight: 1 }}>b</span>
          </div>

          {/* Title + subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#111827", lineHeight: 1.2, letterSpacing: "-0.2px" }}>
              Sélectionner{" "}
              <span style={{ color: G }}>{isVideoTab ? "des vidéos" : "des photos"}</span>
            </div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2, fontWeight: 500 }}>
              Jusqu'à {maxFiles} fichiers combinés{" "}
              {selectedCount > 0
                ? <>• <span style={{ color: G, fontWeight: 700 }}>{selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}</span></>
                : null
              }
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: "#ECFDF5", border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Search + Filter ─────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, padding: "0 16px 14px", flexShrink: 0 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <svg
              viewBox="0 0 24 24" width="17" height="17" fill="none"
              stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round"
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isVideoTab ? "Rechercher dans vos vidéos..." : "Rechercher dans vos photos..."}
              style={{
                width: "100%", padding: "12px 14px 12px 42px",
                borderRadius: 16, border: "1.5px solid #E5E7EB",
                fontSize: 14, color: "#374151", background: "#fff",
                outline: "none", boxSizing: "border-box",
                transition: "border-color .15s",
                fontFamily: "inherit",
              }}
              onFocus={e => (e.target.style.borderColor = G)}
              onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
            />
          </div>
          <button
            style={{
              width: 48, height: 48, borderRadius: 16, flexShrink: 0,
              background: "#ECFDF5", border: `1.5px solid ${G}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="14" y2="12" />
              <line x1="4" y1="18" x2="10" y2="18" />
              <circle cx="17" cy="12" r="3" />
              <circle cx="13" cy="18" r="3" />
            </svg>
          </button>
        </div>

        {/* ── Tab navigation ──────────────────────────────── */}
        <div
          style={{
            display: "flex", padding: "0 12px 12px",
            gap: 2, flexShrink: 0, overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {TABS.map(({ id, label, Icon }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 22, border: "none",
                  cursor: "pointer", fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                  background: isActive ? "#ECFDF5" : "transparent",
                  color: isActive ? G : "#6B7280",
                  transition: "all .14s",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <Icon />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Section header ──────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px", flexShrink: 0 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Récents</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#374151"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <button
            onClick={() => activeInput().current?.click()}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 20,
              border: `1.5px solid ${G}`, background: "#fff",
              cursor: "pointer", color: G, fontSize: 12.5, fontWeight: 600,
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {isVideoTab ? "Ajouter des vidéos" : "Sélection multiple"}
          </button>
        </div>

        {/* ── Media grid ──────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px", paddingBottom: selectedCount > 0 ? 92 : 16 }}>
          {filtered.length === 0 ? (
            /* ── Empty state ── */
            <div
              onClick={() => activeInput().current?.click()}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: "56px 20px", gap: 18, cursor: "pointer",
              }}
            >
              <div style={{
                width: 80, height: 80, borderRadius: 22,
                background: "#ECFDF5",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isVideoTab ? (
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="3" />
                    <polygon points="10 8 16 12 10 16 10 8" fill={G} />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill={G} />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  {isVideoTab ? "Accéder à vos vidéos" : "Accéder à votre galerie"}
                </div>
                <div style={{ fontSize: 13.5, color: "#6B7280", marginTop: 4 }}>
                  {isVideoTab ? "Appuyez pour sélectionner vos vidéos" : "Appuyez pour sélectionner vos photos"}
                </div>
              </div>
              <div style={{
                background: G, color: "#fff", borderRadius: 24,
                padding: "11px 28px", fontWeight: 700, fontSize: 14,
                boxShadow: "0 2px 12px rgba(34,197,94,0.35)",
              }}>
                {isVideoTab ? "Ouvrir les vidéos" : "Ouvrir la galerie"}
              </div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 3,
            }}>
              {filtered.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const selIdx = selectedIds.indexOf(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    style={{
                      position: "relative", aspectRatio: "1 / 1",
                      borderRadius: 9, overflow: "hidden",
                      cursor: "pointer", boxSizing: "border-box",
                      border: isSelected ? `2.5px solid ${G}` : "2.5px solid transparent",
                      transition: "border-color .12s",
                    }}
                  >
                    {item.mediaType === "video" ? (
                      <VideoThumbnail src={item.previewUrl} />
                    ) : (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                    )}
                    {/* Subtle dim overlay when selected */}
                    {isSelected && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.10)" }} />
                    )}
                    {/* Numbered badge — top left */}
                    {isSelected && (
                      <div style={{
                        position: "absolute", top: 5, left: 5,
                        width: 22, height: 22, borderRadius: "50%",
                        background: G, color: "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, lineHeight: 1,
                        animation: "ppCheckIn .14s ease both",
                        boxShadow: "0 1px 5px rgba(34,197,94,0.45)",
                      }}>
                        {selIdx + 1}
                      </div>
                    )}
                    {/* Circle indicator — top right */}
                    <div style={{
                      position: "absolute", top: 5, right: 5,
                      width: 22, height: 22, borderRadius: "50%",
                      background: isSelected ? G : "rgba(255,255,255,0.72)",
                      border: isSelected ? "none" : "1.5px solid rgba(255,255,255,0.9)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background .12s, border .12s",
                      boxShadow: isSelected
                        ? "0 1px 5px rgba(34,197,94,0.45)"
                        : "0 1px 3px rgba(0,0,0,0.22)",
                    }}>
                      {isSelected && (
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                          stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                          style={{ animation: "ppCheckIn .14s ease both" }}
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ── Add more tile ── */}
              <div
                onClick={() => activeInput().current?.click()}
                style={{
                  aspectRatio: "1 / 1", borderRadius: 9,
                  background: "#F9FAFB", border: "2px dashed #E5E7EB",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  cursor: "pointer", gap: 4,
                }}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* ── Hidden file inputs ───────────────────────────── */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => handleFilesSelected(e, "photo")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          style={{ display: "none" }}
          onChange={e => handleFilesSelected(e, "video")}
        />

        {/* ── Bottom confirmation bar ─────────────────────── */}
        {selectedCount > 0 && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#fff",
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 -6px 24px rgba(0,0,0,0.09)",
            padding: "12px 16px 16px",
            display: "flex", alignItems: "center", gap: 12,
            zIndex: 10,
          }}>
            {/* Thumbnail */}
            {firstSelectedItem && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                {firstSelectedItem.mediaType === "video" ? (
                  <video
                    src={firstSelectedItem.previewUrl}
                    style={{ width: 52, height: 52, borderRadius: 11, objectFit: "cover", display: "block" }}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={firstSelectedItem.previewUrl}
                    alt="preview"
                    style={{ width: 52, height: 52, borderRadius: 11, objectFit: "cover", display: "block" }}
                  />
                )}
                <button
                  onClick={e => { e.stopPropagation(); toggleSelect(firstSelectedItem.id); }}
                  style={{
                    position: "absolute", top: -6, left: -6,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "#374151", border: "1.5px solid #fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0,
                  }}
                >
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Labels */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                {selectedCount} fichier{selectedCount > 1 ? "s" : ""} sélectionné{selectedCount > 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 12, color: G, marginTop: 2, cursor: "pointer" }}>
                Appuyez pour voir l'aperçu →
              </div>
            </div>

            {/* Continuer button */}
            <button
              onClick={handleConfirm}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: G, color: "#fff", border: "none",
                borderRadius: 24, padding: "13px 22px",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                flexShrink: 0,
                boxShadow: "0 2px 10px rgba(34,197,94,0.38)",
              }}
            >
              Continuer
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Animations ─────────────────────────────────────── */}
      <style>{`
        @keyframes ppSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes ppBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ppCheckIn {
          from { transform: scale(0.3); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </>,
    document.body
  );
}
