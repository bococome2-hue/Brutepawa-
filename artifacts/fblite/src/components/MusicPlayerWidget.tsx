import { useState, useEffect, useRef } from "react";
import { apiToggleMusicLike } from "../lib/api";

let activeAudio: HTMLAudioElement | null = null;

// 56 barres — pattern waveform réaliste calqué sur la maquette
const WAVE_BARS = [
  4,6,9,13,18,23,30,35,38,34,28,22,32,37,40,37,30,24,19,27,
  33,38,36,30,24,19,15,21,28,34,39,40,37,31,25,20,29,36,40,38,
  32,25,19,15,11,15,21,30,37,40,37,31,24,19,7,4,
];

interface Props {
  trackName: string;
  artist?: string | null;
  artworkUrl?: string | null;
  url?: string | null;
  duration?: string | null;
  glassmorphism?: boolean;
  audioLikes?: number;
  postId?: number;
}

function parseTotal(d: string | null | undefined): number {
  if (!d) return 208;
  const p = d.split(":").map(Number);
  return p.length === 2 ? p[0] * 60 + p[1] : 208;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtK(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".", ",") + "K";
  return String(n);
}

export default function MusicPlayerWidget({
  trackName, artist, artworkUrl, url, duration, glassmorphism,
  audioLikes = 0, postId,
}: Props) {
  const total = parseTotal(duration);
  const [playing,    setPlaying]    = useState(false);
  const [cur,        setCur]        = useState(0);
  const [playableDuration, setPlayableDuration] = useState(total);
  const [audioLiked, setAudioLiked] = useState(false);
  const [likeCount,  setLikeCount]  = useState(audioLikes);
  const [heartAnim,  setHeartAnim]  = useState(false);
  const [haloAnim,   setHaloAnim]   = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setLikeCount(audioLikes); }, [audioLikes]);

  // ── Créer l'élément audio quand l'URL change ──
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (!url) return;
    const audio = new Audio(url);
    audio.preload = "metadata";
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setPlayableDuration(audio.duration);
      }
    };
    const onPause = () => setPlaying(false);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("pause", onPause);
    audioRef.current = audio;
    return () => {
      if (activeAudio === audio) activeAudio = null;
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
    };
  }, [url]);

  // ── Sync play / pause avec l'élément audio ──
  useEffect(() => {
    const audio = audioRef.current;
    if (playing) {
      if (audio) {
        if (activeAudio && activeAudio !== audio) activeAudio.pause();
        activeAudio = audio;
        audio.play().catch(() => {});
        // Sync progression depuis l'audio réel
        const onTime = () => setCur(Math.floor(audio.currentTime));
        const onEnd  = () => {
          if (activeAudio === audio) activeAudio = null;
          setPlaying(false);
          setCur(0);
        };
        audio.addEventListener("timeupdate", onTime);
        audio.addEventListener("ended", onEnd);
        return () => {
          audio.removeEventListener("timeupdate", onTime);
          audio.removeEventListener("ended", onEnd);
        };
      }

      // Timer de fallback uniquement pour les publications sans fichier audio.
      iv.current = setInterval(() =>
        setCur(s => { if (s >= total) { setPlaying(false); return 0; } return s + 1; }), 1000);
    } else {
      if (iv.current) clearInterval(iv.current);
      if (audio) audio.pause();
    }
    return () => { if (iv.current) clearInterval(iv.current); };
  }, [playing, total]);

  // ── Seek via barre de progression ──
  const seekTo = (s: number) => {
    setCur(s);
    if (audioRef.current) audioRef.current.currentTime = s;
  };

  const effectiveDuration = url ? playableDuration : total;
  const pct = effectiveDuration > 0 ? cur / effectiveDuration : 0;

  const handleAudioLike = async () => {
    const wasLiked = audioLiked;
    setAudioLiked(!wasLiked);
    setLikeCount(c => wasLiked ? Math.max(0, c - 1) : c + 1);
    setHeartAnim(true); setHaloAnim(true);
    setTimeout(() => setHeartAnim(false), 500);
    setTimeout(() => setHaloAnim(false), 600);
    if (postId) {
      try {
        const res = await apiToggleMusicLike(postId);
        setAudioLiked(res.liked);
        setLikeCount(res.musicLikesCount);
      } catch {
        setAudioLiked(wasLiked);
        setLikeCount(c => wasLiked ? c + 1 : Math.max(0, c - 1));
      }
    }
  };

  // ─── Dimensions : thème clair calé sur la maquette (glassmorphism garde le compact) ───
  const S = glassmorphism ? {
    cardMarginGlass:"8px 8px 8px",
    cardPadGlass:   "9px 9px 8px",
    art: 64, artRadius: 8,
    titleSize: 11, artistSize: 9.5, badgeSize: 11, timeSize: 8.5,
    counterSize: 10.5, labelSize: 7.5,
    waveHeight: 27, barWidth: 2, barGap: 1, barScale: 0.66,
    progressH: 2, thumb: 8, progressMT: 5,
    playBtn: 40, iconSize: 16, iconPad: 6, heartIcon: 15,
    topGap: 8, topMB: 8, artistMB: 6, counterMinW: 46,
  } : {
    cardMarginGlass:"8px 8px 8px",
    cardPadGlass:   "9px 9px 8px",
    art: 78, artRadius: 12,
    titleSize: 14.5, artistSize: 12.5, badgeSize: 14, timeSize: 11,
    counterSize: 13.5, labelSize: 10,
    waveHeight: 36, barWidth: 2.5, barGap: 1.5, barScale: 0.88,
    progressH: 3, thumb: 11, progressMT: 7,
    playBtn: 52, iconSize: 20, iconPad: 8, heartIcon: 18,
    topGap: 12, topMB: 10, artistMB: 8, counterMinW: 60,
  };

  // Palette : violet pour glassmorphism (legacy), vert BrutePawa pour le thème clair
  const P = glassmorphism ? {
    text: "#FFFFFF", sub: "#9CA3AF", badge: "#3B82F6",
    waveActive: "#A855F7", waveTip: "#C084FC", waveOff: "rgba(139,92,246,.22)",
    track: "rgba(139,92,246,.18)", fill: "#8B5CF6",
    thumbShadow: "0 0 0 2px rgba(139,92,246,.4), 0 0 8px rgba(139,92,246,.8)",
    time: "#6B7280", side: "#7C3AED", mid: "#FFFFFF",
    playBorder: "#8B5CF6", playIcon: "white",
    heart: "#A855F7", heartOff: "rgba(168,85,247,.6)", counter: "#FFFFFF",
  } : {
    text: "#111827", sub: "#6B7280", badge: "var(--bp-primary)",
    waveActive: "var(--bp-primary)", waveTip: "#4ADE80", waveOff: "#D1FAE0",
    track: "#E5F7EC", fill: "var(--bp-primary)",
    thumbShadow: "0 0 0 2px rgba(34,197,94,.35), 0 1px 6px rgba(34,197,94,.5)",
    time: "#9CA3AF", side: "var(--bp-primary)", mid: "#111827",
    playBorder: "var(--bp-primary)", playIcon: "var(--bp-primary)",
    heart: "#F43F5E", heartOff: "#F43F5E", counter: "#111827",
  };

  const cardStyle = glassmorphism ? {
    margin: S.cardMarginGlass,
    background: "rgba(14,4,30,0.52)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderRadius: 11,
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.40)",
    padding: S.cardPadGlass,
    overflow: "hidden" as const,
  } : {
    margin: "10px 14px 12px",
    background: "#FDFEFD",
    borderRadius: 18,
    border: "1px solid #DCFCE7",
    boxShadow: "0 2px 14px rgba(15,23,42,0.05)",
    padding: "14px 14px 12px",
    overflow: "hidden" as const,
  };

  const light = !glassmorphism;

  return (
    <>
      <style>{`
        @keyframes bp-wave {
          from { transform: scaleY(1); }
          to   { transform: scaleY(1.55); }
        }
        @keyframes bp-glow {
          0%,100% { box-shadow: 0 0 0 2px rgba(139,92,246,.20), 0 0 14px rgba(139,92,246,.55); }
          50%     { box-shadow: 0 0 0 4px rgba(139,92,246,.30), 0 0 22px rgba(139,92,246,.75); }
        }
        @keyframes bp-heart-pop {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.45); }
          65%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        @keyframes bp-halo {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>

      <div style={cardStyle}>

        {/* ── Top row : artwork | title+artist+waveform | audio-like counter ── */}
        <div style={{ display: "flex", gap: S.topGap, marginBottom: S.topMB, alignItems: "flex-start" }}>

          {/* Artwork */}
          {artworkUrl ? (
            <img src={artworkUrl} alt="" style={{
              width: S.art, height: S.art, borderRadius: S.artRadius,
              objectFit: "cover", flexShrink: 0, display: "block",
            }} />
          ) : (
            <div style={{
              width: S.art, height: S.art, borderRadius: S.artRadius, flexShrink: 0,
              background: "linear-gradient(160deg,#C4472A 0%,#8B3010 45%,#5C1A06 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>🎵</div>
          )}

          {/* Title + artist + waveform */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: light ? 800 : 700, fontSize: S.titleSize, color: P.text,
              lineHeight: 1.3, marginBottom: 2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{trackName}</div>

            {artist && (
              <div style={{ display: "flex", alignItems: "center", gap: light ? 4 : 3, fontSize: S.artistSize, color: P.sub, marginBottom: S.artistMB, fontWeight: light ? 600 : 400 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artist}</span>
                {light ? (
                  <svg width={S.badgeSize} height={S.badgeSize} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path d="M12 1.5l2.35 2.1 3.1-.55 1.1 2.95 2.95 1.1-.55 3.1L23.05 12l-2.1 2.35.55 3.1-2.95 1.1-1.1 2.95-3.1-.55L12 23.05l-2.35-2.1-3.1.55-1.1-2.95-2.95-1.1.55-3.1L.95 12l2.1-2.35-.55-3.1 2.95-1.1 1.1-2.95 3.1.55L12 1.5z" fill="var(--bp-primary)"/>
                    <path d="M8.4 12.3l2.3 2.3 4.9-4.9" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width={S.badgeSize} height={S.badgeSize} viewBox="0 0 24 24" fill="#3B82F6" style={{ flexShrink: 0 }}>
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
              </div>
            )}

            {/* Waveform 56 barres */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: S.barGap, height: S.waveHeight }}>
              {WAVE_BARS.map((h, i) => {
                const bp      = i / WAVE_BARS.length;
                const active  = bp <= pct;
                const nearTip = playing && Math.abs(bp - pct) < 0.06;
                return (
                  <div key={i} style={{
                    width: S.barWidth,
                    height: Math.max(2, Math.round(h * S.barScale)),
                    borderRadius: 2,
                    background: active
                      ? (nearTip ? P.waveTip : P.waveActive)
                      : P.waveOff,
                    flexShrink: 0,
                    transformOrigin: "center bottom",
                    animation: nearTip
                      ? `bp-wave ${.38 + (i % 5) * .06}s ease-in-out infinite alternate`
                      : "none",
                  }} />
                );
              })}
            </div>
          </div>

          {/* ── Audio Like Counter ── */}
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", flexShrink: 0,
            gap: 1, minWidth: S.counterMinW,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {haloAnim && (
                  <div style={{
                    position: "absolute", inset: -2, borderRadius: "50%",
                    background: "rgba(168,85,247,0.45)",
                    animation: "bp-halo 0.55s ease-out forwards",
                    pointerEvents: "none",
                  }} />
                )}
                <button onClick={handleAudioLike} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
                  <svg
                    width={S.heartIcon} height={S.heartIcon} viewBox="0 0 24 24"
                    fill={audioLiked ? P.heart : "none"}
                    stroke={audioLiked ? P.heart : P.heartOff}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      animation: heartAnim ? "bp-heart-pop 0.45s cubic-bezier(.36,.07,.19,.97)" : "none",
                      filter: audioLiked ? "drop-shadow(0 0 4px rgba(168,85,247,0.7))" : "none",
                      transition: "fill .15s ease, filter .15s ease",
                    }}
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
              <span style={{ fontSize: S.counterSize, fontWeight: light ? 800 : 700, color: P.counter, lineHeight: 1 }}>
                {fmtK(likeCount)}
              </span>
            </div>
            <span style={{ fontSize: S.labelSize, color: P.sub, textAlign: "center", lineHeight: 1.3, whiteSpace: "nowrap" }}>
              personnes ont aimé
            </span>
          </div>
        </div>

        {/* ── Barre de progression ── */}
        <div style={{ marginBottom: 6 }}>
          <div
            style={{ position: "relative", height: S.progressH, background: P.track, borderRadius: 2, cursor: "pointer" }}
            onClick={e => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
               seekTo(Math.max(0, Math.min(effectiveDuration, Math.round(((e.clientX - rect.left) / rect.width) * effectiveDuration))));
            }}
          >
            <div style={{
              height: "100%", width: `${pct * 100}%`,
              background: P.fill, borderRadius: 2,
              transition: "width .8s linear",
            }} />
            <div style={{
              position: "absolute", top: "50%", left: `${pct * 100}%`,
              transform: "translate(-50%,-50%)",
              width: S.thumb, height: S.thumb, borderRadius: "50%",
              background: light ? "var(--bp-primary)" : "#FFFFFF",
              boxShadow: P.thumbShadow,
              pointerEvents: "none",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: S.progressMT, fontSize: S.timeSize, color: P.time, fontWeight: light ? 600 : 500 }}>
            <span>{fmt(cur)}</span>
            <span>{fmt(effectiveDuration)}</span>
          </div>
        </div>

        {/* ── Contrôles ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 1px 0" }}>

          {/* Shuffle */}
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: S.iconPad, color: P.side, display: "flex" }}>
            <svg width={S.iconSize} height={S.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8"/>
              <line x1="4" y1="20" x2="21" y2="3"/>
              <polyline points="21 16 21 21 16 21"/>
              <line x1="15" y1="15" x2="21" y2="21"/>
            </svg>
          </button>

          {/* Précédent */}
          <button onClick={() => seekTo(0)} style={{ background: "none", border: "none", cursor: "pointer", padding: S.iconPad, color: P.mid, display: "flex" }}>
            <svg width={S.iconSize} height={S.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="19 20 9 12 19 4 19 20"/>
              <line x1="5" y1="19" x2="5" y2="5"/>
            </svg>
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setPlaying(p => !p)}
            style={{
              width: S.playBtn, height: S.playBtn, borderRadius: "50%",
              background: "transparent",
              border: `2px solid ${P.playBorder}`,
              animation: playing && glassmorphism ? "bp-glow 2s ease-in-out infinite" : "none",
              boxShadow: glassmorphism
                ? (playing
                  ? "0 0 0 2px rgba(139,92,246,.20), 0 0 16px rgba(139,92,246,.60)"
                  : "0 0 6px rgba(139,92,246,.30)")
                : (playing ? "0 0 0 4px rgba(34,197,94,.15)" : "0 1px 6px rgba(34,197,94,.25)"),
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: P.mid, flexShrink: 0,
              transition: "box-shadow .25s ease",
            }}
          >
            {playing ? (
              <svg width={light ? 20 : 15} height={light ? 20 : 15} viewBox="0 0 24 24" fill={P.playIcon}>
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width={light ? 20 : 15} height={light ? 20 : 15} viewBox="0 0 24 24" fill={P.playIcon}>
                <polygon points="6 3 20 12 6 21 6 3"/>
              </svg>
            )}
          </button>

          {/* Suivant */}
          <button onClick={() => seekTo(Math.min(cur + 30, total))} style={{ background: "none", border: "none", cursor: "pointer", padding: S.iconPad, color: P.mid, display: "flex" }}>
            <svg width={S.iconSize} height={S.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          </button>

          {/* Repeat */}
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: S.iconPad, color: P.side, display: "flex" }}>
            <svg width={S.iconSize} height={S.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
