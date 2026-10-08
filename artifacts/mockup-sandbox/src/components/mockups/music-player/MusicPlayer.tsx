import { useState, useEffect, useRef } from "react";

// 56 waveform bars — pattern réaliste inspiré de la maquette
const WAVE_BARS = [
  4,6,9,13,18,23,30,35,38,34,28,22,32,37,40,37,30,24,19,27,
  33,38,36,30,24,19,15,21,28,34,39,40,37,31,25,20,29,36,40,38,
  32,25,19,15,11,15,21,30,37,40,37,31,24,19,7,4,
];

const TOTAL = 208; // 3:28
const INIT  = 84;  // 1:24

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
}

export function MusicPlayer() {
  const [playing, setPlaying] = useState(true);
  const [cur, setCur]         = useState(INIT);
  const [liked, setLiked]     = useState(false);
  const iv = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      iv.current = setInterval(() => setCur(s => s < TOTAL ? s + 1 : (setPlaying(false), 0)), 1000);
    } else {
      if (iv.current) clearInterval(iv.current);
    }
    return () => { if (iv.current) clearInterval(iv.current); };
  }, [playing]);

  const pct = cur / TOTAL; // 0..1

  return (
    <div style={{
      fontFamily: "'Inter','-apple-system','BlinkMacSystemFont','Segoe UI',sans-serif",
      background: "#111827",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 20,
    }}>
      <style>{`
        @keyframes wavePulse {
          from { transform: scaleY(1); }
          to   { transform: scaleY(1.55); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(139,92,246,0.2), 0 0 18px rgba(139,92,246,0.55); }
          50%     { box-shadow: 0 0 0 5px rgba(139,92,246,0.3), 0 0 28px rgba(139,92,246,0.75); }
        }
      `}</style>

      {/* ── Post card ─────────────────────────────────────── */}
      <div style={{ width: 390, background: "#1A1F2E" }}>

        {/* Header */}
        <div style={{ padding: "14px 14px 0", display: "flex", alignItems: "flex-start", gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: "radial-gradient(circle at 40% 35%, #A0640A, #5C3006)",
            border: "2px solid #22C55E",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>🐻</div>

          {/* Meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + tagged */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0 4px", lineHeight: 1.4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>Pat Pat</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#22C55E" style={{ marginBottom: -2 }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>avec</span>
              <span style={{ fontSize: 12, color: "#22C55E", fontWeight: 600 }}>Abdoul Hassim</span>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>,</span>
              <span style={{ fontSize: 12, color: "#22C55E", fontWeight: 600 }}>parak ushv</span>
            </div>
            {/* Mood */}
            <div style={{ fontSize: 12.5, color: "#9CA3AF", marginTop: 1 }}>
              est <span style={{ fontSize: 14 }}>😔</span> <em>Fatigué</em>
            </div>
            {/* Time */}
            <div style={{ fontSize: 11.5, color: "#6B7280", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 12 }}>🌐</span> À l'instant
            </div>
          </div>

          {/* ··· and ✕ */}
          <div style={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#6B7280", fontSize: 18, letterSpacing: 1 }}>···</button>
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: "#6B7280", fontSize: 15, fontWeight: 700 }}>✕</button>
          </div>
        </div>

        {/* Content text */}
        <div style={{ padding: "10px 14px 0", fontSize: 15, color: "#FFFFFF", lineHeight: 1.5 }}>
          Parle moi bien
        </div>

        {/* ── Music Player ──────────────────────────────── */}
        <div style={{
          margin: "10px 14px 14px",
          background: "#160720",
          borderRadius: 14,
          border: "1px solid rgba(168,85,247,0.28)",
          boxShadow: "0 0 0 1px rgba(168,85,247,0.08), 0 8px 32px rgba(139,92,246,0.20)",
          padding: "14px 14px 12px",
          overflow: "hidden",
        }}>

          {/* Top row: album | info | heart */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>

            {/* Album art */}
            <div style={{
              width: 82, height: 82, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(160deg,#C4472A 0%,#8B3010 45%,#5C1A06 100%)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "flex-end",
              padding: "6px 4px",
              overflow: "hidden",
              position: "relative",
            }}>
              {/* Silhouette suggestion */}
              <div style={{
                position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
                width: 50, height: 60,
                background: "radial-gradient(ellipse at 50% 30%, rgba(255,200,150,0.7) 0%, rgba(180,80,20,0.4) 60%, transparent 80%)",
                borderRadius: "50% 50% 30% 30%",
              }} />
              <div style={{
                fontSize: 5.5, fontWeight: 900, color: "#FFFFFF",
                textAlign: "center", letterSpacing: 1.2, lineHeight: 1.25,
                zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              }}>
                ASAKE · H.E.R.
              </div>
              <div style={{
                fontSize: 5, fontWeight: 700, color: "rgba(255,255,255,0.9)",
                textAlign: "center", letterSpacing: 0.8, lineHeight: 1.3,
                zIndex: 1, marginTop: 2,
              }}>
                LONELY<br/>AT THE TOP<br/>— REMIX
              </div>
            </div>

            {/* Info + waveform */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              {/* Track title */}
              <div style={{ fontWeight: 700, fontSize: 14.5, color: "#FFFFFF", lineHeight: 1.3, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Lonely At The Top (Remix)
              </div>
              {/* Artist */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#9CA3AF", marginBottom: 8 }}>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Asake &amp; H.E.R.</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#3B82F6" style={{ flexShrink: 0 }}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              {/* Waveform */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 36 }}>
                {WAVE_BARS.map((h, i) => {
                  const barPct  = i / WAVE_BARS.length;
                  const active  = barPct <= pct;
                  // animate only bars near the playhead (±3 bars) when playing
                  const nearTip = playing && Math.abs(barPct - pct) < 0.06;
                  return (
                    <div key={i} style={{
                      width: 2.5,
                      height: h * 0.88,
                      borderRadius: 2,
                      background: active
                        ? (nearTip ? "#C084FC" : "#A855F7")
                        : "rgba(139,92,246,0.22)",
                      flexShrink: 0,
                      transformOrigin: "center bottom",
                      animation: nearTip
                        ? `wavePulse ${0.38 + (i % 5) * 0.06}s ease-in-out infinite alternate`
                        : "none",
                    }} />
                  );
                })}
              </div>
            </div>

            {/* Heart */}
            <button onClick={() => setLiked(l => !l)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: 2, flexShrink: 0, alignSelf: "flex-start",
            }}>
              <svg width="21" height="21" viewBox="0 0 24 24"
                fill={liked ? "#A855F7" : "none"}
                stroke={liked ? "#A855F7" : "rgba(168,85,247,0.55)"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{ position: "relative", height: 3, background: "rgba(139,92,246,0.18)", borderRadius: 3, cursor: "pointer" }}
              onClick={e => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                setCur(Math.max(0, Math.min(TOTAL, Math.round(((e.clientX - rect.left) / rect.width) * TOTAL))));
              }}
            >
              {/* Played track */}
              <div style={{
                height: "100%", width: `${pct * 100}%`,
                background: "#8B5CF6", borderRadius: 3,
                transition: "width 0.8s linear",
              }} />
              {/* Thumb */}
              <div style={{
                position: "absolute", top: "50%", left: `${pct * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 11, height: 11, borderRadius: "50%",
                background: "#FFFFFF",
                boxShadow: "0 0 0 2px rgba(139,92,246,0.4), 0 0 10px rgba(139,92,246,0.8)",
                pointerEvents: "none",
              }} />
            </div>
            {/* Times */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              marginTop: 7, fontSize: 11, color: "#6B7280", fontWeight: 500,
            }}>
              <span>{fmt(cur)}</span>
              <span>{fmt(TOTAL)}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 2px 0" }}>

            {/* Shuffle */}
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#7C3AED", display: "flex" }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"/>
                <line x1="4" y1="20" x2="21" y2="3"/>
                <polyline points="21 16 21 21 16 21"/>
                <line x1="15" y1="15" x2="21" y2="21"/>
              </svg>
            </button>

            {/* Skip back */}
            <button onClick={() => setCur(0)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#FFFFFF", display: "flex" }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="19 20 9 12 19 4 19 20"/>
                <line x1="5" y1="19" x2="5" y2="5"/>
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => setPlaying(p => !p)}
              style={{
                width: 54, height: 54, borderRadius: "50%",
                background: "transparent",
                border: "2px solid #8B5CF6",
                animation: playing ? "glowPulse 2s ease-in-out infinite" : "none",
                boxShadow: playing
                  ? "0 0 0 3px rgba(139,92,246,0.2), 0 0 20px rgba(139,92,246,0.6)"
                  : "0 0 8px rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "#FFFFFF", flexShrink: 0,
                transition: "box-shadow 0.25s ease",
              }}
            >
              {playing ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" rx="1"/>
                  <rect x="14" y="4" width="4" height="16" rx="1"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <polygon points="6 3 20 12 6 21 6 3"/>
                </svg>
              )}
            </button>

            {/* Skip forward */}
            <button onClick={() => setCur(s => Math.min(s + 30, TOTAL))} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#FFFFFF", display: "flex" }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"/>
                <line x1="19" y1="5" x2="19" y2="19"/>
              </svg>
            </button>

            {/* Repeat */}
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "#7C3AED", display: "flex" }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"/>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: "0 14px 6px", display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#9CA3AF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 16 }}>🤎</span><span style={{ fontSize: 16 }}>❤️</span><span style={{ fontSize: 16 }}>🤎</span>
            <span style={{ marginLeft: 2 }}>1,2K</span>
          </div>
          <span>128 commentaires</span>
          <span>56 partages</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", borderTop: "1px solid rgba(34,197,94,0.12)" }}>
          {[
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>, label: "J'aime" },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: "Commenter" },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>, label: "Partager" },
          ].map(({ icon, label }) => (
            <button key={label} style={{ flex: 1, background: "none", border: "none", padding: "12px 4px", fontSize: 13, color: "#9CA3AF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
