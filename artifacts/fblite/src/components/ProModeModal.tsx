import { useState } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/api";

interface Props {
  onClose: () => void;
  onActivated: () => void;
}

type Step =
  | "intro"
  | "activating"
  | "welcome"
  | "audience"
  | "review"
  | "custom"
  | "monetization"
  | "pro_tools"
  | "done";

const PROGRESS_STEPS = ["welcome", "audience", "review", "monetization", "pro_tools"];

function ProgressBar({ current }: { current: string }) {
  const idx = PROGRESS_STEPS.indexOf(current);
  if (idx < 0) return null;
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 16px 12px" }}>
      {PROGRESS_STEPS.map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? "var(--bp-primary)" : "#E5E7EB" }} />
      ))}
    </div>
  );
}

function TopBar({ title, onBack, showModeBar = true }: { title: string; onBack?: () => void; showModeBar?: boolean }) {
  return (
    <>
      {showModeBar && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px", borderBottom: "1px solid #E5E7EB", background: "var(--theme-surface)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text)", display: "flex", alignItems: "center", gap: 4 }}>
            Mode payant
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#64748B", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>?</span>
          </span>
          <button style={{ background: "#E5E7EB", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "var(--theme-text)", cursor: "pointer" }}>
            Changer de mode
          </button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #E5E7EB", background: "var(--theme-surface)" }}>
        {onBack ? (
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--theme-text)", padding: "0 12px 0 0", lineHeight: 1 }}>‹</button>
        ) : (
          <div style={{ width: 32 }} />
        )}
        <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16, color: "var(--theme-text)" }}>{title}</span>
        <div style={{ width: 32 }} />
      </div>
    </>
  );
}

function BtnPrimary({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ width: "100%", background: disabled ? "#CBD5E1" : "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontSize: 16, fontWeight: 700, cursor: disabled ? "default" : "pointer" }}
    >
      {label}
    </button>
  );
}

function BtnSecondary({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ width: "100%", background: "var(--theme-surface)", color: "var(--theme-text)", border: "1.5px solid #CBD5E1", borderRadius: 8, padding: "13px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
    >
      {label}
    </button>
  );
}

const MENU_ICON_STYLE: React.CSSProperties = {
  width: 44, height: 44, borderRadius: "50%", background: "#E5E7EB",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 20, flexShrink: 0,
};

export default function ProModeModal({ onClose, onActivated }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [audience, setAudience] = useState<"public" | "friends" | "custom">("public");
  const [customSettings, setCustomSettings] = useState({
    allowShareStories: true,
    allowShareReels: true,
    searchEngines: true,
  });

  const handleActivate = async () => {
    setStep("activating");
    try {
      await apiFetch("/users/me/pro", { method: "POST" });
    } catch { /* silent — store locally anyway */ }
    localStorage.setItem("bp_pro_mode", "1");
    await new Promise(r => setTimeout(r, 1200));
    setStep("welcome");
  };

  const content = (() => {
    /* ───── INTRO ───── */
    if (step === "intro") return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="Mode professionnel" onBack={onClose} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Purple banner */}
          <div style={{ background: "linear-gradient(135deg,#7C3AED 0%,#0EA5E9 100%)", padding: "32px 24px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            <div style={{ width: 120, height: 120, borderRadius: 20, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <circle cx="36" cy="28" r="16" fill="white" opacity="0.9"/>
                <path d="M10 60 Q20 44 36 44 Q52 44 62 60" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
                <path d="M54 14 L62 8 L58 18 Z" fill="#FBBF24" opacity="0.9"/>
                <path d="M60 24 L68 20 L65 30 Z" fill="#F97316" opacity="0.85"/>
                <circle cx="56" cy="38" r="5" fill="rgba(255,180,0,0.8)"/>
              </svg>
            </div>
          </div>
          <div style={{ padding: "24px 20px", background: "var(--theme-surface)" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "var(--theme-text)", textAlign: "center" }}>Activer le mode pro</h2>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 1.5 }}>
              Ajoutez de nouveaux outils à votre profil pour vous développer en tant que Creator sur Brute Pawa.
            </p>
            {[
              { icon: "📊", title: "Affichez les statistiques de contenu", desc: "Apprenez-en plus sur votre audience ainsi que sur les performances de votre contenu." },
              { icon: "👥", title: "Élargissez votre audience", desc: "Votre paramètre followers sera défini sur Public afin que tout le monde puisse voir votre contenu public dans son fil d'actualité." },
              { icon: "🔖", title: "Faites-vous connaître grâce à l'identification", desc: "Votre paramètre d'identification sera défini sur Public afin que tout le monde puisse vous identifier." },
            ].map(f => (
              <div key={f.title} style={{ display: "flex", gap: 14, marginBottom: 20, alignItems: "flex-start" }}>
                <span style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)", marginBottom: 3 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.45 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "12px 16px 20px", background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 8 }}>
          <BtnPrimary label="Activer" onClick={handleActivate} />
          <BtnSecondary label="En savoir plus" onClick={() => {}} />
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#64748B", textAlign: "center", lineHeight: 1.4 }}>
            Brute Pawa affichera plus d'informations sur les profils en mode professionnel.{" "}
            <span style={{ color: "var(--bp-primary)", cursor: "pointer" }}>En savoir plus</span>. En sélectionnant «&nbsp;Activer&nbsp;», vous acceptez les{" "}
            <span style={{ color: "var(--bp-primary)", cursor: "pointer" }}>Conditions commerciales</span>.
          </p>
        </div>
      </div>
    );

    /* ───── ACTIVATING ───── */
    if (step === "activating") return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="Mode professionnel" />
        <div style={{ background: "linear-gradient(135deg,#7C3AED 0%,#0EA5E9 100%)", padding: "28px 24px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 120, height: 120, borderRadius: 20, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="28" r="16" fill="white" opacity="0.9"/>
              <path d="M10 60 Q20 44 36 44 Q52 44 62 60" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.9"/>
              <path d="M54 14 L62 8 L58 18 Z" fill="#FBBF24" opacity="0.9"/>
            </svg>
          </div>
        </div>
        <div style={{ padding: "24px 20px" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, textAlign: "center" }}>Activer le mode pro</h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#64748B", textAlign: "center" }}>Ajoutez de nouveaux outils à votre profil pour vous développer en tant que Creator sur Brute Pawa.</p>
          {[
            { icon: "📊", title: "Affichez les statistiques de contenu", desc: "Apprenez-en plus sur votre audience ainsi que sur les performances de votre contenu." },
            { icon: "👥", title: "Élargissez votre audience", desc: "Votre paramètre followers sera défini sur Public.", loading: true },
            { icon: "🔖", title: "Faites-vous connaître grâce à l'identification", desc: "Votre paramètre d'identification sera défini sur Public." },
          ].map(f => (
            <div key={f.title} style={{ display: "flex", gap: 14, marginBottom: 20, alignItems: "flex-start", position: "relative" }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{f.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.45 }}>{f.desc}</div>
                {f.loading && (
                  <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 24, height: 24, border: "3px solid #E5E7EB", borderTopColor: "var(--bp-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <BtnPrimary label="Activer" onClick={() => {}} disabled />
          <BtnSecondary label="En savoir plus" onClick={() => {}} />
        </div>
      </div>
    );

    /* ───── WELCOME ───── */
    if (step === "welcome") return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="Bienvenue" onBack={() => setStep("intro")} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Illustration */}
          <div style={{ background: "linear-gradient(135deg, #DCFCE7 0%, #DCFCE7 50%, #EDE9FE 100%)", padding: "28px 16px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180, position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", gap: -12, alignItems: "flex-end", position: "relative" }}>
              {["#E91E63","var(--bp-primary)","#9C27B0"].map((c, i) => (
                <div key={i} style={{ width: 64, height: 80, borderRadius: "50% 50% 0 0", background: c, margin: "0 -4px", opacity: 0.85, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28 }}>
                  {["😊","📱","🤳"][i]}
                </div>
              ))}
            </div>
            <span style={{ position: "absolute", top: 16, left: 24, fontSize: 28 }}>💎</span>
            <span style={{ position: "absolute", top: 12, right: 20, fontSize: 22 }}>✨</span>
            <span style={{ position: "absolute", bottom: 14, right: 28, fontSize: 24 }}>🌟</span>
          </div>
          <div style={{ padding: "24px 20px" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Bienvenue dans le mode pro&nbsp;!</h2>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
              Vous avez déverrouillé plus d'outils dans votre profil. Ils vous aideront à développer votre présence publique et à atteindre vos objectifs.
            </p>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Voyons rapidement les bases :</div>
            {[
              { icon: "👥", label: "Définissez votre audience" },
              { icon: "💰", label: "En savoir plus sur les outils de monétisation" },
              { icon: "🔧", label: "Découvrez les outils professionnels" },
              { icon: "🎉", label: "Bravo !" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={MENU_ICON_STYLE}>{s.icon}</div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "0 16px 20px", background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB" }}>
          <ProgressBar current="welcome" />
          <BtnPrimary label="Suivant" onClick={() => setStep("audience")} />
        </div>
      </div>
    );

    /* ───── AUDIENCE ───── */
    if (step === "audience") return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="Audience par défaut" onBack={() => setStep("welcome")} />
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>Choisissez votre audience par défaut</h3>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
            Le fait de choisir une audience par défaut définit automatiquement l'audience du contenu que vous partagez, mais vous pouvez à tout moment la modifier pour une publication, une story ou un reel spécifique.
          </p>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B" }}>Vous pouvez modifier vos paramètres à tout moment.</p>
          {([
            { id: "public" as const, label: "Public · Suggestions", desc: "Tout le monde peut voir ce que vous partagez et interagir avec votre contenu public.", icon: "🌐" },
            { id: "friends" as const, label: "Ami(e)s", desc: "Seul(e)s vos ami(e)s peuvent voir ce que vous partagez.", icon: "👥" },
            { id: "custom" as const, label: "Personnalisée", desc: "Choisissez manuellement qui peut voir ce que vous partagez et interagir avec votre contenu public.", icon: "⚙️" },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => setAudience(opt.id)}
              style={{ width: "100%", background: "var(--theme-surface)", border: `2px solid ${audience === opt.id ? "var(--bp-primary)" : "#E5E7EB"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ ...MENU_ICON_STYLE, background: "#E5E7EB", flexShrink: 0 }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{opt.desc}</div>
              </div>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${audience === opt.id ? "var(--bp-primary)" : "#CBD5E1"}`, background: audience === opt.id ? "var(--bp-primary)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {audience === opt.id && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--theme-surface)" }} />}
              </div>
            </button>
          ))}
          <div style={{ padding: "4px 0 16px" }}>
            <span style={{ color: "var(--bp-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Comment aider à choisir ?</span>
          </div>
        </div>
        <div style={{ padding: "0 16px 20px", background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB" }}>
          <ProgressBar current="audience" />
          <BtnPrimary label="Suivant" onClick={() => setStep("review")} />
        </div>
      </div>
    );

    /* ───── REVIEW ───── */
    if (step === "review") return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="Examiner la sélection" onBack={() => setStep("audience")} />
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 14 }}>par défaut ?</p>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
            Nous suggérons ces paramètres aux Creators qui veulent élargir leur audience.
          </p>
          {[
            { icon: "👤", label: "Qui peut voir vos reels, stories et publications ?", value: "Public · S'applique à vos futurs reels et publications, ainsi qu'à vos stories actuelles et futures." },
            { icon: "🔄", label: "Autoriser d'autres personnes à partager vos stories et reels publics ...", value: "Activé · S'applique à chaque paramètre" },
            { icon: "💬", label: "Qui peut commenter vos publications publiques ?", value: "Public" },
            { icon: "🌐", label: "Informations de profil publiques", value: "Public" },
            { icon: "➕", label: "Qui peut voir les personnes et les Pages que vous suivez ?", value: "Public" },
            { icon: "🔍", label: "Voulez-vous que les moteurs de recherche en dehors de Facebook af...", value: "Activé" },
          ].map(row => (
            <div key={row.label} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid #F1F5F9", alignItems: "flex-start" }}>
              <div style={{ ...MENU_ICON_STYLE, width: 38, height: 38, fontSize: 18, flexShrink: 0 }}>{row.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, lineHeight: 1.35 }}>{row.label}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{row.value}</div>
              </div>
            </div>
          ))}
          <div style={{ height: 16 }} />
        </div>
        <div style={{ padding: "12px 16px 20px", background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: 8 }}>
          <BtnPrimary label="Confirmer" onClick={() => setStep("monetization")} />
          <BtnSecondary label="Modifier les paramètres" onClick={() => setStep("custom")} />
        </div>
      </div>
    );

    /* ───── CUSTOM SETTINGS ───── */
    if (step === "custom") return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="Paramètres personnalisés" onBack={() => setStep("review")} />
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <div style={{ background: "var(--theme-surface)", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Paramètres personnalisés</div>
            </div>
            {/* Chevron rows */}
            {[
              { label: "Qui peut voir vos futures publications ?", value: "Public", suggestion: "Public" },
              { label: "Qui peut voir vos stories ?", value: "Public", suggestion: "Public" },
            ].map(row => (
              <button key={row.label} style={{ width: "100%", background: "none", border: "none", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{row.value}</div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Suggestion : {row.suggestion}</div>
                </div>
                <span style={{ color: "#64748B", fontSize: 20, fontWeight: 300 }}>›</span>
              </button>
            ))}
            {/* Toggle rows */}
            {([
              { key: "allowShareStories" as const, label: "Autoriser les autres à partager vos stories publiques dans leur story personnelle ?", desc: "Leur story reprendra votre nom ainsi qu'un lien vers votre story d'origine. Chaque personne contrôle qui peut voir ce qu'elle partage.", suggestion: "Activé" },
              { key: "allowShareReels" as const, label: "Autoriser d'autres personnes à partager vos reels dans leurs stories ?", desc: "Si vous créez un reel public, n'importe qui peut le partager dans sa story. Si vous identifiez quelqu'un dans un reel, cette personne peut le partager dans sa story, qui inclura votre nom complet et un lien vers votre reel, et qui sera visible pendant 24 heures. Cette personne choisit qui peut voir la story.", suggestion: "Activé" },
              { key: "searchEngines" as const, label: "Voulez-vous que les moteurs de recherche en dehors de Facebook affichent un lien vers votre profil ?", desc: "Quand ce paramètre est activé, votre profil peut apparaître dans les résultats des moteurs de recherche.\n\nQuand ce paramètre est désactivé, les moteurs de recherche n'affichent plus votre profil, mais cela peut prendre du temps. Votre profil reste accessible sur Facebook si quelqu'un recherche votre nom.", suggestion: "Activé" },
            ] as { key: "allowShareStories" | "allowShareReels" | "searchEngines"; label: string; desc: string; suggestion: string }[]).map(row => (
              <div key={row.key} style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, lineHeight: 1.35 }}>{row.label}</div>
                    {row.desc.split("\n\n").map((d, i) => (
                      <p key={i} style={{ margin: "0 0 6px", fontSize: 12, color: "#64748B", lineHeight: 1.4 }}>{d}</p>
                    ))}
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>Suggestion : {row.suggestion}</div>
                  </div>
                  <button
                    onClick={() => setCustomSettings(s => ({ ...s, [row.key]: !s[row.key] }))}
                    style={{ flexShrink: 0, width: 50, height: 28, borderRadius: 14, background: customSettings[row.key] ? "var(--bp-primary)" : "#CBD5E1", border: "none", cursor: "pointer", position: "relative", marginTop: 4 }}
                  >
                    <div style={{ position: "absolute", top: 3, left: customSettings[row.key] ? 25 : 3, width: 22, height: 22, borderRadius: "50%", background: "var(--theme-surface)", transition: "left 0.2s" }} />
                  </button>
                </div>
              </div>
            ))}
            {/* More chevron rows */}
            {[
              { label: "Qui peut commenter vos publications publiques ?", value: "Public", suggestion: "Public" },
              { label: "Informations de profil publiques", value: "Public", suggestion: "Public" },
              { label: "Qui peut voir les personnes et les Pages que vous suivez ?", value: "Public", suggestion: "Public" },
            ].map(row => (
              <button key={row.label} style={{ width: "100%", background: "none", border: "none", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{row.value}</div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Suggestion : {row.suggestion}</div>
                </div>
                <span style={{ color: "#64748B", fontSize: 20, fontWeight: 300 }}>›</span>
              </button>
            ))}
          </div>
          <div style={{ height: 16 }} />
        </div>
        <div style={{ padding: "12px 16px 20px", background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB" }}>
          <BtnPrimary label="Terminé" onClick={() => setStep("review")} />
        </div>
      </div>
    );

    /* ───── MONETIZATION ───── */
    if (step === "monetization") return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="Outils de monétisation" onBack={() => setStep("review")} />
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
          {/* Illustration */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24, position: "relative", height: 120 }}>
            <div style={{ width: 120, height: 100, background: "radial-gradient(circle at 50% 60%, #EC4899 0%, #9C27B0 50%, transparent 80%)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>💎</div>
            <span style={{ position: "absolute", top: 4, left: 40, fontSize: 28 }}>✨</span>
            <span style={{ position: "absolute", top: 10, right: 30, fontSize: 22 }}>⭐</span>
            <span style={{ position: "absolute", bottom: 4, left: 28, fontSize: 26 }}>🪙</span>
            <span style={{ position: "absolute", bottom: 4, right: 26, fontSize: 26 }}>🪙</span>
            <span style={{ position: "absolute", top: 8, right: 56, fontSize: 22 }}>🔥</span>
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800 }}>Commencez à gagner de l'argent dès aujourd'hui</h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
            En mode pro, votre profil pourrait être éligible à la monétisation sur Brute Pawa.
          </p>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Pas encore éligible</div>
          {[
            { icon: "⭐", color: "#F59E0B", title: "Étoiles", desc: "Donnez à vos fans l'opportunité de vous soutenir via des Étoiles et des cadeaux." },
            { icon: "💚", color: "var(--bp-primary)", title: "Abonnement", desc: "Générez des revenus mensuels avec du contenu exclusif." },
          ].map(tool => (
            <div key={tool.title} style={{ background: "var(--theme-surface)", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 26 }}>{tool.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{tool.title}</div>
                  <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.4, marginTop: 2 }}>{tool.desc}</div>
                </div>
              </div>
              <button style={{ width: "100%", background: "#F1F5F9", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "var(--theme-text)" }}>En savoir plus</button>
            </div>
          ))}
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <span style={{ color: "var(--bp-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>En savoir plus sur les outils de monétisation</span>
          </div>
        </div>
        <div style={{ padding: "0 16px 20px", background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB" }}>
          <ProgressBar current="monetization" />
          <BtnPrimary label="Suivant" onClick={() => setStep("pro_tools")} />
        </div>
      </div>
    );

    /* ───── PRO TOOLS ───── */
    if (step === "pro_tools") return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TopBar title="Outils professionnels" onBack={() => setStep("monetization")} />
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
          {/* Mini perf card */}
          <div style={{ background: "linear-gradient(135deg,#7C3AED 0%,var(--bp-primary) 100%)", borderRadius: 14, padding: "16px", marginBottom: 22, position: "relative", overflow: "hidden" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Performance ⓘ</div>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>Voir tout</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginBottom: 8 }}>Followers : 1 345</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "Portée", val: "344", pct: "+50%" },
                  { label: "Contenu partagé", val: "343", pct: "+50%" },
                  { label: "Engagement", val: "56", pct: "+50%" },
                  { label: "Nouveaux abonnés", val: "324", pct: "+50%" },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{s.val} <span style={{ color: "var(--bp-primary)", fontSize: 11 }}>{s.pct}</span></div>
                    <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>Vous avez débloqué de nouveaux outils professionnels pour vous permettre d'atteindre vos objectifs !</h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
            Découvrez des outils dans votre tableau de bord pour développer votre présence publique.
          </p>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Découvrez vos nouveaux outils</div>
          {[
            { icon: "📊", title: "Statistiques", desc: "Apprenez-en plus sur votre audience ainsi que sur les performances de votre contenu." },
            { icon: "✏️", title: "Création", desc: "Gérez vos publications et trouvez de nouvelles idées pour vous inspirer." },
            { icon: "📈", title: "Croissance", desc: "Répondez aux commentaires et accédez à d'autres outils pour interagir avec vos fans." },
            { icon: "📋", title: "Formation et soutien des Creators", desc: "Avec le mode pro, accédez à des ressources et à une assistance pour développer votre présence." },
          ].map(tool => (
            <div key={tool.title} style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-start" }}>
              <div style={{ ...MENU_ICON_STYLE, fontSize: 22 }}>{tool.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{tool.title}</div>
                <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.4 }}>{tool.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 16px 20px", background: "var(--theme-surface)", borderTop: "1px solid #E5E7EB" }}>
          <ProgressBar current="pro_tools" />
          <BtnPrimary label="Suivant" onClick={() => { onActivated(); onClose(); }} />
        </div>
      </div>
    );

    return null;
  })();

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#F1F5F9", display: "flex", flexDirection: "column", overflowY: "hidden" }}>
      {content}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
