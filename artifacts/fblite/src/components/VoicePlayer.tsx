import { useState, useRef } from "react";

interface Props {
  url: string;
  duration: number | null;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Deterministic waveform from URL hash (so same voice = same bars every render)
function makeWaveBars(url: string, count: number): number[] {
  let seed = 0;
  for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) & 0x7fffffff;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    bars.push(Math.max(4, (seed % 28) + 4));
  }
  return bars;
}

const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

export default function VoicePlayer({ url, duration }: Props) {
  const [playing, setPlaying]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [current, setCurrent]     = useState(0);
  const [totalDur, setTotalDur]   = useState<number>(duration ?? 0);
  const [showReact, setShowReact] = useState(false);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [reactCount, setReactCount] = useState<Record<string, number>>({});
  const [speed, setSpeed]         = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars     = makeWaveBars(url, 38);

  const getAudio = () => {
    if (!audioRef.current) {
      const a = new Audio(url);
      a.preload = "metadata";
      a.playbackRate = speed;
      a.onloadedmetadata = () => setTotalDur(a.duration);
      a.ontimeupdate = () => {
        setCurrent(a.currentTime);
        setProgress(a.duration ? a.currentTime / a.duration : 0);
      };
      a.onended = () => { setPlaying(false); setProgress(0); setCurrent(0); };
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const togglePlay = () => {
    const a = getAudio();
    if (playing) { a.pause(); setPlaying(false); }
    else { a.playbackRate = speed; a.play().catch(() => {}); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = getAudio();
    if (!a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const pickReaction = (emoji: string) => {
    setReactCount(prev => {
      const next = { ...prev };
      if (myReaction) next[myReaction] = Math.max(0, (next[myReaction] ?? 1) - 1);
      if (myReaction === emoji) { setMyReaction(null); return next; }
      next[emoji] = (next[emoji] ?? 0) + 1;
      setMyReaction(emoji);
      return next;
    });
    setShowReact(false);
  };

  const remaining = Math.max(0, totalDur - current);
  const totalReacts = Object.values(reactCount).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200, maxWidth: 280 }}>

      {/* Main player bubble */}
      <div style={{
        background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
        borderRadius: 18, padding: "10px 12px",
        border: "1px solid #DCFCE7",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        {/* Row 1: play button + waveform + time */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={togglePlay}
            style={{
              background: playing ? "#36A420" : "var(--bp-primary)",
              border: "none", borderRadius: "50%",
              width: 38, height: 38, cursor: "pointer",
              color: "#fff", fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: playing ? "0 0 0 4px rgba(66,183,42,0.2)" : "0 2px 8px rgba(66,183,42,0.35)",
              transition: "box-shadow 0.15s, background 0.15s",
            }}
            aria-label={playing ? "Pause" : "Lire"}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {/* Waveform seek */}
          <div onClick={seek}
            style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 1.5, height: 30, cursor: "pointer" }}>
            {bars.map((h, i) => {
              const barPct  = i / bars.length;
              const active  = barPct <= progress;
              const atCursor = playing && Math.abs(barPct - progress) < 0.04;
              return (
                <div key={i} style={{
                  flex: 1,
                  height: active ? h : Math.max(3, h * 0.45),
                  background: active ? "var(--bp-primary)" : "#94A3B8",
                  borderRadius: 2,
                  transition: "height 0.12s ease, background 0.12s ease",
                  animation: atCursor && playing ? "voicePulse 0.6s infinite" : "none",
                }} />
              );
            })}
          </div>

          <span style={{ fontSize: 11, color: "#64748B", minWidth: 34, textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {playing ? `-${fmtTime(remaining)}` : fmtTime(totalDur)}
          </span>
        </div>

        {/* Row 2: speed + mic icon + reaction summary */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#888" }}>🎤</span>
          <button onClick={cycleSpeed}
            style={{ background: "rgba(66,183,42,0.1)", border: "none", borderRadius: 12, padding: "2px 8px", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "var(--bp-primary)" }}>
            {speed === 1 ? "1×" : speed === 1.5 ? "1.5×" : "2×"}
          </button>
          <div style={{ flex: 1 }} />
          {totalReacts > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {Object.entries(reactCount).filter(([, c]) => c > 0).map(([em, c]) => (
                <span key={em} style={{ fontSize: 12 }}>{em}</span>
              ))}
              <span style={{ fontSize: 11, color: "#64748B" }}>{totalReacts}</span>
            </div>
          )}
        </div>
      </div>

      {/* Reaction bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {/* Reaction picker toggle */}
        <button onClick={() => setShowReact(!showReact)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#64748B", padding: "2px 4px", borderRadius: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
          {myReaction ?? "😊"} <span style={{ fontSize: 10 }}>▾</span>
        </button>

        {/* Inline reactions */}
        {showReact && (
          <div style={{ display: "flex", gap: 2, background: "var(--theme-surface)", borderRadius: 20, padding: "4px 8px", boxShadow: "0 2px 12px rgba(0,0,0,0.18)", animation: "voiceFadeIn 0.15s ease" }}>
            {REACTIONS.map(em => (
              <button key={em} onClick={() => pickReaction(em)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "0 2px", transition: "transform 0.1s", lineHeight: 1 }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.35)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              >{em}</button>
            ))}
          </div>
        )}

        {!showReact && (
          <span style={{ fontSize: 11, color: "#aaa", fontStyle: "italic" }}>
            {playing ? "En lecture…" : "Tap ▶ pour écouter"}
          </span>
        )}
      </div>
    </div>
  );
}
