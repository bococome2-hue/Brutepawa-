import { useState, useEffect } from "react";

/* ─── Design tokens ─────────────────────────────────────── */
const G   = "var(--bp-primary)";
const GD  = "var(--bp-primary-dark)";
const BG  = "#F8FAFC";
const BOR = "#E5E7EB";
const T1  = "#111827";
const T2  = "#6B7280";

/* ─── SVG Icons ─────────────────────────────────────────── */
const IcoClose = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={T1} strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoReset = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={G} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-7.6L1 10"/>
  </svg>
);
const IcoChevRight = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IcoChevDown = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={T2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);
const IcoCatService = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const IcoLocation = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IcoLocationPin = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
  </svg>
);
const IcoPrice = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
  </svg>
);
const IcoStar = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IcoStarFill = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="#FBBF24" stroke="#FBBF24" strokeWidth="0.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IcoClock = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const IcoVerified = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
);
const IcoExp = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const IcoGender = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="5"/>
    <path d="M19 5l-5.5 5.5M19 5h-5M19 5v5"/>
  </svg>
);
const IcoSort = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M7 12h10M11 18h2"/>
  </svg>
);

/* Category icons */
const IcoPlombier = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IcoElec = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IcoCoiff = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
    <path d="M8.46 8.46l7.08 7.08M8.46 15.54l7.08-7.08"/>
    <circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>
  </svg>
);
const IcoMenage = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <path d="M9 22V12h6v10"/>
  </svg>
);
const IcoMore = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

/* ─── iOS Toggle ─────────────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 51, height: 31, borderRadius: 16,
        background: on ? G : "#E5E7EB",
        border: "none", cursor: "pointer", padding: 2,
        transition: "background 200ms ease-out",
        flexShrink: 0, position: "relative",
        display: "flex", alignItems: "center",
      }}
      aria-checked={on} role="switch"
    >
      <span style={{
        width: 27, height: 27, borderRadius: "50%",
        background: "var(--theme-surface)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
        transform: on ? "translateX(20px)" : "translateX(0px)",
        transition: "transform 200ms ease-out",
        display: "block", flexShrink: 0,
      }}/>
    </button>
  );
}

/* ─── Section header ──────────────────────────────────────── */
function SectionHead({ icon, label, arrow = true }: { icon: React.ReactNode; label: string; arrow?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      paddingBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontWeight: 700, fontSize: 15, color: T1, fontFamily: "Inter, sans-serif" }}>{label}</span>
      </div>
      {arrow && <IcoChevRight />}
    </div>
  );
}

/* ─── Category card ──────────────────────────────────────── */
const CATEGORIES = [
  { id: "plombier",    label: "Plombier",    icon: <IcoPlombier /> },
  { id: "electricien", label: "Électricien", icon: <IcoElec /> },
  { id: "coiffeuse",   label: "Coiffeuse",   icon: <IcoCoiff /> },
  { id: "menage",      label: "Ménage",      icon: <IcoMenage /> },
  { id: "plus",        label: "Plus",        icon: <IcoMore /> },
];

/* ═══════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                             */
/* ═══════════════════════════════════════════════════════════ */
interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (filters: ServiceFilters) => void;
  resultCount?: number;
}

export interface ServiceFilters {
  category: string;
  location: string;
  rayon: string;
  prix: string;
  note: string;
  disponible: boolean;
  verifie: boolean;
  experience: string;
  sexe: string;
  tri: string;
}

const RAYONS = ["5 km", "10 km", "20 km", "50 km", "100 km"];
const PRIX_OPTIONS = [
  { id: "lt5000",      label: "Moins de 5 000" },
  { id: "5000-20000",  label: "5 000 – 20 000" },
  { id: "20000-50000", label: "20 000 – 50 000" },
  { id: "gt50000",     label: "Plus de 50 000" },
];
const NOTE_OPTIONS = [
  { id: "all", label: "Toutes", star: false },
  { id: "3",   label: "3+",    star: true  },
  { id: "4",   label: "4+",    star: true  },
  { id: "5",   label: "5",     star: true  },
];
const EXP_OPTIONS = [
  { id: "debutant", label: "Débutant" },
  { id: "1-3",      label: "1 – 3 ans" },
  { id: "3-5",      label: "3 – 5 ans" },
  { id: "5plus",    label: "5 ans et +" },
];
const SEXE_OPTIONS = [
  { id: "tous",   label: "Tous"  },
  { id: "homme",  label: "Homme" },
  { id: "femme",  label: "Femme" },
];
const TRI_OPTIONS = [
  "Les mieux notés",
  "Les plus proches",
  "Les moins chers",
  "Les plus récents",
];

const DEFAULT_FILTERS: ServiceFilters = {
  category:    "plombier",
  location:    "",
  rayon:       "10 km",
  prix:        "5000-20000",
  note:        "4",
  disponible:  true,
  verifie:     true,
  experience:  "",
  sexe:        "tous",
  tri:         "Les mieux notés",
};

export default function ServiceFilterSheet({ open, onClose, onApply, resultCount = 128 }: Props) {
  const [filters, setFilters] = useState<ServiceFilters>(DEFAULT_FILTERS);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rayonOpen, setRayonOpen] = useState(false);
  const [triOpen, setTriOpen]     = useState(false);

  /* Animation mount/unmount */
  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  const set = <K extends keyof ServiceFilters>(k: K, v: ServiceFilters[K]) =>
    setFilters(prev => ({ ...prev, [k]: v }));

  const reset = () => setFilters(DEFAULT_FILTERS);

  /* Pill button style helper */
  const pill = (active: boolean) => ({
    padding: "9px 16px",
    borderRadius: 16,
    border: `1.5px solid ${active ? G : BOR}`,
    background: active ? "#F0FDF4" : "#fff",
    color: active ? G : T1,
    fontWeight: active ? 700 : 500,
    fontSize: 13,
    cursor: "pointer" as const,
    fontFamily: "Inter, sans-serif",
    transition: "all 200ms ease-out",
    whiteSpace: "nowrap" as const,
    lineHeight: 1.3,
  });

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.50)",
          opacity: visible ? 1 : 0,
          transition: "opacity 250ms ease-out",
        }}
      />

      {/* ── Sheet ──────────────────────────────────────────── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 501,
          background: "var(--theme-surface)",
          borderRadius: "32px 32px 0 0",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.12)",
          maxHeight: "92dvh",
          display: "flex", flexDirection: "column",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, background: BOR, borderRadius: 2,
          margin: "12px auto 0", flexShrink: 0,
        }}/>

        {/* ── Header ─────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 14px",
          borderBottom: `1px solid ${BOR}`,
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: BG, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <IcoClose />
          </button>

          <span style={{ fontWeight: 700, fontSize: 17, color: T1 }}>Filtres</span>

          <button
            onClick={reset}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "none", border: "none", cursor: "pointer",
              color: G, fontWeight: 600, fontSize: 14, fontFamily: "inherit",
            }}
          >
            Réinitialiser
            <IcoReset />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 20px" }}>

          {/* ════════════════════════════════════════════════ */}
          {/* 1. Catégorie de service                         */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{ padding: "18px 0 0", borderBottom: `1px solid ${BOR}`, paddingBottom: 18 }}>
            <SectionHead icon={<IcoCatService />} label="Catégorie de service" />

            <div style={{
              display: "flex", gap: 10, overflowX: "auto",
              scrollbarWidth: "none", paddingBottom: 4,
            }}>
              {CATEGORIES.map(cat => {
                const active = filters.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => set("category", cat.id)}
                    style={{
                      flexShrink: 0,
                      width: 72, height: 84,
                      borderRadius: 16,
                      border: `1.5px solid ${active ? G : BOR}`,
                      background: active ? "#F0FDF4" : "#fff",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", gap: 7,
                      transition: "all 200ms ease-out",
                      animation: "sf-fadein 250ms cubic-bezier(.22,1,.36,1) both",
                    }}
                  >
                    <span style={{ color: active ? G : "#6B7280", display: "flex" }}>
                      {cat.icon}
                    </span>
                    <span style={{
                      fontSize: 11.5, fontWeight: active ? 700 : 500,
                      color: active ? G : T1, fontFamily: "inherit",
                      lineHeight: 1.2, textAlign: "center",
                    }}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* 2. Localisation                                  */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${BOR}` }}>
            <SectionHead icon={<IcoLocation />} label="Localisation" />

            {/* Ma position field */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              border: `1px solid ${BOR}`, borderRadius: 18,
              padding: "12px 16px", background: BG, marginBottom: 10,
            }}>
              <IcoLocationPin />
              <input
                value={filters.location}
                onChange={e => set("location", e.target.value)}
                placeholder="Ma position"
                style={{
                  flex: 1, border: "none", outline: "none", background: "none",
                  fontSize: 14, color: T1, fontFamily: "inherit",
                }}
              />
            </div>

            {/* Rayon dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setRayonOpen(p => !p)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  border: `1px solid ${BOR}`, borderRadius: 18,
                  padding: "12px 16px", background: "var(--theme-surface)", cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, color: T2, fontWeight: 500, marginBottom: 2 }}>Rayon</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{filters.rayon}</span>
                </div>
                <IcoChevDown />
              </button>
              {rayonOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
                  background: "var(--theme-surface)", border: `1px solid ${BOR}`, borderRadius: 14,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.08)", overflow: "hidden",
                }}>
                  {RAYONS.map(r => (
                    <button
                      key={r}
                      onClick={() => { set("rayon", r); setRayonOpen(false); }}
                      style={{
                        width: "100%", padding: "12px 16px", textAlign: "left",
                        background: filters.rayon === r ? "#F0FDF4" : "#fff",
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                        fontSize: 14, color: filters.rayon === r ? G : T1,
                        fontWeight: filters.rayon === r ? 700 : 400,
                        borderBottom: `1px solid ${BOR}`,
                      }}
                    >{r}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* 3. Prix (FCFA)                                   */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${BOR}` }}>
            <SectionHead icon={<IcoPrice />} label="Prix (FCFA)" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRIX_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => set("prix", filters.prix === opt.id ? "" : opt.id)}
                  style={pill(filters.prix === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* 4. Note minimale                                 */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${BOR}` }}>
            <SectionHead icon={<IcoStar />} label="Note minimale" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {NOTE_OPTIONS.map(opt => {
                const active = filters.note === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => set("note", opt.id)}
                    style={{
                      ...pill(active),
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <span>{opt.label}</span>
                    {opt.star && <IcoStarFill />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* 5. Disponible maintenant                        */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{
            padding: "18px 0",
            borderBottom: `1px solid ${BOR}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IcoClock />
              <span style={{ fontWeight: 700, fontSize: 15, color: T1 }}>Disponible maintenant</span>
            </div>
            <Toggle on={filters.disponible} onChange={v => set("disponible", v)} />
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* 6. Prestataires vérifiés                        */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{
            padding: "18px 0",
            borderBottom: `1px solid ${BOR}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IcoVerified />
              <span style={{ fontWeight: 700, fontSize: 15, color: T1 }}>Prestataires vérifiés uniquement</span>
            </div>
            <Toggle on={filters.verifie} onChange={v => set("verifie", v)} />
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* 7. Expérience                                    */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${BOR}` }}>
            <SectionHead icon={<IcoExp />} label="Expérience" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {EXP_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => set("experience", filters.experience === opt.id ? "" : opt.id)}
                  style={pill(filters.experience === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* 8. Sexe                                          */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${BOR}` }}>
            <SectionHead icon={<IcoGender />} label="Sexe" />
            <div style={{ display: "flex", gap: 8 }}>
              {SEXE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => set("sexe", opt.id)}
                  style={pill(filters.sexe === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* 9. Trier par                                     */}
          {/* ════════════════════════════════════════════════ */}
          <div style={{ padding: "18px 0 0" }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setTriOpen(p => !p)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  border: `1px solid ${BOR}`, borderRadius: 18,
                  padding: "14px 16px", background: "var(--theme-surface)", cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IcoSort />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, color: T2, fontWeight: 500, marginBottom: 2 }}>Trier par</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T1 }}>{filters.tri}</span>
                  </div>
                </div>
                <IcoChevDown />
              </button>
              {triOpen && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, zIndex: 10,
                  background: "var(--theme-surface)", border: `1px solid ${BOR}`, borderRadius: 14,
                  boxShadow: "0 -8px 32px rgba(0,0,0,0.08)", overflow: "hidden",
                }}>
                  {TRI_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => { set("tri", t); setTriOpen(false); }}
                      style={{
                        width: "100%", padding: "12px 16px", textAlign: "left",
                        background: filters.tri === t ? "#F0FDF4" : "#fff",
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                        fontSize: 14, color: filters.tri === t ? G : T1,
                        fontWeight: filters.tri === t ? 700 : 400,
                        borderBottom: `1px solid ${BOR}`,
                      }}
                    >{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom padding for scroll */}
          <div style={{ height: 16 }} />
        </div>

        {/* ── Actions ────────────────────────────────────── */}
        <div style={{
          padding: "14px 20px",
          paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))",
          borderTop: `1px solid ${BOR}`,
          background: "var(--theme-surface)",
          flexShrink: 0,
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {/* Voir les résultats */}
          <button
            onClick={() => { onApply(filters); onClose(); }}
            style={{
              width: "100%", height: 56,
              background: `linear-gradient(135deg, ${G} 0%, ${GD} 100%)`,
              border: "none", borderRadius: 16,
              color: "#fff", fontWeight: 700, fontSize: 16,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: `0 4px 16px rgba(34,197,94,0.35)`,
              transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
              letterSpacing: 0.1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            onMouseDown={e  => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
            onMouseUp={e    => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
            onTouchEnd={e   => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            Voir les résultats ({resultCount})
          </button>

          {/* Annuler */}
          <button
            onClick={onClose}
            style={{
              width: "100%", height: 48,
              background: "var(--theme-surface)",
              border: `1.5px solid ${G}`, borderRadius: 16,
              color: G, fontWeight: 700, fontSize: 15,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 200ms ease-out",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#F0FDF4"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; }}
          >
            Annuler
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sf-fadein {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        /* Hide scrollbar inside sheet */
        .sf-scroll::-webkit-scrollbar { display:none; }
      `}</style>
    </>
  );
}
