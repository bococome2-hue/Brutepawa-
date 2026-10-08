import { useState, useEffect, useCallback, useRef } from "react";
import ExpandableText from "../components/ExpandableText";
import { createPortal } from "react-dom";
import { useNavigate } from "../router";
import { openImageViewer } from "../components/ImageViewer";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiGetPosts, apiCreatePost, apiLikePost, apiGetStories, apiToggleSaved, apiFollow, apiCheckFollowing, apiDeletePost, apiArchivePost, apiPinPost, apiSearchUsers, type FeedPost, type StoryGroup } from "../lib/api";
import StoryViewer from "../components/StoryViewer";
import { storyDraftStore } from "../lib/storyDraft";
import { UserBadge } from "../components/UserBadge";
import ShareSheet, { type SharePost } from "../components/ShareSheet";
import { searchItunes } from "../data/music";
import { trackEvent } from "../lib/analytics";
import MusicPlayerWidget from "../components/MusicPlayerWidget";

/* ── Premium Music Card ─────────────────────────────────────── */
const WAVE_HEIGHTS = [5,10,7,14,9,12,6,15,8,11,5,13,9,7,12,6,14,10,8,5,11,9,13,7,10,6,14,8,12,5,8,11];

function FeedMusicCard({ trackName, artist, artworkUrl, url, duration, onClick }: {
  trackName: string; artist: string; artworkUrl: string | null;
  url: string | null; duration: string | null; onClick: () => void;
}) {
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent]   = useState("0:00");
  const [tick, setTick]         = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshedPreviewRef = useRef(false);

  useEffect(() => {
    if (!url) return;
    const a = new Audio(url);
    audioRef.current = a;
    refreshedPreviewRef.current = false;
    setAudioError(null);
    a.addEventListener("timeupdate", () => {
      if (!a.duration) return;
      setProgress((a.currentTime / a.duration) * 100);
      const m = Math.floor(a.currentTime / 60);
      const s = Math.floor(a.currentTime % 60);
      setCurrent(`${m}:${s.toString().padStart(2, "0")}`);
    });
    a.addEventListener("ended", () => {
      setPlaying(false); setProgress(0); setCurrent("0:00");
      if (tickRef.current) clearInterval(tickRef.current);
    });
    a.addEventListener("error", () => {
      setPlaying(false);
      if (tickRef.current) clearInterval(tickRef.current);
    });
    return () => { a.pause(); a.src = ""; if (tickRef.current) clearInterval(tickRef.current); };
  }, [url]);

  const startPlayback = async (audio: HTMLAudioElement) => {
    await audio.play();
    setPlaying(true);
    setAudioError(null);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setTick(t => t + 1), 120);
  };

  const refreshPreview = async (audio: HTMLAudioElement) => {
    const results = await searchItunes(`${trackName} ${artist}`, 8);
    const normalizedTitle = trackName.trim().toLocaleLowerCase();
    const normalizedArtist = artist.trim().toLocaleLowerCase();
    const refreshed = results.find(track =>
      track.previewUrl &&
      track.title.trim().toLocaleLowerCase() === normalizedTitle &&
      track.artist.trim().toLocaleLowerCase() === normalizedArtist
    ) ?? results.find(track => track.previewUrl);

    if (!refreshed?.previewUrl) throw new Error("Aucun nouvel aperçu disponible");
    audio.pause();
    audio.src = refreshed.previewUrl;
    audio.load();
    setPlaying(false);
    setAudioError("Aperçu actualisé — appuyez sur lecture");
  };

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a || !url) return;
    if (playing) {
      a.pause(); setPlaying(false);
      if (tickRef.current) clearInterval(tickRef.current);
    } else {
      try {
        await startPlayback(a);
      } catch {
        /*
         * iTunes preview URLs are CDN assets and can expire after a post has
         * been published. Renew the preview once before reporting an error.
         */
        if (!refreshedPreviewRef.current) {
          refreshedPreviewRef.current = true;
          try {
            await refreshPreview(a);
            return;
          } catch {
            // Fall through to a useful, visible error message.
          }
        }
        setPlaying(false);
        setAudioError("Aperçu musical indisponible");
        if (tickRef.current) clearInterval(tickRef.current);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = pct * a.duration;
  };

  const totalBars = WAVE_HEIGHTS.length;

  return (
    <div
      onClick={onClick}
      style={{
        margin: "0 14px 12px", background: "var(--theme-surface)", borderRadius: 18,
        padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)", cursor: "pointer",
        border: "1px solid #F1F5F9", minHeight: 110,
      }}
    >
      {/* Album art — 80×80 */}
      <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg,#1e1e2e,#2d3748)", flexShrink: 0 }}>
        {artworkUrl
          ? <img src={artworkUrl} alt={trackName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="36" height="36" fill="#64748B"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
        }
      </div>

      {/* Center: title + artist + waveform + seek */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--theme-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, marginBottom: 3 }}>
          {trackName}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 8 }}>
          {artist}
        </div>
        {audioError && (
          <div style={{ color: "#DC2626", fontSize: 11.5, fontWeight: 600, marginTop: -4, marginBottom: 5 }}>
            {audioError}
          </div>
        )}

        {/* Waveform — Spotify style, colored by progress */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1.5, height: 22, marginBottom: 6, overflow: "hidden" }}>
          {WAVE_HEIGHTS.map((baseH, i) => {
            const filled = (i / totalBars) * 100 < progress;
            const animOffset = playing ? Math.sin((tick + i) * 0.6) * 0.4 + 0.8 : 0.45;
            const h = Math.max(3, Math.round(baseH * animOffset));
            return (
              <div key={i} style={{
                width: 2.5, borderRadius: 2, flexShrink: 0,
                background: filled ? "var(--bp-primary)" : "#DCFCE7",
                height: h,
                transition: playing ? `height 0.12s ease` : "height 0.3s ease",
              }} />
            );
          })}
        </div>

        {/* Seek bar + times */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600, flexShrink: 0, minWidth: 32 }}>{current}</span>
          <div
            onClick={handleSeek}
            style={{ flex: 1, height: 4, background: "#E5E7EB", borderRadius: 4, position: "relative", cursor: "pointer" }}
          >
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--bp-primary)", borderRadius: 4, position: "relative" }}>
              {progress > 0 && (
                <div style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: "var(--bp-primary)", boxShadow: "0 0 0 2px #fff" }} />
              )}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600, flexShrink: 0, minWidth: 32, textAlign: "right" }}>{duration ?? "0:00"}</span>
        </div>
      </div>

      {/* Right: play/pause + equalizer */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button
          onClick={toggle}
          style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--bp-primary)", border: "none", cursor: url ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", opacity: url ? 1 : 0.4, boxShadow: "0 2px 8px rgba(34,197,94,0.35)" }}
        >
          {playing
            ? <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
          }
        </button>
        {/* Equalizer icon */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 14 }}>
          {[5, 10, 7, 13, 9].map((h, i) => {
            const animH = playing ? Math.max(3, Math.round(h * (Math.sin((tick + i * 2) * 0.8) * 0.4 + 0.8))) : 3;
            return (
              <div key={i} style={{ width: 3, borderRadius: 2, background: "var(--bp-primary)", height: animH, transition: "height 0.12s ease" }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

const COUNTRY_FLAGS: Record<string, string> = {
  CI: "🇨🇮", SN: "🇸🇳", BJ: "🇧🇯", TG: "🇹🇬", BF: "🇧🇫", NE: "🇳🇪",
  ML: "🇲🇱", GN: "🇬🇳", CM: "🇨🇲", TD: "🇹🇩", GA: "🇬🇦", CG: "🇨🇬",
  CD: "🇨🇩", CF: "🇨🇫", GH: "🇬🇭",
};
const AVATAR_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#D97706","#388E3C","#212121","#D32F2F","#00838F"];

function getInitials(name: string) { return name.slice(0, 2).toUpperCase(); }
function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + " k";
  return String(n);
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d} j`;
}

/* ── SVG tab icons (filled = active, outline = inactive) ── */
function IconHome({ active }: { active: boolean }) {
  return active
    ? <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--bp-primary)"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
    : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinejoin="round"><path d="M3 12L12 3l9 9M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9"/></svg>;
}
function IconFriends({ active }: { active: boolean }) {
  const c = active ? "var(--bp-primary)" : "#64748B";
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.5" stroke={c} strokeWidth={active?2:1.8} fill={active?"var(--bp-primary)":"none"} fillOpacity={active?.15:0}/><circle cx="17" cy="8" r="2.5" stroke={c} strokeWidth={active?2:1.8} fill="none"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6" stroke={c} strokeWidth={active?2:1.8} strokeLinecap="round" fill="none"/><path d="M19 14c2.5.5 4 2 4 4.5" stroke={c} strokeWidth={active?2:1.8} strokeLinecap="round" fill="none"/></svg>;
}
function IconMessenger({ active }: { active: boolean }) {
  const c = active ? "var(--bp-primary)" : "#64748B";
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={active?"var(--bp-primary)":"none"}><path d="M12 2C6.48 2 2 6.2 2 11.4c0 2.77 1.26 5.26 3.28 6.99V22l3.56-1.96c.95.26 1.96.4 3.16.4 5.52 0 10-4.2 10-9.4S17.52 2 12 2z" stroke={c} strokeWidth="1.8" fill={active?"var(--bp-primary)":"none"} fillOpacity={active?1:0}/><path d="M7 13l2.5-2.5 2.5 2.5 4-5" stroke={active?"#fff":"#64748B"} strokeWidth={active?2:1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
}
function IconBell({ active }: { active: boolean }) {
  const c = active ? "var(--bp-primary)" : "#64748B";
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={active?"var(--bp-primary)":"none"}><path d="M18 8a6 6 0 0 0-12 0c0 4-2 5-2 5h16s-2-1-2-5" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill={active?"var(--bp-primary)":"none"}/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none"/></svg>;
}
function IconShop({ active }: { active: boolean }) {
  const c = active ? "var(--bp-primary)" : "#64748B";
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={active?"var(--bp-primary)":"none"}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke={c} strokeWidth="1.8" fill={active?"var(--bp-primary)":"none"} fillOpacity={active?.15:0}/><line x1="3" y1="6" x2="21" y2="6" stroke={c} strokeWidth="1.8"/><path d="M16 10a4 4 0 0 1-8 0" stroke={c} strokeWidth="1.8" fill="none"/></svg>;
}

export default function Feed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "friends" | "messenger" | "notifs" | "shop">("feed");

  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);
  const storyFileRef = useRef<HTMLInputElement>(null);
  const [postMenuId, setPostMenuId] = useState<number | null>(null);
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());
  const [sharePost, setSharePost] = useState<SharePost | null>(null);

  // Lock body scroll when bottom sheet is open to prevent layout shift
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const closeMenu = () => { setPostMenuId(null); setMenuPos(null); };

  const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";
    const previewUrl = URL.createObjectURL(file);
    storyDraftStore.set({ file, previewUrl });
    navigate("/create-story");
  };

  const user = useCurrentUser();
  const userInitials = user.name ? user.name.slice(0, 2).toUpperCase() : "ME";

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try { const data = await apiGetPosts(); setPosts(data); }
    catch { setPosts([]); }
    finally { setLoading(false); }
  }, []);

  const loadStories = useCallback(async () => {
    try { setStoryGroups(await apiGetStories()); }
    catch { setStoryGroups([]); }
  }, []);

  useEffect(() => {
    loadPosts();
    loadStories();
  }, [loadPosts, loadStories]);

  // Charge la liste des utilisateurs déjà suivis dès que les posts sont chargés
  useEffect(() => {
    if (posts.length === 0) return;
    const ids = [...new Set(posts.map(p => p.authorId).filter(Boolean))];
    apiCheckFollowing(ids).then(followed => {
      setFollowedIds(new Set(followed));
    }).catch(() => {});
  }, [posts.length]);

  const handleFollow = async (authorId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFollowing = followedIds.has(authorId);
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (isFollowing) next.delete(authorId); else next.add(authorId);
      return next;
    });
    try {
      await apiFollow(authorId, isFollowing ? "unfollow" : "follow");
    } catch {
      // Annuler l'optimistic update en cas d'erreur
      setFollowedIds(prev => {
        const next = new Set(prev);
        if (isFollowing) next.add(authorId); else next.delete(authorId);
        return next;
      });
    }
  };

  const archivePost = async (id: number) => {
    closeMenu();
    setPosts(ps => ps.filter(p => p.id !== id));
    try { await apiArchivePost(id); } catch { loadPosts(); }
  };

  const pinPost = async (id: number) => {
    closeMenu();
    setPosts(ps => ps.map(p => ({ ...p, isPinned: p.id === id })));
    try { await apiPinPost(id); } catch { loadPosts(); }
  };

  const deletePost = async (id: number) => {
    closeMenu();
    setPosts(ps => ps.filter(p => p.id !== id));
    try { await apiDeletePost(id); } catch { loadPosts(); }
  };

  const toggleLike = async (id: number) => {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const action = post.liked ? "unlike" : "like";
    setPosts(ps => ps.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likesCount: p.liked ? p.likesCount - 1 : p.likesCount + 1 } : p
    ));
    try {
      await apiLikePost(id, action);
      trackEvent("post_reaction", { action, surface: "feed" });
    } catch { loadPosts(); }
  };

  const toggleSave = async (id: number) => {
    const isSaved = savedSet.has(id);
    setSavedSet(s => { const n = new Set(s); isSaved ? n.delete(id) : n.add(id); return n; });
    try { await apiToggleSaved(id); } catch { setSavedSet(s => { const n = new Set(s); isSaved ? n.add(id) : n.delete(id); return n; }); }
  };

  const submitPost = async () => {
    if (!newPost.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiCreatePost(newPost.trim());
      trackEvent("post_created", { surface: "feed_quick", has_text: true, media_count: 0, has_music: false });
      setNewPost("");
      setShowModal(false);
      await loadPosts();
    }
    catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const handleTabClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === "messenger") navigate("/messages");
    if (tab === "notifs")    navigate("/notifications");
    if (tab === "shop")      navigate("/marketplace");
    if (tab === "friends")   navigate("/search");
  };

  const TABS: { id: typeof activeTab; Icon: React.FC<{ active: boolean }> }[] = [
    { id: "feed",      Icon: IconHome },
    { id: "friends",   Icon: IconFriends },
    { id: "messenger", Icon: IconMessenger },
    { id: "notifs",    Icon: IconBell },
    { id: "shop",      Icon: IconShop },
  ];

  return (
    <div style={{ background: "#F1F5F9", minHeight: "100vh", paddingBottom: 20 }}>
      {viewerOpen && storyGroups.length > 0 && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewerGroupIdx}
          onClose={() => { setViewerOpen(false); loadStories(); }}
          onAuthorClick={authorId => {
            setViewerOpen(false);
            navigate(`/user/${authorId}`);
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════
          STICKY HEADER — 3 rows exactly like Facebook
      ═══════════════════════════════════════════════ */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--theme-surface)" }}>

        {/* Row 1 — Mode payant */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "7px 14px", borderBottom: "1px solid #F1F5F9",
          background: "var(--theme-surface)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--theme-text)" }}>Mode payant</span>
            <div style={{
              width: 17, height: 17, borderRadius: "50%", background: "#E5E7EB",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800, color: "#fff", lineHeight: 1,
            }}>?</div>
          </div>
          <button style={{
            background: "#E5E7EB", border: "none", borderRadius: 6,
            padding: "6px 13px", fontWeight: 600, fontSize: 13, cursor: "pointer",
            color: "var(--theme-text)",
          }}>
            Changer de mode
          </button>
        </div>

        {/* Row 2 — Brand + icon buttons */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 14px",
        }}>
          {/* Brand logo */}
          <img src="/logo.png" alt="Brute Pawa" style={{ height: 38, width: 38, borderRadius: 10, objectFit: "cover" }} />

          {/* Icon buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "+",  title: "Créer",           action: () => navigate("/create-post") },
              { label: "🔍", title: "Rechercher",       action: () => navigate("/search") },
              { label: "☰",  title: "Menu",             action: () => navigate("/menu") },
            ].map(btn => (
              <button
                key={btn.title}
                title={btn.title}
                onClick={btn.action}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "#E5E7EB", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: btn.label === "+" ? 22 : 18,
                  fontWeight: btn.label === "+" ? 700 : 400,
                  color: "var(--theme-text)", cursor: "pointer", flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3 — Tab bar */}
        <div style={{
          display: "flex",
          borderTop: "1px solid #E5E7EB",
        }}>
          {TABS.map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              style={{
                flex: 1, background: "none", border: "none",
                padding: "10px 0 8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderBottom: activeTab === id ? "3px solid var(--bp-primary)" : "3px solid transparent",
                cursor: "pointer",
                transition: "border-color .15s",
              }}
            >
              <Icon active={activeTab === id} />
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          FEED CONTENT
      ═══════════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>

        {/* ── Stories row ── */}
        <input ref={storyFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleStoryFileSelect} />
        <div style={{ background: "var(--theme-surface)", overflowX: "auto", padding: "10px 0 10px 10px" }}>
          <div style={{ display: "flex", gap: 8, width: "max-content" }}>

            {/* Create story card */}
            <div
              onClick={() => storyFileRef.current?.click()}
              style={{
                width: 96, flexShrink: 0, cursor: "pointer",
                display: "flex", flexDirection: "column",
              }}
            >
              <div style={{
                width: 96, height: 144, borderRadius: 10, overflow: "hidden",
                position: "relative", border: "1px solid #E5E7EB",
              }}>
                <div style={{ width: "100%", height: "100%", background: "#E5E7EB", overflow: "hidden" }}>
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="moi" style={{ width: "100%", height: "75%", objectFit: "cover", display: "block" }} />
                    : <div style={{ width: "100%", height: "75%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 26 }}>{userInitials}</div>
                  }
                  <div style={{ height: "25%", background: "var(--theme-surface)", display: "flex", alignItems: "center", justifyContent: "center" }} />
                </div>
                {/* Blue + circle at bottom of image zone */}
                <div style={{
                  position: "absolute", bottom: "23%", left: "50%",
                  transform: "translate(-50%, 50%)",
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--bp-primary)", border: "3px solid #fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1,
                  zIndex: 2,
                }}>+</div>
              </div>
              <div style={{
                textAlign: "center", fontSize: 12, fontWeight: 700,
                color: "var(--theme-text)", marginTop: 6, lineHeight: 1.3,
                padding: "0 2px",
              }}>Créer une story</div>
            </div>

            {/* Real story groups */}
            {storyGroups.map((group, idx) => {
              const initials = getInitials(group.authorName);
              const avatarBg = AVATAR_COLORS[group.authorId % AVATAR_COLORS.length];
              const preview = group.stories[0];
              return (
                <div
                  key={group.authorId}
                  onClick={() => { setViewerGroupIdx(idx); setViewerOpen(true); }}
                  style={{ width: 96, flexShrink: 0, cursor: "pointer" }}
                >
                  <div style={{
                    width: 96, height: 144, borderRadius: 10, overflow: "hidden",
                    position: "relative",
                    background: preview?.mediaUrl
                      ? `url(${preview.mediaUrl}) center/cover no-repeat`
                      : (preview?.bgColor ?? avatarBg),
                  }}>
                    {/* Emoji overlay */}
                    {preview?.emoji && !preview?.mediaUrl && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{preview.emoji}</div>
                    )}
                    {/* Gradient overlay at bottom */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: "linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)",
                    }} />
                    {/* Author avatar ring — top left */}
                    <div style={{
                      position: "absolute", top: 8, left: 8,
                      width: 36, height: 36, borderRadius: "50%",
                      border: "3px solid var(--bp-primary)",
                      background: avatarBg,
                      overflow: "hidden", flexShrink: 0,
                    }}>
                      {group.authorAvatarUrl
                        ? <img src={group.authorAvatarUrl} alt={group.authorName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>{initials}</div>
                      }
                    </div>
                    {/* Count badge — top right */}
                    {group.storiesCount > 1 && (
                      <div style={{
                        position: "absolute", top: 6, right: 6,
                        background: "var(--bp-primary)", color: "#fff",
                        borderRadius: 10, minWidth: 20, height: 20,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, padding: "0 4px",
                        border: "2px solid #fff",
                      }}>{group.storiesCount}</div>
                    )}
                    {/* Author name — bottom */}
                    <div style={{
                      position: "absolute", bottom: 8, left: 6, right: 6,
                      color: "#fff", fontWeight: 700, fontSize: 12,
                      textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                    }}>{group.authorName.split(" ")[0]}</div>
                  </div>
                </div>
              );
            })}

            {/* Padding right */}
            <div style={{ width: 2, flexShrink: 0 }} />
          </div>
        </div>

        {/* ── Post creation card ── */}
        <div style={{ background: "var(--theme-surface)", padding: "10px 14px 0" }}>
          {/* Top row: avatar + input + Photo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {/* Avatar */}
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="moi" onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, cursor: "pointer" }} />
              : <div onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0, cursor: "pointer" }}>{userInitials}</div>
            }
            {/* Fake input */}
            <div
              onClick={() => navigate("/create-post")}
              style={{
                flex: 1, background: "#F1F5F9", borderRadius: 22,
                padding: "9px 14px", fontSize: 16,
                color: "#64748B", cursor: "pointer",
                border: "1px solid #E5E7EB",
                userSelect: "none",
              }}
            >
              À quoi pensez-vous ?
            </div>
            {/* Photo button */}
            <div
              onClick={() => navigate("/create-post")}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, cursor: "pointer", flexShrink: 0,
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 8,
                background: "#F0FDF4", border: "1px solid #DCFCE7",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>📷</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Photo</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #E5E7EB" }} />

          {/* Quick action row */}
          <div style={{ display: "flex" }}>
            {[
              { emoji: "🙂", label: "Je me sens...", action: () => navigate("/create-post") },
              { emoji: "📹", label: "Vidéo",         action: () => navigate("/create-post") },
              { emoji: "📍", label: "Localisation",  action: () => navigate("/create-post") },
            ].map((btn, i) => (
              <button
                key={btn.label}
                onClick={btn.action}
                style={{
                  flex: 1, background: "none", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 5, padding: "10px 4px", cursor: "pointer",
                  borderLeft: i > 0 ? "1px solid #E5E7EB" : "none",
                  fontSize: 13, fontWeight: 600, color: "#64748B",
                }}
              >
                <span style={{ fontSize: 18 }}>{btn.emoji}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: "center", padding: 32, background: "var(--theme-surface)", color: "#64748B" }}>
            <div style={{
              width: 28, height: 28, border: "3px solid #E5E7EB",
              borderTopColor: "var(--bp-primary)", borderRadius: "50%",
              animation: "fb-spin .7s linear infinite",
              margin: "0 auto 10px",
            }} />
            Chargement des publications…
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && posts.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, background: "var(--theme-surface)", color: "#64748B" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div style={{ fontWeight: 700, color: "var(--theme-text)" }}>Aucune publication pour l'instant</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Soyez le premier à publier quelque chose !</div>
          </div>
        )}

        {/* ── Posts ── */}
        {posts.map(post => {
          const flag = COUNTRY_FLAGS[post.authorCountry] ?? "";
          const initials = getInitials(post.authorName);
          const avatarColor = AVATAR_COLORS[post.authorId % AVATAR_COLORS.length];
          return (
            <div key={post.id} style={{ background: "var(--theme-surface)" }}>
              {/* Post header */}
              <div style={{ display: "flex", alignItems: "flex-start", padding: "12px 14px 8px", gap: 10 }}>
                {post.authorAvatarUrl
                  ? <img src={post.authorAvatarUrl} alt={post.authorName} loading="lazy" decoding="async" onClick={() => navigate(`/user/${post.authorId}`)}
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, cursor: "pointer" }} />
                  : <div onClick={() => navigate(`/user/${post.authorId}`)}
                      style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0, cursor: "pointer" }}>
                      {initials}
                    </div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--theme-text)", cursor: "pointer" }}
                      onClick={() => navigate(`/user/${post.authorId}`)}>
                      {post.authorName}
                    </span>
                    {flag && <span style={{ fontSize: 14 }}>{flag}</span>}
                    <UserBadge type={post.authorBadgeType} />
                    {followedIds.has(post.authorId)
                      ? <span
                          onClick={(e) => handleFollow(post.authorId, e)}
                          style={{ fontSize: 13, fontWeight: 600, color: "#64748B", cursor: "pointer" }}>· Suivi</span>
                      : <span
                          onClick={(e) => handleFollow(post.authorId, e)}
                          style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-primary)", cursor: "pointer" }}>· Suivre</span>
                    }
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748B", marginTop: 1 }}>
                    <span>{timeAgo(post.createdAt)}</span>
                    <span>·</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#64748B"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6l5 3-1 1.73-6-3.5V7z"/></svg>
                  </div>
                  {post.location && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--bp-primary)", marginTop: 2 }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span>{post.location}</span>
                    </div>
                  )}
                </div>
                {/* ··· */}
                <button
                  onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right }); setPostMenuId(post.id); }}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", fontSize: 20, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
                  ···
                </button>
              </div>

              {/* Content + Music card (unified) */}
              {(() => {
                // Detect music in content: "🎵 Track — Artist" or "♪/♫ Track — Artist"
                // CreatePostPage stores as: `🎵 Title — Artist`
                const MUSIC_RE = /^[♪♫🎵🎶🎼]\s*(.+?)\s*[—–\-]\s*(.+)$/;
                const parsed = !post.musicTrackName && post.content
                  ? post.content.match(MUSIC_RE)
                  : null;
                // Also detect multi-line content where last line is the music tag
                const parsedLine = !post.musicTrackName && !parsed && post.content
                  ? (post.content.split("\n").pop() ?? "").match(MUSIC_RE)
                  : null;

                const musicTrack  = post.musicTrackName ?? (parsed ? parsed[1].trim() : null) ?? (parsedLine ? parsedLine[1].trim() : null);
                const musicArtist = post.musicArtist   ?? (parsed ? parsed[2].trim() : null) ?? (parsedLine ? parsedLine[2].trim() : null);
                // isMusicContent: the ENTIRE content is just the music tag (no other text)
                const isMusicContent = !!parsed;
                // If music was appended as last line, get the caption (everything before)
                const captionLines = parsedLine
                  ? post.content!.split("\n").slice(0, -1).join("\n").trim()
                  : null;

                return (
                  <>
                    {/* Pure music tag — don't show as text */}
                    {post.content && !isMusicContent && !post.musicTrackName && !parsedLine && (
                      <div style={{ padding: "0 14px 10px" }}>
                        <ExpandableText text={post.content} maxChars={220} fontSize={15} color="#111827" lineHeight={1.5} onMentionClick={name => { apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {}); }} />
                      </div>
                    )}
                    {/* Caption from DB musicTrackName posts */}
                    {post.content && post.musicTrackName && (
                      <div style={{ padding: "0 14px 10px" }}>
                        <ExpandableText text={post.content} maxChars={220} fontSize={15} color="#111827" lineHeight={1.5} onMentionClick={name => { apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {}); }} />
                      </div>
                    )}
                    {/* Caption when music tag is the last line */}
                    {captionLines && (
                      <div style={{ padding: "0 14px 10px" }}>
                        <ExpandableText text={captionLines} maxChars={220} fontSize={15} color="#111827" lineHeight={1.5} onMentionClick={name => { apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {}); }} />
                      </div>
                    )}
                    {/* Music card — from music_* fields OR parsed from content */}
                    {musicTrack && (
                      <MusicPlayerWidget
                        trackName={musicTrack}
                        artist={musicArtist ?? "Artiste inconnu"}
                        artworkUrl={post.musicArtworkUrl ?? null}
                        url={post.musicUrl ?? null}
                        duration={post.musicDuration ?? null}
                        audioLikes={post.musicLikesCount ?? 0}
                        postId={post.id}
                      />
                    )}
                  </>
                );
              })()}

              {/* Media */}
              {post.imageUrl && (
                <div style={{ overflow: "hidden", background: "#000" }}>
                  <img src={post.imageUrl} alt="" loading="lazy" decoding="async"
                    onClick={() => openImageViewer(post.imageUrl!)}
                    style={{ width: "100%", height: "auto", objectFit: "contain", display: "block", cursor: "zoom-in" }} />
                </div>
              )}

              {/* Stats bar — Facebook Premium */}
              {(post.likesCount > 0 || post.commentsCount > 0) && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px 5px", fontSize: 13, color: "#64748B" }}>
                  {/* Left: reaction emoji circles + count */}
                  {post.likesCount > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {/* Stacked reaction circles */}
                      <div style={{ display: "flex" }}>
                        {/* 👍 Like — always shown */}
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--bp-primary)", border: "1.5px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, zIndex: 3 }}>👍</div>
                        {post.likesCount >= 3 && (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#F43F5E", border: "1.5px solid #fff", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, zIndex: 2 }}>❤️</div>
                        )}
                        {post.likesCount >= 7 && (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#F59E0B", border: "1.5px solid #fff", marginLeft: -6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, zIndex: 1 }}>😂</div>
                        )}
                      </div>
                      <span style={{ color: "#64748B", fontSize: 13 }}>{formatNumber(post.likesCount)} réaction{post.likesCount > 1 ? "s" : ""}</span>
                    </div>
                  ) : <div />}

                  {/* Right: avatar stack + comments count + ">" */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {post.likesCount > 0 && (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {/* Mock avatar stack — colored circles */}
                        {[
                          { bg: "var(--bp-primary)", i: 0 },
                          ...(post.likesCount > 1 ? [{ bg: "#3B82F6", i: 1 }] : []),
                          ...(post.likesCount > 2 ? [{ bg: "#F43F5E", i: 2 }] : []),
                        ].map(({ bg, i }) => (
                          <div key={i} style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: bg, border: "2px solid #fff",
                            marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i,
                            position: "relative",
                          }} />
                        ))}
                        <span style={{ marginLeft: 4, color: "#64748B", fontSize: 14, fontWeight: 600 }}>›</span>
                      </div>
                    )}
                    {post.commentsCount > 0 && (
                      <span style={{ cursor: "pointer", color: "#64748B", fontSize: 13 }} onClick={() => navigate(`/post/${post.id}`)}>
                        {formatNumber(post.commentsCount)} commentaire{post.commentsCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: "#E5E7EB", margin: "0 14px" }} />

              {/* Action bar — SVG icons, no emoji */}
              <div style={{ display: "flex", padding: "2px 0" }}>
                {/* J'aime */}
                <button
                  onClick={() => toggleLike(post.id)}
                  style={{ flex: 1, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 4px", fontSize: 13.5, fontWeight: 700, color: post.liked ? "var(--bp-primary)" : "#64748B", cursor: "pointer", transition: "color .13s" }}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill={post.liked ? "var(--bp-primary)" : "none"} stroke={post.liked ? "var(--bp-primary)" : "#64748B"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12M15 5.88L14 10h5.83A2 2 0 0 1 21.83 12.49L19.04 19.5A2 2 0 0 1 17.12 21H7a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 .586-1.414L10 5H13a2 2 0 0 1 2 2v-.12z"/></svg>
                  <span>J'aime</span>
                </button>
                <div style={{ width: 1, background: "#E5E7EB", alignSelf: "stretch", margin: "6px 0" }} />
                {/* Commenter */}
                <button
                  onClick={() => navigate(`/post/${post.id}`)}
                  style={{ flex: 1, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 4px", fontSize: 13.5, fontWeight: 700, color: "#64748B", cursor: "pointer" }}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Commenter</span>
                </button>
                <div style={{ width: 1, background: "#E5E7EB", alignSelf: "stretch", margin: "6px 0" }} />
                {/* Partager */}
                <button
                  onClick={() => setSharePost({ id: post.id, authorName: post.authorName, content: post.content })}
                  style={{ flex: 1, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 4px", fontSize: 13.5, fontWeight: 700, color: "#64748B", cursor: "pointer" }}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
                  <span>Partager</span>
                </button>
                <div style={{ width: 1, background: "#E5E7EB", alignSelf: "stretch", margin: "6px 0" }} />
                {/* Enregistrer */}
                <button
                  onClick={() => toggleSave(post.id)}
                  style={{ flex: 1, background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 4px", fontSize: 13.5, fontWeight: 700, color: savedSet.has(post.id) ? "var(--bp-primary)" : "#64748B", cursor: "pointer", transition: "color .13s" }}
                >
                  <svg viewBox="0 0 24 24" width="19" height="19" fill={savedSet.has(post.id) ? "var(--bp-primary)" : "none"} stroke={savedSet.has(post.id) ? "var(--bp-primary)" : "#64748B"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                  <span>Enregistrer</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* End of feed */}
        {!loading && posts.length > 0 && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#64748B", fontSize: 13 }}>
            Vous avez tout vu
          </div>
        )}
      </div>

      {/* ── Spin animation ── */}
      <style>{`@keyframes fb-spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Share Sheet ── */}
      <ShareSheet
        open={sharePost !== null}
        post={sharePost}
        onClose={() => setSharePost(null)}
      />

      {/* ── Floating post menu ── */}
      {postMenuId !== null && menuPos !== null && createPortal(
        <div onClick={closeMenu} style={{ position: "fixed", inset: 0, zIndex: 9000 }}>
          <style>{`@keyframes bpMenuIn { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }`}</style>
          <div onClick={e => e.stopPropagation()} style={{
            position: "fixed",
            top: menuPos.top,
            right: menuPos.right,
            width: 235,
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            border: "1px solid rgba(34,197,94,0.08)",
            overflow: "hidden",
            animation: "bpMenuIn 180ms ease",
            transformOrigin: "top right",
            zIndex: 9001,
          }}>
            {(() => {
              const menuPost = posts.find(p => p.id === postMenuId);
              const isMyPost = menuPost?.isOwner === true || (user.id !== undefined && menuPost?.authorId === user.id);
              if (isMyPost) {
                return (
                  <>
                    {([
                      { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label: "Modifier le post", color: "var(--bp-primary)", action: closeMenu },
                      { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1v3.76z"/></svg>, label: "Épingler le post", color: "var(--bp-primary)", action: () => { if (postMenuId !== null) pinPost(postMenuId); } },
                      { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><line x1="10" y1="12" x2="14" y2="12"/></svg>, label: "Archiver le post", color: "var(--bp-primary)", action: () => { if (postMenuId !== null) archivePost(postMenuId); } },
                    ] as { icon: React.ReactNode; label: string; color: string; action: () => void }[]).map((item, i) => (
                      <button key={i} onClick={item.action}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(34,197,94,0.06)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        style={{ width: "100%", background: "none", border: "none", borderBottom: "1px solid rgba(34,197,94,0.07)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 52, textAlign: "left", transition: "background 0.15s ease" }}>
                        {item.icon}
                        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: item.color }}>{item.label}</span>
                      </button>
                    ))}
                    <button onClick={() => { if (postMenuId !== null) deletePost(postMenuId); }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                      style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 52, textAlign: "left", transition: "background 0.15s ease" }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: "#EF4444" }}>Supprimer le post</span>
                    </button>
                  </>
                );
              } else {
                return (
                  <>
                    {([
                      { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>, label: "Ça m'intéresse", color: "var(--bp-primary)", action: closeMenu },
                      { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>, label: "Enregistrer", color: "var(--bp-primary)", action: () => { if (postMenuId !== null) { toggleSave(postMenuId); closeMenu(); } } },
                      { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15" stroke="#EF4444" strokeWidth="2"/></svg>, label: "Signaler", color: "#EF4444", action: closeMenu },
                      { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>, label: "Bloquer l'utilisateur", color: "#EF4444", action: closeMenu },
                    ] as { icon: React.ReactNode; label: string; color: string; action: () => void }[]).map((item, i, arr) => (
                      <button key={i} onClick={item.action}
                        onMouseEnter={e => (e.currentTarget.style.background = item.color === "#EF4444" ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        style={{ width: "100%", background: "none", border: "none", borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 52, textAlign: "left", transition: "background 0.15s ease" }}>
                        {item.icon}
                        <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: item.color }}>{item.label}</span>
                      </button>
                    ))}
                  </>
                );
              }
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ── Quick post modal ── */}
      {showModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px" }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: "var(--theme-surface)", borderRadius: 10, width: "100%", maxWidth: 500, overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #E5E7EB" }}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Créer une publication</span>
              <button onClick={() => setShowModal(false)} style={{ background: "#E5E7EB", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>✕</button>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="Avatar" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>{userInitials}</div>
                }
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>🌐 Public</div>
                </div>
              </div>
              <textarea
                style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 18, minHeight: 120, color: "var(--theme-text)", fontFamily: "inherit", lineHeight: 1.5, background: "transparent" }}
                placeholder={`Quoi de neuf, ${(user.name ?? "").split(" ")[0]} ?`}
                value={newPost}
                onChange={e => setNewPost(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <button
                onClick={submitPost}
                disabled={submitting || !newPost.trim()}
                style={{
                  width: "100%", background: !newPost.trim() ? "#bec3c9" : "var(--bp-primary)",
                  color: "#fff", border: "none", borderRadius: 6,
                  padding: "10px", fontWeight: 700, fontSize: 16,
                  cursor: !newPost.trim() ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Publication…" : "Publier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
