import { useState, useRef, useEffect, useCallback } from "react";

export interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}

type RecordState = "recording" | "locked" | "cancelled" | "preview";
const MAX_DURATION = 60;

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// Pre-seeded waveform for preview display (consistent look)
function makeWaveBars(count: number, seed: number): number[] {
  const bars: number[] = [];
  let x = seed;
  for (let i = 0; i < count; i++) {
    x = (x * 1664525 + 1013904223) & 0xffffffff;
    const base = ((x >>> 0) % 32) + 4;
    bars.push(base);
  }
  return bars;
}
const WAVE_BARS = makeWaveBars(40, 0xdeadbeef);

export default function VoiceRecorder({ onSend, onCancel, disabled }: VoiceRecorderProps) {
  const [state, setState]       = useState<RecordState>("recording");
  const [elapsed, setElapsed]   = useState(0);
  const [blob, setBlob]         = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Live waveform (AnalyserNode data)
  const [liveBars, setLiveBars] = useState<number[]>(Array(30).fill(5));

  // Slide gesture (swipe left to cancel, swipe up to lock)
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const dragStartRef      = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef     = useRef(false);

  // Preview player
  const [playing, setPlaying]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [previewDur, setPreviewDur] = useState(0);

  // Refs
  const mediaRef     = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef     = useRef(0);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const analyserRef  = useRef<AnalyserNode | null>(null);
  const animRef      = useRef(0);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  const stopAnim = () => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = 0; }
  };

  const runWaveform = () => {
    if (!analyserRef.current) return;
    const an = analyserRef.current;
    const data = new Uint8Array(an.frequencyBinCount);
    const draw = () => {
      an.getByteFrequencyData(data);
      const step = Math.max(1, Math.floor(data.length / 30));
      const bars = Array.from({ length: 30 }, (_, i) => {
        const v = data[i * step] ?? 0;
        return Math.max(4, Math.round((v / 255) * 36));
      });
      setLiveBars(bars);
      animRef.current = requestAnimationFrame(draw);
    };
    animRef.current = requestAnimationFrame(draw);
  };

  const stopRecordingFinal = useCallback((cancelled = false) => {
    stopTimer();
    stopAnim();
    audioCtxRef.current?.close();
    if (!mediaRef.current) return;
    const mr = mediaRef.current;
    if (cancelled) {
      mr.ondataavailable = null;
      mr.onstop = () => {};
    }
    if (mr.state !== "inactive") mr.stop();
    mr.stream?.getTracks().forEach(t => t.stop());
  }, []);

  // Auto-start recording when mounted
  useEffect(() => {
    if (disabled) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        startRef.current = Date.now();
        setElapsed(0);

        // Web Audio waveform
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"]
          .find(m => MediaRecorder.isTypeSupported(m)) ?? "";
        const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
        mediaRef.current = mr;

        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          audioCtxRef.current?.close();
          stopAnim();
          const rec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
          const dur = Math.min(rec, MAX_DURATION);
          const b = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
          setBlob(b);
          setDuration(dur);
          setPreviewDur(dur);
          setState("preview");
        };

        mr.start(100);
        runWaveform();

        timerRef.current = setInterval(() => {
          const s = Math.min(Math.round((Date.now() - startRef.current) / 1000), MAX_DURATION);
          setElapsed(s);
          if (s >= MAX_DURATION) {
            stopTimer();
            mediaRef.current?.stop();
          }
        }, 100);

      } catch {
        setError("Microphone non accessible. Vérifiez les autorisations.");
        setTimeout(() => onCancel?.(), 2000);
      }
    })();

    return () => { stopTimer(); stopAnim(); };
  }, []);

  // Gesture: pointer handlers on the recording bar area
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDragX(Math.min(0, dx));
    setDragY(Math.min(0, dy));
  };
  const onPointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const dx = dragX;
    const dy = dragY;
    setDragX(0); setDragY(0);
    dragStartRef.current = null;

    if (dx < -70) {
      // Slide to cancel
      setState("cancelled");
      stopRecordingFinal(true);
      setLiveBars(Array(30).fill(4));
      setTimeout(() => onCancel?.(), 600);
    } else if (dy < -70) {
      // Slide up → lock
      setState("locked");
    } else {
      // Normal release → stop and preview
      stopRecordingFinal(false);
    }
  };

  const doStop = () => stopRecordingFinal(false);

  const doCancel = () => {
    setState("cancelled");
    stopRecordingFinal(true);
    setLiveBars(Array(30).fill(4));
    setTimeout(() => onCancel?.(), 600);
  };

  // Preview player
  const getPreviewAudio = () => {
    if (!audioRef.current && blob) {
      const a = new Audio(URL.createObjectURL(blob));
      a.preload = "metadata";
      a.onloadedmetadata = () => setPreviewDur(a.duration);
      a.ontimeupdate = () => {
        setCurrentTime(a.currentTime);
        setProgress(a.duration ? a.currentTime / a.duration : 0);
      };
      a.onended = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const togglePlay = () => {
    const a = getPreviewAudio();
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else         { a.play().catch(() => {}); setPlaying(true); }
  };

  const seekPreview = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = getPreviewAudio();
    if (!a?.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * a.duration;
  };

  const discard = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setBlob(null); setDuration(0); setPlaying(false); setProgress(0);
    onCancel?.();
  };

  const handleSend = async () => {
    if (!blob || sending) return;
    setSending(true);
    try {
      await onSend(blob, duration);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur envoi");
      setSending(false);
    }
  };

  const slideLeft  = Math.abs(dragX)  > 40;
  const slideUp    = Math.abs(dragY)  > 40;
  const cancelHint = Math.abs(dragX)  > 60;
  const lockHint   = Math.abs(dragY)  > 60;
  const pct        = (elapsed / MAX_DURATION) * 100;
  const nearEnd    = elapsed >= MAX_DURATION - 8;

  /* ─────────── CANCELLED ─────────── */
  if (state === "cancelled") {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "2px 4px" }}>
        <span style={{ fontSize: 20 }}>🗑</span>
        <span style={{ fontSize: 13, color: "#aaa", fontStyle: "italic", animation: "voiceFadeOut 0.6s forwards" }}>
          Enregistrement annulé
        </span>
      </div>
    );
  }

  /* ─────────── RECORDING / LOCKED ─────────── */
  if (state === "recording" || state === "locked") {
    const isLocked = state === "locked";
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, touchAction: "none", userSelect: "none" }}>

        {/* Lock badge */}
        {isLocked && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 6px" }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-primary)" }}>Verrouillé — Appuyez ■ pour terminer</span>
          </div>
        )}

        {/* Lock hint while dragging up */}
        {!isLocked && slideUp && !slideLeft && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, animation: "voiceFadeIn 0.2s ease" }}>
            <span style={{ fontSize: 16, animation: lockHint ? "voiceBounce 0.5s infinite" : "none" }}>🔒</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: lockHint ? "var(--bp-primary)" : "#888" }}>
              {lockHint ? "Relâchez pour verrouiller" : "↑ Glisser pour verrouiller"}
            </span>
          </div>
        )}

        {/* Main recording row */}
        <div
          onPointerDown={!isLocked ? onPointerDown : undefined}
          onPointerMove={!isLocked ? onPointerMove : undefined}
          onPointerUp={!isLocked ? onPointerUp : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 8, flex: 1,
            transform: `translateX(${dragX * 0.35}px)`,
            transition: isDraggingRef.current ? "none" : "transform 0.2s ease",
            cursor: isLocked ? "default" : "grab",
          }}
        >
          {/* Pulsing red dot */}
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444", flexShrink: 0, animation: "voicePulse 1s ease-in-out infinite" }} />

          {/* Timer */}
          <span style={{ fontWeight: 700, fontSize: 14, color: "#EF4444", minWidth: 38, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {fmtTime(elapsed)}
          </span>

          {/* Live waveform or cancel text */}
          {slideLeft && !isLocked ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: cancelHint ? "#EF4444" : "#888" }}>
                {cancelHint ? "🗑 Relâchez pour annuler" : "← Glisser pour annuler"}
              </span>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, height: 38, overflow: "hidden" }}>
              {liveBars.map((h, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: h,
                  minHeight: 4,
                  maxHeight: 36,
                  background: "#EF4444",
                  borderRadius: 2,
                  transition: "height 0.08s ease",
                  opacity: 0.55 + Math.min(0.45, (h / 36) * 0.45),
                }} />
              ))}
            </div>
          )}

          {/* Cancel / Lock buttons (not locked) */}
          {!isLocked && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button onClick={doCancel} title="Annuler"
                style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>✕</button>
              <button onClick={() => setState("locked")} title="Verrouiller"
                style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bp-primary)" }}>🔒</button>
              <button onClick={doStop} title="Arrêter et prévisualiser"
                style={{ background: "#EF4444", border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 2px 10px rgba(229,57,53,0.45)", animation: "voiceGlow 2s ease-in-out infinite" }}>■</button>
            </div>
          )}

          {/* Just stop in locked mode */}
          {isLocked && (
            <button onClick={doStop} title="Terminer et prévisualiser"
              style={{ background: "#EF4444", border: "none", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", boxShadow: "0 2px 10px rgba(229,57,53,0.45)", animation: "voiceGlow 2s ease-in-out infinite", flexShrink: 0 }}>■</button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#EF4444", borderRadius: 3, transition: "width 0.1s linear" }} />
        </div>

        {/* Countdown near end */}
        {nearEnd && (
          <div style={{ textAlign: "right", fontSize: 11, fontWeight: 800, color: "#EF4444", animation: "voicePulse 0.8s infinite" }}>
            {MAX_DURATION - elapsed}s
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: "#EF4444" }}>{error}</div>}
      </div>
    );
  }

  /* ─────────── PREVIEW ─────────── */
  const remaining = Math.max(0, previewDur - currentTime);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, animation: "voiceFadeIn 0.3s ease" }}>

      {/* Preview card */}
      <div style={{
        background: "linear-gradient(135deg, #F8FAFC 0%, #F0FDF4 100%)",
        borderRadius: 18, padding: "12px 14px", border: "1px solid #DCFCE7",
        boxShadow: "0 2px 12px rgba(66,183,42,0.12)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🎤</div>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", flex: 1 }}>Vocal enregistré</span>
          <span style={{ fontSize: 12, color: "#64748B", fontVariantNumeric: "tabular-nums" }}>{fmtTime(previewDur)}</span>
        </div>

        {/* Player row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={togglePlay}
            style={{ background: "var(--bp-primary)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", color: "#fff", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(66,183,42,0.45)", transition: "transform 0.1s", }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.9)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {/* Waveform seek bar */}
          <div onClick={seekPreview} title="Cliquer pour chercher"
            style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, height: 32, cursor: "pointer", position: "relative" }}>
            {WAVE_BARS.map((h, i) => {
              const barPct = i / WAVE_BARS.length;
              const active  = barPct <= progress;
              const playing_and_near = playing && Math.abs(barPct - progress) < 0.05;
              return (
                <div key={i} style={{
                  flex: 1,
                  height: active ? h : Math.max(4, h * 0.5),
                  background: active ? "var(--bp-primary)" : "#CBD5E1",
                  borderRadius: 3,
                  transition: "height 0.15s ease, background 0.15s ease",
                  animation: playing_and_near ? "voicePulse 0.5s infinite" : "none",
                }} />
              );
            })}
          </div>

          <span style={{ fontSize: 12, color: "#64748B", minWidth: 36, textAlign: "right", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
            {playing ? `-${fmtTime(remaining)}` : fmtTime(previewDur)}
          </span>
        </div>

        {error && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{error}</div>}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={discard}
          style={{ background: "#F1F5F9", border: "none", borderRadius: 24, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#64748B", display: "flex", alignItems: "center", gap: 5, transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#E5E7EB")}
          onMouseLeave={e => (e.currentTarget.style.background = "#F1F5F9")}
        >
          🗑 Supprimer
        </button>
        <button onClick={handleSend} disabled={sending}
          style={{ background: sending ? "#a5d6a7" : "var(--bp-primary)", border: "none", borderRadius: 24, padding: "8px 20px", cursor: sending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 5, boxShadow: sending ? "none" : "0 2px 10px rgba(66,183,42,0.4)", transition: "transform 0.1s, box-shadow 0.1s" }}
          onMouseDown={e => { if (!sending) e.currentTarget.style.transform = "scale(0.96)"; }}
          onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {sending ? "⏳ Envoi…" : "📤 Envoyer"}
        </button>
      </div>
    </div>
  );
}
