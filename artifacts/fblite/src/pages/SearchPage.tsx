import { useState, useEffect, useRef } from "react";
import { useNavigate } from "../router";
import {
  apiSearch,
  apiSendFriendRequest,
  type SearchUserDTO,
  type SearchGroupDTO,
  type SearchPostDTO,
  type SearchArticleDTO,
  type SearchStatsDTO,
} from "../lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatK(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function slugHandle(first: string, last: string): string {
  return "@" + (first + "." + last).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]/g, "").replace(/\.{2,}/g, ".");
}
function initials(u: SearchUserDTO): string {
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}
const AV_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#D97706","#388E3C","#D32F2F","#00838F","#5D4037"];
function avColor(id: number): string { return AV_COLORS[id % AV_COLORS.length]; }

// ── Constants ────────────────────────────────────────────────────────────────
const CONTINENTS = [
  { id: "all",      label: "Tous les pays" },
  { id: "afrique",  label: "Afrique" },
  { id: "amerique", label: "Amérique" },
  { id: "europe",   label: "Europe" },
  { id: "asie",     label: "Asie" },
  { id: "oceanie",  label: "Océanie" },
];

const COUNTRIES = [
  { flag: "🇺🇸", name: "États-Unis" },
  { flag: "🇫🇷", name: "France" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇬🇧", name: "Royaume-Uni" },
  { flag: "🇩🇪", name: "Allemagne" },
  { flag: "🇪🇸", name: "Espagne" },
  { flag: "🇮🇹", name: "Italie" },
  { flag: "🇧🇷", name: "Brésil" },
  { flag: "🇲🇦", name: "Maroc" },
  { flag: "🇸🇳", name: "Sénégal" },
  { flag: "🇨🇮", name: "Côte d'Ivoire" },
  { flag: "🇲🇱", name: "Mali" },
  { flag: "🇧🇯", name: "Bénin" },
  { flag: "🇹🇬", name: "Togo" },
  { flag: "🇧🇫", name: "Burkina Faso" },
  { flag: "🇳🇪", name: "Niger" },
  { flag: "🇨🇲", name: "Cameroun" },
];

type Tab = "personnes" | "publications" | "groupes" | "articles" | "entreprises";
type FollowState = "none" | "pending" | "followed";

// ── Globe SVG ────────────────────────────────────────────────────────────────
function GlobeSvg() {
  return (
    <div style={{ position: "relative", width: 115, height: 115, flexShrink: 0 }}>
      <svg width="105" height="105" viewBox="0 0 105 105" style={{ overflow: "visible" }}>
        <defs>
          <radialGradient id="gGrad" cx="36%" cy="32%" r="68%">
            <stop offset="0%"   stopColor="#6EE7B7" />
            <stop offset="45%"  stopColor="var(--bp-primary)" />
            <stop offset="100%" stopColor="#15803D" />
          </radialGradient>
          <clipPath id="gClip"><circle cx="52" cy="52" r="48" /></clipPath>
        </defs>
        <circle cx="52" cy="52" r="48" fill="url(#gGrad)" />
        <g clipPath="url(#gClip)" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2">
          <ellipse cx="52" cy="52" rx="21" ry="48" />
          <ellipse cx="52" cy="52" rx="40" ry="48" />
          <ellipse cx="52" cy="52" rx="48" ry="16" />
          <ellipse cx="52" cy="52" rx="48" ry="32" />
        </g>
        <circle cx="52" cy="52" r="48" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        {/* Location pin */}
        <path d="M52 24 C46 24 42 28.5 42 34 C42 42 52 51 52 51 C52 51 62 42 62 34 C62 28.5 58 24 52 24Z"
          fill="white" fillOpacity="0.92" />
        <circle cx="52" cy="34" r="4.5" fill="var(--bp-primary)" />
      </svg>
      {/* Floating avatar circles */}
      <div style={{ position:"absolute", top:2, right:-4, width:28, height:28, borderRadius:"50%", background:"#8B5CF6", border:"2.5px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:12 }}>A</div>
      <div style={{ position:"absolute", top:36, right:-16, width:24, height:24, borderRadius:"50%", background:"#F59E0B", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:10 }}>K</div>
      <div style={{ position:"absolute", bottom:12, right:-6, width:26, height:26, borderRadius:"50%", background:"#EF4444", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:11 }}>M</div>
      <div style={{ position:"absolute", bottom:2, left:2, width:22, height:22, borderRadius:"50%", background:"var(--bp-primary)", border:"2px solid #fff" }} />
    </div>
  );
}

// ── Magnifying glass empty state ─────────────────────────────────────────────
function MagnifyGlass() {
  return (
    <div style={{ display:"flex", justifyContent:"center", margin:"20px 0 12px" }}>
      <svg width="82" height="82" viewBox="0 0 82 82">
        <defs>
          <radialGradient id="mgGrad" cx="38%" cy="38%">
            <stop offset="0%" stopColor="#D1FAE5" />
            <stop offset="100%" stopColor="#A7F3D0" />
          </radialGradient>
        </defs>
        {/* Decorative diamonds */}
        <rect x="8"  y="8"  width="9" height="9" rx="2" fill="#DCFCE7" transform="rotate(45 12.5 12.5)" />
        <rect x="57" y="7"  width="8" height="8" rx="2" fill="#DCFCE7" transform="rotate(45 61 11)" />
        <rect x="6"  y="55" width="7" height="7" rx="2" fill="#DCFCE7" transform="rotate(45 9.5 58.5)" />
        {/* Lens */}
        <circle cx="36" cy="35" r="23" fill="url(#mgGrad)" />
        <circle cx="36" cy="35" r="23" fill="none" stroke="var(--bp-primary)" strokeWidth="5.5" />
        <circle cx="36" cy="35" r="14" fill="white" />
        {/* Handle */}
        <line x1="53" y1="52" x2="70" y2="69" stroke="var(--bp-primary)" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ── Verified icon ─────────────────────────────────────────────────────────────
function Verified() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="var(--bp-primary)" style={{ flexShrink:0 }}>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props { q: string }

export default function SearchPage({ q }: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("personnes");
  const [activeContinent, setActiveContinent] = useState("all");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [showMoreCountries, setShowMoreCountries] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats]     = useState<SearchStatsDTO>({ users:0, posts:0, groups:0, articles:0 });
  const [users, setUsers]     = useState<SearchUserDTO[]>([]);
  const [groups, setGroups]   = useState<SearchGroupDTO[]>([]);
  const [posts, setPosts]     = useState<SearchPostDTO[]>([]);
  const [articles, setArticles] = useState<SearchArticleDTO[]>([]);
  const [followStates, setFollowStates] = useState<Record<number, FollowState>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset filters when query changes
  useEffect(() => {
    setActiveTab("personnes");
    setActiveContinent("all");
    setActiveCountry(null);
  }, [q]);

  // Fetch search results
  useEffect(() => {
    if (!q.trim()) {
      setStats({ users:0, posts:0, groups:0, articles:0 });
      setUsers([]); setGroups([]); setPosts([]); setArticles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await apiSearch(q, {
          country: activeCountry ?? undefined,
          region:  (!activeCountry && activeContinent !== "all")
            ? (activeContinent as "afrique" | "amerique" | "europe" | "asie" | "oceanie")
            : undefined,
        });
        setStats(data.stats);
        setUsers(data.users);
        setGroups(data.groups);
        setPosts(data.posts);
        setArticles(data.articles);
        const initial: Record<number, FollowState> = {};
        data.users.forEach(u => {
          initial[u.id] =
            u.friendshipStatus === "friends"      ? "followed"
            : u.friendshipStatus === "pending_sent" ? "pending"
            : "none";
        });
        setFollowStates(initial);
      } catch {
        setStats({ users:0, posts:0, groups:0, articles:0 });
        setUsers([]); setGroups([]); setPosts([]); setArticles([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, activeContinent, activeCountry]);

  const handleFollow = async (userId: number) => {
    setFollowStates(prev => ({ ...prev, [userId]: "pending" }));
    try {
      await apiSendFriendRequest(userId);
      setFollowStates(prev => ({ ...prev, [userId]: "followed" }));
    } catch {
      setFollowStates(prev => ({ ...prev, [userId]: "none" }));
    }
  };

  const postsWithImg = posts.filter(p => p.imageUrl || p.thumbnailUrl);
  const displayCountries = showMoreCountries ? COUNTRIES : COUNTRIES.slice(0, 17);

  // ── Shared styles ────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "var(--theme-surface)",
    borderRadius: 14,
    overflow: "hidden",
  };
  const cardHeader: React.CSSProperties = {
    padding: "11px 13px",
    borderBottom: "1px solid #F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  return (
    <div style={{ background: "#F3F4F6", minHeight: "100vh" }}>

      {/* ═══════════════════════════════════════════════════════════
          HERO BANNER
      ═══════════════════════════════════════════════════════════ */}
      {q ? (
        <div style={{
          background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 55%, #BBF7D0 100%)",
          padding: "18px 16px 16px",
          overflow: "hidden",
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
            {/* Left */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                <span style={{ fontSize:27, fontWeight:900, color:"#111827", lineHeight:1 }}>{q}</span>
              </div>
              <p style={{ fontSize:12, color:"#374151", lineHeight:1.5, margin:"0 0 13px", maxWidth:220 }}>
                Découvrez les contenus, personnes et activités liés à {q} dans le monde entier
              </p>
              {/* Stats */}
              <div style={{ display:"flex", gap:14 }}>
                {([
                  { val: stats.posts,    label: "Publications" },
                  { val: stats.users,    label: "Personnes" },
                  { val: stats.groups,   label: "Groupes" },
                  { val: stats.articles, label: "Entreprises" },
                ] as const).map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize:15, fontWeight:800, color:"#111827", lineHeight:1 }}>
                      {formatK(s.val)}
                    </div>
                    <div style={{ fontSize:10, color:"#6B7280", marginTop:1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Globe illustration */}
            <GlobeSvg />
          </div>
        </div>
      ) : (
        <div style={{ padding:"48px 20px", textAlign:"center", color:"#6B7280" }}>
          <svg viewBox="0 0 24 24" width="52" height="52" fill="#D1D5DB" style={{ marginBottom:14 }}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <div style={{ fontSize:16, fontWeight:700, color:"#374151", marginBottom:4 }}>
            Rechercher sur BrutePawa
          </div>
          <div style={{ fontSize:13 }}>Tapez un mot-clé dans la barre de recherche</div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CATEGORY TABS
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"0 12px" }}>
        <div style={{ display:"flex", gap:2, overflowX:"auto", scrollbarWidth:"none", padding:"9px 0" }}>
          {([ 
            { id:"personnes",    label:"Personnes",    icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> },
            { id:"publications", label:"Publications", icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> },
            { id:"groupes",      label:"Groupes",      icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 12.75c1.63 0 3.07.39 4.24.9.98.44 1.76 1.14 1.76 2.1V17H6v-1.25c0-.96.78-1.66 1.76-2.1 1.17-.51 2.61-.9 4.24-.9zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm16 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg> },
            { id:"articles",     label:"Articles",     icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg> },
            { id:"entreprises",  label:"Entreprises",  icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => {
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding:"7px 13px", borderRadius:20, border:"none", cursor:"pointer",
                fontWeight:600, fontSize:13, whiteSpace:"nowrap",
                background: active ? "var(--bp-primary)" : "transparent",
                color: active ? "#fff" : "#374151",
                display:"flex", alignItems:"center", gap:5, flexShrink:0,
                transition:"background .15s",
              }}>
                <span style={{ color: active ? "#fff" : "#6B7280" }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          REGION FILTER
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ background:"#fff", padding:"12px 16px", marginTop:8, marginBottom:8 }}>
        {/* Continent row */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#6B7280">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>Monde entier</span>
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            {CONTINENTS.map(c => {
              const active = (activeContinent === c.id && !activeCountry);
              return (
                <button key={c.id} onClick={() => { setActiveContinent(c.id); setActiveCountry(null); }} style={{
                  padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer",
                  fontWeight:600, fontSize:12, flexShrink:0,
                  background: active ? "var(--bp-primary)" : "#F3F4F6",
                  color: active ? "#fff" : "#374151",
                  transition:"background .15s",
                }}>{c.label}</button>
              );
            })}
          </div>
        </div>
        {/* Country flag pills */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 8px" }}>
          {displayCountries.map(c => {
            const active = activeCountry === c.name;
            return (
              <button key={c.name}
                onClick={() => setActiveCountry(active ? null : c.name)} style={{
                  padding:"4px 10px", borderRadius:20, cursor:"pointer", fontWeight:500,
                  fontSize:12, display:"flex", alignItems:"center", gap:4,
                  border:`1.5px solid ${active ? "var(--bp-primary)" : "#E5E7EB"}`,
                  background: active ? "#F0FDF4" : "#fff",
                  color: active ? "#15803D" : "#374151",
                  transition:"all .15s",
                }}>
                <span style={{ fontSize:15, lineHeight:1 }}>{c.flag}</span>
                {c.name}
              </button>
            );
          })}
          {!showMoreCountries && (
            <button onClick={() => setShowMoreCountries(true)} style={{
              padding:"4px 10px", borderRadius:20, border:"1.5px solid #E5E7EB",
              background:"#fff", cursor:"pointer", fontSize:12, color:"#374151", fontWeight:500,
            }}>Plus ˅</button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          LOADING SPINNER
      ═══════════════════════════════════════════════════════════ */}
      {loading && (
        <div style={{ padding:"40px 16px", textAlign:"center" }}>
          <div style={{
            width:32, height:32, borderRadius:"50%",
            border:"3px solid var(--bp-primary)", borderTopColor:"transparent",
            animation:"sp .8s linear infinite", margin:"0 auto",
          }} />
          <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: PERSONNES — Discovery layout
      ═══════════════════════════════════════════════════════════ */}
      {!loading && q && activeTab === "personnes" && (
        <>
          {/* Row 1: People (left) + Groups (right) */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"0 8px" }}>

            {/* ─── Personnes card ──────────────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeader}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--bp-primary)">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                    <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Personnes</span>
                  </div>
                  <div style={{ fontSize:10, color:"#9CA3AF", marginTop:1 }}>
                    Plus de {formatK(stats.users)} personnes trouvées
                  </div>
                </div>
              </div>

              {users.length === 0 ? (
                <div style={{ padding:"24px 13px", textAlign:"center" }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>🔍</div>
                  <div style={{ fontSize:12, color:"#6B7280" }}>Aucune personne trouvée</div>
                </div>
              ) : users.slice(0, 5).map((user, i) => {
                const fs = followStates[user.id] ?? "none";
                return (
                  <div key={user.id} style={{
                    padding:"10px 13px",
                    borderBottom: i < Math.min(users.length, 5) - 1 ? "1px solid #F9FAFB" : "none",
                  }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:7 }}>
                      {/* Avatar */}
                      <div onClick={() => navigate(`/profile/${user.id}`)} style={{ cursor:"pointer", flexShrink:0 }}>
                        {user.avatarUrl
                          ? <img src={user.avatarUrl} alt="" style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover", display:"block" }} />
                          : <div style={{ width:40, height:40, borderRadius:"50%", background:avColor(user.id), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14 }}>{initials(user)}</div>
                        }
                      </div>
                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:3, flexWrap:"nowrap" }}>
                          <span style={{ fontSize:12, fontWeight:700, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {user.firstName} {user.lastName}
                          </span>
                          {user.verified && <Verified />}
                        </div>
                        <div style={{ fontSize:10, color:"#9CA3AF", lineHeight:1.3 }}>
                          {slugHandle(user.firstName, user.lastName)}
                        </div>
                        {user.country && (
                          <div style={{ fontSize:10, color:"#6B7280", lineHeight:1.3 }}>📍 {user.country}</div>
                        )}
                        {user.bio && (
                          <div style={{ fontSize:10, color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.3 }}>
                            {user.bio}
                          </div>
                        )}
                      </div>
                      {/* Right: followers + follow button */}
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#111827", lineHeight:1 }}>
                            {formatK(user.followersCount)}
                          </div>
                          <div style={{ fontSize:9, color:"#9CA3AF" }}>Abonnés</div>
                        </div>
                        {fs === "none" && (
                          <button onClick={() => handleFollow(user.id)} style={{
                            border:"1.5px solid var(--bp-primary)", borderRadius:20,
                            padding:"3px 11px", fontSize:11, fontWeight:700,
                            color:"var(--bp-primary)", background:"none", cursor:"pointer",
                          }}>Suivre</button>
                        )}
                        {fs === "pending" && (
                          <button disabled style={{
                            border:"1.5px solid #9CA3AF", borderRadius:20,
                            padding:"3px 9px", fontSize:10, fontWeight:600,
                            color:"#9CA3AF", background:"none",
                          }}>Envoyé</button>
                        )}
                        {fs === "followed" && (
                          <button disabled style={{
                            border:"none", borderRadius:20, padding:"3px 9px",
                            fontSize:10, fontWeight:600, color:"var(--bp-primary)", background:"#F0FDF4",
                          }}>✓ Suivi</button>
                        )}
                        <button style={{ background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", fontSize:17, lineHeight:1, padding:0 }}>
                          ⋯
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Groupes card ─────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeader}>
                <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Groupes</span>
                <span style={{ fontSize:11, fontWeight:600, color:"var(--bp-primary)" }}>
                  {groups.length === 0 ? "Aucun résultat" : `${groups.length} résultat${groups.length > 1 ? "s" : ""}`}
                </span>
              </div>

              {groups.length === 0 ? (
                <div style={{ padding:"10px 13px 18px" }}>
                  <MagnifyGlass />
                  <div style={{ fontSize:13, fontWeight:700, color:"#111827", textAlign:"center", marginBottom:4 }}>
                    Aucun résultat trouvé
                  </div>
                  <div style={{ fontSize:11, color:"#6B7280", textAlign:"center", lineHeight:1.5, marginBottom:16 }}>
                    Aucun groupe ne correspond à votre recherche.
                  </div>
                  <button onClick={() => setActiveTab("articles")} style={{
                    width:"100%", background:"var(--bp-primary)", color:"#fff",
                    border:"none", borderRadius:10, padding:"11px 16px",
                    fontSize:12, fontWeight:700, cursor:"pointer",
                  }}>
                    Explorer d'autres contenus
                  </button>
                </div>
              ) : groups.slice(0, 4).map((g, i) => (
                <div key={g.id} onClick={() => navigate(`/groups/${g.id}`)} style={{
                  padding:"10px 13px",
                  borderBottom: i < Math.min(groups.length, 4) - 1 ? "1px solid #F9FAFB" : "none",
                  cursor:"pointer",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      {g.emoji}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize:10, color:"#9CA3AF" }}>{formatK(g.membersCount)} membres</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2: Publications (left) + Articles (right) */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"8px 8px 16px" }}>

            {/* ─── Publications récentes ────────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#6B7280">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/>
                  </svg>
                  <span style={{ fontSize:12, fontWeight:700, color:"#111827" }}>Publications récentes</span>
                </div>
                <button onClick={() => setActiveTab("publications")} style={{
                  background:"none", border:"none", fontSize:11, color:"var(--bp-primary)", fontWeight:600, cursor:"pointer",
                }}>Voir tout ›</button>
              </div>
              <div style={{ padding:"10px 12px 12px" }}>
                {postsWithImg.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"12px 0", color:"#9CA3AF", fontSize:11 }}>
                    Aucune publication
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:3 }}>
                    {postsWithImg.slice(0, 3).map(p => (
                      <div key={p.id} onClick={() => navigate(`/posts/${p.id}`)} style={{
                        cursor:"pointer", aspectRatio:"1", overflow:"hidden", borderRadius:6,
                      }}>
                        <img
                          src={p.thumbnailUrl ?? p.imageUrl!}
                          alt=""
                          style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Articles populaires ──────────────────────────── */}
            <div style={cardStyle}>
              <div style={cardHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#6B7280">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/>
                  </svg>
                  <span style={{ fontSize:12, fontWeight:700, color:"#111827" }}>Articles populaires</span>
                </div>
                <button onClick={() => setActiveTab("articles")} style={{
                  background:"none", border:"none", fontSize:11, color:"var(--bp-primary)", fontWeight:600, cursor:"pointer",
                }}>Voir tout ›</button>
              </div>
              <div style={{ padding:"10px 12px 12px" }}>
                {articles.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"12px 0", color:"#9CA3AF", fontSize:11 }}>
                    Aucun article
                  </div>
                ) : articles.slice(0, 3).map(a => (
                  <div key={a.id} onClick={() => navigate(`/marketplace/${a.id}`)} style={{
                    cursor:"pointer", display:"flex", gap:8, marginBottom:8,
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:11, fontWeight:700, color:"#111827", lineHeight:1.35,
                        marginBottom:2, overflow:"hidden",
                        display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                      }}>{a.title}</div>
                      {a.description && (
                        <div style={{ fontSize:10, color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {a.description}
                        </div>
                      )}
                    </div>
                    {a.imageUrl && (
                      <img src={a.imageUrl} alt="" style={{ width:42, height:42, borderRadius:7, objectFit:"cover", flexShrink:0 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: PUBLICATIONS
      ═══════════════════════════════════════════════════════════ */}
      {!loading && q && activeTab === "publications" && (
        <div style={{ ...cardStyle, margin:"0 8px 16px" }}>
          <div style={{ padding:"11px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:6 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="#6B7280"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>
            <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Publications</span>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>· {formatK(stats.posts)}</span>
          </div>
          {posts.length === 0 ? (
            <div style={{ padding:"36px 16px", textAlign:"center", color:"#6B7280" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📭</div>
              <div style={{ fontWeight:600, marginBottom:4 }}>Aucune publication</div>
              <div style={{ fontSize:12 }}>Aucune publication ne correspond à « {q} ».</div>
            </div>
          ) : posts.map((p, i) => (
            <div key={p.id} onClick={() => navigate(`/posts/${p.id}`)} style={{
              padding:"12px 14px",
              borderBottom: i < posts.length - 1 ? "1px solid #F3F4F6" : "none",
              cursor:"pointer",
            }}>
              <div style={{ display:"flex", gap:8, marginBottom:7 }}>
                {p.authorAvatarUrl
                  ? <img src={p.authorAvatarUrl} alt="" style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                  : <div style={{ width:32, height:32, borderRadius:"50%", background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>📝</div>
                }
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>{p.authorName}</div>
                  <div style={{ fontSize:11, color:"#9CA3AF" }}>
                    {new Date(p.createdAt).toLocaleDateString("fr-FR", { day:"numeric", month:"short", year:"numeric" })}
                  </div>
                </div>
              </div>
              <div style={{ fontSize:13, color:"#374151", lineHeight:1.5, marginBottom: p.imageUrl ? 8 : 0 }}>
                {p.content.length > 140 ? p.content.slice(0, 140) + "…" : p.content}
              </div>
              {p.imageUrl && (
                <img src={p.thumbnailUrl ?? p.imageUrl} alt="" style={{ width:"100%", maxHeight:160, objectFit:"cover", borderRadius:8, display:"block" }} />
              )}
              <div style={{ display:"flex", gap:12, marginTop:7, fontSize:12, color:"#9CA3AF" }}>
                <span>👍 {p.likesCount}</span>
                <span>💬 {p.commentsCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: GROUPES
      ═══════════════════════════════════════════════════════════ */}
      {!loading && q && activeTab === "groupes" && (
        <div style={{ ...cardStyle, margin:"0 8px 16px" }}>
          <div style={{ padding:"11px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:6 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="#6B7280"><path d="M12 12.75c1.63 0 3.07.39 4.24.9.98.44 1.76 1.14 1.76 2.1V17H6v-1.25c0-.96.78-1.66 1.76-2.1 1.17-.51 2.61-.9 4.24-.9zM4 13c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm16 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM12 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z"/></svg>
            <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Groupes</span>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>· {formatK(stats.groups)}</span>
          </div>
          {groups.length === 0 ? (
            <div style={{ padding:"20px 14px 28px" }}>
              <MagnifyGlass />
              <div style={{ fontSize:13, fontWeight:700, color:"#111827", textAlign:"center", marginBottom:4 }}>Aucun résultat trouvé</div>
              <div style={{ fontSize:12, color:"#6B7280", textAlign:"center", marginBottom:20 }}>Aucun groupe ne correspond à « {q} ».</div>
              <button onClick={() => setActiveTab("articles")} style={{
                width:"100%", background:"var(--bp-primary)", color:"#fff", border:"none",
                borderRadius:10, padding:"12px 16px", fontSize:13, fontWeight:700, cursor:"pointer",
              }}>Explorer d'autres contenus</button>
            </div>
          ) : groups.map((g, i) => (
            <div key={g.id} onClick={() => navigate(`/groups/${g.id}`)} style={{
              display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
              borderBottom: i < groups.length - 1 ? "1px solid #F3F4F6" : "none",
              cursor:"pointer",
            }}>
              <div style={{ width:48, height:48, borderRadius:10, background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
                {g.emoji}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.name}</div>
                <div style={{ fontSize:12, color:"#6B7280" }}>
                  {formatK(g.membersCount)} membre{g.membersCount !== 1 ? "s" : ""} · {g.privacy === "private" ? "🔒 Privé" : "🌐 Public"}
                </div>
                {g.description && (
                  <div style={{ fontSize:12, color:"#9CA3AF", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: ARTICLES
      ═══════════════════════════════════════════════════════════ */}
      {!loading && q && activeTab === "articles" && (
        <div style={{ ...cardStyle, margin:"0 8px 16px" }}>
          <div style={{ padding:"11px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:6 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="#6B7280"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>
            <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Articles</span>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>· {formatK(stats.articles)}</span>
          </div>
          {articles.length === 0 ? (
            <div style={{ padding:"36px 16px", textAlign:"center", color:"#6B7280" }}>
              <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
              <div style={{ fontWeight:600, marginBottom:4 }}>Aucun article</div>
              <div style={{ fontSize:12 }}>Aucun article ne correspond à « {q} ».</div>
            </div>
          ) : articles.map((a, i) => (
            <div key={a.id} onClick={() => navigate(`/marketplace/${a.id}`)} style={{
              display:"flex", gap:12, padding:"12px 14px",
              borderBottom: i < articles.length - 1 ? "1px solid #F3F4F6" : "none",
              cursor:"pointer",
            }}>
              {a.imageUrl && (
                <img src={a.imageUrl} alt="" style={{ width:56, height:56, borderRadius:8, objectFit:"cover", flexShrink:0 }} />
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#111827", marginBottom:2 }}>{a.title}</div>
                {a.description && (
                  <div style={{ fontSize:12, color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.description}</div>
                )}
                <div style={{ fontSize:13, color:"var(--bp-primary)", fontWeight:700, marginTop:4 }}>
                  {a.price.toLocaleString("fr-FR")} {a.currency}
                </div>
                {a.location && <div style={{ fontSize:11, color:"#9CA3AF" }}>📍 {a.location}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: ENTREPRISES
      ═══════════════════════════════════════════════════════════ */}
      {!loading && q && activeTab === "entreprises" && (
        <div style={{ ...cardStyle, margin:"0 8px 16px" }}>
          <div style={{ padding:"11px 14px", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", gap:6 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="#6B7280"><path d="M12 7V3H2v18h20V7H12z"/></svg>
            <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Entreprises</span>
          </div>
          <div style={{ padding:"36px 16px", textAlign:"center", color:"#6B7280" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🏢</div>
            <div style={{ fontWeight:600, marginBottom:4 }}>Bientôt disponible</div>
            <div style={{ fontSize:12 }}>Les pages entreprises arrivent prochainement.</div>
          </div>
        </div>
      )}

    </div>
  );
}
