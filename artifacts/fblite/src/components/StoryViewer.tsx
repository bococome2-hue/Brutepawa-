import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { apiViewStory, type StoryGroup, type StoryItem } from "../lib/api";

interface Props {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onAuthorClick?: (authorId: number) => void;
}

const STORY_DURATION = 5000;
const BG_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#D97706","#388E3C","#212121","#D32F2F","#00838F"];

function getInitials(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* ─── EQ bars animation ─────────────────────────────────────── */
const EQ_CSS = `
@keyframes bp-eq1 { 0%,100%{ height:4px } 33%{ height:16px } 66%{ height:8px } }
@keyframes bp-eq2 { 0%,100%{ height:12px } 33%{ height:4px } 66%{ height:18px } }
@keyframes bp-eq3 { 0%,100%{ height:8px } 33%{ height:16px } 66%{ height:4px } }
@keyframes bp-eq4 { 0%,100%{ height:16px } 33%{ height:6px } 66%{ height:12px } }
@keyframes bp-musicSlide {
  from { opacity:0; transform:translateY(20px) scale(.9); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
`;

function EqBars({ playing }: { playing: boolean }) {
  const bars = [
    { anim: "bp-eq1", dur: "0.55s", delay: "0s"    },
    { anim: "bp-eq2", dur: "0.70s", delay: "0.12s" },
    { anim: "bp-eq3", dur: "0.60s", delay: "0.05s" },
    { anim: "bp-eq4", dur: "0.75s", delay: "0.18s" },
  ];
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:20 }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            width: 3, borderRadius: 2,
            background: "var(--bp-primary)",
            height: playing ? undefined : 4,
            animation: playing ? `${b.anim} ${b.dur} ease-in-out ${b.delay} infinite` : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Music widget ──────────────────────────────────────────── */
function MusicWidget({ story, muted, onToggleMute }: {
  story: StoryItem;
  muted: boolean;
  onToggleMute: () => void;
}) {
  if (!story.musicTrackName) return null;
  return (
    <div
      onClick={e => { e.stopPropagation(); onToggleMute(); }}
      style={{
        position: "absolute",
        bottom: 200,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 12,
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(0,0,0,0.62)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 20,
        padding: "10px 14px",
        minWidth: 220, maxWidth: 280,
        cursor: "pointer",
        animation: "bp-musicSlide .4s cubic-bezier(.34,1.56,.64,1) both",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Album art or music icon */}
      {story.musicArtworkUrl
        ? (
          <img
            src={story.musicArtworkUrl}
            alt=""
            style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
          />
        )
        : (
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
        )
      }

      {/* Track info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: "#fff", fontWeight: 700, fontSize: 13,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {story.musicTrackName}
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 4, marginTop: 2,
        }}>
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/>
          </svg>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {story.musicArtist ?? ""}
          </span>
        </div>
      </div>

      {/* EQ bars / muted icon */}
      <div style={{ flexShrink: 0 }}>
        {muted
          ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          )
          : <EqBars playing />
        }
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────── */
export default function StoryViewer({ groups, initialGroupIndex, onClose, onAuthorClick }: Props) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress,  setProgress]  = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [replyText, setReplyText] = useState("");
  const [liked,     setLiked]     = useState(false);
  const [muted,     setMuted]     = useState(false);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef  = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const audioRef  = useRef<HTMLAudioElement | null>(null);

  const group = groups[groupIdx];
  const story: StoryItem | undefined = group?.stories[storyIdx];

  /* ── View tracking ── */
  useEffect(() => {
    if (!story) return;
    apiViewStory(story.id).catch(() => {});
  }, [story?.id]);

  /* ── Audio: load & play when story changes ── */
  useEffect(() => {
    // Teardown previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (!story?.musicUrl) return;

    const audio = new Audio(story.musicUrl);
    audio.loop   = true;
    audio.volume = muted ? 0 : 0.85;
    audioRef.current = audio;
    if (!paused) {
      audio.play().catch(() => {});
    }
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  /* ── Audio: respond to pause/resume ── */
  useEffect(() => {
    if (!audioRef.current) return;
    if (paused) {
      audioRef.current.pause();
    } else {
      audioRef.current.volume = muted ? 0 : 0.85;
      audioRef.current.play().catch(() => {});
    }
  }, [paused]);

  /* ── Audio: respond to mute toggle ── */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : 0.85;
    }
  }, [muted]);

  /* ── Stop audio on close ── */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /* ── Progress timer ── */
  const goNext = () => {
    if (storyIdx < (group?.stories.length ?? 0) - 1) {
      setStoryIdx(i => i + 1); setProgress(0); elapsedRef.current = 0;
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(i => i + 1); setStoryIdx(0); setProgress(0); elapsedRef.current = 0;
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1); setProgress(0); elapsedRef.current = 0;
    } else if (groupIdx > 0) {
      setGroupIdx(i => i - 1); setStoryIdx(0); setProgress(0); elapsedRef.current = 0;
    }
  };

  useEffect(() => {
    if (paused) { if (timerRef.current) clearInterval(timerRef.current); return; }
    startRef.current = Date.now() - elapsedRef.current;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);
      elapsedRef.current = elapsed;
      if (elapsed >= STORY_DURATION) goNext();
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groupIdx, storyIdx, paused]);

  if (!group || !story) return null;

  const authorInitials = getInitials(group.authorName);
  const authorBg = BG_COLORS[group.authorId % BG_COLORS.length];
  const storyCount = group.stories.length;

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200, background: "#000",
        display: "flex", flexDirection: "column",
        userSelect: "none", touchAction: "none",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
      onPointerDown={e => { if ((e.target as HTMLElement).closest("input,button,a") === null) setPaused(true); }}
      onPointerUp={()    => setPaused(false)}
      onPointerLeave={() => setPaused(false)}
    >
      <style>{EQ_CSS}</style>

      {/* ── PHOTO / BG ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: story.mediaUrl
          ? `url(${story.mediaUrl}) center/cover no-repeat`
          : (story.bgColor ?? authorBg),
      }} />

      {/* ── GRADIENT overlays ── */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:130, background:"linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(0,0,0,0) 100%)", pointerEvents:"none", zIndex:6 }} />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:160, background:"linear-gradient(to top,rgba(0,0,0,0.72) 0%,rgba(0,0,0,0) 100%)", pointerEvents:"none", zIndex:6 }} />

      {/* ── PROGRESS BARS ── */}
      <div style={{ position:"absolute",top:0,left:0,right:0,zIndex:10, display:"flex",gap:3,padding:"10px 10px 0" }}>
        {Array.from({ length: storyCount }).map((_, i) => (
          <div key={i} style={{ flex:1,height:3,borderRadius:2,background:"rgba(255,255,255,0.35)",overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:2, background:"var(--bp-primary)",
              width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
              transition: i === storyIdx ? "none" : undefined,
            }} />
          </div>
        ))}
      </div>

      {/* ── HEADER ── */}
      <div style={{ position:"absolute",top:20,left:0,right:0,zIndex:10, display:"flex",alignItems:"center",gap:10,padding:"12px 12px 0" }}>
        {/* Avatar */}
        <div
          onClick={e => { e.stopPropagation(); onAuthorClick?.(group.authorId); }}
          style={{ width:40,height:40,borderRadius:"50%",flexShrink:0, border:"2.5px solid var(--bp-primary)",overflow:"hidden", background:authorBg, display:"flex",alignItems:"center",justifyContent:"center", color:"#fff",fontWeight:700,fontSize:14, cursor:onAuthorClick?"pointer":"default" }}
        >
          {group.authorAvatarUrl
            ? <img src={group.authorAvatarUrl} alt={group.authorName} style={{ width:"100%",height:"100%",objectFit:"cover" }} />
            : authorInitials}
        </div>

        {/* Name + time */}
        <div style={{ flex:1,minWidth:0,cursor:onAuthorClick?"pointer":"default" }} onClick={e => { e.stopPropagation(); onAuthorClick?.(group.authorId); }}>
          <div style={{ display:"flex",alignItems:"center",gap:5 }}>
            <span style={{ color:"#fff",fontWeight:700,fontSize:14.5,textShadow:"0 1px 4px rgba(0,0,0,0.6)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>
              {group.authorName}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
              <circle cx="8" cy="8" r="8" fill="var(--bp-primary)"/>
              <path d="M4.5 8.5l2.2 2.2 4.5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ color:"rgba(255,255,255,0.78)",fontSize:12,marginTop:1 }}>
            {timeAgo(story.createdAt)}
          </div>
        </div>

        {/* ··· */}
        <button onClick={e => e.stopPropagation()} style={{ background:"none",border:"none",color:"#fff",cursor:"pointer",padding:"4px 6px",fontSize:18,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
            <circle cx="4"  cy="10" r="1.7"/>
            <circle cx="10" cy="10" r="1.7"/>
            <circle cx="16" cy="10" r="1.7"/>
          </svg>
        </button>

        {/* X */}
        <button onClick={e => { e.stopPropagation(); onClose(); }} style={{ background:"none",border:"none",color:"#fff",cursor:"pointer",padding:"4px",lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 4l14 14M18 4L4 18" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── STORY TEXT / EMOJI ── */}
      {(story.content || story.emoji) && (
        <div style={{ position:"absolute",top:110,left:0,right:0,zIndex:8,display:"flex",justifyContent:"flex-start",padding:"0 14px" }}>
          {story.emoji && (
            <span style={{ fontSize:28,marginRight:story.content?8:0,filter:"drop-shadow(0 1px 4px rgba(0,0,0,0.4))" }}>
              {story.emoji}
            </span>
          )}
          {story.content && (
            <span style={{ color:"#fff",fontWeight:700,fontSize:18,textShadow:"0 2px 8px rgba(0,0,0,0.8)", background:story.mediaUrl?"rgba(0,0,0,0.32)":"transparent", borderRadius:story.mediaUrl?10:0, padding:story.mediaUrl?"4px 10px":0 }}>
              {story.content}
            </span>
          )}
        </div>
      )}

      {/* ── MUSIC WIDGET (center) ── */}
      <MusicWidget story={story} muted={muted} onToggleMute={() => setMuted(v => !v)} />

      {/* ── VIEWS PILL ── */}
      <div style={{ position:"absolute",bottom:128,left:0,right:0,display:"flex",justifyContent:"center",zIndex:10,pointerEvents:"none" }}>
        <div style={{ background:"rgba(0,0,0,0.52)",borderRadius:20,padding:"6px 18px",display:"flex",alignItems:"center",gap:6,color:"#fff",fontSize:13,fontWeight:600,backdropFilter:"blur(4px)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1 8s2.8-5 7-5 7 5 7 5-2.8 5-7 5-7-5-7-5z" stroke="white" strokeWidth="1.4"/>
            <circle cx="8" cy="8" r="2.2" stroke="white" strokeWidth="1.4"/>
          </svg>
          {story.viewsCount} vue{story.viewsCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:10,padding:"10px 12px 20px",display:"flex",flexDirection:"column",gap:10 }}>
        {/* Reply row */}
        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
          <div onClick={e => e.stopPropagation()} style={{ width:38,height:38,borderRadius:"50%",flexShrink:0,border:"1.8px solid rgba(255,255,255,0.75)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 7.5C3 6.67 3.67 6 4.5 6h1.38L7 4h6l1.12 2H16.5c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-13C3.67 16 3 15.33 3 14.5v-7z" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4"/>
              <circle cx="10" cy="11" r="2.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4"/>
            </svg>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ flex:1,height:38,borderRadius:22,border:"1.5px solid rgba(255,255,255,0.5)",background:"rgba(0,0,0,0.28)",display:"flex",alignItems:"center",padding:"0 10px 0 14px",gap:6,backdropFilter:"blur(4px)" }}>
            <input
              type="text"
              className="bp-story-reply"
              placeholder="Répondre..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              style={{ flex:1,background:"none",border:"none",outline:"none",color:"#fff",fontSize:14,fontFamily:"inherit" }}
            />
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink:0,opacity:0.75 }}>
              <path d="M9 1v4M9 13v4M1 9h4M13 9h4M3.22 3.22l2.83 2.83M11.95 11.95l2.83 2.83M3.22 14.78l2.83-2.83M11.95 6.05l2.83-2.83" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-around" }}>
          <button onClick={e => { e.stopPropagation(); setLiked(v => !v); }} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#fff",padding:"4px 8px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill={liked?"var(--bp-primary)":"none"}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke={liked?"var(--bp-primary)":"rgba(255,255,255,0.9)"} strokeWidth="1.6"/>
            </svg>
            <span style={{ fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.9)" }}>J'aime</span>
          </button>

          <button onClick={e => e.stopPropagation()} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#fff",padding:"4px 8px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.9)" }}>Répondre</span>
          </button>

          <button onClick={e => e.stopPropagation()} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#fff",padding:"4px 8px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.9)" }}>Partager</span>
          </button>
        </div>
      </div>

      {/* ── TAP ZONES ── */}
      <div style={{ position:"absolute",inset:0,display:"flex",zIndex:5 }}>
        <div style={{ flex:1 }} onClick={e => { e.stopPropagation(); goPrev(); }} />
        <div style={{ flex:1 }} onClick={e => { e.stopPropagation(); goNext(); }} />
      </div>

      <style>{`.bp-story-reply::placeholder { color:rgba(255,255,255,0.62); }`}</style>
    </div>,
    document.body
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h} h`;
  return `Il y a ${Math.floor(h / 24)} j`;
}
