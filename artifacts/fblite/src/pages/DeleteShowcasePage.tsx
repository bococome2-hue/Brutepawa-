import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ─── Palette ─────────────────────────────────────────────── */
const C = {
  green:      "var(--bp-primary)",
  darkGreen:  "var(--bp-primary-dark)",
  lightGreen: "#DCFCE7",
  white:      "#FFFFFF",
  black:      "#111827",
  gray:       "#6B7280",
  border:     "#E5E7EB",
  bubbleMine: "#C8E6B2",   // light green bubble (mine)
  bubbleMsg:  "#DCF8C6",   // the message being deleted
};

/* ─── Particles canvas ─────────────────────────────────────── */
function ParticleCanvas({ stage, w, h }: { stage: number; w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (stage < 3 || stage > 4) return;

    // Stage 3 = dense particles, stage 4 = sparse
    const count = stage === 3 ? 420 : 80;
    const alpha = stage === 3 ? 0.85 : 0.28;

    for (let i = 0; i < count; i++) {
      // Particles drift right + up from the bubble
      const ox = (Math.random() * 0.65 + 0.15) * w;
      const oy = (Math.random() * 0.7  + 0.08) * h;
      const spread = stage === 3 ? 1 : 2.4;
      const px = ox + (Math.random() - 0.2) * w * spread * 0.5;
      const py = oy + (Math.random() - 0.7) * h * spread * 0.45;
      const r  = Math.random() * (stage === 3 ? 2.2 : 1.4) + 0.5;
      const a  = (Math.random() * 0.6 + 0.35) * alpha;

      // Varied greens
      const greens = ["var(--bp-primary)","var(--bp-primary-dark)","#4ADE80","#86EFAC","#BBF7D0","#6EE7A0","#34D399"];
      ctx.globalAlpha = a;
      ctx.fillStyle   = greens[Math.floor(Math.random() * greens.length)];
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [stage, w, h]);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}
    />
  );
}

/* ─── Waveform bars ────────────────────────────────────────── */
function WaveBars({ mine }: { mine?: boolean }) {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const t = i / 28;
    const env = 0.3 + 0.7 * Math.pow(Math.sin(t * Math.PI), 0.6);
    const v = Math.abs(Math.sin(i * 1.31 + 7)) * 0.4 + Math.abs(Math.sin(i * 0.87 + 3)) * 0.35 + Math.abs(Math.sin(i * 2.1)) * 0.2;
    return Math.max(0.08, Math.min(1, v * env + 0.05));
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1, height: 20, flex: 1 }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2,
          height: `${Math.round(h * 100)}%`, minHeight: 2,
          background: mine ? "#86EFAC" : "#BBF7D0",
        }} />
      ))}
    </div>
  );
}

/* ─── Single phone frame ───────────────────────────────────── */
function Phone({ stage }: { stage: number }) {
  /* The message to delete:
     "Ah bon sérieux 😮 Mais nous allons fêter les membres 10 000 bientôt,
      promis d'ici 1 mois car dans 2 mois je vais lancer officiellement" */

  const msgVisible  = stage <= 3;
  const bubbleScale   = stage === 2 ? 0.97 : 1;
  const bubbleOpacity = stage === 2 ? 0.92 : stage === 3 ? 0.6 : stage === 4 ? 0.12 : stage >= 5 ? 0 : 1;
  const bubbleBlur    = stage === 2 ? "blur(3px)" : stage === 3 ? "blur(7px)" : "none";

  // Messages that appear only once the target is deleted (stage ≥ 5)
  const showPost = stage >= 5;

  return (
    <div style={{
      width: "100%", aspectRatio: "9/17",
      background: "var(--theme-surface)",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
      display: "flex", flexDirection: "column",
      fontSize: 6,
      position: "relative",
    }}>
      {/* Particle canvas — shown in stages 3 & 4 */}
      {(stage === 3 || stage === 4) && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none",
          overflow: "hidden",
        }}>
          {/* Positioned at the bubble location (~53% from top) */}
          <div style={{ position: "absolute", left: 8, right: 8, top: "50%", height: "16%", overflow: "visible" }}>
            <ParticleCanvas stage={stage} w={200} h={70} />
          </div>
        </div>
      )}

      {/* ── Status bar ── */}
      <div style={{
        padding: "6px 10px 3px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--theme-surface)",
      }}>
        <span style={{ fontWeight: 700, fontSize: 7, color: C.black, letterSpacing: -0.2 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          {/* Signal */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 0.8 }}>
            {[4,6,8,10].map((h, i) => (
              <div key={i} style={{ width: 2, height: h * 0.55, background: i < 3 ? C.black : "#D1D5DB", borderRadius: 1 }} />
            ))}
          </div>
          {/* Wifi */}
          <svg width="8" height="7" viewBox="0 0 20 15">
            <path d="M10 12a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill={C.black}/>
            <path d="M5.5 8.5C7 7 8.4 6.2 10 6.2s3 .8 4.5 2.3" stroke={C.black} strokeWidth="2" fill="none" strokeLinecap="round"/>
            <path d="M2 5C4.7 2.4 7.2 1 10 1s5.3 1.4 8 4" stroke={C.black} strokeWidth="2" fill="none" strokeLinecap="round"/>
          </svg>
          {/* Battery */}
          <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
            <div style={{ width: 14, height: 7, border: `1px solid ${C.black}`, borderRadius: 1.5, padding: 1, display: "flex", alignItems: "stretch" }}>
              <div style={{ width: "70%", background: C.black, borderRadius: 0.5 }} />
            </div>
            <div style={{ width: 2, height: 3.5, background: C.black, borderRadius: 0.5 }} />
          </div>
        </div>
      </div>

      {/* ── Chat header ── */}
      <div style={{
        padding: "4px 8px",
        display: "flex", alignItems: "center", gap: 5,
        borderBottom: `1px solid ${C.border}`,
        background: "var(--theme-surface)",
      }}>
        {/* Back arrow */}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        {/* Avatar */}
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 6.5, fontWeight: 800, flexShrink: 0,
        }}>SA</div>
        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 7.5, color: C.black, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Satiéla Ahouissoussi
          </div>
          <div style={{ fontSize: 5.5, color: C.gray }}>Hors ligne</div>
        </div>
        {/* Icons */}
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.02 1.17 2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/></svg>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.black} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1,
        background: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='0.04'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10S50 55.523 50 50zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10S10 15.523 10 10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundColor: "#ECF5E3",
        overflow: "hidden",
        padding: "4px 5px",
        display: "flex", flexDirection: "column", gap: 2,
        position: "relative",
      }}>
        {/* Msg 1 */}
        <MsgBubble text="Super cool" time="14:58" mine={false} />
        {/* Msg 2 */}
        <MsgBubble text={"Et c'est quoi encore ton score de confiance là ?"} time="14:58" mine={false} />
        {/* Audio */}
        <div style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 4,
          background: C.bubbleMine, borderRadius: "12px 12px 2px 12px",
          padding: "4px 5px 3px", maxWidth: "80%", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}>
          {/* Play */}
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: C.green,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="6" height="6" viewBox="0 0 10 10" fill="#fff"><polygon points="2,1 9,5 2,9"/></svg>
          </div>
          <WaveBars mine />
          <div style={{ fontSize: 4.5, color: "#166534", whiteSpace: "nowrap", flexShrink: 0 }}>
            0:33
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <span style={{ fontSize: 4.5, color: "#166534", letterSpacing: -0.2 }}>15:09</span>
            {/* double tick */}
            <svg width="8" height="5" viewBox="0 0 16 10" fill="none">
              <path d="M1 5l3 4L12 1" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 5l3 4 4-8" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {/* Msgs */}
        <MsgBubble text="D'accord" time="15:10" mine={true} />
        <MsgBubble text={"Maintenant j'aimerais fêter ça"} time="15:41" mine={true} />
        <MsgBubble text="Avec du pizza" time="16:03" mine={true} />

        {/* ── THE MESSAGE BEING DELETED ── */}
        <AnimatePresence>
          {stage < 5 && (
            <motion.div
              layout
              initial={false}
              animate={{
                scale:   bubbleScale,
                opacity: bubbleOpacity,
                filter:  bubbleBlur,
              }}
              exit={{
                scale:   0.92,
                opacity: 0,
                y: -4,
                transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
              }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
              style={{
                alignSelf: "flex-end",
                background: C.green,
                borderRadius: "12px 12px 2px 12px",
                padding: "4px 6px 3px",
                maxWidth: "88%",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                transformOrigin: "bottom right",
              }}
            >
              <div style={{ fontSize: 5.5, color: "#fff", lineHeight: 1.4, fontWeight: 500 }}>
                Ah bon sérieux 😮 Mais nous allons fêter les membres 10 000 bientôt, promis d'ici 1 mois car dans 2 mois je vais lancer officiellement
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2, marginTop: 2 }}>
                <span style={{ fontSize: 4, color: "rgba(255,255,255,0.85)", letterSpacing: -0.2 }}>16:21</span>
                <svg width="8" height="5" viewBox="0 0 16 10" fill="none">
                  <path d="M1 5l3 4L12 1" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 5l3 4 4-8" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post-deletion messages */}
        <MsgBubble text="D'accord c'est bien" time="16:48" mine={false} />
        <MsgBubble text={"Mr t'as pas oublié quelque chose par hasard 😅"} time="17:09" mine={false} />

        {/* Stage 5: reorganization arrows */}
        {stage === 5 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}
          >
            <svg width="14" height="10" viewBox="0 0 24 16" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 10 12 2 20 10"/>
              <polyline points="4 14 12 6 20 14"/>
            </svg>
          </motion.div>
        )}

        {/* Final msg */}
        <motion.div layout style={{ alignSelf: "flex-end" }}>
          <MsgBubble text={"Salut sati ah bon j'ai oublié un truc ?"} time="18:41" mine={true} check />
        </motion.div>
      </div>

      {/* ── Input bar ── */}
      <div style={{
        padding: "4px 6px",
        borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 4,
        background: "var(--theme-surface)",
      }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", border: `1.5px solid ${C.gray}`,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="6" height="6" viewBox="0 0 12 12" fill="none" stroke={C.gray} strokeWidth="1.5" strokeLinecap="round">
            <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
          </svg>
        </div>
        <div style={{ flex: 1, background: "#F3F4F6", borderRadius: 20, padding: "3px 7px",
          fontSize: 5.5, color: "#9CA3AF" }}>Écrire un message...</div>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: C.green,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </div>
      </div>
    </div>
  );
}

function MsgBubble({ text, time, mine, check }: { text: string; time: string; mine: boolean; check?: boolean }) {
  return (
    <motion.div layout style={{ alignSelf: mine ? "flex-end" : "flex-start", display: "flex", alignItems: "flex-end", gap: 2 }}>
      {!mine && (
        <div style={{ width: 11, height: 11, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 4, color: "#fff", fontWeight: 800, flexShrink: 0 }}>
          SA
        </div>
      )}
      <div style={{
        background: mine ? C.bubbleMine : "#fff",
        borderRadius: mine ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
        padding: "3px 5px 2px",
        maxWidth: 110,
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
      }}>
        <div style={{ fontSize: 5.5, color: mine ? "#166534" : C.black, lineHeight: 1.4 }}>{text}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1.5, marginTop: 1 }}>
          <span style={{ fontSize: 4, color: mine ? "#166534" : C.gray }}>{time}</span>
          {mine && (
            <svg width="7" height="4.5" viewBox="0 0 16 10" fill="none">
              <path d="M1 5l3 4L12 1" stroke={check ? C.green : C.gray} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              {check && <path d="M5 5l3 4 4-8" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>}
            </svg>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Geometric background shapes ──────────────────────────── */
function GeoShapes() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      viewBox="0 0 800 1200" preserveAspectRatio="xMidYMid slice">
      <circle cx="700" cy="900" r="320" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2"/>
      <circle cx="700" cy="900" r="220" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5"/>
      <circle cx="100" cy="1050" r="240" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      <circle cx="400" cy="700" r="400" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <circle cx="750" cy="650" r="180" fill="rgba(255,255,255,0.04)" stroke="none"/>
      <circle cx="60"  cy="950" r="130" fill="rgba(255,255,255,0.04)" stroke="none"/>
    </svg>
  );
}

/* ─── Stage metadata ────────────────────────────────────────── */
const STAGES = [
  { num: 1, title: "ÉTAT INITIAL",    sub: "Message visible" },
  { num: 2, title: "DÉCLENCHEMENT",   sub: "Flou progressif + réduction légère" },
  { num: 3, title: "DÉSINTÉGRATION",  sub: "Particules élégantes" },
  { num: 4, title: "DISPARITION",     sub: "Le message s'efface en douceur" },
  { num: 5, title: "RÉORGANISATION",  sub: "Les messages se réorganisent naturellement" },
  { num: 6, title: "ÉTAT FINAL",      sub: "Suppression complète" },
];

/* ─── Main page ─────────────────────────────────────────────── */
export default function DeleteShowcasePage() {
  return (
    <div style={{
      background: "linear-gradient(180deg, #ffffff 0%, #ffffff 24%, var(--bp-primary) 42%, var(--bp-primary-dark) 80%, var(--bp-primary-dark) 100%)",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative",
      minHeight: "100vh",
    }}>
      <GeoShapes />

      {/* ═══ HEADER CARD ═════════════════════════════════════ */}
      <div style={{
        position: "relative", zIndex: 2,
        margin: "0 auto",
        maxWidth: 900,
        padding: "0 20px",
      }}>
        <div style={{
          background: "var(--theme-surface)",
          borderRadius: "0 0 40px 40px",
          padding: "22px 28px 26px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          {/* Top row: logo left, app icon right */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 18, fontStyle: "italic" }}>B</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 17, color: C.black, letterSpacing: -0.3 }}>BrutePawa</span>
            </div>

            {/* App icon */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 64, height: 64,
                background: "#0D1117",
                borderRadius: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 24px rgba(34,197,94,0.55), 0 0 8px rgba(34,197,94,0.35)",
              }}>
                <span style={{ color: C.green, fontWeight: 900, fontSize: 34, fontStyle: "italic" }}>B</span>
                {/* Sparkle */}
                <span style={{ position: "absolute", marginLeft: 30, marginTop: -22, fontSize: 10 }}>✦</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 11, color: C.black }}>BrutePawa</span>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1 }}>
              <span style={{ color: C.green }}>SUPPRESSION</span>
              <span style={{ color: C.black }}> DE MESSAGE</span>
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.gray, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Animation ultra premium
            </p>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Fluide", "Élégant", "Rapide", "Naturel"].map(b => (
              <div key={b} style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "var(--theme-surface)",
                border: `1.5px solid ${C.border}`,
                borderRadius: 100,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: C.black,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="8 12 11 15 16 9"/>
                </svg>
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PHONES GRID ═════════════════════════════════════ */}
      <div style={{
        position: "relative", zIndex: 2,
        maxWidth: 900, margin: "0 auto",
        padding: "28px 20px 8px",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px 16px",
      }}>
        {STAGES.map(s => (
          <div key={s.num} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Phone stage={s.num} />
            {/* Legend */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: C.green,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 1,
              }}>
                <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>{s.num}</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 11, color: "#fff", letterSpacing: 0.3 }}>{s.title}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.80)", lineHeight: 1.4, marginTop: 1 }}>{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ FOOTER ══════════════════════════════════════════ */}
      <div style={{
        position: "relative", zIndex: 2,
        maxWidth: 900, margin: "24px auto 32px",
        padding: "0 20px",
      }}>
        <div style={{
          background: C.darkGreen,
          borderRadius: 24,
          padding: "20px 28px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}>
          {[
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              ),
              title: "100% SÉCURISÉ",
              desc:  "Vos données sont protégées",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              ),
              title: "PERFORMANCE",
              desc:  "Animation 60fps ultra fluide",
            },
            {
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              ),
              title: "EXPÉRIENCE PREMIUM",
              desc:  "Conçu pour vous",
            },
          ].map(item => (
            <div key={item.title} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
              {item.icon}
              <div style={{ fontWeight: 800, fontSize: 12, color: "#fff", letterSpacing: 0.4 }}>{item.title}</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
