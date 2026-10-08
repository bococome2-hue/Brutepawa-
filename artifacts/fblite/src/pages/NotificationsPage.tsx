import { useState, useEffect, useRef } from "react";
import { useNavigate } from "../router";
import {
  apiGetNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  type ApiNotification,
} from "../lib/api";

/* ─── Design tokens ──────────────────────────────────────────── */
const G    = "var(--bp-primary)";
const GD   = "var(--bp-primary-dark)";
const BG   = "#F8FAFC";
const CARD = "#FFFFFF";
const T1   = "#111827";
const T2   = "#64748B";
const T3   = "#9CA3AF";
const BD   = "#E5E7EB";

/* ─── Category type ──────────────────────────────────────────── */
type Cat = "toutes" | "sociales" | "marketplace" | "emplois";

const CAT_TYPES: Record<Cat, string[]> = {
  toutes:      [],
  sociales:    ["like", "love", "haha", "wow", "sad", "angry", "comment", "friend", "message"],
  marketplace: ["marketplace", "listing", "product", "sale"],
  emplois:     ["job", "emploi", "recrutement"],
};

/* ─── Helpers ────────────────────────────────────────────────── */
function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)  return `Il y a ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `Il y a ${m} minute${m > 1 ? "s" : ""}`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Il y a ${h} heure${h > 1 ? "s" : ""}`;
  const day = Math.floor(h / 24);
  if (day < 7) return `Il y a ${day} jour${day > 1 ? "s" : ""}`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

const AV_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#D97706",G,"#0EA5E9","#D32F2F","#00838F"];
function avBg(n: string | null) {
  if (!n) return AV_COLORS[0];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) & 0xffff;
  return AV_COLORS[h % AV_COLORS.length];
}
function avInitials(n: string | null) {
  if (!n) return "?";
  const p = n.trim().split(" ");
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase();
}

/* ─── Type badge icons ───────────────────────────────────────── */
function TypeBadge({ type }: { type: string }) {
  const MAP: Record<string, { bg: string; icon: JSX.Element }> = {
    friend:  { bg: G,        icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    like:    { bg: "#EF4444", icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    love:    { bg: "#E91E63", icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    comment: { bg: "var(--bp-primary)", icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    message: { bg: "#06B6D4", icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    job:     { bg: "#F97316", icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
    marketplace: { bg: "#6366F1", icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
    deposit: { bg: G,        icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> },
    verify:  { bg: G,        icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> },
    system:  { bg: "#F97316", icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  };
  const c = MAP[type] ?? { bg: T3, icon: <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" stroke="#fff" strokeWidth="2"/><circle cx="12" cy="16" r="0.5" fill="#fff"/></svg> };
  return (
    <div style={{ position:"absolute", bottom:-2, right:-2, width:22, height:22, borderRadius:"50%", background:c.bg, border:"2.5px solid #fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
      {c.icon}
    </div>
  );
}

/* ─── Suggestions data ───────────────────────────────────────── */
const SUGGESTIONS = [
  {
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    title: "Rejoindre des groupes",
    desc:  "Découvrez des communautés qui vous intéressent",
    path:  "/groups",
  },
  {
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    title: "Explorer le Marketplace",
    desc:  "Des milliers d'articles vous attendent",
    path:  "/marketplace",
  },
  {
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
    title: "Suivre une formation",
    desc:  "Développez vos compétences avec BrutePawa",
    path:  "/formations",
  },
  {
    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
    title: "Inviter des amis",
    desc:  "Plus vous invitez, plus vous gagnez",
    path:  "/friends",
  },
];

/* ─── Activities data ────────────────────────────────────────── */
const ACTIVITIES = [
  {
    bg:    G,
    icon:  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    title: "Compte vérifié",
    desc:  "Félicitations ! Votre compte est désormais vérifié.",
  },
  {
    bg:    "#F97316",
    icon:  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    title: "Annonce populaire",
    desc:  "Votre annonce a reçu 25 vues aujourd'hui.",
  },
  {
    bg:    "#10B981",
    icon:  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    title: "Dépôt reçu",
    desc:  "Vous avez reçu un dépôt de 25 000 FCFA.",
  },
  {
    bg:    "#8B5CF6",
    icon:  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
    title: "Nouvelle formation",
    desc:  "« Marketing Digital » est maintenant disponible.",
  },
];

/* ─── CSS animations ─────────────────────────────────────────── */
const ANIM_CSS = `
@keyframes bp-fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes bp-spin { to { transform: rotate(360deg); } }
@keyframes bp-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.bp-notif-row {
  animation: bp-fadeUp 0.3s ease both;
}
.bp-notif-row:active {
  transform: scale(0.985);
  transition: transform 0.1s ease;
}
.bp-suggest-card:active {
  transform: scale(0.96);
  transition: transform 0.1s ease;
}
.bp-activity-card:active {
  transform: scale(0.97);
  transition: transform 0.1s ease;
}
.bp-tab-btn {
  transition: color 0.15s ease;
}
.bp-notif-scroll::-webkit-scrollbar { display: none; }
.bp-notif-scroll { scrollbar-width: none; }
`;

/* ─── Main page ──────────────────────────────────────────────── */
export default function NotificationsPage() {
  const navigate   = useNavigate();
  const [notifs, setNotifs]       = useState<ApiNotification[]>([]);
  const [loading, setLoading]     = useState(true);
  const [cat, setCat]             = useState<Cat>("toutes");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch]         = useState("");
  const [showAll, setShowAll]       = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGetNotifications()
      .then(setNotifs).catch(() => {}).finally(() => setLoading(false));
    const iv = setInterval(() => {
      apiGetNotifications().then(setNotifs).catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const markAllRead = async () => {
    setNotifs(ns => ns.map(n => ({ ...n, isRead: true })));
    await apiMarkAllNotificationsRead().catch(() => {});
  };

  const markRead = async (n: ApiNotification) => {
    if (!n.isRead) {
      setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      await apiMarkNotificationRead(n.id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  /* ── filtering ── */
  const filtered = notifs.filter(n => {
    if (cat !== "toutes" && CAT_TYPES[cat].length > 0 && !CAT_TYPES[cat].includes(n.type)) return false;
    if (search.trim()) {
      const q   = search.toLowerCase();
      const hay = `${n.actorName ?? ""} ${n.action} ${n.detail ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const countCat = (c: Cat) => {
    if (c === "toutes") return notifs.filter(x => !x.isRead).length;
    return notifs.filter(x => !x.isRead && (CAT_TYPES[c].length === 0 || CAT_TYPES[c].includes(x.type))).length;
  };

  const CATS: { id: Cat; label: string }[] = [
    { id: "toutes",      label: "Toutes"      },
    { id: "sociales",    label: "Sociales"    },
    { id: "marketplace", label: "Marketplace" },
    { id: "emplois",     label: "Emplois"     },
  ];

  const displayed = showAll ? filtered : filtered.slice(0, 6);

  /* ─── Notification card ──────────────────────────────────── */
  function NotifCard({ notif, idx }: { notif: ApiNotification; idx: number }) {
    const name  = notif.actorName ?? "Système";
    const bg    = avBg(notif.actorName);
    const abbr  = avInitials(notif.actorName);

    return (
      <div
        className="bp-notif-row"
        onClick={() => markRead(notif)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "13px 16px",
          background: notif.isRead ? CARD : `${G}08`,
          borderBottom: `1px solid #F1F5F9`,
          cursor: "pointer",
          animationDelay: `${idx * 50}ms`,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* ── Avatar + type badge ── */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: bg, overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: notif.isRead ? "none" : `2px solid ${G}`,
          }}>
            {notif.actorAvatarUrl
              ? <img src={notif.actorAvatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#fff", fontWeight: 800, fontSize: 17, lineHeight: 1 }}>{abbr}</span>
            }
          </div>
          <TypeBadge type={notif.type} />
        </div>

        {/* ── Text ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, lineHeight: 1.45, color: T1 }}>
            <span style={{ fontWeight: 700 }}>{name}</span>
            {" "}
            <span style={{ fontWeight: 400, color: "#64748B" }}>{notif.action}</span>
          </div>
          {notif.detail && (
            <div style={{
              fontSize: 13, color: T2, marginTop: 2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {notif.detail}
            </div>
          )}
          <div style={{
            marginTop: 3, fontSize: 12, fontWeight: 500,
            color: notif.isRead ? T3 : G,
          }}>
            {timeAgo(notif.createdAt)}
          </div>
        </div>

        {/* ── Right side: thumbnail | count | dot + chevron ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {notif.thumbnailUrl && (
            <img
              src={notif.thumbnailUrl}
              alt=""
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
          )}
          {!notif.thumbnailUrl && notif.messageCount != null && notif.messageCount > 0 && (
            <span style={{
              background: G, color: "#fff",
              borderRadius: 20, padding: "3px 9px",
              fontSize: 12, fontWeight: 700, lineHeight: 1.4,
            }}>
              {notif.messageCount}
            </span>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: notif.isRead ? "transparent" : G,
              flexShrink: 0,
            }} />
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div style={{ background: BG, minHeight: "100vh", maxWidth: 640, margin: "0 auto", paddingBottom: 90 }}>
      <style>{ANIM_CSS}</style>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div style={{
        background: CARD, borderBottom: `1px solid ${BD}`,
        padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 40,
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}>
        {/* Back */}
        <button
          onClick={() => window.history.back()}
          style={{ width: 36, height: 36, borderRadius: "50%", background: BG, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T1, flexShrink: 0 }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        {/* Title */}
        <div style={{ flex: 1, fontWeight: 800, fontSize: 20, color: T1, letterSpacing: "-0.3px" }}>
          Notifications
        </div>

        {/* Search */}
        <button
          onClick={() => { setSearchOpen(o => !o); setSearch(""); }}
          style={{ width: 36, height: 36, borderRadius: "50%", background: searchOpen ? G : "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: searchOpen ? "#fff" : T2, flexShrink: 0, transition: "all .2s" }}
        >
          {searchOpen
            ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          }
        </button>

        {/* Mark all read pill */}
        <button
          onClick={markAllRead}
          style={{ display: "flex", alignItems: "center", gap: 5, background: CARD, border: `1.5px solid ${BD}`, borderRadius: 20, padding: "5px 11px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: G }}>Tout marquer comme lu</span>
        </button>

        {/* 3-dot menu */}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T2 }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <circle cx="12" cy="5"  r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", right: 0, top: 38, background: CARD, border: `1px solid ${BD}`, borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 190, zIndex: 50, overflow: "hidden" }}>
              {[
                { label: "Paramètres des notifs", path: "/settings/notifications" },
                { label: "Tout supprimer",          action: () => setNotifs([]) },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => { setMenuOpen(false); if ("path" in item) navigate(item.path as string); else (item as { action: () => void }).action(); }}
                  style={{ display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", textAlign: "left", fontSize: 14, color: T1, cursor: "pointer", borderTop: i > 0 ? `1px solid ${BD}` : "none" }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ SEARCH BAR ══════════════════════════════════════════ */}
      {searchOpen && (
        <div style={{ background: CARD, padding: "8px 14px 10px", borderBottom: `1px solid #F1F5F9` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: BG, borderRadius: 12, padding: "9px 14px", border: `1px solid ${BD}` }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={T3} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher dans les notifications…"
              style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 14, color: T1 }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: T3, padding: 0, display: "flex" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ FILTER TABS ═════════════════════════════════════════ */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BD}`, overflowX: "auto" }} className="bp-notif-scroll">
        <div style={{ display: "flex", paddingLeft: 4, minWidth: "max-content" }}>
          {CATS.map(c => {
            const cnt    = countCat(c.id);
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                className="bp-tab-btn"
                onClick={() => { setCat(c.id); setShowAll(false); }}
                style={{
                  flex: "0 0 auto",
                  padding: "13px 16px 11px",
                  border: "none", background: "none", cursor: "pointer",
                  fontWeight: active ? 700 : 500, fontSize: 14,
                  color: active ? G : T2,
                  borderBottom: active ? `2.5px solid ${G}` : "2.5px solid transparent",
                  display: "flex", alignItems: "center", gap: 6,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {c.label}
                {cnt > 0 && (
                  <span style={{
                    background: active ? G : "#E5E7EB",
                    color: active ? "#fff" : T2,
                    borderRadius: 99, padding: "1px 7px",
                    fontSize: 11, fontWeight: 700, lineHeight: "1.5",
                  }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ LOADING ═════════════════════════════════════════════ */}
      {loading && (
        <div style={{ background: CARD, padding: "56px 20px", textAlign: "center" }}>
          <div style={{ width: 34, height: 34, border: `3px solid #E5E7EB`, borderTopColor: G, borderRadius: "50%", animation: "bp-spin .7s linear infinite", margin: "0 auto 14px" }} />
          <div style={{ color: T3, fontSize: 14 }}>Chargement des notifications…</div>
        </div>
      )}

      {/* ══ EMPTY ═══════════════════════════════════════════════ */}
      {!loading && filtered.length === 0 && (
        <div style={{ background: CARD, margin: "12px", borderRadius: 20, padding: "48px 20px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: T1, marginBottom: 6 }}>Aucune notification</div>
          <div style={{ fontSize: 13.5, color: T3 }}>Vous êtes à jour !</div>
        </div>
      )}

      {/* ══ NOTIFICATIONS LIST ══════════════════════════════════ */}
      {!loading && filtered.length > 0 && (
        <div style={{ background: CARD }}>

          {/* Section header */}
          <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: T1 }}>Récentes</span>
            <button
              onClick={() => setShowAll(true)}
              style={{ background: "none", border: "none", color: G, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}
            >
              Tout voir
            </button>
          </div>

          {/* Notification rows */}
          {displayed.map((n, i) => (
            <NotifCard key={n.id} notif={n} idx={i} />
          ))}

          {/* Voir plus button */}
          <button
            onClick={() => setShowAll(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              width: "100%", padding: "14px 16px",
              background: "none", border: "none",
              borderTop: `1px solid #F1F5F9`,
              cursor: "pointer", color: T2, fontSize: 13.5, fontWeight: 500,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Voir plus de notifications
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      )}

      {/* ══ SUGGESTIONS BRUTEPAWA ═══════════════════════════════ */}
      <div style={{ margin: "12px 12px 0", background: CARD, borderRadius: 20, padding: "16px 0 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 16, marginBottom: 14 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: G }}>Suggestions BrutePawa</span>
          <button style={{ background: "none", border: "none", color: G, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}>
            Voir tout
          </button>
        </div>

        {/* Horizontal scroll of cards */}
        <div
          className="bp-notif-scroll"
          style={{ display: "flex", gap: 10, overflowX: "auto", paddingLeft: 16, paddingRight: 16, scrollSnapType: "x mandatory" }}
        >
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              className="bp-suggest-card"
              onClick={() => navigate(s.path)}
              style={{
                flex: "0 0 auto", width: 132,
                background: BG, border: `1.5px solid #F1F5F9`,
                borderRadius: 16, padding: "14px 12px 12px",
                cursor: "pointer", textAlign: "left",
                display: "flex", flexDirection: "column", gap: 8,
                scrollSnapAlign: "start",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: T1, marginBottom: 3, lineHeight: 1.35 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: T3, lineHeight: 1.4 }}>{s.desc}</div>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-start", marginTop: "auto" }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ══ ACTIVITÉS IMPORTANTES ═══════════════════════════════ */}
      <div style={{ margin: "12px 12px 16px", background: CARD, borderRadius: 20, padding: "16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${G}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: T1 }}>Activités importantes</span>
        </div>

        {/* 2×2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ACTIVITIES.map((a, i) => (
            <button
              key={i}
              className="bp-activity-card"
              style={{
                background: BG, borderRadius: 16, padding: "12px 10px",
                border: `1.5px solid #F1F5F9`,
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", textAlign: "left",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* Icon */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {a.icon}
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 11.5, color: T1, lineHeight: 1.3, marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 10.5, color: T3, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{a.desc}</div>
              </div>
              {/* Chevron */}
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
