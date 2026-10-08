import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/* ── Global helpers ───────────────────────────────────────────── */
export function openImageViewer(src: string) {
  document.dispatchEvent(new CustomEvent("bp:open-image", { detail: { src } }));
}

function dist(a: Touch, b: Touch) {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}
function mid(a: Touch, b: Touch) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

export default function ImageViewer() {
  const [src, setSrc] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  /* drag + pinch state */
  const startRef   = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinchRef   = useRef<{ dist: number; scale: number; mx: number; my: number } | null>(null);
  const swipeRef   = useRef<{ startY: number; startTy: number; moved: boolean } | null>(null);
  const lastTapRef = useRef<number>(0);
  const wrapRef    = useRef<HTMLDivElement>(null);

  /* open/close */
  const open  = useCallback((s: string) => { setSrc(s); setScale(1); setTx(0); setTy(0); }, []);
  const close = useCallback(() => { setSrc(null); setScale(1); setTx(0); setTy(0); }, []);

  useEffect(() => {
    const h = (e: Event) => open((e as CustomEvent<{src:string}>).detail.src);
    document.addEventListener("bp:open-image", h);
    return () => document.removeEventListener("bp:open-image", h);
  }, [open]);

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, close]);

  /* clamp pan so image stays visible */
  const clamp = useCallback((s: number, x: number, y: number): [number,number] => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxX = Math.max(0, (vw * s - vw) / 2);
    const maxY = Math.max(0, (vh * s - vh) / 2);
    return [Math.min(maxX, Math.max(-maxX, x)), Math.min(maxY, Math.max(-maxY, y))];
  }, []);

  /* ── TOUCH HANDLERS ─────────────────────────────────────────── */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      /* pinch start */
      const [a, b] = [e.touches[0], e.touches[1]];
      const m = mid(a, b);
      pinchRef.current = { dist: dist(a, b), scale, mx: m.x, my: m.y };
      swipeRef.current = null;
      startRef.current = null;
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const now = Date.now();
      /* double tap */
      if (now - lastTapRef.current < 300) {
        lastTapRef.current = 0;
        if (scale > 1) {
          setScale(1); setTx(0); setTy(0);
        } else {
          const newScale = 2.5;
          const rect = wrapRef.current?.getBoundingClientRect();
          const cx = t.clientX - (rect?.left ?? 0) - (rect?.width ?? window.innerWidth) / 2;
          const cy = t.clientY - (rect?.top  ?? 0) - (rect?.height ?? window.innerHeight) / 2;
          const [nx, ny] = clamp(newScale, -cx * (newScale - 1), -cy * (newScale - 1));
          setScale(newScale); setTx(nx); setTy(ny);
        }
        return;
      }
      lastTapRef.current = now;
      if (scale > 1) {
        /* pan drag */
        startRef.current  = { x: t.clientX, y: t.clientY, tx, ty };
        swipeRef.current  = null;
      } else {
        /* swipe-to-close */
        swipeRef.current  = { startY: t.clientY, startTy: ty, moved: false };
        startRef.current  = null;
      }
    }
  }, [scale, tx, ty, clamp]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const d  = dist(a, b);
      const p  = pinchRef.current;
      const ns = Math.min(6, Math.max(1, p.scale * (d / p.dist)));
      const [nx, ny] = clamp(ns, tx, ty);
      setScale(ns); setTx(nx); setTy(ny);
      return;
    }
    if (e.touches.length === 1 && startRef.current) {
      e.preventDefault();
      const t  = e.touches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      const [nx, ny] = clamp(scale, startRef.current.tx + dx, startRef.current.ty + dy);
      setTx(nx); setTy(ny);
      return;
    }
    if (e.touches.length === 1 && swipeRef.current) {
      const t  = e.touches[0];
      const dy = t.clientY - swipeRef.current.startY;
      swipeRef.current.moved = Math.abs(dy) > 8;
      setTy(dy);
    }
  }, [scale, tx, ty, clamp]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    pinchRef.current = null;
    if (swipeRef.current?.moved) {
      const dy = ty;
      if (Math.abs(dy) > 100) {
        close();
      } else {
        setTy(0);
      }
      swipeRef.current = null;
      return;
    }
    swipeRef.current = null;
    startRef.current = null;
    if (e.changedTouches.length === 0 && scale < 1.05) {
      setScale(1); setTx(0); setTy(0);
    }
  }, [ty, close, scale]);

  /* ── MOUSE WHEEL zoom (desktop) ─────────────────────────────── */
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const ns = Math.min(6, Math.max(1, scale * factor));
    const [nx, ny] = clamp(ns, tx * (ns / scale), ty * (ns / scale));
    setScale(ns); setTx(nx); setTy(ny);
  }, [scale, tx, ty, clamp]);

  if (!src) return null;

  const backdropOpacity = scale > 1 ? 1 : Math.max(0.15, 1 - Math.abs(ty) / 300);

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: `rgba(0,0,0,${backdropOpacity})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        touchAction: "none", userSelect: "none",
        transition: ty === 0 ? "background 0.2s" : "none",
      }}
      onClick={e => { if (e.target === e.currentTarget && scale <= 1) close(); }}
    >
      {/* Top bar: close + download */}
      <div style={{ position: "fixed", top: 18, right: 18, zIndex: 1, display: "flex", gap: 10 }}>
        {/* Download */}
        <button
          onClick={async () => {
            try {
              const res  = await fetch(src!);
              const blob = await res.blob();
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement("a");
              a.href     = url;
              a.download = `brutepawa-photo.jpg`;
              a.click();
              URL.revokeObjectURL(url);
            } catch {
              window.open(src!, "_blank");
            }
          }}
          title="Télécharger"
          style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)",
          }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        {/* Close */}
        <button
          onClick={close}
          style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(6px)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Zoom reset hint */}
      {scale > 1 && (
        <button
          onClick={() => { setScale(1); setTx(0); setTy(0); }}
          style={{
            position: "fixed", top: 18, left: 18, zIndex: 1,
            height: 34, borderRadius: 20, padding: "0 14px",
            background: "rgba(0,0,0,0.55)", border: "none", cursor: "pointer",
            color: "#fff", fontSize: 12.5, fontWeight: 600,
            backdropFilter: "blur(6px)", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3.5 12h17M3.5 6h17M3.5 18h17"/>
          </svg>
          Réinitialiser
        </button>
      )}

      {/* Image wrapper */}
      <div
        ref={wrapRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            maxWidth: "100vw",
            maxHeight: "100dvh",
            objectFit: "contain",
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: pinchRef.current || startRef.current || swipeRef.current?.moved
              ? "none"
              : "transform 0.22s ease",
            pointerEvents: "none",
            display: "block",
          }}
        />
      </div>

      {/* Bottom hint */}
      {scale <= 1 && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500,
          pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          Pincer pour zoomer · Double-tap · Glisser pour fermer
        </div>
      )}
    </div>,
    document.body
  );
}
