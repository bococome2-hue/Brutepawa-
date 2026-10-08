import { useEffect, useRef } from "react";

interface Props {
  onClose: () => void;
  onSelect: (type: string) => void;
}

const OPTIONS = [
  {
    type: "post",
    label: "Publier un post",
    desc: "Partagez vos idées, actualités et moments avec la communauté.",
    color: "var(--bp-primary)",
    iconBg: "#F0FDF4",
    featured: true,
    badge: { text: "Populaire", emoji: "🔥", textColor: "#166534", bgColor: "#DCFCE7" },
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
        <rect x="4" y="2" width="13" height="18" rx="2" stroke="var(--bp-primary)" strokeWidth="1.8"/>
        <path d="M4 2h11l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 2v5h5" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 13h5M8 17h8" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    type: "product",
    label: "Vendre un produit",
    desc: "Proposez vos produits à des millions d'utilisateurs.",
    color: "#F97316",
    iconBg: "#FFF7ED",
    featured: false,
    badge: { text: "Recommandé", emoji: "⭐", textColor: "#92400E", bgColor: "#FEF3C7" },
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 6h18" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 10a4 4 0 0 1-8 0" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    type: "service",
    label: "Publier un service",
    desc: "Faites connaître vos services et développez votre activité.",
    color: "#0EA5E9",
    iconBg: "#EFF6FF",
    featured: false,
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="#0EA5E9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    type: "group",
    label: "Créer un groupe",
    desc: "Rassemblez des personnes autour d'intérêts communs.",
    color: "#06B6D4",
    iconBg: "#ECFEFF",
    featured: false,
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="#06B6D4" strokeWidth="1.8"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    type: "job",
    label: "Publier une offre d'emploi",
    desc: "Trouvez les meilleurs talents pour votre entreprise.",
    color: "#8B5CF6",
    iconBg: "#F5F3FF",
    featured: false,
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
        <rect x="2" y="7" width="20" height="14" rx="2" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 12v4M10 14h4" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    type: "course",
    label: "Créer une formation",
    desc: "Partagez votre savoir et formez des apprenants.",
    color: "#F59E0B",
    iconBg: "#FFFBEB",
    featured: false,
    badge: null,
    icon: (
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
        <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function CreateModal({ onClose, onSelect }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      onClick={onClose}
      className="sc-fixed-escape"
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <style>{`
        @keyframes cm-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes cm-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cm-card {
          cursor: pointer;
          transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .cm-card:active {
          transform: scale(0.975) !important;
        }
        .cm-close-btn:hover { background: #E5E7EB !important; }
        .cm-close-btn:active { transform: scale(0.93); }
      `}</style>

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#FFFFFF",
          borderRadius: "28px 28px 0 0",
          overflow: "hidden",
          boxShadow: "0 -2px 40px rgba(0,0,0,0.18)",
          animation: "cm-slide-up 0.34s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 38, height: 4, borderRadius: 99, background: "#E5E7EB" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 18px 14px",
        }}>
          {/* Plus icon — small outlined circle */}
          <div style={{
            width: 46, height: 46, borderRadius: "50%",
            border: "2px solid var(--bp-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            background: "#F0FDF4",
          }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path d="M12 5v14M5 12h14" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Texts */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 800, fontSize: 20, color: "var(--theme-text)",
              lineHeight: 1.2, fontFamily: "Inter, sans-serif",
            }}>
              Créer
            </div>
            <div style={{
              fontSize: 13, color: "#6B7280", marginTop: 2,
              lineHeight: 1.35, fontFamily: "Inter, sans-serif",
            }}>
              Choisissez ce que vous voulez créer
            </div>
          </div>

          {/* Close button */}
          <button
            className="cm-close-btn"
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#F1F5F9",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#6B7280" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Options list */}
        <div style={{
          padding: "0 14px 6px",
          display: "flex", flexDirection: "column", gap: 9,
          overflowY: "auto", maxHeight: "68vh",
        }}>
          {OPTIONS.map((opt, i) => (
            <div
              key={opt.type}
              className="cm-card"
              onClick={() => onSelect(opt.type)}
              style={{
                display: "flex", alignItems: "center", gap: 13,
                background: "#FFFFFF",
                borderRadius: 18,
                padding: "13px 13px",
                border: opt.featured
                  ? "2px solid var(--bp-primary)"
                  : "1.5px solid #F1F5F9",
                boxShadow: opt.featured
                  ? "0 2px 12px rgba(34,197,94,0.12)"
                  : "0 1px 4px rgba(0,0,0,0.05)",
                animation: `cm-fade-in 0.28s ${i * 0.05}s both`,
              }}
            >
              {/* Icon square */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: opt.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {opt.icon}
              </div>

              {/* Label + desc */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7,
                  flexWrap: "wrap", marginBottom: 3,
                }}>
                  <span style={{
                    fontWeight: 700, fontSize: 15, color: "var(--theme-text)",
                    fontFamily: "Inter, sans-serif", lineHeight: 1.2,
                  }}>
                    {opt.label}
                  </span>
                  {opt.badge && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      background: opt.badge.bgColor,
                      borderRadius: 99, padding: "2px 8px",
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 11 }}>{opt.badge.emoji}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: opt.badge.textColor,
                        fontFamily: "Inter, sans-serif",
                      }}>
                        {opt.badge.text}
                      </span>
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 12.5, color: "#6B7280",
                  lineHeight: 1.45, fontFamily: "Inter, sans-serif",
                }}>
                  {opt.desc}
                </div>
              </div>

              {/* Arrow circle */}
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: opt.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 3px 10px ${opt.color}38`,
              }}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2.6"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Footer — Security banner */}
        <div style={{ padding: "8px 14px 32px" }}>
          <div style={{
            background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 60%, #F0FDF4 100%)",
            borderRadius: 18,
            border: "1px solid #BBF7D0",
            padding: "14px 14px 14px 14px",
            display: "flex", alignItems: "center", gap: 12,
            overflow: "hidden", position: "relative",
          }}>
            {/* Shield icon */}
            <div style={{ flexShrink: 0, position: "relative" }}>
              <svg viewBox="0 0 48 56" width="44" height="52" fill="none">
                {/* Shield outer glow */}
                <path d="M24 2L4 10v14c0 14 9 26 20 30C35 50 44 38 44 24V10L24 2z"
                  fill="url(#shieldGrad)" filter="url(#glow)"/>
                {/* Shield gradient def */}
                <defs>
                  <linearGradient id="shieldGrad" x1="4" y1="2" x2="44" y2="54" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4ADE80"/>
                    <stop offset="100%" stopColor="var(--bp-primary-dark)"/>
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                {/* Shield inner lighter */}
                <path d="M24 7L9 13v11c0 11 7 20.5 15 24C32 44.5 39 35 39 24V13L24 7z"
                  fill="white" fillOpacity="0.18"/>
                {/* Lock body */}
                <rect x="17" y="28" width="14" height="11" rx="2.5" fill="white" fillOpacity="0.95"/>
                {/* Lock shackle */}
                <path d="M19 28v-4a5 5 0 0 1 10 0v4" stroke="white" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                {/* Lock keyhole */}
                <circle cx="24" cy="33" r="2" fill="var(--bp-primary-dark)"/>
                <rect x="23" y="34.5" width="2" height="2.5" rx="1" fill="var(--bp-primary-dark)"/>
                {/* Sparkle top-right */}
                <g opacity="0.7">
                  <line x1="41" y1="8" x2="41" y2="12" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="39" y1="10" x2="43" y2="10" stroke="#4ADE80" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
                {/* Sparkle small */}
                <circle cx="7" cy="26" r="1.5" fill="#4ADE80" opacity="0.6"/>
              </svg>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{
                  fontWeight: 800, fontSize: 15, color: "#15803D",
                  fontFamily: "Inter, sans-serif",
                }}>
                  100% sécurisé
                </span>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="var(--bp-primary)" strokeWidth="2"/>
                  <path d="M8 12l3 3 5-5" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{
                fontSize: 12, color: "#4B7A5A", lineHeight: 1.45,
                fontFamily: "Inter, sans-serif", fontWeight: 400,
              }}>
                Vos données sont protégées avec le plus haut niveau de sécurité.
              </div>
            </div>

            {/* Decorative padlock right */}
            <div style={{ flexShrink: 0, opacity: 0.85 }}>
              <svg viewBox="0 0 52 56" width="46" height="52" fill="none">
                <defs>
                  <linearGradient id="lockGrad" x1="0" y1="0" x2="52" y2="56" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#4ADE80"/>
                    <stop offset="100%" stopColor="var(--bp-primary-dark)"/>
                  </linearGradient>
                  <linearGradient id="lockFace" x1="0" y1="0" x2="52" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#86EFAC"/>
                    <stop offset="100%" stopColor="var(--bp-primary)"/>
                  </linearGradient>
                </defs>
                {/* Lock body isometric */}
                {/* Bottom face */}
                <path d="M10 38 L26 48 L42 38 L26 28 Z" fill="var(--bp-primary-dark)"/>
                {/* Right face */}
                <path d="M42 22 L42 38 L26 48 L26 32 Z" fill="#15803D"/>
                {/* Top face */}
                <path d="M10 22 L26 32 L42 22 L26 12 Z" fill="#4ADE80"/>
                {/* Shackle left bar */}
                <rect x="14" y="8" width="5" height="20" rx="2.5" fill="var(--bp-primary)"/>
                {/* Shackle top */}
                <path d="M14 10 Q14 2 26 2 Q38 2 38 10" stroke="var(--bp-primary)" strokeWidth="5" fill="none" strokeLinecap="round"/>
                {/* Shackle right bar */}
                <rect x="33" y="8" width="5" height="14" rx="2.5" fill="var(--bp-primary)"/>
                {/* Keyhole on face */}
                <circle cx="26" cy="29" r="3.5" fill="white" fillOpacity="0.7"/>
                <rect x="24.5" y="31" width="3" height="4" rx="1.5" fill="white" fillOpacity="0.7"/>
                {/* Card behind lock */}
                <rect x="28" y="24" width="22" height="16" rx="3"
                  fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1" strokeOpacity="0.4"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
