import { useState, useEffect, useRef, useCallback } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { BADGE_CONFIG, UserBadge } from "../components/UserBadge";
import { useNavigate } from "../router";
import { openImageViewer } from "../components/ImageViewer";
import ShareSheet, { type SharePost } from "../components/ShareSheet";
import {
  apiFetch,
  apiGetComments,
  apiPostComment,
  apiToggleCommentLike,
  apiPostVoiceComment,
  apiUploadVoice,
  apiSearchUsers,
  type PostComment,
} from "../lib/api";
import VoicePlayer from "../components/VoicePlayer";
import ExpandableText from "../components/ExpandableText";
import MusicPlayerWidget from "../components/MusicPlayerWidget";

/* ─── Reactions ─────────────────────────────────────────────── */
const REACTIONS = [
  {
    id: "like",  label: "J'aime",  color: "#1877F2", emoji: "👍",
    icon: (active: boolean) => active
      ? <span style={{ fontSize:20, lineHeight:1 }}>👍</span>
      : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12M15 5.88L14 10h5.83A2 2 0 0 1 21.83 12.49L19.04 19.5A2 2 0 0 1 17.12 21H7a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 .586-1.414L10 5H13a2 2 0 0 1 2 2v-.12z"/></svg>,
    badge: <span style={{ fontSize:11, lineHeight:1 }}>👍</span>,
  },
  {
    id: "adore", label: "J'adore", color: "#F43F5E", emoji: "❤️",
    icon: (active: boolean) => active
      ? <span style={{ fontSize:20, lineHeight:1 }}>❤️</span>
      : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    badge: <span style={{ fontSize:11, lineHeight:1 }}>❤️</span>,
  },
  {
    id: "top",   label: "Top",     color: "#F97316", emoji: "🔥",
    icon: (active: boolean) => active
      ? <span style={{ fontSize:20, lineHeight:1 }}>🔥</span>
      : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-6 6-6 11a6 6 0 0 0 12 0c0-5-6-11-6-11z"/></svg>,
    badge: <span style={{ fontSize:11, lineHeight:1 }}>🔥</span>,
  },
  {
    id: "bravo", label: "Bravo",   color: "#8B5CF6", emoji: "👏",
    icon: (active: boolean) => active
      ? <span style={{ fontSize:20, lineHeight:1 }}>👏</span>
      : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5l-2-2a2 2 0 0 0-2.828 2.828L8 19.657A8 8 0 0 0 20 12c0-4.418-3.582-8-8-8a8 8 0 0 0-3.5.804"/><path d="M7.5 10.5l4 4M10.5 7.5l4 4M13.5 4.5l4 4" strokeWidth="1.7"/></svg>,
    badge: <span style={{ fontSize:11, lineHeight:1 }}>👏</span>,
  },
];

const AVATAR_COLORS = ["var(--bp-primary-dark)","#0EA5E9","#8B5CF6","#D97706","#EF4444","#0EA5E9","var(--bp-primary)","#6366F1"];
function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name?: string) {
  if (!name) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "À l'instant";
  if (s < 3600)  return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}
function isVideo(url: string | null) {
  if (!url) return false;
  return /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(url);
}

/* ─── Avatar with green border + online dot ─────────────────── */
function Avatar({ url, name, size = 48, borderWidth = 3, online = false }: {
  url?: string | null; name?: string; size?: number; borderWidth?: number; online?: boolean;
}) {
  const initials = getInitials(name);
  const color    = avatarColor(name);
  const inner    = size - borderWidth * 2;
  return (
    <div style={{ position:"relative", flexShrink:0, width:size, height:size }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:"linear-gradient(135deg,var(--bp-primary) 0%,var(--bp-primary-dark) 50%,#BBF7D0 100%)", padding:borderWidth, boxSizing:"border-box" }}>
        <div style={{ width:inner, height:inner, borderRadius:"50%", overflow:"hidden", background:color, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:Math.round(inner * 0.33) }}>
          {url
            ? <img src={url} alt={initials} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : initials}
        </div>
      </div>
      {online && (
        <div style={{ position:"absolute", bottom:1, right:1, width:Math.round(size * 0.25), height:Math.round(size * 0.25), borderRadius:"50%", background:"var(--bp-primary)", border:`${borderWidth - 1}px solid #fff`, boxShadow:"0 0 6px rgba(34,197,94,0.6)" }} />
      )}
    </div>
  );
}

interface PostData {
  id: number; authorId: number; authorName: string;
  authorFirstName: string | null; authorLastName: string | null;
  authorAvatarUrl: string | null; content: string;
  imageUrl: string | null; thumbnailUrl: string | null;
  musicTrackName: string | null; musicArtist: string | null;
  musicUrl: string | null; musicArtworkUrl: string | null; musicDuration: string | null;
  musicLikesCount?: number | null;
  bgColor?: string | null;
  likesCount: number; commentsCount: number; createdAt: string; liked: boolean;
  authorBadgeType?: string | null;
  userReactionType?: string | null;
  reactionSummary?: { type: string; count: number }[];
}


interface Props { postId: number; }

export default function PostDetailPage({ postId }: Props) {
  const navigate = useNavigate();
  const user     = useCurrentUser();

  const [post, setPost]               = useState<PostData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [userReaction, setUserReaction]     = useState<string | null>(null);
  const [reactionSummary, setReactionSummary] = useState<{ type: string; count: number }[]>([]);
  const [reactionsTotal, setReactionsTotal] = useState(0);
  const [showReactions, setShowReactions]   = useState(false);
  const reactionTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saved, setSaved]             = useState(false);
  const [showShare, setShowShare]     = useState(false);
  const [comments, setComments]       = useState<PostComment[]>([]);
  const [newComment, setNewComment]   = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [replyingTo, setReplyingTo]   = useState<number | null>(null);
  const [replyName, setReplyName]     = useState("");
  const [voiceMode, setVoiceMode]       = useState(false);
  const [avatarSheet, setAvatarSheet]   = useState(false);
  const [avatarViewer, setAvatarViewer] = useState(false);
  const [isRecording, setIsRecording]   = useState(false);
  const [recSeconds, setRecSeconds]   = useState(0);
  const [recLocked, setRecLocked]     = useState(false);
  const [recPaused, setRecPaused]     = useState(false);
  const [recLiveBars, setRecLiveBars] = useState<number[]>(Array(28).fill(5));
  const [recDragX, setRecDragX]       = useState(0);
  const [recDragY, setRecDragY]       = useState(0);

  const [commentSearch, setCommentSearch] = useState("");
  const searchInputRef      = useRef<HTMLInputElement>(null);

  const inputRef            = useRef<HTMLInputElement>(null);
  const mediaRecorderRef    = useRef<MediaRecorder | null>(null);
  const audioChunksRef      = useRef<Blob[]>([]);
  const recTimerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecondsRef       = useRef(0);
  const recSecsAtStopRef    = useRef(0);
  const recAudioCtxRef      = useRef<AudioContext | null>(null);
  const recAnalyserRef      = useRef<AnalyserNode | null>(null);
  const recAnimFrameRef     = useRef<number>(0);
  const recCancelledRef     = useRef(false);
  const recDragStartRef     = useRef<{ x: number; y: number } | null>(null);
  const recIsDraggingRef    = useRef(false);

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recCancelledRef.current) { recCancelledRef.current = false; return; }
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const secs = recSecsAtStopRef.current || recSecondsRef.current || 1;
        if (blob.size < 1000) return;
        try {
          const { url } = await apiUploadVoice(blob, secs);
          const parentId = replyingTo ?? undefined;
          if (parentId) cancelReply();
          const c = await apiPostVoiceComment(postId, url, secs, parentId);
          setComments(prev => [...prev, c]);
        } catch { /* ignore upload error */ }
        setVoiceMode(false);
      };
      mr.start(100);
      mediaRecorderRef.current = mr;
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        ctx.createMediaStreamSource(stream).connect(analyser);
        recAudioCtxRef.current = ctx;
        recAnalyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const drawBars = () => {
          analyser.getByteFrequencyData(data);
          const step = Math.max(1, Math.floor(data.length / 28));
          const bars = Array.from({ length: 28 }, (_, i) =>
            Math.max(4, Math.round(((data[i * step] ?? 0) / 255) * 96))
          );
          setRecLiveBars(bars);
          recAnimFrameRef.current = requestAnimationFrame(drawBars);
        };
        recAnimFrameRef.current = requestAnimationFrame(drawBars);
      } catch { /* AudioContext unavailable */ }
      document.body.style.userSelect = "none";
      (document.body.style as any).webkitUserSelect = "none";
      setIsRecording(true);
      recSecondsRef.current = 0;
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => {
        recSecondsRef.current += 1;
        setRecSeconds(recSecondsRef.current);
      }, 1000);
    } catch {
      alert("Accès au microphone refusé.");
    }
  };

  const stopVoice = () => {
    recSecsAtStopRef.current = recSecondsRef.current;
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (recAnimFrameRef.current) { cancelAnimationFrame(recAnimFrameRef.current); recAnimFrameRef.current = 0; }
    recAudioCtxRef.current?.close();
    recAudioCtxRef.current = null;
    recAnalyserRef.current = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    document.body.style.userSelect = "";
    (document.body.style as any).webkitUserSelect = "";
    setIsRecording(false);
    setRecLocked(false);
    setRecDragX(0); setRecDragY(0);
    recSecondsRef.current = 0; setRecSeconds(0);
    setRecLiveBars(Array(28).fill(5));
  };

  const cancelVoice = () => {
    recCancelledRef.current = true;
    setRecPaused(false);
    stopVoice();
    setVoiceMode(false);
  };

  const pauseVoice = () => {
    try { mediaRecorderRef.current?.pause(); } catch { /* unsupported */ }
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    setRecPaused(true);
  };

  const resumeVoice = () => {
    try { mediaRecorderRef.current?.resume(); } catch { /* unsupported */ }
    recTimerRef.current = setInterval(() => {
      recSecondsRef.current += 1;
      setRecSeconds(recSecondsRef.current);
    }, 1000);
    setRecPaused(false);
  };

  useEffect(() => {
    apiFetch(`/posts/${postId}`).then(r => r.json()).then((data: PostData & { error?: string }) => {
      if (data.error) { setError(data.error); return; }
      setPost(data);
      setUserReaction(data.userReactionType ?? null);
      setReactionSummary(data.reactionSummary ?? []);
      setReactionsTotal(data.likesCount ?? 0);
    }).catch(() => setError("Impossible de charger cette publication.")).finally(() => setLoading(false));
  }, [postId]);

  const loadComments = useCallback(async () => {
    try { setComments(await apiGetComments(postId)); } catch { /* silent */ }
  }, [postId]);
  useEffect(() => { loadComments(); }, [loadComments]);

  const reactWith = (type: string | null) => {
    const wasActive = userReaction === type;
    const newType = wasActive ? null : type;
    const prevReaction = userReaction;
    const prevSummary = reactionSummary;
    const prevTotal = reactionsTotal;
    // Optimistic update
    setUserReaction(newType);
    if (wasActive) {
      setReactionSummary(prev => prev.map(r => r.type === type ? { ...r, count: r.count - 1 } : r).filter(r => r.count > 0));
      setReactionsTotal(t => Math.max(0, t - 1));
    } else if (userReaction) {
      setReactionSummary(prev => {
        const updated = prev.map(r => r.type === userReaction ? { ...r, count: r.count - 1 } : r).filter(r => r.count > 0);
        const exists = updated.find(r => r.type === type!);
        return exists
          ? updated.map(r => r.type === type ? { ...r, count: r.count + 1 } : r)
          : [...updated, { type: type!, count: 1 }].sort((a, b) => b.count - a.count);
      });
    } else {
      setReactionSummary(prev => {
        const exists = prev.find(r => r.type === type!);
        return exists
          ? prev.map(r => r.type === type ? { ...r, count: r.count + 1 } : r)
          : [...prev, { type: type!, count: 1 }].sort((a, b) => b.count - a.count);
      });
      setReactionsTotal(t => t + 1);
    }
    apiFetch(`/posts/${postId}/react`, { method:"POST", body:JSON.stringify({ reactionType: newType }) })
      .then(r => r.json()).then((data: { userReactionType: string | null; reactionSummary: { type: string; count: number }[]; likesCount: number }) => {
        setUserReaction(data.userReactionType ?? null);
        setReactionSummary(data.reactionSummary ?? []);
        setReactionsTotal(data.likesCount ?? 0);
      }).catch(() => {
        setUserReaction(prevReaction); setReactionSummary(prevSummary); setReactionsTotal(prevTotal);
      });
  };

  const startReactionTimer = () => { reactionTimer.current = setTimeout(() => setShowReactions(true), 500); };
  const cancelReactionTimer = () => { if (reactionTimer.current) { clearTimeout(reactionTimer.current); reactionTimer.current = null; } };
  const pickReaction = (id: string) => { setShowReactions(false); reactWith(id); };

  const startReply = (c: PostComment) => {
    setReplyingTo(c.id); setReplyName(`${c.authorFirstName} ${c.authorLastName}`);
    setNewComment(""); setTimeout(() => inputRef.current?.focus(), 80);
  };
  const cancelReply = () => { setReplyingTo(null); setReplyName(""); };

  const submit = async () => {
    const text = newComment.trim();
    if (!text || submitting) return;
    setSubmitting(true); setNewComment("");
    const parentId = replyingTo ?? undefined;
    if (parentId) cancelReply();
    try {
      const c = await apiPostComment(postId, text, parentId);
      setComments(prev => [...prev, c]);
    } catch { setNewComment(text); } finally { setSubmitting(false); }
  };

  const toggleCommentLike = async (commentId: number) => {
    setComments(prev => prev.map(c => c.id === commentId
      ? { ...c, likedByMe: !c.likedByMe, likesCount: c.likedByMe ? Math.max(0, c.likesCount - 1) : c.likesCount + 1 }
      : c
    ));
    try {
      const { liked: l, likesCount: lc } = await apiToggleCommentLike(postId, commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likedByMe: l, likesCount: lc } : c));
    } catch {
      setComments(prev => prev.map(c => c.id === commentId
        ? { ...c, likedByMe: !c.likedByMe, likesCount: c.likedByMe ? Math.max(0, c.likesCount - 1) : c.likesCount + 1 }
        : c
      ));
    }
  };

  const searchQ   = commentSearch.trim().toLowerCase();
  const isSearching = searchQ.length >= 2;

  const topLevel = comments.filter(c => {
    if (c.parentId) return false;
    if (!isSearching) return true;
    const name = [c.authorFirstName, c.authorLastName].filter(Boolean).join(" ").toLowerCase();
    const text = (c.content ?? "").toLowerCase();
    return name.includes(searchQ) || text.includes(searchQ);
  });
  const replies  = (pid: number) => comments.filter(c => c.parentId === pid);

  /** Highlight occurrences of `q` inside `text` */
  function Highlighted({ text, q }: { text: string; q: string }) {
    if (!q || q.length < 2) return <>{text}</>;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return <>{parts.map((p, i) =>
      p.toLowerCase() === q
        ? <mark key={i} style={{ background:"#DCFCE7", color:"#166534", borderRadius:3, padding:"0 1px" }}>{p}</mark>
        : p
    )}</>;
  }
  const activeReaction = REACTIONS.find(r => r.id === (userReaction ?? "like")) ?? REACTIONS[0];

  if (loading) return (
    <div style={{ background:"#F8FAFC", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes bp-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
        <div style={{ width:40, height:40, border:"3px solid #DCFCE7", borderTopColor:"var(--bp-primary)", borderRadius:"50%", animation:"bp-spin .7s linear infinite" }} />
        <span style={{ color:"#9CA3AF", fontSize:13, fontWeight:600 }}>Chargement...</span>
      </div>
    </div>
  );

  if (error || !post) return (
    <div style={{ background:"#F8FAFC", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:24 }}>
      <div style={{ width:64, height:64, borderRadius:20, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/></svg>
      </div>
      <p style={{ color:"#64748B", fontSize:15, textAlign:"center", margin:0 }}>{error ?? "Publication introuvable."}</p>
      <button onClick={() => navigate(-1)} style={{ background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", color:"#fff", border:"none", borderRadius:16, padding:"12px 28px", cursor:"pointer", fontWeight:700, fontSize:14, boxShadow:"0 4px 16px rgba(34,197,94,0.35)" }}>Retour</button>
    </div>
  );

  const authorName = post.authorFirstName ?? post.authorName.split(" ")[0];

  return (
    <div style={{ background:"#F8FAFC", minHeight:"100vh", display:"flex", flexDirection:"column", paddingBottom: voiceMode ? 224 : 84 }}>
      <style>{`
        @keyframes bp-spin  { to { transform: rotate(360deg) } }
        @keyframes bp-pop   { 0% { transform:scale(.7) translateY(8px);opacity:0 } 100% { transform:scale(1) translateY(0);opacity:1 } }
        @keyframes bp-like  { 0%,100% { transform:scale(1) } 35% { transform:scale(1.4) } }
        @keyframes bp-item  { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:translateY(0) } }
        @keyframes bp-bar   { 0% { opacity:.6 } 100% { opacity:1 } }
        .bp-cmnt-like { background:none;border:none;cursor:pointer;font-size:12px;font-weight:700;transition:color .12s;padding:0 }
        .bp-action    { flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:11px 4px;background:none;border:none;cursor:pointer;font-size:13px;font-weight:700;color:#64748B;transition:color .13s,background .13s;white-space:nowrap;min-width:0 }
        .bp-action:active { background:#F8FAFC }
        .bp-action-active { color:var(--bp-primary)!important }
        .bp-input-wrap:focus-within { border-color:var(--bp-primary)!important;box-shadow:none!important }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"rgba(247,249,251,0.92)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderBottom:"1px solid rgba(0,0,0,0.05)", display:"flex", alignItems:"center", padding:"12px 16px", gap:12 }}>
        <button
          onClick={() => { if (commentSearch) setCommentSearch(""); else window.history.back(); }}
          style={{ width:40, height:40, borderRadius:12, background:"#fff", border:"1px solid rgba(0,0,0,0.07)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", flexShrink:0 }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M20 12H4M10 6l-6 6 6 6" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {/* Champ de recherche toujours visible (maquette) */}
        <div style={{ flex:1, overflow:"hidden", position:"relative", display:"flex", alignItems:"center" }}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" style={{ position:"absolute", left:14, pointerEvents:"none" }}>
            <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchInputRef}
            value={commentSearch}
            onChange={e => setCommentSearch(e.target.value)}
            placeholder="Rechercher un commentaire..."
            style={{ width:"100%", background:"#fff", border:"1px solid rgba(0,0,0,0.07)", borderRadius:22, padding:"10px 14px 10px 40px", fontSize:13.5, fontWeight:500, color:"#111827", outline:"none", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}
          />
        </div>
        {/* Bouton filtre (deux curseurs) */}
        <button
          onClick={() => searchInputRef.current?.focus()}
          style={{ width:40, height:40, borderRadius:12, background:"#fff", border:"1px solid rgba(0,0,0,0.07)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", flexShrink:0 }}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="8" x2="20" y2="8"/><circle cx="9" cy="8" r="2.6" fill="#fff"/>
            <line x1="4" y1="16" x2="20" y2="16"/><circle cx="15" cy="16" r="2.6" fill="#fff"/>
          </svg>
        </button>
      </div>

      {/* ── POST CARD ───────────────────────────────────────────── */}
      <div style={{ background:"#fff", margin:"14px 14px 0", borderRadius:24, boxShadow:"0 4px 24px rgba(0,0,0,0.07)", overflow:"visible" }}>

        {/* Author row */}
        <div style={{ display:"flex", alignItems:"center", gap:13, padding:"16px 16px 12px" }}>
          {/* Clickable avatar */}
          <div role="button" style={{ cursor:"pointer", position:"relative", flexShrink:0 }} onClick={() => setAvatarSheet(true)}>
            <Avatar url={post.authorAvatarUrl} name={post.authorName} size={52} borderWidth={3} online />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            {/* Line 1: name + badge icon */}
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontWeight:900, fontSize:16.5, color:"#111827" }}>{post.authorName}</span>
              {post.authorBadgeType && <UserBadge type={post.authorBadgeType} />}
            </div>
            {/* Line 2: badge label pill + time + globe */}
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:3, flexWrap:"wrap" }}>
              {post.authorBadgeType && BADGE_CONFIG[post.authorBadgeType] && (
                <>
                  <span style={{
                    fontSize:11, fontWeight:700, color: BADGE_CONFIG[post.authorBadgeType].color,
                    background: BADGE_CONFIG[post.authorBadgeType].color + "18",
                    borderRadius:20, padding:"2px 9px", lineHeight:"16px",
                  }}>
                    {BADGE_CONFIG[post.authorBadgeType].label}
                  </span>
                  <span style={{ color:"#E5E7EB", fontSize:10 }}>·</span>
                </>
              )}
              <span style={{ fontSize:12, color:"#9CA3AF", fontWeight:500 }}>{timeAgo(post.createdAt)}</span>
              <span style={{ color:"#E5E7EB", fontSize:10 }}>·</span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="#9CA3AF"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              <span style={{ fontSize:12, color:"var(--bp-primary)", fontWeight:700 }}>Public</span>
            </div>
          </div>
          <button style={{ width:36, height:36, borderRadius:10, background:"#F8FAFC", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="#9CA3AF"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
          </button>
        </div>

        {/* Text content + Music player */}
        {(() => {
          const MUSIC_RE = /^[♪♫🎵🎶🎼]\s*(.+?)\s*[—–\-]\s*(.+)$/;
          const parsed = !post.musicTrackName && post.content ? post.content.match(MUSIC_RE) : null;
          const parsedLine = !post.musicTrackName && !parsed && post.content
            ? (post.content.split("\n").pop() ?? "").match(MUSIC_RE) : null;
          const trackName   = post.musicTrackName ?? (parsed?.[1]?.trim()) ?? (parsedLine?.[1]?.trim()) ?? null;
          const trackArtist = post.musicArtist ?? (parsed?.[2]?.trim()) ?? (parsedLine?.[2]?.trim()) ?? "Artiste inconnu";
          const caption     = parsedLine ? post.content!.split("\n").slice(0,-1).join("\n").trim() : null;
          const showContent = post.content && !parsed && !parsedLine;
          return (
            <>
              {/* ── bgColor + music : lecteur intégré dans le dégradé ── */}
              {post.bgColor && trackName ? (
                <div style={{ background: post.bgColor, borderRadius: 12, margin: "0 0 14px", overflow: "hidden" }}>
                  {post.content && (
                    <div style={{ padding: "32px 20px 20px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 120, textAlign: "center" }}>
                      <ExpandableText
                        text={post.content}
                        maxChars={300}
                        fontSize={20}
                        color="#ffffff"
                        lineHeight={1.5}
                        onMentionClick={name => { apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {}); }}
                      />
                    </div>
                  )}
                  <MusicPlayerWidget
                    trackName={trackName}
                    artist={trackArtist}
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
                  {showContent && (
                    <div style={{ padding: "0 16px 14px" }}>
                      <ExpandableText text={post.content!} maxChars={300} fontSize={15} color="#1E293B" lineHeight={1.65} onMentionClick={name => { apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {}); }} />
                    </div>
                  )}
                  {caption && (
                    <div style={{ padding: "0 16px 14px" }}>
                      <ExpandableText text={caption} maxChars={300} fontSize={15} color="#1E293B" lineHeight={1.65} onMentionClick={name => { apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {}); }} />
                    </div>
                  )}
                  {trackName && (
                    <MusicPlayerWidget
                      trackName={trackName}
                      artist={trackArtist}
                      artworkUrl={post.musicArtworkUrl}
                      url={post.musicUrl}
                      duration={post.musicDuration}
                      audioLikes={post.musicLikesCount ?? 0}
                      postId={post.id}
                    />
                  )}
                </>
              )}
            </>
          );
        })()}

        {/* Media image/video */}
        {post.imageUrl && (
          <div style={{ margin:"0 14px 14px", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.08)" }}>
            {isVideo(post.imageUrl)
              ? <video src={post.imageUrl} poster={post.thumbnailUrl ?? undefined} controls style={{ width:"100%", maxHeight:420, objectFit:"cover", display:"block", background:"#111827" }} />
              : <img src={post.imageUrl} alt="" onClick={() => openImageViewer(post.imageUrl!)}
                  style={{ width:"100%", maxHeight:480, objectFit:"cover", display:"block", cursor:"zoom-in" }} />
            }
          </div>
        )}

        {/* Reactions summary bar — only shows types actually in DB */}
        {reactionsTotal > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 16px 10px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {/* Stacked circles from real DB reaction types */}
              <div style={{ display:"flex" }}>
                {reactionSummary.slice(0, 3).map((rs, i) => {
                  const r = REACTIONS.find(rx => rx.id === rs.type);
                  if (!r) return null;
                  return (
                    <div key={rs.type} style={{ width:22, height:22, borderRadius:"50%", background:r.color, border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", marginLeft: i === 0 ? 0 : -7, zIndex: 3 - i, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" }}>
                      {r.badge}
                    </div>
                  );
                })}
              </div>
              <span style={{ fontSize:13, color:"#64748B", fontWeight:600 }}>
                {reactionsTotal} réaction{reactionsTotal > 1 ? "s" : ""}
              </span>
            </div>
            {/* Mini-avatar stack + chevron */}
            {comments.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ display:"flex" }}>
                  {comments.slice(0, 3).map((c, i) => {
                    const n = `${c.authorFirstName} ${c.authorLastName}`;
                    return (
                      <div key={c.id} style={{ width:24, height:24, borderRadius:"50%", marginLeft: i === 0 ? 0 : -8, border:"2px solid #fff", overflow:"hidden", background:avatarColor(n), display:"flex", alignItems:"center", justifyContent:"center", zIndex: 3 - i, flexShrink:0, boxShadow:"0 1px 3px rgba(0,0,0,0.1)" }}>
                        {c.authorAvatarUrl
                          ? <img src={c.authorAvatarUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : <span style={{ fontSize:8, fontWeight:800, color:"#fff" }}>{getInitials(n)}</span>
                        }
                      </div>
                    );
                  })}
                </div>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop:"1px solid #F1F5F9", margin:"0 14px" }} />

        {/* ── 4 Action buttons — pastilles séparées (maquette) ── */}
        <div style={{ display:"flex", position:"relative", gap:5, padding:"10px 8px 14px" }}>
          <style>{`
            .bp-pill { flex:1; display:flex; align-items:center; justify-content:center; gap:4px;
              padding:10px 2px; background:#fff; border:1px solid #EEF0F3; border-radius:22px;
              cursor:pointer; font-size:10.5px; font-weight:700; color:#64748B;
              box-shadow:0 1px 4px rgba(15,23,42,0.04); white-space:nowrap; min-width:0;
              transition:color .13s, background .13s; }
            .bp-pill:active { background:#F8FAFC }
          `}</style>

          {/* Reactions popup — Facebook-style 3D emoji bubbles */}
          {showReactions && (
            <div style={{ position:"absolute", bottom:"calc(100% + 10px)", left:0, background:"#fff", borderRadius:40, boxShadow:"0 8px 36px rgba(0,0,0,0.18)", padding:"12px 14px", display:"flex", gap:6, zIndex:200, animation:"bp-pop .2s cubic-bezier(.22,1,.36,1)", border:"1px solid rgba(0,0,0,0.06)" }}>
              <style>{`
                @keyframes bp-bubble-in { 0%{transform:scale(0) translateY(10px);opacity:0} 80%{transform:scale(1.12) translateY(-2px)} 100%{transform:scale(1) translateY(0);opacity:1} }
                .bp-rbubble { animation: bp-bubble-in .22s ease both; }
                .bp-rbubble:hover { transform: scale(1.28) translateY(-6px) !important; transition: transform .12s !important; }
                .bp-rbubble:active { transform: scale(0.92) !important; }
              `}</style>
              {REACTIONS.map((r, i) => (
                <button key={r.id} onClick={() => pickReaction(r.id)} title={r.label}
                  className="bp-rbubble"
                  style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", flexDirection:"column", alignItems:"center", gap:5, animationDelay:`${i * 0.04}s` }}
                >
                  {/* 3D sphere */}
                  <div style={{
                    width:54, height:54, borderRadius:"50%",
                    background: `radial-gradient(circle at 38% 32%, ${r.color}ff 0%, ${r.color}cc 45%, ${r.color}99 100%)`,
                    boxShadow: `0 6px 18px ${r.color}55, inset 0 -3px 6px rgba(0,0,0,0.18), inset 0 3px 8px rgba(255,255,255,0.38)`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:28,
                    outline: userReaction === r.id ? `3px solid ${r.color}` : "none",
                    outlineOffset: 2,
                    transition:"outline .1s",
                  }}>
                    {r.emoji}
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color: userReaction === r.id ? r.color : "#374151", whiteSpace:"nowrap" }}>{r.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* J'aime */}
          <button
            className="bp-pill"
            style={{ color: userReaction ? activeReaction.color : "#64748B", animation: userReaction ? "bp-like .3s ease" : undefined }}
            onClick={() => { cancelReactionTimer(); reactWith("like"); }}
            onMouseDown={startReactionTimer} onMouseUp={cancelReactionTimer}
            onTouchStart={startReactionTimer} onTouchEnd={cancelReactionTimer}
          >
            {userReaction
              ? activeReaction.icon(true)
              : <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--bp-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12M15 5.88L14 10h5.83A2 2 0 0 1 21.83 12.49L19.04 19.5A2 2 0 0 1 17.12 21H7a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 .586-1.414L10 5H13a2 2 0 0 1 2 2v-.12z"/></svg>}
            <span>
              {userReaction ? activeReaction.label : "J'aime"}
              {reactionsTotal > 0 ? ` ${reactionsTotal}` : ""}
            </span>
          </button>

          {/* Commenter */}
          <button className="bp-pill" onClick={() => inputRef.current?.focus()}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Commenter</span>
          </button>

          {/* Partager */}
          <button className="bp-pill" onClick={() => setShowShare(true)}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#64748B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>
            <span>Partager</span>
          </button>

          {/* Enregistrer */}
          <button className="bp-pill" onClick={() => setSaved(s => !s)} style={{ color: saved ? "var(--bp-primary)" : "#64748B" }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill={saved ? "var(--bp-primary)" : "none"} stroke={saved ? "var(--bp-primary)" : "#64748B"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      {/* ── COMMENTS CARD ───────────────────────────────────────── */}
      <div style={{ background:"#fff", margin:"12px 14px", borderRadius:24, boxShadow:"0 4px 24px rgba(0,0,0,0.07)", overflow:"hidden", padding:"4px 0 16px" }}>
        {/* En-tête Commentaires (maquette) */}
        <div style={{ padding:"14px 16px 2px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontWeight:900, fontSize:16.5, color:"#111827" }}>Commentaires</span>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span style={{ fontSize:13.5, fontWeight:800, color:"var(--bp-primary)" }}>{topLevel.length}</span>
            </div>
          </div>
          <button style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 0 8px", fontSize:12.5, fontWeight:700, color:"#64748B", display:"flex", alignItems:"center", gap:4 }}>
            Les plus récents
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#64748B"><path d="M7 10l5 5 5-5z"/></svg>
          </button>
        </div>

        <div style={{ padding:"4px 14px", display:"flex", flexDirection:"column", gap:12 }}>
          {topLevel.map((c, idx) => {
            const cName    = [c.authorFirstName, c.authorLastName].filter(Boolean).join(" ") || "Utilisateur";
            const cReplies = replies(c.id);
            return (
              <div key={c.id} style={{ animation:`bp-item .25s ${idx * 0.04}s both` }}>
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <Avatar url={c.authorAvatarUrl} name={cName} size={38} borderWidth={2} />
                  <div style={{ flex:1 }}>
                    <div style={{ position:"relative", display:"inline-block", maxWidth:"100%" }}>
                      <div style={{ background:"#F8FAFC", borderRadius:18, padding:"10px 14px", border:"1px solid rgba(0,0,0,0.04)" }}>
                        <div style={{ fontWeight:800, fontSize:13, color:"#111827", marginBottom:3 }}><Highlighted text={cName} q={isSearching ? searchQ : ""} /></div>
                        {c.audioUrl
                          ? <VoicePlayer url={c.audioUrl} duration={c.audioDuration} />
                          : <div style={{ fontSize:14, lineHeight:1.55 }}>{isSearching ? <Highlighted text={c.content ?? ""} q={searchQ} /> : <ExpandableText text={c.content ?? ""} maxChars={150} fontSize={14} color="#111827" lineHeight={1.55} onMentionClick={name => { apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {}); }} />}</div>
                        }
                      </div>
                      {c.likesCount > 0 && (
                        <div style={{ position:"absolute", bottom:-8, right:0, background:"#fff", borderRadius:12, padding:"2px 6px 2px 4px", boxShadow:"0 2px 8px rgba(0,0,0,0.12)", fontSize:11, display:"flex", alignItems:"center", gap:3, border:"1px solid #F1F5F9" }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="#F43F5E"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          <span style={{ color:"#64748B", fontWeight:700 }}>{c.likesCount}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display:"flex", gap:14, paddingLeft:6, marginTop:9, fontSize:12, alignItems:"center" }}>
                      <span style={{ color:"#9CA3AF", fontWeight:500 }}>{timeAgo(c.createdAt)}</span>
                      <button className="bp-cmnt-like" onClick={() => toggleCommentLike(c.id)} style={{ color: c.likedByMe ? "var(--bp-primary)" : "#9CA3AF" }}>J'aime</button>
                      <button className="bp-cmnt-like" onClick={() => replyingTo === c.id ? cancelReply() : startReply(c)} style={{ color: replyingTo === c.id ? "var(--bp-primary)" : "#9CA3AF" }}>
                        {replyingTo === c.id ? "Annuler" : "Répondre"}
                      </button>
                      <button className="bp-cmnt-like" onClick={() => toggleCommentLike(c.id)} style={{ marginLeft:"auto", display:"flex", alignItems:"center", paddingRight:4 }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill={c.likedByMe ? "#F43F5E" : "none"} stroke={c.likedByMe ? "#F43F5E" : "#9CA3AF"} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {cReplies.length > 0 && (
                  <div style={{ marginLeft:50, marginTop:8, display:"flex", flexDirection:"column", gap:8 }}>
                    {cReplies.map(r => {
                      const rName = [r.authorFirstName, r.authorLastName].filter(Boolean).join(" ") || "Utilisateur";
                      return (
                        <div key={r.id} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                          <Avatar url={r.authorAvatarUrl} name={rName} size={30} borderWidth={2} />
                          <div style={{ flex:1 }}>
                            <div style={{ display:"inline-block", background:"#F8FAFC", borderRadius:14, padding:"8px 12px", border:"1px solid rgba(0,0,0,0.04)", maxWidth:"100%" }}>
                              <div style={{ fontWeight:800, fontSize:12, color:"#111827", marginBottom:2 }}>{rName}</div>
                              <div style={{ fontSize:13 }}><ExpandableText text={r.content ?? ""} maxChars={150} fontSize={13} color="#111827" lineHeight={1.5} onMentionClick={name => { apiSearchUsers(name).then(u => { if (u[0]) navigate(`/user/${u[0].id}`); }).catch(() => {}); }} /></div>
                            </div>
                            <div style={{ display:"flex", gap:10, paddingLeft:4, marginTop:5, fontSize:11 }}>
                              <span style={{ color:"#E5E7EB" }}>{timeAgo(r.createdAt)}</span>
                              <button className="bp-cmnt-like" onClick={() => toggleCommentLike(r.id)} style={{ color: r.likedByMe ? "var(--bp-primary)" : "#9CA3AF" }}>J'aime</button>
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

          {topLevel.length === 0 && !loading && (
            <div style={{ textAlign:"center", padding:"24px 0 12px" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>
                {isSearching
                  ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#BBF7D0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                  : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#BBF7D0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                }
              </div>
              <p style={{ color:"#9CA3AF", fontSize:13, margin:0 }}>
                {isSearching ? `Aucun commentaire trouvé pour "${commentSearch.trim()}"` : "Soyez le premier à commenter"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── FIXED COMMENT BAR ───────────────────────────────────── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"rgba(247,249,251,0.95)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderTop:"1px solid rgba(0,0,0,0.06)", zIndex:40, boxShadow:"0 -4px 24px rgba(0,0,0,0.07)" }}>

        {replyingTo !== null && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px 4px", fontSize:12 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M9 15L3 9l6-6M3 9h12a6 6 0 0 1 0 12h-3"/></svg>
            <span style={{ color:"#9CA3AF" }}>Répondre à</span>
            <span style={{ fontWeight:800, color:"var(--bp-primary)" }}>{replyName}</span>
            <button onClick={cancelReply} style={{ background:"none", border:"none", cursor:"pointer", marginLeft:"auto", display:"flex", padding:2 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#E5E7EB" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}

        {/* ── LOCKED RECORDING — full capsule ── */}
        {isRecording && recLocked && (
          <div style={{ margin:"6px 14px 2px", display:"flex", alignItems:"center", gap:8,
            background:"rgba(255,255,255,0.97)",
            backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
            borderRadius:28, padding:"9px 10px 9px 12px",
            boxShadow:"0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)",
            border:"1px solid rgba(226,232,240,0.8)" }}>

            {/* Trash */}
            <button onClick={cancelVoice} style={{ width:40, height:40, borderRadius:"50%", border:"none",
              background:"#FEE2E2", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>

            {/* Timer + waveform */}
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, overflow:"hidden" }}>
              <div style={{ width:9, height:9, borderRadius:"50%", background:"#EF4444", flexShrink:0,
                animation: recPaused ? "none" : "fbl-rec-pulse 1s ease-in-out infinite",
                opacity: recPaused ? 0.4 : 1 }} />
              <span style={{ fontSize:15, fontWeight:800, color:"#EF4444", fontVariantNumeric:"tabular-nums", flexShrink:0, minWidth:44 }}>
                {`${Math.floor(recSeconds/60).toString().padStart(2,"0")}:${(recSeconds%60).toString().padStart(2,"0")}`}
              </span>
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:1.5, height:34 }}>
                {recLiveBars.map((h, i) => (
                  <div key={i} style={{ flex:1, borderRadius:2,
                    background: recPaused ? "#E5E7EB" : "var(--bp-primary)",
                    height: recPaused ? "30%" : `${h}%`,
                    transition:"height 0.07s ease",
                    opacity: recPaused ? 0.5 : 0.6 + Math.min(0.4, (h / 96) * 0.4) }} />
                ))}
              </div>
            </div>

            {/* Pause / Resume */}
            <button onClick={recPaused ? resumeVoice : pauseVoice}
              style={{ width:40, height:40, borderRadius:"50%", border:"none", flexShrink:0,
                background: recPaused ? "#EDE9FE" : "#F8FAFC", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
              {recPaused ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#64748B"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
              )}
            </button>

            {/* Send */}
            <button onClick={stopVoice}
              style={{ width:48, height:48, borderRadius:"50%", border:"none", flexShrink:0,
                background:"linear-gradient(135deg,var(--bp-primary) 0%,var(--bp-primary) 100%)",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", boxShadow:"0 4px 20px rgba(22,194,74,0.5)" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="#fff" stroke="none"/>
              </svg>
            </button>
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px 16px" }}>
          {/* Current user avatar */}
          <Avatar url={user.avatarUrl} name={user.name} size={40} borderWidth={2} online />

          {/* ── FLOATING GLASS PILL ── */}
          <div style={{ flex:1, alignItems:"center",
            background:"rgba(255,255,255,0.97)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            borderRadius:32, boxShadow:"0 4px 28px rgba(0,0,0,0.13), 0 1px 6px rgba(0,0,0,0.07)",
            padding:"6px 10px 6px 14px", minHeight:52,
            border:"1px solid rgba(255,255,255,0.85)", overflow:"visible", position:"relative",
            display: recLocked ? "none" : "flex" }}>

            {/* Unlocked recording: waveform inside pill */}
            {isRecording && !recLocked && (
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, overflow:"hidden", padding:"0 4px" }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:"#EF4444", flexShrink:0,
                  animation:"fbl-rec-pulse 1s ease-in-out infinite" }} />
                <span style={{ fontSize:15, fontWeight:800, color:"#EF4444", fontVariantNumeric:"tabular-nums", flexShrink:0, minWidth:44 }}>
                  {`${Math.floor(recSeconds/60).toString().padStart(2,"0")}:${(recSeconds%60).toString().padStart(2,"0")}`}
                </span>
                <div style={{ flex:1, display:"flex", alignItems:"center", gap:2, height:30, overflow:"hidden" }}>
                  {recLiveBars.map((h, i) => (
                    <div key={i} style={{ flex:1, borderRadius:2,
                      background:"var(--bp-primary)",
                      height:`${h}%`,
                      transition:"height 0.07s ease",
                      opacity: 0.6 + Math.min(0.4, (h / 96) * 0.4) }} />
                  ))}
                </div>
                {/* Cancel (X) */}
                <button onClick={cancelVoice}
                  style={{ background:"none", border:"none", cursor:"pointer", padding:"6px 8px", flexShrink:0, display:"flex", alignItems:"center" }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}

            {/* Normal: text input */}
            {!isRecording && (
              <>
                <input
                  ref={inputRef}
                  style={{ flex:1, background:"transparent", border:"none", padding:"11px 0", fontSize:14, outline:"none", color:"#1E293B", minWidth:0 }}
                  placeholder={replyingTo != null ? `Répondre à ${replyName.split(" ")[0]}…` : "Écrire un commentaire..."}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape" && replyingTo) cancelReply(); }}
                  disabled={submitting}
                />
                {!newComment.trim() && (
                  <div style={{ display:"flex", gap:0, flexShrink:0, alignItems:"center" }}>
                    <button style={{ background:"none", border:"none", padding:"7px 7px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                      <svg viewBox="0 0 24 24" width="21" height="21" fill="none"><circle cx="12" cy="12" r="10" stroke="#9CA3AF" strokeWidth="1.8"/><path d="M8.5 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM15.5 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" fill="#9CA3AF"/><path d="M8 15c.667 1.333 2 2 4 2s3.333-.667 4-2" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round"/></svg>
                    </button>
                    <button style={{ background:"none", border:"none", padding:"7px 5px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                      <div style={{ background:"#F1F5F9", borderRadius:5, padding:"2px 5px", fontSize:10, fontWeight:900, color:"#9CA3AF", letterSpacing:0.5 }}>GIF</div>
                    </button>
                    <button style={{ background:"none", border:"none", padding:"7px 7px", cursor:"pointer", display:"flex", alignItems:"center" }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    </button>
                  </div>
                )}
                {newComment.trim() && (
                  <button
                    onClick={submit}
                    disabled={submitting}
                    style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", opacity: submitting ? 0.6 : 1, boxShadow:"0 3px 12px rgba(34,197,94,0.45)", flexShrink:0, transition:"transform .1s,opacity .1s" }}
                    onMouseDown={e => (e.currentTarget.style.transform = "scale(.9)")}
                    onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── MIC BUTTON (with lock + drag gesture) ── */}
          {(() => {
            const LOCK_DIST = 110;
            const LOCK_RADIUS = 24;
            const isAtLock   = recDragY < -(LOCK_DIST - LOCK_RADIUS);
            const isNearLock = recDragY < -(LOCK_DIST - LOCK_RADIUS - 8);
            const micDy      = Math.max(-LOCK_DIST, recDragY);
            const visualDy   = micDy < -70 ? micDy + (micDy + 70) * 0.18 : micDy;
            const visualDx   = Math.max(-100, recDragX) * 0.35;
            const SIZE       = isRecording ? 56 : 52;
            return (
              <div style={{ position:"relative", flexShrink:0, width:SIZE, height:SIZE, overflow:"visible", display: recLocked ? "none" : "block" }}>

                {/* Lock icon above mic */}
                {isRecording && (
                  <div style={{
                    position:"absolute",
                    top: -(LOCK_DIST - SIZE/2 + 22),
                    left:"50%", transform:"translateX(-50%)",
                    width:44, height:44, borderRadius:"50%",
                    background: isAtLock ? "var(--bp-primary)" : isNearLock ? "#EDE9FE" : "#fff",
                    boxShadow: isAtLock
                      ? "0 0 0 8px rgba(34,197,94,0.18), 0 6px 24px rgba(34,197,94,0.45)"
                      : "0 6px 24px rgba(0,0,0,0.14)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"background 0.15s, box-shadow 0.15s",
                    pointerEvents:"none", zIndex:10,
                    animation:"fbl-fade-in 0.18s ease",
                  }}>
                    {isAtLock ? (
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <rect x="5" y="11" width="14" height="10" rx="2" fill="#fff"/>
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <rect x="5" y="11" width="14" height="10" rx="2" fill={isNearLock ? "var(--bp-primary)" : "#9CA3AF"}/>
                        <path d="M8 11V7a4 4 0 0 1 7-1.7" stroke={isNearLock ? "var(--bp-primary)" : "#9CA3AF"} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                )}

                {/* Mic button */}
                <button
                  onPointerDown={e => {
                    if (isRecording) return;
                    e.preventDefault();
                    document.body.style.userSelect = "none";
                    (document.body.style as any).webkitUserSelect = "none";
                    recDragStartRef.current = { x: e.clientX, y: e.clientY };
                    recIsDraggingRef.current = true;
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    setVoiceMode(true);
                    startVoice();
                  }}
                  onPointerMove={e => {
                    if (!recDragStartRef.current) return;
                    setRecDragX(Math.min(0, e.clientX - recDragStartRef.current.x));
                    setRecDragY(Math.min(0, e.clientY - recDragStartRef.current.y));
                  }}
                  onPointerUp={() => {
                    const dx = recDragX; const dy = recDragY;
                    setRecDragX(0); setRecDragY(0);
                    recDragStartRef.current = null;
                    recIsDraggingRef.current = false;
                    if (!isRecording) return;
                    if (dy < -(LOCK_DIST - LOCK_RADIUS)) { setRecLocked(true); }
                    else if (dx < -100) { cancelVoice(); }
                    else { stopVoice(); }
                  }}
                  onPointerCancel={() => {
                    setRecDragX(0); setRecDragY(0);
                    recDragStartRef.current = null;
                    recIsDraggingRef.current = false;
                    if (isRecording) stopVoice();
                  }}
                  onContextMenu={e => e.preventDefault()}
                  style={{
                    position:"absolute", top:0, left:0,
                    background:"linear-gradient(135deg,var(--bp-primary) 0%,#16a34a 100%)",
                    border:"none", borderRadius:"50%",
                    width:SIZE, height:SIZE,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    cursor:"pointer", touchAction:"none",
                    userSelect:"none", WebkitUserSelect:"none",
                    boxShadow: isRecording
                      ? "0 0 0 10px rgba(22,194,74,0.18), 0 4px 20px rgba(22,194,74,0.55)"
                      : "0 3px 12px rgba(22,194,74,0.45)",
                    transform: isRecording
                      ? `translateY(${visualDy}px) translateX(${visualDx}px)`
                      : "none",
                    transition: recIsDraggingRef.current
                      ? "box-shadow 0.1s, width 0.2s, height 0.2s"
                      : "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s, width 0.2s, height 0.2s",
                    zIndex:20,
                  }}>
                  <svg viewBox="0 0 24 24" width={isRecording ? 24 : 22} height={isRecording ? 24 : 22}
                    fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Avatar Bottom Sheet ──────────────────────────────────────── */}
      {avatarSheet && (
        <div
          onClick={() => setAvatarSheet(false)}
          style={{
            position:"fixed", inset:0, zIndex:9998,
            background:"rgba(0,0,0,0.45)",
            animation:"fadeIn 0.18s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position:"absolute", bottom:0, left:0, right:0,
              background:"#fff",
              borderRadius:"24px 24px 0 0",
              padding:"0 0 max(20px,env(safe-area-inset-bottom))",
              animation:"slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Handle */}
            <div style={{ display:"flex", justifyContent:"center", paddingTop:12, paddingBottom:6 }}>
              <div style={{ width:40, height:4, borderRadius:9, background:"#E5E7EB" }} />
            </div>

            {/* Preview avatar */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 0 20px" }}>
              <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", border:"3px solid var(--bp-primary)", boxShadow:"0 4px 16px rgba(34,197,94,0.3)" }}>
                {post.authorAvatarUrl
                  ? <img src={post.authorAvatarUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:28, fontWeight:900, color:"#fff" }}>{post.authorName.charAt(0).toUpperCase()}</span>
                    </div>
                }
              </div>
              <div style={{ marginTop:10, fontWeight:800, fontSize:16, color:"#111827" }}>{post.authorName}</div>
              {post.authorBadgeType && BADGE_CONFIG[post.authorBadgeType] && (
                <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:5 }}>
                  <UserBadge type={post.authorBadgeType} />
                  <span style={{ fontSize:12, fontWeight:600, color: BADGE_CONFIG[post.authorBadgeType].color }}>
                    {BADGE_CONFIG[post.authorBadgeType].label}
                  </span>
                </div>
              )}
            </div>

            <div style={{ height:1, background:"#F3F4F6", margin:"0 16px" }} />

            {/* Actions */}
            <button
              onClick={() => { setAvatarSheet(false); setTimeout(() => setAvatarViewer(true), 100); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px 24px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
            >
              <div style={{ width:44, height:44, borderRadius:14, background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M2 12c2.5-5 5.5-8 10-8s7.5 3 10 8c-2.5 5-5.5 8-10 8S4.5 17 2 12z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>Voir la photo</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>Afficher la photo de profil en grand</div>
              </div>
            </button>

            <button
              onClick={() => { setAvatarSheet(false); navigate(`/profile/${post.authorId}`); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px 24px", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}
            >
              <div style={{ width:44, height:44, borderRadius:14, background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>Voir le profil</div>
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:1 }}>Accéder au profil complet</div>
              </div>
            </button>

            <div style={{ height:1, background:"#F3F4F6", margin:"8px 16px" }} />

            <button
              onClick={() => setAvatarSheet(false)}
              style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", padding:"16px 24px", background:"none", border:"none", cursor:"pointer" }}
            >
              <span style={{ fontWeight:700, fontSize:15, color:"#EF4444" }}>Annuler</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Avatar Fullscreen Viewer ──────────────────────────────────── */}
      {avatarViewer && (
        <div
          style={{
            position:"fixed", inset:0, zIndex:9999,
            background:"#000",
            display:"flex", flexDirection:"column",
            animation:"fadeIn 0.2s ease",
          }}
        >
          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 16px", paddingTop:"max(16px,env(safe-area-inset-top))", zIndex:1 }}>
            <button
              onClick={() => setAvatarViewer(false)}
              style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.12)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <span style={{ fontWeight:700, fontSize:15, color:"#fff" }}>{post.authorName}</span>
            <div style={{ display:"flex", gap:8 }}>
              {post.authorAvatarUrl && (
                <a
                  href={post.authorAvatarUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </a>
              )}
              <button
                onClick={() => navigator.share?.({ url: post.authorAvatarUrl ?? undefined, title: post.authorName }).catch(() => {})}
                style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.12)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>
          </div>

          {/* Photo centrée */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            {post.authorAvatarUrl ? (
              <img
                src={post.authorAvatarUrl}
                alt={post.authorName}
                style={{ maxWidth:"100%", maxHeight:"100%", borderRadius:12, objectFit:"contain", boxShadow:"0 8px 48px rgba(0,0,0,0.6)" }}
              />
            ) : (
              <div style={{ width:220, height:220, borderRadius:"50%", background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:88, fontWeight:900, color:"#fff" }}>{post.authorName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Bottom info */}
          <div style={{ padding:"16px 20px", paddingBottom:"max(20px,env(safe-area-inset-bottom))", textAlign:"center" }}>
            <div style={{ fontWeight:800, fontSize:17, color:"#fff" }}>{post.authorName}</div>
            {post.authorBadgeType && BADGE_CONFIG[post.authorBadgeType] && (
              <div style={{ marginTop:6, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <UserBadge type={post.authorBadgeType} />
                <span style={{ fontSize:13, fontWeight:600, color: BADGE_CONFIG[post.authorBadgeType].color }}>
                  {BADGE_CONFIG[post.authorBadgeType].label}
                </span>
              </div>
            )}
            <button
              onClick={() => { setAvatarViewer(false); navigate(`/profile/${post.authorId}`); }}
              style={{ marginTop:14, padding:"10px 28px", borderRadius:12, background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", border:"none", cursor:"pointer", fontWeight:700, fontSize:14, color:"#fff" }}
            >
              Voir le profil
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
      `}</style>

      {/* ── Share Sheet ── */}
      {post && (
        <ShareSheet
          open={showShare}
          post={{ id: post.id, authorName: post.authorFirstName ? `${post.authorFirstName} ${post.authorLastName ?? ""}`.trim() : "Auteur", content: post.content }}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
