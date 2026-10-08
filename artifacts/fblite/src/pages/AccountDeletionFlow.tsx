import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { ArrowLeft, ShieldCheck, Download, EyeOff, Lock, AlertTriangle, ChevronRight, X, RefreshCw } from "lucide-react";

/* ─── Constants ────────────────────────────────────────────── */
const API = "/api";
const C = {
  bg: "#F7F8FA", card: "#FFFFFF", primary: "var(--bp-primary)",
  paleGreen: "#EAF9F0", text: "#111827", secondary: "#64748B",
  muted: "#9CA3AF", border: "#EEF0F3", shadow: "0 1px 10px rgba(15,23,42,0.05)",
  red: "#EF4444", paleRed: "#FEF2F2",
};

/* ─── Illustrations ─────────────────────────────────────────── */
function TrashIllustration() {
  return (
    <svg width="170" height="160" viewBox="0 0 170 160" fill="none">
      {/* glow */}
      <ellipse cx="85" cy="148" rx="55" ry="10" fill="rgba(34,197,94,0.12)" />
      {/* floating dots */}
      <circle cx="28" cy="42" r="5" fill="rgba(34,197,94,0.35)" />
      <circle cx="148" cy="60" r="4" fill="rgba(34,197,94,0.25)" />
      <circle cx="20" cy="100" r="3" fill="rgba(34,197,94,0.2)" />
      <circle cx="155" cy="98" r="6" fill="rgba(34,197,94,0.18)" />
      {/* lid */}
      <rect x="40" y="28" width="90" height="16" rx="8" fill="#22C55E" />
      <rect x="68" y="18" width="34" height="14" rx="7" fill="#16A34A" />
      {/* body */}
      <rect x="45" y="44" width="80" height="88" rx="14" fill="#1F2937" />
      <rect x="45" y="44" width="80" height="88" rx="14" fill="url(#trashGrad)" />
      {/* stripes */}
      <rect x="65" y="60" width="8" height="54" rx="4" fill="rgba(255,255,255,0.15)" />
      <rect x="81" y="60" width="8" height="54" rx="4" fill="rgba(255,255,255,0.15)" />
      <rect x="97" y="60" width="8" height="54" rx="4" fill="rgba(255,255,255,0.15)" />
      {/* floating elements */}
      <rect x="104" y="26" width="22" height="22" rx="6" fill="#22C55E" opacity="0.8" transform="rotate(15 104 26)" />
      <circle cx="42" cy="78" r="9" fill="#22C55E" opacity="0.7" />
      <circle cx="42" cy="78" r="5" fill="#16A34A" opacity="0.9" />
      <defs>
        <linearGradient id="trashGrad" x1="45" y1="44" x2="125" y2="132" gradientUnits="userSpaceOnUse">
          <stop stopColor="#374151" /><stop offset="1" stopColor="#1F2937" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ClockIllustration() {
  return (
    <svg width="170" height="160" viewBox="0 0 170 160" fill="none">
      <ellipse cx="85" cy="148" rx="50" ry="9" fill="rgba(34,197,94,0.12)" />
      <circle cx="85" cy="80" r="54" fill="#EAF9F0" />
      <circle cx="85" cy="80" r="46" fill="#fff" stroke="#22C55E" strokeWidth="4" />
      {/* clock hands */}
      <line x1="85" y1="80" x2="85" y2="48" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
      <line x1="85" y1="80" x2="108" y2="96" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" />
      <circle cx="85" cy="80" r="5" fill="#1F2937" />
      {/* tick marks */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
        <line key={i}
          x1={85 + 36 * Math.cos((deg - 90) * Math.PI / 180)}
          y1={80 + 36 * Math.sin((deg - 90) * Math.PI / 180)}
          x2={85 + 42 * Math.cos((deg - 90) * Math.PI / 180)}
          y2={80 + 42 * Math.sin((deg - 90) * Math.PI / 180)}
          stroke={i % 3 === 0 ? "#22C55E" : "#D1FAE5"} strokeWidth={i % 3 === 0 ? 3 : 1.5} strokeLinecap="round"
        />
      ))}
      {/* circular arrows */}
      <path d="M 85 26 A 54 54 0 1 1 31 80" stroke="#22C55E" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="6 4" />
      <polygon points="26,72 31,80 38,75" fill="#22C55E" />
      <polygon points="90,20 85,26 80,20" fill="#22C55E" />
    </svg>
  );
}

function WarningIllustration() {
  return (
    <svg width="170" height="160" viewBox="0 0 170 160" fill="none">
      <ellipse cx="85" cy="148" rx="48" ry="9" fill="rgba(239,68,68,0.1)" />
      <circle cx="85" cy="76" r="54" fill="#FEF2F2" />
      <circle cx="85" cy="76" r="46" fill="#EF4444" />
      {/* exclamation */}
      <rect x="79" y="40" width="12" height="46" rx="6" fill="white" />
      <circle cx="85" cy="100" r="7" fill="white" />
      {/* particles */}
      <circle cx="30" cy="36" r="5" fill="#FCA5A5" opacity="0.7" />
      <circle cx="148" cy="48" r="4" fill="#FCA5A5" opacity="0.5" />
      <circle cx="20" cy="100" r="3" fill="#F87171" opacity="0.4" />
      <circle cx="155" cy="110" r="6" fill="#FCA5A5" opacity="0.4" />
    </svg>
  );
}

function SecurityIllustration() {
  return (
    <svg width="170" height="160" viewBox="0 0 170 160" fill="none">
      <ellipse cx="85" cy="148" rx="52" ry="9" fill="rgba(34,197,94,0.12)" />
      <circle cx="85" cy="78" r="54" fill="#EAF9F0" />
      {/* shield */}
      <path d="M85 30 L125 48 L125 84 C125 108 85 128 85 128 C85 128 45 108 45 84 L45 48 Z" fill="#22C55E" />
      <path d="M85 40 L118 55 L118 84 C118 104 85 120 85 120 C85 120 52 104 52 84 L52 55 Z" fill="#16A34A" />
      {/* padlock */}
      <rect x="72" y="74" width="26" height="22" rx="5" fill="white" />
      <path d="M77 74 L77 66 A8 8 0 0 1 93 66 L93 74" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="85" cy="83" r="4" fill="#22C55E" />
      <rect x="83" y="83" width="4" height="7" rx="2" fill="#22C55E" />
    </svg>
  );
}

function CalendarIllustration() {
  return (
    <svg width="170" height="160" viewBox="0 0 170 160" fill="none">
      <ellipse cx="85" cy="148" rx="52" ry="9" fill="rgba(34,197,94,0.12)" />
      {/* calendar base */}
      <rect x="28" y="38" width="114" height="102" rx="16" fill="#22C55E" />
      <rect x="28" y="58" width="114" height="82" rx="0" fill="white" />
      <rect x="28" y="108" width="114" height="32" rx="0" fill="white" />
      <rect x="28" y="120" width="114" height="20" rx="0" fill="white" />
      <rect x="28" y="124" width="114" height="16" rx="0" fill="white" />
      <rect x="28" y="122" width="114" height="18" rx={0} fill="white" />
      <rect x="28" y="126" width="114" height="14" rx="0" fill="white" />
      <rect x="28" y="126" width="114" height="14" rx={0} fill="white" />
      <rect x="28" y="118" width="114" height="22" rx="0" fill="white" />
      <rect x="28" y="58" width="114" height="80" rx={0} fill="white" />
      <rect x="28" y="58" width="114" height="82" rx="0" fill="white" />
      <rect x="28" y="58" width="114" height="82" rx="0" fill="white" />
      {/* bottom rounded */}
      <rect x="28" y="100" width="114" height="40" rx={0} fill="white" />
      <rect x="28" y="120" width="114" height="20" rx="0" fill="white" />
      <rect x="28" y="124" width="114" height="16" rx={0} fill="white" />
      <rect x="28" y="124" width="114" height="16" rx="16" fill="white" style={{clipPath: "inset(0 0 0 0 round 0 0 16px 16px)"}} />
      {/* Grid cells */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map((i) => {
        const col = i % 7, row = Math.floor(i / 7);
        return <rect key={i} x={38 + col * 14} y={68 + row * 16} width="10" height="10" rx="3"
          fill={i === 6 || i === 13 ? "#22C55E" : i === 5 ? "#DCFCE7" : "#EEF0F3"} />;
      })}
      {/* header rings */}
      <rect x="50" y="30" width="12" height="18" rx="6" fill="#16A34A" />
      <rect x="108" y="30" width="12" height="18" rx="6" fill="#16A34A" />
      {/* lock badge */}
      <circle cx="126" cy="116" r="18" fill="#22C55E" />
      <rect x="118" y="114" width="16" height="13" rx="4" fill="white" />
      <path d="M121 114 L121 109 A5 5 0 0 1 131 109 L131 114" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function SuccessIllustration() {
  return (
    <svg width="170" height="160" viewBox="0 0 170 160" fill="none">
      <ellipse cx="85" cy="148" rx="54" ry="10" fill="rgba(34,197,94,0.15)" />
      {/* particles */}
      {[[30,32,5],[148,40,4],[22,90,3],[152,88,6],[60,18,4],[120,22,3],[38,120,4],[140,118,3]].map(([x,y,r],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#22C55E" opacity={0.3 + (i%3)*0.2} />
      ))}
      <circle cx="85" cy="78" r="54" fill="#DCFCE7" />
      <circle cx="85" cy="78" r="46" fill="#22C55E" />
      {/* checkmark */}
      <path d="M60 78 L78 96 L112 58" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* ring */}
      <circle cx="85" cy="78" r="52" stroke="#22C55E" strokeWidth="3" fill="none" opacity="0.4" strokeDasharray="8 6" />
    </svg>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */
function StepHeader({ step, total, onBack, label }: { step: number; total: number; onBack: () => void; label: string }) {
  return (
    <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, height: 56, display: "flex", alignItems: "center", padding: "0 6px", position: "sticky", top: 0, zIndex: 30 }}>
      <button aria-label="Retour" onClick={onBack} style={{ width: 44, height: 44, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ArrowLeft size={22} color={C.text} strokeWidth={2} />
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, letterSpacing: "0.5px" }}>{String(step).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
      <div style={{ width: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ShieldCheck size={20} color={C.primary} strokeWidth={1.9} />
      </div>
    </div>
  );
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ height: 3, background: "#EEF0F3", margin: "0 16px" }}>
      <div style={{ height: "100%", width: `${(step / total) * 100}%`, background: C.primary, borderRadius: 2, transition: "width 0.4s ease" }} />
    </div>
  );
}

function PrimaryBtn({ label, onClick, loading, icon }: { label: string; onClick: () => void; loading?: boolean; icon?: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%", padding: "15px 0", borderRadius: 999, border: "none", cursor: loading ? "default" : "pointer",
      background: loading ? "#86EFAC" : C.primary, color: "#fff", fontWeight: 700, fontSize: 15,
      boxShadow: "0 8px 22px rgba(var(--bp-primary-rgb),0.3)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit",
    }}>
      {loading ? <RefreshCw size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> : icon}
      {label}
    </button>
  );
}

function GhostBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "14px 0", borderRadius: 999, border: `1.5px solid ${C.border}`,
      background: "#fff", color: C.secondary, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
    }}>{label}</button>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export default function AccountDeletionFlow() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [step, setStep] = useState(1);
  const [recoveryDays, setRecoveryDays] = useState(30);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState<{ requestedAt: string; scheduledAt: string } | null>(null);

  // Fetch recovery config on mount
  useEffect(() => {
    fetch(`${API}/account/deletion/config`, { credentials: "include" })
      .then(r => r.json()).then(d => { if (d.recoveryDays) setRecoveryDays(d.recoveryDays); })
      .catch(() => {});
  }, []);

  const goBack = () => {
    if (step === 1) navigate("/settings/messaging/about");
    else setStep(s => Math.max(1, s - 1));
  };

  const requestOtp = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/account/deletion/request`, { method: "POST", credentials: "include" });
      const d = await r.json();
      if (d.maskedEmail) setMaskedEmail(d.maskedEmail);
      setStep(6);
    } catch { } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setOtpError("Veuillez entrer le code complet."); return; }
    setLoading(true); setOtpError("");
    try {
      const r = await fetch(`${API}/account/deletion/verify`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json();
      if (!r.ok) { setOtpError(d.error ?? "Code incorrect."); setLoading(false); return; }
      setDeletionInfo({ requestedAt: d.requestedAt, scheduledAt: d.scheduledAt });
      setStep(7);
    } catch { setOtpError("Erreur réseau. Veuillez réessayer."); } finally { setLoading(false); }
  };

  const cancelDeletion = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/account/deletion`, { method: "DELETE", credentials: "include" });
      navigate("/settings/messaging/about");
    } catch { } finally { setLoading(false); }
  };

  const finishAndLogout = () => {
    ["fb_user", "bp_user", "bp_appearance"].forEach(k => localStorage.removeItem(k));
    navigate("/login");
  };

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "Utilisateur";
  const username = user.username ? `@${user.username}` : "";

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const wrap = (content: React.ReactNode, noPad = false) => (
    <div style={{ background: C.bg, minHeight: "100dvh", fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: 28, zoom: 0.8 }}>
      <StepHeader step={step} total={8} onBack={goBack} label="" />
      <ProgressBar step={step} total={8} />
      {!noPad ? <div style={{ padding: "0 16px" }}>{content}</div> : content}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  /* ── STEP 1 ──────────────────────────────────────────── */
  if (step === 1) return wrap(
    <>
      <div style={{ textAlign: "center", padding: "28px 0 16px" }}>
        <TrashIllustration />
        <h1 style={{ fontWeight: 800, fontSize: 28, color: C.text, letterSpacing: "-0.5px", margin: "16px 0 0" }}>Supprimer<br />mon compte</h1>
      </div>
      <div style={{ background: C.paleGreen, borderRadius: 16, padding: "14px 18px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
        <ShieldCheck size={17} color={C.primary} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13, color: C.secondary, lineHeight: 1.55 }}>
          La suppression de votre compte est <strong>définitive</strong> après la période de récupération.
        </span>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Avant de continuer</div>
        {["Prenez le temps de lire les informations importantes ci-dessous.", "Assurez-vous de bien comprendre les conséquences."].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.paleGreen, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary }} />
            </div>
            <span style={{ fontSize: 13, color: C.secondary, lineHeight: 1.5 }}>{t}</span>
          </div>
        ))}
      </div>
      <PrimaryBtn label="Continuer" onClick={() => setStep(2)} icon={<span style={{ fontSize: 16 }}>→</span>} />
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.muted }}>🔒 Processus sécurisé et confidentiel</div>
    </>
  );

  /* ── STEP 2 ──────────────────────────────────────────── */
  if (step === 2) return wrap(
    <>
      <div style={{ paddingTop: 24, marginBottom: 16 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: "-0.4px", margin: "0 0 8px" }}>Ce qui va être supprimé</h1>
        <p style={{ fontSize: 13.5, color: C.secondary, lineHeight: 1.55, margin: 0 }}>La suppression de votre compte entraînera la suppression permanente des éléments suivants.</p>
      </div>
      <div style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 24 }}>
        {[
          { icon: "👤", title: "Profil", desc: "Votre profil public, photo, bio et toutes vos informations." },
          { icon: "📷", title: "Publications", desc: "Toutes vos publications, photos, vidéos, stories et reels." },
          { icon: "💬", title: "Commentaires", desc: "Tous vos commentaires sur les publications et vidéos." },
          { icon: "👥", title: "Abonnements et abonnés", desc: "Vos abonnements, abonnés et relations." },
          { icon: "✉️", title: "Messages", desc: "Vos conversations et messages privés." },
          { icon: "📁", title: "Groupes et Pages", desc: "Vos groupes, pages et rôles associés." },
          { icon: "⚙️", title: "Préférences", desc: "Vos paramètres, préférences et notifications." },
        ].map((item, i, arr) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "14px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.paleGreen, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>{item.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.45 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <PrimaryBtn label="Continuer" onClick={() => setStep(3)} />
    </>
  );

  /* ── STEP 3 ──────────────────────────────────────────── */
  if (step === 3) return wrap(
    <>
      <div style={{ paddingTop: 24, marginBottom: 20 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: "-0.4px", margin: "0 0 8px" }}>Avant de supprimer votre compte</h1>
        <p style={{ fontSize: 13.5, color: C.secondary, lineHeight: 1.55, margin: 0 }}>Vous pouvez choisir l'une des options ci-dessous avant de continuer.</p>
      </div>
      <div style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 20 }}>
        {[
          { icon: <Download size={20} color={C.primary} strokeWidth={1.9} />, title: "Télécharger mes données", desc: "Récupérez une copie de vos données avant leur suppression." },
          { icon: <EyeOff size={20} color="#7C3AED" strokeWidth={1.9} />, title: "Désactiver temporairement", desc: "Masquez votre profil et désactivez votre compte temporairement." },
          { icon: <Lock size={20} color="#2563EB" strokeWidth={1.9} />, title: "Modifier mes paramètres de confidentialité", desc: "Gérez la visibilité de vos informations et contenus." },
        ].map((item, i, arr) => (
          <button key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: C.paleGreen, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.45 }}>{item.desc}</div>
            </div>
            <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
          </button>
        ))}
      </div>
      <div style={{ background: "#FFFBEB", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
        <AlertTriangle size={17} color="#D97706" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 12.5, color: "#92400E", lineHeight: 1.55 }}>Si vous continuez, votre compte sera <strong>programmé pour suppression</strong>.</span>
      </div>
      <button onClick={() => setStep(4)} style={{
        width: "100%", padding: "15px 0", borderRadius: 999, border: `2px solid ${C.red}`,
        background: "none", color: C.red, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
      }}>Je souhaite quand même supprimer mon compte</button>
    </>
  );

  /* ── STEP 4 ──────────────────────────────────────────── */
  if (step === 4) return wrap(
    <>
      <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
        <ClockIllustration />
        <h1 style={{ fontWeight: 800, fontSize: 26, color: C.text, letterSpacing: "-0.5px", margin: "16px 0 0" }}>Délai de récupération</h1>
      </div>
      <div style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, border: `1px solid ${C.border}`, padding: "20px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.primary, flexShrink: 0, marginTop: 6 }} />
          <span style={{ fontSize: 13.5, color: C.secondary, lineHeight: 1.6 }}>Après votre demande, votre compte sera <strong style={{ color: C.text }}>désactivé immédiatement</strong>.</span>
        </div>
        <div style={{ background: C.paleGreen, borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: C.primary, textAlign: "center", marginBottom: 4 }}>{recoveryDays} jours</div>
          <div style={{ fontSize: 12.5, color: C.secondary, textAlign: "center" }}>Vous disposez de {recoveryDays} jours pour annuler la suppression en vous reconnectant à votre compte.</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.red, flexShrink: 0, marginTop: 6 }} />
          <span style={{ fontSize: 13.5, color: C.secondary, lineHeight: 1.6 }}>Après cette période, la suppression définitive commencera et vos données seront supprimées de manière <strong style={{ color: C.red }}>irréversible</strong>.</span>
        </div>
      </div>
      <PrimaryBtn label="Continuer" onClick={() => setStep(5)} />
    </>
  );

  /* ── STEP 5 ──────────────────────────────────────────── */
  if (step === 5) return wrap(
    <>
      <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
        <WarningIllustration />
        <h1 style={{ fontWeight: 800, fontSize: 26, color: C.text, letterSpacing: "-0.5px", margin: "16px 0 0" }}>Confirmation</h1>
        <p style={{ fontSize: 14, color: C.secondary, margin: "8px 0 0", lineHeight: 1.5 }}>Êtes-vous sûr de vouloir supprimer votre compte ?</p>
      </div>
      {/* account card */}
      <div style={{ background: C.card, borderRadius: 18, boxShadow: C.shadow, border: `1px solid ${C.border}`, padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>{(user.firstName?.[0] || user.name?.[0] || "U").toUpperCase()}</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.text }}>{fullName}</div>
          {username && <div style={{ fontSize: 12.5, color: C.muted }}>{username}</div>}
        </div>
      </div>
      <div style={{ background: "#FEF2F2", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 24 }}>
        <X size={17} color={C.red} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 12.5, color: "#991B1B", lineHeight: 1.55 }}>Cette action est <strong>définitive</strong> et ne peut pas être annulée après la période de récupération.</span>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 4 }}>
        <button onClick={() => navigate("/settings/messaging/about")} style={{ flex: 1, padding: "14px 0", borderRadius: 999, border: `1.5px solid ${C.border}`, background: "#fff", color: C.secondary, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
        <button onClick={requestOtp} disabled={loading} style={{ flex: 2, padding: "14px 0", borderRadius: 999, border: "none", background: loading ? "#FCA5A5" : C.red, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {loading ? <RefreshCw size={15} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> : "🗑️"}
          Supprimer mon compte
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );

  /* ── STEP 6 ──────────────────────────────────────────── */
  if (step === 6) return wrap(
    <>
      <div style={{ textAlign: "center", padding: "20px 0 12px" }}>
        <SecurityIllustration />
        <h1 style={{ fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: "-0.4px", margin: "14px 0 0" }}>Vérification de sécurité</h1>
        <p style={{ fontSize: 13, color: C.secondary, margin: "8px 0 0", lineHeight: 1.55 }}>Pour confirmer que cette demande vous appartient, veuillez vérifier votre identité.</p>
      </div>
      {/* method selector */}
      <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ display: "flex" }}>
          <div style={{ flex: 1, padding: "12px 0", textAlign: "center", background: C.primary, color: "#fff", fontWeight: 700, fontSize: 13 }}>Email</div>
          <div style={{ flex: 1, padding: "12px 0", textAlign: "center", color: C.muted, fontWeight: 600, fontSize: 13 }}>SMS</div>
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: C.secondary, marginBottom: 10 }}>Un code de vérification a été envoyé à</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 20 }}>{maskedEmail || "votre email"}</div>
        {/* OTP input */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 18 }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              maxLength={1}
              value={digit}
              onChange={e => {
                const val = e.target.value.replace(/\D/, "");
                const next = [...otp]; next[i] = val; setOtp(next);
                if (val && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
              }}
              onKeyDown={e => { if (e.key === "Backspace" && !digit && i > 0) document.getElementById(`otp-${i - 1}`)?.focus(); }}
              style={{
                width: 48, height: 56, borderRadius: 14, border: `2px solid ${digit ? C.primary : C.border}`,
                textAlign: "center", fontSize: 22, fontWeight: 800, color: C.text,
                background: digit ? C.paleGreen : "#fff", outline: "none", fontFamily: "inherit",
              }}
            />
          ))}
        </div>
        {otpError && <div style={{ color: C.red, fontSize: 13, textAlign: "center", marginBottom: 10 }}>{otpError}</div>}
        <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center" }}>
          Renvoyer le code <span style={{ color: C.primary, fontWeight: 600, cursor: "pointer" }} onClick={requestOtp}>(00:45)</span>
        </div>
      </div>
      <PrimaryBtn label="Vérifier et continuer" onClick={verifyOtp} loading={loading} />
    </>
  );

  /* ── STEP 7 ──────────────────────────────────────────── */
  if (step === 7) return wrap(
    <>
      <div style={{ textAlign: "center", padding: "20px 0 12px" }}>
        <CalendarIllustration />
        <h1 style={{ fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: "-0.4px", margin: "14px 0 0" }}>Suppression programmée</h1>
        <p style={{ fontSize: 13, color: C.secondary, margin: "8px 0 0", lineHeight: 1.55 }}>Votre compte est en cours de désactivation.</p>
      </div>
      <div style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, border: `1px solid ${C.border}`, padding: "20px 20px", marginBottom: 20 }}>
        {[
          { dot: C.primary, label: "Demande effectuée le", value: deletionInfo ? fmt(deletionInfo.requestedAt) : "—" },
          { dot: C.red, label: "Suppression définitive le", value: deletionInfo ? fmt(deletionInfo.scheduledAt) : `Dans ${recoveryDays} jours` },
        ].map(({ dot, label, value }, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < 1 ? 16 : 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 5 }} />
            <div>
              <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 2 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{value}</div>
            </div>
          </div>
        ))}
        <div style={{ height: 1, background: C.border, margin: "16px 0" }} />
        <div style={{ fontSize: 13, color: C.secondary, lineHeight: 1.55 }}>
          Vous pouvez annuler la suppression avant cette date en vous reconnectant ou en utilisant le bouton ci-dessous.
        </div>
      </div>
      <button onClick={cancelDeletion} disabled={loading} style={{
        width: "100%", padding: "14px 0", borderRadius: 999, border: `2px solid ${C.primary}`,
        background: "none", color: C.primary, fontWeight: 700, fontSize: 14, cursor: "pointer",
        fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        {loading ? <RefreshCw size={15} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} /> : "↩"}
        Annuler la suppression
      </button>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );

  /* ── STEP 8 ──────────────────────────────────────────── */
  return wrap(
    <>
      <div style={{ textAlign: "center", padding: "28px 0 16px" }}>
        <SuccessIllustration />
        <h1 style={{ fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: "-0.4px", margin: "16px 0 0" }}>Suppression terminée</h1>
        <p style={{ fontSize: 14, color: C.secondary, margin: "8px 0 0", lineHeight: 1.55 }}>Votre compte BrutePawa a été supprimé.</p>
      </div>
      <div style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, border: `1px solid ${C.border}`, padding: "20px 20px", marginBottom: 24 }}>
        <div style={{ fontSize: 13.5, color: C.secondary, lineHeight: 1.65 }}>
          Certaines informations peuvent être conservées pour des raisons légales, de sécurité, de prévention de la fraude ou de résolution de litiges.<br /><br />
          Merci d'avoir fait partie de la communauté BrutePawa.
        </div>
      </div>
      <PrimaryBtn label="Retour à l'accueil" onClick={finishAndLogout} icon={<span>🏠</span>} />
    </>
  );
}
