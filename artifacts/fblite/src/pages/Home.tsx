import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "../router";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Post } from "../lib/store";
import { formatNumber } from "../data/mock";
import { apiGetStories, apiGetComments, apiPostComment, apiPostVoiceComment, apiUploadVoice, apiDeleteComment, apiToggleCommentLike, apiToggleSaved, apiReportPost, apiFollow, apiCheckFollowing, apiBlockUser, apiDeletePost, apiHidePost, apiUnpinPost, apiPinPost, apiArchivePost, apiTogglePostComments, apiSetPostAudience, apiGetPostStats, apiSearchUsers, type StoryGroup, type PostComment } from "../lib/api";
import ExpandableText from "../components/ExpandableText";
import MusicPlayerWidget from "../components/MusicPlayerWidget";
import StoryViewer from "../components/StoryViewer";
import VoiceRecorder from "../components/VoiceRecorder";
import VoicePlayer from "../components/VoicePlayer";
import { storyDraftStore } from "../lib/storyDraft";

const AVATAR_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#D97706","#388E3C","#212121","#D32F2F","#00838F"];

function getInitials(name?: string) {
  if (!name) return "??";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

const REACTIONS = [
  { id: "like",  label: "J'aime",    emoji: "👍", color: "var(--bp-primary)" },
  { id: "love",  label: "J'adore",   emoji: "❤️", color: "#F33E58" },
  { id: "care",  label: "Solidaire", emoji: "🫂", color: "#F7B125" },
  { id: "haha",  label: "Haha",      emoji: "😆", color: "#F7B125" },
  { id: "wow",   label: "Wouah",     emoji: "😮", color: "#F7B125" },
  { id: "sad",   label: "Triste",    emoji: "😢", color: "#748FD5" },
  { id: "angry", label: "En colère", emoji: "😡", color: "#E9710F" },
];

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "À l'instant";
  if (s < 3600)  return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

interface Props {
  posts?: Post[];
  postsLoading?: boolean;
  onLike?: (id: number) => void;
  onNewPost?: (content: string) => void;
  newPosts?: Post[];
}


type PostMenu = {
  postId: number;
  authorId: number;
  authorName: string;
  isOwn: boolean;
  isPinned: boolean;
  commentsDisabled: boolean;
  audience: string;
};

export default function Home({ posts = [], postsLoading = false, onLike, newPosts = [] }: Props) {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const userInitials = user.name ? user.name.slice(0, 2).toUpperCase() : "ME";

  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);
  const storyFileRef = useRef<HTMLInputElement>(null);

  const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";
    const previewUrl = URL.createObjectURL(file);
    storyDraftStore.set({ file, previewUrl });
    navigate("/create-story");
  };

  const loadStories = useCallback(async () => {
    try { setStoryGroups(await apiGetStories()); } catch { setStoryGroups([]); }
  }, []);

  useEffect(() => { loadStories(); }, [loadStories]);

  const allPosts = [...newPosts, ...posts];

  // Check which post authors the current user already follows
  useEffect(() => {
    const myId = (user as { id?: number }).id;
    const ids = [...new Set(allPosts.map(p => p.userId).filter(id => id && id !== myId))] as number[];
    if (ids.length === 0) return;
    apiCheckFollowing(ids).then(followed => setFollowedUsers(new Set(followed))).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, newPosts]);

  const [showComments, setShowComments] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, PostComment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<number | null>(null);
  // reply state
  const [replyingTo, setReplyingTo]           = useState<number | null>(null);
  const [replyContextName, setReplyContextName] = useState<string>("");
  const [replyContextPostId, setReplyContextPostId] = useState<number | null>(null);
  const commentInputRef = useRef<Record<number, HTMLInputElement | null>>({});

  // Voice recorder
  const [voiceMode, setVoiceMode] = useState<number | null>(null);

  // Reaction picker
  const [reactionType, setReactionType] = useState<Record<number, string>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null);
  const [likeAnimating, setLikeAnimating] = useState<number | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadComments = useCallback(async (postId: number) => {
    try {
      const data = await apiGetComments(postId);
      setComments(prev => ({ ...prev, [postId]: data }));
    } catch { /* silent */ }
  }, []);

  const toggleComments = (postId: number) => {
    if (showComments === postId) {
      setShowComments(null);
    } else {
      setShowComments(postId);
      loadComments(postId);
    }
  };

  const startReply = (comment: PostComment, postId: number) => {
    setReplyingTo(comment.id);
    setReplyContextName(`${comment.authorFirstName} ${comment.authorLastName}`);
    setReplyContextPostId(postId);
    setNewComment(prev => ({ ...prev, [postId]: "" }));
    setTimeout(() => commentInputRef.current[postId]?.focus(), 80);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyContextName("");
    setReplyContextPostId(null);
  };

  const toggleCommentLike = async (postId: number, commentId: number) => {
    // Optimistic update
    setComments(prev => ({
      ...prev,
      [postId]: (prev[postId] ?? []).map(c =>
        c.id === commentId
          ? { ...c, likedByMe: !c.likedByMe, likesCount: c.likedByMe ? Math.max(0, c.likesCount - 1) : c.likesCount + 1 }
          : c,
      ),
    }));
    try {
      const { liked, likesCount } = await apiToggleCommentLike(postId, commentId);
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] ?? []).map(c =>
          c.id === commentId ? { ...c, likedByMe: liked, likesCount } : c,
        ),
      }));
    } catch {
      // Revert optimistic update on error
      setComments(prev => ({
        ...prev,
        [postId]: (prev[postId] ?? []).map(c =>
          c.id === commentId
            ? { ...c, likedByMe: !c.likedByMe, likesCount: c.likedByMe ? c.likesCount + 1 : Math.max(0, c.likesCount - 1) }
            : c,
        ),
      }));
    }
  };

  // Post menu & actions
  const [openMenu, setOpenMenu] = useState<PostMenu | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());
  const [notifPosts, setNotifPosts] = useState<Set<number>>(new Set());
  const [hiddenPosts, setHiddenPosts] = useState<Set<number>>(new Set());
  const [localDeleted, setLocalDeleted] = useState<Set<number>>(new Set());
  const [localPinned, setLocalPinned] = useState<Set<number>>(new Set());
  const [localCommentsOff, setLocalCommentsOff] = useState<Set<number>>(new Set());
  const [localAudience, setLocalAudience] = useState<Record<number, string>>({});
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'block'; postId?: number; authorId?: number; authorName?: string } | null>(null);
  const [reportSheet, setReportSheet] = useState<{ postId: number; authorName: string } | null>(null);
  const [statsModal, setStatsModal] = useState<{ postId: number; stats: Record<string, unknown> } | null>(null);
  const [audienceSheet, setAudienceSheet] = useState<{ postId: number; current: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [followedUsers, setFollowedUsers] = useState<Set<number>>(new Set());

  // Lock body scroll when bottom sheet is open to prevent layout shift
  useEffect(() => {
    if (openMenu) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [openMenu]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const closeMenu = () => setOpenMenu(null);

  const handleSave = (postId: number) => {
    const alreadySaved = savedPosts.has(postId);
    setSavedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
    showToast(alreadySaved ? "Publication retirée des enregistrements" : "✅ Publication enregistrée");
    apiToggleSaved(postId).catch(() => {
      setSavedPosts(prev => {
        const next = new Set(prev);
        if (alreadySaved) next.add(postId); else next.delete(postId);
        return next;
      });
    });
    closeMenu();
  };

  const handleNotif = (postId: number) => {
    setNotifPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) { next.delete(postId); showToast("🔕 Notifications désactivées pour cette publication"); }
      else { next.add(postId); showToast("🔔 Vous recevrez des notifications pour cette publication"); }
      return next;
    });
    closeMenu();
  };

  const handleHide = (postId: number) => {
    setHiddenPosts(prev => new Set([...prev, postId]));
    showToast("Publication masquée. Vous verrez moins de contenus similaires.");
    closeMenu();
  };

  const handleReport = (authorName: string, postId: number) => {
    showToast(`🚩 Publication signalée. ${authorName} ne saura pas qui l'a signalé(e).`);
    apiReportPost(postId, "inappropriate").catch(() => {});
    closeMenu();
  };

  const handleCopyLink = (postId: number) => {
    const link = `https://brutepawa.app/post/${postId}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    showToast("🔗 Lien copié dans le presse-papier");
    closeMenu();
  };

  const handleShare = (postId: number) => {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const link = `${window.location.origin}${base}/post/${postId}`;
    if (navigator.share) {
      navigator.share({ title: "Publication Brute Pawa", url: link }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(link).catch(() => {});
      showToast("↗️ Lien copié pour partage");
    }
    closeMenu();
  };

  const handleInterest = (interested: boolean) => {
    showToast(interested
      ? "👍 Vous verrez plus de publications de ce type"
      : "👎 Vous verrez moins de publications de ce type");
    closeMenu();
  };

  const handleFollow = (authorId: number, authorName: string) => {
    setFollowedUsers(prev => new Set([...prev, authorId]));
    apiFollow(authorId, "follow").catch(() => {
      setFollowedUsers(prev => { const n = new Set(prev); n.delete(authorId); return n; });
    });
    showToast(`✅ Vous suivez maintenant ${authorName}`);
  };

  const handleUnfollow = (authorId: number, authorName: string) => {
    setFollowedUsers(prev => { const n = new Set(prev); n.delete(authorId); return n; });
    apiFollow(authorId, "unfollow").catch(() => {});
    showToast(`Vous ne suivez plus ${authorName}`);
    closeMenu();
  };

  const handlePin = (postId: number, isPinned: boolean) => {
    if (isPinned) {
      setLocalPinned(prev => { const n = new Set(prev); n.delete(postId); return n; });
      apiUnpinPost(postId).catch(() => {});
      showToast("Épingle retirée du profil");
    } else {
      setLocalPinned(prev => new Set([...prev, postId]));
      apiPinPost(postId).catch(() => {});
      showToast("📌 Publication épinglée au profil");
    }
    closeMenu();
  };

  const handleArchivePost = (postId: number) => {
    apiArchivePost(postId).catch(() => {});
    setLocalDeleted(prev => new Set([...prev, postId]));
    showToast("🗂️ Publication archivée");
    closeMenu();
  };

  const handleToggleComments = (postId: number, currentlyDisabled: boolean) => {
    if (currentlyDisabled) {
      setLocalCommentsOff(prev => { const n = new Set(prev); n.delete(postId); return n; });
    } else {
      setLocalCommentsOff(prev => new Set([...prev, postId]));
    }
    apiTogglePostComments(postId).catch(() => {});
    showToast(currentlyDisabled ? "💬 Commentaires activés" : "🔇 Commentaires désactivés");
    closeMenu();
  };

  const handleViewStats = async (postId: number) => {
    closeMenu();
    try {
      const stats = await apiGetPostStats(postId) as Record<string, unknown>;
      setStatsModal({ postId, stats });
    } catch {
      showToast("Impossible de charger les statistiques");
    }
  };

  const handleAudienceChange = (postId: number, audience: string) => {
    setLocalAudience(prev => ({ ...prev, [postId]: audience }));
    apiSetPostAudience(postId, audience).catch(() => {});
    const labels: Record<string, string> = { public: "🌐 Public", friends: "👥 Amis", private: "🔒 Privé" };
    showToast(`Audience : ${labels[audience] ?? audience}`);
    setAudienceSheet(null);
  };

  const toggleLike = (id: number) => {
    onLike?.(id);
  };

  const quickLike = (postId: number, isLiked: boolean) => {
    if (showReactionPicker === postId) { setShowReactionPicker(null); return; }
    if (!isLiked) {
      setReactionType(prev => ({ ...prev, [postId]: "like" }));
      setLikeAnimating(postId);
      setTimeout(() => setLikeAnimating(null), 400);
    } else {
      setReactionType(prev => { const n = { ...prev }; delete n[postId]; return n; });
    }
    onLike?.(postId);
  };

  const selectReaction = (postId: number, reactionId: string, isLiked: boolean) => {
    const current = reactionType[postId];
    if (current === reactionId) {
      setReactionType(prev => { const n = { ...prev }; delete n[postId]; return n; });
      if (isLiked) onLike?.(postId);
    } else if (!isLiked) {
      setReactionType(prev => ({ ...prev, [postId]: reactionId }));
      onLike?.(postId);
    } else {
      setReactionType(prev => ({ ...prev, [postId]: reactionId }));
    }
    setShowReactionPicker(null);
  };

  const startReactionTimer = (postId: number) => {
    reactionTimerRef.current = setTimeout(() => setShowReactionPicker(postId), 500);
  };
  const cancelReactionTimer = () => {
    if (reactionTimerRef.current) { clearTimeout(reactionTimerRef.current); reactionTimerRef.current = null; }
  };

  const submitComment = async (postId: number) => {
    const text = (newComment[postId] ?? "").trim();
    if (!text || submittingComment === postId) return;
    setSubmittingComment(postId);
    setNewComment(prev => ({ ...prev, [postId]: "" }));
    const parentId = replyContextPostId === postId && replyingTo != null ? replyingTo : undefined;
    if (parentId != null) cancelReply();
    try {
      const comment = await apiPostComment(postId, text, parentId);
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
    } catch {
      setNewComment(prev => ({ ...prev, [postId]: text }));
    } finally {
      setSubmittingComment(null);
    }
  };

  const submitVoiceComment = async (postId: number, blob: Blob, duration: number) => {
    const parentId = replyContextPostId === postId && replyingTo != null ? replyingTo : undefined;
    if (parentId != null) cancelReply();
    const { url } = await apiUploadVoice(blob, duration);
    const comment = await apiPostVoiceComment(postId, url, Math.round(duration), parentId);
    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), comment] }));
    setVoiceMode(null);
  };

  const deleteComment = async (postId: number, commentId: number) => {
    try {
      await apiDeleteComment(postId, commentId);
      setComments(prev => ({ ...prev, [postId]: (prev[postId] ?? []).filter(c => c.id !== commentId) }));
    } catch { /* silent */ }
  };


  const visiblePosts = allPosts.filter(p => !hiddenPosts.has(p.id) && !localDeleted.has(p.id));

  return (
    <div className="feed-container" style={{ paddingBottom: 80, gap: 14 }}>

      {viewerOpen && storyGroups.length > 0 && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={viewerGroupIdx}
          onClose={() => { setViewerOpen(false); loadStories(); }}
          onAuthorClick={authorId => {
            setViewerOpen(false);
            navigate(authorId === user.id ? "/profile" : `/user/${authorId}`);
          }}
        />
      )}

      {/* ─── Floating Notification (Match mockup) ─── */}
      <div style={{ background: "linear-gradient(to right, rgba(236,253,245,0.9), rgba(240,253,244,0.9))", borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 12px rgba(34,197,94,0.1)", backdropFilter: "blur(10px)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "var(--bp-primary)", fontWeight: 900, fontSize: 13, letterSpacing: -0.5 }}>ton</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Equipe officielle Ton</div>
          <div style={{ fontSize: 13, color: "#444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Romeo Afaye: Telling you</div>
        </div>
        <div style={{ fontSize: 11, color: "#888", alignSelf: "flex-start", flexShrink: 0 }}>il y a 1 min</div>
      </div>

      {/* ─── Create post card ─── */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.04)" }}>
        {/* Top row: avatar + input + icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 10px" }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="Avatar" onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, cursor: "pointer" }} />
            : <div onClick={() => navigate("/profile")} style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0, cursor: "pointer" }}>{userInitials}</div>
          }
          <div
            onClick={() => navigate("/create-post")}
            style={{ flex: 1, background: "#F3F4F6", borderRadius: 20, padding: "10px 16px", fontSize: 14, color: "#9CA3AF", cursor: "pointer", fontWeight: 400 }}
          >
            Quoi de neuf, {(user.name ?? "Omar").split(" ")[0]} ?
          </div>
          <button onClick={() => { sessionStorage.setItem("createPost_mode","photo"); navigate("/create-post"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="12" cy="14" r="3"/><path d="M7 8v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button onClick={() => { sessionStorage.setItem("createPost_mode","vocal"); navigate("/create-post"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(0,0,0,0.05)", margin: "0 14px" }} />

        {/* Action buttons row — 5 items, full width */}
        <div style={{ display: "flex", padding: "8px 0" }}>
          {([
            { label: "Photo",        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, action: () => { sessionStorage.setItem("createPost_mode","photo"); navigate("/create-post"); } },
            { label: "Vocal",        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E91E63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>, action: () => { sessionStorage.setItem("createPost_mode","vocal"); navigate("/create-post"); } },
            { label: "Vidéo",        icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>, action: () => { sessionStorage.setItem("createPost_mode","video"); navigate("/create-post"); } },
            { label: "Localisation", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E91E63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>, action: () => {
              if (!navigator.geolocation) { alert("La géolocalisation n'est pas disponible sur cet appareil."); return; }
              sessionStorage.setItem("createPost_mode","location");
              navigator.geolocation.getCurrentPosition(
                (pos) => { sessionStorage.setItem("createPost_location", JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })); navigate("/create-post"); },
                () => { sessionStorage.removeItem("createPost_mode"); alert("Impossible d'accéder à votre position. Vérifiez les autorisations."); }
              );
            }},
            { label: "Humeur",       icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>, action: () => navigate("/create-post") },
          ] as { label: string; icon: React.ReactNode; action: () => void }[]).map((btn, i, arr) => (
            <button
              key={btn.label}
              onClick={btn.action}
              style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 4, padding: "8px 4px", background: "none", border: "none", cursor: "pointer", borderRight: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}
            >
              {btn.icon}
              <span style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", whiteSpace: "nowrap" as const }}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Stories Row ─── */}
      <input ref={storyFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleStoryFileSelect} />
      <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none" as const, padding: "4px 0 12px", background: "transparent" }}>

        {/* ── Créer une story ── */}
        <div onClick={() => storyFileRef.current?.click()} style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <div style={{ width: 64, height: 96, borderRadius: 32, border: "2px solid var(--bp-primary)", padding: 2, display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ flex: 1, borderRadius: 28, border: "1px solid #E5E7EB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--bp-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>{userInitials}</div>
              }
            </div>
            <div style={{ position: "absolute", bottom: -2, right: -2, background: "var(--bp-primary)", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", border: "2px solid #fff", fontSize: 16, fontWeight: 700, lineHeight: 1 }}>+</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#111", textAlign: "center", lineHeight: 1.2 }}>Créer<br/>une story</div>
        </div>

        {/* ── User story cards ── */}
        {storyGroups.map((group, idx) => {
          const initials = group.authorName.slice(0, 2).toUpperCase();
          const avatarBg = AVATAR_COLORS[group.authorId % AVATAR_COLORS.length];
          const preview = group.stories[0];
          const ringColors = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981", "#8B5CF6"];
          const ring = ringColors[group.authorId % ringColors.length];
          return (
            <div key={group.authorId} onClick={() => { setViewerGroupIdx(idx); setViewerOpen(true); }} style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: 64, height: 96, borderRadius: 32, padding: 2, background: `linear-gradient(to bottom, ${ring}, ${ring}99)`, position: "relative" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: 30, border: "2px solid #fff", overflow: "hidden", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {preview?.mediaUrl || group.authorAvatarUrl
                    ? <img src={preview?.mediaUrl || group.authorAvatarUrl} alt={group.authorName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>{initials}</span>
                  }
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#111", textAlign: "center", maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {group.authorName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {postsLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: "#fff", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span className="bp-skeleton" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span className="bp-skeleton" style={{ width: "42%", height: 12, marginBottom: 7, borderRadius: 6 }} />
                  <span className="bp-skeleton" style={{ width: "28%", height: 10, borderRadius: 6 }} />
                </div>
              </div>
              <span className="bp-skeleton" style={{ width: "88%", height: 12, marginBottom: 8, borderRadius: 6 }} />
              <span className="bp-skeleton" style={{ width: "64%", height: 12, marginBottom: 16, borderRadius: 6 }} />
              {i === 0 && <span className="bp-skeleton" style={{ width: "100%", height: 180, borderRadius: 8 }} />}
            </div>
          ))}
        </div>
      )}

      {/* Posts Feed */}
      {!postsLoading && visiblePosts.map(post => {
        const displayName = post.authorName ?? "Utilisateur";
        const displayInitials = getInitials(displayName);
        const displayColor = post.authorAvatarUrl ? undefined : "var(--bp-primary)";
        const postComments = comments[post.id] ?? [];
        return (
          <div key={post.id} className="post-card">
            {post.sponsored && (
              <div style={{ padding: "6px 16px 0", fontSize: 12, color: "var(--fb-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>📢</span> {post.sponsorTag}
              </div>
            )}
            <div className="post-header">
              {post.authorAvatarUrl ? (
                <img
                  src={post.authorAvatarUrl} alt={displayName} className="avatar"
                  style={{ width: 40, height: 40, objectFit: "cover", flexShrink: 0, borderRadius: "50%", cursor: "pointer" }}
                  onClick={() => navigate(post.userId === user.id ? "/profile" : `/user/${post.userId}`)}
                />
              ) : (
                <div
                  className="avatar" style={{ background: displayColor, cursor: "pointer" }}
                  onClick={() => navigate(post.userId === user.id ? "/profile" : `/user/${post.userId}`)}
                >{displayInitials}</div>
              )}
              <div className="post-meta">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                    <div
                      className="post-author"
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(post.userId === user.id ? "/profile" : `/user/${post.userId}`)}
                    >{displayName}</div>
                    {post.taggedUsers && post.taggedUsers.length > 0 && (
                      <span style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>
                        {" avec "}
                        {post.taggedUsers.map((u, i) => (
                          <span key={u.id}>
                            <span
                              onClick={e => { e.stopPropagation(); navigate(`/user/${u.id}`); }}
                              style={{ color: "var(--bp-primary)", fontWeight: 700, cursor: "pointer" }}
                            >{u.name}</span>
                            {i < post.taggedUsers!.length - 1 && ", "}
                          </span>
                        ))}
                      </span>
                    )}
                    {post.mood && (
                      <span style={{ fontSize: 13, color: "var(--fb-text-secondary)", fontWeight: 400 }}>
                        {" est "}<span style={{ fontSize: 15 }}>{post.mood.split(" ")[0]}</span>{" "}
                        <em>{post.mood.slice(post.mood.indexOf(" ") + 1)}</em>
                      </span>
                    )}
                  </div>
                  {!post.sponsored && post.userId !== (user as { id?: number }).id && !followedUsers.has(post.userId) && (
                    <span
                      onClick={e => { e.stopPropagation(); handleFollow(post.userId, displayName); }}
                      style={{ color: "var(--bp-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", marginLeft: 2 }}
                    >
                      · Suivre
                    </span>
                  )}
                </div>
                <div className="post-time" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>🌐 {post.time}</span>
                  {post.location && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: "var(--bp-primary)", fontWeight: 600 }}>
                      · 📍 {post.location}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button
                  className="post-more"
                  onClick={e => { e.stopPropagation(); setOpenMenu({ postId: post.id, authorId: post.userId, authorName: displayName, isOwn: post.userId === (user as {id?:number}).id, isPinned: localPinned.has(post.id) || (post.isPinned ?? false), commentsDisabled: localCommentsOff.has(post.id) || (post.commentsDisabled ?? false), audience: localAudience[post.id] ?? (post.audience ?? 'public') }); }}
                  style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "4px 8px", borderRadius: "50%", color: "var(--fb-text-secondary)", lineHeight: 1 }}
                >
                  ···
                </button>
                <button
                  onClick={() => handleHide(post.id)}
                  style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: "4px 6px", borderRadius: "50%", color: "var(--fb-text-secondary)", lineHeight: 1, fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>
            </div>
            {/* ── bgColor + music : lecteur intégré dans le dégradé ── */}
            {post.bgColor && post.musicTrackName ? (
              <div style={{
                background: post.bgColor,
                borderRadius: 12,
                margin: "8px 0",
                overflow: "hidden",
              }}>
                {post.content && (
                  <div style={{
                    padding: "32px 20px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 120,
                    textAlign: "center",
                  }}>
                    <ExpandableText
                      text={post.content}
                      maxChars={220}
                      fontSize={20}
                      color="#ffffff"
                      lineHeight={1.5}
                      onMentionClick={name => {
                        apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {});
                      }}
                    />
                  </div>
                )}
                <MusicPlayerWidget
                  trackName={post.musicTrackName}
                  artist={post.musicArtist}
                  artworkUrl={post.musicArtworkUrl}
                  url={post.musicUrl}
                  duration={post.musicDuration}
                  audioLikes={post.musicLikesCount ?? 0}
                  postId={post.id}
                  glassmorphism
                />
              </div>
            ) : (
              <>
                {post.content && (
                  post.bgColor ? (
                    <div style={{
                      background: post.bgColor,
                      borderRadius: 12,
                      padding: "28px 20px",
                      margin: "8px 0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 160,
                      textAlign: "center",
                    }}>
                      <ExpandableText
                        text={post.content}
                        maxChars={220}
                        fontSize={18}
                        color="#ffffff"
                        lineHeight={1.5}
                        onMentionClick={name => {
                          apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {});
                        }}
                      />
                    </div>
                  ) : (
                    <div className="post-content">
                      <ExpandableText
                        text={post.content}
                        maxChars={220}
                        fontSize={15}
                        color="var(--fb-text)"
                        lineHeight={1.5}
                        onMentionClick={name => {
                          apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {});
                        }}
                      />
                    </div>
                  )
                )}
                {post.emoji && (
                  <div className="post-image-emoji" style={{ background: "var(--fb-bg)" }}>{post.emoji}</div>
                )}
                {(post.imageUrl || post.thumbnailUrl) && (() => {
                  const mediaUrl = post.imageUrl ?? "";
                  const thumb    = post.thumbnailUrl;
                  const isVideo  = thumb != null || /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(mediaUrl);
                  if (isVideo) {
                    return (
                      <div
                        onClick={() => navigate(`/video/${post.id}`)}
                        style={{ position: "relative", cursor: "pointer", background: "#000", lineHeight: 0 }}
                      >
                        {thumb
                          ? <img src={thumb} alt="" style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }} />
                          : <div style={{ width: "100%", height: 260, background: "#111", display: "block" }} />
                        }
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <img
                      src={mediaUrl}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block", borderRadius: 0 }}
                    />
                  );
                })()}
                {/* ── Music player standalone ── */}
                {post.musicTrackName && (
                  <MusicPlayerWidget
                    trackName={post.musicTrackName}
                    artist={post.musicArtist}
                    artworkUrl={post.musicArtworkUrl}
                    url={post.musicUrl}
                    duration={post.musicDuration}
                    audioLikes={post.musicLikesCount ?? 0}
                    postId={post.id}
                  />
                )}
                {false && post.musicTrackName && (
                  <div style={{ margin: "10px 14px", background: "#F9FAFB", borderRadius: 12, padding: "10px", display: "flex", alignItems: "center", gap: 12, border: "1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: "#E5E7EB", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                      {post.musicArtworkUrl ? (
                        <img src={post.musicArtworkUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎵</div>
                      )}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.musicTrackName}</div>
                      <div style={{ fontSize: 13, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
                        {post.musicArtist}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--bp-primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#111" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E91E63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{post.musicLikesCount || 1}</span>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* ── Stats bar ── */}
            {(post.likes > 0 || (post.comments + postComments.length) > 0 || post.shares > 0) && (
              <div style={{ padding: "6px 14px 4px", display: "flex", alignItems: "center", gap: 12, fontSize: 13.5, color: "#9CA3AF" }}>
                {post.likes > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ display: "inline-flex", position: "relative", width: post.likes > 5 ? 36 : 22, height: 22, flexShrink: 0 }}>
                      <span style={{ position: "absolute", left: 0, fontSize: 17 }}>👍</span>
                      {post.likes > 5 && <span style={{ position: "absolute", left: 15, fontSize: 17 }}>❤️</span>}
                    </span>
                    <span style={{ marginLeft: post.likes > 5 ? 2 : 0 }}>{formatNumber(post.likes)}</span>
                  </div>
                )}
                {(post.comments + postComments.length) > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }} onClick={() => toggleComments(post.id)}>
                    <span style={{ fontSize: 15 }}>💬</span>
                    <span>{formatNumber(post.comments + postComments.length)}</span>
                  </div>
                )}
                {post.shares > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 15 }}>↗</span>
                    <span>{formatNumber(post.shares)}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Action bar ── */}
            <div style={{ display: "flex", borderTop: "1px solid rgba(0,0,0,0.07)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "relative" }}>
              {/* Reaction picker backdrop */}
              {showReactionPicker === post.id && (
                <div style={{ position: "fixed", inset: 0, zIndex: 98 }} onClick={() => setShowReactionPicker(null)} />
              )}
              {/* Reaction picker popup */}
              {showReactionPicker === post.id && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 8px)", left: 4, zIndex: 99,
                  background: "#132a1f", borderRadius: 30, padding: "8px 14px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
                  display: "flex", gap: 8, alignItems: "flex-end",
                }}>
                  {REACTIONS.map(r => (
                    <div
                      key={r.id}
                      onClick={() => selectReaction(post.id, r.id, post.liked)}
                      style={{ textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
                    >
                      <div
                        style={{ fontSize: 28, lineHeight: 1, transition: "transform 0.12s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.35) translateY(-4px)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                      >{r.emoji}</div>
                      <div style={{ fontSize: 10, color: r.color, fontWeight: 700, whiteSpace: "nowrap" }}>{r.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* J'aime */}
              {(() => {
                const rx = REACTIONS.find(r => r.id === (reactionType[post.id] ?? "like")) ?? REACTIONS[0];
                const liked = post.liked;
                return (
                  <button
                    className={`post-btn${likeAnimating === post.id ? " bp-like-pulse" : ""}`}
                    style={{ flex: 1, borderRight: "1px solid rgba(0,0,0,0.07)", color: liked ? rx.color : "#6B7280", fontWeight: liked ? 700 : 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 4px", transition: "color 0.2s" }}
                    onClick={() => quickLike(post.id, liked)}
                    onMouseDown={() => startReactionTimer(post.id)}
                    onMouseUp={cancelReactionTimer}
                    onMouseLeave={cancelReactionTimer}
                    onTouchStart={() => startReactionTimer(post.id)}
                    onTouchEnd={cancelReactionTimer}
                    onTouchMove={cancelReactionTimer}
                  >
                    {liked
                      ? <span style={{ fontSize: 17 }}>{rx.emoji}</span>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    }
                    {liked ? rx.label : "J'aime"}
                  </button>
                );
              })()}

              {/* Commenter */}
              <button className="post-btn" style={{ flex: 1, borderRight: "1px solid rgba(0,0,0,0.07)", color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 4px" }} onClick={() => navigate(`/post/${post.id}`)}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Commenter
              </button>

              {/* Partager */}
              <button className="post-btn" style={{ flex: 1, color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 4px" }} onClick={() => handleShare(post.id)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Partager
              </button>
            </div>

            {/* ── Comment section ── */}
            {showComments === post.id && (() => {
              const topLevel = postComments.filter(c => !c.parentId);
              const replies  = postComments.filter(c => c.parentId);
              return (
                <div style={{ background: "var(--fb-white)" }}>
                  {/* Sort selector */}
                  {topLevel.length > 1 && (
                    <div style={{ padding: "8px 14px 2px" }}>
                      <button style={{ background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "#f0f0f0", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                        Plus pertinents <span style={{ fontSize: 10 }}>▼</span>
                      </button>
                    </div>
                  )}

                  {/* Empty state */}
                  {topLevel.length === 0 && (
                    <div style={{ textAlign: "center", padding: "14px 14px 6px", color: "#9CA3AF", fontSize: 13 }}>
                      Soyez le premier à commenter 💬
                    </div>
                  )}

                  {/* Comment list */}
                  {topLevel.map(c => {
                    const cInitials = getInitials(`${c.authorFirstName} ${c.authorLastName}`);
                    const cReplies  = replies.filter(r => r.parentId === c.id);
                    return (
                      <div key={c.id} style={{ padding: "6px 12px 2px" }}>
                        {/* Comment row */}
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          {c.authorAvatarUrl
                            ? <img src={c.authorAvatarUrl} alt={cInitials} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            : <div className="avatar xs" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>{cInitials}</div>
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Bubble */}
                            <div style={{ display: "inline-block", background: "#132a1f", borderRadius: 18, padding: "8px 12px", maxWidth: "calc(100% - 32px)" }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#f0f0f0", marginBottom: 2 }}>{c.authorFirstName} {c.authorLastName}</div>
                              {c.audioUrl
                                ? <VoicePlayer url={c.audioUrl} duration={c.audioDuration} />
                                : <div style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.4 }}>{c.content}</div>
                              }
                            </div>
                            {/* Like count badge */}
                            {c.likesCount > 0 && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "#132a1f", borderRadius: 10, padding: "1px 5px 1px 3px", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", fontSize: 12, marginLeft: 4, verticalAlign: "middle" }}>
                                <span>❤️</span><span style={{ color: "#9CA3AF", fontWeight: 600 }}>{c.likesCount}</span>
                              </span>
                            )}
                            {/* Time · J'aime · Répondre · Supprimer */}
                            <div style={{ display: "flex", gap: 12, paddingLeft: 4, marginTop: 3, fontSize: 12, fontWeight: 600, color: "#9CA3AF", alignItems: "center" }}>
                              <span style={{ color: "#6b7280", fontWeight: 400 }}>{timeAgo(c.createdAt)}</span>
                              <button onClick={() => toggleCommentLike(post.id, c.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: c.likedByMe ? "var(--bp-primary)" : "#9CA3AF" }}>
                                J'aime
                              </button>
                              <button onClick={() => replyingTo === c.id ? cancelReply() : startReply(c, post.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: replyingTo === c.id ? "var(--bp-primary)" : "#9CA3AF" }}>
                                {replyingTo === c.id ? "Annuler" : "Répondre"}
                              </button>
                              {c.authorId === user.id && (
                                <button onClick={() => deleteComment(post.id, c.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#EF4444" }}>
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Replies */}
                        {cReplies.length > 0 && (
                          <div style={{ marginLeft: 42, marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
                            {cReplies.map(r => {
                              const rInitials = getInitials(`${r.authorFirstName} ${r.authorLastName}`);
                              return (
                                <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                                  {r.authorAvatarUrl
                                    ? <img src={r.authorAvatarUrl} alt={rInitials} style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                    : <div className="avatar xs" style={{ width: 26, height: 26, fontSize: 9, flexShrink: 0 }}>{rInitials}</div>
                                  }
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "inline-block", background: "#132a1f", borderRadius: 14, padding: "6px 10px", maxWidth: "100%" }}>
                                      <div style={{ fontWeight: 700, fontSize: 12, color: "#f0f0f0", marginBottom: 1 }}>{r.authorFirstName} {r.authorLastName}</div>
                                      <div style={{ fontSize: 13, color: "#e0e0e0" }}>{r.content}</div>
                                    </div>
                                    {r.likesCount > 0 && (
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 1, background: "#132a1f", borderRadius: 10, padding: "1px 4px 1px 2px", boxShadow: "0 1px 3px rgba(0,0,0,0.4)", fontSize: 11, marginLeft: 3, verticalAlign: "middle" }}>
                                        <span>❤️</span><span style={{ color: "#9CA3AF" }}>{r.likesCount}</span>
                                      </span>
                                    )}
                                    <div style={{ display: "flex", gap: 10, paddingLeft: 4, marginTop: 2, fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>
                                      <span style={{ color: "#6b7280", fontWeight: 400 }}>{timeAgo(r.createdAt)}</span>
                                      <button onClick={() => toggleCommentLike(post.id, r.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 700, color: r.likedByMe ? "var(--bp-primary)" : "#9CA3AF" }}>J'aime</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    );
                  })}

                  {/* ── Reply chip ── */}
                  {replyContextPostId === post.id && replyingTo !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px 2px", fontSize: 12, color: "#9CA3AF" }}>
                      <span>↩️ Répondre à</span>
                      <span style={{ fontWeight: 700, color: "var(--bp-primary)" }}>{replyContextName}</span>
                      <button
                        onClick={cancelReply}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 15, padding: "0 0 0 4px", lineHeight: 1, marginLeft: "auto" }}
                        aria-label="Annuler la réponse"
                      >✕</button>
                    </div>
                  )}

                  {/* ── Bottom comment input bar (Facebook style) ── */}
                  <div style={{ display: "flex", alignItems: voiceMode === post.id ? "flex-start" : "center", gap: 8, padding: "8px 12px 12px", borderTop: topLevel.length > 0 ? "1px solid rgba(34,197,94,0.15)" : "none", marginTop: 6 }}>
                    {voiceMode !== post.id && (
                      user.avatarUrl
                        ? <img src={user.avatarUrl} alt="moi" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        : <div className="avatar xs" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0, background: "var(--bp-primary)" }}>{userInitials}</div>
                    )}

                    {voiceMode === post.id ? (
                      <VoiceRecorder
                        onSend={(blob, dur) => submitVoiceComment(post.id, blob, dur)}
                        onCancel={() => setVoiceMode(null)}
                        disabled={submittingComment === post.id}
                      />
                    ) : (
                      <div style={{ flex: 1, background: "#132a1f", borderRadius: 22, display: "flex", alignItems: "center", padding: "0 6px 0 14px", gap: 4 }}>
                        <input
                          ref={el => { commentInputRef.current[post.id] = el; }}
                          style={{ flex: 1, background: "transparent", border: "none", padding: "9px 0", fontSize: 14, outline: "none", color: "#f0f0f0", minWidth: 0 }}
                          placeholder={replyContextPostId === post.id && replyingTo != null ? `Répondre à ${replyContextName.split(" ")[0]}…` : `Commenter en tant que ${(user.name ?? "").split(" ")[0]}…`}
                          value={newComment[post.id] ?? ""}
                          onChange={e => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter") submitComment(post.id); if (e.key === "Escape" && replyingTo) cancelReply(); }}
                          disabled={submittingComment === post.id}
                        />
                        {!(newComment[post.id] ?? "").trim() ? (
                          <div style={{ display: "flex", gap: 0, flexShrink: 0 }}>
                            {[{ icon: "🙂", key: "emoji" }, { icon: "GIF", key: "gif" }, { icon: "😊", key: "sticker" }].map(b => (
                              <button key={b.key} style={{ background: "none", border: "none", padding: "6px 6px", cursor: "pointer", fontSize: b.key === "gif" ? 10 : 16, fontWeight: b.key === "gif" ? 700 : 400, color: "#9CA3AF" }}>{b.icon}</button>
                            ))}
                            <VoiceRecorder
                              onSend={(blob, dur) => submitVoiceComment(post.id, blob, dur)}
                              onCancel={() => setVoiceMode(null)}
                              disabled={submittingComment === post.id}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => submitComment(post.id)}
                            disabled={submittingComment === post.id}
                            style={{ background: "none", border: "none", padding: "6px 8px", cursor: "pointer", color: "var(--bp-primary)", fontSize: 18, opacity: submittingComment === post.id ? 0.6 : 1, flexShrink: 0 }}
                          >➤</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* Empty state after hiding all */}
      {!postsLoading && visiblePosts.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--fb-text-secondary)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Aucune publication à afficher</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Revenez plus tard ou ajoutez des amis !</div>
        </div>
      )}


      <div style={{ textAlign: "center", padding: "20px 0", color: "var(--fb-text-secondary)", fontSize: 13 }}>
        Vous avez vu toutes les nouvelles publications ✓
      </div>

      {/* ── POST MENU BOTTOM SHEET ──────────────────────────── */}
      {openMenu && createPortal(
        <>
          <div onClick={closeMenu} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", zIndex:9000 }} />
          <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9001, background:"#0b1e16", borderRadius:"24px 24px 0 0", boxShadow:"0 -8px 40px rgba(0,0,0,0.6)", maxHeight:"90vh", overflowY:"auto", animation:"slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)" }}>
            <div style={{ display:"flex", justifyContent:"center", paddingTop:10, paddingBottom:6 }}>
              <div style={{ width:40, height:4, background:"rgba(34,197,94,0.2)", borderRadius:99 }} />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 18px 14px" }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:"var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {openMenu.authorName.slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14.5, color:"#f0f0f0" }}>{openMenu.authorName}</div>
                <div style={{ fontSize:12, color:"#9CA3AF" }}>{openMenu.isOwn ? "Votre publication" : "Publication"}</div>
              </div>
            </div>
            <div style={{ padding:"0 12px 34px", display:"flex", flexDirection:"column", gap:8 }}>
              {openMenu.isOwn ? (<>
                {/* OWN: edit + pin */}
                <div style={{ background:"#132a1f", borderRadius:18, overflow:"hidden" }}>
                  {([
                    { iconBg:"#1e3a2e", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label:"Modifier la publication", desc:"Modifiez le texte ou le contenu.", action:()=>{ navigate("/profile"); closeMenu(); } },
                    { iconBg: openMenu.isPinned ? "#3a2e1e" : "#1e3a2e", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={openMenu.isPinned?"#F59E0B":"var(--bp-primary)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label: openMenu.isPinned ? "Désépingler du profil" : "Épingler au profil", desc: openMenu.isPinned ? "Retirer l'épingle de votre profil." : "Afficher en haut de votre profil.", action:()=>handlePin(openMenu.postId, openMenu.isPinned) },
                  ] as const).map((item,i,arr)=>(
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom:i<arr.length-1?"1px solid rgba(34,197,94,0.12)":"none", textAlign:"left" }}>
                      <div style={{ width:42, height:42, borderRadius:"50%", background:item.iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:700, fontSize:15, color:"#f0f0f0" }}>{item.label}</div><div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>{item.desc}</div></div>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(200,230,210,0.5)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
                {/* OWN: share/stats/audience */}
                <div style={{ background:"#132a1f", borderRadius:18, overflow:"hidden" }}>
                  {([
                    { iconBg:"#1e3a2e", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0EA5E9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, label:"Partager", desc:"Envoyez cette publication à vos amis.", action:()=>handleShare(openMenu.postId) },
                    { iconBg:"#1e3a2e", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0EA5E9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, label:"Copier le lien", desc:"Copiez le lien de cette publication.", action:()=>handleCopyLink(openMenu.postId) },
                    { iconBg:"#1e3a2e", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, label:"Voir les statistiques", desc:"Vues, likes, portée et engagement.", action:()=>handleViewStats(openMenu.postId) },
                    { iconBg:"#1e3a2e", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0EA5E9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, label:"Modifier l'audience", desc:`Actuellement : ${openMenu.audience==="public"?"🌐 Public":openMenu.audience==="friends"?"👥 Amis":"🔒 Privé"}`, action:()=>{ setAudienceSheet({postId:openMenu.postId,current:openMenu.audience}); closeMenu(); } },
                  ] as const).map((item,i,arr)=>(
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom:i<arr.length-1?"1px solid rgba(34,197,94,0.12)":"none", textAlign:"left" }}>
                      <div style={{ width:42, height:42, borderRadius:"50%", background:item.iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:700, fontSize:15, color:"#f0f0f0" }}>{item.label}</div><div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>{item.desc}</div></div>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(200,230,210,0.5)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
                {/* OWN: comments/archive */}
                <div style={{ background:"#132a1f", borderRadius:18, overflow:"hidden" }}>
                  {([
                    { iconBg:"rgba(34,197,94,0.12)", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={openMenu.commentsDisabled?"var(--bp-primary)":"#9CA3AF"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label: openMenu.commentsDisabled?"Activer les commentaires":"Désactiver les commentaires", desc: openMenu.commentsDisabled?"Permettre à nouveau les commentaires.":"Empêcher les commentaires sur ce post.", action:()=>handleToggleComments(openMenu.postId, openMenu.commentsDisabled) },
                    { iconBg:"rgba(34,197,94,0.12)", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>, label:"Archiver la publication", desc:"Masquer sans supprimer définitivement.", action:()=>handleArchivePost(openMenu.postId) },
                  ] as const).map((item,i,arr)=>(
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom:i<arr.length-1?"1px solid rgba(34,197,94,0.12)":"none", textAlign:"left" }}>
                      <div style={{ width:42, height:42, borderRadius:"50%", background:item.iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:700, fontSize:15, color:"#f0f0f0" }}>{item.label}</div><div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>{item.desc}</div></div>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(200,230,210,0.5)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
                {/* OWN: delete danger */}
                <div style={{ background:"#FEE2E2", borderRadius:18, overflow:"hidden" }}>
                  <button onClick={()=>{ closeMenu(); setTimeout(()=>setConfirmAction({type:"delete",postId:openMenu.postId}),80); }} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", textAlign:"left" }}>
                    <div style={{ width:42, height:42, borderRadius:"50%", background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></div>
                    <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:700, fontSize:15, color:"#EF4444" }}>Supprimer la publication</div><div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>Cette action est irréversible.</div></div>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#FCA5A5" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </>) : (<>
                {/* OTHER: save/notif */}
                <div style={{ background:"#132a1f", borderRadius:18, overflow:"hidden" }}>
                  {([
                    { iconBg: savedPosts.has(openMenu.postId)?"#3a2e1e":"#1e3a2e", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={savedPosts.has(openMenu.postId)?"#F59E0B":"var(--bp-primary)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>, label: savedPosts.has(openMenu.postId)?"Retirer des enregistrements":"Enregistrer la publication", desc: savedPosts.has(openMenu.postId)?"Retirer de vos éléments enregistrés.":"Ajoutez ceci à vos éléments enregistrés.", action:()=>handleSave(openMenu.postId) },
                    { iconBg: notifPosts.has(openMenu.postId)?"rgba(34,197,94,0.12)":"#1e3a2e", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={notifPosts.has(openMenu.postId)?"#9CA3AF":"var(--bp-primary)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label: notifPosts.has(openMenu.postId)?"Désactiver les notifications":"Activer les notifications", desc:"Recevez des notifications pour cette publication.", action:()=>handleNotif(openMenu.postId) },
                  ] as const).map((item,i,arr)=>(
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom:i<arr.length-1?"1px solid rgba(34,197,94,0.12)":"none", textAlign:"left" }}>
                      <div style={{ width:42, height:42, borderRadius:"50%", background:item.iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:700, fontSize:15, color:"#f0f0f0" }}>{item.label}</div><div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>{item.desc}</div></div>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(200,230,210,0.5)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
                {/* OTHER: share/copy */}
                <div style={{ background:"#132a1f", borderRadius:18, overflow:"hidden" }}>
                  {([
                    { iconBg:"#1a2a3a", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0EA5E9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, label:"Partager la publication", desc:"Envoyez cette publication à vos amis.", action:()=>handleShare(openMenu.postId) },
                    { iconBg:"#1a2a3a", svg:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#0EA5E9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, label:"Copier le lien", desc:"Copiez le lien de cette publication.", action:()=>handleCopyLink(openMenu.postId) },
                  ] as const).map((item,i,arr)=>(
                    <button key={i} onClick={item.action} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", borderBottom:i<arr.length-1?"1px solid rgba(34,197,94,0.12)":"none", textAlign:"left" }}>
                      <div style={{ width:42, height:42, borderRadius:"50%", background:item.iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.svg}</div>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:700, fontSize:15, color:"#f0f0f0" }}>{item.label}</div><div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>{item.desc}</div></div>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(200,230,210,0.5)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
                {/* OTHER: hide */}
                <div style={{ background:"#132a1f", borderRadius:18, overflow:"hidden" }}>
                  <button onClick={()=>{ handleHide(openMenu.postId); apiHidePost(openMenu.postId).catch(()=>{}); }} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"13px 16px", textAlign:"left" }}>
                    <div style={{ width:42, height:42, borderRadius:"50%", background:"rgba(34,197,94,0.12)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:700, fontSize:15, color:"#f0f0f0" }}>Masquer cette publication</div><div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>Moins de publications comme celle-ci.</div></div>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(200,230,210,0.5)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </>)}
              <button onClick={closeMenu} style={{ width:"100%", background:"#132a1f", border:"none", borderRadius:18, padding:"15px", fontWeight:700, fontSize:16, color:"#9CA3AF", cursor:"pointer" }}>Annuler</button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ── CONFIRM DELETE / BLOCK ──────────────────────────── */}
      {confirmAction && createPortal(
        <>
          <div onClick={()=>setConfirmAction(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:9100 }} />
          <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9101, background:"#0b1e16", borderRadius:"24px 24px 0 0", padding:"20px 20px 34px", animation:"slideUpSheet 0.22s cubic-bezier(0.32,0.72,0,1)" }}>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"#3a1a1a", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {confirmAction.type==="delete"
                  ? <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  : <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                }
              </div>
            </div>
            <div style={{ fontWeight:800, fontSize:18, color:"#f0f0f0", textAlign:"center", marginBottom:8 }}>
              {confirmAction.type==="delete" ? "Supprimer la publication ?" : `Bloquer ${confirmAction.authorName} ?`}
            </div>
            <div style={{ fontSize:14, color:"#9CA3AF", textAlign:"center", marginBottom:24, lineHeight:1.5 }}>
              {confirmAction.type==="delete"
                ? "Cette action est définitive et ne peut pas être annulée."
                : `${confirmAction.authorName} ne pourra plus vous voir ni vous contacter.`}
            </div>
            <button onClick={()=>{
              if (confirmAction.type==="delete" && confirmAction.postId!=null) {
                apiDeletePost(confirmAction.postId).catch(()=>{});
                setLocalDeleted(prev=>new Set([...prev,confirmAction.postId!]));
                showToast("🗑️ Publication supprimée");
              } else if (confirmAction.type==="block" && confirmAction.authorId!=null) {
                apiBlockUser(confirmAction.authorId).catch(()=>{});
                showToast(`🚫 ${confirmAction.authorName} bloqué(e)`);
              }
              setConfirmAction(null);
            }} style={{ width:"100%", background:"#EF4444", color:"#fff", border:"none", borderRadius:14, padding:"15px", fontWeight:700, fontSize:16, cursor:"pointer", marginBottom:10 }}>
              {confirmAction.type==="delete" ? "Supprimer" : "Bloquer"}
            </button>
            <button onClick={()=>setConfirmAction(null)} style={{ width:"100%", background:"#132a1f", color:"#9CA3AF", border:"none", borderRadius:14, padding:"14px", fontWeight:700, fontSize:15, cursor:"pointer" }}>
              Annuler
            </button>
          </div>
        </>,
        document.body
      )}

      {/* ── REPORT SHEET ──────────────────────────────────── */}
      {reportSheet && createPortal(
        <>
          <div onClick={()=>setReportSheet(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", zIndex:9200 }} />
          <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9201, background:"#0b1e16", borderRadius:"24px 24px 0 0", padding:"14px 14px 34px", animation:"slideUpSheet 0.22s cubic-bezier(0.32,0.72,0,1)" }}>
            <div style={{ display:"flex", justifyContent:"center", paddingBottom:12 }}><div style={{ width:40, height:4, background:"rgba(34,197,94,0.2)", borderRadius:99 }} /></div>
            <div style={{ fontWeight:800, fontSize:17, color:"#f0f0f0", marginBottom:4, paddingLeft:4 }}>Signaler la publication</div>
            <div style={{ fontSize:13, color:"#9CA3AF", marginBottom:14, paddingLeft:4 }}>Pourquoi signalez-vous cette publication ?</div>
            <div style={{ background:"#132a1f", borderRadius:18, overflow:"hidden", marginBottom:12 }}>
              {["Spam ou publicité","Arnaque ou escroquerie","Harcèlement ou intimidation","Contenu inapproprié","Fausse information","Violence ou danger","Autre"].map((reason,i,arr)=>(
                <button key={i} onClick={()=>{
                  apiReportPost(reportSheet.postId, reason).catch(()=>{});
                  showToast("🚩 Signalement envoyé — merci !");
                  setReportSheet(null);
                }} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", textAlign:"left", padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid rgba(34,197,94,0.12)":"none", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:15, fontWeight:500, color:"#f0f0f0" }}>{reason}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="rgba(200,230,210,0.5)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>
            <button onClick={()=>setReportSheet(null)} style={{ width:"100%", background:"#132a1f", border:"none", borderRadius:14, padding:"14px", fontWeight:700, fontSize:15, color:"#9CA3AF", cursor:"pointer" }}>Annuler</button>
          </div>
        </>,
        document.body
      )}

      {/* ── STATS MODAL ───────────────────────────────────── */}
      {statsModal && createPortal(
        <>
          <div onClick={()=>setStatsModal(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", zIndex:9300 }} />
          <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9301, background:"#0b1e16", borderRadius:"24px 24px 0 0", padding:"14px 14px 34px", animation:"slideUpSheet 0.22s cubic-bezier(0.32,0.72,0,1)" }}>
            <div style={{ display:"flex", justifyContent:"center", paddingBottom:12 }}><div style={{ width:40, height:4, background:"rgba(34,197,94,0.2)", borderRadius:99 }} /></div>
            <div style={{ fontWeight:800, fontSize:17, color:"#f0f0f0", marginBottom:16, paddingLeft:4 }}>📊 Statistiques</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
              {([
                {label:"Vues",value:statsModal.stats.views,icon:"👁️"},
                {label:"Likes",value:statsModal.stats.likes,icon:"❤️"},
                {label:"Commentaires",value:statsModal.stats.comments,icon:"💬"},
                {label:"Partages",value:statsModal.stats.shares,icon:"📤"},
                {label:"Enregistrements",value:statsModal.stats.saves,icon:"🔖"},
                {label:"Portée",value:statsModal.stats.reach,icon:"📡"},
              ] as const).map(s=>(
                <div key={s.label} style={{ background:"#132a1f", borderRadius:14, padding:"12px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontWeight:800, fontSize:17, color:"#f0f0f0" }}>{typeof s.value==="number"?(s.value as number).toLocaleString("fr"):String(s.value??0)}</div>
                  <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#1e3a2e", borderRadius:14, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:22 }}>📈</span>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#4ade80" }}>Taux d'engagement</div>
                <div style={{ fontSize:16, fontWeight:800, color:"var(--bp-primary)" }}>{String(statsModal.stats.engagement??"0%")}</div>
              </div>
            </div>
            <button onClick={()=>setStatsModal(null)} style={{ width:"100%", background:"#132a1f", border:"none", borderRadius:14, padding:"14px", fontWeight:700, fontSize:15, color:"#9CA3AF", cursor:"pointer" }}>Fermer</button>
          </div>
        </>,
        document.body
      )}

      {/* ── AUDIENCE SHEET ────────────────────────────────── */}
      {audienceSheet && createPortal(
        <>
          <div onClick={()=>setAudienceSheet(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", zIndex:9400 }} />
          <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9401, background:"#0b1e16", borderRadius:"24px 24px 0 0", padding:"14px 14px 34px", animation:"slideUpSheet 0.22s cubic-bezier(0.32,0.72,0,1)" }}>
            <div style={{ display:"flex", justifyContent:"center", paddingBottom:12 }}><div style={{ width:40, height:4, background:"rgba(34,197,94,0.2)", borderRadius:99 }} /></div>
            <div style={{ fontWeight:800, fontSize:17, color:"#f0f0f0", marginBottom:4, paddingLeft:4 }}>Modifier l'audience</div>
            <div style={{ fontSize:13, color:"#9CA3AF", marginBottom:14, paddingLeft:4 }}>Qui peut voir cette publication ?</div>
            <div style={{ background:"#132a1f", borderRadius:18, overflow:"hidden", marginBottom:14 }}>
              {([
                {value:"public",icon:"🌐",label:"Public",desc:"Tout le monde peut voir cette publication"},
                {value:"friends",icon:"👥",label:"Amis",desc:"Seulement vos amis peuvent la voir"},
                {value:"private",icon:"🔒",label:"Privé",desc:"Seulement vous pouvez la voir"},
              ] as const).map((opt,i,arr)=>(
                <button key={opt.value} onClick={()=>handleAudienceChange(audienceSheet.postId, opt.value)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid rgba(34,197,94,0.12)":"none", textAlign:"left" }}>
                  <div style={{ width:42, height:42, borderRadius:"50%", background:audienceSheet.current===opt.value?"#1e3a2e":"rgba(34,197,94,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{opt.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}><div style={{ fontWeight:700, fontSize:15, color:"#f0f0f0" }}>{opt.label}</div><div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>{opt.desc}</div></div>
                  {audienceSheet.current===opt.value && <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
            </div>
            <button onClick={()=>setAudienceSheet(null)} style={{ width:"100%", background:"#132a1f", border:"none", borderRadius:14, padding:"14px", fontWeight:700, fontSize:15, color:"#9CA3AF", cursor:"pointer" }}>Annuler</button>
          </div>
        </>,
        document.body
      )}

      {/* ── TOAST ──────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "rgba(13,45,26,0.97)", color: "#e8f5e9", borderRadius: 22, padding: "10px 18px",
          fontSize: 13, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap",
          border: "1px solid rgba(34,197,94,0.3)",
          boxShadow: "0 4px 20px rgba(0,15,6,0.6)", maxWidth: "calc(100vw - 32px)",
          textAlign: "center", pointerEvents: "none",
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
