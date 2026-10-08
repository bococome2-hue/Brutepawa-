import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "../router";
import { apiLogin, saveFbUser, setBpToken } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { getPopularLanguages, searchLanguages, type Language } from "../services/languageService";
import { detectRegion, detectRegionFast, getLanguageForRegion } from "../services/regionService";

/* ─── Language Bottom Sheet ─────────────────────────────────── */
function LanguageSheet({ current, onSelect, onClose, regionFlag, regionName }: {
  current: Language;
  onSelect: (l: Language) => void;
  onClose: () => void;
  regionFlag?: string;
  regionName?: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = query.trim() ? searchLanguages(query) : getPopularLanguages();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  return createPortal(
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)", animation: "fadeIn .2s ease",
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9001,
        background: "#052e16", border: "1px solid rgba(34,197,94,0.15)",
        borderRadius: "28px 28px 0 0", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        animation: "slideUpSheet .3s cubic-bezier(.32,.72,0,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 5, background: "rgba(255,255,255,0.15)", borderRadius: 99 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px 10px" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.5" stroke="var(--bp-primary)" strokeWidth="1.5"/>
            <ellipse cx="10" cy="10" rx="3.5" ry="8.5" stroke="var(--bp-primary)" strokeWidth="1.5"/>
            <path d="M2 7h16M2 13h16" stroke="var(--bp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Choisir une langue</span>
        </div>
        <div style={{ padding: "0 14px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "0 14px", height: 42, border: "1px solid rgba(255,255,255,0.08)" }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#64748B" strokeWidth="1.5"/>
              <path d="M10 10l3 3" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher une langue"
              style={{ flex: 1, border: "none", background: "none", fontSize: 14, color: "#fff", outline: "none", fontFamily: "inherit" }}
            />
            {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>}
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "0 8px" }}>
          {results.map(lang => (
            <button key={lang.code} onClick={() => { onSelect(lang); onClose(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, height: 54, padding: "0 12px", borderRadius: 12, background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "background .12s", fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(34,197,94,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>{lang.flag}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "#E5E7EB" }}>{lang.nameNative}</span>
              {lang.code === current.code && (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3.5 9l4 4L14.5 5" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
          {results.length === 0 && (
            <div style={{ textAlign: "center", padding: "28px 0", color: "#64748B", fontSize: 14 }}>Aucune langue trouvée</div>
          )}
        </div>
        {(regionFlag || regionName) && (
          <div style={{ padding: "10px 20px 28px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(34,197,94,0.15)", borderRadius: 12, padding: "11px 14px", background: "rgba(34,197,94,0.06)" }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1.5C5.57 1.5 4 3.07 4 5s3.5 8 3.5 8 3.5-5.93 3.5-8c0-1.93-1.57-3.5-3.5-3.5z" stroke="var(--bp-primary)" strokeWidth="1.3"/>
                <circle cx="7.5" cy="5" r="1.2" stroke="var(--bp-primary)" strokeWidth="1.2"/>
              </svg>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>📍 Pays détecté automatiquement</span>
              <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: "var(--bp-primary)", display: "flex", alignItems: "center", gap: 5 }}>
                {regionFlag} {regionName}
              </span>
            </div>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

/* ─── Globe SVG ─────────────────────────────────────────────── */
function Globe() {
  return (
    <svg viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "115%", height: "auto", display: "block" }} preserveAspectRatio="xMidYMin slice">
      <defs>
        <radialGradient id="globeGlow" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor="var(--bp-primary)" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="var(--bp-primary)" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="globeCenter" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#052e16" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* Outer ellipse — globe outline */}
      <ellipse cx="200" cy="320" rx="190" ry="190" stroke="rgba(34,197,94,0.25)" strokeWidth="1"/>
      {/* Latitude lines */}
      {[260, 300, 340, 380].map((y, i) => {
        const r = Math.sqrt(Math.max(0, 190 * 190 - (y - 320) * (y - 320)));
        return r > 0 ? (
          <ellipse key={i} cx="200" cy={y} rx={r} ry={r * 0.28} stroke="rgba(34,197,94,0.18)" strokeWidth="0.8"/>
        ) : null;
      })}
      {/* Longitude lines */}
      {[-70, -35, 0, 35, 70].map((angle, i) => (
        <ellipse key={i} cx="200" cy="320" rx={190 * Math.abs(Math.cos(angle * Math.PI / 180)) + 1} ry="190"
          stroke="rgba(34,197,94,0.15)" strokeWidth="0.8"
          style={{ transform: `rotate(${angle}deg)`, transformOrigin: "200px 320px" }}
        />
      ))}
      {/* Network dots */}
      {[
        [80, 272], [130, 258], [175, 248], [225, 248], [270, 255], [310, 268],
        [60, 295], [110, 282], [160, 272], [200, 268], [250, 272], [300, 283],
        [100, 310], [155, 295], [200, 290], [248, 296], [295, 310],
        [150, 315], [200, 312], [245, 316],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="var(--bp-primary)" fillOpacity={0.7 - i * 0.02} />
      ))}
      {/* Network connections */}
      {[
        [80, 272, 130, 258], [130, 258, 175, 248], [175, 248, 225, 248], [225, 248, 270, 255],
        [270, 255, 310, 268], [60, 295, 110, 282], [110, 282, 160, 272], [160, 272, 200, 268],
        [200, 268, 250, 272], [250, 272, 300, 283], [100, 310, 155, 295], [155, 295, 200, 290],
        [200, 290, 248, 296], [130, 258, 110, 282], [175, 248, 160, 272], [225, 248, 200, 268],
        [270, 255, 250, 272], [200, 268, 200, 290], [155, 295, 150, 315], [200, 290, 200, 312],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--bp-primary)" strokeOpacity="0.35" strokeWidth="0.8"/>
      ))}
      {/* Glowing pulse dots */}
      {[[175, 248], [200, 268], [250, 272]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="none" stroke="var(--bp-primary)" strokeOpacity="0.4" strokeWidth="1">
          <animate attributeName="r" values="3;8;3" dur={`${2 + i * 0.7}s`} repeatCount="indefinite"/>
          <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur={`${2 + i * 0.7}s`} repeatCount="indefinite"/>
        </circle>
      ))}
      <rect width="400" height="220" fill="url(#globeGlow)"/>
    </svg>
  );
}

/* ─── Main Login Page ─────────────────────────────────────────── */
export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showLangSheet, setShowLangSheet] = useState(false);
  /* ── Fast sync init: timezone → instant display ── */
  const fastRegion = detectRegionFast();
  const [lang, setLang]         = useState<Language>(() => getLanguageForRegion(fastRegion));
  const [regionFlag, setRegionFlag] = useState<string>(fastRegion.countryFlag || "🌍");
  const [regionName, setRegionName] = useState<string>(fastRegion.countryName || "");
  const navigate = useNavigate();

  /* ── Async refine: IP-based / Cloudflare (updates silently if different) ── */
  useEffect(() => {
    detectRegion(false).then(region => {
      if (region.source !== "timezone" && region.source !== "browser") {
        setLang(getLanguageForRegion(region));
        setRegionFlag(region.countryFlag || "🌍");
        setRegionName(region.countryName || "");
      }
    }).catch(() => {});
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true); setError("");
    try {
      const { token, user } = await apiLogin(email, password);
      setBpToken(token); saveFbUser(user);
      trackEvent("login_success", { method: "password" });
      const redirect = sessionStorage.getItem("bp_redirect");
      sessionStorage.removeItem("bp_redirect");
      navigate(redirect && redirect !== "/login" && redirect !== "/register" ? redirect : "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Identifiants incorrects.");
    } finally { setLoading(false); }
  }, [email, password, navigate]);

  return (
    <div style={{
      minHeight: "100dvh", height: "100dvh",
      background: "linear-gradient(160deg, #0F172A 0%, #052e16 60%, #0F172A 100%)",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: "relative", overflowX: "hidden", overflowY: "auto",
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes glowPulse { 0%,100% { opacity: .7; } 50% { opacity: 1; } }
        @keyframes arcMove { 0%,100% { transform: translateX(0) rotate(-28deg); } 50% { transform: translateX(12px) rotate(-26deg); } }
        @keyframes floatParticle { 0%,100% { transform: translateY(0); opacity: .6; } 50% { transform: translateY(-8px); opacity: 1; } }
        .lf { display: flex; width: 100%; box-sizing: border-box; height: 56px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; align-items: center; gap: 0; transition: border-color .2s, box-shadow .2s; }
        .lf:focus-within { border-color: rgba(34,197,94,.5); box-shadow: 0 0 0 3px rgba(34,197,94,.12); }
        .lf input { flex:1; height:100%; background:none; border:none; outline:none; font-size:14px; color:#fff; font-family:inherit; padding: 0 14px 0 0; }
        .lf input::placeholder { color:#64748B; }
        .btn-connect { width:100%; height:60px; background:linear-gradient(135deg,var(--bp-primary) 0%,var(--bp-primary-dark) 100%); border:none; border-radius:30px; color:#fff; font-size:17px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 0 28px rgba(34,197,94,.45), 0 4px 16px rgba(0,0,0,.3); transition:transform .15s,box-shadow .15s; font-family:inherit; letter-spacing:.1px; }
        .btn-connect:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 0 36px rgba(34,197,94,.55),0 6px 20px rgba(0,0,0,.4); }
        .btn-connect:active:not(:disabled) { transform:scale(.97); }
        .btn-connect:disabled { background:linear-gradient(135deg,var(--bp-primary-dark) 0%,#052e16 100%); box-shadow:none; cursor:not-allowed; }
        .btn-register { width:100%; height:52px; background:transparent; border:1px solid rgba(255,255,255,.12); border-radius:26px; color:rgba(255,255,255,.85); font-size:15px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:background .15s,border-color .15s; font-family:inherit; }
        .btn-register:hover { background:rgba(255,255,255,.05); border-color:rgba(34,197,94,.35); }
        .btn-register:active { transform:scale(.98); }
      `}</style>

      {/* ── Deep background glow ── */}
      <div style={{ position: "fixed", top: -60, right: -40, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.22) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: 80, right: 20, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Giant "B" background ── */}
      <div style={{
        position: "fixed", top: "-5%", left: "-8%",
        fontSize: "130vw", fontWeight: 900, lineHeight: 1,
        color: "rgba(34,197,94,0.06)", pointerEvents: "none", zIndex: 0,
        userSelect: "none", fontFamily: "Arial Black, sans-serif",
        letterSpacing: "-0.05em",
      }}>B</div>

      {/* ── Neon arc ── */}
      <div style={{ position: "fixed", top: "18%", right: "-5%", width: "60%", height: 3, background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.6), rgba(74,222,128,0.3), transparent)", borderRadius: 2, transform: "rotate(-28deg)", animation: "arcMove 6s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Floating particles ── */}
      {[[12,22, 1.6], [88,45, 1.2], [20,60, 1.8], [75,30, 1.4], [50,15, 1.0], [35,75, 1.6]].map(([x, y, size], i) => (
        <div key={i} style={{
          position: "fixed", left: `${x}%`, top: `${y}%`,
          width: size, height: size, borderRadius: "50%",
          background: "var(--bp-primary)", boxShadow: `0 0 ${size * 3}px rgba(34,197,94,0.8)`,
          animation: `floatParticle ${3 + i * 0.5}s ease-in-out infinite`,
          animationDelay: `${i * 0.4}s`, pointerEvents: "none", zIndex: 0,
        }} />
      ))}

      {/* ── Globe at bottom ── */}
      <div style={{ position: "fixed", bottom: -10, left: "50%", transform: "translateX(-50%)", width: "115%", zIndex: 0, pointerEvents: "none", opacity: 0.9 }}>
        <Globe />
      </div>

      {/* ── Main content ── */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        width: "100%", maxWidth: 480,
        /* padding-bottom = hauteur du sélecteur de langue + marge */
        paddingBottom: "clamp(90px, 16vh, 110px)",
        animation: "fadeInUp .4s ease",
      }}>

        {/* Logo */}
        <div style={{ marginTop: "clamp(24px,4vh,52px)", marginBottom: "clamp(4px,1vh,10px)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <img src="/logo.png" alt="BrutePawa" style={{ width: "clamp(62px,14vw,82px)", height: "clamp(62px,14vw,82px)", objectFit: "contain", filter: "drop-shadow(0 0 16px rgba(34,197,94,0.5))", animation: "glowPulse 3s ease-in-out infinite" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: "clamp(17px,4.5vw,22px)", fontWeight: 800, letterSpacing: "-0.3px", lineHeight: 1 }}>
            <span style={{ color: "#fff" }}>Brute</span><span style={{ color: "var(--bp-primary)" }}>Pawa</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "clamp(2px,.8vh,6px)" }}>
          <div style={{ fontSize: "clamp(30px,8vw,52px)", fontWeight: 900, color: "#fff", lineHeight: 1.1, letterSpacing: "-1px" }}>Connectez-vous</div>
          <div style={{ fontSize: "clamp(30px,8vw,52px)", fontWeight: 900, color: "var(--bp-primary)", lineHeight: 1.1, letterSpacing: "-1px" }}>au monde.</div>
        </div>

        {/* Description */}
        <p style={{ textAlign: "center", fontSize: "clamp(13px,3.5vw,15px)", color: "#9CA3AF", margin: "0 0 clamp(10px,2vh,16px)", padding: "0 24px", lineHeight: 1.4 }}>
          Créez, partagez, développez et monétisez sans frontières.
        </p>

        {/* ── Glass card ── */}
        <div style={{
          width: "86%", borderRadius: 28,
          background: "rgba(0,0,0,0.28)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 0 40px rgba(34,197,94,0.08), 0 8px 32px rgba(0,0,0,0.5)",
          padding: "clamp(14px,2.5vh,20px) clamp(14px,4vw,20px) clamp(12px,2vh,18px)",
        }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "clamp(6px,1.2vh,10px)" }}>

            {error && (
              <div style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: "10px 14px", color: "#FCA5A5", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#FCA5A5" strokeWidth="1.3"/><path d="M7 4v3" stroke="#FCA5A5" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7" cy="9.5" r=".6" fill="#FCA5A5"/></svg>
                {error}
              </div>
            )}

            {/* Email/phone */}
            <div className="lf" style={{ paddingLeft: 14 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginRight: 10 }}>
                <circle cx="9" cy="6" r="3" stroke="var(--bp-primary)" strokeWidth="1.5"/>
                <path d="M3 16c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="var(--bp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="Numéro de téléphone ou e-mail" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" disabled={loading} />
            </div>

            {/* Password */}
            <div className="lf" style={{ paddingLeft: 14 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginRight: 10 }}>
                <rect x="3.5" y="8" width="11" height="8" rx="2" stroke="var(--bp-primary)" strokeWidth="1.5"/>
                <path d="M6 8V6a3 3 0 016 0v2" stroke="var(--bp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="12" r="1.2" fill="var(--bp-primary)"/>
              </svg>
              <input type={showPw ? "text" : "password"} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" disabled={loading} />
              <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0 14px", color: "#64748B", display: "flex", alignItems: "center", height: "100%", flexShrink: 0 }}>
                {showPw
                  ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1.5 9s3-5.5 7.5-5.5S16.5 9 16.5 9s-3 5.5-7.5 5.5S1.5 9 1.5 9z" stroke="#64748B" strokeWidth="1.3"/><circle cx="9" cy="9" r="2" stroke="#64748B" strokeWidth="1.3"/><path d="M2 2l14 14" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1.5 9s3-5.5 7.5-5.5S16.5 9 16.5 9s-3 5.5-7.5 5.5S1.5 9 1.5 9z" stroke="#64748B" strokeWidth="1.3"/><circle cx="9" cy="9" r="2" stroke="#64748B" strokeWidth="1.3"/></svg>
                }
              </button>
            </div>

            {/* Remember me + forgot */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div onClick={() => setRememberMe(v => !v)} style={{ width: 20, height: 20, borderRadius: 6, border: rememberMe ? "none" : "1.5px solid rgba(255,255,255,0.2)", background: rememberMe ? "var(--bp-primary)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", cursor: "pointer", flexShrink: 0 }}>
                  {rememberMe && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>Se souvenir de moi</span>
              </label>
              <a href="#" style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-primary)", textDecoration: "none" }}>Mot de passe oublié ?</a>
            </div>

            {/* Connect button */}
            <button type="submit" className="btn-connect" disabled={loading}>
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: "spin .8s linear infinite" }}>
                    <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                    <path d="M9 2a7 7 0 017 7" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Connexion…
                </>
              ) : (
                <>
                  Se connecter
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10h12M11 5l5 5-5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            </div>

            {/* Create account */}
            <button type="button" className="btn-register" onClick={() => navigate("/register")}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="8" cy="6" r="3" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4"/>
                <path d="M2 16c0-3 2.5-5 6-5s6 2 6 5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M14.5 10v4M12.5 12h4" stroke="var(--bp-primary)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Créer un compte
            </button>
          </form>
        </div>
      </div>

      {/* ── Bottom language selector (floating pill) ── */}
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 10,
      }}>
        <button
          onClick={() => setShowLangSheet(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            height: 52, padding: "0 20px",
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 26,
            color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
            transition: "border-color .2s, box-shadow .2s",
          }}
          onMouseEnter={e => { (e.currentTarget).style.borderColor = "rgba(34,197,94,0.4)"; }}
          onMouseLeave={e => { (e.currentTarget).style.borderColor = "rgba(255,255,255,0.12)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="var(--bp-primary)" strokeWidth="1.4"/>
            <ellipse cx="9" cy="9" rx="3" ry="7.5" stroke="var(--bp-primary)" strokeWidth="1.4"/>
            <path d="M1.5 6.5h15M1.5 11.5h15" stroke="var(--bp-primary)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span>{lang.flag} {lang.nameNative}</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {regionName && (
          <div style={{ textAlign: "center", marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.02em", animation: "fadeIn .4s ease" }}>
            📍 {regionFlag} {regionName}
          </div>
        )}
      </div>

      {/* Language sheet */}
      {showLangSheet && (
        <LanguageSheet current={lang} onSelect={setLang} onClose={() => setShowLangSheet(false)} regionFlag={regionFlag} regionName={regionName} />
      )}
    </div>
  );
}
