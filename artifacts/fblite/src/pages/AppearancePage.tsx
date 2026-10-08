import { useState } from "react";
import { useNavigate } from "../router";
import { useAppearance, type Theme, type FontSize, type PrimaryColor } from "../contexts/AppearanceContext";

/* ── Constants ──────────────────────────────────────────────── */
const THEMES: { key: Theme; label: string }[] = [
  { key: "light",  label: "Clair"   },
  { key: "dark",   label: "Sombre"  },
  { key: "system", label: "Système" },
];

const COLORS: { v: PrimaryColor; label: string }[] = [
  { v: "#22C55E", label: "Vert"   },
  { v: "#3B82F6", label: "Bleu"   },
  { v: "#EF4444", label: "Rouge"  },
  { v: "#8B5CF6", label: "Violet" },
  { v: "#F97316", label: "Orange" },
  { v: "#EC4899", label: "Rose"   },
];

const SIZES: { key: FontSize; label: string; px: number }[] = [
  { key: "small",  label: "Petite",  px: 13 },
  { key: "medium", label: "Moyenne", px: 16 },
  { key: "large",  label: "Grande",  px: 20 },
];

/* ── Theme tokens per mode ───────────────────────────────────── */
type Mode = "light" | "dark";
function resolveMode(theme: Theme): Mode {
  if (theme === "light") return "light";
  if (theme === "dark")  return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
const T = {
  light: { bg: "#F2F2F7", card: "#FFFFFF", text: "#111827", sub: "#6B7280", border: "#E5E7EB", muted: "#9CA3AF" },
  dark:  { bg: "#111827", card: "#1F2937", text: "#F9FAFB", sub: "#9CA3AF", border: "#374151", muted: "#6B7280" },
};

/* ── Mini phone thumbnail ────────────────────────────────────── */
function PhoneThumbnail({ themeKey, accent }: { themeKey: Theme; accent: string }) {
  const isDark = themeKey === "dark";
  const bg     = isDark ? "#1F2937" : "#FFFFFF";
  const line   = isDark ? "#374151" : "#E5E7EB";

  if (themeKey === "system") {
    return (
      <div style={{ width: 52, height: 68, borderRadius: 10, overflow: "hidden", border: "1.5px solid #E5E7EB", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        {/* Left half: light */}
        <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%", background: "#FFFFFF" }}>
          <div style={{ height: 9, background: accent, opacity: 0.9 }} />
          <div style={{ margin: "5px 4px 0", height: 4, background: "#111827", borderRadius: 2, opacity: 0.15 }} />
          <div style={{ margin: "3px 4px 0", height: 4, background: "#111827", borderRadius: 2, opacity: 0.1, width: "70%" }} />
        </div>
        {/* Right half: dark */}
        <div style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%", background: "#1F2937" }}>
          <div style={{ height: 9, background: accent, opacity: 0.9 }} />
          <div style={{ margin: "5px 4px 0", height: 4, background: "#F9FAFB", borderRadius: 2, opacity: 0.2 }} />
          <div style={{ margin: "3px 4px 0", height: 4, background: "#F9FAFB", borderRadius: 2, opacity: 0.12, width: "70%" }} />
        </div>
        {/* Diagonal separator */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,transparent 49.5%,rgba(0,0,0,0.18) 49.5%,rgba(0,0,0,0.18) 50.5%,transparent 50.5%)" }} />
      </div>
    );
  }

  return (
    <div style={{ width: 52, height: 68, borderRadius: 10, overflow: "hidden", border: `1.5px solid ${line}`, background: bg, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
      <div style={{ height: 9, background: accent, opacity: 0.9 }} />
      <div style={{ margin: "5px 4px 0", height: 4, background: isDark ? "#F9FAFB" : "#111827", borderRadius: 2, opacity: isDark ? 0.2 : 0.14 }} />
      <div style={{ margin: "3px 4px 0", height: 4, background: isDark ? "#F9FAFB" : "#111827", borderRadius: 2, opacity: isDark ? 0.12 : 0.09, width: "70%" }} />
      <div style={{ margin: "6px 4px 0", display: "flex", gap: 3, alignItems: "flex-start" }}>
        <div style={{ width: 14, height: 14, borderRadius: 3, background: isDark ? "#374151" : "#E5E7EB", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 3, background: isDark ? "#F9FAFB" : "#111827", borderRadius: 1, opacity: isDark ? 0.15 : 0.1, marginBottom: 2 }} />
          <div style={{ height: 3, background: isDark ? "#F9FAFB" : "#111827", borderRadius: 1, opacity: isDark ? 0.1 : 0.07, width: "80%" }} />
        </div>
      </div>
    </div>
  );
}

/* ── Preview card ─────────────────────────────────────────────── */
function PreviewCard({ mode, accent, fontSize }: { mode: Mode; accent: string; fontSize: FontSize }) {
  const tk = T[mode];
  const nameSize = fontSize === "small" ? 13 : fontSize === "large" ? 17 : 15;
  return (
    <div style={{ background: tk.card, borderRadius: 20, border: `2px solid ${accent}`, padding: "16px 16px 14px", marginBottom: 14, transition: "background 0.3s, border-color 0.3s" }}>
      {/* APERÇU label */}
      <div style={{ fontSize: 10, fontWeight: 700, color: tk.muted, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 12 }}>APERÇU</div>
      {/* Logo + name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>B</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: nameSize, color: tk.text, transition: "font-size 0.2s, color 0.3s" }}>BrutePawa</div>
          <div style={{ fontSize: 11, color: tk.sub, marginTop: 2 }}>Réseau social panafricain</div>
        </div>
      </div>
      {/* Accent bar */}
      <div style={{ height: 7, background: accent, borderRadius: 99, opacity: 0.9, marginBottom: 6 }} />
      {/* Gray placeholder lines */}
      <div style={{ height: 6, background: tk.border, borderRadius: 99, marginBottom: 5, width: "75%" }} />
      <div style={{ height: 6, background: tk.border, borderRadius: 99, width: "55%", marginBottom: 12 }} />
      {/* Media row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 40, height: 36, borderRadius: 8, background: tk.border, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: tk.border, flexShrink: 0 }} />
            <div style={{ height: 5, background: tk.border, borderRadius: 99, width: "40%" }} />
          </div>
          <div style={{ height: 5, background: tk.border, borderRadius: 99, width: "90%", marginBottom: 3, opacity: 0.7 }} />
          <div style={{ height: 5, background: tk.border, borderRadius: 99, width: "65%", opacity: 0.5 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function AppearancePage() {
  const navigate = useNavigate();
  const { prefs, setPrefs, save, saving, saved } = useAppearance();

  /* Local draft state — only committed on "Enregistrer" */
  const [draft, setDraft] = useState({ ...prefs });

  const mode  = resolveMode(draft.theme);
  const tk    = T[mode];
  const color = draft.primaryColor;

  const update = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) =>
    setDraft(d => ({ ...d, [k]: v }));

  const handleSave = async () => {
    setPrefs(draft);
    await save(draft); // passe draft directement pour éviter la capture du vieux state
  };

  return (
    <div style={{ background: tk.bg, minHeight: "100dvh", fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", transition: "background 0.3s" }}>

      {/* ── Header ── */}
      <div style={{ background: tk.card, borderBottom: `1px solid ${tk.border}`, height: 56, display: "flex", alignItems: "center", padding: "0 4px", position: "sticky", top: 0, zIndex: 30, transition: "background 0.3s, border-color 0.3s" }}>
        <button onClick={() => navigate("/settings")} aria-label="Retour"
          style={{ width: 44, height: 44, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={tk.text} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex: 1, fontWeight: 700, fontSize: 17, color: tk.text, margin: 0, textAlign: "center" }}>Apparence</h1>
        <button aria-label="Menu" style={{ width: 44, height: 44, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tk.muted} strokeWidth="2.1" strokeLinecap="round">
            <circle cx="12" cy="5"  r="1.2" fill={tk.muted} stroke="none"/>
            <circle cx="12" cy="12" r="1.2" fill={tk.muted} stroke="none"/>
            <circle cx="12" cy="19" r="1.2" fill={tk.muted} stroke="none"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: "14px 14px 40px" }}>

        {/* ── Preview card ── */}
        <PreviewCard mode={mode} accent={color} fontSize={draft.fontSize} />

        {/* ── Thème ── */}
        <div style={{ background: tk.card, borderRadius: 20, padding: "16px 16px 18px", marginBottom: 12, transition: "background 0.3s" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: tk.text, marginBottom: 14 }}>Thème</div>
          <div style={{ display: "flex", gap: 10 }}>
            {THEMES.map(t => {
              const sel = draft.theme === t.key;
              return (
                <button key={t.key} onClick={() => update("theme", t.key)}
                  aria-pressed={sel}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 6px 14px", borderRadius: 16, border: sel ? `2px solid ${color}` : `1.5px solid ${tk.border}`, background: sel ? (mode === "dark" ? "#1a2e1a" : "#F0FDF4") : tk.bg, cursor: "pointer", transition: "all 0.2s" }}>
                  <PhoneThumbnail themeKey={t.key} accent={color} />
                  <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? color : tk.sub }}>{t.label}</span>
                  {sel && (
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Couleur principale ── */}
        <div style={{ background: tk.card, borderRadius: 20, padding: "16px 16px 18px", marginBottom: 12, transition: "background 0.3s" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: tk.text, marginBottom: 14 }}>Couleur principale</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {COLORS.map(cl => {
              const sel = draft.primaryColor === cl.v;
              return (
                <button key={cl.v} onClick={() => update("primaryColor", cl.v)}
                  aria-pressed={sel} title={cl.label}
                  style={{ width: 44, height: 44, borderRadius: "50%", background: cl.v, border: sel ? "2.5px solid #fff" : "2px solid transparent", boxShadow: sel ? `0 0 0 2.5px ${cl.v}, 0 3px 10px ${cl.v}55` : "0 2px 6px rgba(0,0,0,0.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s", flexShrink: 0 }}>
                  {sel && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Taille du texte ── */}
        <div style={{ background: tk.card, borderRadius: 20, padding: "16px 16px 18px", marginBottom: 20, transition: "background 0.3s" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: tk.text, marginBottom: 4 }}>Taille du texte</div>
          <div style={{ fontSize: 12, color: tk.muted, marginBottom: 14 }}>Choisissez la taille de lecture confortable</div>
          <div style={{ display: "flex", gap: 10 }}>
            {SIZES.map(s => {
              const sel = draft.fontSize === s.key;
              return (
                <button key={s.key} onClick={() => update("fontSize", s.key)}
                  aria-pressed={sel}
                  style={{ flex: 1, padding: "12px 6px 13px", borderRadius: 14, border: sel ? `2px solid ${color}` : `1.5px solid ${tk.border}`, background: sel ? (mode === "dark" ? "#1a2e1a" : "#F0FDF4") : tk.bg, cursor: "pointer", textAlign: "center", transition: "all 0.18s" }}>
                  <div style={{ fontSize: s.px, fontWeight: 700, color: sel ? color : tk.sub, transition: "font-size 0.2s, color 0.2s", lineHeight: 1.2 }}>Aa</div>
                  <div style={{ fontSize: 11, color: sel ? color : tk.muted, fontWeight: sel ? 700 : 400, marginTop: 5 }}>{s.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Save button ── */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ width: "100%", padding: "16px", borderRadius: 18, background: saved ? "#16A34A" : `linear-gradient(135deg, #16A34A, #22C55E)`, border: "none", color: "#fff", fontWeight: 700, fontSize: 16, cursor: saving ? "default" : "pointer", boxShadow: "0 6px 20px rgba(34,197,94,0.35)", opacity: saving ? 0.8 : 1, transition: "all 0.2s", letterSpacing: "-0.1px" }}>
          {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}
