import { useState, useEffect, useRef, ReactNode, type ReactElement } from "react";
import { useLocation, useNavigate } from "./router";
import CreateModal from "./components/CreateModal";
import PostModal from "./components/PostModal";
import SearchSuggestionsDropdown from "./components/SearchSuggestionsDropdown";
import MobileSearchOverlay from "./components/MobileSearchOverlay";
import { apiGetFriendRequests, apiGetUnreadNotifCount } from "./lib/api";
import ImageViewer from "./components/ImageViewer";
import { useCurrentUser } from "./hooks/useCurrentUser";

interface Props {
  children: ReactNode;
  onNewPost?: (content: string) => void;
}

type Tab = "home" | "community" | "marketplace" | "notifications" | "menu";

const TABS: { id: Tab; icon: string; label: string; path: string }[] = [
  { id: "home",          icon: "🏠", label: "Accueil",     path: "/"             },
  { id: "community",     icon: "👥", label: "Communauté",  path: "/community"    },
  { id: "marketplace",   icon: "🛍️", label: "Marché",      path: "/marketplace"  },
  { id: "notifications", icon: "🔔", label: "Alertes",     path: "/notifications"},
  { id: "menu",          icon: "☰",  label: "Menu",        path: "/menu"         },
];

export default function Layout({ children, onNewPost }: Props) {
  const path     = useLocation();
  const navigate = useNavigate();
  const [showCreate,        setShowCreate]        = useState(false);
  const [showPostModal,     setShowPostModal]     = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [navHidden,         setNavHidden]         = useState(false);
  const lastScrollY     = useRef(0);
  const scrollTicking   = useRef(false);
  const [searchQuery,   setSearchQuery]   = useState(() => {
    const qs = window.location.search;
    return new URLSearchParams(qs).get("q") ?? "";
  });
  const [pendingRequests, setPendingRequests] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("bp_recent_searches") ?? "[]");
    } catch { return []; }
  });
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const saveRecent = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const deduped = [trimmed, ...prev.filter(x => x !== trimmed)].slice(0, 5);
      localStorage.setItem("bp_recent_searches", JSON.stringify(deduped));
      return deduped;
    });
  };

  const removeRecent = (q: string) => {
    setRecentSearches(prev => {
      const next = prev.filter(x => x !== q);
      localStorage.setItem("bp_recent_searches", JSON.stringify(next));
      return next;
    });
  };

  const user         = useCurrentUser();
  const userInitials = user.name ? user.name.slice(0, 2).toUpperCase() : "ME";

  // Pre-fill search bar if already on /search?q=...
  const currentPath = path;
  const currentQs   = currentPath.includes("?") ? currentPath.slice(currentPath.indexOf("?") + 1) : "";
  const currentQ    = new URLSearchParams(currentQs).get("q") ?? "";

  const menuPaths = ["/wallet", "/tontines", "/formations", "/jobs"];
  const activeTab = TABS.find(t => t.path === path)?.id
    ?? (menuPaths.some(p => path.startsWith(p)) ? "menu" : "home");

  const handleCreateSelect = (type: string) => {
    setShowCreate(false);
    if (type === "post") setShowPostModal(true);
    else if (type === "product")  navigate("/marketplace");
    else if (type === "service")  navigate("/marketplace");
    else if (type === "group")    navigate("/community");
    else if (type === "job")      navigate("/marketplace");
    else if (type === "course")   navigate("/menu");
    else if (type === "tontine")  navigate("/menu");
  };

  useEffect(() => {
    apiGetFriendRequests().then(r => setPendingRequests(r.length)).catch(() => {});
    const iv = setInterval(() => {
      apiGetFriendRequests().then(r => setPendingRequests(r.length)).catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    apiGetUnreadNotifCount().then(setUnreadNotifs).catch(() => {});
    const iv = setInterval(() => {
      apiGetUnreadNotifCount().then(setUnreadNotifs).catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (path === "/notifications") {
      setUnreadNotifs(0);
    }
  }, [path]);

  /* Pages that manage their own fullscreen header — hide the 3-row Layout header */
  const FULLSCREEN_PATHS = ["/messages", "/community", "/menu", "/wallet", "/notifications", "/jobs", "/formations", "/tontines", "/marketplace", "/settings"];
  const isFullscreen = FULLSCREEN_PATHS.some(p => path === p || path.startsWith(p + "?") || path.startsWith(p + "/"));

  useEffect(() => {
    const updateHeaderHeight = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--layout-header-height", `${h}px`);
    };
    updateHeaderHeight();
    const ro = new ResizeObserver(updateHeaderHeight);
    if (headerRef.current) ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [isFullscreen]);

  /* ── Nav hide/show on scroll ──
     Disabled on pages that use an internal scroll container (not window),
     to avoid the nav getting stuck hidden with no way to show it again.     */
  const INNER_SCROLL_PATHS = ["/marketplace/create"];
  useEffect(() => {
    if (INNER_SCROLL_PATHS.some(p => path.startsWith(p))) return; // inner scroll — keep nav visible
    lastScrollY.current = window.scrollY;
    const handleScroll = () => {
      if (scrollTicking.current) return;
      scrollTicking.current = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;
        if (Math.abs(delta) > 8) {
          setNavHidden(delta > 0 && currentY > 200);
        }
        lastScrollY.current = currentY;
        scrollTicking.current = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    const handleTouch = () => { if (window.scrollY < 80) setNavHidden(false); };
    window.addEventListener("touchstart", handleTouch, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouch);
    };
  }, [path]);

  /* Reset nav + overflow + scroll position sur changement de route */
  useEffect(() => {
    setNavHidden(false);
    lastScrollY.current = 0;
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [path]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadMessages = 0;

  const FB_TABS: { id: Tab; label: string; path: string; badge?: number; Icon: () => ReactElement }[] = [
    {
      id: "home", label: "Accueil", path: "/",
      Icon: () => path === "/"
        ? <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--bp-primary)"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinejoin="round"><path d="M3 12L12 3l9 9M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9"/></svg>,
    },
    {
      id: "community", label: "Amis", path: "/community", badge: pendingRequests || undefined,
      Icon: () => {
        const c = activeTab === "community" ? "var(--bp-primary)" : "#9CA3AF";
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
      },
    },
    {
      id: "notifications" as Tab, label: "Messages", path: "/messages",
      Icon: () => {
        const isMsg = path === "/messages";
        const c = isMsg ? "var(--bp-primary)" : "#9CA3AF";
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
      },
    },
    {
      id: "marketplace", label: "Notifications", path: "/notifications", badge: unreadNotifs || undefined,
      Icon: () => {
        const active = path === "/notifications";
        const c = active ? "var(--bp-primary)" : "#9CA3AF";
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
      },
    },
    {
      id: "menu", label: "Portefeuille", path: "/wallet",
      Icon: () => {
        const active = activeTab === "menu" || path === "/wallet";
        const c = active ? "var(--bp-primary)" : "#9CA3AF";
        return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="14" x="3" y="5" rx="2" ry="2"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
      },
    },
  ];

  return (
    <>
    <div className="app-shell">

      {/* ══════════════════════════════════════════════════
          FACEBOOK LITE STICKY HEADER — 3 rows
          Hidden on fullscreen-managed pages
      ══════════════════════════════════════════════════ */}
      <div ref={headerRef} style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.07)", display: isFullscreen ? "none" : undefined }}>

        {/* Row 2 — Brand logo + icon buttons (Hidden on Mobile as per mockup) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 8px" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo.png" alt="Brute Pawa" style={{ height: 36, width: 36, borderRadius: 10, objectFit: "cover" }} />
            <span style={{ fontWeight: 900, fontSize: 20, color: "var(--bp-primary)", letterSpacing: -0.3 }}>BrutePawa</span>
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Search */}
            <button onClick={() => setShowSearchOverlay(true)} title="Rechercher"
              style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            {/* Create — green circle */}
            <button onClick={() => setShowCreate(true)} title="Créer"
              style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bp-primary)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(34,197,94,0.4)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            {/* Notifications bell */}
            <button onClick={() => navigate("/notifications")} title="Notifications" style={{ position: "relative", width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 4-2 5-2 5h16s-2-1-2-5"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadNotifs > 0 && <span style={{ position:"absolute", top:6, right:6, width:8, height:8, background:"#EF4444", borderRadius:"50%", border:"1.5px solid #fff" }} />}
            </button>
            {/* Menu */}
            <button onClick={() => navigate("/menu")} title="Menu"
              style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>

        {/* Row 3 — 5 tab icons + labels */}
        <div style={{ display: "flex", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fff" }}>
          {FB_TABS.map(({ id, label, path: tabPath, badge, Icon }) => {
            const isActive = path === tabPath;
            return (
              <button key={id} onClick={() => navigate(tabPath)}
                style={{ flex: 1, background: "none", border: "none", padding: "8px 0 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, position: "relative", borderBottom: isActive ? "3px solid var(--bp-primary)" : "3px solid transparent", cursor: "pointer", transition: "opacity 0.15s" }}>
                <Icon />
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--bp-primary)" : "#9CA3AF", lineHeight: 1 }}>{label}</span>
                {badge && badge > 0 && (
                  <span style={{ position: "absolute", top: 4, right: "18%", background: "#EF4444", color: "#fff", borderRadius: 10, minWidth: 16, height: 16, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "1.5px solid #fff" }}>
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body: sidebar + main ── */}
      <div className="app-body">

        {/* ── Desktop Sidebar ── */}
        <aside className="app-sidebar">

          {/* User card */}
          <div className="sidebar-user-card" onClick={() => navigate("/profile")}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))" }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover" }} />
                : <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{userInitials}</span>
              }
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
          </div>

          <div className="sidebar-divider" />

          {/* Navigation links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`sidebar-nav-item${activeTab === tab.id ? " active" : ""}`}
                onClick={() => navigate(tab.path)}
              >
                <span className="sidebar-nav-icon">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === "community" && pendingRequests > 0 && (
                  <span style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", borderRadius: 10, minWidth: 18, height: 18, padding: "0 5px", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {pendingRequests > 9 ? "9+" : pendingRequests}
                  </span>
                )}
                {tab.id === "notifications" && unreadNotifs > 0 && (
                  <span style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", borderRadius: 10, minWidth: 18, height: 18, padding: "0 5px", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {unreadNotifs}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-divider" />

          {/* Quick links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { icon: "💬", label: "Messages",       path: "/messages" },
              { icon: "🏆", label: "Score",          path: "/score" },
              { icon: "🪙", label: "Portefeuille",   path: "/wallet" },
              { icon: "📅", label: "Événements",     path: "/events" },
              { icon: "🔖", label: "Enregistrements", path: "/saved" },
              { icon: "✨", label: "Souvenirs",      path: "/memories" },
              { icon: "🎬", label: "Live",           path: "/live" },
              { icon: "📊", label: "Créateur",       path: "/creator" },
            ].map(item => (
              <button
                key={item.path}
                className={`sidebar-nav-item${path === item.path ? " active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Create button */}
          <button className="sidebar-create-btn" onClick={() => setShowCreate(true)}>
            <span style={{ fontSize: 20 }}>＋</span>
            Créer
          </button>

          <div style={{ padding: "12px 4px 4px", fontSize: 11, color: "var(--fb-text-secondary)", lineHeight: 1.8 }}>
            Brute Pawa © 2025
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="app-main">
          {children}
        </main>
      </div>


      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onSelect={handleCreateSelect} />
      )}
      {showPostModal && (
        <PostModal
          userInitials={userInitials}
          userName={user.name ?? ""}
          onClose={() => setShowPostModal(false)}
          onPost={(content) => { onNewPost?.(content); }}
        />
      )}
      {showSearchOverlay && (
        <MobileSearchOverlay
          onClose={() => setShowSearchOverlay(false)}
          navigate={(path) => { setShowSearchOverlay(false); navigate(path); }}
          recentSearches={recentSearches}
          onSelectRecent={(q) => { saveRecent(q); }}
          onRemoveRecent={removeRecent}
          onCommitSearch={saveRecent}
        />
      )}

      {/* ══════════════════════════════════════════════════
          BOTTOM NAV — mobile only
      ══════════════════════════════════════════════════ */}
      <nav className={`bottom-nav-main${navHidden ? " nav-hidden" : ""}`} style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fff" }}>
        {/* Accueil */}
        {(() => {
          const active = path === "/";
          return (
            <button onClick={() => navigate("/")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifySelf: "flex-end", paddingTop: 10, background: "none", border: "none", cursor: "pointer", gap: 4, height: "100%" }}>
              {active
                ? <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--bp-primary)"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 3l9 9M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9"/></svg>
              }
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? "var(--bp-primary)" : "#9CA3AF" }}>Accueil</span>
            </button>
          );
        })()}
        {/* Amis */}
        {(() => {
          const active = path === "/people" || path === "/community";
          const c = active ? "var(--bp-primary)" : "#9CA3AF";
          return (
            <button onClick={() => navigate("/people")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifySelf: "flex-end", paddingTop: 10, background: "none", border: "none", cursor: "pointer", gap: 4, height: "100%", position: "relative" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: c }}>Amis</span>
              {pendingRequests > 0 && <span style={{ position:"absolute", top:4, right:"22%", background:"#EF4444", color:"#fff", borderRadius:10, minWidth:14, height:14, fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px", border:"1.5px solid #fff" }}>{pendingRequests > 9 ? "9+" : pendingRequests}</span>}
            </button>
          );
        })()}
        {/* Créer — central green circle */}
        <button onClick={() => setShowCreate(true)} style={{ flex: "0 0 60px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", marginTop: 4, background: "none", border: "none", cursor: "pointer" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(34,197,94,0.3)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </div>
        </button>
        {/* Messages */}
        {(() => {
          const active = path === "/messages";
          const c = active ? "var(--bp-primary)" : "#9CA3AF";
          return (
            <button onClick={() => navigate("/messages")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifySelf: "flex-end", paddingTop: 10, background: "none", border: "none", cursor: "pointer", gap: 4, height: "100%" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "var(--bp-primary)" : "none"} stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: c }}>Messages</span>
            </button>
          );
        })()}
        {/* Profil */}
        {(() => {
          const active = path === "/settings" || path.startsWith("/settings/") || path === "/profile";
          const c = active ? "var(--bp-primary)" : "#9CA3AF";
          return (
            <button onClick={() => navigate("/profile")} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifySelf: "flex-end", paddingTop: 10, background: "none", border: "none", cursor: "pointer", gap: 4, height: "100%" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8"/></svg>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: c }}>Profil</span>
            </button>
          );
        })()}
      </nav>
    </div>
    <ImageViewer />
    </>
  );
}
