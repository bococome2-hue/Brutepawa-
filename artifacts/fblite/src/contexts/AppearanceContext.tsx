import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Theme      = "light" | "dark" | "system";
export type FontSize   = "small" | "medium" | "large";
export type PrimaryColor = "#22C55E" | "#3B82F6" | "#EF4444" | "#8B5CF6" | "#F97316" | "#EC4899";

export interface AppearancePrefs {
  theme:        Theme;
  primaryColor: PrimaryColor;
  fontSize:     FontSize;
}

const DEFAULTS: AppearancePrefs = { theme: "system", primaryColor: "#22C55E", fontSize: "medium" };
const LS_KEY = "bp_appearance";

function loadLocal(): AppearancePrefs {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "light")  return "light";
  if (theme === "dark")   return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const FONT_SCALE: Record<FontSize, string> = { small: "13px", medium: "15px", large: "17px" };

const DARKEN: Record<string, string> = {
  "#22C55E": "#16A34A", "#3B82F6": "#2563EB", "#EF4444": "#DC2626",
  "#8B5CF6": "#7C3AED", "#F97316": "#EA580C", "#EC4899": "#DB2777",
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

/** Convert hex → [H°, S%, L%] */
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Convert [H°, S%, L%] → hex */
function hslToHex(h: number, s: number, l: number): string {
  const sl = s / 100, ll = l / 100;
  const a = sl * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Derive the full green micro-nuance token set from any primary hex */
function computeGreenTokens(primary: string): Record<string, string> {
  const [h, s, l] = hexToHsl(primary);
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  return {
    // Gradient stops — plage plus large pour être clairement visible à l'œil nu
    "--bp-green-soft":     hslToHex(h, clamp(s - 4, 0, 100),     clamp(l + 11, 10, 94)), // + clair (top gradient)
    "--bp-green-subtle":   hslToHex(h, clamp(s + 4, 0, 100),     clamp(l - 8,  5,  88)), // + sombre (bottom gradient)
    "--bp-green-surface":  hslToHex(h, clamp(s - 35, 8, 60),     clamp(l + 50, 90, 97)), // fond très pâle
    "--bp-green-border":   hslToHex(h, clamp(s - 15, 20, 75),    clamp(l + 30, 75, 92)), // bordure légère
    "--bp-green-hover":    hslToHex(h, s,                         clamp(l - 7,  5,  85)), // hover discret
    "--bp-green-pressed":  hslToHex(h, clamp(s + 5, 0, 100),     clamp(l - 13, 5,  80)), // pressé profond
    "--bp-green-disabled": hslToHex(h, clamp(s - 40, 8, 50),     clamp(l + 22, 70, 92)), // désactivé atténué
    "--bp-green-strong":   hslToHex(h, clamp(s + 5, 0, 100),     clamp(l - 16, 5,  75)), // fort / sombre
    "--bp-green-inset":    `rgba(255,255,255,0.20)`,                                       // reflet interne bouton (renforcé)
    "--bp-green-shadow":   `rgba(${hexToRgb(primary)},0.32)`,                             // ombre douce
  };
}

function applyToDOM(prefs: AppearancePrefs) {
  const resolved  = resolveTheme(prefs.theme);
  const primary   = prefs.primaryColor;
  const dark      = DARKEN[primary] ?? primary;
  const rgb       = hexToRgb(primary);
  const isDark    = resolved === "dark";
  const root      = document.documentElement;

  root.setAttribute("data-bp-theme", resolved);

  /* ── Primary color vars ─────────────────── */
  root.style.setProperty("--bp-primary",       primary);
  root.style.setProperty("--bp-primary-dark",  dark);
  root.style.setProperty("--bp-primary-rgb",   rgb);
  root.style.setProperty("--bp-font-base",     FONT_SCALE[prefs.fontSize]);

  /* ── Theme surface/text vars (used by converted inline styles) ── */
  root.style.setProperty("--theme-bg",      isDark ? "#111827" : "#F2F2F7");
  root.style.setProperty("--theme-surface", isDark ? "#1F2937" : "#FFFFFF");
  root.style.setProperty("--theme-text",    isDark ? "#F9FAFB" : "#111827");
  root.style.setProperty("--theme-text2",   isDark ? "#9CA3AF" : "#6B7280");
  root.style.setProperty("--theme-border",  isDark ? "#374151" : "#E5E7EB");
  root.style.setProperty("--theme-muted",   isDark ? "#6B7280" : "#9CA3AF");

  /* ── Green micro-nuance tokens (computed from primary) ─────────── */
  const greenTokens = computeGreenTokens(primary);
  for (const [k, v] of Object.entries(greenTokens)) {
    root.style.setProperty(k, v);
  }

  /* ── Legacy CSS vars (keeps existing CSS working) ─────────────── */
  root.style.setProperty("--fb-blue",            primary);
  root.style.setProperty("--fb-blue-dark",        dark);
  root.style.setProperty("--fb-blue-light",      `rgba(${rgb},0.12)`);
  root.style.setProperty("--fb-green",            primary);
  root.style.setProperty("--fb-green-dark",       dark);
  root.style.setProperty("--fb-border",          `rgba(${rgb},0.15)`);
  root.style.setProperty("--fb-divider",         `rgba(${rgb},0.12)`);

  /* ── App background & text (dark mode full layout) ─────────────── */
  root.style.setProperty("--fb-bg",              isDark ? "#111827" : "#FFFFFF");
  root.style.setProperty("--fb-white",            isDark ? "#1F2937" : "#FFFFFF");
  root.style.setProperty("--fb-text",             isDark ? "#F9FAFB" : "#111827");
  root.style.setProperty("--fb-text-secondary",   isDark ? "#9CA3AF" : "#6B7280");
  root.style.setProperty("--fb-input",            isDark ? "#374151" : "#F3F4F6");
  root.style.setProperty("--fb-sheet",            isDark ? "#1F2937" : "#FFFFFF");
  root.style.setProperty("--glass-header",        isDark
    ? "rgba(17,24,39,0.92)"
    : "rgba(255,255,255,0.92)");

  /* Body baseline */
  document.body.style.backgroundColor = isDark ? "#111827" : "";
  document.body.style.color           = isDark ? "#F9FAFB" : "";

  /* ── Font size on html ──────────────────── */
  root.style.fontSize = FONT_SCALE[prefs.fontSize];

  /* ── Dark mode override style tag ───────── */
  _injectDarkStyles(isDark, rgb, primary, dark);
}

/** Inject/remove a <style> tag that uses !important to cover
 *  inline-styled elements not yet converted to CSS vars. */
function _injectDarkStyles(isDark: boolean, rgb: string, primary: string, primaryDark: string) {
  const id = "bp-dark-override";
  let el = document.getElementById(id) as HTMLStyleElement | null;

  if (!isDark) {
    el?.remove();
    return;
  }

  if (!el) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }

  el.textContent = `
    /* ── BrutePawa dark-mode override ──────────────────────────────────── */
    body { background-color: #111827 !important; color: #F9FAFB !important; }

    /* Layout structural backgrounds */
    #root { background-color: #111827; }

    /* Scrollbar */
    ::-webkit-scrollbar-track { background: #111827 !important; }
    ::-webkit-scrollbar-thumb { background: rgba(${rgb},0.35) !important; }

    /* Cards, modals, panels — elements that still use hardcoded white */
    [class*="modal"], [class*="sheet"], [class*="panel"],
    [class*="card"], [class*="sidebar"], [class*="drawer"] {
      background-color: #1F2937 !important;
      color: #F9FAFB !important;
      border-color: #374151 !important;
    }

    /* Inputs and textareas */
    input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
    textarea, select {
      background-color: #374151 !important;
      color: #F9FAFB !important;
      border-color: #4B5563 !important;
    }
    input::placeholder, textarea::placeholder { color: #6B7280 !important; }

    /* Borders that are still light-grey */
    hr { border-color: #374151 !important; }
  `;
}

/* ── API helpers ─────────────────────────────────────────── */
async function apiGet(): Promise<AppearancePrefs | null> {
  try {
    const base  = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const token = localStorage.getItem("bp_token");
    if (!token) return null;
    const r = await fetch(`${base}/api/preferences`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function apiSave(prefs: AppearancePrefs): Promise<boolean> {
  try {
    const base  = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const token = localStorage.getItem("bp_token");
    if (!token) return false;
    const r = await fetch(`${base}/api/preferences`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify(prefs),
    });
    return r.ok;
  } catch { return false; }
}

/* ── Context ─────────────────────────────────────────────── */
interface AppearanceCtx {
  prefs:    AppearancePrefs;
  setPrefs: (p: AppearancePrefs) => void;
  save:     (prefsToSave?: AppearancePrefs) => Promise<boolean>;
  saving:   boolean;
  saved:    boolean;
}

const Ctx = createContext<AppearanceCtx>({
  prefs: DEFAULTS, setPrefs: () => {}, save: async () => false, saving: false, saved: false,
});

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [prefs,  setPrefsState] = useState<AppearancePrefs>(loadLocal);
  const [saving, setSaving]     = useState(false);
  const [saved,  setSaved]      = useState(false);

  /* Apply immediately on every pref change */
  useEffect(() => { applyToDOM(prefs); }, [prefs]);

  /* Re-apply on OS dark/light switch when theme = "system" */
  useEffect(() => {
    const mq      = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (prefs.theme === "system") applyToDOM(prefs); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [prefs]);

  /* On mount: server preferences override local ones */
  useEffect(() => {
    apiGet().then(remote => {
      if (remote) {
        const merged = { ...DEFAULTS, ...remote };
        setPrefsState(merged);
        localStorage.setItem(LS_KEY, JSON.stringify(merged));
      }
    });
  }, []);

  const setPrefs = useCallback((p: AppearancePrefs) => {
    setPrefsState(p);
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  }, []);

  const save = useCallback(async (prefsToSave?: AppearancePrefs): Promise<boolean> => {
    setSaving(true);
    const ok = await apiSave(prefsToSave ?? prefs);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
    return ok;
  }, [prefs]);

  return <Ctx.Provider value={{ prefs, setPrefs, save, saving, saved }}>{children}</Ctx.Provider>;
}

export function useAppearance() { return useContext(Ctx); }
