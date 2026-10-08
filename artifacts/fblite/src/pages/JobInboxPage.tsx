import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "../router";
import {
  apiGetConversations, apiGetMessages, apiSendMessage, apiGetUsers,
  apiGetUserPresence, type PublicUser,
} from "../lib/api";
import { useCallSignaling, type NewMessagePayload } from "../hooks/useCallSignaling";
import { useCurrentUser } from "../hooks/useCurrentUser";

/* ─── helpers ─────────────────────────────────────────────────── */
const COLORS = ["var(--bp-primary)","#EC4899","#8B5CF6","#D97706","#388E3C","#00838F","#D32F2F"];
const mkInitials = (n: string) => n.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0,2).toUpperCase() || "?";

function presLabel(online: boolean, lastSeenAt: string | null) {
  if (online) return "En ligne";
  if (!lastSeenAt) return "Hors ligne";
  const s = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
  if (s < 60)  return `Vu il y a ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `Vu il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Vu il y a ${h} h`;
  return `Vu il y a ${Math.floor(h / 24)} j`;
}

/* ─── types ────────────────────────────────────────────────────── */
interface TgMsg {
  id: number;
  text: string;
  mine: boolean;
  time: string;
  status: "sent" | "read";
  kind?: "photo" | "poll" | "doc" | "audio" | "location" | "cv" | "interview" | "job";
}

interface Conv {
  id: number;
  name: string;
  initials: string;
  color: string;
  jobTitle?: string;
  lastMessage: string;
  unread: number;
  time: string;
}

/* ─── attachment panel items ───────────────────────────────────── */
const ATTACH_ITEMS = [
  { icon: "📷", label: "Photo",     bg: "#E91E63", kind: "photo"     as const, text: "📷 Photo envoyée" },
  { icon: "📋", label: "CV",        bg: "var(--bp-primary)", kind: "cv"        as const, text: "📋 CV envoyé" },
  { icon: "📊", label: "Sondage",   bg: "#64748B", kind: "poll"      as const, text: "📊 Sondage : quel créneau ?" },
  { icon: "📅", label: "Entretien", bg: "#0EA5E9", kind: "interview" as const, text: "📅 Entretien proposé : demain 10h" },
  { icon: "📍", label: "Position",  bg: "#EF4444", kind: "location"  as const, text: "📍 Ma localisation" },
  { icon: "📄", label: "Document",  bg: "#9C27B0", kind: "doc"       as const, text: "📄 Document envoyé" },
  { icon: "🎵", label: "Audio",     bg: "#FF9800", kind: "audio"     as const, text: "🎵 Message vocal (0:12)" },
  { icon: "💼", label: "Offre",     bg: "var(--bp-primary)", kind: "job"       as const, text: "💼 Offre partagée" },
];

/* ─── kind icon / label ─────────────────────────────────────────── */
function kindIcon(k?: TgMsg["kind"]) {
  switch (k) {
    case "photo":     return "📷";
    case "poll":      return "📊";
    case "doc":       return "📄";
    case "audio":     return "🎵";
    case "location":  return "📍";
    case "cv":        return "📋";
    case "interview": return "📅";
    case "job":       return "💼";
    default:          return "";
  }
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
interface Props { initialUserId?: number; initialJobTitle?: string; }

export default function JobInboxPage({ initialUserId, initialJobTitle }: Props) {
  const navigate  = useNavigate();
  const meId      = useCurrentUser().id ?? 0;

  const [active,    setActive]    = useState<number | null>(initialUserId ?? null);
  const [msgs,      setMsgs]      = useState<Record<number, TgMsg[]>>({});
  const [convs,     setConvs]     = useState<Conv[]>([]);
  const [allUsers,  setAllUsers]  = useState<PublicUser[]>([]);
  const [draft,     setDraft]     = useState("");
  const [search,    setSearch]    = useState("");
  const [showAttach,setShowAttach]= useState(false);
  const [presence,  setPresence]  = useState<{ online: boolean; lastSeenAt: string | null }>({ online: false, lastSeenAt: null });
  const [tick,      setTick]      = useState(0);
  const [selMode,   setSelMode]   = useState(false);
  const [selMsgs,   setSelMsgs]   = useState<Set<number>>(new Set());
  const [showDel,   setShowDel]   = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const activeRef    = useRef<number | null>(null);
  const allUsersRef  = useRef<PublicUser[]>([]);
  const longTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remoteAudio  = useRef<HTMLAudioElement>(null);
  const localVideo   = useRef<HTMLVideoElement>(null);
  const remoteVideo  = useRef<HTMLVideoElement>(null);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { allUsersRef.current = allUsers; }, [allUsers]);

  /* ── WebRTC call signaling ──────────────────────────────────── */
  const onNewMsg = useCallback((data: NewMessagePayload) => {
    const fromId = data.fromUserId;
    const time   = new Date(data.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    const m: TgMsg = { id: data.id, text: data.content, mine: false, time, status: "sent" };
    setMsgs(p => ({ ...p, [fromId]: [...(p[fromId] ?? []), m] }));
    setConvs(p => {
      const ex = p.find(c => c.id === fromId);
      if (ex) return p.map(c => c.id === fromId ? { ...c, lastMessage: data.content, time, unread: activeRef.current === fromId ? 0 : c.unread + 1 } : c);
      const u = allUsersRef.current.find(x => x.id === fromId);
      const name = u ? `${u.firstName} ${u.lastName}` : `Utilisateur #${fromId}`;
      return [{ id: fromId, name, initials: mkInitials(name), color: COLORS[fromId % COLORS.length], lastMessage: data.content, unread: 1, time }, ...p];
    });
  }, []);

  const sig = useCallSignaling(meId, onNewMsg);

  /* ── stream → video/audio refs ─────────────────────────────── */
  useEffect(() => {
    const el = remoteAudio.current; if (!el) return;
    if (sig.remoteStream && sig.callType === "audio") { if (el.srcObject !== sig.remoteStream) { el.srcObject = sig.remoteStream; el.play().catch(() => {}); } }
    else { el.srcObject = null; }
  }, [sig.remoteStream, sig.callType]);

  useEffect(() => {
    const el = localVideo.current; if (!el) return;
    if (sig.localStream) { if (el.srcObject !== sig.localStream) { el.srcObject = sig.localStream; el.play().catch(() => {}); } }
    else { el.srcObject = null; }
  }, [sig.localStream]);

  useEffect(() => {
    const el = remoteVideo.current; if (!el) return;
    if (sig.remoteStream) { if (el.srcObject !== sig.remoteStream) { el.srcObject = sig.remoteStream; el.play().catch(() => {}); } }
    else { el.srcObject = null; }
  }, [sig.remoteStream]);

  /* ── load conversations + users ─────────────────────────────── */
  useEffect(() => {
    Promise.all([apiGetConversations(), apiGetUsers()]).then(([cs, users]) => {
      setAllUsers(users);
      const list: Conv[] = cs.map(c => {
        const u = users.find(x => x.id === c.userId);
        const name = u ? `${u.firstName} ${u.lastName}` : `Utilisateur #${c.userId}`;
        return { id: c.userId, name, initials: mkInitials(name), color: COLORS[c.userId % COLORS.length], lastMessage: c.lastMessage, unread: c.unreadCount, time: new Date(c.updatedAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }) };
      });
      if (initialUserId && !list.find(c => c.id === initialUserId)) {
        const u = users.find(x => x.id === initialUserId);
        if (u) {
          const name = `${u.firstName} ${u.lastName}`;
          list.unshift({ id: initialUserId, name, initials: mkInitials(name), color: COLORS[initialUserId % COLORS.length], jobTitle: initialJobTitle, lastMessage: "", unread: 0, time: "" });
        } else {
          list.unshift({ id: initialUserId, name: `Recruteur #${initialUserId}`, initials: "R", color: COLORS[initialUserId % COLORS.length], jobTitle: initialJobTitle, lastMessage: "", unread: 0, time: "" });
        }
      }
      setConvs(list);
    }).catch(() => {});
  }, []);

  /* ── load messages for active conv ─────────────────────────── */
  useEffect(() => {
    if (!active || msgs[active]) return;
    apiGetMessages(active).then(ms => {
      setMsgs(p => ({ ...p, [active]: ms.map(m => ({ id: m.id, text: m.content, mine: m.fromUserId === meId, time: new Date(m.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }), status: m.isRead ? "read" as const : "sent" as const })) }));
    }).catch(() => {});
  }, [active]);

  /* ── presence ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!active) { setPresence({ online: false, lastSeenAt: null }); return; }
    let ok = true;
    const fetch = () => apiGetUserPresence(active).then(p => { if (ok) setPresence(p); }).catch(() => {});
    fetch();
    const ti = setInterval(() => setTick(t => t + 1), 5000);
    const po = setInterval(fetch, 30000);
    return () => { ok = false; clearInterval(ti); clearInterval(po); };
  }, [active]);
  void tick;

  /* ── poll messages ──────────────────────────────────────────── */
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      apiGetMessages(active).then(ms => {
        setMsgs(p => {
          const next = ms.map(m => ({ id: m.id, text: m.content, mine: m.fromUserId === meId, time: new Date(m.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }), status: m.isRead ? "read" as const : "sent" as const }));
          if (JSON.stringify(next.map(x => x.id)) === JSON.stringify((p[active] ?? []).map(x => x.id))) return p;
          return { ...p, [active]: next };
        });
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [active, meId]);

  /* ── poll conv list ─────────────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      if (!allUsersRef.current.length) return;
      apiGetConversations().then(cs => {
        setConvs(p => cs.map(c => {
          const ex = p.find(x => x.id === c.userId);
          const u  = allUsersRef.current.find(x => x.id === c.userId);
          const name = u ? `${u.firstName} ${u.lastName}` : `Utilisateur #${c.userId}`;
          return { id: c.userId, name, initials: mkInitials(name), color: COLORS[c.userId % COLORS.length], jobTitle: ex?.jobTitle, lastMessage: c.lastMessage, unread: activeRef.current === c.userId ? 0 : c.unreadCount, time: new Date(c.updatedAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }) };
        }));
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, active]);

  /* ── send ───────────────────────────────────────────────────── */
  const send = (text?: string, kind?: TgMsg["kind"]) => {
    const content = text ?? draft.trim();
    if (!content && !kind) return;
    if (!active) return;
    const now = new Date().toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    const m: TgMsg = { id: Date.now(), text: content, mine: true, time: now, status: "sent", kind };
    setMsgs(p => ({ ...p, [active]: [...(p[active] ?? []), m] }));
    setConvs(p => p.map(c => c.id === active ? { ...c, lastMessage: content, time: now } : c));
    if (!text) setDraft("");
    setShowAttach(false);
    apiSendMessage(active, content).catch(() => {});
  };

  /* ── long press / selection ─────────────────────────────────── */
  const startLP = (id: number) => { longTimer.current = setTimeout(() => { setSelMode(true); setSelMsgs(new Set([id])); }, 500); };
  const cancelLP = () => { if (longTimer.current) { clearTimeout(longTimer.current); longTimer.current = null; } };
  const toggleSel = (id: number) => setSelMsgs(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const exitSel = () => { setSelMode(false); setSelMsgs(new Set()); setShowDel(false); };
  const copySel = () => { const t = (msgs[active!] ?? []).filter(m => selMsgs.has(m.id)).map(m => m.text).join("\n"); navigator.clipboard?.writeText(t).catch(() => {}); exitSel(); };
  const confirmDel = () => { setMsgs(p => ({ ...p, [active!]: (p[active!] ?? []).filter(m => !selMsgs.has(m.id)) })); exitSel(); };

  const activeConv = active ? convs.find(c => c.id === active) ?? null : null;
  const curMsgs    = active ? (msgs[active] ?? []) : [];
  const filtConvs  = convs.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const fmtTime    = (s: number) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  /* ════════════════════════════════════════
     CALL INCOMING  — Telegram exact
  ════════════════════════════════════════ */
  if (sig.callState === "incoming" && sig.incomingCall) {
    const caller = allUsers.find(u => u.id === sig.incomingCall!.fromUserId);
    const name   = caller ? `${caller.firstName} ${caller.lastName}` : `Utilisateur #${sig.incomingCall.fromUserId}`;
    const color  = COLORS[sig.incomingCall.fromUserId % COLORS.length];
    const isVid  = sig.incomingCall.callType === "video";
    return (
      <div style={{ position:"fixed", inset:0, zIndex:9999, background:"linear-gradient(180deg,#0EA5E9 0%,#8B5CF6 55%,#8B5CF6 100%)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <style>{`
          @keyframes tg-ring{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.55),0 0 0 0 rgba(255,255,255,.3)}50%{box-shadow:0 0 0 22px rgba(255,255,255,.18),0 0 0 44px rgba(255,255,255,.07)}}
          @keyframes tg-dots{0%,80%,100%{opacity:0}40%{opacity:1}}
          .tg-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.8);margin:0 2px;animation:tg-dots 1.4s infinite ease-in-out both}
          .tg-dot:nth-child(1){animation-delay:-.32s}
          .tg-dot:nth-child(2){animation-delay:-.16s}
        `}</style>
        {/* top icons */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"52px 20px 0", flexShrink:0 }}>
          <div style={{ width:40 }} />
          <div style={{ color:"rgba(255,255,255,.75)", fontSize:13, fontWeight:500 }}>{isVid ? "Appel vidéo entrant" : "Appel vocal entrant"}</div>
          <button style={{ background:"none", border:"none", color:"rgba(255,255,255,.8)", cursor:"pointer", padding:4 }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
          </button>
        </div>
        {/* avatar + name + status */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:0 }}>
          <div style={{ width:130, height:130, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:52, color:"#fff", fontWeight:800, animation:"tg-ring 2s ease-out infinite", marginBottom:24 }}>
            {mkInitials(name)}
          </div>
          <div style={{ color:"#fff", fontWeight:800, fontSize:26, letterSpacing:.3, marginBottom:10, textAlign:"center", padding:"0 24px" }}>{name}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, color:"rgba(255,255,255,.75)", fontSize:15 }}>
            Sonnerie
            <span className="tg-dot" /><span className="tg-dot" /><span className="tg-dot" />
          </div>
        </div>
        {/* bottom buttons */}
        <div style={{ padding:"0 32px 60px", flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-around", alignItems:"flex-start" }}>
            <div style={{ textAlign:"center", cursor:"pointer" }} onClick={() => sig.rejectCall()}>
              <div style={{ width:68, height:68, borderRadius:"50%", background:"#EF4444", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", boxShadow:"0 4px 20px rgba(244,67,54,.5)" }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
              </div>
              <div style={{ color:"rgba(255,255,255,.85)", fontSize:13, fontWeight:500 }}>Raccrocher</div>
            </div>
            <div style={{ textAlign:"center", cursor:"pointer" }} onClick={() => sig.acceptCall()}>
              <div style={{ width:68, height:68, borderRadius:"50%", background:"var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", boxShadow:"0 4px 20px rgba(76,175,80,.5)" }}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
              </div>
              <div style={{ color:"rgba(255,255,255,.85)", fontSize:13, fontWeight:500 }}>Accepter</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════
     CALL ACTIVE  — Telegram exact
  ════════════════════════════════════════ */
  if (sig.callState === "calling" || sig.callState === "active") {
    const peer  = active ? (convs.find(c => c.id === active) ?? null) : null;
    const isVid = sig.callType === "video";
    const status = sig.callState === "active" ? `● ${fmtTime(sig.callDuration)}` : "Connexion en cours...";
    return (
      <div style={{ position:"fixed", inset:0, zIndex:9999, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <style>{`
          @keyframes tg-ring{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.55),0 0 0 0 rgba(255,255,255,.3)}50%{box-shadow:0 0 0 22px rgba(255,255,255,.18),0 0 0 44px rgba(255,255,255,.07)}}
          @keyframes tg-dots{0%,80%,100%{opacity:0}40%{opacity:1}}
          .tg-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.8);margin:0 2px;animation:tg-dots 1.4s infinite ease-in-out both}
          .tg-dot:nth-child(1){animation-delay:-.32s}
          .tg-dot:nth-child(2){animation-delay:-.16s}
          .tg-btn{background:rgba(255,255,255,.18);border:none;width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
          .tg-btn:active{background:rgba(255,255,255,.35)}
          .tg-btn-active{background:rgba(255,255,255,.9)!important}
        `}</style>
        <audio ref={remoteAudio} autoPlay playsInline style={{ display:"none" }} />

        {/* ── VIDEO CALL ── */}
        {isVid ? (
          <>
            <video ref={remoteVideo} autoPlay playsInline style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", background:"#111" }} />
            {/* top gradient + info */}
            <div style={{ position:"absolute", top:0, left:0, right:0, padding:"48px 16px 60px", background:"linear-gradient(180deg,rgba(0,0,0,.7) 0%,transparent 100%)", zIndex:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <button style={{ background:"none", border:"none", color:"rgba(255,255,255,.9)", cursor:"pointer", padding:4 }}>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M7 14l-5-5 5-5v3h11v4H7v3z"/></svg>
                </button>
                <div style={{ flex:1 }}>
                  <div style={{ color:"#fff", fontWeight:800, fontSize:18, lineHeight:1.2 }}>{peer?.name ?? "Appel vidéo"}</div>
                  <div style={{ color:"rgba(255,255,255,.8)", fontSize:13, marginTop:2 }}>{status}</div>
                </div>
                <button style={{ background:"none", border:"none", color:"rgba(255,255,255,.8)", cursor:"pointer", padding:4 }}>
                  <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                </button>
              </div>
            </div>
            {/* self-view */}
            <div style={{ position:"absolute", top:110, right:14, width:100, height:148, borderRadius:16, overflow:"hidden", border:"2px solid rgba(255,255,255,.55)", zIndex:15, boxShadow:"0 4px 16px rgba(0,0,0,.5)" }}>
              <video ref={localVideo} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:sig.cameraFront?"scaleX(-1)":"scaleX(1)" }} />
            </div>
            {/* bottom controls */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 16px 52px", background:"linear-gradient(0deg,rgba(0,0,0,.75) 0%,transparent 100%)", zIndex:10 }}>
              <div style={{ display:"flex", justifyContent:"space-around", alignItems:"flex-start" }}>
                {([
                  { label:"Retourner",     icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M7.47 21.49C4.2 19.93 1.86 16.76 1.5 13H0c.51 6.16 5.66 11 11.95 11l.66-.03-3.81-3.81-1.33 1.33zm.89-6.52c-.19 0-.38-.03-.56-.08L6 16.68l-.41.41c.28.4.64.74 1.04 1.01.28.18.59.32.9.43.62.22 1.28.28 1.93.17.3-.04.59-.12.87-.23.28-.11.54-.25.78-.42.24-.17.46-.37.65-.59.19-.22.36-.47.49-.73.12-.27.22-.54.28-.83.06-.28.08-.58.06-.87l-.08-.6-1.42.42c-.01.19-.04.38-.1.56-.08.26-.22.49-.4.69-.18.2-.4.36-.64.47-.24.1-.51.16-.78.16z"/><path d="M12.05 0l-.66.03 3.81 3.81 1.33-1.33C19.8 4.07 22.14 7.24 22.5 11H24c-.51-6.16-5.66-11-11.95-11zm-.22 4C8.47 4 5.2 6.28 4.22 9.65l1.42-.42c.73-2.36 2.93-4.23 5.53-4.23 2.1 0 3.96.96 5.2 2.47L14.75 9h4V5l-1.3 1.3C16.07 4.89 14.18 4 12.08 4h-.25z"/></svg>, action:() => sig.flipCamera() },
                  { label:"Arrêter vidéo", icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M21 6.5l-4-4-12 12 4 4 12-12zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2zM15 17H5V8h1.73l8 8H15v1z"/></svg>, action:() => {} },
                  { label:"Muet",          icon:<svg viewBox="0 0 24 24" width="26" height="26" fill={sig.isMuted?"#fff":"currentColor"}><path d={sig.isMuted?"M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z":"M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28C16.28 17.23 19 14.41 19 11h-1.7z"}/></svg>, action:() => sig.toggleMute(), active: sig.isMuted },
                  { label:"Raccrocher",    icon:<svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>, action:() => sig.endCall(), red:true },
                ] as {label:string;icon:JSX.Element;action:()=>void;active?:boolean;red?:boolean}[]).map(b => (
                  <div key={b.label} style={{ textAlign:"center", cursor:"pointer" }} onClick={b.action}>
                    <div className={`tg-btn${b.active?" tg-btn-active":""}`} style={b.red ? { background:"#EF4444", boxShadow:"0 4px 18px rgba(244,67,54,.55)" } : {}} >{b.icon}</div>
                    <div style={{ color:"rgba(255,255,255,.85)", fontSize:11, fontWeight:500, marginTop:7 }}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* ── AUDIO CALL ── */
          <>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,#0EA5E9 0%,#8B5CF6 55%,#8B5CF6 100%)" }} />
            {/* top bar */}
            <div style={{ position:"relative", zIndex:10, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"48px 20px 0", flexShrink:0 }}>
              <button style={{ background:"none", border:"none", color:"rgba(255,255,255,.85)", cursor:"pointer", padding:4 }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M7 14l-5-5 5-5v3h11v4H7v3z"/></svg>
              </button>
              <div />
              <button onClick={() => sig.toggleSpeaker()} style={{ background:"none", border:"none", color:sig.isSpeaker?"#fff":"rgba(255,255,255,.65)", cursor:"pointer", padding:4 }}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d={sig.isSpeaker?"M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z":"M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"}/></svg>
              </button>
            </div>
            {/* center avatar */}
            <div style={{ position:"relative", zIndex:10, flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:136, height:136, borderRadius:"50%", background:peer?.color ?? "#6366F1", display:"flex", alignItems:"center", justifyContent:"center", fontSize:54, color:"#fff", fontWeight:800, animation:"tg-ring 2s ease-out infinite", marginBottom:28 }}>
                {peer ? mkInitials(peer.name) : "?"}
              </div>
              <div style={{ color:"#fff", fontWeight:800, fontSize:26, letterSpacing:.3, marginBottom:12, textAlign:"center", padding:"0 24px" }}>{peer?.name ?? "Appel vocal"}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, color:"rgba(255,255,255,.78)", fontSize:15 }}>
                {sig.callState === "active"
                  ? <span style={{ color:"#BBF7D0", fontWeight:700 }}>● {fmtTime(sig.callDuration)}</span>
                  : <><span>Sonnerie</span><span className="tg-dot" /><span className="tg-dot" /><span className="tg-dot" /></>
                }
              </div>
            </div>
            {/* bottom 4 buttons */}
            <div style={{ position:"relative", zIndex:10, padding:"0 16px 58px", flexShrink:0 }}>
              <div style={{ display:"flex", justifyContent:"space-around", alignItems:"flex-start" }}>
                {([
                  { label:"Haut-parleur",  icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>, action:() => sig.toggleSpeaker(), active:sig.isSpeaker },
                  { label:"Activer vidéo", icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>, action:() => {} },
                  { label:"Muet",          icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d={sig.isMuted?"M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z":"M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28C16.28 17.23 19 14.41 19 11h-1.7z"}/></svg>, action:() => sig.toggleMute(), active:sig.isMuted },
                  { label:"Raccrocher",    icon:<svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>, action:() => sig.endCall(), red:true },
                ] as {label:string;icon:JSX.Element;action:()=>void;active?:boolean;red?:boolean}[]).map(b => (
                  <div key={b.label} style={{ textAlign:"center", cursor:"pointer" }} onClick={b.action}>
                    <div className={`tg-btn${b.active?" tg-btn-active":""}`} style={b.red ? { background:"#EF4444", boxShadow:"0 4px 18px rgba(244,67,54,.55)" } : {}}>{b.icon}</div>
                    <div style={{ color:"rgba(255,255,255,.85)", fontSize:11, fontWeight:500, marginTop:7 }}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════
     CHAT VIEW
  ════════════════════════════════════════ */
  if (active && activeConv) {
    const presText = presLabel(presence.online, presence.lastSeenAt);
    return (
      <div style={{ position:"fixed", top:0, bottom:0, left:0, right:0, display:"flex", flexDirection:"column", zIndex:10000, overflow:"hidden" }}>
        <style>{`
          .ji-bg {
            background-color: #E5E7EB;
            background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231877F2' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          }
          .ji-mine {
            background: var(--bp-primary);
            color: #fff;
            border-radius: 12px 12px 3px 12px;
          }
          .ji-theirs {
            background: #ffffff;
            color: #111;
            border-radius: 12px 12px 12px 3px;
            box-shadow: 0 1px 2px rgba(0,0,0,.14);
          }
          .ji-attach-item:active { opacity: .75; }
        `}</style>

        {/* ── HEADER ── */}
        {selMode ? (
          <div style={{ background:"#0EA5E9", padding:"10px 12px", display:"flex", alignItems:"center", gap:14, flexShrink:0, boxShadow:"0 2px 4px rgba(0,0,0,.2)" }}>
            <button onClick={exitSel} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#fff" }}>✕</button>
            <span style={{ flex:1, fontWeight:700, fontSize:18, color:"#fff" }}>{selMsgs.size} sélectionné{selMsgs.size > 1 ? "s" : ""}</span>
            <button onClick={copySel} style={{ background:"none", border:"none", cursor:"pointer", color:"#fff", fontSize:20, padding:6 }}>⎘</button>
            <button onClick={() => selMsgs.size > 0 && setShowDel(true)} style={{ background:"none", border:"none", cursor:"pointer", color:selMsgs.size>0?"#fff":"rgba(255,255,255,.35)", fontSize:20, padding:6 }}>🗑</button>
          </div>
        ) : (
          <div style={{ background:"var(--bp-primary)", padding:"8px 10px", display:"flex", alignItems:"center", gap:8, flexShrink:0, boxShadow:"0 2px 6px rgba(0,0,0,.2)" }}>
            {/* Back */}
            <button onClick={() => { setActive(null); }} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#fff", padding:"4px 2px", display:"flex", alignItems:"center" }}>←</button>

            {/* Avatar */}
            <div style={{ position:"relative" }}>
              <div className="avatar" style={{ background:"rgba(255,255,255,.25)", width:40, height:40, fontSize:14, color:"#fff", border:"2px solid rgba(255,255,255,.4)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                {activeConv.initials}
              </div>
              {presence.online && <div style={{ position:"absolute", bottom:1, right:1, width:11, height:11, background:"var(--bp-primary)", borderRadius:"50%", border:"2px solid var(--bp-primary)" }} />}
            </div>

            {/* Name + status */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:15, color:"#fff", lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeConv.name}</div>
              {activeConv.jobTitle
                ? <div style={{ fontSize:10.5, color:"rgba(255,255,255,.75)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{activeConv.jobTitle}</div>
                : <div style={{ fontSize:10.5, color:"rgba(255,255,255,.85)" }}>{presence.online ? "En ligne" : presText}</div>
              }
              {activeConv.jobTitle && <div style={{ fontSize:10, color:"rgba(255,255,255,.65)" }}>{presence.online ? "En ligne" : presText}</div>}
            </div>

            {/* Action buttons */}
            <div style={{ display:"flex", gap:2 }}>
              {[
                { emoji:"📞", label:"Appel audio", action: () => sig.startCall(active, "audio") },
                { emoji:"📹", label:"Appel vidéo", action: () => sig.startCall(active, "video") },
                { emoji:"⋮",  label:"Menu",        action: () => {} },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} title={btn.label} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:"50%", width:38, height:38, cursor:"pointer", fontSize:btn.emoji === "⋮" ? 22 : 18, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:btn.emoji === "⋮" ? 700 : 400 }}>{btn.emoji}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── MESSAGES ── */}
        <div className="ji-bg" style={{ flex:1, overflowY:"auto", padding:"10px 8px 6px", display:"flex", flexDirection:"column", gap:2 }}>
          {/* Date chip */}
          <div style={{ alignSelf:"center", background:"rgba(255,255,255,.82)", borderRadius:20, padding:"3px 14px", fontSize:11.5, color:"#555", boxShadow:"0 1px 2px rgba(0,0,0,.08)", marginBottom:8 }}>Aujourd'hui</div>

          {curMsgs.length === 0 && (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ background:"rgba(255,255,255,.85)", borderRadius:16, padding:"12px 20px", fontSize:13, color:"#555", textAlign:"center" }}>
                🔒 Les messages sont chiffrés de bout en bout
              </div>
            </div>
          )}

          {curMsgs.map((msg, i) => {
            const isFirst = i === 0 || curMsgs[i-1]?.mine !== msg.mine;
            const isLast  = i === curMsgs.length - 1 || curMsgs[i+1]?.mine !== msg.mine;
            const isSel   = selMsgs.has(msg.id);
            const lp = {
              onMouseDown:   () => startLP(msg.id),
              onMouseUp:     cancelLP,
              onMouseLeave:  cancelLP,
              onTouchStart:  () => startLP(msg.id),
              onTouchEnd:    cancelLP,
              onTouchMove:   cancelLP,
              onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); startLP(msg.id); },
            };

            return (
              <div
                key={msg.id}
                onClick={() => selMode && toggleSel(msg.id)}
                style={{ display:"flex", justifyContent:msg.mine ? "flex-end" : "flex-start", alignItems:"flex-end", gap:5, marginTop:isFirst ? 6 : 1, paddingLeft:selMode ? 4 : 0, background:isSel ? "rgba(24,119,242,.12)" : "transparent", borderRadius:8, cursor:selMode ? "pointer" : "default", userSelect:"none" }}
              >
                {selMode && (
                  <div style={{ width:22, height:22, borderRadius:"50%", flexShrink:0, border:isSel ? "none" : "2px solid #aaa", background:isSel ? "var(--bp-primary)" : "transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {isSel && <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>}
                  </div>
                )}

                {/* Interlocutor avatar */}
                {!msg.mine && !selMode && (
                  <div style={{ width:30, flexShrink:0, alignSelf:"flex-end", paddingBottom:2 }}>
                    {isLast && (
                      <div style={{ width:28, height:28, borderRadius:"50%", background:activeConv.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:700 }}>
                        {activeConv.initials}
                      </div>
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column" }} {...(!selMode ? lp : {})}>
                  <div className={msg.mine ? "ji-mine" : "ji-theirs"} style={{ padding:"7px 10px 5px", fontSize:14.5, lineHeight:1.45, wordBreak:"break-word" }}>
                    {/* Special message header */}
                    {msg.kind && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom: msg.text !== kindIcon(msg.kind) + " " ? 2 : 0 }}>
                        <span style={{ fontSize:17 }}>{kindIcon(msg.kind)}</span>
                        <span style={{ fontWeight:600, opacity:.9 }}>{msg.text}</span>
                      </div>
                    )}
                    {/* Normal text */}
                    {!msg.kind && <span>{msg.text}</span>}

                    {/* Poll options preview */}
                    {msg.kind === "poll" && (
                      <div style={{ marginTop:8, borderTop:`1px solid ${msg.mine ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.08)"}`, paddingTop:6 }}>
                        {["Lundi matin","Mardi 14h-16h","Mercredi soir"].map((opt, idx) => (
                          <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                            <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${msg.mine ? "rgba(255,255,255,.6)" : "var(--bp-primary)"}`, flexShrink:0 }} />
                            <span style={{ fontSize:13, opacity:.9 }}>{opt}</span>
                          </div>
                        ))}
                        <div style={{ fontSize:11, opacity:.7, marginTop:4 }}>0 vote · Répondre</div>
                      </div>
                    )}

                    {/* Interview options preview */}
                    {msg.kind === "interview" && (
                      <div style={{ marginTop:8, borderTop:`1px solid ${msg.mine ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.08)"}`, paddingTop:6 }}>
                        <div style={{ fontSize:12, opacity:.8, marginBottom:4 }}>📅 Créneaux proposés</div>
                        {["Demain 10h00","Jeudi 14h30","Vendredi 9h00"].map((slot, idx) => (
                          <div key={idx} style={{ background:msg.mine ? "rgba(255,255,255,.15)" : "rgba(24,119,242,.08)", borderRadius:8, padding:"5px 10px", marginBottom:4, fontSize:13, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <span>{slot}</span>
                            <span style={{ fontSize:10, opacity:.7 }}>Confirmer</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamp + check */}
                    <div style={{ fontSize:10, marginTop:3, color:msg.mine ? "rgba(255,255,255,.7)" : "#999", textAlign:"right", display:"flex", justifyContent:"flex-end", alignItems:"center", gap:2 }}>
                      {msg.time}
                      {msg.mine && (
                        <span style={{ fontSize:12, color:msg.status === "read" ? "#0EA5E9" : "rgba(255,255,255,.55)", letterSpacing:-1 }}>✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── ATTACHMENT PANEL ── */}
        {showAttach && (
          <div style={{ background:"#fff", borderTop:"1px solid #E5E7EB", padding:"16px 16px 18px", flexShrink:0, boxShadow:"0 -4px 20px rgba(0,0,0,.1)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
              {ATTACH_ITEMS.map(it => (
                <div key={it.label} className="ji-attach-item" onClick={() => { send(it.text, it.kind); }} style={{ textAlign:"center", cursor:"pointer" }}>
                  <div style={{ width:52, height:52, background:it.bg, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, margin:"0 auto 6px", boxShadow:`0 2px 8px ${it.bg}55` }}>{it.icon}</div>
                  <div style={{ fontSize:11, color:"#444", fontWeight:600 }}>{it.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BOTTOM BAR ── */}
        {selMode ? (
          <div style={{ background:"#fff", borderTop:"1px solid #E5E7EB", display:"flex", flexShrink:0 }}>
            {[{ icon:"↩", label:"Répondre" }, { icon:"→", label:"Transférer" }].map(a => (
              <button key={a.label} style={{ flex:1, background:"none", border:"none", padding:"14px 0", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, borderRight:a.label==="Répondre"?"1px solid #E5E7EB":"none" }}>
                <span style={{ fontSize:20 }}>{a.icon}</span>
                <span style={{ fontSize:12, color:"#555", fontWeight:600 }}>{a.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ background:"#F1F5F9", padding:"6px 8px", display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
            {/* + button */}
            <button
              onClick={() => setShowAttach(o => !o)}
              style={{ background:showAttach ? "var(--bp-primary)" : "#fff", border:"none", width:40, height:40, borderRadius:"50%", cursor:"pointer", fontSize:22, display:"flex", alignItems:"center", justifyContent:"center", color:showAttach ? "#fff" : "#555", flexShrink:0, boxShadow:"0 1px 3px rgba(0,0,0,.12)", transition:"all .2s" }}
            >
              {showAttach ? "✕" : "＋"}
            </button>

            {/* Input */}
            <input
              ref={inputRef}
              value={draft}
              onChange={e => { setDraft(e.target.value); setShowAttach(false); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Message..."
              style={{ flex:1, background:"#fff", border:"none", borderRadius:22, padding:"10px 14px", fontSize:15, outline:"none", boxSizing:"border-box", color:"#111", boxShadow:"0 1px 3px rgba(0,0,0,.1)" }}
            />

            {/* Send / mic */}
            {draft.trim() ? (
              <button onClick={() => send()} style={{ background:"var(--bp-primary)", border:"none", borderRadius:"50%", width:40, height:40, color:"#fff", cursor:"pointer", fontSize:16, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(24,119,242,.5)" }}>➤</button>
            ) : (
              <button style={{ background:"var(--bp-primary)", border:"none", borderRadius:"50%", width:40, height:40, color:"#fff", cursor:"pointer", fontSize:18, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(24,119,242,.5)" }}>🎤</button>
            )}
          </div>
        )}

        {/* Delete confirm */}
        {showDel && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"0 24px" }} onClick={e => { if (e.target === e.currentTarget) setShowDel(false); }}>
            <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:320, padding:"24px 20px 16px", boxShadow:"0 8px 32px rgba(0,0,0,.25)" }}>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:10 }}>Supprimer le message</div>
              <div style={{ fontSize:14, color:"#555", marginBottom:20, lineHeight:1.5 }}>Supprimer {selMsgs.size > 1 ? `ces ${selMsgs.size} messages` : "ce message"} ?</div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:4 }}>
                <button onClick={() => setShowDel(false)} style={{ background:"none", border:"none", padding:"10px 16px", fontSize:15, fontWeight:700, color:"var(--bp-primary)", cursor:"pointer", borderRadius:8 }}>Annuler</button>
                <button onClick={confirmDel} style={{ background:"none", border:"none", padding:"10px 16px", fontSize:15, fontWeight:700, color:"#EF4444", cursor:"pointer", borderRadius:8 }}>Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════
     INBOX LIST VIEW
  ════════════════════════════════════════ */
  return (
    <div style={{ position:"fixed", top:0, bottom:0, left:0, right:0, display:"flex", flexDirection:"column", background:"#fff", zIndex:10000, overflow:"hidden" }}>
      <style>{`
        .ji-row:hover  { background: #F8FAFC; }
        .ji-row:active { background: #F1F5F9; }
        @keyframes jiFade { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{ background:"var(--bp-primary)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px 8px" }}>
          <button onClick={() => navigate("/jobs")} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:"50%", width:36, height:36, cursor:"pointer", fontSize:18, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
          <div style={{ flex:1, fontWeight:900, fontSize:20, color:"#fff" }}>💼 Inbox Emploi</div>
          <button style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:"50%", width:36, height:36, cursor:"pointer", fontSize:17, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>🔍</button>
          <button style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:"50%", width:36, height:36, cursor:"pointer", fontSize:20, color:"#fff", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>⋮</button>
        </div>
        <div style={{ position:"relative", padding:"0 12px 10px" }}>
          <span style={{ position:"absolute", left:22, top:"50%", transform:"translateY(-65%)", fontSize:13, color:"rgba(255,255,255,.6)" }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un recruteur ou une entreprise"
            style={{ width:"100%", background:"rgba(255,255,255,.18)", border:"none", borderRadius:22, padding:"8px 14px 8px 34px", fontSize:13.5, outline:"none", boxSizing:"border-box", color:"#fff" }}
          />
        </div>
      </div>

      {/* Tips bar */}
      <div style={{ background:"#DCFCE7", borderBottom:"1px solid #DCFCE7", padding:"8px 14px", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <span style={{ fontSize:16 }}>💡</span>
        <span style={{ fontSize:12.5, color:"#0EA5E9" }}>Contactez directement les recruteurs depuis une offre d'emploi</span>
      </div>

      {/* Conversation list */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {filtConvs.length === 0 ? (
          <div style={{ padding:"60px 20px", textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:14 }}>💼</div>
            <div style={{ fontWeight:700, fontSize:17, color:"#222", marginBottom:8 }}>
              {search ? "Aucun résultat" : "Aucune conversation"}
            </div>
            <div style={{ fontSize:13, color:"#888", lineHeight:1.6 }}>
              {search ? "Essayez un autre nom" : "Postulez à une offre et contactez\nle recruteur depuis la page détail"}
            </div>
            <button onClick={() => navigate("/jobs")} style={{ marginTop:20, background:"var(--bp-primary)", color:"#fff", border:"none", borderRadius:22, padding:"11px 28px", fontWeight:700, fontSize:14, cursor:"pointer" }}>
              Voir les offres d'emploi
            </button>
          </div>
        ) : (
          filtConvs.map((conv, idx) => (
            <div
              key={conv.id}
              className="ji-row"
              onClick={() => setActive(conv.id)}
              style={{ display:"flex", gap:12, padding:"10px 14px", cursor:"pointer", background:"#fff", borderBottom:idx < filtConvs.length-1 ? "1px solid #F1F5F9" : "none", transition:"background .1s", animation:"jiFade .2s ease forwards" }}
            >
              {/* Avatar */}
              <div style={{ position:"relative", flexShrink:0, alignSelf:"center" }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:conv.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#fff", fontWeight:700 }}>{conv.initials}</div>
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0, alignSelf:"center" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                  <span style={{ fontWeight:conv.unread>0 ? 800 : 600, fontSize:15.5, color:"#111", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"68%" }}>{conv.name}</span>
                  <span style={{ fontSize:11.5, color:conv.unread>0 ? "var(--bp-primary)" : "#aaa", fontWeight:conv.unread>0 ? 700 : 400, flexShrink:0 }}>{conv.time}</span>
                </div>
                {conv.jobTitle && (
                  <div style={{ fontSize:12, color:"var(--bp-primary)", fontWeight:600, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>💼 {conv.jobTitle}</div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ flex:1, fontSize:13.5, color:conv.unread>0 ? "#222" : "#888", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:conv.unread>0 ? 600 : 400 }}>
                    {conv.lastMessage || "Démarrer une conversation"}
                  </div>
                  {conv.unread > 0 && (
                    <div style={{ background:"var(--bp-primary)", color:"#fff", borderRadius:20, minWidth:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, padding:"0 5px", flexShrink:0 }}>
                      {conv.unread > 99 ? "99+" : conv.unread}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/jobs")}
        style={{ position:"absolute", bottom:16, right:16, width:54, height:54, borderRadius:"50%", background:"var(--bp-primary)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:"#fff", boxShadow:"0 4px 16px rgba(24,119,242,.45)", zIndex:10 }}
        title="Voir les offres"
      >💼</button>
    </div>
  );
}
