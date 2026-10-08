import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "../router";
import { getBpToken } from "../lib/api";
import GiftPicker from "../components/GiftPicker";

interface PostData {
  id: number;
  authorId: number;
  authorName: string;
  authorFlag?: string;
  content: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  viewsCount?: number;
  createdAt?: string;
}

interface TopDonor {
  senderId: number;
  senderName: string;
  totalTokens: number;
  giftsCount: number;
}

interface FloatingGift {
  id: number;
  emoji: string;
  x: number;
  animationType: string;
}

interface Comment {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
  likesCount?: number;
}

interface Props {
  postId: number;
}

function isVideoUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(url);
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)  return "il y a quelques secondes";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function fmtCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n / 1000).toFixed(1).replace(".0","")}K`;
  return String(n);
}

/* ── Particle animations per gift type ── */
function GiftAnimation({ type, emoji }: { type: string; emoji: string }) {
  const count = type === "premium" ? 20 : 12;
  const items = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360;
    const dist  = 60 + Math.random() * 50;
    return {
      dx: Math.cos((angle * Math.PI) / 180) * dist,
      dy: Math.sin((angle * Math.PI) / 180) * dist,
      rot: Math.random() * 720,
      scale: 0.6 + Math.random() * 0.8,
      delay: Math.random() * 0.3,
    };
  });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
      {items.map((p, i) => (
        <div key={i} style={{
          position: "absolute", fontSize: 28,
          animation: `giftExplode 1.2s ${p.delay}s ease-out forwards`,
          ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`,
          ["--rot" as string]: `${p.rot}deg`, ["--sc" as string]: String(p.scale),
        }}>{emoji}</div>
      ))}
      <div style={{ fontSize: 80, animation: "giftBig 1.2s ease-out forwards", filter: "drop-shadow(0 0 30px rgba(22,194,74,0.9))" }}>{emoji}</div>
    </div>
  );
}

export default function VideoPostPage({ postId }: Props) {
  const navigate = useNavigate();
  const [post, setPost]                   = useState<PostData | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [tokenBalance, setTokenBalance]   = useState(0);
  const [topDonors, setTopDonors]         = useState<TopDonor[]>([]);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [floatingGifts, setFloatingGifts]  = useState<FloatingGift[]>([]);
  const [liked, setLiked]                 = useState(false);
  const [likesCount, setLikesCount]       = useState(0);
  const [comments, setComments]           = useState<Comment[]>([]);
  const [showComments, setShowComments]   = useState(false);
  const [commentText, setCommentText]     = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [showControls, setShowControls]   = useState(true);
  const [showDonors, setShowDonors]       = useState(false);
  const [activeAnim, setActiveAnim]       = useState<{ emoji: string; type: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const floatIdRef = useRef(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* load post */
  useEffect(() => {
    const token = getBpToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/posts/${postId}`, { headers })
      .then(r => r.json())
      .then((d: PostData & { error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setPost(d);
        setLikesCount(d.likesCount ?? 0);
      })
      .catch(() => setError("Impossible de charger cette publication."))
      .finally(() => setLoading(false));
  }, [postId]);

  /* token balance */
  useEffect(() => {
    const token = getBpToken();
    if (!token) return;
    fetch("/api/creator/wallet", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { tokenBalance?: number }) => { if (d.tokenBalance !== undefined) setTokenBalance(d.tokenBalance); })
      .catch(() => {});
  }, []);

  /* top donors */
  useEffect(() => {
    const load = () => {
      fetch(`/api/gifts/top-donors/video/${postId}`)
        .then(r => r.json())
        .then((d: TopDonor[]) => setTopDonors(Array.isArray(d) ? d.slice(0, 5) : []))
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [postId]);

  /* comments */
  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then(r => r.json())
      .then((d: Comment[]) => { if (Array.isArray(d)) setComments(d); })
      .catch(() => {});
  }, [postId]);

  const spawnFloat = (emoji: string, animationType = "default") => {
    const id = ++floatIdRef.current;
    const x  = 15 + Math.random() * 60;
    setFloatingGifts(prev => [...prev, { id, emoji, x, animationType }]);
    setActiveAnim({ emoji, type: animationType });
    setTimeout(() => setActiveAnim(null), 1500);
    setTimeout(() => setFloatingGifts(prev => prev.filter(g => g.id !== id)), 2500);
  };

  const handleVideoClick = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else          { v.pause(); setIsPlaying(false); }
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const handleLike = () => {
    setLiked(l => !l);
    setLikesCount(c => liked ? c - 1 : c + 1);
    const token = getBpToken();
    fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).catch(() => {});
  };

  const sendComment = async () => {
    const text = commentText.trim();
    if (!text || sendingComment) return;
    const token = getBpToken();
    if (!token) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const c = await res.json() as Comment;
        setComments(prev => [c, ...prev]);
        setCommentText("");
      }
    } catch { /* ignore */ } finally { setSendingComment(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000", color: "#fff" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "var(--bp-primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !post) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000", gap: 16 }}>
      <p style={{ color: "rgba(255,255,255,0.6)" }}>{error ?? "Publication introuvable."}</p>
      <button onClick={() => navigate("/")} style={{ padding: "10px 24px", borderRadius: 24, background: "var(--bp-primary)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>Retour</button>
    </div>
  );

  const isVideo = isVideoUrl(post.imageUrl);

  return (
    <div style={{ background: "#081C15", minHeight: "100vh", color: "#fff", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30, background: "linear-gradient(to bottom,rgba(0,0,0,0.7),transparent)", padding: "14px 16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 38, height: 38, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, border: "2px solid rgba(34,197,94,0.5)", flexShrink: 0 }}>
            {post.authorName.slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>{post.authorName} {post.authorFlag ?? ""}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--bp-primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Publié {timeAgo(post.createdAt)}</div>
          </div>
        </div>
        {/* Token badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", borderRadius: 20, padding: "5px 10px 5px 8px" }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#FBBF24"><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="11" fill="#000" fontWeight="bold">J</text></svg>
          <span style={{ fontWeight: 800, fontSize: 13, color: "#FBBF24" }}>{tokenBalance.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>jetons</span>
        </div>
        <button style={{ padding: "4px", background: "none", border: "none", cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="rgba(255,255,255,0.7)"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </button>
      </div>

      {/* ── Media area ── */}
      <div style={{ position: "relative", background: "#000", overflow: "hidden" }}>
        {post.imageUrl ? (
          isVideo ? (
            <div style={{ position: "relative" }} onClick={handleVideoClick}>
              <video
                ref={videoRef}
                src={post.imageUrl}
                playsInline
                poster={post.thumbnailUrl ?? undefined}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{ width: "100%", height: "72svh", minHeight: "56vw", objectFit: "contain", display: "block", background: "#000" }}
              />
              {/* Dark gradient overlay top/bottom */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom,rgba(0,0,0,0.5),transparent)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to top,rgba(0,0,0,0.5),transparent)", pointerEvents: "none" }} />
              {/* HD badge */}
              <div style={{ position: "absolute", top: 58, left: 12, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 800, color: "#fff", backdropFilter: "blur(4px)" }}>HD</div>
              {/* Play/pause overlay */}
              {showControls && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 56, pointerEvents: "none" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                  </div>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)", border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isPlaying
                      ? <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      : <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
                    }
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M18 6h-2v12h2zm-3.5 6L6 6v12z"/></svg>
                  </div>
                </div>
              )}
              {/* Floating gift animations */}
              {floatingGifts.map(g => (
                <div key={g.id} style={{ position: "absolute", bottom: 20, left: `${g.x}%`, fontSize: 40, pointerEvents: "none", zIndex: 10, animation: "vgiftFloat 2.5s ease-out forwards" }}>{g.emoji}</div>
              ))}
              {/* Big gift animation overlay */}
              {activeAnim && <GiftAnimation emoji={activeAnim.emoji} type={activeAnim.type} />}
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <img src={post.imageUrl} alt="" style={{ width: "100%", height: "72svh", objectFit: "contain", display: "block", background: "#000" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom,rgba(0,0,0,0.5),transparent)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to top,rgba(0,0,0,0.5),transparent)", pointerEvents: "none" }} />
              {floatingGifts.map(g => (
                <div key={g.id} style={{ position: "absolute", bottom: 20, left: `${g.x}%`, fontSize: 40, pointerEvents: "none", zIndex: 10, animation: "vgiftFloat 2.5s ease-out forwards" }}>{g.emoji}</div>
              ))}
              {activeAnim && <GiftAnimation emoji={activeAnim.emoji} type={activeAnim.type} />}
            </div>
          )
        ) : null}

        {/* ── Floating action buttons (right side) ── */}
        <div style={{ position: "absolute", right: 12, bottom: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, zIndex: 20 }}>
          {/* Like */}
          <button onClick={handleLike} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.15s" }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill={liked ? "#EC4899" : "#fff"}><path d={liked ? "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" : "M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"}/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: liked ? "#EC4899" : "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{fmtCount(likesCount)}</span>
          </button>
          {/* Comment */}
          <button onClick={() => setShowComments(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{fmtCount(post.commentsCount ?? comments.length)}</span>
          </button>
          {/* Share */}
          <button style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{fmtCount(post.sharesCount ?? 0)}</span>
          </button>
          {/* Gift */}
          <button onClick={() => setShowGiftPicker(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(22,194,74,0.5)" }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M20 6h-2.18c.07-.31.18-.59.18-.9C18 3.4 16.6 2 14.9 2c-.92 0-1.73.42-2.3 1.08L12 3.7l-.6-.62C10.83 2.42 10.02 2 9.1 2 7.4 2 6 3.4 6 5.1c0 .31.11.59.18.9H4c-1.11 0-2 .89-2 2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--bp-primary)", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{fmtCount(0)}</span>
          </button>
          {/* Donors toggle */}
          {topDonors.length > 0 && (
            <button onClick={() => setShowDonors(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: showDonors ? "rgba(255,215,0,0.3)" : "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="#FBBF24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.86 10.4 5 9.3 5 8zm14 0c0 1.3-.86 2.4-2 2.82V7h2v1z"/></svg>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#FBBF24", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>Top</span>
            </button>
          )}
        </div>

        {/* ── Author + caption overlay ── */}
        <div style={{ position: "absolute", left: 12, bottom: 16, right: 72, pointerEvents: "none" }}>
          {post.content && (
            <div style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", borderRadius: 12, padding: "8px 12px", fontSize: 14, lineHeight: 1.5, color: "#fff", marginBottom: 6, maxWidth: "100%" }}>
              {post.content}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ background: "#0F241D", padding: "14px 10px", display: "flex", gap: 6, borderBottom: "1px solid rgba(34,197,94,0.1)", borderTop: "1px solid rgba(34,197,94,0.1)" }}>
        {[
          { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill={liked ? "#EC4899" : "var(--bp-primary)"}><path d={liked ? "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" : "M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"}/></svg>, label: "J'aime", value: likesCount, accent: liked ? "#EC4899" : "#fff" },
          { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>, label: "Commentaires", value: post.commentsCount ?? 0, accent: "#fff" },
          { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>, label: "Partages", value: post.sharesCount ?? 0, accent: "#fff" },
          { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>, label: "Vues", value: post.viewsCount ?? 0, accent: "#fff" },
        ].map((s, i, arr) => (
          <div key={s.label} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1,
            padding: "8px 0",
            background: "rgba(34,197,94,0.05)",
            borderRadius: 12,
            borderRight: i < arr.length - 1 ? "1px solid rgba(34,197,94,0.1)" : "none",
          }}>
            {s.icon}
            <span style={{ fontWeight: 900, fontSize: 15, color: s.accent }}>{fmtCount(s.value)}</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Top donors panel (slide in) ── */}
      {showDonors && topDonors.length > 0 && (
        <div style={{ background: "#0F241D", borderBottom: "1px solid rgba(34,197,94,0.1)", padding: "14px 16px" }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#FBBF24", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#FBBF24"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V18H9v2h6v-2h-2v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.86 10.4 5 9.3 5 8zm14 0c0 1.3-.86 2.4-2 2.82V7h2v1z"/></svg>
            Top Donateurs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topDonors.map((d, i) => (
              <div key={d.senderId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{d.senderName || "Anonyme"}</span>
                <span style={{ fontSize: 12, color: "#FBBF24", fontWeight: 700 }}>🪙 {d.totalTokens.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Gift banner ── */}
      <div
        onClick={() => setShowGiftPicker(true)}
        style={{
          margin: "10px 12px",
          background: "linear-gradient(135deg,rgba(34,197,94,0.08) 0%,rgba(8,28,21,0.95) 100%)",
          border: "1.5px solid rgba(34,197,94,0.25)",
          borderRadius: 18,
          padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(34,197,94,0.1)",
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 16,
          background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 22px rgba(34,197,94,0.5), 0 4px 12px rgba(0,0,0,0.4)",
          flexShrink: 0,
        }}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M20 6h-2.18c.07-.31.18-.59.18-.9C18 3.4 16.6 2 14.9 2c-.92 0-1.73.42-2.3 1.08L12 3.7l-.6-.62C10.83 2.42 10.02 2 9.1 2 7.4 2 6 3.4 6 5.1c0 .31.11.59.18.9H4c-1.11 0-2 .89-2 2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>Envoyer un cadeau</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>à {post.authorName.split(" ")[0]} • Solde : <span style={{ color: "#FBBF24", fontWeight: 700 }}>{tokenBalance.toLocaleString()} jetons</span></div>
        </div>
        <div style={{
          background: "rgba(34,197,94,0.15)", border: "1.5px solid rgba(34,197,94,0.4)",
          borderRadius: 22, padding: "6px 14px",
          color: "var(--bp-primary)", fontWeight: 800, fontSize: 13,
          display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--bp-primary)"><path d="M20 6h-2.18c.07-.31.18-.59.18-.9C18 3.4 16.6 2 14.9 2c-.92 0-1.73.42-2.3 1.08L12 3.7l-.6-.62C10.83 2.42 10.02 2 9.1 2 7.4 2 6 3.4 6 5.1c0 .31.11.59.18.9H4c-1.11 0-2 .89-2 2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>
          Offrir
        </div>
      </div>

      {/* ── Comments section ── */}
      {showComments && (
        <div style={{ background: "#0F241D", borderTop: "1px solid rgba(34,197,94,0.1)" }}>
          <div style={{ padding: "12px 16px 8px", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
            Commentaires ({post.commentsCount ?? comments.length})
          </div>
          {/* Comment input */}
          <div style={{ display: "flex", gap: 8, padding: "0 16px 10px", alignItems: "center" }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendComment(); }}
              placeholder="Écrire un commentaire…"
              style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 22, padding: "9px 14px", fontSize: 14, color: "#fff", outline: "none" }}
            />
            <button
              onClick={sendComment}
              disabled={!commentText.trim() || sendingComment}
              style={{ background: commentText.trim() ? "var(--bp-primary)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", cursor: commentText.trim() ? "pointer" : "default", flexShrink: 0 }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
          {/* Comment list */}
          <div style={{ maxHeight: 260, overflowY: "auto", scrollbarWidth: "none" }}>
            {comments.slice(0, 20).map(c => (
              <div key={c.id} style={{ display: "flex", gap: 10, padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {c.authorName.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.authorName}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{c.content}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{timeAgo(c.createdAt)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="rgba(255,255,255,0.4)"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  {c.likesCount ?? 0}
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "24px 0", fontSize: 13 }}>Aucun commentaire. Sois le premier !</div>
            )}
          </div>
        </div>
      )}

      {/* ── GiftPicker Modal ── */}
      {showGiftPicker && (
        <GiftPicker
          streamId={postId}
          receiverId={post.authorId}
          receiverName={post.authorName}
          contextType="video"
          contextId={postId}
          tokenBalance={tokenBalance}
          onClose={() => setShowGiftPicker(false)}
          onSent={(gift, newBalance) => {
            setTokenBalance(newBalance);
            spawnFloat(gift.iconEmoji, gift.animationType);
          }}
          onBuyTokens={() => {
            setShowGiftPicker(false);
            navigate("/wallet?tab=jetons");
          }}
        />
      )}

      <style>{`
        @keyframes vgiftFloat {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          80%  { transform: translateY(-140px) scale(1.4); opacity: 0.9; }
          100% { transform: translateY(-200px) scale(0.7); opacity: 0; }
        }
        @keyframes giftExplode {
          0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx),var(--dy)) rotate(var(--rot)) scale(var(--sc)); opacity: 0; }
        }
        @keyframes giftBig {
          0%   { transform: scale(0); opacity: 1; }
          40%  { transform: scale(1.2); opacity: 1; }
          70%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
