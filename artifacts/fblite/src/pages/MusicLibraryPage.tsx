import { useState, useEffect, useRef, useMemo, useCallback } from "react";

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  genre: string;
  coverColor: string;
  coverEmoji: string;
  coverUrl: string;
  previewUrl: string;
}

/* ── iTunes Search API helpers ── */
function fmtMs(ms: number): string {
  if (!ms) return "0:00";
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function itunesResultToTrack(r: any): MusicTrack {
  const art = (r.artworkUrl100 || "").replace("100x100bb", "300x300bb");
  return {
    id:         String(r.trackId ?? r.collectionId ?? Math.random()),
    title:      r.trackName || r.collectionName || "Titre inconnu",
    artist:     r.artistName || "Artiste inconnu",
    duration:   fmtMs(r.trackTimeMillis),
    genre:      r.primaryGenreName || "Musique",
    coverColor: "var(--bp-primary)",
    coverEmoji: "🎵",
    coverUrl:   art,
    previewUrl: r.previewUrl || "",
  };
}

const CACHE: Record<string, MusicTrack[]> = {};

async function searchItunes(term: string, limit = 30): Promise<MusicTrack[]> {
  const key = `${term}__${limit}`;
  if (CACHE[key]) return CACHE[key];
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}&lang=fr_fr`;
    const res = await fetch(url);
    const data: any = await res.json();
    const tracks: MusicTrack[] = (data.results || [])
      .filter((r: any) => r.previewUrl && r.trackName)
      .map(itunesResultToTrack);
    CACHE[key] = tracks;
    return tracks;
  } catch {
    return [];
  }
}

/* Default searches per tab */
const TAB_QUERIES: Record<string, string[]> = {
  trending: ["afrobeats 2024", "burna boy", "wizkid", "davido"],
  popular:  ["shakira", "beyonce", "drake", "rihanna"],
  recent:   ["new music 2024", "pop 2024", "rnb 2024"],
};

interface Props {
  onSelect: (track: MusicTrack) => void;
  onClose: () => void;
  initialTrack?: MusicTrack | null;
}

/* ── Animated EQ bars ── */
function EqBars({ playing, size = "md" }: { playing: boolean; size?: "sm" | "md" }) {
  const bars = size === "sm" ? [6, 10, 8, 12, 7] : [8, 14, 10, 18, 9, 14, 8];
  const w = size === "sm" ? 2 : 3;
  const h = size === "sm" ? 16 : 22;
  return (
    <div style={{ display: "flex", gap: size === "sm" ? 1.5 : 2, alignItems: "flex-end", height: h, flexShrink: 0 }}>
      {bars.map((bh, i) => (
        <div key={i} style={{
          width: w, borderRadius: 2, background: "var(--bp-primary)",
          height: playing ? bh : 3,
          transition: `height ${180 + i * 35}ms ease-in-out`,
          animation: playing ? `mlEq ${0.6 + i * 0.07}s ease-in-out infinite alternate` : "none",
          animationDelay: `${i * 0.08}s`,
          transformOrigin: "bottom",
        }} />
      ))}
    </div>
  );
}

/* ── Cover image with gradient fallback ── */
function CoverImg({ track, size, radius = 12 }: { track: MusicTrack; size: number; radius?: number }) {
  const [err, setErr] = useState(false);
  return (err || !track.coverUrl) ? (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `linear-gradient(135deg, ${track.coverColor}, ${track.coverColor}aa)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38,
    }}>{track.coverEmoji}</div>
  ) : (
    <img
      src={track.coverUrl}
      alt={track.title}
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}
    />
  );
}

/* ── Track row ── */
function TrackRow({ track, playing, loading, onPlay, onSelect }: {
  track: MusicTrack;
  playing: boolean;
  loading: boolean;
  onPlay: () => void;
  onSelect: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px",
        background: playing ? "rgba(34,197,94,0.04)" : pressed ? "#F8FAFC" : "#FFFFFF",
        borderBottom: "1px solid #F3F4F6",
        minHeight: 88,
        transform: pressed ? "scale(0.99)" : "scale(1)",
        transition: "all 150ms",
      }}
    >
      {/* Cover */}
      <div onClick={onSelect} style={{ cursor: "pointer", flexShrink: 0 }}>
        <CoverImg track={track} size={56} radius={12} />
      </div>

      {/* Info */}
      <button
        onClick={onSelect}
        style={{ flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
      >
        <div style={{
          fontSize: 15, fontWeight: 600, color: playing ? "var(--bp-primary)" : "#111827",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3,
        }}>{track.title}</div>
        <div style={{
          fontSize: 13, color: "#64748B", marginBottom: 4,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{track.artist}</div>
        <span style={{
          display: "inline-block", fontSize: 11, fontWeight: 500,
          color: "var(--bp-primary-dark)", background: "#DCFCE7",
          borderRadius: 20, padding: "2px 8px",
        }}>{track.genre}</span>
      </button>

      {/* Duration + Play + 3-dot */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {track.duration !== "0:00" && (
          <span style={{ fontSize: 13, color: "#9CA3AF", width: 30, textAlign: "right" }}>{track.duration}</span>
        )}
        <button
          onClick={onPlay}
          disabled={!track.previewUrl}
          style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: playing ? "var(--bp-primary)" : "#FFFFFF",
            border: `2px solid ${track.previewUrl ? "var(--bp-primary)" : "#E5E7EB"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: track.previewUrl ? "pointer" : "not-allowed",
            boxShadow: playing ? "0 4px 12px rgba(34,197,94,0.35)" : "0 1px 4px rgba(0,0,0,0.08)",
            transition: "all 200ms",
          }}
        >
          {loading ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={playing ? "#fff" : "var(--bp-primary)"} strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: "mlSpin 0.8s linear infinite" }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" strokeOpacity="0.3" />
              <path d="M21 12a9 9 0 00-9-9" />
            </svg>
          ) : playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="4" width="4" height="16" rx="1.5" fill="#fff" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" fill="#fff" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <polygon points="6,4 20,12 6,20" fill={track.previewUrl ? "var(--bp-primary)" : "#E5E7EB"} />
            </svg>
          )}
        </button>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 2px", display: "flex" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="1.5" fill="#9CA3AF" />
            <circle cx="12" cy="12" r="1.5" fill="#9CA3AF" />
            <circle cx="12" cy="19" r="1.5" fill="#9CA3AF" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Now Playing Bar ── */
function NowPlayingBar({ track, playing, onToggle, onClose }: {
  track: MusicTrack; playing: boolean; onToggle: () => void; onClose: () => void;
}) {
  const [liked, setLiked] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px 16px",
      background: "#FFFFFF",
      borderTop: "1px solid #F3F4F6",
      boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
    }}>
      <CoverImg track={track} size={44} radius={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: "var(--theme-text)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2,
        }}>{track.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 12, color: "#64748B",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130,
          }}>{track.artist}</span>
          <EqBars playing={playing} size="sm" />
        </div>
      </div>
      <button onClick={() => setLiked(l => !l)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24"
          fill={liked ? "#EF4444" : "none"} stroke={liked ? "#EF4444" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      <button onClick={onToggle} style={{
        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
        background: "var(--bp-primary)", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(34,197,94,0.4)",
      }}>
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="4" width="4" height="16" rx="1.5" fill="#fff" />
            <rect x="14" y="4" width="4" height="16" rx="1.5" fill="#fff" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <polygon points="6,4 20,12 6,20" fill="#fff" />
          </svg>
        )}
      </button>
      <button onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ── Loading skeleton ── */
function SkeletonRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #F3F4F6", minHeight: 88 }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: "#F1F5F9", flexShrink: 0, animation: "mlPulse 1.4s ease-in-out infinite" }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: "65%", height: 14, borderRadius: 7, background: "#F1F5F9", marginBottom: 8, animation: "mlPulse 1.4s ease-in-out infinite" }} />
        <div style={{ width: "45%", height: 12, borderRadius: 6, background: "#F1F5F9", marginBottom: 8, animation: "mlPulse 1.4s ease-in-out infinite 0.1s" }} />
        <div style={{ width: 60, height: 18, borderRadius: 20, background: "#F1F5F9", animation: "mlPulse 1.4s ease-in-out infinite 0.2s" }} />
      </div>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#F1F5F9", animation: "mlPulse 1.4s ease-in-out infinite" }} />
    </div>
  );
}

/* ── Main component ── */
export default function MusicLibraryPage({ onSelect, onClose }: Props) {
  const [visible, setVisible]       = useState(false);
  const [tab, setTab]               = useState<"trending" | "popular" | "recent">("trending");
  const [query, setQuery]           = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tabTracks, setTabTracks]   = useState<Record<string, MusicTrack[]>>({ trending: [], popular: [], recent: [] });
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading]       = useState(false);
  const [tabLoading, setTabLoading] = useState(true);
  const [playingId, setPlayingId]   = useState<string | null>(null);
  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<MusicTrack | null>(null);
  const audioRef                    = useRef<HTMLAudioElement | null>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const searchTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Slide-in on mount + load initial tab */
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    loadTab("trending");
    return () => stopAudio();
  }, []);

  /* Load tab data */
  const loadTab = useCallback(async (t: "trending" | "popular" | "recent") => {
    if (tabTracks[t].length > 0) return;
    setTabLoading(true);
    const queries = TAB_QUERIES[t];
    const perQuery = Math.ceil(30 / queries.length);
    const results = await Promise.all(queries.map(q => searchItunes(q, perQuery)));
    const merged = results.flat().slice(0, 30);
    setTabTracks(prev => ({ ...prev, [t]: merged }));
    setTabLoading(false);
  }, [tabTracks]);

  const handleTabChange = (t: "trending" | "popular" | "recent") => {
    setTab(t);
    loadTab(t);
  };

  /* Debounced search */
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!query.trim()) { setDebouncedQ(""); return; }
    searchTimerRef.current = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query]);

  useEffect(() => {
    if (!debouncedQ) { setSearchResults([]); return; }
    let cancelled = false;
    setLoading(true);
    searchItunes(debouncedQ, 50).then(tracks => {
      if (!cancelled) { setSearchResults(tracks); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [debouncedQ]);

  /* Audio controls */
  const stopAudio = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    audioRef.current = null;
    setPlayingId(null);
    setLoadingId(null);
  };

  const handleClose = () => {
    stopAudio();
    setNowPlaying(null);
    setVisible(false);
    setTimeout(onClose, 310);
  };

  const handlePlay = (track: MusicTrack) => {
    if (!track.previewUrl) return;
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    stopAudio();
    setLoadingId(track.id);
    setNowPlaying(track);
    const audio = new Audio(track.previewUrl);
    audio.volume = 0.85;
    audioRef.current = audio;
    audio.addEventListener("canplay", () => {
      setLoadingId(null);
      setPlayingId(track.id);
      audio.play().catch(() => { setLoadingId(null); setPlayingId(null); });
    }, { once: true });
    audio.addEventListener("ended", () => setPlayingId(null));
    audio.addEventListener("error", () => { setLoadingId(null); setPlayingId(null); }, { once: true });
    audio.load();
  };

  const handleToggleNowPlaying = () => {
    if (!nowPlaying) return;
    if (playingId === nowPlaying.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setPlayingId(nowPlaying.id);
    } else {
      handlePlay(nowPlaying);
    }
  };

  const handleSelect = (track: MusicTrack) => {
    stopAudio();
    setVisible(false);
    setTimeout(() => onSelect(track), 280);
  };

  /* Displayed tracks */
  const isSearching = query.trim().length > 0;
  const currentTracks = isSearching ? searchResults : (tabTracks[tab] || []);
  const isAnyLoading  = isSearching ? loading : (tabLoading && currentTracks.length === 0);

  const TABS = [
    { key: "trending" as const, label: "Tendances", icon: "🔥" },
    { key: "popular"  as const, label: "Populaires", icon: "☆" },
    { key: "recent"   as const, label: "Récentes",   icon: "🕐" },
  ];

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 60,
      display: "flex", flexDirection: "column",
      background: "rgba(15,23,42,0.55)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      opacity: visible ? 1 : 0,
      transition: "opacity 300ms ease",
    }}>
      <div style={{ flex: 1, minHeight: "8vh" }} onClick={handleClose} />

      {/* Sheet */}
      <div style={{
        background: "#FFFFFF",
        borderRadius: "32px 32px 0 0",
        height: "92vh",
        display: "flex", flexDirection: "column",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 310ms cubic-bezier(0.32,0.72,0,1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
        overflow: "hidden",
      }}>

        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: "#E5E7EB" }} />
        </div>

        {/* Nav bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 12px" }}>
          <button onClick={handleClose} style={{
            width: 36, height: 36, borderRadius: "50%", background: "#F1F5F9",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>BrutePawa</span>
          </div>
          <button onClick={handleClose} style={{
            width: 36, height: 36, borderRadius: "50%", background: "#F1F5F9",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Title section */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 20px 16px" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: "var(--theme-text)", letterSpacing: "-0.4px" }}>
              Bibliothèque musicale
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#64748B", lineHeight: 1.4 }}>
              Appuie ▶ pour écouter · Appuie sur le titre pour choisir
            </p>
          </div>
        </div>

        {/* Search + Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 14px" }}>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            background: "#F1F5F9", borderRadius: 18, padding: "0 16px", height: 56,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher titre, artiste, genre..."
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontSize: 14.5, color: "var(--theme-text)", fontFamily: "inherit",
              }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <button style={{
            width: 56, height: 56, borderRadius: 18, flexShrink: 0,
            background: "#F1F5F9", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="10" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        {!isSearching && (
          <div style={{ padding: "0 16px 14px" }}>
            <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 16, padding: 4, gap: 2, height: 52 }}>
              {TABS.map(t => {
                const active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => handleTabChange(t.key)} style={{
                    flex: 1, border: "none", cursor: "pointer",
                    background: active ? "#FFFFFF" : "transparent",
                    borderRadius: 12,
                    color: active ? "var(--bp-primary)" : "#9CA3AF",
                    fontWeight: active ? 700 : 500, fontSize: 13,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                    boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                    transition: "all 250ms",
                  }}>
                    <span style={{ fontSize: 14 }}>{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search info */}
        {isSearching && (
          <div style={{ padding: "0 16px 10px" }}>
            {loading ? (
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>Recherche en cours…</span>
            ) : (
              <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
                {searchResults.length} résultat{searchResults.length !== 1 ? "s" : ""} pour « {debouncedQ || query} »
              </span>
            )}
          </div>
        )}

        {/* Track list */}
        <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
          {isAnyLoading ? (
            <>
              {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
            </>
          ) : currentTracks.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: "#F1F5F9",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#64748B", fontWeight: 600, fontSize: 15, margin: "0 0 4px" }}>Aucun résultat</p>
                <p style={{ color: "#9CA3AF", fontSize: 13, margin: 0 }}>Essaie un autre mot-clé</p>
              </div>
            </div>
          ) : currentTracks.map(track => (
            <TrackRow
              key={track.id}
              track={track}
              playing={playingId === track.id}
              loading={loadingId === track.id}
              onPlay={() => handlePlay(track)}
              onSelect={() => handleSelect(track)}
            />
          ))}
          <div style={{ height: nowPlaying ? 80 : 24 }} />
        </div>

        {/* Now Playing bar */}
        {nowPlaying && (
          <NowPlayingBar
            track={nowPlaying}
            playing={playingId === nowPlaying.id}
            onToggle={handleToggleNowPlaying}
            onClose={() => { stopAudio(); setNowPlaying(null); }}
          />
        )}
      </div>

      <style>{`
        @keyframes mlEq {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.0); }
        }
        @keyframes mlSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes mlPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
