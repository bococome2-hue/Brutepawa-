import { useState, useEffect, useRef, Component, ReactNode } from "react";
import { Router, useLocation, useNavigate } from "./router";
import { isUserLoggedIn } from "./hooks/useCurrentUser";
import { usePresenceHeartbeat } from "./hooks/useGroupActivity";
import Layout from "./Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Community from "./pages/Community";
import MarketplacePage from "./pages/MarketplacePage";
import NotificationsPage from "./pages/NotificationsPage";
import Menu from "./pages/Menu";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Admin from "./pages/Admin";
import JobsPage from "./pages/JobsPage";
import FormationsPage from "./pages/FormationsPage";
import TontinesPage from "./pages/TontinesPage";
import WalletPage from "./pages/WalletPage";
import ProductDetail from "./pages/ProductDetail";
import JobDetail from "./pages/JobDetail";
import FormationDetail from "./pages/FormationDetail";
import CreatePostPage from "./pages/CreatePostPage";
import CreateStoryPage from "./pages/CreateStoryPage";
import CreateReelPage from "./pages/CreateReelPage";
import CreateLifeEventPage from "./pages/CreateLifeEventPage";
import LiveStreamPage from "./pages/LiveStreamPage";
import LiveWatchPage from "./pages/LiveWatchPage";
import EditProfilePage from "./pages/EditProfilePage";
import ScorePage from "./pages/ScorePage";
import UserProfilePage from "./pages/UserProfilePage";
import CreatorDashboardPage from "./pages/CreatorDashboardPage";
import VideoPostPage from "./pages/VideoPostPage";
import PostDetailPage from "./pages/PostDetailPage";
import SearchPage from "./pages/SearchPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import EventsPage from "./pages/EventsPage";
import SavedPage from "./pages/SavedPage";
import SavedLocationsPage from "./pages/SavedLocationsPage";
import MemoriesPage from "./pages/MemoriesPage";
import JobInboxPage from "./pages/JobInboxPage";
import CreateListingPage from "./pages/CreateListingPage";
import ProfileMenuPage from "./pages/ProfileMenuPage";
import PollResultsPage from "./pages/PollResultsPage";
import ArchivePage from "./pages/ArchivePage";
import PrivacyPage from "./pages/PrivacyPage";
import NotifSettingsPage from "./pages/NotifSettingsPage";
import LanguagePage from "./pages/LanguagePage";
import DataModePage from "./pages/DataModePage";
import AppearancePage from "./pages/AppearancePage";
import VerifyPage from "./pages/VerifyPage";
import BadgePage from "./pages/BadgePage";
import PremiumPage from "./pages/PremiumPage";
import StoragePage from "./pages/StoragePage";
import MessagingSettingsPage from "./pages/MessagingSettingsPage";
import OnlineStatusPage from "./pages/OnlineStatusPage";
import MessagingArchivePage from "./pages/MessagingArchivePage";
import MessagingPrivacyPage from "./pages/MessagingPrivacyPage";
import MessageRequestsPage from "./pages/MessageRequestsPage";
import MessagingNotifPage from "./pages/MessagingNotifPage";
import PinnedChatsPage from "./pages/PinnedChatsPage";
import AutoDownloadPage from "./pages/AutoDownloadPage";
import MediaQualityPage from "./pages/MediaQualityPage";
import ChatBackupPage from "./pages/ChatBackupPage";
import AdvancedSettingsPage from "./pages/AdvancedSettingsPage";
import AboutPage from "./pages/AboutPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import LicensesPage from "./pages/LicensesPage";
import AccountDeletionFlow from "./pages/AccountDeletionFlow";
import DeleteShowcasePage from "./pages/DeleteShowcasePage";
import BroadcastListPage from "./pages/BroadcastListPage";
import PeoplePage from "./pages/PeoplePage";
import PagesPage from "./pages/PagesPage";

import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ADMIN_SECRET_PATH } from "./lib/admin";
import { AppearanceProvider } from "./contexts/AppearanceContext";
import { Post } from "./lib/store";
import { apiGetPosts, apiLikePost, apiCreatePost, getBpToken } from "./lib/api";
import InstallBanner from "./components/InstallBanner";
import TopLoadingBar from "./components/TopLoadingBar";
import { usePushNotifications } from "./hooks/usePushNotifications";

const queryClient = new QueryClient();

/** Réduit l'interface de 15 % — appliqué aux pages Messages & Paramètres.
 *  Convention: tout élément `position: fixed` à l'intérieur de ce wrapper
 *  doit soit utiliser createPortal(..., document.body) soit porter la classe
 *  `sc-fixed-escape` (zoom: calc(1/0.85)) pour rester aligné sur le vrai viewport.
 *  Les classes CSS fixes du Layout (.bottom-nav-main, .mobile-search-overlay,
 *  .modal-overlay) sont gérées globalement via `.sc-zoom-wrap` dans index.css. */
function Sc({ children }: { children: ReactNode }) {
  return <div className="sc-zoom-wrap" style={{ zoom: 0.85, transformOrigin: "top left" }}>{children}</div>;
}

class GlobalErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state: { err: Error | null } = { err: null };
  static getDerivedStateFromError(e: Error) { return { err: e }; }
  render() {
    const { err } = this.state;
    if (err) {
      return (
        <div style={{
          position: "fixed", inset: 0, background: "var(--theme-surface)", zIndex: 99999,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 24, gap: 16, fontFamily: "monospace",
        }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          <p style={{ fontWeight: 800, fontSize: 18, color: "#111", margin: 0 }}>Une erreur s'est produite</p>
          <div style={{
            width: "100%", maxWidth: 520, background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 12, padding: "14px 16px", wordBreak: "break-all",
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{err.name}: {err.message}</p>
            {err.stack && (
              <pre style={{
                margin: "8px 0 0", fontSize: 11, color: "#7f1d1d", overflowX: "auto",
                whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto",
              }}>{err.stack}</pre>
            )}
          </div>
          <button
            onClick={() => { this.setState({ err: null }); window.location.reload(); }}
            style={{ background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

class MessagesBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null };
  static getDerivedStateFromError(e: Error) { return { err: e?.message ?? "Erreur inconnue" }; }
  render() {
    if (this.state.err) {
      return (
        <div className="sc-fixed-escape" style={{ position: "fixed", inset: 0, background: "var(--theme-surface)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <p style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text)" }}>Messages</p>
          <p style={{ fontSize: 13, color: "#666", textAlign: "center" }}>{this.state.err}</p>
          <button onClick={() => { this.setState({ err: null }); window.location.reload(); }} style={{ background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Réessayer</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GlobalConnectionStatus() {
  const [notice, setNotice] = useState<"offline" | "connected" | null>(
    () => navigator.onLine ? null : "offline",
  );
  const connectionLostRef = useRef(!navigator.onLine);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showLost = () => {
      connectionLostRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setNotice("offline");
    };
    const showRestored = () => {
      if (!connectionLostRef.current) return;
      connectionLostRef.current = false;
      setNotice("connected");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setNotice(null), 2200);
    };

    window.addEventListener("offline", showLost);
    window.addEventListener("online", showRestored);
    window.addEventListener("bp:connection-lost", showLost);
    window.addEventListener("bp:connection-restored", showRestored);
    return () => {
      window.removeEventListener("offline", showLost);
      window.removeEventListener("online", showRestored);
      window.removeEventListener("bp:connection-lost", showLost);
      window.removeEventListener("bp:connection-restored", showRestored);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [connectionLostRef, timerRef]);

  if (!notice) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 34,
        padding: "7px 14px",
        background: notice === "offline" ? "#FFF1F2" : "#F8FAFC",
        borderBottom: `1px solid ${notice === "offline" ? "#FECDD3" : "#E5E7EB"}`,
        color: notice === "offline" ? "#E11D48" : "#111827",
        fontSize: 13,
        fontWeight: 700,
        pointerEvents: "none",
      }}
    >
      {notice === "offline" ? (
        <>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E11D48", flexShrink: 0 }} />
          <span>Connexion....</span>
        </>
      ) : (
        <>
          <span
            aria-hidden="true"
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: "2px solid #CBD5E1",
              borderTopColor: "#111827",
              animation: "fbl-spin 0.75s linear infinite",
              flexShrink: 0,
            }}
          />
          <span>Connecté !..</span>
        </>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h} h`;
  return `Il y a ${Math.floor(h / 24)} j`;
}

const PUBLIC_PATHS = ["/login", "/register", "/delete-showcase"];
const NO_LAYOUT_PATHS = [ADMIN_SECRET_PATH];

function matchDynamic(pattern: string, path: string): Record<string, string> | null {
  const pp = pattern.split("/");
  const lp = path.split("/");
  if (pp.length !== lp.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) {
      params[pp[i].slice(1)] = lp[i];
    } else if (pp[i] !== lp[i]) {
      return null;
    }
  }
  return params;
}

function PushAutoSubscribe() {
  const isAuth = isUserLoggedIn();
  usePresenceHeartbeat(isAuth);
  const { permission, subscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    if (!isAuth) return;
    // Subscribe if permission not yet asked, OR if already granted but subscription is missing/expired
    if ((permission === "default" || permission === "granted") && !subscribed) {
      const t = setTimeout(() => subscribe(), 5000);
      return () => clearTimeout(t);
    }
  }, [isAuth, permission, subscribed, subscribe]);

  return null;
}

function AppContent() {
  const path = useLocation();
  const navigate = useNavigate();
  const isAuth = isUserLoggedIn();
  const isPublic = PUBLIC_PATHS.includes(path);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const loadPosts = async () => {
    try {
      const data = await apiGetPosts();
      const converted: Post[] = data.map((p) => ({
        id: p.id,
        userId: p.authorId,
        content: p.content,
        time: relativeTime(p.createdAt),
        likes: p.likesCount,
        comments: p.commentsCount,
        shares: 0,
        liked: p.liked,
        sponsored: false,
        imageUrl: p.imageUrl,
        thumbnailUrl: p.thumbnailUrl,
        authorName: p.authorName,
        authorAvatarUrl: p.authorAvatarUrl,
        authorCountry: p.authorCountry ?? undefined,
        isPinned: p.isPinned,
        commentsDisabled: p.commentsDisabled,
        audience: p.audience,
        taggedUsers: p.taggedUsers,
        bgColor: p.bgColor,
        mood: p.mood,
        location: p.location,
        musicTrackName: p.musicTrackName,
        musicArtist: p.musicArtist,
        musicUrl: p.musicUrl,
        musicArtworkUrl: p.musicArtworkUrl,
        musicDuration: p.musicDuration,
        musicLikesCount: p.musicLikesCount ?? 0,
      }));
      setPosts(converted);
    } catch {
      // keep empty
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuth) loadPosts();
    else setPostsLoading(false);
  }, [isAuth]);

  const handleNewPost = async (_content?: string) => {
    try { await loadPosts(); } catch { /* silent */ }
    navigate("/");
  };

  const handleLike = async (id: number) => {
    const post = posts.find(p => p.id === id);
    const action = post?.liked ? "unlike" : "like";
    const token = getBpToken();
    if (token) {
      try {
        await apiLikePost(id, action);
      } catch { /* ignore */ }
    }
    setPosts(prev =>
      prev.map(p =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      )
    );
  };

  useEffect(() => {
    const handler = () => { navigate("/login"); };
    window.addEventListener("bp:session-expired", handler);
    return () => window.removeEventListener("bp:session-expired", handler);
  }, []);

  /* ── Bridge service-worker → window events (push notification actions) ── */
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onSwMsg = (e: MessageEvent) => {
      const { type, data } = (e.data ?? {}) as { type?: string; data?: Record<string, unknown> };
      if (!type) return;
      if (type === "bp:incoming-call") {
        /* Dispatch to useCallSignaling hook listener */
        window.dispatchEvent(new CustomEvent("bp:sw-call", { detail: data }));
        /* Navigate to messages so the call modal renders */
        if (!window.location.pathname.endsWith("/messages")) navigate("/messages");
      } else if (type === "bp:call-rejected") {
        window.dispatchEvent(new CustomEvent("bp:sw-call-rejected", { detail: data }));
      } else if (type === "bp:navigate" && data?.url) {
        navigate(data.url as string);
      }
    };
    navigator.serviceWorker.addEventListener("message", onSwMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMsg);
  }, []);

  useEffect(() => {
    if (!isAuth && !isPublic) {
      // Mémorise la destination pour y revenir après login
      if (path !== "/login" && path !== "/register") {
        sessionStorage.setItem("bp_redirect", path);
      }
      navigate("/login");
    } else if (isAuth && isPublic) {
      navigate("/");
    }
  }, [path, isAuth, isPublic]);

  if (!isAuth && !isPublic) return null;
  if (isAuth && isPublic) return null;

  if (path === "/login") return <Login />;
  if (path === "/register") return <Register />;
  if (path === ADMIN_SECRET_PATH) return <Admin />;
  if (path === "/create-post") return <CreatePostPage onPublish={handleNewPost} />;
  if (path === "/create-story") return <CreateStoryPage onCreated={loadPosts} />;
  if (path === "/create-reel") return <CreateReelPage />;
  if (path === "/create-life-event") return <CreateLifeEventPage />;
  if (path === "/live") return <LiveStreamPage />;
  if (path === "/edit-profile") return <EditProfilePage />;
  if (path === "/creator") return <CreatorDashboardPage />;

  const liveWatchMatch = matchDynamic("/live/:id", path);
  if (liveWatchMatch) {
    const sid = parseInt(liveWatchMatch.id, 10);
    if (!isNaN(sid)) return <LiveWatchPage streamId={sid} />;
  }

  const videoPostMatch = matchDynamic("/video/:id", path);
  if (videoPostMatch) {
    const pid = parseInt(videoPostMatch.id, 10);
    if (!isNaN(pid)) return <VideoPostPage postId={pid} />;
  }

  const postDetailMatch = matchDynamic("/post/:id", path);
  if (postDetailMatch) {
    const pid = parseInt(postDetailMatch.id, 10);
    if (!isNaN(pid)) return <PostDetailPage postId={pid} />;
  }

  if (path === "/score") return <ScorePage />;
  if (path === "/events") return (
    <Layout onNewPost={handleNewPost}><EventsPage /></Layout>
  );
  if (path === "/saved") return (
    <Layout onNewPost={handleNewPost}><SavedPage /></Layout>
  );
  if (path === "/saved-locations") return <SavedLocationsPage />;
  if (path === "/memories") return (
    <Layout onNewPost={handleNewPost}><MemoriesPage /></Layout>
  );

  // Search route
  if (path === "/search") {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    return (
      <Layout onNewPost={handleNewPost}>
        <SearchPage q={q} />
      </Layout>
    );
  }

  // Dynamic route matching
  const productMatch = matchDynamic("/marketplace/:id", path);
  const jobMatch = matchDynamic("/jobs/:id", path);
  const formationMatch = matchDynamic("/formations/:id", path);
  const userProfileMatch = matchDynamic("/profile/:id", path);
  const groupMatch = matchDynamic("/groups/:id", path);
  const chatGroupMatch = matchDynamic("/chat-groups/:id", path);
  const tontineDetailMatch = matchDynamic("/tontines/:id", path);
  const broadcastMatch = matchDynamic("/broadcast/:id", path);
  const pollResultsMatch = matchDynamic("/polls/:id/results", path);

  if (path === "/marketplace/create") {
    return (
      <Layout onNewPost={handleNewPost}>
        <CreateListingPage />
      </Layout>
    );
  }

  if (productMatch) {
    return (
      <Layout onNewPost={handleNewPost}>
        <ProductDetail id={parseInt(productMatch.id)} />
      </Layout>
    );
  }

  if (path === "/jobs/inbox") {
    return (
      <Layout onNewPost={handleNewPost}>
        <JobInboxPage />
      </Layout>
    );
  }

  if (path.startsWith("/jobs/inbox?")) {
    const qs3 = path.slice(path.indexOf("?") + 1);
    const p3  = new URLSearchParams(qs3);
    const uid = parseInt(p3.get("userId") ?? "0", 10);
    const jt  = p3.get("jobTitle") ?? undefined;
    return (
      <Layout onNewPost={handleNewPost}>
        <JobInboxPage initialUserId={isNaN(uid) ? undefined : uid} initialJobTitle={jt} />
      </Layout>
    );
  }

  if (jobMatch) {
    return (
      <Layout onNewPost={handleNewPost}>
        <JobDetail id={parseInt(jobMatch.id)} />
      </Layout>
    );
  }

  if (formationMatch) {
    return (
      <Layout onNewPost={handleNewPost}>
        <FormationDetail id={parseInt(formationMatch.id)} />
      </Layout>
    );
  }

  if (userProfileMatch) {
    return <UserProfilePage userId={parseInt(userProfileMatch.id)} />;
  }

  const userAliasMatch = matchDynamic("/user/:id", path);
  if (userAliasMatch) {
    const uid = parseInt(userAliasMatch.id, 10);
    if (!isNaN(uid)) return <UserProfilePage userId={uid} />;
  }

  if (path === "/people") {
    return <PeoplePage />;
  }

  if (path === "/pages") {
    return <PagesPage />;
  }

  const pageDetailMatch = matchDynamic("/pages/:id", path);
  if (pageDetailMatch) {
    return <PagesPage initialPageId={parseInt(pageDetailMatch.id, 10)} />;
  }

  if (path === "/profile") {
    return <Sc><Profile /></Sc>;
  }

  /* ── Settings hub ── */
  if (path === "/settings") {
    return (
      <Sc>
        <Layout onNewPost={handleNewPost}>
          <ProfileMenuPage />
        </Layout>
      </Sc>
    );
  }
  if (path === "/settings/archive") return <Sc><ArchivePage /></Sc>;
  if (path === "/settings/privacy") return <Sc><PrivacyPage /></Sc>;
  if (path === "/settings/notifications") return <Sc><NotifSettingsPage /></Sc>;
  if (path === "/settings/language") return <Sc><LanguagePage /></Sc>;
  if (path === "/settings/data") return <Sc><DataModePage /></Sc>;
  if (path === "/settings/appearance") return <Sc><AppearancePage /></Sc>;
  if (path === "/settings/verify") return <Sc><VerifyPage /></Sc>;
  if (path === "/settings/badge") return <Sc><BadgePage /></Sc>;
  if (path === "/settings/premium") return <Sc><PremiumPage /></Sc>;
  if (path === "/settings/storage") return <Sc><StoragePage /></Sc>;

  /* ── Messaging settings ── */
  if (path === "/settings/messaging") return <Sc><MessagingSettingsPage /></Sc>;
  if (path === "/settings/messaging/online") return <Sc><OnlineStatusPage /></Sc>;
  if (path === "/settings/messaging/archive") return <Sc><MessagingArchivePage /></Sc>;
  if (path === "/settings/messaging/privacy") return <Sc><MessagingPrivacyPage /></Sc>;
  if (path === "/settings/messaging/requests") return <Sc><MessageRequestsPage /></Sc>;
  if (path === "/settings/messaging/notifications") return <Sc><MessagingNotifPage /></Sc>;
  if (path === "/settings/messaging/pinned") return <Sc><PinnedChatsPage /></Sc>;
  if (path === "/settings/messaging/download") return <Sc><AutoDownloadPage /></Sc>;
  if (path === "/settings/messaging/quality") return <Sc><MediaQualityPage /></Sc>;
  if (path === "/settings/messaging/backup") return <Sc><ChatBackupPage /></Sc>;
  if (path === "/settings/messaging/advanced") return <Sc><AdvancedSettingsPage /></Sc>;
  if (path === "/settings/messaging/about") return <Sc><AboutPage /></Sc>;
  if (path === "/settings/terms") return <Sc><TermsPage /></Sc>;
  if (path === "/settings/privacy-policy") return <Sc><PrivacyPolicyPage /></Sc>;
  if (path === "/settings/licenses") return <Sc><LicensesPage /></Sc>;
  if (path === "/settings/delete-account") return <Sc><AccountDeletionFlow /></Sc>;
  if (path === "/delete-showcase") return <Sc><DeleteShowcasePage /></Sc>;

  if (groupMatch) {
    const gid = parseInt(groupMatch.id, 10);
    if (!isNaN(gid)) {
      return (
        <Layout onNewPost={handleNewPost}>
          <GroupDetailPage groupId={gid} />
        </Layout>
      );
    }
  }

  if (chatGroupMatch) {
    const cgid = parseInt(chatGroupMatch.id, 10);
    if (!isNaN(cgid)) {
      return (
        <Sc>
          <Layout onNewPost={handleNewPost}>
            <Messages initialGroupId={cgid} />
          </Layout>
        </Sc>
      );
    }
  }

  const broadcastReceivedMatch = matchDynamic("/broadcast/:id/received", path);
  if (broadcastReceivedMatch) {
    const bid = parseInt(broadcastReceivedMatch.id, 10);
    if (!isNaN(bid)) {
      return <Sc><BroadcastListPage broadcastId={bid} recipientView /></Sc>;
    }
  }

  if (broadcastMatch) {
    const bid = parseInt(broadcastMatch.id, 10);
    if (!isNaN(bid)) {
      return <Sc><BroadcastListPage broadcastId={bid} /></Sc>;
    }
  }

  if (pollResultsMatch) {
    return <PollResultsPage pollId={Number(pollResultsMatch.id)} />;
  }

  if (tontineDetailMatch) {
    const tid = parseInt(tontineDetailMatch.id, 10);
    if (!isNaN(tid)) {
      return (
        <Layout onNewPost={handleNewPost}>
          <TontinesPage initialTontineId={tid} />
        </Layout>
      );
    }
  }

  if (path.startsWith("/messages")) {
    // Initial loads/popstate expose pathname only through this router.
    const qs2 = path.includes("?") ? path.slice(path.indexOf("?") + 1) : window.location.search.slice(1);
    const params2 = new URLSearchParams(qs2);
    const uid = params2.get("userId");
    const gid2 = params2.get("groupId");
    const initUid = uid ? parseInt(uid, 10) : undefined;
    const initGid = gid2 ? parseInt(gid2, 10) : undefined;
    return (
      <Sc>
        <Layout onNewPost={handleNewPost}>
          <MessagesBoundary>
            <Messages
              initialUserId={!initUid || isNaN(initUid) ? undefined : initUid}
              initialGroupId={!initGid || isNaN(initGid) ? undefined : initGid}
            />
          </MessagesBoundary>
        </Layout>
      </Sc>
    );
  }

  return (
    <Layout onNewPost={handleNewPost}>
      {path === "/" && <Home posts={posts} postsLoading={postsLoading} onLike={handleLike} onNewPost={handleNewPost} />}
      {path === "/community" && <Community />}
      {path === "/marketplace" && <MarketplacePage />}
      {path === "/notifications" && <NotificationsPage />}
      {path === "/menu" && <Menu />}
      {path === "/jobs" && <JobsPage />}
      {path === "/formations" && <FormationsPage />}
      {path === "/tontines" && <TontinesPage />}
      {path === "/wallet" && <WalletPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppearanceProvider>
          <Router>
            <TopLoadingBar />
            <GlobalConnectionStatus />
            <PushAutoSubscribe />
            <AppContent />
            <InstallBanner />
            <Toaster position="top-center" richColors closeButton />
          </Router>
        </AppearanceProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
