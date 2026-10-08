import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "../router";
import PollMessageCard from "../components/PollMessageCard";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { openImageViewer } from "../components/ImageViewer";
import { apiFetch, apiGetConversations, apiGetMessages, apiMarkMessagesRead, apiSendMessage, apiGetUsers, apiGetUserPresence, apiGetChatGroups, apiCreateChatGroup, apiGetChatGroupInfo, apiGetChatGroupMessages, apiSendChatGroupMessage, apiLeaveChatGroup, apiUpdateChatGroup, apiSendTyping, apiGetTyping, apiUploadFile, apiUploadFileXHR, apiUploadVoice, apiDeleteConversation, apiDeleteMessage, apiGetLinkPreview, apiGetMessagingSettings, apiUpdateMessagingSettings, apiGetMessageRequests, apiUpdateMessageRequest, apiGetContactInfo, apiMuteContact, apiUnmuteContact, apiPinContact, apiUnpinContact, apiFavoriteContact, apiUnfavoriteContact, apiBlockUser, apiUnblockUser, apiReportUser, apiSendFriendRequest, apiSearchInConversation, apiDeleteConversationContact, apiGetMyGroups, apiAddContactToGroup, apiGetGroupAuditLog, apiKickGroupMember, apiChangeGroupMemberRole, apiGetGroupSettings, apiPatchGroupSettings, apiPatchGroupPermissions, apiPatchGroupReactions, apiSetChatGroupMemberRole, apiRemoveChatGroupMember, apiGetChatGroupMembersGrouped, apiAddChatGroupMembers, apiGetGroupInviteLinks, apiCreateGroupInviteLink, apiRevokeGroupInviteLink, apiUpdateGroupInviteLink, apiGetGroupInviteLinkStats, type PublicUser, type ApiChatGroup, type ApiChatGroupInfo, type LinkPreview, type MessageRequest, type ContactInfo, type GroupAuditEntry, type ApiGroupInviteLink, type ApiGroupInviteLinkStats } from "../lib/api";
import { UserBadge } from "../components/UserBadge";
import { EmojiPicker } from "../components/EmojiPicker";
import { useCallSignaling, type NewMessagePayload } from "../hooks/useCallSignaling";
import { trackEvent } from "../lib/analytics";
import { useGroupActivity } from "../hooks/useGroupActivity";

void ({} as ApiChatGroup);

const CONV_THEMES = {
  "bp-green": { label:"BrutePawa Vert",  bg:"#F0FDF4", mine:"#C8E6B2", mineText:"#14532D", theirs:"#fff",     theirsText:"#111", accent:"var(--bp-primary)" },
  "ocean":    { label:"Océan Bleu",      bg:"#DCFCE7", mine:"#0EA5E9", mineText:"#fff", theirs:"#fff",     theirsText:"#111", accent:"#0EA5E9" },
  "orange":   { label:"Soleil Orange",   bg:"#FEF3C7", mine:"#F97316", mineText:"#fff", theirs:"#fff",     theirsText:"#111", accent:"#F97316" },
  "violet":   { label:"Violet Premium",  bg:"#EDE9FE", mine:"#8B5CF6", mineText:"#fff", theirs:"#fff",     theirsText:"#111", accent:"#8B5CF6" },
  "rose":     { label:"Rose Moderne",    bg:"#FEE2E2", mine:"#F43F5E", mineText:"#fff", theirs:"#fff",     theirsText:"#111", accent:"#F43F5E" },
  "indigo":   { label:"Indigo",          bg:"#EDE9FE", mine:"#6366F1", mineText:"#fff", theirs:"#fff",     theirsText:"#111", accent:"#6366F1" },
  "cyan":     { label:"Cyan",            bg:"#DCFCE7", mine:"#0EA5E9", mineText:"#fff", theirs:"#fff",     theirsText:"#111", accent:"#0EA5E9" },
  "gold":     { label:"Or",              bg:"#FEF3C7", mine:"#D97706", mineText:"#fff", theirs:"#fff",     theirsText:"#111", accent:"#D97706" },
  "dark":     { label:"Nuit Sombre",     bg:"#111827", mine:"#1E293B", mineText:"#E5E7EB", theirs:"#1E293B", theirsText:"#E5E7EB", accent:"#9CA3AF" },
} as const;
type ThemeKey = keyof typeof CONV_THEMES;


const CONV_WALLPAPERS = [
  { key:"none", filename:null,      label:"Aucun"             },
  { key:"wp1",  filename:"wp1.jpg", label:"Coucher de soleil" },
  { key:"wp2",  filename:"wp2.jpg", label:"Plage tropicale"   },
  { key:"wp3",  filename:"wp3.jpg", label:"Voie lactée"       },
  { key:"wp4",  filename:"wp4.jpg", label:"Aube rose"         },
  { key:"wp5",  filename:"wp5.jpg", label:"Lac nocturne"      },
] as const;
type WallpaperKey = typeof CONV_WALLPAPERS[number]["key"];
const wpUrl = (key: WallpaperKey): string | null => {
  const wp = CONV_WALLPAPERS.find(w => w.key === key);
  if (!wp || !wp.filename) return null;
  return `${import.meta.env.BASE_URL}wallpapers/${wp.filename}`;
};

function presenceLabel(online: boolean, lastSeenAt: string | null): string {
  if (online) return "En ligne";
  if (!lastSeenAt) return "Hors ligne";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `En ligne il y a ${secs} s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `En ligne il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `En ligne il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `En ligne il y a ${days} j`;
}

interface Message {
  id: number;
  text: string;
  mine: boolean;
  time: string;
  date?: string;
  status?: "pending" | "sent" | "delivered" | "read";
  attachment?: { type: "image" | "sticker" | "doc" | "location" | "audio" | "contact" | "poll"; label: string; extra?: string; size?: number };
}

function ContactMessageCard({ user, online, time, mine, onMessage, onAudioCall, onVideoCall, onProfile, onShare }: {
  user: PublicUser;
  online: boolean;
  time: string;
  mine: boolean;
  onMessage: () => void;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onProfile: () => void;
  onShare: () => void;
}) {
  const name = `${user.firstName} ${user.lastName}`.trim();
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const actionStyle = { border:"none", borderRadius:18, minHeight:38, padding:"8px 10px", background:"rgba(240,253,244,.88)", color:"#111", fontWeight:700, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", gap:6, cursor:"pointer", transition:"transform .15s ease, background .15s ease" } as const;
  return (
    <div style={{ width:"min(430px, calc(100vw - 44px))", maxWidth:"100%", borderRadius:24, padding:"16px 14px 10px", boxSizing:"border-box", background:"rgba(255,255,255,.94)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", border:"1px solid rgba(255,255,255,.8)", boxShadow:"0 8px 28px rgba(15,23,42,.12)", color:"#111", animation:"fbl-fade-in .25s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
        <div style={{ width:64, height:64, flexShrink:0, position:"relative" }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" style={{ width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover", display:"block" }} />
          ) : (
            <div className="avatar" style={{ width:"100%", height:"100%", fontSize:20 }}>{initials}</div>
          )}
          {online && <span style={{ position:"absolute", right:1, bottom:2, width:15, height:15, borderRadius:"50%", background:"#22C55E", border:"3px solid #fff" }} />}
        </div>
        <div style={{ flex:1, minWidth:0, paddingTop:2 }}>
          <div style={{ fontSize:20, lineHeight:1.15, fontWeight:850, overflowWrap:"anywhere" }}>{name}</div>
          <div style={{ marginTop:5, display:"flex", alignItems:"center", gap:6, color:"#16A34A", fontSize:13, fontWeight:700 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0z"/></svg>
            Contact
          </div>
          {user.bio && <div style={{ marginTop:4, color:"#64748B", fontSize:13, lineHeight:1.35, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{user.bio}</div>}
        </div>
        <details style={{ position:"relative", flexShrink:0 }}>
          <summary aria-label="Options du contact" style={{ listStyle:"none", cursor:"pointer", width:30, height:34, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748B", fontSize:24 }}>⋮</summary>
          <div style={{ position:"absolute", right:0, top:34, zIndex:20, width:170, padding:6, borderRadius:14, background:"#fff", border:"1px solid #E5E7EB", boxShadow:"0 12px 30px rgba(15,23,42,.18)" }}>
            <button onClick={onProfile} style={{ ...actionStyle, width:"100%", justifyContent:"flex-start", background:"#fff" }}>Voir le profil</button>
            <button onClick={onMessage} style={{ ...actionStyle, width:"100%", justifyContent:"flex-start", background:"#fff" }}>Envoyer un message</button>
            <button onClick={onShare} style={{ ...actionStyle, width:"100%", justifyContent:"flex-start", background:"#fff" }}>Partager le contact</button>
          </div>
        </details>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:7, marginTop:14 }}>
        <button onClick={onMessage} style={actionStyle}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg><span>Message</span></button>
        <button onClick={onAudioCall} style={actionStyle}><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z"/></svg><span>Appeler</span></button>
        <button onClick={onVideoCall} style={actionStyle}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.3"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg><span>Vidéo</span></button>
      </div>
      <button onClick={onProfile} style={{ marginTop:8, width:"100%", minHeight:42, border:"none", borderRadius:20, background:"#22C55E", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>Voir le profil <span aria-hidden>›</span></button>
      <div style={{ marginTop:7, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:3, color:"#475569", fontSize:10 }}>
        {time}
        {mine && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/><polyline points="24 6 13 17 8 12"/></svg>}
      </div>
    </div>
  );
}

interface MediaUploadState {
  progress: number;
  network: "waiting" | "uploading" | "slow" | "offline" | "error";
  fileSize: number;
  file?: File;          /* absent for voice messages */
  voiceBlob?: Blob;     /* voice upload */
  voiceSecs?: number;   /* voice duration */
  localUrl: string;
  convId: number;       /* needed for retry after navigation */
  cancelFn?: () => void;
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / 1024 / 1024).toFixed(1)} Mo`;
}

interface NormConv {
  id: number;
  user: { name: string; initials: string; color: string; avatarUrl?: string | null; role?: string; badgeType?: string | null; verified?: boolean };
  lastMessage: string;
  unread: number;
  time: string;
  online?: boolean;
  lastSeenAt?: string | null;
  lastMsgMine?: boolean;
  lastMsgRead?: boolean;
  lastMsgDelivered?: boolean;
}

interface ChatGroupConv {
  id: number;
  name: string;
  avatarUrl: string | null;
  type: "group" | "channel";
  membersCount: number;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  role: string;
}

interface GroupMsg {
  id: number;
  text: string;
  senderName: string;
  mine: boolean;
  time: string;
  type: "text" | "system";
  attachment?: { type: "image" | "sticker" | "doc" | "location" | "audio" | "contact" | "poll"; label: string; extra?: string; size?: number };
}

const CONV_COLORS = ["var(--bp-primary)","#EC4899","#8B5CF6","#D97706","#388E3C","#00838F","#D32F2F"];
const mkInitials = (name: string) =>
  name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

// Matches https?://... OR bare domains like brutepawa.com, www.google.com
const URL_RE = /(?:https?:\/\/[^\s<>"]+[^\s<>".,;:!?)/])|(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:com|org|net|io|app|ai|co|fr|de|uk|it|es|biz|info|gg|tv|me|ly|africa|ci|sn|ng|cm|bf|ml|gh|rw|ke|za|et|tn|ma|dz|eg|br|ca|au|jp|ru|in)(?:\/[^\s<>".,;:!?)]*)?)(?=\s|$|[.,;:!?)])/g;

function normalizeUrl(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function MsgStatus({ status, dark }: { status?: string; dark: boolean }) {
  const color = dark ? "rgba(255,255,255,0.65)" : "#9CA3AF";
  const blue  = dark ? "#0EA5E9" : "#0EA5E9";
  const green = dark ? "#BBF7D0" : "var(--bp-primary)";
  if (status === "pending") return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="8" cy="8" r="6" stroke={color} strokeOpacity="0.3"/>
      <circle cx="8" cy="8" r="6" stroke="var(--bp-primary)"
        strokeDasharray="38" strokeDashoffset="28"
        style={{ animation:"fbl-spin 1s linear infinite", transformOrigin:"8px 8px" }}/>
    </svg>
  );
  if (status === "sent") return (
    <svg viewBox="0 0 16 12" width="16" height="11" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6l4 4 8-8"/>
    </svg>
  );
  if (status === "delivered") return (
    <svg viewBox="0 0 20 12" width="20" height="11" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6l4 4 8-8" stroke={color}/><path d="M7 6l4 4 8-8" stroke={color}/>
    </svg>
  );
  if (status === "read") return (
    <svg viewBox="0 0 20 12" width="20" height="11" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6l4 4 8-8" stroke={blue}/><path d="M7 6l4 4 8-8" stroke={green}/>
    </svg>
  );
  return null;
}

function renderText(text: string, textColor: string) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const raw = m[0];
    const href = normalizeUrl(raw);
    parts.push(
      <a key={m.index} href={href} target="_blank" rel="noreferrer noopener"
        style={{ color: textColor === "#fff" || textColor.startsWith("rgba(255") ? "#BBF7D0" : "var(--bp-primary)", textDecoration:"underline", wordBreak:"break-all" }}
        onClick={e => e.stopPropagation()}>
        {raw}
      </a>
    );
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === "string" ? text : <>{parts}</>;
}

function fmtDateLabel(dateStr: string): string {
  const todayD  = new Date();
  const todayS  = todayD.toISOString().slice(0, 10);
  const yestD   = new Date(todayD); yestD.setDate(todayD.getDate() - 1);
  const yestS   = yestD.toISOString().slice(0, 10);
  if (dateStr === todayS) return "Aujourd'hui";
  if (dateStr === yestS)  return "Hier";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr", { day: "numeric", month: "long", year: "numeric" });
}

function fmtConvPreview(raw: string): { text: string; isAudio: boolean } {
  if (!raw) return { text: "Démarrer une conversation", isAudio: false };
  if (raw.startsWith("__audio__:")) {
    const parts = raw.slice("__audio__:".length).split(":");
    const secs = parseInt(parts[0], 10);
    if (!isNaN(secs)) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return { text: `Message vocal • ${m}:${s.toString().padStart(2, "0")}`, isAudio: true };
    }
    return { text: "Message vocal", isAudio: true };
  }
  if (raw.startsWith("__image__:") && raw.includes("brutepawa-")) return { text: "Sticker", isAudio: false };
  if (raw.startsWith("__image__:"))    return { text: "📷 Photo", isAudio: false };
  if (raw.startsWith("__sticker__:"))  return { text: "Sticker", isAudio: false };
  if (raw.startsWith("__doc__:"))      return { text: "📎 Document", isAudio: false };
  if (raw.startsWith("__location__:")) return { text: "📍 Localisation", isAudio: false };
  if (raw.startsWith("__poll__:")) return { text: "Sondage", isAudio: false };
  return { text: raw.length > 55 ? raw.slice(0, 55) + "…" : raw, isAudio: false };
}

/* ── OSM tile math ── */
function osmTileInfo(lat: number, lng: number, zoom: number) {
  const n   = Math.pow(2, zoom);
  const tx  = (lng + 180) / 360 * n;
  const rad = lat * Math.PI / 180;
  const ty  = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n;
  return {
    tileX: Math.floor(tx),
    tileY: Math.floor(ty),
    pxX  : (tx - Math.floor(tx)) * 256,   // pixel offset within center tile
    pxY  : (ty - Math.floor(ty)) * 256,
  };
}

/* ── MapThumbnail — OpenStreetMap tiles, properly centred on the coordinate ── */
function MapThumbnail({ lat, lng }: { lat: number; lng: number }) {
  const zoom = 14;
  const { tileX, tileY, pxX, pxY } = osmTileInfo(lat, lng, zoom);
  const [loaded, setLoaded] = useState(0);
  const [errors, setErrors] = useState(0);
  const TOTAL = 9; // 3×3 tile grid

  /* The 3×3 grid spans 768×768 px.
     Our coordinate sits at (256 + pxX, 256 + pxY) within that grid.
     We want it at the centre of the 300×150 viewport:  (150, 75).
     So we shift the grid by (150 − (256+pxX), 75 − (256+pxY)).           */
  const offsetX = Math.round(150 - (256 + pxX));
  const offsetY = Math.round(75  - (256 + pxY));

  const allLoaded = loaded >= TOTAL;
  const allError  = errors >= TOTAL;

  /* Subdomains a/b/c distribute load across OSM mirrors */
  const sub = (x: number, y: number) => ["a","b","c"][(x + y) % 3];

  return (
    <div style={{ position:"relative", width:"100%", height:140, overflow:"hidden", background:"#DCFCE7" }}>

      {/* ── Shimmer skeleton ── */}
      {!allLoaded && !allError && (
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(90deg,#DCFCE7 25%,#DCFCE7 50%,#DCFCE7 75%)",
          backgroundSize:"200% 100%",
          animation:"map-shimmer 1.6s ease-in-out infinite" }}/>
      )}

      {/* ── 3×3 OSM tile grid ── */}
      {!allError && (
        <div style={{ position:"absolute", width:768, height:768,
          transform:`translate(${offsetX}px,${offsetY}px)`,
          opacity: allLoaded ? 1 : 0, transition:"opacity 0.35s" }}>
          {([-1,0,1] as const).map(dy =>
            ([-1,0,1] as const).map(dx => {
              const tx = tileX + dx;
              const ty = tileY + dy;
              return (
                <img
                  key={`${tx}-${ty}`}
                  src={`https://${sub(tx,ty)}.tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`}
                  width={256} height={256} decoding="async"
                  style={{ position:"absolute", left:(dx+1)*256, top:(dy+1)*256,
                    imageRendering:"crisp-edges", display:"block" }}
                  onLoad ={() => setLoaded(n => n + 1)}
                  onError={() => setErrors(n => n + 1)}
                />
              );
            })
          )}
        </div>
      )}

      {/* ── Error fallback ── */}
      {allError && (
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(160deg,#052e16,var(--bp-primary-dark))",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
          <svg viewBox="0 0 64 64" width="56" height="56" opacity={0.55}>
            <line x1="0" y1="32" x2="64" y2="32" stroke="var(--bp-primary)" strokeWidth="3" opacity={0.6}/>
            <line x1="32" y1="0" x2="32" y2="64" stroke="var(--bp-primary)" strokeWidth="2" opacity={0.4}/>
            <line x1="0" y1="18" x2="64" y2="46" stroke="var(--bp-primary)" strokeWidth="1.5" opacity={0.3}/>
            <rect x="8"  y="8"  width="16" height="12" rx="2" fill="#BBF7D0" opacity={0.4}/>
            <rect x="40" y="14" width="14" height="10" rx="2" fill="#BBF7D0" opacity={0.3}/>
            <rect x="10" y="40" width="18" height="14" rx="2" fill="#BBF7D0" opacity={0.35}/>
            <rect x="38" y="42" width="12" height="12" rx="2" fill="#BBF7D0" opacity={0.3}/>
          </svg>
          <span style={{ color:"rgba(255,255,255,0.72)", fontSize:11, fontWeight:600 }}>
            Carte non disponible
          </span>
        </div>
      )}

      {/* ── Red pin — always centred ── */}
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
        justifyContent:"center", pointerEvents:"none" }}>
        <svg viewBox="0 0 24 30" width="30" height="37"
          style={{ filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}>
          <path d="M12 0C7.16 0 3.25 3.91 3.25 8.75c0 6.56 8.75 16.25 8.75 16.25s8.75-9.69 8.75-16.25C20.75 3.91 16.84 0 12 0z"
            fill="#EF4444"/>
          <circle cx="12" cy="8.75" r="3.5" fill="#fff" opacity={0.9}/>
        </svg>
      </div>

      {/* ── Bottom gradient for readability ── */}
      {allLoaded && !allError && (
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:32,
          background:"linear-gradient(to top,rgba(0,0,0,0.25),transparent)" }}/>
      )}

      {/* ── OSM attribution (required by tile usage policy) ── */}
      {allLoaded && !allError && (
        <div style={{ position:"absolute", bottom:2, right:4,
          background:"rgba(255,255,255,0.75)", borderRadius:3,
          fontSize:8, padding:"1px 4px", color:"#333", pointerEvents:"none" }}>
          © OpenStreetMap
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   GREEN-PARTICLE DELETE EFFECT — matches BrutePawa mockup:
   particles fly upper-right from the bubble, bubble blurs+fades,
   then messages reflow naturally.
   Canvas extends right (+160px) and up (−100px) of the bubble.
   No viewport math — works on all PWA / mobile browsers.
══════════════════════════════════════════════════════════════ */
type DustRect = { left: number; top: number; width: number; height: number };

// Canvas geometry relative to the bubble (px)
const _DL  = 24;   // extends left
const _DR  = 160;  // extends right  (particles go upper-right)
const _DT  = 110;  // extends above
const _DB  = 14;   // extends below

function DustEffect({
  rect,
  mine,
  onComplete,
}: {
  rect: DustRect;
  mine: boolean;
  onComplete: () => void;
}) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    const parent = canvas.parentElement;
    const bw = parent ? parent.offsetWidth  : rect.width;
    const bh = parent ? parent.offsetHeight : rect.height;

    // Logical canvas dimensions
    const logW = bw + _DL + _DR;
    const logH = bh + _DT + _DB;

    canvas.width  = Math.max(1, logW) * dpr;
    canvas.height = Math.max(1, logH) * dpr;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Bubble top-left corner in canvas space
    const BX = _DL;
    const BY = _DT;

    const bubbleC = mine ? "#C8E6B2" : "#ffffff";
    const GREENS  = [
      "var(--bp-primary)","var(--bp-primary)","var(--bp-primary-dark)","#4ADE80",
      "#86EFAC","#BBF7D0","#6EE7A0","#34D399","#dcfce7",
    ];

    // Total animation time
    const DURATION = 920;

    type Particle = {
      ox: number; oy: number;
      vx: number; vy: number;  // unit: bubble-widths/s (scaled by bw)
      r:  number;
      color: string;
      startAt: number;
    };

    // 360 particles: mostly upper-right (−135° to +20°, centred ~−45°)
    const N = 360;
    const particles: Particle[] = Array.from({ length: N }, () => {
      const bx = Math.random() * bw;
      const by = Math.random() * bh;
      // Centre on −45° (upper-right diagonal) ± 70°
      const angle = -Math.PI * 0.25 + (Math.random() - 0.5) * Math.PI * 0.85;
      const speed = 0.28 + Math.random() * 0.95;
      return {
        ox:      BX + bx,
        oy:      BY + by,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed,
        r:       0.8 + Math.random() * 2.6,
        color:   GREENS[Math.floor(Math.random() * GREENS.length)],
        startAt: Math.random() * 0.42,
      };
    });

    let t0: number | null = null;
    let raf: number;
    let done = false;

    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / DURATION, 1);

      ctx.clearRect(0, 0, logW, logH);

      // ── Bubble: fade + very slight scale-down (matches stage 2→4) ──
      const bAlpha = Math.max(0, 1 - p / 0.52);
      if (bAlpha > 0.004) {
        const scale  = 1 - (1 - bAlpha) * 0.04;        // shrinks ≤4%
        const cx     = BX + bw / 2;
        const cy     = BY + bh / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha = bAlpha;
        ctx.fillStyle   = bubbleC;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(BX, BY, bw, bh, 18);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.rect(BX, BY, bw, bh);
          ctx.fill();
        }
        ctx.restore();
      }

      // ── Green particles burst upper-right ──
      particles.forEach(px => {
        if (p < px.startAt) return;
        const lp = (p - px.startAt) / (1 - px.startAt);
        // easeOut distance + fade
        const dist  = lp * lp * 0.5 + lp * 0.5;       // ease-out
        const a     = Math.max(0, Math.pow(1 - lp, 0.58));
        if (a < 0.01) return;
        ctx.globalAlpha = a;
        ctx.fillStyle   = px.color;
        ctx.beginPath();
        ctx.arc(
          px.ox + px.vx * bw * dist,
          px.oy + px.vy * bw * dist,
          px.r,
          0, Math.PI * 2,
        );
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        if (!done) { done = true; onCompleteRef.current(); }
      }
    };

    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); if (!done) { done = true; } };
  }, []); // eslint-disable-line

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "absolute",
        left:          -_DL,
        top:           -_DT,
        width:         `calc(100% + ${_DL + _DR}px)`,
        height:        `calc(100% + ${_DT + _DB}px)`,
        pointerEvents: "none",
        zIndex:        20,
        display:       "block",
      }}
    />
  );
}

/* Module-level cache — waveform is pure/deterministic, no need to recompute */
const _wfCache = new Map<number, number[]>();
function voiceWaveform(seed: number, bars = 36): number[] {
  const key = seed * 1000 + bars;
  if (_wfCache.has(key)) return _wfCache.get(key)!;
  const result = Array.from({ length: bars }, (_, i) => {
    const t = i / bars;
    const envelope = 0.35 + 0.65 * Math.pow(Math.sin(t * Math.PI), 0.65);
    const v = Math.abs(Math.sin(seed * 0.071 + i * 1.31)) * 0.38
            + Math.abs(Math.sin(i * 0.87  + seed * 0.193)) * 0.32
            + Math.abs(Math.sin(i * 2.13  + seed * 0.051)) * 0.18
            + Math.abs(Math.sin(i * 3.77  + seed * 0.11))  * 0.12;
    return Math.max(0.07, Math.min(1, v * envelope + 0.06));
  });
  _wfCache.set(key, result);
  return result;
}

type Overlay = "none" | "info" | "attach" | "contact-options" | "contact-mute" | "contact-search" | "contact-delete" | "contact-block" | "contact-report" | "contact-addfriend" | "contact-addgroup";

/* ── Module-level caches: survive component unmount/remount (navigation) ── */
const _msgCache: Record<number, Message[]> = {};
const _uploadsCache = new Map<number, MediaUploadState>();

export default function Messages({ initialUserId, initialGroupId }: { initialUserId?: number; initialGroupId?: number }) {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const meId = currentUser.id ?? 0;

  const [activeConv, setActiveConv]   = useState<number | null>(initialUserId ?? null);
  const [messages, setMessages]       = useState<Record<number, Message[]>>(() => ({..._msgCache}));
  const [convList, setConvList]       = useState<NormConv[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState<Record<number, boolean>>({});
  const [allUsers, setAllUsers]       = useState<PublicUser[]>([]);
  const [convPresence, setConvPresence] = useState<Record<number, {online:boolean;lastSeenAt:string|null}>>({});
  const [newMsg, setNewMsg]           = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
              const [search, setSearch]           = useState("");
  const [overlay, setOverlay]         = useState<Overlay>("none");

  const [selectionMode, setSelectionMode]       = useState(false);
  const [selectedMsgs, setSelectedMsgs]         = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteForAll, setDeleteForAll]         = useState(false);
  /* Dust-delete: msgId → bounding rect captured just before animation */
  const [dustingMsgs, setDustingMsgs]           = useState<Map<number, DustRect>>(new Map());
  const [presence, setPresence] = useState<{ online: boolean; lastSeenAt: string | null }>({ online: false, lastSeenAt: null });
  const [presenceTick, setPresenceTick] = useState(0);

  const [contactInfo, setContactInfo]             = useState<ContactInfo | null>(null);
  const [contactInfoLoading, setContactInfoLoading] = useState(false);
  const [muteChoice, setMuteChoice]               = useState<"8h" | "1w" | "always">("8h");
  const [reportReason, setReportReason]           = useState("");
  const [reportDesc, setReportDesc]               = useState("");
  const [showInfoAbout, setShowInfoAbout]         = useState(false);
  const [showInfoSettings, setShowInfoSettings]   = useState(false);
  const [showInfoMenu, setShowInfoMenu]           = useState(false);
  const [reportSending, setReportSending]         = useState(false);
  const [contactSearchQ, setContactSearchQ]       = useState("");
  const [contactSearchResults, setContactSearchResults] = useState<{ id: number; text: string; createdAt: string; fromMe: boolean }[]>([]);
  const [contactSearchLoading, setContactSearchLoading] = useState(false);
  const [addGroupList, setAddGroupList]           = useState<{ id: number; name: string; avatarUrl: string | null }[]>([]);
  const [addGroupLoading, setAddGroupLoading]     = useState(false);
  const [addGroupSearch, setAddGroupSearch]       = useState("");

  const [callOverlay, setCallOverlay]             = useState<"none"|"options"|"mute"|"search"|"addfriend"|"addgroup"|"block"|"report"|"delete">("none");
  const [callMuteChoice, setCallMuteChoice]       = useState<"8h"|"1w"|"always">("8h");
  const [callReportReason, setCallReportReason]   = useState("");
  const [callReportDesc, setCallReportDesc]       = useState("");
  const [callReportSending, setCallReportSending] = useState(false);
  const [callAddGroupList, setCallAddGroupList]   = useState<{id:number;name:string;avatarUrl:string|null}[]>([]);
  const [callAddGroupSearch, setCallAddGroupSearch] = useState("");
  const [screenShareStep, setScreenShareStep]     = useState<"none"|"confirm"|"settings"|"stop-confirm">("none");
  const [screenShareSound, setScreenShareSound]   = useState(true);
  const [screenShareTouches, setScreenShareTouches] = useState(false);

  const [chatGroups, setChatGroups]         = useState<ChatGroupConv[]>([]);
  const [activeGroupId, setActiveGroupId]   = useState<number | null>(null);

  useEffect(() => {
    const isConversationOpen = activeConv !== null || activeGroupId !== null;
    document.body.classList.toggle("bp-chat-fullscreen", isConversationOpen);
    return () => document.body.classList.remove("bp-chat-fullscreen");
  }, [activeConv, activeGroupId]);
  const [groupMsgs, setGroupMsgs]           = useState<Record<number, GroupMsg[]>>({});
  const [groupInfo, setGroupInfo]           = useState<ApiChatGroupInfo | null>(null);
  const [showGroupInfo, setShowGroupInfo]   = useState(false);
  const [groupNewMsg, setGroupNewMsg]       = useState("");
  const groupActivity = useGroupActivity(activeGroupId, groupNewMsg);
  const [dismissedAddBanner, setDismissedAddBanner]   = useState<Set<number>>(new Set());
  const [dismissedInfoPanel, setDismissedInfoPanel]   = useState<Set<number>>(new Set());

  const [groupWizard, setGroupWizard]           = useState<"none" | "members" | "name">("none");
  const [groupWizardType, setGroupWizardType]   = useState<"group" | "channel">("group");
  const [wizardMembers, setWizardMembers]       = useState<Set<number>>(new Set());
  const [wizardGroupName, setWizardGroupName]   = useState("");
  const [wizardSearch, setWizardSearch]         = useState("");
  const [wizardCreating, setWizardCreating]     = useState(false);
  const [autoDeleteOption, setAutoDeleteOption] = useState("Désactivée");
  const [showAutoDeletePopup, setShowAutoDeletePopup] = useState(false);
  const [autoDelPopupPos, setAutoDelPopupPos]         = useState({ top: 0, right: 16 });
  const autoDelBtnRef = useRef<HTMLDivElement>(null);
  const [showGrpMenu, setShowGrpMenu]         = useState(false);
  const [showGrpSearch, setShowGrpSearch]     = useState(false);
  const [grpSearchQ, setGrpSearchQ]           = useState("");
  const [grpSearchIdx, setGrpSearchIdx]       = useState(0);
  const [showClearHist, setShowClearHist]     = useState(false);
  const [showLeaveGrp, setShowLeaveGrp]       = useState(false);
  const [leaveDeleteAll, setLeaveDeleteAll]   = useState(false);
  const [showGrpInfoMenu, setShowGrpInfoMenu]       = useState(false);
  const [showAutoDelSubmenu, setShowAutoDelSubmenu] = useState(false);
  const [autoDelOption, setAutoDelOption]           = useState<"off"|"1d"|"1w"|"1m"|"custom">("off");
  const [showGrpInfoSearch, setShowGrpInfoSearch]   = useState(false);
  const [grpInfoSearchQ, setGrpInfoSearchQ]         = useState("");
  const [showAddToHomeDlg, setShowAddToHomeDlg]     = useState(false);
  const [showDeleteQuitDlg, setShowDeleteQuitDlg]   = useState(false);
  const [deleteQuitAll, setDeleteQuitAll]           = useState(false);
  const [showGrpEdit, setShowGrpEdit]               = useState(false);
  const [grpEditName, setGrpEditName]               = useState("");
  const [grpEditDesc, setGrpEditDesc]               = useState("");
  const [grpEditSaving, setGrpEditSaving]           = useState(false);
  const [grpEditToast, setGrpEditToast]             = useState(false);
  /* ─── Group sub-pages ─── */
  const [showGrpParamType, setShowGrpParamType]     = useState(false);
  const [grpTypePublic, setGrpTypePublic]           = useState(false);
  const [showGrpMembers, setShowGrpMembers]         = useState(false);
  const [grpMemberMenu, setGrpMemberMenu]           = useState<number|null>(null);
  const [grpHideMembers, setGrpHideMembers]         = useState(false);
  const [showGrpAdmins, setShowGrpAdmins]           = useState(false);
  const [grpAntiSpam, setGrpAntiSpam]               = useState(false);
  const [showGrpLinks, setShowGrpLinks]             = useState(false);
  const [showGrpPerms, setShowGrpPerms]             = useState(false);
  const [grpPerms, setGrpPerms]                     = useState({ sendMsgs:true, sendMedia:true, addUsers:true, pinMsgs:true, modTitles:true, modExchange:true });
  const [grpChargeStars, setGrpChargeStars]         = useState(false);
  const [grpStarPrice, setGrpStarPrice]             = useState(190);
  const [showGrpReactions, setShowGrpReactions]     = useState(false);
  const [grpReactMode, setGrpReactMode]             = useState<"all"|"some"|"none">("some");
  const [grpReactEmojis, setGrpReactEmojis]         = useState<Record<string,boolean>>({"❤️":true,"👍":true,"👎":false,"🔥":false,"🥰":false,"👏":false,"😊":false,"🎉":false,"🤩":false,"😢":false,"🤮":false});
  const [showGrpTopics, setShowGrpTopics]           = useState(false);
  const [grpTopicsOn, setGrpTopicsOn]               = useState(false);
  const [grpInviteLinks, setGrpInviteLinks]         = useState<ApiGroupInviteLink[]>([]);
  const [grpLinkMenu, setGrpLinkMenu]               = useState<number|null>(null);
  const [grpAdminMenu, setGrpAdminMenu]             = useState<number|null>(null);
  const [grpAddAdminOpen, setGrpAddAdminOpen]       = useState(false);
  const [grpAddMembersOpen, setGrpAddMembersOpen]   = useState(false);
  const [grpAllUsers, setGrpAllUsers]               = useState<PublicUser[]>([]);
  const [grpMembersData, setGrpMembersData]         = useState<import("../lib/api").ApiChatGroupMembersGrouped | null>(null);
  const grpPriceTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const [showGrpStats, setShowGrpStats]             = useState(false);
  const [grpStatsTab, setGrpStatsTab]               = useState<"stats"|"boosts">("stats");
  const [showGrpAllActions, setShowGrpAllActions]   = useState(false);
  const [showGrpInfoMuteSheet, setShowGrpInfoMuteSheet] = useState(false);
  /* ─── Group audit log ─── */
  const [showGrpAuditLog, setShowGrpAuditLog]       = useState(false);
  const [grpAuditLog, setGrpAuditLog]               = useState<GroupAuditEntry[]>([]);
  const [grpAuditFilter, setGrpAuditFilter]         = useState<string>("all");
  const [grpAuditLoading, setGrpAuditLoading]       = useState(false);
  /* ─── Permissions extras ─── */
  const [grpSlowMode, setGrpSlowMode]               = useState(0); // 0=Aucun,5,10,30,60,300,900,3600
  const [grpNoRestrictBoosters, setGrpNoRestrictBoosters] = useState(false);
  const [showGrpBanned, setShowGrpBanned]           = useState(false);
  const [showGrpBanPicker, setShowGrpBanPicker]     = useState(false);
  const [grpBanSearch, setGrpBanSearch]             = useState("");
  const [grpExceptions, setGrpExceptions]           = useState<{id:number;name:string;initials:string;color:string;avatarUrl?:string|null}[]>([]);
  const [grpExceptionMenu, setGrpExceptionMenu]     = useState<number|null>(null);
  /* ─── Modifier extras ─── */
  const [grpHistoriqueVisible, setGrpHistoriqueVisible] = useState(true);
  const [showGrpHistoriqueSheet, setShowGrpHistoriqueSheet] = useState(false);
  const [showGrpApparence, setShowGrpApparence]     = useState(false);
  const [grpAddMemberSearch, setGrpAddMemberSearch] = useState("");
  const [grpApparenceColor, setGrpApparenceColor]   = useState("");
  /* ─── Invite links extended UI ─── */
  const [showGrpCreateLink, setShowGrpCreateLink]   = useState(false);
  const [showGrpLinkCreated, setShowGrpLinkCreated] = useState(false);
  const [showGrpLinkStats, setShowGrpLinkStats]     = useState(false);
  const [showGrpLinkQR, setShowGrpLinkQR]           = useState(false);
  const [showGrpLinkShare, setShowGrpLinkShare]     = useState(false);
  const [showGrpLinkEdit, setShowGrpLinkEdit]       = useState(false);
  const [showGrpLinkRevoke, setShowGrpLinkRevoke]   = useState(false);
  const [showGrpLinkManage, setShowGrpLinkManage]   = useState(false);
  const [activeLinkId, setActiveLinkId]             = useState<number|null>(null);
  const [newLinkType, setNewLinkType]               = useState<"unlimited"|"uses"|"duration"|"both">("unlimited");
  const [newLinkName, setNewLinkName]               = useState("");
  const [newLinkMaxUses, setNewLinkMaxUses]         = useState("100");
  const [newLinkExpiry, setNewLinkExpiry]           = useState("");
  const [newLinkCreating, setNewLinkCreating]       = useState(false);
  const [createdLink, setCreatedLink]               = useState<ApiGroupInviteLink|null>(null);
  const [linkStats, setLinkStats]                   = useState<ApiGroupInviteLinkStats|null>(null);
  const [linkStatsLoading, setLinkStatsLoading]     = useState(false);
  const [linkManageFilter, setLinkManageFilter]     = useState<"all"|"active"|"revoked"|"expired">("all");
  const [linkEditName, setLinkEditName]             = useState("");
  const [linkEditType, setLinkEditType]             = useState("unlimited");
  const [linkEditMaxUses, setLinkEditMaxUses]       = useState("100");
  const [linkEditExpiry, setLinkEditExpiry]         = useState("");
  const [linkEditSaving, setLinkEditSaving]         = useState(false);
  const [grpLinkCopied, setGrpLinkCopied]          = useState(false);
  /* ─── Channel wizard ─── */
  const [chWiz, setChWiz]                     = useState<"none"|"info"|"type"|"members">("none");
  const [chName, setChName]                   = useState("");
  const [chDesc, setChDesc]                   = useState("");
  const [chType, setChType]                   = useState<"public"|"private">("public");
  const [chLink, setChLink]                   = useState("");
  const [chLinkAvail, setChLinkAvail]         = useState<null|"ok"|"err">(null);
  const [chMembers, setChMembers]             = useState<Set<number>>(new Set());
  const [chSearch, setChSearch]               = useState("");
  const [chConvs, setChConvs]                 = useState<{id:number;name:string;desc:string;type:"public"|"private";link:string;members:number[];admins:number[];msgs:{id:number;text:string;time:string}[]}[]>([]);
  const [activeChId, setActiveChId]           = useState<number|null>(null);
  const [chMenuOpen, setChMenuOpen]           = useState(false);
  const [chViewPage, setChViewPage]           = useState<"chat"|"edit"|"members">("chat");
  const [chEditName, setChEditName]           = useState("");
  const [chEditDesc, setChEditDesc]           = useState("");
  const [chEditLink, setChEditLink]           = useState("");
  const [chEditType, setChEditType]           = useState<"public"|"private">("public");
  const [chEditLinkAvail, setChEditLinkAvail] = useState<null|"ok"|"err">(null);
  const [chInput, setChInput]                 = useState("");
  /* ─── Broadcast ─── */
  const [showBroadcast, setShowBroadcast]     = useState(false);
  const [bcSelected, setBcSelected]           = useState<Set<number>>(new Set());
  const [bcSearch, setBcSearch]               = useState("");
  const [bcSearchMode, setBcSearchMode]       = useState(false);
  const [bcConvs, setBcConvs]                 = useState<{ id: number; recipients: number[]; msgs: {id:number;text:string;time:string;mine:boolean}[] }[]>([]);
  const [activeBcId, setActiveBcId]           = useState<number|null>(null);
  const [bcInput, setBcInput]                 = useState("");
  const [apiBcLists, setApiBcLists]           = useState<{ id: number; name: string; emoji: string; color: string; recipientCount: number; updatedAt: string }[]>([]);
  const [apiBcReceived, setApiBcReceived]     = useState<{ id: number; name: string; emoji: string; color: string; ownerName: string; unreadCount: number; lastMessage: { content: string; createdAt: string } | null }[]>([]);
  const [fabOpen, setFabOpen]   = useState(false);
  const [inboxTab, setInboxTab] = useState<"all" | "unread" | "groups">("all");
  const [showInboxSearch, setShowInboxSearch] = useState(false);
  const [settingsPage, setSettingsPage] = useState<"none"|"main"|"status"|"notifs"|"invitations"|"archive"|"privacy">("none");
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [notifMsgs, setNotifMsgs] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifPreview, setNotifPreview] = useState(false);
  const [notifOffline, setNotifOffline] = useState(false);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [invitTab, setInvitTab] = useState<"known"|"spam">("known");
  const [msgRequests, setMsgRequests] = useState<MessageRequest[]>([]);

  const [showConvMenu, setShowConvMenu]       = useState(false);
  const [showNotifSub, setShowNotifSub]       = useState(false);
  const [showDeleteConv, setShowDeleteConv]   = useState(false);
  const [showWallpaper, setShowWallpaper]     = useState(false);
  const [convWallpaper, setConvWallpaper]     = useState<string | null>(null);
  const [convThemeKey, setConvThemeKey]       = useState<ThemeKey>("bp-green");
  const [pendingThemeKey, setPendingThemeKey] = useState<ThemeKey>("bp-green");
  const [convWpKey, setConvWpKey]             = useState<WallpaperKey>("none");
  const [pendingWpKey, setPendingWpKey]       = useState<WallpaperKey>("none");

  // Restore theme per conversation; wallpaper always defaults to bp-default (never restore old photo wallpapers)
  useEffect(() => {
    if (!activeConv) return;
    const savedTheme = localStorage.getItem(`bp_theme_${activeConv}`) as ThemeKey | null;
    setConvThemeKey(savedTheme && CONV_THEMES[savedTheme] ? savedTheme : "bp-green");
    // Always reset wallpaper to bp-default — ignore any previously saved wallpaper key
    setConvWpKey("none");
    setConvWallpaper(null);
  }, [activeConv]);
  const [showChatSearch, setShowChatSearch]   = useState(false);
  const [chatSearchQ, setChatSearchQ]         = useState("");
  const [chatSearchIdx, setChatSearchIdx]     = useState(0);
  const [longPressMsg, setLongPressMsg]       = useState<number | null>(null);
  const [showMicTip, setShowMicTip]           = useState(false);

  const [isOnline, setIsOnline]         = useState(navigator.onLine);
  const [isRecording, setIsRecording]   = useState(false);
  const [recSeconds, setRecSeconds]     = useState(0);
  const [recDragX, setRecDragX]         = useState(0);
  const [recDragY, setRecDragY]         = useState(0);
  const [recLocked, setRecLocked]       = useState(false);
  const [recPaused, setRecPaused]       = useState(false);
  const [recLiveBars, setRecLiveBars]   = useState<number[]>(Array(28).fill(5));
  const [playingAudioId, setPlayingAudioId] = useState<number|null>(null);
  const [audioProgress, setAudioProgress]   = useState(0);
  const [voiceSpeed, setVoiceSpeed]         = useState<1|1.5|2>(1);
  const [vpHeight, setVpHeight]         = useState<number | null>(null);
  const [vpOffset, setVpOffset]         = useState(0);
  const [peerTyping, setPeerTyping]     = useState<{ typing: boolean; activity: string }>({ typing: false, activity: "typing" });
  const [convTypingMap, setConvTypingMap] = useState<Record<number, boolean>>({});
  const [attachSheet, setAttachSheet]   = useState(false);
  const [attachPage, setAttachPage]     = useState<"none"|"poll"|"event"|"contacts"|"ai">("none");
  const mediaUploadsRef = useRef<Map<number, MediaUploadState>>(new Map(_uploadsCache));
  const [mediaUploads, setMediaUploads] = useState<Map<number, MediaUploadState>>(() => new Map(_uploadsCache));
  const [locationGeo, setLocationGeo] = useState<Record<string, { city: string; district: string }>>({});
  const [aiPrompt, setAiPrompt]         = useState("");
  const [aiLoading, setAiLoading]       = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef  = useRef<HTMLInputElement>(null);
  const docInputRef     = useRef<HTMLInputElement>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions]   = useState<string[]>(["", ""]);
  const [pollMultiple, setPollMultiple] = useState(true);
  const [pollCreating, setPollCreating] = useState(false);
  const [eventName, setEventName]       = useState("");
  const [eventDesc, setEventDesc]       = useState("");
  const [eventDate, setEventDate]       = useState(new Date().toLocaleDateString("fr",{day:"numeric",month:"long",year:"numeric"}));
  const [eventTime, setEventTime]       = useState("14:00");
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const longPressTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeGroupRef    = useRef<number | null>(null);
  const groupBottomRef    = useRef<HTMLDivElement>(null);
  const bottomRef         = useRef<HTMLDivElement>(null);
  const remoteAudioRef    = useRef<HTMLAudioElement>(null);
  const voicePlayerRef    = useRef<HTMLAudioElement>(null);
  const recCancelledRef   = useRef(false);
  const recDragStartRef   = useRef<{x:number;y:number}|null>(null);
  const recIsDraggingRef  = useRef(false);
  const localVideoRef     = useRef<HTMLVideoElement>(null);
  const remoteVideoRef    = useRef<HTMLVideoElement>(null);
  const activeConvRef     = useRef<number | null>(null);
  const allUsersRef       = useRef<PublicUser[]>([]);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioChunksRef    = useRef<Blob[]>([]);
  const recTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const recSecondsRef     = useRef(0);
  const recSecsAtStopRef  = useRef(0);
  const recAudioCtxRef    = useRef<AudioContext | null>(null);
  const recAnalyserRef    = useRef<AnalyserNode | null>(null);
  const recAnimFrameRef   = useRef<number>(0);
  const voiceAudiosRef    = useRef<Map<number, HTMLAudioElement>>(new Map());
  const linkPreviewCacheRef = useRef<Map<string, LinkPreview | "loading" | null>>(new Map());
  const dmInputRef    = useRef<HTMLTextAreaElement>(null);
  const grpInputRef   = useRef<HTMLTextAreaElement>(null);
  const pickerTransitioningRef = useRef(false);


  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    const h = Math.min(el.scrollHeight, 130);
    el.style.height = h + "px";
    el.style.overflowY = el.scrollHeight > 130 ? "auto" : "hidden";
  };

  const waitForKeyboardDismiss = () => new Promise<void>((resolve) => {
    const viewport = window.visualViewport;
    if (!viewport || viewport.height >= window.innerHeight - 80) {
      window.requestAnimationFrame(() => resolve());
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const finish = () => {
      viewport.removeEventListener("resize", check);
      window.cancelAnimationFrame(frame);
      resolve();
    };
    const check = () => {
      const height = viewport.height;
      if (height >= window.innerHeight - 80 || performance.now() - startedAt > 450) {
        finish();
        return;
      }
      frame = window.requestAnimationFrame(check);
    };

    viewport.addEventListener("resize", check);
    frame = window.requestAnimationFrame(check);
  });

  const toggleEmojiPicker = async () => {
    if (pickerClosing || pickerTransitioningRef.current) return;
    const input = dmInputRef.current;
    if (showEmojiPicker) {
      pickerTransitioningRef.current = true;
      setPickerClosing(true);
      window.setTimeout(() => {
        setShowEmojiPicker(false);
        setPickerClosing(false);
        window.requestAnimationFrame(() => {
          input?.focus({ preventScroll: true });
          pickerTransitioningRef.current = false;
        });
      }, 180);
      return;
    }

    pickerTransitioningRef.current = true;
    input?.blur();
    await waitForKeyboardDismiss();
    setPickerClosing(false);
    setShowEmojiPicker(true);
    pickerTransitioningRef.current = false;
  };
  /* Stable ref so early useEffects can call doUpload without temporal dead zone */
  const doUploadRef = useRef<(id: number) => void>(() => {});
  const [linkPreviews, setLinkPreviews] = useState<Record<string, LinkPreview | null>>({});

  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { allUsersRef.current = allUsers; }, [allUsers]);
  useEffect(() => { Object.assign(_msgCache, messages); }, [messages]);
  useEffect(() => { _uploadsCache.clear(); mediaUploads.forEach((v, k) => _uploadsCache.set(k, v)); }, [mediaUploads]);

  /* ── Suivi réseau + retry des messages en attente ── */
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      /* Retry tous les messages texte "pending" */
      setMessages(prev => {
        const updated = { ...prev };
        for (const convId in updated) {
          updated[convId] = (updated[convId] ?? []).map(m => {
            if (m.mine && m.status === "pending" && m.text) {
              apiSendMessage(Number(convId), m.text)
                .then(() => setMessages(ms => ({
                  ...ms,
                  [convId]: (ms[convId] ?? []).map(x => x.id === m.id ? { ...x, status: "sent" as const } : x)
                })))
                .catch(() => {});
            }
            return m;
          });
        }
        return updated;
      });
      /* Reprendre tous les médias en attente (waiting) */
      const waiting: number[] = [];
      mediaUploadsRef.current.forEach((st, id) => {
        if (st.network === "waiting") waiting.push(id);
      });
      waiting.forEach(id => doUploadRef.current(id));
    };
    const goOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* ── Fetch link previews for visible messages ── */
  useEffect(() => {
    if (!activeConv) return;
    const msgs = messages[activeConv] ?? [];
    const seen = new Set<string>();
    for (const m of msgs) {
      if (!m.text) continue;
      URL_RE.lastIndex = 0;
      const match = URL_RE.exec(m.text);
      if (!match) continue;
      const raw = match[0];
      const url = normalizeUrl(raw);
      if (seen.has(url)) continue;
      seen.add(url);
      if (linkPreviewCacheRef.current.has(url)) continue;
      linkPreviewCacheRef.current.set(url, "loading");
      apiGetLinkPreview(url).then(preview => {
        linkPreviewCacheRef.current.set(url, preview);
        setLinkPreviews(p => ({ ...p, [url]: preview }));
      });
    }
  }, [activeConv, messages]);

  /* ── Deep-link: réagir aux changements de props (navigation SW) ── */
  useEffect(() => {
    if (initialUserId) {
      setActiveConv(initialUserId);
      setActiveGroupId(null);
    }
  }, [initialUserId]);

  useEffect(() => {
    if (initialGroupId) {
      setActiveGroupId(initialGroupId);
      setActiveConv(null);
    }
  }, [initialGroupId]);

  /* ── Persistance URL : mettre à jour l'URL quand la conversation active change ──
     Permet à F5 / pull-to-refresh de restaurer la bonne conversation.            */
  useEffect(() => {
    if (activeConv && !initialGroupId) {
      navigate(`/messages?userId=${activeConv}`);
    }
  }, [activeConv]);

  /* ── VisualViewport: shrink container when keyboard opens ── */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      setVpHeight(vv.height);
      setVpOffset(vv.offsetTop);
      // auto-scroll to last message when keyboard pushes content up
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior }), 50);
    };
    handler();
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => { vv.removeEventListener("resize", handler); vv.removeEventListener("scroll", handler); };
  }, []);

  const parseApiMsg = useCallback((m: import("../lib/api").ApiChatMessage) => {
    const time   = new Date(m.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    const date   = m.createdAt.slice(0, 10);
    const status = m.isRead ? "read" as const : m.isDelivered ? "delivered" as const : "sent" as const;
    const base   = { id: m.id, mine: m.fromUserId === meId, time, date, status };
    if (m.content.startsWith("__audio__:")) {
      const rest  = m.content.slice("__audio__:".length);
      const colon = rest.indexOf(":");
      const totalSecs = parseInt(rest.slice(0, colon), 10) || 0;
      const url   = rest.slice(colon + 1);
      const mins  = Math.floor(totalSecs / 60);
      const s     = totalSecs % 60;
      const dur   = `${mins}:${s.toString().padStart(2, "0")}`;
      return { ...base, text: "", attachment: { type: "audio" as const, label: url, extra: dur } };
    }
    if (m.content.startsWith("__location__:")) {
      const rest  = m.content.slice("__location__:".length);
      const proto = rest.indexOf("://");
      const sep   = rest.indexOf(":", proto !== -1 ? proto + 3 : 0);
      const url   = sep === -1 ? rest : rest.slice(0, sep);
      const extra = sep === -1 ? "" : rest.slice(sep + 1);
      return { ...base, text: "", attachment: { type: "location" as const, label: url, extra } };
    }
    if (m.content.startsWith("__contact__:")) {
      const userId = Number(m.content.slice("__contact__:".length));
      return { ...base, text: "", attachment: { type: "contact" as const, label: String(userId) } };
    }
    if (m.messageType === "poll" && m.pollId) {
      return { ...base, text: "", attachment: { type: "poll" as const, label: String(m.pollId) } };
    }
    if (m.content.startsWith("__poll__:")) {
      const pollId = Number(m.content.slice("__poll__:".length));
      return { ...base, text: "", attachment: { type: "poll" as const, label: String(pollId) } };
    }
    if (m.content.startsWith("__image__:")) {
      const rest  = m.content.slice("__image__:".length);
      const proto = rest.indexOf("://");
      const sep   = rest.indexOf(":", proto !== -1 ? proto + 3 : 0);
      const url   = sep === -1 ? rest : rest.slice(0, sep);
      const rem   = sep === -1 ? "" : rest.slice(sep + 1);
      const sep2  = rem.lastIndexOf(":");
      const extra = sep2 === -1 ? (rem || "photo") : rem.slice(0, sep2);
      const sizeN = sep2 === -1 ? NaN : Number(rem.slice(sep2 + 1));
      const size  = isNaN(sizeN) ? undefined : sizeN;
      const isLegacyBrutePawaSticker = url.includes("/stickers/brutepawa-") || extra.startsWith("brutepawa-");
      return {
        ...base,
        text: "",
        attachment: {
          type: isLegacyBrutePawaSticker ? "sticker" as const : "image" as const,
          label: url,
          extra,
          size,
        },
      };
    }
    if (m.content.startsWith("__sticker__:")) {
      const rest  = m.content.slice("__sticker__:".length);
      const proto = rest.indexOf("://");
      const sep   = rest.indexOf(":", proto !== -1 ? proto + 3 : 0);
      const url   = sep === -1 ? rest : rest.slice(0, sep);
      const rem   = sep === -1 ? "" : rest.slice(sep + 1);
      const sep2  = rem.lastIndexOf(":");
      const extra = sep2 === -1 ? (rem || "sticker.png") : rem.slice(0, sep2);
      const sizeN = sep2 === -1 ? NaN : Number(rem.slice(sep2 + 1));
      const size  = isNaN(sizeN) ? undefined : sizeN;
      return { ...base, text: "", attachment: { type: "sticker" as const, label: url, extra, size } };
    }
    if (m.content.startsWith("__doc__:")) {
      const rest  = m.content.slice("__doc__:".length);
      const proto = rest.indexOf("://");
      const sep   = rest.indexOf(":", proto !== -1 ? proto + 3 : 0);
      const url   = sep === -1 ? rest : rest.slice(0, sep);
      const rem   = sep === -1 ? "" : rest.slice(sep + 1);
      const sep2  = rem.lastIndexOf(":");
      const extra = sep2 === -1 ? (rem || "Document") : rem.slice(0, sep2);
      const sizeN = sep2 === -1 ? NaN : Number(rem.slice(sep2 + 1));
      const size  = isNaN(sizeN) ? undefined : sizeN;
      return { ...base, text: "", attachment: { type: "doc" as const, label: url, extra, size } };
    }
    return { ...base, text: m.content };
  }, [meId]);

  /* ── Attachment upload helper ── */
  const loadOlderMessages = useCallback(() => {
    if (!activeConv) return;
    const oldest = messages[activeConv]?.[0];
    if (!oldest) return;
    apiGetMessages(activeConv, oldest.id).then(({ messages: msgs, hasMore }) => {
      setMessages(prev => {
        const older      = msgs.map(m => parseApiMsg(m));
        const existing   = prev[activeConv] ?? [];
        const existingIds = new Set(existing.map(m => m.id));
        const newOlder   = older.filter(m => !existingIds.has(m.id));
        return { ...prev, [activeConv]: [...newOlder, ...existing] };
      });
      setHasMoreMessages(prev => ({ ...prev, [activeConv]: hasMore }));
    }).catch(() => {});
  }, [activeConv, messages, parseApiMsg]);

  const sendAttachMsg = useCallback((attachment: { type: "image"|"doc"|"location"|"audio"|"contact"; label: string; extra?: string }, text: string, encodedContent: string) => {
    if (!activeConv) return;
    const convId = activeConv;
    const tmpId = Date.now();
    const now  = new Date().toLocaleTimeString("fr", { hour:"2-digit", minute:"2-digit" });
    const date = new Date().toISOString().slice(0, 10);
    setMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] ?? []), { id: tmpId, text, mine: true, time: now, date, status: "pending" as const, attachment }],
    }));
    apiSendMessage(convId, encodedContent)
      .then(() => {
        setMessages(prev => ({ ...prev, [convId]: (prev[convId] ?? []).map(m => m.id === tmpId ? { ...m, status: "sent" as const } : m) }));
      })
      .catch(() => {
        setMessages(prev => ({ ...prev, [convId]: (prev[convId] ?? []).map(m => m.id === tmpId ? { ...m, status: "pending" as const } : m) }));
      });
  }, [activeConv]);

  /* ── Unified upload engine ── */
  const doUpload = useCallback(async (tmpId: number) => {
    const s = mediaUploadsRef.current.get(tmpId);
    if (!s) return;
    const { file, voiceBlob, voiceSecs, convId, localUrl } = s;

    /* If offline: set "waiting" state, abort — auto-resume on reconnect */
    if (!navigator.onLine) {
      const cur = mediaUploadsRef.current.get(tmpId);
      if (cur) {
        mediaUploadsRef.current.set(tmpId, { ...cur, network: "waiting", progress: 0, cancelFn: undefined });
        _uploadsCache.set(tmpId, mediaUploadsRef.current.get(tmpId)!);
        setMediaUploads(new Map(mediaUploadsRef.current));
      }
      return;
    }

    /* Reset to uploading */
    {
      const cur = mediaUploadsRef.current.get(tmpId);
      if (cur) {
        mediaUploadsRef.current.set(tmpId, { ...cur, network: "uploading", progress: 0, cancelFn: undefined });
        _uploadsCache.set(tmpId, mediaUploadsRef.current.get(tmpId)!);
        setMediaUploads(new Map(mediaUploadsRef.current));
      }
    }

    /* Speed / connectivity monitor */
    let lastProgress = 0;
    let slowTicks = 0;
    const speedTimer = setInterval(() => {
      const cur = mediaUploadsRef.current.get(tmpId);
      if (!cur || cur.network === "error" || cur.network === "waiting") { clearInterval(speedTimer); return; }
      if (!navigator.onLine) {
        cur.cancelFn?.();
        mediaUploadsRef.current.set(tmpId, { ...cur, network: "waiting", cancelFn: undefined });
        _uploadsCache.set(tmpId, mediaUploadsRef.current.get(tmpId)!);
        setMediaUploads(new Map(mediaUploadsRef.current));
        clearInterval(speedTimer);
        return;
      }
      if (cur.progress === lastProgress && cur.network === "uploading") {
        slowTicks++;
        if (slowTicks >= 2) { mediaUploadsRef.current.set(tmpId, { ...cur, network: "slow" }); setMediaUploads(new Map(mediaUploadsRef.current)); }
      } else {
        slowTicks = 0;
        if (cur.network === "slow") { mediaUploadsRef.current.set(tmpId, { ...cur, network: "uploading" }); setMediaUploads(new Map(mediaUploadsRef.current)); }
      }
      lastProgress = cur.progress;
    }, 2500);

    const upDone = () => { mediaUploadsRef.current.delete(tmpId); _uploadsCache.delete(tmpId); setMediaUploads(new Map(mediaUploadsRef.current)); };
    const upErr  = (n: "error" | "waiting" = "error") => {
      const cur = mediaUploadsRef.current.get(tmpId);
      if (cur) { mediaUploadsRef.current.set(tmpId, { ...cur, network: n, cancelFn: undefined }); _uploadsCache.set(tmpId, mediaUploadsRef.current.get(tmpId)!); setMediaUploads(new Map(mediaUploadsRef.current)); }
    };

    try {
      /* ── Voice upload ── */
      if (voiceBlob && voiceSecs !== undefined) {
        const { url } = await apiUploadVoice(voiceBlob, voiceSecs);
        clearInterval(speedTimer);
        const content = `__audio__:${voiceSecs}:${url}`;
        const sent = await apiSendMessage(convId, content);
        const now  = new Date(sent.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
        const date = sent.createdAt.slice(0, 10);
        const mins = Math.floor(voiceSecs / 60), ss = voiceSecs % 60;
        const dur  = `${mins}:${ss.toString().padStart(2, "0")}`;
        setTimeout(() => URL.revokeObjectURL(localUrl), 3000);
        setMessages(prev => ({
          ...prev,
          [convId]: (prev[convId] ?? []).map(m => m.id === tmpId ? {
            id: sent.id, text: "", mine: true, time: now, date, status: "sent" as const,
            attachment: { type: "audio" as const, label: url, extra: dur },
          } : m),
        }));
        upDone();
        return;
      }

      /* ── File upload (image / doc) ── */
      if (!file) { clearInterval(speedTimer); upErr(); return; }
      const kind: "image" | "doc" = file.type.startsWith("image/") ? "image" : "doc";
      const { promise, cancel } = apiUploadFileXHR(file, (loaded, total) => {
        const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
        const cur = mediaUploadsRef.current.get(tmpId);
        if (cur) { mediaUploadsRef.current.set(tmpId, { ...cur, progress: pct, network: cur.network === "slow" ? "slow" : "uploading" }); setMediaUploads(new Map(mediaUploadsRef.current)); }
      });
      const cur0 = mediaUploadsRef.current.get(tmpId);
      if (cur0) { mediaUploadsRef.current.set(tmpId, { ...cur0, cancelFn: cancel }); _uploadsCache.set(tmpId, mediaUploadsRef.current.get(tmpId)!); }

      const { url } = await promise;
      clearInterval(speedTimer);
      const prefix  = kind === "image" ? "__image__" : "__doc__";
      const encoded = `${prefix}:${url}:${file.name}:${file.size}`;
      setMessages(prev => ({
        ...prev,
        [convId]: (prev[convId] ?? []).map(m => m.id === tmpId ? { ...m, attachment: { ...m.attachment!, label: url, size: file.size } } : m),
      }));
      setTimeout(() => URL.revokeObjectURL(localUrl), 3000);
      const sent = await apiSendMessage(convId, encoded);
      setMessages(prev => ({ ...prev, [convId]: (prev[convId] ?? []).map(m => m.id === tmpId ? { ...m, id: sent.id, status: "sent" as const } : m) }));
      const doneSt = mediaUploadsRef.current.get(tmpId);
      if (doneSt) { mediaUploadsRef.current.set(tmpId, { ...doneSt, progress: 100 }); setMediaUploads(new Map(mediaUploadsRef.current)); }
      setTimeout(upDone, 1200);

    } catch (e) {
      clearInterval(speedTimer);
      if (e instanceof Error && e.message === "cancelled") {
        setMessages(prev => ({ ...prev, [convId]: (prev[convId] ?? []).filter(m => m.id !== tmpId) }));
        URL.revokeObjectURL(localUrl);
        upDone();
      } else {
        upErr("error");
      }
    }
  }, []);

  const retryUpload = useCallback((tmpId: number) => {
    const s = mediaUploadsRef.current.get(tmpId);
    if (!s) return;
    doUpload(tmpId);
  }, [doUpload]);

  const cancelUploadMsg = useCallback((tmpId: number) => {
    const s = mediaUploadsRef.current.get(tmpId);
    if (!s) return;
    s.cancelFn?.();
    mediaUploadsRef.current.delete(tmpId);
    _uploadsCache.delete(tmpId);
    setMediaUploads(new Map(mediaUploadsRef.current));
    setMessages(prev => {
      const convMsgs = prev[s.convId] ?? [];
      return { ...prev, [s.convId]: convMsgs.filter(m => m.id !== tmpId) };
    });
  }, []);

  /* Keep ref in sync so the online-event handler always calls the latest version */
  useEffect(() => { doUploadRef.current = doUpload; }, [doUpload]);

  const handleFileInput = useCallback(async (file: File, kind: "image" | "doc") => {
    setAttachSheet(false); setAttachPage("none");
    const convId = activeConv;
    if (!convId) return;
    const tmpId = Date.now();
    const now = new Date().toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    const localUrl = URL.createObjectURL(file);
    setMessages(prev => ({
      ...prev,
      [convId]: [...(prev[convId] ?? []), {
        id: tmpId, text: "", mine: true, time: now, status: "pending" as const,
        attachment: { type: kind, label: localUrl, extra: file.name, size: file.size }
      }],
    }));
    const initNet: MediaUploadState["network"] = navigator.onLine ? "uploading" : "waiting";
    const initState: MediaUploadState = { progress: 0, network: initNet, fileSize: file.size, file, localUrl, convId };
    mediaUploadsRef.current.set(tmpId, initState);
    _uploadsCache.set(tmpId, initState);
    setMediaUploads(new Map(mediaUploadsRef.current));
    doUpload(tmpId);
  }, [activeConv, doUpload]);

  const handleLocation = useCallback(() => {
    setAttachSheet(false); setAttachPage("none");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const url = `https://maps.google.com/?q=${lat},${lng}`;
        const extra = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        const encoded = `__location__:${url}:${extra}`;
        sendAttachMsg({ type: "location", label: url, extra }, "", encoded);
      },
      () => alert("Impossible d'accéder à la localisation. Autorisez la géolocalisation dans les paramètres du navigateur.")
    );
  }, [sendAttachMsg]);

  /* ── Reverse-geocoding for location messages ── */
  useEffect(() => {
    if (!activeConv) return;
    const msgs = messages[activeConv] ?? [];
    for (const m of msgs) {
      if (m.attachment?.type !== "location") continue;
      const coords = m.attachment.extra ?? "";
      if (!coords || locationGeo[coords] !== undefined) continue;
      const [lat, lng] = coords.split(",").map(Number);
      if (isNaN(lat) || isNaN(lng)) continue;
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`)
        .then(r => r.json())
        .then((data: { address?: Record<string,string> }) => {
          const addr = data.address ?? {};
          const city = addr.city || addr.town || addr.village || addr.county || "";
          const country = addr.country || "";
          const district = addr.suburb || addr.neighbourhood || addr.borough || addr.quarter || "";
          setLocationGeo(prev => ({
            ...prev,
            [coords]: { city: [city, country].filter(Boolean).join(", "), district },
          }));
        })
        .catch(() => {
          setLocationGeo(prev => ({ ...prev, [coords]: { city: "", district: "" } }));
        });
    }
  }, [activeConv, messages, locationGeo]);

  /* ── Peer typing / activity indicator ── */
  useEffect(() => {
    if (!activeConv) return;
    const poll = () => apiGetTyping(activeConv).then(t => setPeerTyping(t));
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [activeConv]);

  /* ── Typing indicator in conversation LIST (polls top convs when no active conv) ── */
  useEffect(() => {
    if (activeConv) return;
    const ids = convList.slice(0, 15).map(c => c.id);
    if (ids.length === 0) return;
    const poll = async () => {
      const results = await Promise.all(ids.map(id => apiGetTyping(id).then(t => ({ id, typing: t.typing })).catch(() => ({ id, typing: false }))));
      setConvTypingMap(prev => {
        const next = { ...prev };
        results.forEach(({ id, typing }) => { next[id] = typing; });
        return next;
      });
    };
    poll();
    const timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [activeConv, convList]);

  /* ── Broadcast audio-recording activity to peer ── */
  useEffect(() => {
    if (!isRecording || !activeConv) return;
    apiSendTyping(activeConv, "audio").catch(() => {});
    const id = setInterval(() => apiSendTyping(activeConv, "audio").catch(() => {}), 2000);
    return () => clearInterval(id);
  }, [isRecording, activeConv]);

  /* ── Voice recording helpers ── */
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      /*
       * Safari records audio as MP4/AAC, while Chromium usually records WebM/Opus.
       * Preserve the recorder's supported format instead of claiming every file is
       * WebM — an MP4 payload served as audio/webm will not play on iPhone.
       */
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find(type => MediaRecorder.isTypeSupported(type)) ?? "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recCancelledRef.current) { recCancelledRef.current = false; return; }
        const blob  = new Blob(audioChunksRef.current, {
          type: mr.mimeType || mimeType || "audio/webm",
        });
        const secs  = recSecsAtStopRef.current || recSecondsRef.current || 1;
        if (blob.size < 1000) return;
        const convId = activeConvRef.current;
        if (!convId) return;
        const mins = Math.floor(secs / 60);
        const s    = secs % 60;
        const dur  = `${mins}:${s.toString().padStart(2, "0")}`;
        const tmpId = Date.now();
        const tmpNow  = new Date().toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
        const tmpDate = new Date().toISOString().slice(0, 10);
        const blobUrl = URL.createObjectURL(blob);
        setMessages(prev => ({
          ...prev,
          [convId]: [...(prev[convId] ?? []), {
            id: tmpId, text: "", mine: true, time: tmpNow, date: tmpDate, status: "pending" as const,
            attachment: { type: "audio" as const, label: blobUrl, extra: dur },
          }],
        }));
        /* Queue in upload engine — auto-retry on reconnect, retry button on error */
        const initNet: MediaUploadState["network"] = navigator.onLine ? "uploading" : "waiting";
        const voiceState: MediaUploadState = {
          progress: 0, network: initNet, fileSize: blob.size,
          voiceBlob: blob, voiceSecs: secs, localUrl: blobUrl, convId,
        };
        mediaUploadsRef.current.set(tmpId, voiceState);
        _uploadsCache.set(tmpId, voiceState);
        setMediaUploads(new Map(mediaUploadsRef.current));
        doUpload(tmpId);
      };
      mr.start(100);
      mediaRecorderRef.current = mr;

      // Live waveform via Web Audio API
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        ctx.createMediaStreamSource(stream).connect(analyser);
        recAudioCtxRef.current  = ctx;
        recAnalyserRef.current  = analyser;
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
      } catch { /* AudioContext unavailable — bars will stay minimal */ }

      (document.activeElement as HTMLElement)?.blur();
      // Prevent Android long-press text selection cursor on the whole page
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
    recSecsAtStopRef.current = recSecondsRef.current;  // capture BEFORE clearing
    if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null; }
    if (recAnimFrameRef.current) { cancelAnimationFrame(recAnimFrameRef.current); recAnimFrameRef.current = 0; }
    recAudioCtxRef.current?.close();
    recAudioCtxRef.current  = null;
    recAnalyserRef.current  = null;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    // Restore text selection on the page
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

  const recGestureDown = (e: React.PointerEvent) => {
    recDragStartRef.current = { x: e.clientX, y: e.clientY };
    recIsDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const recGestureMove = (e: React.PointerEvent) => {
    if (!recIsDraggingRef.current || !recDragStartRef.current) return;
    setRecDragX(Math.min(0, e.clientX - recDragStartRef.current.x));
    setRecDragY(Math.min(0, e.clientY - recDragStartRef.current.y));
  };
  const recGestureUp = () => {
    if (!recIsDraggingRef.current) return;
    recIsDraggingRef.current = false;
    const dx = recDragX; const dy = recDragY;
    setRecDragX(0); setRecDragY(0);
    recDragStartRef.current = null;
    if (dx < -80) { cancelVoice(); }
    else if (dy < -80) { setRecLocked(true); }
  };

  const onNewMessage = useCallback((data: NewMessagePayload) => {
    const fromId = data.fromUserId;
    /* Parse the raw content (handles __audio__:, __image__:, __doc__:, etc.) */
    const parsed = parseApiMsg({
      id: data.id,
      content: data.content,
      fromUserId: data.fromUserId,
      toUserId: meId || 0,
      createdAt: data.createdAt,
      isRead: false,
      isDelivered: false,
      messageType: data.messageType,
      pollId: data.pollId,
    });
    setMessages(prev => ({ ...prev, [fromId]: [...(prev[fromId] ?? []), parsed] }));
    /* If the recipient has this conversation open right now, mark as read immediately */
    if (activeConvRef.current === fromId) {
      apiMarkMessagesRead(fromId);
    }
    /* Use human-readable preview for conversation list (not raw encoded content) */
    const preview = fmtConvPreview(data.content).text;
    setConvList(prev => {
      const exists = prev.find(c => c.id === fromId);
      if (exists) {
        return prev.map(c => c.id === fromId
          ? { ...c, lastMessage: preview, time: parsed.time, unread: activeConvRef.current === fromId ? 0 : c.unread + 1, lastMsgMine: false, lastMsgRead: false, lastMsgDelivered: false }
          : c);
      }
      const u = allUsersRef.current.find(x => x.id === fromId);
      const name = u ? `${u.firstName} ${u.lastName}` : `Utilisateur #${fromId}`;
      return [{
        id: fromId,
        user: { name, initials: mkInitials(name), color: CONV_COLORS[fromId % CONV_COLORS.length] },
        lastMessage: preview, unread: 1, time: parsed.time, lastMsgMine: false, lastMsgRead: false, lastMsgDelivered: false,
      }, ...prev];
    });
  }, [parseApiMsg]);

  const onMessageDelivered = useCallback((messageIds: number[]) => {
    const idSet = new Set(messageIds);
    setMessages(prev => {
      const next: typeof prev = {};
      for (const key of Object.keys(prev)) {
        const k = Number(key);
        next[k] = prev[k].map(m =>
          idSet.has(m.id) && m.status === "sent" ? { ...m, status: "delivered" as const } : m
        );
      }
      return next;
    });
  }, []);

  const onMessageRead = useCallback((messageIds: number[]) => {
    const idSet = new Set(messageIds);
    setMessages(prev => {
      const next: typeof prev = {};
      for (const key of Object.keys(prev)) {
        const k = Number(key);
        next[k] = prev[k].map(m =>
          idSet.has(m.id) && (m.status === "sent" || m.status === "delivered") ? { ...m, status: "read" as const } : m
        );
      }
      return next;
    });
  }, []);

  /* On SSE reconnect: re-fetch active conversation to sync any missed read/delivered events */
  const onSseReconnect = useCallback(() => {
    const convId = activeConvRef.current;
    if (!convId) return;
    apiGetMessages(convId).then(({ messages: freshMsgs }) => {
      setMessages(prev => {
        const existing = prev[convId] ?? [];
        const freshById = new Map(freshMsgs.map(m => [m.id, m]));
        const rank: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3 };
        const updated = existing.map(m => {
          const f = freshById.get(m.id);
          if (!f) return m;
          const freshStatus = f.isRead ? "read" as const : f.isDelivered ? "delivered" as const : "sent" as const;
          if ((rank[freshStatus] ?? 0) > (rank[m.status ?? ""] ?? 0)) return { ...m, status: freshStatus };
          return m;
        });
        return { ...prev, [convId]: updated };
      });
    }).catch(() => {});
  }, []);

  const sig = useCallSignaling(meId, onNewMessage, onMessageDelivered, onMessageRead, onSseReconnect);

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    // Always route remote audio through the dedicated <audio> element for both
    // audio and video calls — this is the most reliable path on Android Chrome.
    if (sig.remoteStream) {
      if (el.srcObject !== sig.remoteStream) { el.srcObject = sig.remoteStream; el.play().catch(() => {}); }
    } else { el.srcObject = null; }
  }, [sig.remoteStream, sig.callType]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (sig.localStream) {
      if (el.srcObject !== sig.localStream) { el.srcObject = sig.localStream; el.play().catch(() => {}); }
    } else { el.srcObject = null; }
  }, [sig.localStream]);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    if (sig.remoteStream) {
      if (el.srcObject !== sig.remoteStream) { el.srcObject = sig.remoteStream; el.play().catch(() => {}); }
    } else { el.srcObject = null; }
  }, [sig.remoteStream]);

  const activeUser   = activeConv ? (convList.find(c => c.id === activeConv)?.user ?? null) : null;
  const callPeerUser = sig.callPeerId ? (convList.find(c => c.id === sig.callPeerId)?.user
    ?? (() => {
      const u = allUsers.find(x => x.id === sig.callPeerId);
      if (!u) return null;
      const name = `${u.firstName} ${u.lastName}`;
      return { name, initials: mkInitials(name), color: CONV_COLORS[sig.callPeerId % CONV_COLORS.length], avatarUrl: u.avatarUrl ?? null, role: u.role };
    })()) : null;

  const currentMessages = activeConv ? (messages[activeConv] ?? []) : [];
  const filteredConvs   = convList.filter(c => c.user.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentMessages]);

  useEffect(() => {
    apiFetch("/broadcast").then(r => r.json()).then(setApiBcLists).catch(() => {});
    apiFetch("/broadcast/received").then(r => r.json()).then(setApiBcReceived).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([apiGetConversations(), apiGetUsers()])
      .then(([convs, users]) => {
        setAllUsers(users);
        const hiddenKey = "bp_hidden_convs";
        const hidden: number[] = JSON.parse(localStorage.getItem(hiddenKey) ?? "[]");
        const normalized: NormConv[] = convs
          .filter(c => !hidden.includes(c.userId))
          .map(c => {
            const u    = users.find(u => u.id === c.userId);
            const name = u ? `${u.firstName} ${u.lastName}` : `Utilisateur #${c.userId}`;
            return {
              id: c.userId,
              user: { name, initials: mkInitials(name), color: CONV_COLORS[c.userId % CONV_COLORS.length], avatarUrl: u?.avatarUrl ?? null, role: u?.role, badgeType: u?.badgeType ?? null, verified: u?.verified ?? false },
              lastMessage: c.lastMessage, unread: c.unreadCount,
              time: new Date(c.updatedAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }),
              lastMsgMine:      c.lastSenderId === meId,
              lastMsgRead:      c.lastMsgIsRead,
              lastMsgDelivered: c.lastMsgIsDelivered,
            };
          });
        if (initialUserId && !normalized.find(c => c.id === initialUserId)) {
          const u = users.find(u => u.id === initialUserId);
          if (u) {
            const name = `${u.firstName} ${u.lastName}`;
            normalized.unshift({ id: initialUserId, user: { name, initials: mkInitials(name), color: CONV_COLORS[initialUserId % CONV_COLORS.length], avatarUrl: u.avatarUrl, role: u.role, badgeType: u.badgeType ?? null, verified: u.verified ?? false }, lastMessage: "", unread: 0, time: "" });
          }
        }
        setConvList(normalized);
        // Batch-fetch presence for all convs (non-blocking)
        normalized.forEach(c => {
          apiGetUserPresence(c.id).then(p => {
            setConvPresence(prev => ({ ...prev, [c.id]: p }));
          }).catch(() => {});
        });
      }).catch(() => {}).finally(() => setConvLoading(false));
  }, []);

  // Load messaging settings when settings panel opens
  useEffect(() => {
    if (settingsPage === "none") return;
    apiGetMessagingSettings().then(s => {
      setOnlineStatus(s.onlineStatus);
      setNotifMsgs(s.notificationsEnabled);
      setReadReceiptsEnabled(s.readReceiptsEnabled);
    }).catch(() => {});
  }, [settingsPage === "none"]);

  // Load message requests when invitations panel opens or tab changes
  useEffect(() => {
    if (settingsPage !== "invitations") return;
    apiGetMessageRequests(invitTab).then(setMsgRequests).catch(() => {});
  }, [settingsPage === "invitations", invitTab]);

  useEffect(() => {
    if (!activeConv) return;
    /* Always re-fetch on conversation open so we catch messages that arrived
       while the user was away (SSE may have missed them). Cached data stays
       visible immediately — fresh data is merged in when it arrives. */
    apiGetMessages(activeConv, undefined, true).then(({ messages: msgs, hasMore }) => {
      setMessages(prev => {
        const fresh    = msgs.map(m => parseApiMsg(m));
        const existing = prev[activeConv] ?? [];
        const freshIds = new Set(fresh.map(x => x.id));
        /* Keep load-more older pages + pending optimistic messages */
        const older   = existing.filter(m => fresh.length > 0 && m.id < fresh[0].id && !freshIds.has(m.id));
        const pending = existing.filter(m => m.status === "pending" && !freshIds.has(m.id));
        return { ...prev, [activeConv]: [...older, ...fresh, ...pending] };
      });
      setHasMoreMessages(prev => ({ ...prev, [activeConv]: hasMore }));
    }).catch(() => {});
  }, [activeConv]);

  useEffect(() => {
    if (!activeConv) { setPresence({ online: false, lastSeenAt: null }); return; }
    let cancelled = false;
    const fetch = () => apiGetUserPresence(activeConv).then(p => { if (!cancelled) setPresence(p); }).catch(() => {});
    fetch();
    const ticker = setInterval(() => setPresenceTick(t => t + 1), 5000);
    const poller = setInterval(fetch, 30000);
    return () => { cancelled = true; clearInterval(ticker); clearInterval(poller); };
  }, [activeConv]);

  const presText = presenceLabel(presence.online, presence.lastSeenAt);
  void presenceTick;

  useEffect(() => {
    if (!activeConv) { setContactInfo(null); return; }
    apiGetContactInfo(activeConv).then(info => { if (info) setContactInfo(info); }).catch(() => {});
  }, [activeConv]);
  void contactInfoLoading; void setContactInfoLoading;

  useEffect(() => {
    if (!activeConv) return;
    const poll = setInterval(() => {
      apiGetMessages(activeConv).then(({ messages: msgs }) => {
        setMessages(prev => {
          const next      = msgs.map(m => parseApiMsg(m));
          const serverIds = new Set(next.map(x => x.id));
          /* Preserve pending (optimistic) msgs + any older msgs loaded by load-more */
          const pending = (prev[activeConv] ?? []).filter(m => m.status === "pending" && !serverIds.has(m.id));
          const older   = (prev[activeConv] ?? []).filter(m => next.length > 0 && m.id < next[0].id && !serverIds.has(m.id));
          const merged  = [...older, ...next, ...pending];
          if (JSON.stringify(merged.map(x => x.id)) === JSON.stringify((prev[activeConv] ?? []).map(x => x.id))) return prev;
          return { ...prev, [activeConv]: merged };
        });
      }).catch(() => {});
    }, 15000); /* SSE handles real-time delivery — polling is a low-frequency fallback */
    return () => clearInterval(poll);
  }, [activeConv, parseApiMsg]);

  useEffect(() => {
    const poll = setInterval(() => {
      if (allUsersRef.current.length === 0) return;
      apiGetConversations().then(convs => {
        setConvList(prev => {
          const updated: NormConv[] = convs.map(c => {
            const existing = prev.find(p => p.id === c.userId);
            const u    = allUsersRef.current.find(u => u.id === c.userId);
            const name = u ? `${u.firstName} ${u.lastName}` : `Utilisateur #${c.userId}`;
            const newMine      = c.lastSenderId === meId;
            const newRead      = c.lastMsgIsRead      ?? false;
            const newDelivered = c.lastMsgIsDelivered ?? false;
            // Anti-regression: never downgrade status for the same last message
            const msgChanged = !existing || existing.lastMessage !== c.lastMessage;
            const exPrio = existing?.lastMsgRead ? 3 : existing?.lastMsgDelivered ? 2 : 1;
            const newPrio = newRead ? 3 : newDelivered ? 2 : 1;
            const effectivePrio = msgChanged ? newPrio : Math.max(newPrio, exPrio);
            return {
              id: c.userId,
              user: existing?.user
                ? { ...existing.user, avatarUrl: u?.avatarUrl ?? existing.user.avatarUrl ?? null }
                : { name, initials: mkInitials(name), color: CONV_COLORS[c.userId % CONV_COLORS.length], avatarUrl: u?.avatarUrl ?? null },
              lastMessage: c.lastMessage,
              unread: activeConvRef.current === c.userId ? 0 : c.unreadCount,
              time: new Date(c.updatedAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }),
              lastMsgMine:      newMine,
              lastMsgRead:      effectivePrio >= 3,
              lastMsgDelivered: effectivePrio >= 2,
            };
          });
          // Preserve the active conversation even if it has no messages yet
          // (e.g. a new chat with a non-friend opened from their profile)
          const active = activeConvRef.current;
          if (active && !updated.find(c => c.id === active)) {
            const prevActive = prev.find(c => c.id === active);
            if (prevActive) updated.unshift(prevActive);
          }
          return updated;
        });
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    apiGetChatGroups().then(groups => {
      setChatGroups(groups.map(g => ({
        id: g.id, name: g.name, avatarUrl: g.avatarUrl, type: g.type,
        membersCount: g.membersCount, lastMessage: g.lastMessage,
        lastMessageAt: g.lastMessageAt, unread: g.unread, role: g.role,
      })));
    }).catch(() => {});
    const poll = setInterval(() => {
      apiGetChatGroups().then(groups => {
        setChatGroups(groups.map(g => ({
          id: g.id, name: g.name, avatarUrl: g.avatarUrl, type: g.type,
          membersCount: g.membersCount, lastMessage: g.lastMessage,
          lastMessageAt: g.lastMessageAt, unread: g.unread, role: g.role,
        })));
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    activeGroupRef.current = activeGroupId;
    if (!activeGroupId) return;
    const loadMsgs = () => {
      apiGetChatGroupMessages(activeGroupId).then(msgs => {
        setGroupMsgs(prev => {
          const next = msgs.map(m => ({
            id: m.id, text: m.content, senderName: m.senderName,
            mine: m.senderId === meId,
            time: new Date(m.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }),
            type: m.type,
          }));
          if (JSON.stringify(next.map(x => x.id)) === JSON.stringify((prev[activeGroupId] ?? []).map(x => x.id))) return prev;
          return { ...prev, [activeGroupId]: next };
        });
      }).catch(() => {});
    };
    loadMsgs();
    apiGetChatGroupInfo(activeGroupId).then(setGroupInfo).catch(() => {});
    apiGetGroupSettings(activeGroupId).then(s => {
      setGrpHideMembers(s.hideMembers);
      setGrpAntiSpam(s.antiSpam);
      setGrpTopicsOn(s.topicsEnabled);
      setGrpPerms(s.permissions);
      setGrpChargeStars(s.chargeTokens);
      setGrpStarPrice(s.tokenPrice);
      setGrpReactMode(s.reactMode);
      setGrpReactEmojis(prev => {
        const next: Record<string, boolean> = {};
        Object.keys(prev).forEach(e => { next[e] = s.reactEmojis.includes(e); });
        s.reactEmojis.forEach(e => { next[e] = true; });
        return next;
      });
    }).catch(() => {});
    const poll = setInterval(loadMsgs, 15000); /* SSE handles real-time; polling is a fallback */
    return () => clearInterval(poll);
  }, [activeGroupId, meId]);

  useEffect(() => {
    if (!activeGroupId || (!showGrpLinks && !showGrpParamType)) return;
    apiGetGroupInviteLinks(activeGroupId).then(setGrpInviteLinks).catch(() => {});
  }, [activeGroupId, showGrpLinks, showGrpParamType]);

  useEffect(() => {
    if (!activeGroupId || !showGrpMembers) { setGrpAddMembersOpen(false); return; }
    apiGetChatGroupMembersGrouped(activeGroupId).then(setGrpMembersData).catch(() => {});
  }, [activeGroupId, showGrpMembers]);

  useEffect(() => {
    if (!grpAddMembersOpen) return;
    apiGetUsers().then(setGrpAllUsers).catch(() => {});
  }, [grpAddMembersOpen]);

  const refreshGroupInfo = useCallback(() => {
    if (activeGroupId) {
      apiGetChatGroupInfo(activeGroupId).then(setGroupInfo).catch(() => {});
      apiGetChatGroupMembersGrouped(activeGroupId).then(setGrpMembersData).catch(() => {});
    }
  }, [activeGroupId]);

  useEffect(() => { groupBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [groupMsgs, activeGroupId]);
  useEffect(() => {
    const grpMatches = grpSearchQ.trim()
      ? (groupMsgs[activeGroupId ?? -1] ?? []).filter((m: {type?:string; text:string}) => m.type !== "system" && m.text.toLowerCase().includes(grpSearchQ.toLowerCase()))
      : [];
    const target = grpMatches[grpSearchIdx];
    if (target) {
      document.getElementById(`grp-msg-${target.id}`)?.scrollIntoView({ behavior:"smooth", block:"center" });
    }
  }, [grpSearchIdx, grpSearchQ]);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const sendMsg = (text?: string, attachment?: Message["attachment"]) => {
    const content = text ?? newMsg.trim();
    if (!content && !attachment) return;
    if (!activeConv) return;
    const now  = new Date().toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    const date = new Date().toISOString().slice(0, 10);
    const tmpId = Date.now();
    const msg: Message = { id: tmpId, text: content, mine: true, time: now, date, status: "pending", attachment };
    setMessages(ms => ({ ...ms, [activeConv]: [...(ms[activeConv] ?? []), msg] }));
    setConvList(prev => prev.map(c => c.id === activeConv ? { ...c, lastMessage: content, time: now, lastMsgMine: true, lastMsgRead: false, lastMsgDelivered: false } : c));
    if (!text) { setNewMsg(""); if (dmInputRef.current) { dmInputRef.current.style.height = "22px"; dmInputRef.current.style.overflowY = "hidden"; } }
    /* Si hors-ligne, le message reste "pending" — le retry se fera au retour du réseau */
    if (!navigator.onLine) return;
    const convId = activeConv;
    apiSendMessage(convId, content)
      .then(() => {
        setMessages(ms => ({ ...ms, [convId]: (ms[convId] ?? []).map(m => m.id === tmpId ? { ...m, status: "sent" as const } : m) }));
        trackEvent("message_sent", { conversation_type: "direct", content_type: attachment?.type ?? "text" });
      })
      .catch(() => {
        setMessages(ms => ({ ...ms, [convId]: (ms[convId] ?? []).map(m => m.id === tmpId ? { ...m, status: "pending" as const } : m) }));
      });
  };

  const sendGroupMsg = () => {
    const content = groupNewMsg.trim();
    if (!content || !activeGroupId) return;
    const now = new Date().toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    const optimistic: GroupMsg = { id: Date.now(), text: content, senderName: "Moi", mine: true, time: now, type: "text" };
    setGroupMsgs(prev => ({ ...prev, [activeGroupId]: [...(prev[activeGroupId] ?? []), optimistic] }));
    setChatGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, lastMessage: content, lastMessageAt: new Date().toISOString() } : g));
    setGroupNewMsg(""); if (grpInputRef.current) { grpInputRef.current.style.height = "22px"; grpInputRef.current.style.overflowY = "hidden"; }
    apiSendChatGroupMessage(activeGroupId, content)
      .then(() => trackEvent("message_sent", { conversation_type: "group", content_type: "text" }))
      .catch(() => {});
  };

  const createGroup = async () => {
    const name = wizardGroupName.trim();
    if (!name || wizardCreating) return;
    setWizardCreating(true);
    try {
      const g = await apiCreateChatGroup(name, groupWizardType, [...wizardMembers]);
      trackEvent("chat_group_created", {
        group_type: groupWizardType,
        member_count: wizardMembers.size + 1,
      });
      const newGroup: ChatGroupConv = {
        id: g.id, name: g.name, avatarUrl: g.avatarUrl, type: g.type,
        membersCount: wizardMembers.size + 1, lastMessage: "", lastMessageAt: g.createdAt,
        unread: 0, role: "owner",
      };
      setChatGroups(prev => [newGroup, ...prev]);
      setGroupWizard("none"); setWizardGroupName(""); setWizardMembers(new Set()); setWizardSearch("");
      setActiveGroupId(g.id);
    } catch { /* silent */ } finally { setWizardCreating(false); }
  };

  const toggleVoice = (msgId: number, src: string) => {
    // Pause all other playing audio instances
    voiceAudiosRef.current.forEach((a, id) => {
      if (id !== msgId) { a.pause(); }
    });

    if (playingAudioId === msgId) {
      voiceAudiosRef.current.get(msgId)?.pause();
      setPlayingAudioId(null);
      return;
    }

    let a = voiceAudiosRef.current.get(msgId);
    const isNew = !a;
    if (!a) {
      a = new Audio(src);
      a.preload = "auto"; /* buffer immediately — eliminates 5s startup delay */
      a.crossOrigin = "anonymous";
      a.ontimeupdate = () => {
        if (a!.duration) setAudioProgress(a!.currentTime / a!.duration);
      };
      a.onended = () => { setPlayingAudioId(null); setAudioProgress(0); };
      a.onerror = () => {
        // Retry without crossOrigin (some CDN configs don't support CORS headers)
        const b = new Audio(src);
        b.preload = "auto";
        b.ontimeupdate = () => { if (b.duration) setAudioProgress(b.currentTime / b.duration); };
        b.onended = () => { setPlayingAudioId(null); setAudioProgress(0); };
        voiceAudiosRef.current.set(msgId, b);
        b.playbackRate = voiceSpeed;
        b.play().catch(() => {});
      };
      voiceAudiosRef.current.set(msgId, a);
    }
    a.playbackRate = voiceSpeed;
    /* Only reset to start when playing a brand-new audio element — don't
       clobber a position set by a previous seek */
    if (isNew) { a.currentTime = 0; setAudioProgress(0); }
    a.play().catch(() => {});
    setPlayingAudioId(msgId);
  };

  const cycleVoiceSpeed = () => {
    const next: 1|1.5|2 = voiceSpeed === 1 ? 1.5 : voiceSpeed === 1.5 ? 2 : 1;
    setVoiceSpeed(next);
    if (playingAudioId !== null) {
      const a = voiceAudiosRef.current.get(playingAudioId);
      if (a) a.playbackRate = next;
    }
  };

  const seekVoice = useCallback((msgId: number, src: string, progress: number) => {
    // Pause all others
    voiceAudiosRef.current.forEach((a, id) => { if (id !== msgId) a.pause(); });

    let a = voiceAudiosRef.current.get(msgId);
    if (!a) {
      a = new Audio(src);
      a.preload = "auto"; /* buffer immediately so seek works on fresh audio */
      a.crossOrigin = "anonymous";
      a.ontimeupdate = () => { if (a!.duration) setAudioProgress(a!.currentTime / a!.duration); };
      a.onended = () => { setPlayingAudioId(null); setAudioProgress(0); };
      a.onerror = () => {
        const b = new Audio(src);
        b.preload = "auto";
        b.ontimeupdate = () => { if (b.duration) setAudioProgress(b.currentTime / b.duration); };
        b.onended = () => { setPlayingAudioId(null); setAudioProgress(0); };
        voiceAudiosRef.current.set(msgId, b);
        b.playbackRate = voiceSpeed;
        if (b.duration && isFinite(b.duration)) b.currentTime = progress * b.duration;
        b.play().catch(() => {});
      };
      voiceAudiosRef.current.set(msgId, a);
    }
    a.playbackRate = voiceSpeed;
    setAudioProgress(progress);
    /* Use canplay so seek works even when audio isn't buffered yet */
    const doSeek = () => {
      if (a!.duration && isFinite(a!.duration)) a!.currentTime = progress * a!.duration;
    };
    if (a.readyState >= 2) { doSeek(); } else { a.addEventListener("canplay", doSeek, { once: true }); }
    a.play().catch(() => {});
    setPlayingAudioId(msgId);
  }, [voiceSpeed]);

  const startLongPress = (msgId: number) => {
    if (selectionMode) { toggleSelect(msgId); return; }
    longPressTimer.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedMsgs(new Set([msgId]));
      setLongPressMsg(msgId);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };
  const toggleSelect = (msgId: number) => {
    setSelectedMsgs(prev => { const next = new Set(prev); if (next.has(msgId)) next.delete(msgId); else next.add(msgId); return next; });
  };
  const exitSelection = () => { setSelectionMode(false); setSelectedMsgs(new Set()); setShowDeleteConfirm(false); setDeleteForAll(false); };
  const copySelected = () => {
    if (!activeConv) return;
    const texts = (messages[activeConv] ?? []).filter(m => selectedMsgs.has(m.id)).map(m => m.text).join("\n");
    navigator.clipboard.writeText(texts).catch(() => {});
    exitSelection();
  };
  const confirmDelete = () => {
    if (!activeConv) return;
    const convId  = activeConv;
    const toDelete = [...selectedMsgs];

    // 1. Capture bounding rects — use data-msgid query so refs never go stale
    const newDust = new Map<number, DustRect>();
    toDelete.forEach(msgId => {
      const el = document.querySelector<HTMLElement>(`[data-msgid="${msgId}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        newDust.set(msgId, { left: r.left, top: r.top, width: r.width, height: r.height });
      }
    });

    // 2. Mark messages as dusting (show canvas overlay, hide bubble)
    setDustingMsgs(prev => { const next = new Map(prev); newDust.forEach((v,k) => next.set(k,v)); return next; });

    // 3. Exit selection mode immediately
    exitSelection();

    // 4. Fire API deletes right away (don't wait for animation)
    toDelete.forEach(msgId => apiDeleteMessage(msgId).catch(() => {}));

    // 5. After animation finishes (1100ms), purge from React state
    //    onComplete per-message also removes from dustingMsgs — this is the fallback
    setTimeout(() => {
      setMessages(prev => ({ ...prev, [convId]: (prev[convId] ?? []).filter(m => !toDelete.includes(m.id)) }));
      setDustingMsgs(prev => { const next = new Map(prev); toDelete.forEach(id => next.delete(id)); return next; });
    }, 1100);
  };

  navigate;

  /* ══════════════════════════════════════════════════════════════
     GROUP CREATION WIZARD — Modern 2026
  ══════════════════════════════════════════════════════════════ */
  if (groupWizard !== "none") {
    const filteredUsers = allUsers.filter(u => u.id !== meId && (
      wizardSearch.trim() === "" ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(wizardSearch.toLowerCase())
    ));
    const isChannel = groupWizardType === "channel";

    const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
      CI: { name: "Côte d'Ivoire", flag: "🇨🇮" }, BJ: { name: "Bénin", flag: "🇧🇯" },
      ML: { name: "Mali", flag: "🇲🇱" }, SN: { name: "Sénégal", flag: "🇸🇳" },
      TG: { name: "Togo", flag: "🇹🇬" }, GN: { name: "Guinée", flag: "🇬🇳" },
      NE: { name: "Niger", flag: "🇳🇪" }, BF: { name: "Burkina Faso", flag: "🇧🇫" },
      CM: { name: "Cameroun", flag: "🇨🇲" }, NG: { name: "Nigeria", flag: "🇳🇬" },
      GH: { name: "Ghana", flag: "🇬🇭" }, MA: { name: "Maroc", flag: "🇲🇦" },
      FR: { name: "France", flag: "🇫🇷" }, US: { name: "États-Unis", flag: "🇺🇸" },
    };
    const getCountry = (code: string | null) => {
      if (!code) return null;
      const c = code.trim().toUpperCase().split(",")[0].trim();
      return COUNTRY_MAP[c] ?? { name: code, flag: "🌍" };
    };

    const WIZ_AVATAR_COLORS = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#EF4444","#0EA5E9","#F59E0B","#6366F1","#8B5CF6"];
    const wizColor = (id: number) => WIZ_AVATAR_COLORS[id % WIZ_AVATAR_COLORS.length];

    const VISIBLE = 4;
    const selectedArr = [...wizardMembers];
    const visibleSelected = selectedArr.slice(0, VISIBLE);
    const extraCount = Math.max(0, selectedArr.length - VISIBLE);

    return createPortal(
      <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: 0, display: "flex", flexDirection: "column", background: "#FFFFFF", zIndex: 10000 }}>
        <style>{`
          @keyframes wiz-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
          @keyframes autoDelIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
          @keyframes wiz-check { from{transform:scale(0.4)} to{transform:scale(1)} }
          .wiz-row:active { background: #F1F5F9 !important; }
        `}</style>

        {/* ── HEADER — white, Telegram style ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 6px 10px 4px", background: "#FFFFFF", borderBottom: "1px solid rgba(0,0,0,0.08)", flexShrink: 0 }}>
          <button
            onClick={() => { if (groupWizard === "name") setGroupWizard("members"); else { setGroupWizard("none"); setWizardMembers(new Set()); setWizardSearch(""); } }}
            style={{ background: "none", border: "none", cursor: "pointer", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#000", fontSize: 22, padding: 0 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#000", lineHeight: 1.25 }}>
              {groupWizard === "members" ? `Nouveau ${isChannel ? "canal" : "groupe"}` : `Nommer le ${isChannel ? "canal" : "groupe"}`}
            </div>
            {groupWizard === "members" && (
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 1 }}>
                {wizardMembers.size} sur 200000 sélectionné{wizardMembers.size > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {groupWizard === "members" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "hidden", position: "relative" }}>

            {/* ── SELECTED MEMBERS — horizontal strip ── */}
            {wizardMembers.size > 0 && (
              <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 18, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 12, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  {selectedArr.map(uid => {
                    const u = allUsers.find(x => x.id === uid);
                    const name = u ? `${u.firstName} ${u.lastName}` : `#${uid}`;
                    return (
                      <div key={uid} onClick={() => setWizardMembers(prev => { const s = new Set(prev); s.delete(uid); return s; })}
                        style={{ flexShrink: 0, textAlign: "center", cursor: "pointer", width: 60, animation: "wiz-in 0.15s ease" }}>
                        <div style={{ position: "relative", marginBottom: 5 }}>
                          {u?.avatarUrl
                            ? <img src={u.avatarUrl} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", display: "block", margin: "0 auto" }} alt={name} />
                            : <div style={{ width: 52, height: 52, borderRadius: "50%", background: wizColor(uid), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 17, margin: "0 auto" }}>{mkInitials(name)}</div>
                          }
                          <div style={{ position: "absolute", top: -1, right: 2, width: 18, height: 18, background: "#9CA3AF", borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg viewBox="0 0 24 24" width="8" height="8" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "#000", maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{name.split(" ")[0]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── SEARCH BAR — bp-search ── */}
            <div style={{ padding: "10px 16px 6px", flexShrink: 0 }}>
              <div className="bp-search">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={wizardSearch} onChange={e => setWizardSearch(e.target.value)}
                  placeholder="Rechercher un ami..." />
                {wizardSearch && (
                  <div onClick={() => setWizardSearch("")}
                    style={{ width: 20, height: 20, borderRadius: "50%", background: "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" width="10" height="10" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </div>
                )}
              </div>
            </div>

            {/* ── CONTACTS LIST — flat Telegram rows ── */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredUsers.map(u => {
                const name = `${u.firstName} ${u.lastName}`;
                const selected = wizardMembers.has(u.id);
                const country = getCountry(u.country);
                return (
                  <div key={u.id} className="wiz-row"
                    onClick={() => setWizardMembers(prev => { const s = new Set(prev); if (s.has(u.id)) s.delete(u.id); else s.add(u.id); return s; })}
                    style={{ display: "flex", gap: 14, padding: "10px 16px", alignItems: "center", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "var(--theme-surface)", transition: "background 0.1s" }}>
                    {/* Avatar */}
                    <div style={{ flexShrink: 0 }}>
                      {u.avatarUrl
                        ? <img src={u.avatarUrl} style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover" }} alt={name} />
                        : <div style={{ width: 50, height: 50, borderRadius: "50%", background: wizColor(u.id), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>{mkInitials(name)}</div>
                      }
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                      {country
                        ? <div style={{ fontSize: 13, color: "#64748B", marginTop: 1 }}>{country.flag} {country.name}</div>
                        : <div style={{ fontSize: 13, color: "#64748B", marginTop: 1 }}>en ligne récemment</div>
                      }
                    </div>
                    {/* Circle checkbox — Telegram style */}
                    <div style={{ width: 24, height: 24, borderRadius: "50%", border: selected ? "none" : "2px solid #CBD5E1", background: selected ? "var(--bp-primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                      {selected && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "wiz-check 0.15s ease" }}><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <div style={{ padding: "52px 24px", textAlign: "center", color: "#64748B", fontSize: 15 }}>
                  Aucun contact trouvé
                </div>
              )}
              <div style={{ height: 80 }} />
            </div>

            {/* ── FAB — Telegram green circle ── */}
            {wizardMembers.size > 0 && (
              <button onClick={() => setGroupWizard("name")}
                style={{ position: "absolute", bottom: 24, right: 20, width: 56, height: 56, borderRadius: "50%", background: "var(--bp-primary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.25)", zIndex: 10, transition: "transform 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.06)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
          </div>
        ) : (
          /* ── Step 2: Nom du groupe — Telegram exact ── */
          <div style={{ flex: 1, overflowY: "auto", background: "#F8FAFC", position: "relative" }}
            onClick={() => { if (showAutoDeletePopup) setShowAutoDeletePopup(false); }}>

            {/* ── PHOTO + NOM (same row, Telegram layout) ── */}
            <div style={{ background: "var(--theme-surface)", borderTop: "1px solid rgba(0,0,0,0.08)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              {/* Avatar circle with camera badge */}
              <div style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}>
                <div style={{ width: 74, height: 74, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div style={{ position: "absolute", bottom: 1, right: 1, width: 22, height: 22, borderRadius: "50%", background: "var(--bp-primary)", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
              </div>
              {/* Name field + emoji */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, borderBottom: "2px solid var(--bp-primary)" }}>
                <input
                  value={wizardGroupName}
                  onChange={e => setWizardGroupName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createGroup(); }}
                  placeholder="Entrez le nom du groupe"
                  autoFocus
                  style={{ flex: 1, border: "none", padding: "4px 0", fontSize: 17, outline: "none", color: "#000", background: "transparent" }}
                />
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, cursor: "pointer" }}>
                  <circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
            </div>

            {/* ── AUTO-SUPPRESSION ROW ── */}
            <div style={{ background: "var(--theme-surface)", borderTop: "1px solid rgba(0,0,0,0.08)", borderBottom: "1px solid rgba(0,0,0,0.08)", marginTop: 28 }}>
              <div ref={autoDelBtnRef}
                onClick={e => {
                  e.stopPropagation();
                  const rect = autoDelBtnRef.current?.getBoundingClientRect();
                  if (rect) setAutoDelPopupPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                  setShowAutoDeletePopup(p => !p);
                }}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", cursor: "pointer" }}>
                {/* Timer icon */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <span style={{ flex: 1, fontSize: 16, color: "#000" }}>Autosuppression</span>
                <span style={{ fontSize: 15, color: "#9CA3AF" }}>{autoDeleteOption}</span>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#CBD5E1" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </div>

            {/* ── Description ── */}
            <div style={{ padding: "10px 16px 0", color: "#9CA3AF", fontSize: 13, lineHeight: 1.5 }}>
              Les nouveaux messages de ce groupe seront automatiquement supprimés pour tous les membres après une certaine durée.
            </div>

            {/* ── MEMBRES ── */}
            <div style={{ background: "var(--theme-surface)", borderTop: "1px solid rgba(0,0,0,0.08)", borderBottom: "1px solid rgba(0,0,0,0.08)", marginTop: 28 }}>
              <div style={{ padding: "12px 16px 8px", color: "var(--bp-primary)", fontSize: 13, fontWeight: 700, letterSpacing: 0.2 }}>
                {wizardMembers.size + 1} membre{wizardMembers.size !== 0 ? "s" : ""}
              </div>
              {[meId, ...selectedArr].map((uid, idx) => {
                const u = uid === meId ? null : allUsers.find(x => x.id === uid);
                const isMe = uid === meId;
                const WIZ_COLORS = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#EF4444","#0EA5E9","#F59E0B","#6366F1","#8B5CF6"];
                const col = WIZ_COLORS[uid % WIZ_COLORS.length];
                const displayName = isMe ? (currentUser.firstName && currentUser.lastName ? `${currentUser.firstName} ${currentUser.lastName}` : "Vous") : (u ? `${u.firstName} ${u.lastName}` : `Utilisateur #${uid}`);
                const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                const avatarUrl = u?.avatarUrl ?? null;
                return (
                  <div key={uid} style={{ display: "flex", gap: 14, padding: "10px 16px", alignItems: "center", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <div style={{ flexShrink: 0 }}>
                      {avatarUrl
                        ? <img src={avatarUrl} style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover" }} alt={displayName} />
                        : <div style={{ width: 46, height: 46, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>{initials}</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
                      <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 1 }}>{isMe ? "Administrateur" : "en ligne récemment"}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ height: 90 }} />

            {/* ── FAB ✓ ── */}
            <button onClick={createGroup} disabled={!wizardGroupName.trim() || wizardCreating}
              style={{ position: "fixed", bottom: 24, right: 20, width: 56, height: 56, borderRadius: "50%", background: wizardGroupName.trim() ? "var(--bp-primary)" : "#CBD5E1", border: "none", cursor: wizardGroupName.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.25)", zIndex: 20, transition: "all 0.15s" }}>
              {wizardCreating
                ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              }
            </button>

            {/* ── AUTO-SUPPRESSION POPUP ── */}
            {showAutoDeletePopup && (
              <>
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100 }}
                  onClick={() => setShowAutoDeletePopup(false)} />
                <div style={{ position: "fixed", top: autoDelPopupPos.top, right: Math.max(autoDelPopupPos.right, 8), background: "var(--theme-surface)", borderRadius: 16, zIndex: 101, width: 240, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden", transformOrigin: "top right", animation: "autoDelIn 0.15s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
                  {[
                    { label: "1 jour",       icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/><text x="9.5" y="10.5" fontSize="4.5" fill="#000" stroke="none">1D</text></svg> },
                    { label: "1 semaine",    icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/><text x="8.5" y="10.5" fontSize="4.5" fill="#000" stroke="none">1W</text></svg> },
                    { label: "1 mois",       icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/><text x="8.5" y="10.5" fontSize="4.5" fill="#000" stroke="none">1M</text></svg> },
                    { label: "Définir un délai", icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
                  ].map(({ label, icon }, i, arr) => {
                    const chosen = autoDeleteOption === label;
                    return (
                      <div key={label}
                        onClick={() => { setAutoDeleteOption(label === "Définir un délai" ? "Désactivée" : label); setShowAutoDeletePopup(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer", borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none", background: chosen ? "#F0FDF4" : "#fff" }}>
                        <div style={{ color: chosen ? "var(--bp-primary)" : "#000", flexShrink: 0 }}>{icon}</div>
                        <span style={{ fontSize: 16, color: chosen ? "var(--bp-primary)" : "#000" }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    , document.body);
  }

  /* ══════════════════════════════════════════════════════════════
     INCOMING CALL OVERLAY
  ══════════════════════════════════════════════════════════════ */
  if (sig.callState === "incoming" && sig.incomingCall) {
    const caller      = allUsers.find(u => u.id === sig.incomingCall!.fromUserId);
    const callerName  = caller ? `${caller.firstName} ${caller.lastName}` : `Utilisateur #${sig.incomingCall.fromUserId}`;
    const callerColor = CONV_COLORS[sig.incomingCall.fromUserId % CONV_COLORS.length];
    const callerAvatar = caller?.avatarUrl ?? null;
    const callerVerified = caller?.role === "creator";
    const isVideo     = sig.incomingCall.callType === "video";

    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10000, overflow:"hidden", display:"flex", flexDirection:"column", background:"#052e16" }}>
        <style>{`
          @keyframes bp-ring-pulse{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.18);opacity:0}}
          @keyframes bp-ring-pulse2{0%,100%{transform:scale(1);opacity:.35}50%{transform:scale(1.32);opacity:0}}
          @keyframes bp-dots{0%,80%,100%{opacity:0;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
          @keyframes bp-aurora{0%,100%{opacity:.7;transform:scale(1) rotate(0deg)}50%{opacity:1;transform:scale(1.08) rotate(3deg)}}
          @keyframes bp-accept-glow{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.7),0 8px 32px rgba(34,197,94,.45)}50%{box-shadow:0 0 0 14px rgba(34,197,94,.0),0 8px 32px rgba(34,197,94,.45)}}
          @keyframes bp-wave{0%,100%{height:8px}50%{height:22px}}
          .bp-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--bp-primary);margin:0 3px;animation:bp-dots 1.5s infinite ease-in-out both}
          .bp-dot:nth-child(1){animation-delay:0s}.bp-dot:nth-child(2){animation-delay:.2s}.bp-dot:nth-child(3){animation-delay:.4s}
          .bp-wave-bar{width:3px;border-radius:2px;background:linear-gradient(to top,var(--bp-primary),#BBF7D0);animation:bp-wave 1s ease-in-out infinite}
        `}</style>

        {/* Aurora background */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, #052e16 0%, #052e16 35%, #052e16 70%, #052e16 100%)", zIndex:0 }} />
        <div style={{ position:"absolute", top:"-10%", left:"10%", width:"80%", height:"55%", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(34,197,94,0.22) 0%, rgba(16,122,56,0.10) 40%, transparent 70%)", animation:"bp-aurora 6s ease-in-out infinite", zIndex:1, pointerEvents:"none" }} />
        <div style={{ position:"absolute", top:"5%", right:"-10%", width:"50%", height:"40%", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(74,222,128,0.10) 0%, transparent 65%)", animation:"bp-aurora 8s ease-in-out infinite reverse", zIndex:1, pointerEvents:"none" }} />

        {/* Incoming label */}
        <div style={{ position:"relative", zIndex:10, display:"flex", justifyContent:"center", alignItems:"center", padding:"56px 20px 0" }}>
          <div style={{ background:"rgba(34,197,94,0.15)", backdropFilter:"blur(10px)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:20, padding:"6px 18px", display:"flex", alignItems:"center", gap:8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--bp-primary)"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.01L6.6 10.8z"/></svg>
            <span style={{ color:"var(--bp-primary)", fontSize:13, fontWeight:700 }}>{isVideo ? "Appel vidéo entrant" : "Appel audio entrant"}</span>
          </div>
        </div>

        {/* Center content */}
        <div style={{ position:"relative", zIndex:10, flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          {/* Rings */}
          <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:32 }}>
            <div style={{ position:"absolute", width:220, height:220, borderRadius:"50%", border:"1.5px solid rgba(34,197,94,0.2)", animation:"bp-ring-pulse2 2.4s ease-out infinite" }} />
            <div style={{ position:"absolute", width:180, height:180, borderRadius:"50%", border:"1.5px solid rgba(34,197,94,0.32)", animation:"bp-ring-pulse 2s ease-out infinite" }} />
            <div style={{ position:"absolute", width:148, height:148, borderRadius:"50%", border:"2px solid rgba(34,197,94,0.45)" }} />
            {/* Avatar — real photo or initials */}
            <div style={{ width:124, height:124, borderRadius:"50%", overflow:"hidden", background:`radial-gradient(circle at 35% 35%, ${callerColor}dd, ${callerColor}99)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:46, color:"#fff", fontWeight:900, boxShadow:`0 0 0 4px rgba(34,197,94,0.4), 0 16px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)`, backdropFilter:"blur(2px)", border:"3px solid rgba(255,255,255,0.15)" }}>
              {callerAvatar
                ? <img src={callerAvatar} alt={callerName} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : mkInitials(callerName)
              }
            </div>
            <div style={{ position:"absolute", bottom:8, right:8, width:22, height:22, borderRadius:"50%", background:"var(--bp-primary)", border:"3px solid #052e16", boxShadow:"0 0 10px var(--bp-primary)" }} />
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, justifyContent:"center", padding:"0 28px" }}>
            <span style={{ fontWeight:900, fontSize:26, color:"#fff", letterSpacing:0.5, textShadow:"0 2px 16px rgba(0,0,0,0.5)" }}>{callerName}</span>
            {callerVerified && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.09 8.26L21 9.27L16.5 13.97L17.64 21L12 17.77L6.36 21L7.5 13.97L3 9.27L9.91 8.26L12 2Z" fill="var(--bp-primary)"/>
                <polyline points="9,12 11,14 15,10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:2, marginBottom:24 }}>
            <span style={{ color:"rgba(255,255,255,.65)", fontSize:15 }}>Appel entrant</span>
            <span className="bp-dot" /><span className="bp-dot" /><span className="bp-dot" />
          </div>
        </div>

        {/* Bottom — accept / reject */}
        <div style={{ position:"relative", zIndex:10, padding:"0 40px 56px", display:"flex", justifyContent:"space-around", alignItems:"flex-start" }}>
          <div style={{ textAlign:"center", cursor:"pointer" }} onClick={() => sig.rejectCall()}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(145deg,#ef4444,#EF4444)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px", boxShadow:"0 6px 28px rgba(239,68,68,.55), inset 0 1px 0 rgba(255,255,255,.2)" }}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
            </div>
            <div style={{ color:"rgba(255,255,255,.75)", fontSize:13, fontWeight:600 }}>Refuser</div>
          </div>
          <div style={{ textAlign:"center", cursor:"pointer" }} onClick={() => sig.acceptCall()}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(145deg,#22c55e,var(--bp-primary-dark))", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px", animation:"bp-accept-glow 2s ease-in-out infinite", boxShadow:"0 6px 28px rgba(34,197,94,.55), inset 0 1px 0 rgba(255,255,255,.2)" }}>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="#fff"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.24 1.01L6.6 10.8z"/></svg>
            </div>
            <div style={{ color:"rgba(255,255,255,.75)", fontSize:13, fontWeight:600 }}>Accepter</div>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ══════════════════════════════════════════════════════════════
     ACTIVE / CALLING CALL — FULL SCREEN
  ══════════════════════════════════════════════════════════════ */
  if (sig.callState === "calling" || sig.callState === "active") {
    const peer    = callPeerUser;
    const isVideo = sig.callType === "video";

    return createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <style>{`
          @keyframes tg-ring3{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.55),0 0 0 0 rgba(255,255,255,.3)}50%{box-shadow:0 0 0 22px rgba(255,255,255,.18),0 0 0 44px rgba(255,255,255,.07)}}
          @keyframes tg-dots3{0%,80%,100%{opacity:0}40%{opacity:1}}
          .tg3-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.8);margin:0 2px;animation:tg-dots3 1.4s infinite ease-in-out both}
          .tg3-dot:nth-child(1){animation-delay:-.32s}.tg3-dot:nth-child(2){animation-delay:-.16s}
          .tg3-btn{background:rgba(255,255,255,.18);border:none;width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
          .tg3-btn:active{background:rgba(255,255,255,.35)!important}
          .tg3-btn-on{background:rgba(255,255,255,.9)!important}
        `}</style>
        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

        {isVideo ? (
          /* ── VIDEO CALL — BrutePawa 2026 Premium ── */
          <>
            <style>{`
              @keyframes bpv-dots{0%,80%,100%{opacity:0;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
              @keyframes bpv-end-glow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.7),0 8px 28px rgba(239,68,68,.5)}50%{box-shadow:0 0 0 12px rgba(239,68,68,0),0 8px 28px rgba(239,68,68,.5)}}
              @keyframes bpv-secure-pulse{0%,100%{opacity:.85}50%{opacity:1}}
              @keyframes bpv-local-glow{0%,100%{box-shadow:0 0 0 2px rgba(34,197,94,0.7),0 4px 20px rgba(0,0,0,.55)}50%{box-shadow:0 0 0 3px rgba(74,222,128,1),0 4px 24px rgba(0,0,0,.6)}}
              .bpv-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--bp-primary);animation:bpv-dots 1.5s ease-in-out infinite}
              .bpv-dot:nth-child(1){animation-delay:0s}.bpv-dot:nth-child(2){animation-delay:.2s}.bpv-dot:nth-child(3){animation-delay:.4s}
              .bpv-btn{display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;transition:transform .12s,filter .12s;background:rgba(34,197,94,0.18);backdrop-filter:blur(8px);border:1px solid rgba(34,197,94,0.3)}
              .bpv-btn:active{transform:scale(.88)!important}
              .bpv-btn-on{background:rgba(34,197,94,0.5)!important;border-color:rgba(34,197,94,0.7)!important}
            `}</style>

            {/* Remote video — full screen (audio routed via <audio> element, video only here) */}
            <video ref={remoteVideoRef} autoPlay playsInline muted style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", background:"linear-gradient(180deg,#052e16,#052e16)" }} />

            {/* Top gradient overlay */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"38%", background:"linear-gradient(180deg,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.35) 60%,transparent 100%)", zIndex:10, pointerEvents:"none" }} />
            {/* Bottom gradient overlay */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"42%", background:"linear-gradient(0deg,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.45) 55%,transparent 100%)", zIndex:10, pointerEvents:"none" }} />

            {/* Header */}
            <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:20, padding:"50px 16px 0" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                {/* Left: chevron down + name + status */}
                <div style={{ display:"flex", alignItems:"flex-start", gap:10, flex:1 }}>
                  <button onClick={() => sig.endCall()} style={{ background:"rgba(255,255,255,0.12)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"50%", width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, marginTop:2 }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="rgba(255,255,255,.9)"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                  </button>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ color:"#fff", fontWeight:900, fontSize:20, letterSpacing:0.2, textShadow:"0 1px 8px rgba(0,0,0,0.6)" }}>{peer?.name ?? "Appel vidéo"}</span>
                      {peer?.role === "creator" && (
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2L14.09 8.26L21 9.27L16.5 13.97L17.64 21L12 17.77L6.36 21L7.5 13.97L3 9.27L9.91 8.26L12 2Z" fill="var(--bp-primary)"/>
                          <polyline points="9,12 11,14 15,10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
                      {sig.callState === "active"
                        ? <span style={{ color:"var(--bp-primary)", fontSize:13, fontWeight:700 }}>● {fmtTime(sig.callDuration)}</span>
                        : <>
                            <span style={{ color:"rgba(255,255,255,.75)", fontSize:13 }}>Connexion en cours</span>
                            <span className="bpv-dot" style={{ marginLeft:2 }} /><span className="bpv-dot" /><span className="bpv-dot" />
                          </>
                      }
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(74,222,128,0.8)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                      <span style={{ color:"rgba(255,255,255,.55)", fontSize:11, letterSpacing:0.2 }}>Chiffré de bout en bout</span>
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {/* Speaker button */}
                  <button onClick={() => sig.toggleSpeaker(remoteAudioRef.current)}
                    style={{ width:44, height:44, borderRadius:"50%", background:sig.isSpeaker ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.12)", border:`1.5px solid ${sig.isSpeaker ? "rgba(34,197,94,0.65)" : "rgba(255,255,255,0.22)"}`, backdropFilter:"blur(12px)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(0,0,0,0.4)", flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill={sig.isSpeaker ? "var(--bp-primary)" : "rgba(255,255,255,.8)"}><path d={sig.isSpeaker ? "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" : "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"}/></svg>
                  </button>
                  {/* Plus d'options */}
                  <button onClick={() => setCallOverlay("options")}
                    style={{ width:44, height:44, borderRadius:"50%", background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.22)", backdropFilter:"blur(12px)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 14px rgba(0,0,0,0.4)", flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="rgba(255,255,255,.85)"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Local camera preview — premium floating */}
            <div style={{ position:"absolute", top:130, right:14, width:106, height:158, borderRadius:20, overflow:"hidden", zIndex:20, animation:"bpv-local-glow 2.5s ease-in-out infinite", cursor:"pointer" }}>
              <video ref={localVideoRef} autoPlay playsInline muted style={{ width:"100%", height:"100%", objectFit:"cover", transform:sig.cameraFront ? "scaleX(-1)" : "scaleX(1)" }} />
              {/* Camera flip overlay button */}
              <div onClick={() => sig.flipCamera()} style={{ position:"absolute", bottom:7, right:7, width:28, height:28, borderRadius:"50%", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", border:"1px solid rgba(255,255,255,0.2)" }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="rgba(255,255,255,0.9)"><path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
              </div>
              {/* Signal indicator */}
              <div style={{ position:"absolute", top:7, right:7, display:"flex", alignItems:"flex-end", gap:1 }}>
                {[3,5,7,9].map((h,i) => <div key={i} style={{ width:3, height:h, borderRadius:1, background:i < 3 ? "#22c55e" : "rgba(255,255,255,0.3)" }} />)}
              </div>
            </div>

            {/* Secure connection badge — center */}
            {sig.callState === "active" && (
              <div style={{ position:"absolute", bottom:175, left:"50%", transform:"translateX(-50%)", zIndex:20, animation:"bpv-secure-pulse 3s ease-in-out infinite" }}>
                <div style={{ background:"rgba(34,197,94,0.18)", backdropFilter:"blur(14px)", border:"1px solid rgba(34,197,94,0.35)", borderRadius:24, padding:"7px 18px", display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="18" width="3" height="4" rx="1" fill="var(--bp-primary)"/>
                    <rect x="7" y="13" width="3" height="9" rx="1" fill="var(--bp-primary)"/>
                    <rect x="12" y="8" width="3" height="14" rx="1" fill="var(--bp-primary)"/>
                    <rect x="17" y="3" width="3" height="19" rx="1" fill="var(--bp-primary)"/>
                  </svg>
                  <span style={{ color:"rgba(255,255,255,.88)", fontSize:12, fontWeight:700, letterSpacing:0.2 }}>Connexion sécurisée</span>
                </div>
              </div>
            )}

            {/* Bottom control bar */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:20, padding:"0 10px 46px" }}>
              <div style={{ background:"rgba(5,14,8,0.78)", backdropFilter:"blur(22px)", border:"1px solid rgba(34,197,94,0.12)", borderRadius:28, padding:"18px 10px 14px", boxShadow:"0 -4px 32px rgba(0,0,0,0.5)" }}>
                <div style={{ display:"flex", justifyContent:"space-around", alignItems:"flex-start" }}>
                  {([
                    {
                      label: sig.isVideoEnabled ? "Désactiver\nvidéo" : "Activer\nvidéo",
                      icon:<svg viewBox="0 0 24 24" width="24" height="24" fill={sig.isVideoEnabled ? "rgba(255,255,255,.9)" : "#052e16"}>{sig.isVideoEnabled ? <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/> : <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/>}</svg>,
                      action:() => sig.toggleVideo(), active:!sig.isVideoEnabled,
                    },
                    {
                      label:"Muet",
                      icon:<svg viewBox="0 0 24 24" width="24" height="24" fill={sig.isMuted ? "#052e16" : "rgba(255,255,255,.9)"}><path d={sig.isMuted ? "M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" : "M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28C16.28 17.23 19 14.41 19 11h-1.7z"}/></svg>,
                      action:() => sig.toggleMute(), active:sig.isMuted,
                    },
                    {
                      label: sig.isScreenSharing ? "Arrêter\npartage" : "Partager\nécran",
                      icon:<svg viewBox="0 0 24 24" width="24" height="24" fill={sig.isScreenSharing ? "#052e16" : "rgba(255,255,255,.9)"}><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zm-7-3.53v-2.19c-2.78.48-4.34 1.71-5.5 3.72.14-1.39.73-4.47 3.93-5.81L9.5 8.47C11.27 7.28 13.8 6.86 16 9.5l1.5-1.5v4.47H13z"/></svg>,
                      action:() => sig.isScreenSharing ? setScreenShareStep("stop-confirm") : setScreenShareStep("confirm"), active:sig.isScreenSharing,
                    },
                    {
                      label:"Basculer\ncaméra",
                      icon:<svg viewBox="0 0 24 24" width="24" height="24" fill="rgba(255,255,255,.9)"><path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>,
                      action:() => sig.flipCamera(), active:false,
                    },
                    {
                      label:"Raccrocher",
                      icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>,
                      action:() => sig.endCall(), red:true,
                    },
                  ] as {label:string;icon:React.ReactNode;action:()=>void;active?:boolean;red?:boolean}[]).map(b => (
                    <div key={b.label} style={{ textAlign:"center", cursor:"pointer", minWidth:0 }} onClick={b.action}>
                      <div className={`bpv-btn${b.active ? " bpv-btn-on" : ""}`} style={
                        b.red
                          ? { background:"linear-gradient(145deg,#ef4444,#EF4444)", border:"none", width:64, height:64, animation:"bpv-end-glow 2.5s ease-in-out infinite", boxShadow:"0 6px 24px rgba(239,68,68,.55), inset 0 1px 0 rgba(255,255,255,.2)" }
                          : b.active
                            ? { background:"rgba(34,197,94,0.5)", border:"1px solid rgba(34,197,94,0.7)" }
                            : {}
                      }>{b.icon}</div>
                      <div style={{ color:"rgba(255,255,255,.68)", fontSize:10, fontWeight:600, marginTop:7, whiteSpace:"pre-line", lineHeight:1.3, letterSpacing:0.1 }}>{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SCREEN SHARE ACTIVE BANNER ── */}
            {sig.isScreenSharing && sig.callState === "active" && screenShareStep === "none" && (
              <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:25, background:"#16a34a", padding:"10px 16px", display:"flex", alignItems:"center", gap:8 }}>
                <style>{`@keyframes bpvblink{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff", animation:"bpvblink 1.2s infinite", flexShrink:0 }} />
                <span style={{ color:"#fff", fontWeight:700, fontSize:14, flex:1 }}>Partage d'écran en cours</span>
                <button onClick={() => setScreenShareStep("stop-confirm")}
                  style={{ background:"rgba(0,0,0,0.25)", border:"1px solid rgba(255,255,255,0.4)", borderRadius:8, padding:"5px 14px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  Arrêter
                </button>
              </div>
            )}

            {/* ── SCREEN SHARE — ÉTAPE 1: CONFIRM ── */}
            {screenShareStep === "confirm" && (
              <div style={{ position:"absolute", inset:0, zIndex:30, background:"rgba(0,0,0,0.65)", display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
                onClick={() => setScreenShareStep("none")}>
                <div style={{ background:"#0a1a10", borderRadius:"24px 24px 0 0", paddingBottom:34, border:"1px solid rgba(34,197,94,0.2)" }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px" }}>
                    <div style={{ width:40, height:4, borderRadius:2, background:"rgba(255,255,255,0.2)" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
                    <div style={{ width:68, height:68, borderRadius:22, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg viewBox="0 0 24 24" width="34" height="34" fill="var(--bp-primary)"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zm-7-3.53v-2.19c-2.78.48-4.34 1.71-5.5 3.72.14-1.39.73-4.47 3.93-5.81L9.5 8.47C11.27 7.28 13.8 6.86 16 9.5l1.5-1.5v4.47H13z"/></svg>
                    </div>
                  </div>
                  <div style={{ textAlign:"center", padding:"0 24px", marginBottom:4 }}>
                    <div style={{ fontWeight:900, fontSize:21, color:"#fff" }}>Partager l'écran</div>
                    <div style={{ fontSize:14, color:"rgba(255,255,255,.52)", marginTop:8, lineHeight:1.55 }}>
                      Tout le contenu de votre écran sera accessible par <strong style={{ color:"rgba(255,255,255,.8)" }}>{peer?.name}</strong> pendant la diffusion.
                    </div>
                  </div>
                  <div style={{ padding:"20px 16px 0", display:"flex", flexDirection:"column", gap:12 }}>
                    <button onClick={() => setScreenShareStep("settings")}
                      style={{ width:"100%", padding:"15px", borderRadius:16, background:"var(--bp-primary)", border:"none", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer", boxShadow:"0 4px 18px rgba(34,197,94,0.38)" }}>
                      Démarrer le partage
                    </button>
                    <button onClick={() => setScreenShareStep("none")}
                      style={{ width:"100%", padding:"14px", borderRadius:16, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.14)", color:"rgba(255,255,255,.78)", fontWeight:700, fontSize:15, cursor:"pointer" }}>
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SCREEN SHARE — ÉTAPE 2: PARAMÈTRES ── */}
            {screenShareStep === "settings" && (
              <div style={{ position:"absolute", inset:0, zIndex:30, background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
                <div style={{ background:"#111c15", borderRadius:22, padding:"26px 20px 22px", width:"100%", maxWidth:380, border:"1px solid rgba(34,197,94,0.18)" }}>
                  <div style={{ textAlign:"center", marginBottom:18 }}>
                    <div style={{ width:52, height:52, borderRadius:16, background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--bp-primary)"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4z"/></svg>
                    </div>
                    <div style={{ fontWeight:800, fontSize:17, color:"#fff" }}>Diffuser l'écran avec BrutePawa</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", marginTop:7, lineHeight:1.5 }}>BrutePawa aura accès à tout le contenu de votre écran ou de l'onglet sélectionné pendant la diffusion.</div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:16, overflow:"hidden", marginBottom:20 }}>
                    {([
                      { label:"Diffuser le son", sub:"Le son de l'appareil sera diffusé", val:screenShareSound, set:setScreenShareSound },
                      { label:"Afficher les touches", sub:"Afficher les interactions tactiles sur l'écran", val:screenShareTouches, set:setScreenShareTouches },
                    ] as {label:string;sub:string;val:boolean;set:(v:boolean)=>void}[]).map((item, i) => (
                      <div key={item.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderBottom:i===0?"1px solid rgba(255,255,255,0.06)":"none" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:14.5, color:"#fff" }}>{item.label}</div>
                          <div style={{ fontSize:12, color:"rgba(255,255,255,.38)", marginTop:2 }}>{item.sub}</div>
                        </div>
                        <div onClick={() => item.set(!item.val)} style={{ width:46, height:26, borderRadius:13, background:item.val?"var(--bp-primary)":"rgba(255,255,255,0.18)", cursor:"pointer", position:"relative", transition:"background .2s", flexShrink:0 }}>
                          <div style={{ position:"absolute", top:3, left:item.val?23:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={() => setScreenShareStep("confirm")}
                      style={{ flex:1, padding:"13px", borderRadius:14, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.13)", color:"rgba(255,255,255,.78)", fontWeight:700, fontSize:15, cursor:"pointer" }}>
                      Annuler
                    </button>
                    <button onClick={() => { sig.toggleScreenShare(); setScreenShareStep("none"); }}
                      style={{ flex:1, padding:"13px", borderRadius:14, background:"var(--bp-primary)", border:"none", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 3px 14px rgba(34,197,94,0.3)" }}>
                      Démarrer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SCREEN SHARE — ÉTAPE 5: ARRÊTER ── */}
            {screenShareStep === "stop-confirm" && (
              <div style={{ position:"absolute", inset:0, zIndex:30, background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 20px" }}>
                <div style={{ background:"#111c15", borderRadius:22, padding:"26px 20px 22px", width:"100%", maxWidth:380, border:"1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ textAlign:"center", marginBottom:18 }}>
                    <div style={{ width:52, height:52, borderRadius:16, background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="#EF4444"><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4z"/></svg>
                    </div>
                    <div style={{ fontWeight:800, fontSize:17, color:"#fff" }}>Arrêter le partage d'écran ?</div>
                    <div style={{ fontSize:13.5, color:"rgba(255,255,255,.48)", marginTop:8, lineHeight:1.5 }}>Le partage d'écran sera arrêté pour vous et <strong style={{ color:"rgba(255,255,255,.7)" }}>{peer?.name}</strong>.</div>
                  </div>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={() => setScreenShareStep("none")}
                      style={{ flex:1, padding:"13px", borderRadius:14, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.13)", color:"rgba(255,255,255,.78)", fontWeight:700, fontSize:15, cursor:"pointer" }}>
                      Annuler
                    </button>
                    <button onClick={() => { sig.toggleScreenShare(); setScreenShareStep("none"); }}
                      style={{ flex:1, padding:"13px", borderRadius:14, background:"#EF4444", border:"none", color:"#fff", fontWeight:800, fontSize:15, cursor:"pointer", boxShadow:"0 3px 14px rgba(239,68,68,0.3)" }}>
                      Arrêter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── CALL OPTIONS + SOUS-PAGES ── */}
            {callOverlay !== "none" && (
              <div style={{ position:"absolute", inset:0, zIndex:31, background:"rgba(0,0,0,0.68)", display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
                onClick={() => setCallOverlay("none")}>
                <div style={{ background:"#0a1a10", borderRadius:"24px 24px 0 0", paddingBottom:34, border:"1px solid rgba(34,197,94,0.2)", maxHeight:"90vh", overflowY:"auto" }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 8px", position:"sticky", top:0, background:"#0a1a10", zIndex:1 }}>
                    <div style={{ width:40, height:4, borderRadius:2, background:"rgba(255,255,255,0.2)" }} />
                  </div>

                  {/* ── OPTIONS MAIN ── */}
                  {callOverlay === "options" && (<>
                    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"4px 20px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                      {peer?.avatarUrl
                        ? <img src={peer.avatarUrl} alt={peer?.name} style={{ width:46, height:46, borderRadius:"50%", objectFit:"cover", border:"2px solid var(--bp-primary)" }} />
                        : <div style={{ width:46, height:46, borderRadius:"50%", background:"#1a3a20", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:18, color:"var(--bp-primary)", border:"2px solid var(--bp-primary)" }}>{peer?.name?.[0]?.toUpperCase() ?? "?"}</div>}
                      <div>
                        <div style={{ fontWeight:800, fontSize:17, color:"#fff" }}>{peer?.name ?? "Contact"}</div>
                        <div style={{ fontSize:13, color:"var(--bp-primary)", fontWeight:600 }}>● Appel en cours · {fmtTime(sig.callDuration)}</div>
                      </div>
                    </div>
                    {([
                      { label:"Voir le profil", sub:"Afficher le profil complet", color:"var(--bp-primary)", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, action:() => { setCallOverlay("none"); navigate(`/profile/${callPeerUser?.id ?? activeConv}`); } },
                      { label:"Rechercher dans la conversation", sub:"Messages, médias, liens et fichiers", color:"#3B82F6", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>, action:() => setCallOverlay("search") },
                      { label:(contactInfo?.isMuted ? "Activer le son" : "Mettre en sourdine"), sub:(contactInfo?.isMuted ? "Recevoir à nouveau les notifications" : "Ne plus recevoir de notifications"), color:"#F59E0B", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/>{contactInfo?.isMuted ? <><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></> : <><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></>}</svg>, action:() => contactInfo?.isMuted ? apiMuteContact(activeConv!, "none").then(() => apiGetContactInfo(activeConv!).then(i => { if(i) setContactInfo(i); })).then(()=>setCallOverlay("none")) : setCallOverlay("mute") },
                      { label:(contactInfo?.isPinned ? "Désépingler" : "Épingler la conversation"), sub:(contactInfo?.isPinned ? "Retirer des conversations épinglées" : "Garder en haut de votre liste"), color:"#8B5CF6", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/></svg>, action:() => (contactInfo?.isPinned ? apiUnpinContact(activeConv!) : apiPinContact(activeConv!)).then(() => apiGetContactInfo(activeConv!).then(i => { if(i) setContactInfo(i); })).then(()=>setCallOverlay("none")) },
                      { label:(contactInfo?.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"), sub:(contactInfo?.isFavorite ? "Supprimer de vos contacts favoris" : "Retrouver facilement ce contact"), color:"#F59E0B", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill={contactInfo?.isFavorite?"#F59E0B":"none"} stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, action:() => (contactInfo?.isFavorite ? apiUnfavoriteContact(activeConv!) : apiFavoriteContact(activeConv!)).then(() => apiGetContactInfo(activeConv!).then(i => { if(i) setContactInfo(i); })).then(()=>setCallOverlay("none")) },
                      { label:"Ajouter aux amis", sub:(contactInfo?.friendStatus==="pending"?"Demande envoyée":"Envoyer une demande d'amitié"), color:"var(--bp-primary)", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>, action:()=>setCallOverlay("addfriend"), hidden:contactInfo?.friendStatus==="accepted" },
                      { label:"Ajouter à un groupe", sub:"Ajouter ce contact à l'un de vos groupes", color:"#3B82F6", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, action:()=>{ apiGetMyGroups().then(gs=>{setCallAddGroupList(gs);setCallAddGroupSearch("");setCallOverlay("addgroup");}); } },
                      { label:"Partager le profil", sub:`Partager le profil de ${peer?.name??"ce contact"} avec vos amis`, color:"var(--bp-primary)", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, action:()=>{ const url=`${window.location.origin}/profile/${callPeerUser?.id??activeConv}`; if(navigator.share){navigator.share({title:peer?.name??"BrutePawa",url});}else{navigator.clipboard.writeText(url);} setCallOverlay("none"); } },
                      { label:(contactInfo?.isBlocked?"Débloquer le contact":"Bloquer le contact"), sub:(contactInfo?.isBlocked?"Permettre à nouveau ce contact de vous contacter":"Ce contact ne pourra plus vous contacter"), color:"#EF4444", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>, action:()=>setCallOverlay("block") },
                      { label:"Signaler l'utilisateur", sub:"Signalez ce contact s'il enfreint nos règles", color:"#F97316", icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>, action:()=>{setCallReportReason("");setCallReportDesc("");setCallOverlay("report");} },
                      { label:"Supprimer la conversation", sub:"Cette action supprimera tous les messages", color:"#EF4444", danger:true, icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>, action:()=>setCallOverlay("delete") },
                    ] as {label:string;sub:string;color:string;icon:React.ReactNode;action:()=>void;hidden?:boolean;danger?:boolean}[])
                      .filter(o => !o.hidden)
                      .map((opt, i, arr) => (
                        <div key={i} onClick={opt.action}
                          style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 20px", cursor:"pointer", borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
                          <div style={{ width:42, height:42, borderRadius:13, background:`${opt.color}1a`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{opt.icon}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:15, color:opt.danger?"#EF4444":"#fff" }}>{opt.label}</div>
                            <div style={{ fontSize:12.5, color:"rgba(255,255,255,.36)", marginTop:1 }}>{opt.sub}</div>
                          </div>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      ))}
                  </>)}

                  {/* ── SOURDINE ── */}
                  {callOverlay === "mute" && (
                    <div style={{ padding:"0 20px 4px" }}>
                      <button onClick={()=>setCallOverlay("options")} style={{ background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer",padding:"4px 0 16px",display:"flex",alignItems:"center",gap:6,fontSize:14 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg> Retour
                      </button>
                      <div style={{ textAlign:"center", marginBottom:20 }}>
                        <div style={{ width:64,height:64,borderRadius:20,background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/></svg>
                        </div>
                        <div style={{ fontWeight:800,fontSize:19,color:"#fff" }}>Notifications</div>
                        <div style={{ fontSize:13.5,color:"rgba(255,255,255,.45)",marginTop:6,lineHeight:1.5 }}>Vous ne recevrez plus de<br/>notifications de ce contact.</div>
                      </div>
                      <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:16,overflow:"hidden",marginBottom:20 }}>
                        {(["8h","1w","always"] as const).map((v,i,arr)=>(
                          <div key={v} onClick={()=>setCallMuteChoice(v)}
                            style={{ display:"flex",alignItems:"center",padding:"15px 18px",cursor:"pointer",borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
                            <span style={{ flex:1,color:"#fff",fontSize:15,fontWeight:500 }}>{v==="8h"?"8 heures":v==="1w"?"1 semaine":"Toujours"}</span>
                            <div style={{ width:22,height:22,borderRadius:"50%",border:`2px solid ${callMuteChoice===v?"var(--bp-primary)":"rgba(255,255,255,0.3)"}`,background:callMuteChoice===v?"var(--bp-primary)":"transparent",display:"flex",alignItems:"center",justifyContent:"center" }}>
                              {callMuteChoice===v&&<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={()=>apiMuteContact(activeConv!,callMuteChoice).then(()=>apiGetContactInfo(activeConv!).then(i=>{if(i)setContactInfo(i);})).then(()=>setCallOverlay("none"))}
                        style={{ width:"100%",padding:"15px",borderRadius:16,background:"var(--bp-primary)",border:"none",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer" }}>
                        OK
                      </button>
                    </div>
                  )}

                  {/* ── RECHERCHER ── */}
                  {callOverlay === "search" && (
                    <div style={{ padding:"0 20px 4px" }}>
                      <button onClick={()=>setCallOverlay("options")} style={{ background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer",padding:"4px 0 16px",display:"flex",alignItems:"center",gap:6,fontSize:14 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg> Retour
                      </button>
                      <div style={{ fontWeight:800,fontSize:19,color:"#fff",marginBottom:14 }}>Rechercher dans la conversation</div>
                      <div style={{ position:"relative",marginBottom:16 }}>
                        <svg style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)" }} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input value={contactSearchQ} onChange={e=>setContactSearchQ(e.target.value)} placeholder="Rechercher…"
                          style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"12px 14px 12px 42px",color:"#fff",fontSize:15,outline:"none" }} />
                      </div>
                      <div style={{ color:"rgba(255,255,255,.32)",fontSize:13,textAlign:"center",paddingTop:20 }}>Tapez pour rechercher dans la conversation</div>
                    </div>
                  )}

                  {/* ── AJOUTER AMI ── */}
                  {callOverlay === "addfriend" && (
                    <div style={{ padding:"0 20px 4px" }}>
                      <button onClick={()=>setCallOverlay("options")} style={{ background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer",padding:"4px 0 16px",display:"flex",alignItems:"center",gap:6,fontSize:14 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg> Retour
                      </button>
                      <div style={{ textAlign:"center",marginBottom:22 }}>
                        <div style={{ width:64,height:64,borderRadius:20,background:"rgba(34,197,94,0.12)",border:"1px solid rgba(34,197,94,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        </div>
                        <div style={{ fontWeight:800,fontSize:19,color:"#fff" }}>Ajouter aux amis</div>
                        <div style={{ fontSize:13.5,color:"rgba(255,255,255,.45)",marginTop:8,lineHeight:1.5 }}>
                          {contactInfo?.friendStatus==="pending"&&contactInfo?.friendDirection==="sent"
                            ?"Demande d'amitié déjà envoyée."
                            :`Envoyez une demande d'amitié à ${peer?.name??"ce contact"}.`}
                        </div>
                      </div>
                      {contactInfo?.friendStatus==="pending"&&contactInfo?.friendDirection==="sent"
                        ?<div style={{ color:"rgba(255,255,255,.4)",textAlign:"center",fontSize:14 }}>En attente de réponse…</div>
                        :<button onClick={()=>apiSendFriendRequest(callPeerUser?.id??0).then(()=>apiGetContactInfo(activeConv!).then(i=>{if(i)setContactInfo(i);})).then(()=>setCallOverlay("none"))}
                            style={{ width:"100%",padding:"15px",borderRadius:16,background:"var(--bp-primary)",border:"none",color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer" }}>
                            Envoyer une demande
                          </button>}
                    </div>
                  )}

                  {/* ── AJOUTER GROUPE ── */}
                  {callOverlay === "addgroup" && (
                    <div style={{ padding:"0 20px 4px" }}>
                      <button onClick={()=>setCallOverlay("options")} style={{ background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer",padding:"4px 0 16px",display:"flex",alignItems:"center",gap:6,fontSize:14 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg> Retour
                      </button>
                      <div style={{ fontWeight:800,fontSize:19,color:"#fff",marginBottom:14 }}>Ajouter à un groupe</div>
                      <div style={{ position:"relative",marginBottom:16 }}>
                        <svg style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)" }} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <input value={callAddGroupSearch} onChange={e=>setCallAddGroupSearch(e.target.value)} placeholder="Rechercher un groupe…"
                          style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"12px 14px 12px 42px",color:"#fff",fontSize:15,outline:"none" }} />
                      </div>
                      {callAddGroupList.filter(g=>!callAddGroupSearch||g.name.toLowerCase().includes(callAddGroupSearch.toLowerCase())).length===0
                        ?<div style={{ color:"rgba(255,255,255,.32)",textAlign:"center",padding:"24px 0" }}>Aucun groupe trouvé</div>
                        :callAddGroupList.filter(g=>!callAddGroupSearch||g.name.toLowerCase().includes(callAddGroupSearch.toLowerCase())).map(g=>(
                          <div key={g.id} onClick={()=>apiAddContactToGroup(g.id,callPeerUser?.id??0).then(()=>setCallOverlay("none"))}
                            style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 4px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                            {g.avatarUrl
                              ?<img src={g.avatarUrl} alt={g.name} style={{ width:44,height:44,borderRadius:14,objectFit:"cover" }}/>
                              :<div style={{ width:44,height:44,borderRadius:14,background:"#1a3a20",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--bp-primary)",fontWeight:800,fontSize:16 }}>{g.name[0]?.toUpperCase()}</div>}
                            <div style={{ fontWeight:600,fontSize:15,color:"#fff" }}>{g.name}</div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* ── BLOQUER ── */}
                  {callOverlay === "block" && (
                    <div style={{ padding:"0 20px 4px" }}>
                      <div style={{ textAlign:"center",marginBottom:22,paddingTop:8 }}>
                        <div style={{ width:64,height:64,borderRadius:20,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        </div>
                        <div style={{ fontWeight:800,fontSize:19,color:"#fff" }}>{contactInfo?.isBlocked?"Débloquer le contact":"Bloquer le contact"}</div>
                        <div style={{ fontSize:13.5,color:"rgba(255,255,255,.45)",marginTop:8,lineHeight:1.5 }}>
                          {contactInfo?.isBlocked?`${peer?.name} pourra à nouveau vous contacter.`:`${peer?.name} ne pourra plus vous contacter.`}
                        </div>
                      </div>
                      <div style={{ display:"flex",gap:10 }}>
                        <button onClick={()=>setCallOverlay("options")} style={{ flex:1,padding:"13px",borderRadius:14,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,.78)",fontWeight:700,fontSize:15,cursor:"pointer" }}>Annuler</button>
                        <button onClick={()=>(contactInfo?.isBlocked?apiUnblockUser(callPeerUser?.id??0):apiBlockUser(callPeerUser?.id??0)).then(()=>apiGetContactInfo(activeConv!).then(i=>{if(i)setContactInfo(i);})).then(()=>setCallOverlay("none"))}
                          style={{ flex:1,padding:"13px",borderRadius:14,background:"#EF4444",border:"none",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer" }}>
                          {contactInfo?.isBlocked?"Débloquer":"Bloquer"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── SIGNALER ── */}
                  {callOverlay === "report" && (
                    <div style={{ padding:"0 20px 4px" }}>
                      <button onClick={()=>setCallOverlay("options")} style={{ background:"none",border:"none",color:"rgba(255,255,255,.5)",cursor:"pointer",padding:"4px 0 16px",display:"flex",alignItems:"center",gap:6,fontSize:14 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg> Retour
                      </button>
                      <div style={{ fontWeight:800,fontSize:19,color:"#fff",marginBottom:4 }}>Signaler l'utilisateur</div>
                      <div style={{ fontSize:13,color:"rgba(255,255,255,.4)",marginBottom:16 }}>Signalez ce contact s'il enfreint nos règles</div>
                      <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:16,overflow:"hidden",marginBottom:16 }}>
                        {["Spam","Contenu inapproprié","Harcèlement","Usurpation d'identité","Violence","Nudité","Autre"].map((r,i,arr)=>(
                          <div key={r} onClick={()=>setCallReportReason(r)}
                            style={{ display:"flex",alignItems:"center",padding:"14px 18px",cursor:"pointer",borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
                            <span style={{ flex:1,color:"#fff",fontSize:15 }}>{r}</span>
                            {callReportReason===r
                              ?<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              :<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>}
                          </div>
                        ))}
                      </div>
                      <textarea value={callReportDesc} onChange={e=>setCallReportDesc(e.target.value)} placeholder="Description (optionnel)…" rows={3}
                        style={{ width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:14,padding:"12px 14px",color:"#fff",fontSize:14,outline:"none",resize:"none",marginBottom:16 }} />
                      <button disabled={!callReportReason||callReportSending}
                        onClick={()=>{setCallReportSending(true);apiReportUser(callPeerUser?.id??0,callReportReason,callReportDesc||undefined).then(()=>setCallOverlay("none")).finally(()=>setCallReportSending(false));}}
                        style={{ width:"100%",padding:"15px",borderRadius:16,background:callReportReason?"#F97316":"rgba(255,255,255,0.1)",border:"none",color:"#fff",fontWeight:800,fontSize:16,cursor:callReportReason?"pointer":"not-allowed",opacity:callReportReason?1:0.5 }}>
                        {callReportSending?"Envoi…":"Envoyer le signalement"}
                      </button>
                    </div>
                  )}

                  {/* ── SUPPRIMER ── */}
                  {callOverlay === "delete" && (
                    <div style={{ padding:"0 20px 4px" }}>
                      <div style={{ textAlign:"center",marginBottom:22,paddingTop:8 }}>
                        <div style={{ width:64,height:64,borderRadius:20,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px" }}>
                          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </div>
                        <div style={{ fontWeight:800,fontSize:19,color:"#fff" }}>Supprimer la conversation</div>
                        <div style={{ fontSize:13.5,color:"rgba(255,255,255,.45)",marginTop:8,lineHeight:1.5 }}>Cette action supprimera tous les messages de cette conversation.</div>
                      </div>
                      <div style={{ display:"flex",gap:10 }}>
                        <button onClick={()=>setCallOverlay("options")} style={{ flex:1,padding:"13px",borderRadius:14,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,.78)",fontWeight:700,fontSize:15,cursor:"pointer" }}>Annuler</button>
                        <button onClick={()=>apiDeleteConversationContact(activeConv!).then(()=>{setCallOverlay("none");sig.endCall();})}
                          style={{ flex:1,padding:"13px",borderRadius:14,background:"#EF4444",border:"none",color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer" }}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* ── AUDIO CALL — BrutePawa 2026 Premium ── */
          <>
            <style>{`
              @keyframes bp-ring-a{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.22);opacity:0}}
              @keyframes bp-ring-b{0%,100%{transform:scale(1);opacity:.35}50%{transform:scale(1.38);opacity:0}}
              @keyframes bp-aurora-a{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}
              @keyframes bp-aurora-b{0%,100%{opacity:.4;transform:scale(1) translateX(0)}50%{opacity:.7;transform:scale(1.06) translateX(10px)}}
              @keyframes bp-dot-bounce{0%,80%,100%{opacity:0;transform:translateY(0)}40%{opacity:1;transform:translateY(-5px)}}
              @keyframes bp-wv{0%,100%{height:6px;opacity:.5}50%{height:var(--h,18px);opacity:1}}
              @keyframes bp-end-glow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.7),0 8px 28px rgba(239,68,68,.5)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0),0 8px 28px rgba(239,68,68,.5)}}
              .bpa-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--bp-primary);animation:bp-dot-bounce 1.5s ease-in-out infinite}
              .bpa-dot:nth-child(1){animation-delay:0s}.bpa-dot:nth-child(2){animation-delay:.2s}.bpa-dot:nth-child(3){animation-delay:.4s}
              .bpa-ctrl-btn{display:flex;align-items:center;justify-content:center;width:66px;height:66px;border-radius:50%;border:none;cursor:pointer;transition:transform .12s,box-shadow .12s}
              .bpa-ctrl-btn:active{transform:scale(.91)!important}
            `}</style>

            {/* Deep aurora background */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, #052e16 0%, #052e16 30%, #052e16 65%, #052e16 100%)", zIndex:0 }} />
            <div style={{ position:"absolute", top:"-15%", left:"5%", width:"90%", height:"60%", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(34,197,94,0.26) 0%, rgba(21,128,61,0.10) 40%, transparent 68%)", animation:"bp-aurora-a 7s ease-in-out infinite", zIndex:1, pointerEvents:"none" }} />
            <div style={{ position:"absolute", top:"10%", right:"-15%", width:"55%", height:"45%", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(74,222,128,0.12) 0%, transparent 60%)", animation:"bp-aurora-b 9s ease-in-out infinite", zIndex:1, pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:"20%", left:"-10%", width:"45%", height:"35%", borderRadius:"50%", background:"radial-gradient(ellipse, rgba(34,197,94,0.08) 0%, transparent 60%)", zIndex:1, pointerEvents:"none" }} />

            {/* Speaker button — top right glass */}
            <div style={{ position:"relative", zIndex:10, display:"flex", justifyContent:"flex-end", padding:"52px 20px 0", flexShrink:0 }}>
              <button onClick={() => sig.toggleSpeaker(remoteAudioRef.current)}
                style={{ width:46, height:46, borderRadius:"50%", background:sig.isSpeaker ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.10)", border:`1.5px solid ${sig.isSpeaker ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.2)"}`, backdropFilter:"blur(12px)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(0,0,0,0.35)", transition:"all .2s" }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill={sig.isSpeaker ? "var(--bp-primary)" : "rgba(255,255,255,.75)"}><path d={sig.isSpeaker ? "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" : "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"}/></svg>
              </button>
            </div>

            {/* Center — avatar + waveform + info */}
            <div style={{ position:"relative", zIndex:10, flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>

              {/* Waveform + rings + avatar */}
              <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:36 }}>
                {/* Outer rings */}
                <div style={{ position:"absolute", width:230, height:230, borderRadius:"50%", border:"1.5px solid rgba(34,197,94,0.18)", animation:"bp-ring-b 2.8s ease-out infinite" }} />
                <div style={{ position:"absolute", width:186, height:186, borderRadius:"50%", border:"1.5px solid rgba(34,197,94,0.30)", animation:"bp-ring-a 2.2s ease-out infinite" }} />
                <div style={{ position:"absolute", width:150, height:150, borderRadius:"50%", border:"2px solid rgba(34,197,94,0.42)" }} />

                {/* Waveform bars — left */}
                <div style={{ position:"absolute", left:-52, display:"flex", alignItems:"center", gap:3, height:60 }}>
                  {[14,20,10,24,16,8,18,12].map((h,i) => (
                    <div key={i} className="bpa-wave-bar" style={{ width:3, borderRadius:2, background:"linear-gradient(to top,rgba(34,197,94,0.9),rgba(134,239,172,0.5))", animation:`bp-wv ${0.7 + i*0.11}s ease-in-out infinite`, animationDelay:`${i*0.09}s`, ["--h" as string]:`${h}px`, height:6 }} />
                  ))}
                </div>
                {/* Waveform bars — right */}
                <div style={{ position:"absolute", right:-52, display:"flex", alignItems:"center", gap:3, height:60 }}>
                  {[12,18,8,22,14,20,10,16].map((h,i) => (
                    <div key={i} style={{ width:3, borderRadius:2, background:"linear-gradient(to top,rgba(34,197,94,0.9),rgba(134,239,172,0.5))", animation:`bp-wv ${0.65 + i*0.10}s ease-in-out infinite`, animationDelay:`${i*0.07+0.15}s`, height:6 }} />
                  ))}
                </div>

                {/* Glassmorphism avatar — real photo or initials */}
                <div style={{
                  width:134, height:134, borderRadius:"50%", overflow:"hidden",
                  background:`radial-gradient(circle at 33% 30%, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 60%), radial-gradient(circle at 70% 75%, ${peer?.color ?? "var(--bp-primary-dark)"}cc, ${peer?.color ?? "var(--bp-primary-dark)"}88)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:50, color:"#fff", fontWeight:900,
                  border:"2.5px solid rgba(255,255,255,0.18)",
                  boxShadow:`0 0 0 5px rgba(34,197,94,0.35), 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3)`,
                  backdropFilter:"blur(4px)",
                  textShadow:"0 2px 12px rgba(0,0,0,0.4)",
                }}>
                  {peer?.avatarUrl
                    ? <img src={peer.avatarUrl} alt={peer.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : (peer?.initials ?? "?")
                  }
                </div>
                {/* Online dot */}
                <div style={{ position:"absolute", bottom:10, right:10, width:22, height:22, borderRadius:"50%", background:"radial-gradient(circle, var(--bp-primary), #22c55e)", border:"3px solid #052e16", boxShadow:"0 0 14px rgba(74,222,128,0.8)" }} />
              </div>

              {/* Name + verified (only for creators) */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontWeight:900, fontSize:26, color:"#fff", letterSpacing:0.3, textShadow:"0 2px 16px rgba(0,0,0,0.5)" }}>{peer?.name ?? "Appel vocal"}</span>
                {peer?.role === "creator" && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L14.09 8.26L21 9.27L16.5 13.97L17.64 21L12 17.77L6.36 21L7.5 13.97L3 9.27L9.91 8.26L12 2Z" fill="var(--bp-primary)"/>
                    <polyline points="9,12 11,14 15,10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </div>

              {/* Status */}
              <div style={{ display:"flex", alignItems:"center", gap:4, marginBottom:20 }}>
                {sig.callState === "active"
                  ? <span style={{ color:"var(--bp-primary)", fontWeight:700, fontSize:16, letterSpacing:0.3 }}>● {fmtTime(sig.callDuration)}</span>
                  : <>
                      <span style={{ color:"rgba(255,255,255,.65)", fontSize:15 }}>Sonnerie</span>
                      <span className="bpa-dot" style={{ marginLeft:4 }} /><span className="bpa-dot" /><span className="bpa-dot" />
                    </>
                }
              </div>

              {/* Branding capsule */}
              <div style={{ background:"rgba(34,197,94,0.12)", backdropFilter:"blur(12px)", border:"1px solid rgba(34,197,94,0.28)", borderRadius:24, padding:"7px 18px", display:"flex", alignItems:"center", gap:8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="18" width="3" height="4" rx="1" fill="var(--bp-primary)"/>
                  <rect x="7" y="14" width="3" height="8" rx="1" fill="var(--bp-primary)"/>
                  <rect x="12" y="9" width="3" height="13" rx="1" fill="var(--bp-primary)"/>
                  <rect x="17" y="4" width="3" height="18" rx="1" fill="var(--bp-primary)"/>
                </svg>
                <span style={{ color:"rgba(255,255,255,.85)", fontSize:13, fontWeight:600, letterSpacing:0.2 }}>Appel audio Brutepawa</span>
              </div>
            </div>

            {/* Bottom control bar */}
            <div style={{ position:"relative", zIndex:10, padding:"0 12px 52px", flexShrink:0 }}>
              <div style={{ background:"rgba(10,28,16,0.75)", backdropFilter:"blur(20px)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:28, padding:"18px 16px 16px", boxShadow:"0 -4px 32px rgba(0,0,0,0.4)" }}>
                <div style={{ display:"flex", justifyContent:"space-around", alignItems:"flex-start" }}>
                  {([
                    {
                      label:"Haut-parleur",
                      icon:<svg viewBox="0 0 24 24" width="26" height="26" fill={sig.isSpeaker?"#052e16":"rgba(255,255,255,.9)"}><path d={sig.isSpeaker?"M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z":"M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"}/></svg>,
                      action:() => sig.toggleSpeaker(remoteAudioRef.current),
                      active:sig.isSpeaker,
                    },
                    {
                      label:"Activer vidéo",
                      icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="rgba(255,255,255,.9)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>,
                      action:() => {},
                      active:false,
                    },
                    {
                      label:"Muet",
                      icon:<svg viewBox="0 0 24 24" width="26" height="26" fill={sig.isMuted?"#052e16":"rgba(255,255,255,.9)"}><path d={sig.isMuted?"M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z":"M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28C16.28 17.23 19 14.41 19 11h-1.7z"}/></svg>,
                      action:() => sig.toggleMute(),
                      active:sig.isMuted,
                    },
                    {
                      label:"Raccrocher",
                      icon:<svg viewBox="0 0 24 24" width="28" height="28" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.12-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>,
                      action:() => sig.endCall(),
                      red:true,
                    },
                  ] as {label:string;icon:React.ReactNode;action:()=>void;active?:boolean;red?:boolean}[]).map(b => (
                    <div key={b.label} style={{ textAlign:"center", cursor:"pointer" }} onClick={b.action}>
                      <div className="bpa-ctrl-btn" style={
                        b.red
                          ? { background:"linear-gradient(145deg,#ef4444,#EF4444)", boxShadow:"0 6px 24px rgba(239,68,68,.55), inset 0 1px 0 rgba(255,255,255,.2)", animation:"bp-end-glow 2.5s ease-in-out infinite" }
                          : b.active
                            ? { background:"linear-gradient(145deg,#22c55e,#16a34a)", boxShadow:"0 6px 20px rgba(34,197,94,.45), inset 0 1px 0 rgba(255,255,255,.25)" }
                            : { background:"rgba(255,255,255,0.10)", boxShadow:"0 4px 16px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.12)" }
                      }>{b.icon}</div>
                      <div style={{ color:"rgba(255,255,255,.7)", fontSize:11, fontWeight:600, marginTop:8, letterSpacing:0.1 }}>{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    , document.body);
  }

  /* ══════════════════════════════════════════════════════════════
     EDIT GROUP PAGE — Telegram style
  ══════════════════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════════════════
     GROUP SUB-PAGES — Membres / Admins / Liens / Perms / Réactions / Sujets / Stats
  ══════════════════════════════════════════════════════════════ */
  const GRP_SUB_HEADER = (title: string, onBack: () => void, rightEl?: React.ReactNode) => (
    <div style={{ background:"#fff", display:"flex", alignItems:"center", height:56, padding:"0 4px", flexShrink:0, boxShadow:"0 1px 0 rgba(0,0,0,0.08)", zIndex:5 }}>
      <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span style={{ flex:1, fontWeight:600, fontSize:17, color:"#000", textAlign:"center" }}>{title}</span>
      {rightEl ?? <div style={{ width:48 }} />}
    </div>
  );

  /* ── PARAMÈTRES DU GROUPE (type + lien) ── */
  if (activeGroupId !== null && showGrpParamType) {
    const inviteLink = grpInviteLinks.find(l => !l.revoked)?.url ?? "…";
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10002, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Paramètres du groupe", () => setShowGrpParamType(false),
          <button onClick={() => setShowGrpParamType(false)} style={{ background:"none", border:"none", cursor:"pointer", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        )}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 0 32px" }}>
          {/* Type */}
          <div style={{ background:"#fff", margin:"0 0 6px", padding:"10px 16px 4px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-primary)", marginBottom:12 }}>Type de groupe</div>
            {[{val:false, label:"Groupe privé", desc:"Seules les personnes invitées ou possédant un lien d'invitation peuvent rejoindre un groupe privé."},
              {val:true, label:"Groupe public", desc:"Un groupe public apparaît dans les recherches, l'historique des messages est visible par tous et n'importe qui peut le rejoindre."}].map(opt => (
              <div key={String(opt.val)} onClick={() => setGrpTypePublic(opt.val)} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"10px 0 12px", borderBottom:opt.val ? "none" : "1px solid rgba(0,0,0,0.07)", cursor:"pointer" }}>
                <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${grpTypePublic===opt.val?"var(--bp-primary)":"#CBD5E1"}`, background:grpTypePublic===opt.val?"var(--bp-primary)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                  {grpTypePublic===opt.val && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:15.5, color:"#000" }}>{opt.label}</div>
                  <div style={{ fontSize:13, color:"#9CA3AF", marginTop:3, lineHeight:1.5 }}>{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Invite link */}
          <div style={{ background:"#fff", margin:"0 0 6px", padding:"14px 16px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-primary)", marginBottom:12 }}>Lien d'invitation</div>
            <div style={{ display:"flex", alignItems:"center", background:"#F1F5F9", borderRadius:10, padding:"10px 14px", marginBottom:12, gap:10 }}>
              <span style={{ flex:1, fontSize:14.5, color:"#374151", fontFamily:"monospace" }}>{inviteLink}</span>
              <button style={{ background:"none", border:"none", cursor:"pointer", padding:4 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:12 }}>
              {[{icon:"📋", label:"Copier"},{icon:"↗️", label:"Partager"}].map(b => (
                <button key={b.label} onClick={() => b.label==="Copier"&&navigator.clipboard?.writeText(inviteLink)}
                  style={{ flex:1, background:"var(--bp-primary)", color:"#fff", border:"none", borderRadius:24, padding:"12px 0", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span>{b.icon}</span>{b.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize:13, color:"#9CA3AF", lineHeight:1.5, margin:0 }}>Il est possible de rejoindre votre groupe en suivant ce lien. Vous pouvez le révoquer à tout moment.</p>
          </div>
          {/* Gérer liens */}
          <div style={{ background:"#fff", margin:"0 0 6px" }}>
            <div onClick={() => { setShowGrpParamType(false); setShowGrpLinks(true); }} style={{ display:"flex", alignItems:"center", gap:14, padding:"15px 16px", cursor:"pointer" }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15.5, color:"#000" }}>Gérer les liens d'invitation</div>
                <div style={{ fontSize:13, color:"#9CA3AF", marginTop:2 }}>Vous pouvez créer des liens supplémentaires ayant une durée de vie ou un nombre d'utilisations limités.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── MEMBRES ── */
  if (activeGroupId !== null && showGrpMembers) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    const members = grpMembersData ? [...grpMembersData.admins, ...grpMembersData.others] : (groupInfo?.members ?? []);
    const admins = grpMembersData ? grpMembersData.admins : members.filter(m => m.role === "owner" || m.role === "admin");
    const bots: {userId:number;name:string;desc:string}[] = [];
    const others = grpMembersData ? grpMembersData.others : members.filter(m => m.role !== "owner" && m.role !== "admin");
    const memberIds = new Set(members.map(m => m.userId));
    const addCandidates = grpAllUsers.filter(u => !memberIds.has(u.id));
    const mkName = (m:{firstName?:string|null;lastName?:string|null;userId:number}) => m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : `Utilisateur #${m.userId}`;
    const Section = ({label}:{label:string}) => (
      <div style={{ padding:"8px 16px 4px", fontSize:13, fontWeight:600, color:"#9CA3AF", background:"transparent" }}>{label}</div>
    );
    const MemberRow = ({m, isAdmin}:{m:{userId:number;role:string;firstName?:string|null;lastName?:string|null};isAdmin?:boolean}) => {
      const name = mkName(m);
      const col = CONV_COLORS[m.userId % CONV_COLORS.length];
      const menuOpen = grpMemberMenu === m.userId;
      return (
        <div style={{ position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", background:menuOpen?"#F9FAFB":"#fff", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ width:46, height:46, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:15, flexShrink:0 }}>{mkInitials(name)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:15.5, color:"#000" }}>{name}</div>
              <div style={{ fontSize:12.5, color:m.userId===meId?"var(--bp-primary)":"#9CA3AF", marginTop:1 }}>{m.userId===meId?"en ligne":isAdmin?"en ligne récemment":"en ligne récemment"}</div>
            </div>
            {m.userId !== meId && (
              <button onClick={() => setGrpMemberMenu(menuOpen ? null : m.userId)} style={{ background:"none", border:"none", cursor:"pointer", padding:8, color:"#CBD5E1" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#CBD5E1"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
            )}
          </div>
          {menuOpen && (
            <>
              <div onClick={() => setGrpMemberMenu(null)} style={{ position:"fixed", inset:0, zIndex:5 }} />
              <div style={{ position:"absolute", right:8, top:52, background:"#fff", borderRadius:16, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", zIndex:10, width:220, overflow:"hidden" }}>
                {[
                  {label:"Promouvoir",icon:"🛡️",color:"#000",action:()=>{ apiSetChatGroupMemberRole(activeGroupId, m.userId, "admin").then(refreshGroupInfo).catch(()=>{}); }},
                  {label:"Modifier les permissions",icon:"🔑",color:"#000",action:()=>{ setShowGrpMembers(false); setShowGrpPerms(true); }},
                  {label:"Éjecter",icon:"🚫",color:"#EF4444",action:()=>{ apiRemoveChatGroupMember(activeGroupId, m.userId).then(refreshGroupInfo).catch(()=>{}); }},
                ].map((item,idx)=>(
                  <div key={item.label} onClick={() => { setGrpMemberMenu(null); item.action(); }}
                    style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 18px", cursor:"pointer", borderBottom:idx<2?"1px solid rgba(0,0,0,0.07)":"none" }}>
                    <span style={{ fontSize:18 }}>{item.icon}</span>
                    <span style={{ fontSize:15.5, color:item.color }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    };
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10002, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Membres", () => setShowGrpMembers(false),
          <button style={{ background:"none", border:"none", cursor:"pointer", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
          </button>
        )}
        <div style={{ flex:1, overflowY:"auto" }} onClick={() => setGrpMemberMenu(null)}>
          {/* Cacher les membres */}
          <div style={{ background:"#fff", margin:"0 0 10px", padding:"0 16px" }}>
            <div style={{ display:"flex", alignItems:"center", padding:"14px 0", borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
              <span style={{ flex:1, fontSize:15.5, color:"#000", fontWeight:500 }}>Cacher les membres</span>
              <div onClick={e => {e.stopPropagation(); const nv=!grpHideMembers; setGrpHideMembers(nv); apiPatchGroupSettings(activeGroupId, { hideMembers:nv }).catch(()=>setGrpHideMembers(!nv));}} style={{ width:48, height:28, borderRadius:14, background:grpHideMembers?"var(--bp-primary)":"#E5E7EB", position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:3, left:grpHideMembers?22:3, width:22, height:22, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.25)", transition:"left 0.2s" }} />
              </div>
            </div>
            <p style={{ fontSize:12.5, color:"#9CA3AF", lineHeight:1.5, padding:"8px 0 12px", margin:0 }}>Activez cette option pour masquer la liste des membres du groupe. Les administrateurs resteront visibles.</p>
          </div>
          {/* Actions */}
          <div style={{ background:"#fff", margin:"0 0 10px" }}>
            {[{icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>, label:"Ajouter des membres", action:()=>setGrpAddMembersOpen(v=>!v)},
              {icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, label:"Inviter avec un lien", action:()=>{ setShowGrpMembers(false); setShowGrpLinks(true); }}
            ].map((a,i)=>(
              <div key={a.label} onClick={e=>{e.stopPropagation(); a.action();}} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderBottom:i===0?"1px solid rgba(0,0,0,0.07)":"none", cursor:"pointer" }}>
                {a.icon}<span style={{ fontSize:15.5, color:"var(--bp-primary)", fontWeight:500 }}>{a.label}</span>
              </div>
            ))}
            {grpAddMembersOpen && (
              <div style={{ borderTop:"1px solid rgba(0,0,0,0.07)", maxHeight:280, overflowY:"auto" }}>
                {addCandidates.map(u => {
                  const name = `${u.firstName} ${u.lastName}`;
                  const col = CONV_COLORS[u.id % CONV_COLORS.length];
                  return (
                    <div key={u.id} onClick={e => { e.stopPropagation(); setGrpAddMembersOpen(false); apiAddChatGroupMembers(activeGroupId, [u.id]).then(refreshGroupInfo).catch(()=>{}); }}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:"1px solid rgba(0,0,0,0.06)", cursor:"pointer" }}>
                      <div style={{ width:40, height:40, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:13, flexShrink:0 }}>{mkInitials(name)}</div>
                      <span style={{ flex:1, fontSize:15, color:"#000", fontWeight:500 }}>{name}</span>
                      <span style={{ fontSize:13, color:"var(--bp-primary)", fontWeight:600 }}>Ajouter</span>
                    </div>
                  );
                })}
                {addCandidates.length === 0 && (
                  <p style={{ fontSize:13, color:"#9CA3AF", padding:"12px 16px", margin:0 }}>Aucun utilisateur à ajouter.</p>
                )}
              </div>
            )}
          </div>
          {/* Admins */}
          {admins.length > 0 && <><Section label="Contacts dans ce groupe" /><div style={{ background:"#fff", margin:"0 0 0" }}>{admins.map(m=><MemberRow key={m.userId} m={m} isAdmin />)}</div></>}
          {/* Bots */}
          {bots.length > 0 && <><Section label="Bots" /><div style={{ background:"#fff" }}>{bots.map(b=>(
            <div key={b.userId} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ width:46, height:46, borderRadius:"50%", background:"#3B82F6", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z"/><rect x="4" y="8" width="16" height="12" rx="2"/><circle cx="9" cy="14" r="1.2" fill="#fff"/><circle cx="15" cy="14" r="1.2" fill="#fff"/></svg>
              </div>
              <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:15.5, color:"#000" }}>{b.name}</div><div style={{ fontSize:12.5, color:"#9CA3AF" }}>{b.desc}</div></div>
            </div>
          ))}</div></>}
          {/* Others */}
          {others.length > 0 && <><Section label="Autres membres" /><div style={{ background:"#fff", marginBottom:24 }}>{others.map(m=><MemberRow key={m.userId} m={m} />)}</div></>}
          {members.length === 0 && <div style={{ textAlign:"center", color:"#9CA3AF", padding:"40px 16px", fontSize:14 }}>Aucun membre</div>}
        </div>
      </div>
    , document.body);
  }

  /* ── ADMINISTRATEURS ── */
  if (activeGroupId !== null && showGrpAdmins) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    // Guard: non-admins must not access this sub-page
    if (grp?.role !== "owner" && grp?.role !== "admin") { setTimeout(() => setShowGrpAdmins(false), 0); return null; }
    const admins = (groupInfo?.members ?? []).filter(m => m.role==="owner" || m.role==="admin");
    const mkName = (m:{firstName?:string|null;lastName?:string|null;userId:number}) => m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : `Utilisateur #${m.userId}`;
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10002, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Administrateurs", () => setShowGrpAdmins(false))}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 0 32px" }}>
          {/* Anti-spam */}
          <div style={{ background:"#fff", margin:"0 0 6px", padding:"0 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0" }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span style={{ flex:1, fontSize:15.5, color:"#000" }}>Anti-spam agressif</span>
              <div onClick={() => { const nv=!grpAntiSpam; setGrpAntiSpam(nv); apiPatchGroupSettings(activeGroupId, { antiSpam:nv }).catch(()=>setGrpAntiSpam(!nv)); }} style={{ width:48, height:28, borderRadius:14, background:grpAntiSpam?"var(--bp-primary)":"#E5E7EB", position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:3, left:grpAntiSpam?22:3, width:22, height:22, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.25)", transition:"left 0.2s" }} />
              </div>
            </div>
            <p style={{ fontSize:12.5, color:"#9CA3AF", lineHeight:1.5, padding:"0 0 12px", margin:0 }}>Brute Pawa filtrera davantage de spam mais cela peut occasionnellement impacter les messages ordinaires. Vous pouvez signaler les faux positifs dans les actions récentes.</p>
          </div>
          {/* Add admin */}
          <div style={{ background:"#fff", margin:"0 0 6px" }}>
            <div onClick={() => setGrpAddAdminOpen(v=>!v)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", cursor:"pointer" }}>
              <div style={{ width:46, height:46, borderRadius:"50%", background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <span style={{ fontSize:15.5, color:"var(--bp-primary)", fontWeight:500 }}>Ajouter un administrateur</span>
            </div>
            {grpAddAdminOpen && (groupInfo?.members ?? []).filter(m => m.role === "member").map(m => {
              const name = mkName(m);
              const col = CONV_COLORS[m.userId % CONV_COLORS.length];
              return (
                <div key={m.userId} onClick={() => { setGrpAddAdminOpen(false); apiSetChatGroupMemberRole(activeGroupId, m.userId, "admin").then(refreshGroupInfo).catch(()=>{}); }}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderTop:"1px solid rgba(0,0,0,0.06)", cursor:"pointer" }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:13, flexShrink:0 }}>{mkInitials(name)}</div>
                  <span style={{ flex:1, fontSize:15, color:"#000", fontWeight:500 }}>{name}</span>
                  <span style={{ fontSize:13, color:"var(--bp-primary)", fontWeight:600 }}>Promouvoir</span>
                </div>
              );
            })}
            {grpAddAdminOpen && (groupInfo?.members ?? []).filter(m => m.role === "member").length === 0 && (
              <p style={{ fontSize:13, color:"#9CA3AF", padding:"0 16px 12px", margin:0 }}>Tous les membres sont déjà administrateurs.</p>
            )}
          </div>
          {/* Admin list */}
          <div style={{ background:"#fff", margin:"0 0 6px" }}>
            {admins.map((m,i) => {
              const name = mkName(m);
              const col = CONV_COLORS[m.userId % CONV_COLORS.length];
              return (
                <div key={m.userId} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", borderBottom:i<admins.length-1?"1px solid rgba(0,0,0,0.07)":"none" }}>
                  <div style={{ width:46, height:46, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:15, flexShrink:0 }}>{mkInitials(name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:15.5, color:"#000" }}>{name}</div>
                    <div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:1 }}>{m.role==="owner"?"Propriétaire":`Promu par ${grp?.name??'Admin'}`}</div>
                  </div>
                  {m.role !== "owner" && (
                    <div style={{ position:"relative" }}>
                      <button onClick={() => setGrpAdminMenu(grpAdminMenu === m.userId ? null : m.userId)} style={{ background:"none", border:"none", cursor:"pointer", padding:8 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="#CBD5E1"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                      </button>
                      {grpAdminMenu === m.userId && (
                        <>
                          <div onClick={() => setGrpAdminMenu(null)} style={{ position:"fixed", inset:0, zIndex:5 }} />
                          <div style={{ position:"absolute", right:0, top:36, background:"#fff", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", zIndex:10, width:200, overflow:"hidden" }}>
                            <div onClick={() => { setGrpAdminMenu(null); apiSetChatGroupMemberRole(activeGroupId, m.userId, "member").then(refreshGroupInfo).catch(()=>{}); }}
                              style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", cursor:"pointer" }}>
                              <span style={{ fontSize:17 }}>⬇️</span>
                              <span style={{ fontSize:15, color:"#EF4444" }}>Retirer des admins</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {admins.length === 0 && (
              <div style={{ textAlign:"center", color:"#9CA3AF", padding:"24px", fontSize:14 }}>Aucun administrateur</div>
            )}
          </div>
          <p style={{ margin:"6px 16px 0", fontSize:12.5, color:"#9CA3AF", lineHeight:1.5 }}>Vous pouvez ajouter des administrateurs pour vous aider à gérer votre groupe. Maintenez appuyé dessus pour les retirer.</p>
        </div>
      </div>
    , document.body);
  }

  /* ── LIENS D'INVITATION (helpers) ── */
  const activeLink = activeLinkId ? grpInviteLinks.find(l => l.id === activeLinkId) ?? null : null;
  const grpCopyLink = (url: string) => {
    navigator.clipboard?.writeText(`https://${url}`).then(() => { setGrpLinkCopied(true); setTimeout(() => setGrpLinkCopied(false), 2000); }).catch(() => {});
  };
  const LinkStatusBadge = ({ status }: { status: string }) => {
    const cfg: Record<string, { label: string; bg: string; color: string }> = {
      active: { label: "Actif", bg: "#DCFCE7", color: "#16A34A" },
      expired: { label: "Expiré", bg: "#FEF3C7", color: "#D97706" },
      revoked: { label: "Révoqué", bg: "#FEE2E2", color: "#DC2626" },
      limit_reached: { label: "Limite", bg: "#E0E7FF", color: "#4F46E5" },
    };
    const c = cfg[status] ?? cfg.active;
    return <span style={{ fontSize:11.5, fontWeight:700, padding:"3px 8px", borderRadius:20, background:c.bg, color:c.color }}>{c.label}</span>;
  };
  const LinkThreeDotMenu = ({ link, top }: { link: ApiGroupInviteLink; top?: number }) => (
    grpLinkMenu === link.id ? (
      <>
        <div onClick={() => setGrpLinkMenu(null)} style={{ position:"fixed", inset:0, zIndex:10008 }} />
        <div style={{ position:"absolute", right:8, top:top ?? 40, background:"#fff", borderRadius:14, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", zIndex:10009, width:220, overflow:"hidden", animation:"fadeIn 0.12s ease" }}>
          <div onClick={() => { setGrpLinkMenu(null); setLinkEditName(link.name ?? link.label ?? ""); setLinkEditType(link.type ?? "unlimited"); setLinkEditMaxUses(String(link.maxUses ?? 100)); setLinkEditExpiry(link.expiresAt ? link.expiresAt.slice(0,16) : ""); setActiveLinkId(link.id); setShowGrpLinkEdit(true); }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", cursor:"pointer", borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span style={{ fontSize:15, color:"#111" }}>Modifier</span>
          </div>
          <div onClick={() => { setGrpLinkMenu(null); setActiveLinkId(link.id); setShowGrpLinkRevoke(true); }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", cursor:"pointer", borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            <span style={{ fontSize:15, color:"#EF4444" }}>Révoquer le lien</span>
          </div>
          <div onClick={() => { setGrpLinkMenu(null); setActiveLinkId(link.id); setLinkStatsLoading(true); setShowGrpLinkStats(true); apiGetGroupInviteLinkStats(activeGroupId!, link.id).then(s => { setLinkStats(s); setLinkStatsLoading(false); }).catch(() => setLinkStatsLoading(false)); }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", cursor:"pointer", borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span style={{ fontSize:15, color:"#111" }}>Voir les statistiques</span>
          </div>
          <div onClick={() => { setGrpLinkMenu(null); setActiveLinkId(link.id); setShowGrpLinkQR(true); }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", cursor:"pointer" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7v7"/><path d="M14 14v3"/><path d="M17 14h4"/><path d="M17 17h4"/></svg>
            <span style={{ fontSize:15, color:"#111" }}>Partager via QR Code</span>
          </div>
        </div>
      </>
    ) : null
  );

  /* ── LIENS D'INVITATION (portal principal) ── */
  if (activeGroupId !== null && showGrpLinks) {
    const activeLinks = grpInviteLinks.filter(l => !l.revoked && l.status !== "expired" && l.status !== "limit_reached");
    const primaryLink = activeLinks[0];
    const inviteUrl = primaryLink?.url ?? "";
    const otherLinks = grpInviteLinks.filter(l => l.id !== primaryLink?.id);

    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10002, display:"flex", flexDirection:"column" }} onClick={() => setGrpLinkMenu(null)}>
        {GRP_SUB_HEADER("Liens d'invitation", () => setShowGrpLinks(false))}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 0 40px" }}>
          {/* Lien principal */}
          <div style={{ background:"#fff", margin:"0 0 8px", padding:"16px 16px 14px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--bp-primary)", textTransform:"uppercase", letterSpacing:0.7, marginBottom:12 }}>Lien d'invitation</div>
            {primaryLink ? (
              <div style={{ position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", background:"#F8FAFC", borderRadius:12, padding:"12px 14px", marginBottom:12, border:"1px solid #E2E8F0" }}>
                  <span style={{ flex:1, fontSize:13.5, color:"#374151", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inviteUrl}</span>
                  <button onClick={e => { e.stopPropagation(); setGrpLinkMenu(grpLinkMenu === primaryLink.id ? null : primaryLink.id); }}
                    style={{ background:"none", border:"none", cursor:"pointer", padding:"4px 6px", marginLeft:4, borderRadius:6, display:"flex", alignItems:"center" }}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="#94A3B8"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
                  </button>
                  <LinkThreeDotMenu link={primaryLink} top={44} />
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={() => grpCopyLink(inviteUrl)}
                    style={{ flex:1, background: grpLinkCopied ? "#16A34A" : "var(--bp-primary)", color:"#fff", border:"none", borderRadius:24, padding:"13px 0", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"background 0.2s" }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    {grpLinkCopied ? "Copié !" : "Copier"}
                  </button>
                  <button onClick={() => { setActiveLinkId(primaryLink.id); setShowGrpLinkShare(true); }}
                    style={{ flex:1, background:"var(--bp-primary)", color:"#fff", border:"none", borderRadius:24, padding:"13px 0", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    Partager
                  </button>
                </div>
                <p style={{ fontSize:12.5, color:"#9CA3AF", lineHeight:1.55, margin:"10px 0 0" }}>Il est possible de rejoindre votre groupe en suivant ce lien. Vous pouvez le révoquer à tout moment.</p>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"16px 0" }}>
                <p style={{ fontSize:14, color:"#9CA3AF", margin:"0 0 12px" }}>Aucun lien actif</p>
              </div>
            )}
          </div>

          {/* Créer un nouveau lien */}
          <div style={{ background:"#fff", margin:"0 0 2px" }}>
            <div onClick={() => { setNewLinkType("unlimited"); setNewLinkName(""); setNewLinkMaxUses("100"); setNewLinkExpiry(""); setShowGrpCreateLink(true); }}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", cursor:"pointer" }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:"var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span style={{ fontSize:15.5, color:"var(--bp-primary)", fontWeight:600 }}>Créer un nouveau lien</span>
            </div>
          </div>
          {/* Gérer les liens */}
          <div style={{ background:"#fff", margin:"0 0 8px" }}>
            <div onClick={() => setShowGrpLinkManage(true)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", cursor:"pointer", borderTop:"1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ width:34, height:34, borderRadius:"50%", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15.5, color:"#000", fontWeight:500 }}>Gérer les liens d'invitation</div>
                <div style={{ fontSize:12.5, color:"#9CA3AF" }}>Définissez des liens supplémentaires ayant des limites personnalisées.</div>
              </div>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>

          {/* À propos */}
          <div style={{ background:"#fff", margin:"0 0 8px", padding:"16px 16px 20px" }}>
            <div style={{ fontSize:13.5, fontWeight:700, color:"#374151", marginBottom:14 }}>À propos des liens d'invitation</div>
            {[
              "Les liens d'invitation permettent à d'autres personnes de rejoindre votre groupe.",
              "Vous pouvez créer plusieurs liens avec des limites personnalisées.",
              "Vous pouvez révoquer un lien à tout moment.",
            ].map((txt, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:i<2?12:0 }}>
                <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(34,197,94,0.12)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round">
                    {i===0 && <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
                    {i===1 && <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>}
                    {i===2 && <><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>}
                  </svg>
                </div>
                <span style={{ fontSize:13.5, color:"#4B5563", lineHeight:1.5 }}>{txt}</span>
              </div>
            ))}
            {/* Chain illustration */}
            <div style={{ display:"flex", justifyContent:"center", marginTop:24 }}>
              <svg viewBox="0 0 120 60" width="120" height="60">
                <ellipse cx="30" cy="30" rx="25" ry="14" fill="none" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" transform="rotate(-30 30 30)"/>
                <ellipse cx="90" cy="30" rx="25" ry="14" fill="none" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" transform="rotate(-30 90 30)"/>
                <ellipse cx="60" cy="30" rx="25" ry="14" fill="none" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round" transform="rotate(30 60 30)"/>
              </svg>
            </div>
          </div>
        </div>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.96) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
      </div>
    , document.body);
  }

  /* ── CRÉER UN NOUVEAU LIEN ── */
  if (activeGroupId !== null && showGrpCreateLink) {
    const showUses = newLinkType === "uses" || newLinkType === "both";
    const showDur  = newLinkType === "duration" || newLinkType === "both";
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10003, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Créer un nouveau lien", () => setShowGrpCreateLink(false))}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 0 32px" }}>
          {/* Type de lien */}
          <div style={{ background:"#fff", margin:"0 0 6px", padding:"14px 16px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--bp-primary)", textTransform:"uppercase", letterSpacing:0.7, marginBottom:14 }}>Type de lien</div>
            {([
              { val:"unlimited", label:"Lien illimité", desc:"Aucune limite d'utilisation ou de durée." },
              { val:"uses", label:"Lien avec limite d'utilisations", desc:"Limitez le nombre de personnes pouvant utiliser ce lien." },
              { val:"duration", label:"Lien avec durée limitée", desc:"Définissez une date d'expiration pour ce lien." },
              { val:"both", label:"Lien avec limites personnalisées", desc:"Combinez limite d'utilisations et date d'expiration." },
            ] as { val: typeof newLinkType; label: string; desc: string }[]).map((opt, i, arr) => (
              <div key={opt.val} onClick={() => setNewLinkType(opt.val)}
                style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 0", borderBottom:i<arr.length-1?"1px solid rgba(0,0,0,0.07)":"none", cursor:"pointer" }}>
                <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${newLinkType===opt.val?"var(--bp-primary)":"#CBD5E1"}`, background:newLinkType===opt.val?"var(--bp-primary)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                  {newLinkType===opt.val && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />}
                </div>
                <div>
                  <div style={{ fontSize:15.5, color:"#000", fontWeight:500 }}>{opt.label}</div>
                  <div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>{opt.desc}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Paramètres */}
          <div style={{ background:"#fff", margin:"0 0 6px", padding:"14px 16px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"var(--bp-primary)", textTransform:"uppercase", letterSpacing:0.7, marginBottom:14 }}>Paramètres du lien</div>
            {/* Nom optionnel */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Nom du lien (optionnel)</div>
              <input value={newLinkName} onChange={e=>setNewLinkName(e.target.value)} placeholder="Ex: Événement spécial"
                style={{ width:"100%", border:"1.5px solid #E2E8F0", borderRadius:10, padding:"11px 13px", fontSize:15, color:"#111", background:"#F8FAFC", outline:"none", boxSizing:"border-box" }} />
            </div>
            {showUses && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Limite d'utilisations</div>
                <div style={{ position:"relative" }}>
                  <input type="number" min={1} max={99999} value={newLinkMaxUses} onChange={e=>setNewLinkMaxUses(e.target.value)}
                    style={{ width:"100%", border:"1.5px solid #E2E8F0", borderRadius:10, padding:"11px 13px", fontSize:15, color:"#111", background:"#F8FAFC", outline:"none", boxSizing:"border-box" }} />
                  <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#9CA3AF" }}>0 / {newLinkMaxUses || 0} utilisations</span>
                </div>
              </div>
            )}
            {showDur && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Date d'expiration</div>
                <input type="datetime-local" value={newLinkExpiry} onChange={e=>setNewLinkExpiry(e.target.value)}
                  style={{ width:"100%", border:"1.5px solid #E2E8F0", borderRadius:10, padding:"11px 13px", fontSize:15, color:"#111", background:"#F8FAFC", outline:"none", boxSizing:"border-box" }} />
                {!newLinkExpiry && <p style={{ fontSize:12, color:"#F59E0B", margin:"6px 0 0" }}>Veuillez sélectionner une date d'expiration.</p>}
              </div>
            )}
          </div>
        </div>
        {/* Bouton créer */}
        <div style={{ padding:"12px 16px 28px", background:"#fff", borderTop:"1px solid rgba(0,0,0,0.07)" }}>
          <button disabled={newLinkCreating || (showDur && !newLinkExpiry)}
            onClick={() => {
              setNewLinkCreating(true);
              apiCreateGroupInviteLink(activeGroupId, newLinkName.trim() || undefined, {
                type: newLinkType,
                maxUses: showUses && newLinkMaxUses ? parseInt(newLinkMaxUses) : undefined,
                expiresAt: showDur && newLinkExpiry ? new Date(newLinkExpiry).toISOString() : undefined,
              }).then(link => {
                setGrpInviteLinks(prev => [link, ...prev]);
                setCreatedLink(link);
                setNewLinkCreating(false);
                setShowGrpCreateLink(false);
                setShowGrpLinkCreated(true);
              }).catch(() => setNewLinkCreating(false));
            }}
            style={{ width:"100%", padding:"14px", background: (newLinkCreating||(showDur&&!newLinkExpiry)) ? "#9CA3AF" : "var(--bp-primary)", border:"none", borderRadius:14, fontSize:16, fontWeight:700, color:"#fff", cursor: (newLinkCreating||(showDur&&!newLinkExpiry)) ? "default" : "pointer" }}>
            {newLinkCreating ? "Création…" : "Créer le lien"}
          </button>
        </div>
      </div>
    , document.body);
  }

  /* ── LIEN CRÉÉ (success) ── */
  if (activeGroupId !== null && showGrpLinkCreated && createdLink) {
    const typeLabel: Record<string,string> = { unlimited:"Illimité", uses:"Limité en utilisations", duration:"Durée limitée", both:"Limites personnalisées" };
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10003, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Lien d'invitation créé !", () => { setShowGrpLinkCreated(false); setCreatedLink(null); })}
        <div style={{ flex:1, overflowY:"auto", padding:"32px 16px 24px", display:"flex", flexDirection:"column", alignItems:"center" }}>
          {/* Success animation */}
          <div style={{ width:90, height:90, borderRadius:"50%", background:"linear-gradient(135deg, #dcfce7, #bbf7d0)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16, boxShadow:"0 8px 32px rgba(34,197,94,0.25)" }}>
            <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize:19, fontWeight:700, color:"#000", marginBottom:6, textAlign:"center" }}>Votre lien a été créé avec succès</div>
          {/* Link card */}
          <div style={{ width:"100%", background:"#fff", borderRadius:16, padding:"14px 16px", marginBottom:16, marginTop:16, boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"flex", alignItems:"center", background:"#F8FAFC", borderRadius:10, padding:"11px 13px", marginBottom:12, border:"1px solid #E2E8F0", gap:8 }}>
              <span style={{ flex:1, fontSize:13.5, color:"#374151", fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{createdLink.url}</span>
              <button onClick={() => setGrpLinkMenu(grpLinkMenu===createdLink.id?null:createdLink.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:4, position:"relative" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#94A3B8"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
              </button>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:10 }}>Détails du lien</div>
            {[
              { icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>, label:"Type", val: typeLabel[createdLink.type] ?? "Illimité" },
              { icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>, label:"Utilisations", val: `0 / ${createdLink.maxUses ?? "∞"}` },
              { icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, label:"Expire le", val: createdLink.expiresAt ? new Date(createdLink.expiresAt).toLocaleString("fr-FR") : "Jamais" },
            ].map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(0,0,0,0.06)" }}>
                {item.icon}
                <span style={{ fontSize:13.5, color:"#9CA3AF", width:90 }}>{item.label}</span>
                <span style={{ fontSize:13.5, color:"#111", fontWeight:500 }}>{item.val}</span>
              </div>
            ))}
          </div>
          {/* Actions */}
          <div style={{ display:"flex", gap:10, width:"100%" }}>
            <button onClick={() => grpCopyLink(createdLink.url)} style={{ flex:1, background:"var(--bp-primary)", color:"#fff", border:"none", borderRadius:24, padding:"13px 0", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copier
            </button>
            <button onClick={() => { setActiveLinkId(createdLink.id); setShowGrpLinkShare(true); }} style={{ flex:1, background:"var(--bp-primary)", color:"#fff", border:"none", borderRadius:24, padding:"13px 0", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Partager
            </button>
          </div>
          <button onClick={() => { setShowGrpLinkCreated(false); setCreatedLink(null); }} style={{ background:"none", border:"none", color:"#9CA3AF", fontSize:15, padding:"14px", cursor:"pointer", marginTop:4 }}>Terminer</button>
        </div>
      </div>
    , document.body);
  }

  /* ── STATISTIQUES DU LIEN ── */
  if (activeGroupId !== null && showGrpLinkStats && activeLink) {
    const STAT_COLORS = ["#EC4899","#8B5CF6","#F97316","#22C55E","#0EA5E9","#F59E0B","#EF4444"];
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10004, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Statistiques du lien", () => setShowGrpLinkStats(false))}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 0 32px" }}>
          {linkStatsLoading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"60px 0" }}>
              <div style={{ width:32, height:32, border:"3px solid #E5E7EB", borderTop:"3px solid var(--bp-primary)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            </div>
          ) : linkStats ? (
            <>
              {/* URL card */}
              <div style={{ background:"#fff", margin:"0 0 8px", padding:"12px 16px" }}>
                <span style={{ fontSize:13, color:"#374151", fontFamily:"monospace" }}>{activeLink.url}</span>
              </div>
              {/* Vue d'ensemble */}
              <div style={{ background:"#fff", margin:"0 0 8px", padding:"16px" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:14 }}>Vue d'ensemble</div>
                <div style={{ display:"flex", gap:12 }}>
                  {[
                    { icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, label:"Clics", val:linkStats.clicks },
                    { icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>, label:"Utilisations", val:linkStats.uses },
                    { icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, label:"Conversion", val:`${linkStats.conversionRate}%` },
                  ].map(s => (
                    <div key={s.label} style={{ flex:1, textAlign:"center", background:"#F8FAFC", borderRadius:14, padding:"14px 8px" }}>
                      <div style={{ display:"flex", justifyContent:"center", marginBottom:6 }}>{s.icon}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:"#111" }}>{s.val}</div>
                      <div style={{ fontSize:12, color:"#9CA3AF", fontWeight:500 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Activité récente */}
              <div style={{ background:"#fff", margin:"0 0 8px", padding:"16px 16px 8px" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:12 }}>Activité récente</div>
                {linkStats.activity.length === 0 && <p style={{ fontSize:14, color:"#9CA3AF", textAlign:"center", padding:"20px 0" }}>Aucune activité récente</p>}
                {linkStats.activity.map((item, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:i<linkStats.activity.length-1?"1px solid rgba(0,0,0,0.06)":"none" }}>
                    <div style={{ width:40, height:40, borderRadius:"50%", background: STAT_COLORS[i % STAT_COLORS.length], display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>{item.initials}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:14.5, color:"#000" }}>{item.userName}</div>
                      <div style={{ fontSize:12.5, color:"#9CA3AF" }}>{item.action}</div>
                    </div>
                    <span style={{ fontSize:12, color:"#9CA3AF", whiteSpace:"nowrap" }}>{item.time}</span>
                  </div>
                ))}
                {linkStats.activity.length > 0 && (
                  <div style={{ textAlign:"center", padding:"12px 0 4px" }}>
                    <span style={{ fontSize:14, color:"var(--bp-primary)", fontWeight:600, cursor:"pointer" }}>Voir toutes les activités &gt;</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"60px 16px" }}>
              <p style={{ fontSize:14, color:"#9CA3AF" }}>Impossible de charger les statistiques.</p>
            </div>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    , document.body);
  }

  /* ── QR CODE ── */
  if (activeGroupId !== null && showGrpLinkQR && activeLink) {
    const qrUrl = `https://${activeLink.url}`;
    const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}&bgcolor=FFFFFF&color=000000&qzone=2&format=png`;
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10004, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Partager via QR Code", () => setShowGrpLinkQR(false))}
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 24px" }}>
          <div style={{ background:"#fff", borderRadius:20, padding:24, boxShadow:"0 4px 24px rgba(0,0,0,0.1)", marginBottom:24 }}>
            <img src={qrImgUrl} alt="QR Code" width={220} height={220} style={{ display:"block", borderRadius:8 }} />
          </div>
          <div style={{ background:"#F8FAFC", borderRadius:12, padding:"10px 16px", marginBottom:24, width:"100%", border:"1px solid #E2E8F0", textAlign:"center" }}>
            <span style={{ fontSize:13.5, color:"#374151", fontFamily:"monospace" }}>{activeLink.url}</span>
          </div>
          <div style={{ display:"flex", gap:12, width:"100%" }}>
            <a href={qrImgUrl} download="qr-code.png" target="_blank" rel="noopener noreferrer"
              style={{ flex:1, background:"var(--bp-primary)", color:"#fff", border:"none", borderRadius:24, padding:"13px 0", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, textDecoration:"none" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Enregistrer
            </a>
            <button onClick={() => { setShowGrpLinkQR(false); setShowGrpLinkShare(true); }}
              style={{ flex:1, background:"var(--bp-primary)", color:"#fff", border:"none", borderRadius:24, padding:"13px 0", fontSize:15, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Partager
            </button>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── PARTAGER LE LIEN ── */
  if (activeGroupId !== null && showGrpLinkShare && activeLink) {
    const shareUrl = `https://${activeLink.url}`;
    const socialLinks = [
      { name:"WhatsApp", bg:"#25D366", url:`https://wa.me/?text=${encodeURIComponent("Rejoins mon groupe BrutePawa : "+shareUrl)}`, icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
      { name:"Messenger", bg:"#0099FF", url:`https://m.me/share?link=${encodeURIComponent(shareUrl)}`, icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.745 6.622 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.193 14.963l-3.056-3.26-5.963 3.26L10.986 8.4l3.13 3.26 5.888-3.26-6.81 6.563z"/></svg> },
      { name:"Telegram", bg:"#26A5E4", url:`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=Rejoins+mon+groupe`, icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
      { name:"Facebook", bg:"#1877F2", url:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    ];
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10004, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Partager le lien", () => setShowGrpLinkShare(false))}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 0" }}>
          {/* Apps de partage */}
          <div style={{ background:"#fff", margin:"0 0 8px", padding:"20px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-around", marginBottom:4 }}>
              {socialLinks.map(s => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, textDecoration:"none" }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>
                    {s.icon}
                  </div>
                  <span style={{ fontSize:12, color:"#374151", fontWeight:500 }}>{s.name}</span>
                </a>
              ))}
            </div>
          </div>
          {/* Actions supplémentaires */}
          <div style={{ background:"#fff", margin:"0 0 8px" }}>
            {[
              { icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>, label:"Copier le lien", action: () => grpCopyLink(activeLink.url) },
              { icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7v7"/><path d="M14 14v3"/><path d="M17 14h4"/></svg>, label:"Partager via QR Code", action: () => { setShowGrpLinkShare(false); setShowGrpLinkQR(true); } },
              { icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, label:"Plus d'options", action: () => { if (navigator.share) navigator.share({ title: "BrutePawa", url: shareUrl }).catch(()=>{}); else grpCopyLink(activeLink.url); } },
            ].map((item, i, arr) => (
              <div key={item.label} onClick={item.action}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid rgba(0,0,0,0.07)":"none", cursor:"pointer" }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(34,197,94,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize:15.5, color:"#111" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── MODIFIER LE LIEN ── */
  if (activeGroupId !== null && showGrpLinkEdit && activeLink) {
    const editShowUses = linkEditType === "uses" || linkEditType === "both";
    const editShowDur  = linkEditType === "duration" || linkEditType === "both";
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10004, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Modifier le lien", () => setShowGrpLinkEdit(false))}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 0 24px" }}>
          <div style={{ background:"#fff", margin:"0 0 8px", padding:"14px 16px" }}>
            {/* Nom */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Nom du lien</div>
              <input value={linkEditName} onChange={e=>setLinkEditName(e.target.value)} placeholder="Ex: Invitation communauté BrutePawa"
                style={{ width:"100%", border:"1.5px solid #E2E8F0", borderRadius:10, padding:"11px 13px", fontSize:15, color:"#111", background:"#F8FAFC", outline:"none", boxSizing:"border-box" }} />
            </div>
            {/* Type */}
            <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:8 }}>Type de lien</div>
            {([
              { val:"unlimited", label:"Lien illimité" },
              { val:"uses", label:"Limité en utilisations" },
              { val:"duration", label:"Durée limitée" },
              { val:"both", label:"Limites personnalisées" },
            ] as { val: string; label: string }[]).map((opt, i, arr) => (
              <div key={opt.val} onClick={() => setLinkEditType(opt.val)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:i<arr.length-1?"1px solid rgba(0,0,0,0.07)":"none", cursor:"pointer" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${linkEditType===opt.val?"var(--bp-primary)":"#CBD5E1"}`, background:linkEditType===opt.val?"var(--bp-primary)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {linkEditType===opt.val && <div style={{ width:7, height:7, borderRadius:"50%", background:"#fff" }} />}
                </div>
                <span style={{ fontSize:15, color:"#111" }}>{opt.label}</span>
              </div>
            ))}
          </div>
          {(editShowUses || editShowDur) && (
            <div style={{ background:"#fff", margin:"0 0 8px", padding:"14px 16px" }}>
              {editShowUses && (
                <div style={{ marginBottom:editShowDur?16:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Limite d'utilisations</div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <input type="number" min={1} value={linkEditMaxUses} onChange={e=>setLinkEditMaxUses(e.target.value)}
                      style={{ flex:1, border:"1.5px solid #E2E8F0", borderRadius:10, padding:"11px 13px", fontSize:15, color:"#111", background:"#F8FAFC", outline:"none" }} />
                    <span style={{ fontSize:13, color:"#9CA3AF", whiteSpace:"nowrap" }}>{activeLink.usesCount} / {linkEditMaxUses} utilisations</span>
                  </div>
                </div>
              )}
              {editShowDur && (
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>Date d'expiration</div>
                  <input type="datetime-local" value={linkEditExpiry} onChange={e=>setLinkEditExpiry(e.target.value)}
                    style={{ width:"100%", border:"1.5px solid #E2E8F0", borderRadius:10, padding:"11px 13px", fontSize:15, color:"#111", background:"#F8FAFC", outline:"none", boxSizing:"border-box" }} />
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ padding:"12px 16px 28px", background:"#fff", borderTop:"1px solid rgba(0,0,0,0.07)" }}>
          <button disabled={linkEditSaving}
            onClick={() => {
              setLinkEditSaving(true);
              apiUpdateGroupInviteLink(activeGroupId, activeLink.id, {
                name: linkEditName.trim() || undefined,
                type: linkEditType,
                maxUses: editShowUses ? parseInt(linkEditMaxUses) || null : null,
                expiresAt: editShowDur && linkEditExpiry ? new Date(linkEditExpiry).toISOString() : null,
              }).then(updated => {
                setGrpInviteLinks(prev => prev.map(l => l.id === updated.id ? updated : l));
                setLinkEditSaving(false);
                setShowGrpLinkEdit(false);
              }).catch(() => setLinkEditSaving(false));
            }}
            style={{ width:"100%", padding:"14px", background:linkEditSaving?"#9CA3AF":"var(--bp-primary)", border:"none", borderRadius:14, fontSize:16, fontWeight:700, color:"#fff", cursor:linkEditSaving?"default":"pointer" }}>
            {linkEditSaving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    , document.body);
  }

  /* ── RÉVOQUER LE LIEN (confirmation) ── */
  if (activeGroupId !== null && showGrpLinkRevoke && activeLink) {
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10010, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} onClick={() => setShowGrpLinkRevoke(false)} />
        <div style={{ position:"relative", background:"#fff", borderRadius:"20px 20px 0 0", padding:"24px 16px 36px", width:"100%", maxWidth:480, animation:"slideUp 0.2s ease" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB", margin:"0 auto 20px" }} />
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <h3 style={{ fontSize:19, fontWeight:700, color:"#000", textAlign:"center", margin:"0 0 10px" }}>Révoquer ce lien ?</h3>
          <p style={{ fontSize:14.5, color:"#6B7280", textAlign:"center", lineHeight:1.55, margin:"0 0 24px" }}>Les personnes utilisant ce lien ne pourront plus rejoindre le groupe avec celui-ci.</p>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <button onClick={() => {
              apiRevokeGroupInviteLink(activeGroupId, activeLink.id)
                .then(() => {
                  setGrpInviteLinks(prev => prev.map(l => l.id === activeLink.id ? { ...l, revoked: true, status: "revoked" as const, revokedAt: new Date().toISOString() } : l));
                  setShowGrpLinkRevoke(false);
                  setActiveLinkId(null);
                })
                .catch(() => {});
            }}
              style={{ padding:"14px", background:"#EF4444", border:"none", borderRadius:14, fontSize:16, fontWeight:700, color:"#fff", cursor:"pointer" }}>
              Révoquer le lien
            </button>
            <button onClick={() => setShowGrpLinkRevoke(false)}
              style={{ padding:"14px", background:"#F1F5F9", border:"none", borderRadius:14, fontSize:16, fontWeight:600, color:"#374151", cursor:"pointer" }}>
              Annuler
            </button>
          </div>
        </div>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    , document.body);
  }

  /* ── GESTION DES LIENS ── */
  if (activeGroupId !== null && showGrpLinkManage) {
    const FILTERS: { key: typeof linkManageFilter; label: string }[] = [
      { key: "all", label: "Tous" },
      { key: "active", label: "Actifs" },
      { key: "revoked", label: "Révoqués" },
      { key: "expired", label: "Expirés" },
    ];
    const filteredLinks = grpInviteLinks.filter(l => {
      if (linkManageFilter === "all") return true;
      return l.status === linkManageFilter;
    });
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10003, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Gestion des liens", () => setShowGrpLinkManage(false))}
        {/* Filtres */}
        <div style={{ display:"flex", gap:8, padding:"12px 16px", background:"#fff", borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setLinkManageFilter(f.key)}
              style={{ flex:1, padding:"7px 0", borderRadius:20, border:"none", background:linkManageFilter===f.key?"var(--bp-primary)":"#F1F5F9", color:linkManageFilter===f.key?"#fff":"#374151", fontWeight:linkManageFilter===f.key?700:500, fontSize:13, cursor:"pointer", transition:"all 0.15s" }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"12px 0 32px" }}>
          {filteredLinks.length === 0 && (
            <div style={{ textAlign:"center", padding:"60px 16px" }}>
              <p style={{ fontSize:14, color:"#9CA3AF" }}>Aucun lien dans cette catégorie.</p>
            </div>
          )}
          {filteredLinks.map((l, idx) => {
            const typeLabel: Record<string,string> = { unlimited:"Illimité", uses:"Limité", duration:"Expirant", both:"Personnalisé" };
            return (
              <div key={l.id} style={{ background:"#fff", margin:"0 0 6px", padding:"14px 16px", position:"relative" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"monospace", fontSize:13.5, color:"#374151", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.url}</div>
                    <div style={{ fontSize:12, color:"#9CA3AF", marginTop:3 }}>
                      {l.name || typeLabel[l.type] || "Illimité"}
                      {l.createdAt && ` • Créé le ${new Date(l.createdAt).toLocaleDateString("fr-FR")}`}
                    </div>
                    <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap" }}>
                      <span style={{ fontSize:12, color:"#9CA3AF" }}>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ marginRight:3, verticalAlign:"middle" }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        {l.clicksCount} clics
                      </span>
                      <span style={{ fontSize:12, color:"#9CA3AF" }}>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ marginRight:3, verticalAlign:"middle" }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        {l.usesCount} / {l.maxUses ?? "∞"} utilisations
                      </span>
                      {l.expiresAt && <span style={{ fontSize:12, color:"#9CA3AF" }}>Expire le {new Date(l.expiresAt).toLocaleDateString("fr-FR")}</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <LinkStatusBadge status={l.status} />
                    {!l.revoked && (
                      <button onClick={e => { e.stopPropagation(); setActiveLinkId(l.id); setGrpLinkMenu(grpLinkMenu===l.id?null:l.id); }}
                        style={{ background:"none", border:"none", cursor:"pointer", padding:4, position:"relative" }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="#94A3B8"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
                        <LinkThreeDotMenu link={l} top={28} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Bouton créer */}
        <div style={{ padding:"12px 16px 28px", background:"#fff", borderTop:"1px solid rgba(0,0,0,0.07)" }}>
          <button onClick={() => { setNewLinkType("unlimited"); setNewLinkName(""); setNewLinkMaxUses("100"); setNewLinkExpiry(""); setShowGrpCreateLink(true); }}
            style={{ width:"100%", padding:"13px", background:"var(--bp-primary)", border:"none", borderRadius:14, fontSize:15, fontWeight:700, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Créer un nouveau lien
          </button>
        </div>
      </div>
    , document.body);
  }

  /* ── PERMISSIONS ── */
  if (activeGroupId !== null && showGrpPerms) {
    // Guard: non-admins must not access this sub-page
    const _grpPerm = chatGroups.find(g => g.id === activeGroupId);
    if (_grpPerm?.role !== "owner" && _grpPerm?.role !== "admin") { setTimeout(() => setShowGrpPerms(false), 0); return null; }
    const PERMS_LIST: {key: keyof typeof grpPerms; label: string}[] = [
      {key:"sendMsgs", label:"Envoyer des messages"},
      {key:"sendMedia", label:"Envoyer des médias"},
      {key:"addUsers", label:"Ajouter des utilisateurs"},
      {key:"pinMsgs", label:"Épingler des messages"},
      {key:"modTitles", label:"Modifier vos titres"},
      {key:"modExchange", label:"Modifier les infos de l'échange"},
    ];
    const Toggle = ({on, onToggle}:{on:boolean;onToggle:()=>void}) => (
      <div onClick={onToggle} style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${on?"#EF4444":"#CBD5E1"}`, background:on?"#EF4444":"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
        {on && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
      </div>
    );
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10002, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Permissions", () => setShowGrpPerms(false),
          <button onClick={() => setShowGrpPerms(false)} style={{ background:"none", border:"none", cursor:"pointer", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        )}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 0 32px" }}>
          <div style={{ background:"#fff", margin:"0 0 6px", padding:"10px 16px 4px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-primary)", marginBottom:8 }}>Que peuvent faire les membres de ce groupe ?</div>
            {PERMS_LIST.map((p,i)=>(
              <div key={p.key}>
                <div style={{ display:"flex", alignItems:"center", padding:"13px 0", gap:14 }}>
                  <span style={{ flex:1, fontSize:15.5, color:"#000" }}>{p.label}</span>
                  <Toggle on={!grpPerms[p.key]} onToggle={()=>{ const nv=!grpPerms[p.key]; setGrpPerms(v=>({...v,[p.key]:nv})); apiPatchGroupPermissions(activeGroupId, { permissions:{ [p.key]:nv } }).catch(()=>setGrpPerms(v=>({...v,[p.key]:!nv}))); }} />
                </div>
                {i<PERMS_LIST.length-1 && <div style={{ height:1, background:"rgba(0,0,0,0.07)" }} />}
              </div>
            ))}
          </div>
          {/* Stars */}
          <div style={{ background:"#fff", margin:"0 0 6px", padding:"0 16px" }}>
            <div style={{ display:"flex", alignItems:"center", padding:"14px 0", gap:14, borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
              <span style={{ flex:1, fontSize:15.5, color:"#000" }}>Facturer des tokens pour les messages</span>
              <div onClick={() => { const nv=!grpChargeStars; setGrpChargeStars(nv); apiPatchGroupPermissions(activeGroupId, { chargeTokens:nv }).catch(()=>setGrpChargeStars(!nv)); }} style={{ width:48, height:28, borderRadius:14, background:grpChargeStars?"var(--bp-primary)":"#E5E7EB", position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:3, left:grpChargeStars?22:3, width:22, height:22, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.25)", transition:"left 0.2s" }} />
              </div>
            </div>
            {grpChargeStars && (
              <div style={{ padding:"14px 0" }}>
                <p style={{ fontSize:12.5, color:"#9CA3AF", lineHeight:1.5, margin:"0 0 14px" }}>Si vous activez cette option, les membres réguliers du groupe devront payer des tokens pour envoyer des messages.</p>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-primary)", marginBottom:12 }}>Définir le prix par message</div>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                  <span style={{ fontSize:13, color:"#9CA3AF", width:24 }}>1</span>
                  <input type="range" min={1} max={35000} value={grpStarPrice} onChange={e=>{ const v=Number(e.target.value); setGrpStarPrice(v); if (grpPriceTimer.current) clearTimeout(grpPriceTimer.current); grpPriceTimer.current = setTimeout(()=>{ apiPatchGroupPermissions(activeGroupId, { tokenPrice:v }).catch(()=>{}); }, 500); }}
                    style={{ flex:1, accentColor:"var(--bp-primary)" }} />
                  <span style={{ fontSize:13, color:"#9CA3AF", width:48, textAlign:"right" }}>35000</span>
                </div>
                <div style={{ textAlign:"center", fontSize:16, fontWeight:700, color:"var(--bp-primary)" }}>{grpStarPrice} tokens</div>
                <p style={{ fontSize:12, color:"#9CA3AF", textAlign:"center", margin:"8px 0 0" }}>Votre groupe recevra 85% du tarif sélectionné pour chaque message entrant.</p>
              </div>
            )}
          </div>
          {!grpChargeStars && <p style={{ margin:"4px 16px 0", fontSize:12.5, color:"#9CA3AF", lineHeight:1.5 }}>Si vous activez cette option, les membres réguliers du groupe devront payer des tokens pour envoyer des messages.</p>}

          {/* ── MODE RALENTI ── */}
          {(() => {
            const SLOW_STEPS = [0,5,10,30,60,300,900,3600];
            const SLOW_LABELS = ["Aucun","5s","10s","30s","1mn","5mn","15mn","1h"];
            const curIdx = SLOW_STEPS.indexOf(grpSlowMode) >= 0 ? SLOW_STEPS.indexOf(grpSlowMode) : 0;
            return (
              <div style={{ background:"#fff", margin:"6px 0 0", padding:"14px 16px 10px" }}>
                <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-primary)", marginBottom:10 }}>Mode ralenti</div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  {SLOW_LABELS.map((lbl,i)=>(
                    <span key={lbl} style={{ fontSize:11, color:i===curIdx?"var(--bp-primary)":"#9CA3AF", fontWeight:i===curIdx?700:400 }}>{lbl}</span>
                  ))}
                </div>
                <div style={{ position:"relative", height:28, display:"flex", alignItems:"center" }}>
                  <div style={{ position:"absolute", left:0, right:0, height:3, background:"#E5E7EB", borderRadius:2 }} />
                  <div style={{ position:"absolute", left:0, width:`${(curIdx/(SLOW_STEPS.length-1))*100}%`, height:3, background:"var(--bp-primary)", borderRadius:2 }} />
                  {SLOW_STEPS.map((_,i)=>(
                    <div key={i} onClick={()=>setGrpSlowMode(SLOW_STEPS[i])}
                      style={{ position:"absolute", left:`${(i/(SLOW_STEPS.length-1))*100}%`, transform:"translateX(-50%)", width:i===curIdx?14:10, height:i===curIdx?14:10, borderRadius:"50%", background:i<=curIdx?"var(--bp-primary)":"#E5E7EB", border:`2px solid ${i<=curIdx?"var(--bp-primary)":"#CBD5E1"}`, cursor:"pointer", zIndex:2, transition:"all 0.15s" }} />
                  ))}
                </div>
                <p style={{ fontSize:12.5, color:"#9CA3AF", lineHeight:1.5, margin:"12px 0 0" }}>Choisissez à quelle fréquence les membres peuvent envoyer un message.</p>
              </div>
            );
          })()}

          {/* ── NE PAS RESTREINDRE LES BOOSTERS ── */}
          <div style={{ background:"#fff", margin:"6px 0 0", padding:"0 16px" }}>
            <div style={{ display:"flex", alignItems:"center", padding:"14px 0", gap:14 }}>
              <span style={{ flex:1, fontSize:15.5, color:"#000" }}>Ne pas restreindre les boosters</span>
              <div onClick={()=>setGrpNoRestrictBoosters(v=>!v)} style={{ width:48, height:28, borderRadius:14, background:grpNoRestrictBoosters?"var(--bp-primary)":"#E5E7EB", position:"relative", cursor:"pointer", transition:"background 0.2s", flexShrink:0 }}>
                <div style={{ position:"absolute", top:3, left:grpNoRestrictBoosters?22:3, width:22, height:22, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.25)", transition:"left 0.2s" }} />
              </div>
            </div>
            <p style={{ fontSize:12.5, color:"#9CA3AF", lineHeight:1.5, margin:"0 0 12px" }}>Activez ceci pour toujours autoriser les utilisateurs ayant boosté votre groupe à envoyer des messages et médias.</p>
          </div>

          {/* ── UTILISATEURS BANNIS ── */}
          <div style={{ background:"#fff", margin:"6px 0 0", padding:"0 16px" }}>
            <div onClick={()=>setShowGrpBanned(true)} style={{ display:"flex", alignItems:"center", padding:"14px 0", gap:14, cursor:"pointer" }}>
              <span style={{ flex:1, fontSize:15.5, color:"#000" }}>Utilisateurs bannis</span>
              <span style={{ fontSize:15, fontWeight:600, color:"var(--bp-primary)" }}>0</span>
            </div>
          </div>

          {/* ── EXCEPTIONS ── */}
          <div style={{ background:"#fff", margin:"6px 0 0", padding:"0 16px" }}>
            <div onClick={()=>setShowGrpBanPicker(true)} style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 0", cursor:"pointer", borderBottom:"1px solid rgba(0,0,0,0.07)" }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              <span style={{ fontSize:15, color:"var(--bp-primary)", fontWeight:500 }}>Ajouter une exception</span>
            </div>
            {grpExceptions.map((ex,i)=>(
              <div key={ex.id} style={{ position:"relative" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:i<grpExceptions.length-1?"1px solid rgba(0,0,0,0.07)":"none" }}>
                  {ex.avatarUrl
                    ? <img src={ex.avatarUrl} style={{ width:40, height:40, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} alt="" />
                    : <div style={{ width:40, height:40, borderRadius:"50%", background:ex.color, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:15, flexShrink:0 }}>{ex.initials}</div>
                  }
                  <span style={{ flex:1, fontSize:15, color:"#000" }}>{ex.name}</span>
                  <div onClick={()=>setGrpExceptionMenu(grpExceptionMenu===ex.id?null:ex.id)} style={{ padding:"8px 4px", cursor:"pointer" }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="#9CA3AF"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                  </div>
                </div>
                {grpExceptionMenu===ex.id && (
                  <div style={{ position:"absolute", right:0, top:"100%", background:"#fff", borderRadius:12, boxShadow:"0 4px 24px rgba(0,0,0,0.15)", zIndex:20, minWidth:220, overflow:"hidden" }}
                    onClick={e=>e.stopPropagation()}>
                    <div onClick={()=>setGrpExceptionMenu(null)} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                      <span style={{ fontSize:15.5, color:"#000" }}>Modifier les permissions</span>
                    </div>
                    <div style={{ height:1, background:"rgba(0,0,0,0.07)" }} />
                    <div onClick={()=>{ setGrpExceptions(v=>v.filter(e=>e.id!==ex.id)); setGrpExceptionMenu(null); }}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", cursor:"pointer" }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>
                      <span style={{ fontSize:15.5, color:"#EF4444" }}>Supprimer de cette liste</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── RÉACTIONS ── */
  if (activeGroupId !== null && showGrpReactions) {
    const EMOJI_LIST = [
      {emoji:"❤️",label:"Coeur rouge"},{emoji:"👍",label:"Pouce vers le haut"},{emoji:"👎",label:"Pouce vers le bas"},
      {emoji:"🔥",label:"Flamme"},{emoji:"🥰",label:"Visage charmé"},{emoji:"👏",label:"Applaudissement"},
      {emoji:"😊",label:"Visage souriant"},{emoji:"🎉",label:"Cotillons"},{emoji:"🤩",label:"Les yeux qui brillent"},{emoji:"😢",label:"Visage qui pleure"},
    ];
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10002, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Réactions", () => setShowGrpReactions(false))}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 0 32px" }}>
          <div style={{ background:"#fff", margin:"0 0 4px", padding:"4px 16px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-primary)", padding:"10px 0 6px" }}>Réactions disponibles</div>
            {[{val:"all",label:"Toutes les réactions"},{val:"some",label:"Certaines réactions"},{val:"none",label:"Aucune réaction"}].map((opt,i,arr)=>(
              <div key={opt.val} onClick={()=>{ const mode = opt.val as "all"|"some"|"none"; const prev = grpReactMode; setGrpReactMode(mode); apiPatchGroupReactions(activeGroupId, { mode }).catch(()=>setGrpReactMode(prev)); }}
                style={{ display:"flex", alignItems:"center", padding:"13px 0", gap:14, borderBottom:i<arr.length-1?"1px solid rgba(0,0,0,0.07)":"none", cursor:"pointer" }}>
                <span style={{ flex:1, fontSize:15.5, color:"#000" }}>{opt.label}</span>
                <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${grpReactMode===opt.val?"var(--bp-primary)":"#CBD5E1"}`, background:grpReactMode===opt.val?"var(--bp-primary)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {grpReactMode===opt.val && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin:"4px 16px 12px", fontSize:12.5, color:"#9CA3AF", lineHeight:1.5 }}>Les membres du groupe ne peuvent utiliser que certains emoji autorisés pour réagir aux messages.</p>
          {grpReactMode === "some" && (
            <div style={{ background:"#fff", margin:"0 0 6px", padding:"4px 16px" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--bp-primary)", padding:"10px 0 6px" }}>Autoriser seulement ces réactions</div>
              {EMOJI_LIST.map((item,i)=>(
                <div key={item.emoji} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 0", borderBottom:i<EMOJI_LIST.length-1?"1px solid rgba(0,0,0,0.07)":"none" }}>
                  <span style={{ fontSize:24 }}>{item.emoji}</span>
                  <span style={{ flex:1, fontSize:15.5, color:"#000" }}>{item.label}</span>
                  <div onClick={()=>{ const next = { ...grpReactEmojis, [item.emoji]: !grpReactEmojis[item.emoji] }; const prev = grpReactEmojis; setGrpReactEmojis(next); apiPatchGroupReactions(activeGroupId, { emojis: Object.keys(next).filter(e=>next[e]) }).catch(()=>setGrpReactEmojis(prev)); }}
                    style={{ width:48, height:28, borderRadius:14, background:grpReactEmojis[item.emoji]?"var(--bp-primary)":"#E5E7EB", position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
                    <div style={{ position:"absolute", top:3, left:grpReactEmojis[item.emoji]?22:3, width:22, height:22, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.25)", transition:"left 0.2s" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    , document.body);
  }

  /* ── SUJETS ── */
  if (activeGroupId !== null && showGrpTopics) {
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10002, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Sujets", () => setShowGrpTopics(false))}
        <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 24px 32px" }}>
          <div style={{ fontSize:64, marginBottom:16, textAlign:"center" }}>💬</div>
          <p style={{ fontSize:15, color:"#555", lineHeight:1.6, textAlign:"center", marginBottom:32, maxWidth:300 }}>Le groupe sera divisé en sujets créés par les administrateurs ou utilisateurs.</p>
          <div style={{ background:"#fff", borderRadius:14, padding:"0 16px", width:"100%", maxWidth:420 }}>
            <div style={{ display:"flex", alignItems:"center", padding:"15px 0" }}>
              <span style={{ flex:1, fontSize:15.5, color:"#000" }}>Activer les sujets</span>
              <div onClick={()=>{ const nv=!grpTopicsOn; setGrpTopicsOn(nv); apiPatchGroupSettings(activeGroupId, { topicsEnabled:nv }).catch(()=>setGrpTopicsOn(!nv)); }} style={{ width:48, height:28, borderRadius:14, background:grpTopicsOn?"var(--bp-primary)":"#E5E7EB", position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:3, left:grpTopicsOn?22:3, width:22, height:22, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.25)", transition:"left 0.2s" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── STATISTIQUES / BOOSTS ── */
  if (activeGroupId !== null && showGrpStats) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    const memberCount = groupInfo?.members.length ?? grp?.membersCount ?? 0;
    const today = new Date(); const days = Array.from({length:8},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()-7+i);return d.toLocaleDateString("fr",{month:"short",day:"numeric"});});
    // Simple SVG line chart
    const LineChart = ({data, color, height=100}:{data:number[];color:string;height?:number}) => {
      const mn=Math.min(...data), mx=Math.max(...data)||1;
      const w=260; const pts=data.map((v,i)=>`${Math.round(i*(w/(data.length-1)))},${Math.round(height-(v-mn)/(mx-mn)*height)}`).join(" ");
      return <svg width="100%" height={height+20} viewBox={`0 0 ${w} ${height+20}`} preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      </svg>;
    };
    const growthData = [memberCount+30,memberCount+22,memberCount+18,memberCount+14,memberCount+10,memberCount+6,memberCount+3,memberCount];
    const membData = [4,4,4,5,3,3,2,2];
    const COLORS = ["#4F9DDE","#5AC05A","#F97316","#E24444","#8B5CF6","#F59E0B","#EC4899","#06B6D4","#84CC16","#6B7280","#F43F5E","#10B981","#A3E635","#FBBF24","#7C3AED","#E879F9","#34D399","#60A5FA"];
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10002, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER(grp?.name ?? "Groupe", () => setShowGrpStats(false))}
        {/* Tabs */}
        <div style={{ background:"#fff", display:"flex", borderBottom:"1px solid rgba(0,0,0,0.07)", flexShrink:0 }}>
          {[{key:"stats",label:"Statistiques",icon:"📊"},{key:"boosts",label:"Boosts",icon:"⚡"}].map(tab=>(
            <button key={tab.key} onClick={()=>setGrpStatsTab(tab.key as "stats"|"boosts")}
              style={{ flex:1, background:"none", border:"none", cursor:"pointer", padding:"12px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:4, borderBottom:grpStatsTab===tab.key?"2.5px solid var(--bp-primary)":"2.5px solid transparent", color:grpStatsTab===tab.key?"var(--bp-primary)":"#9CA3AF", fontWeight:grpStatsTab===tab.key?700:400, fontSize:14, transition:"all 0.15s" }}>
              <span style={{ fontSize:22 }}>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"14px 0 32px" }}>
          {grpStatsTab === "stats" ? (
            <>
              {/* Vue d'ensemble */}
              <div style={{ background:"#fff", margin:"0 0 10px", padding:"16px 16px 12px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
                  <span style={{ fontWeight:700, fontSize:16, color:"#000" }}>Vue d'ensemble</span>
                  <span style={{ fontSize:12.5, color:"#9CA3AF" }}>{days[0]} — {days[7]}</span>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[{label:"Membres",val:memberCount,delta:-31,pct:"3.3%"},{label:"Messages",val:1,delta:0,pct:null},{label:"Membres lecteurs",val:162,delta:-189,pct:null},{label:"Membres rédacteurs",val:2,delta:-1,pct:null}].map(s=>(
                    <div key={s.label}>
                      <div style={{ fontSize:18, fontWeight:700, color:"#000" }}>
                        {s.val}
                        {s.pct&&<span style={{ fontSize:12, fontWeight:600, color:"#EF4444", marginLeft:6 }}>-{s.delta} ({s.pct})</span>}
                        {!s.pct&&s.delta!==0&&<span style={{ fontSize:12, fontWeight:600, color:"#EF4444", marginLeft:4 }}>{s.delta}</span>}
                      </div>
                      <div style={{ fontSize:12.5, color:"#9CA3AF" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Croissance */}
              <div style={{ background:"#fff", margin:"0 0 10px", padding:"16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontWeight:700, fontSize:15.5, color:"#000" }}>Croissance</span>
                  <span style={{ fontSize:12.5, color:"#9CA3AF" }}>{days[0]} — {days[7]}</span>
                </div>
                <LineChart data={growthData} color="#4F9DDE" height={110} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  {[0,2,4,6].map(i=><span key={i} style={{ fontSize:11, color:"#9CA3AF" }}>{days[i]}</span>)}
                </div>
              </div>
              {/* Membres */}
              <div style={{ background:"#fff", margin:"0 0 10px", padding:"16px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontWeight:700, fontSize:15.5, color:"#000" }}>Membres du groupe</span>
                  <span style={{ fontSize:12.5, color:"#9CA3AF" }}>{days[0]} — {days[7]}</span>
                </div>
                <LineChart data={membData} color="#EF4444" height={100} />
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                  {[0,2,4,6].map(i=><span key={i} style={{ fontSize:11, color:"#9CA3AF" }}>{days[i]}</span>)}
                </div>
              </div>
            </>
          ) : (
            /* BOOSTS TAB */
            <>
              <div style={{ background:"#fff", padding:"20px 16px 14px", textAlign:"center", marginBottom:10 }}>
                <div style={{ fontSize:13, color:"#9CA3AF", marginBottom:14 }}>Le groupe a 0 boost. <span style={{ color:"var(--bp-primary)", fontWeight:600 }}>Que sont les boosts ?</span></div>
                {/* Color palette */}
                <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center", marginBottom:16 }}>
                  {COLORS.map((c,i)=>(
                    <div key={i} style={{ width:34, height:34, borderRadius:"50%", background:i>=9?`linear-gradient(135deg,${c},${COLORS[(i+4)%COLORS.length]})`:c, border:"2px solid transparent" }} />
                  ))}
                </div>
              </div>
              {[{label:"Logo de profil",level:"Niveau 5"},{label:"Lot d'emoji du groupe",level:"Niveau 4"},{label:"Statut emoji du groupe",level:"Niveau 8"}].map(item=>(
                <div key={item.label} style={{ background:"#fff", margin:"0 0 6px", padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <span style={{ flex:1, fontSize:15.5, color:"#000", fontWeight:500 }}>{item.label}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"#fff", background:"#8B5CF6", borderRadius:12, padding:"2px 8px" }}>{item.level}</span>
                    <span style={{ fontSize:14, color:"#9CA3AF", fontWeight:500 }}>Désactivé</span>
                  </div>
                  <p style={{ fontSize:12.5, color:"#9CA3AF", margin:0, lineHeight:1.5 }}>
                    {item.label==="Logo de profil"?"Choisissez une couleur et un logo pour le profil du groupe.":item.label==="Lot d'emoji du groupe"?"Choisissez un lot d'emoji qui sera disponible pour tous les membres du groupe.":"Choisissez un statut qui sera affiché à côté du nom du groupe."}
                  </p>
                </div>
              ))}
              <div style={{ padding:"0 16px" }}>
                <button style={{ width:"100%", background:"var(--bp-primary)", color:"#fff", border:"none", borderRadius:24, padding:"15px 0", fontSize:16, fontWeight:700, cursor:"pointer", marginTop:8 }}>Appliquer</button>
              </div>
            </>
          )}
        </div>
      </div>
    , document.body);
  }

  if (activeGroupId !== null && showGroupInfo && showGrpEdit) {

    const grp = chatGroups.find(g => g.id === activeGroupId);
    // Guard: non-admins must not access this sub-page
    if (grp?.role !== "owner" && grp?.role !== "admin") { setTimeout(() => setShowGrpEdit(false), 0); return null; }
    const isChannelG = grp?.type === "channel";
    const grpColorEdit = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#0EA5E9","#F59E0B"][activeGroupId % 7];
    const grpInitialEdit = (grp?.name ?? "G")[0].toUpperCase();
    const memberCount = groupInfo?.members.length ?? grp?.membersCount ?? 0;

    const handleSave = async () => {
      if (!grpEditName.trim()) return;
      setGrpEditSaving(true);
      try {
        const updated = await apiUpdateChatGroup(activeGroupId, { name: grpEditName.trim() });
        setChatGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, name: updated.name } : g));
        setGrpEditSaving(false);
        setGrpEditToast(true);
        setTimeout(() => { setGrpEditToast(false); setShowGrpEdit(false); }, 1800);
      } catch { setGrpEditSaving(false); }
    };

    const CARD_STYLE: React.CSSProperties = { background: "var(--theme-surface)", borderRadius: 14, margin: "0 16px 10px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" };
    const ROW_STYLE: React.CSSProperties = { display: "flex", alignItems: "center", padding: "14px 16px", gap: 14, cursor: "pointer" };
    const SEP = <div style={{ height: 1, background: "rgba(0,0,0,0.07)", marginLeft: 56 }} />;
    const Chevron = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>;
    const Val = ({ v }: { v: string }) => <span style={{ fontSize: 15, color: "var(--bp-primary)", marginRight: 4, flexShrink: 0 }}>{v}</span>;

    return createPortal(
      <div style={{ position: "fixed", inset: 0, background: "#F1F5F9", zIndex: 10001, display: "flex", flexDirection: "column" }}>
        <style>{`@keyframes ge-toast-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* ══ HEADER ══ */}
        <div style={{ background: "var(--theme-surface)", display: "flex", alignItems: "center", height: 56, padding: "0 4px", flexShrink: 0, boxShadow: "0 1px 0 rgba(0,0,0,0.08)", zIndex: 5 }}>
          <button onClick={() => setShowGrpEdit(false)}
            style={{ background: "none", border: "none", cursor: "pointer", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 17, color: "var(--theme-text)", textAlign: "center", marginRight: 48 }}>Modifier</span>
          <button onClick={handleSave} disabled={grpEditSaving || !grpEditName.trim()}
            style={{ position: "absolute", right: 4, background: "none", border: "none", cursor: grpEditName.trim() ? "pointer" : "default", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", opacity: grpEditName.trim() ? 1 : 0.35 }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>

        {/* ══ SCROLLABLE BODY ══ */}
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 14, paddingBottom: 32 }}>

          {/* ── CARTE 1 : Avatar + Nom + Photo + Description ── */}
          <div style={{ ...CARD_STYLE }}>
            {/* Row: Avatar + Nom + Emoji */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 16px 12px" }}>
              <div style={{ width: 62, height: 62, borderRadius: "50%", background: grpColorEdit, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 24, flexShrink: 0 }}>
                {grpInitialEdit}
              </div>
              <div style={{ flex: 1, borderBottom: "2px solid var(--bp-primary)", paddingBottom: 3 }}>
                <input autoFocus value={grpEditName} onChange={e => setGrpEditName(e.target.value)}
                  placeholder={grp?.name ?? (isChannelG ? "Nom du canal" : "Nom du groupe")}
                  style={{ width: "100%", border: "none", outline: "none", fontSize: 16.5, color: "var(--theme-text)", background: "transparent", fontWeight: 500 }} />
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1.2" fill="#9CA3AF"/><circle cx="15" cy="9" r="1.2" fill="#9CA3AF"/></svg>
              </button>
            </div>
            {/* Row: Définir une photo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px 12px" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span style={{ fontSize: 15, color: "var(--bp-primary)", fontWeight: 500 }}>Définir une photo</span>
            </div>
            {/* Separator */}
            <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "0 0 0 16px" }} />
            {/* Row: Description */}
            <div style={{ padding: "12px 16px 14px" }}>
              <input value={grpEditDesc} onChange={e => setGrpEditDesc(e.target.value)}
                placeholder="Description (facultative)"
                style={{ width: "100%", border: "none", outline: "none", fontSize: 15, color: "var(--theme-text)", background: "transparent" }} />
            </div>
          </div>

          {/* ── CARTE 2 : Type / Historique / Sujets ── */}
          <div style={{ ...CARD_STYLE }}>
            {/* Type de groupe */}
            <div style={{ ...ROW_STYLE }} onClick={() => setShowGrpParamType(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span style={{ flex: 1, fontSize: 15.5, color: "var(--theme-text)" }}>Type de groupe</span>
              <Val v={grpTypePublic?"Public":"Privé"} /><Chevron />
            </div>
            {SEP}
            {/* Historique des discussions */}
            <div style={{ ...ROW_STYLE }} onClick={() => setShowGrpHistoriqueSheet(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span style={{ flex: 1, fontSize: 15.5, color: "var(--theme-text)" }}>Historique de discussion</span>
              <Val v={grpHistoriqueVisible ? "Visible" : "Invisible"} /><Chevron />
            </div>
            {SEP}
            {/* Apparence */}
            <div style={{ ...ROW_STYLE }} onClick={() => setShowGrpApparence(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 0 8 0"/><circle cx="9" cy="9" r="1.2" fill="#9CA3AF"/><circle cx="15" cy="9" r="1.2" fill="#9CA3AF"/></svg>
              <span style={{ flex: 1, fontSize: 15.5, color: "var(--theme-text)" }}>Apparence</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--bp-primary)", borderRadius: 5, padding: "2px 6px", marginRight: 10 }}>NOUVEAU</span>
              <div style={{ width:22, height:22, borderRadius:"50%", background:"var(--bp-primary)", flexShrink:0 }} />
            </div>
            {SEP}
            {/* Sujets */}
            <div style={{ ...ROW_STYLE }} onClick={() => setShowGrpTopics(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <span style={{ flex: 1, fontSize: 15.5, color: "var(--theme-text)" }}>Sujets</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fff", background: "var(--bp-primary)", borderRadius: 5, padding: "2px 6px", marginRight: 10 }}>NOUVEAU</span>
              <div onClick={e=>{e.stopPropagation();setGrpTopicsOn(v=>!v);}} style={{ width: 44, height: 26, borderRadius: 13, background: grpTopicsOn?"var(--bp-primary)":"#E5E7EB", position: "relative", flexShrink: 0, transition:"background 0.2s" }}>
                <div style={{ position: "absolute", top: 3, left: grpTopicsOn?21:3, width: 20, height: 20, borderRadius: "50%", background: "var(--theme-surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.25)", transition:"left 0.2s" }} />
              </div>
            </div>
          </div>

          {/* ── TEXTE EXPLICATIF ── */}
          <p style={{ margin: "0 16px 10px", padding: "0 4px", fontSize: 13, color: "#9CA3AF", lineHeight: 1.5 }}>
            Les sujets divisent le groupe en sections créées par les administrateurs ou les membres.
          </p>

          {/* ── CARTE 3 : Options ── */}
          <div style={{ ...CARD_STYLE }}>
            {[
              { label: "Réactions", val: grpReactMode==="all"?"Toutes":grpReactMode==="none"?"Aucune":"Certaines", onClick:()=>setShowGrpReactions(true), icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
              { label: "Permissions", val: `${Object.values(grpPerms).filter(v=>v).length}/6`, onClick:()=>setShowGrpPerms(true), icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg> },
              { label: "Liens d'invitation", val: "1", onClick:()=>setShowGrpLinks(true), icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
              { label: "Administrateurs", val: String((groupInfo?.members??[]).filter(m=>m.role==="owner"||m.role==="admin").length||1), onClick:()=>setShowGrpAdmins(true), icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
              { label: "Membres", val: String(memberCount), onClick:()=>setShowGrpMembers(true), icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            ].map((row, i, arr) => (
              <Fragment key={row.label}>
                <div style={{ ...ROW_STYLE }} onClick={row.onClick}>
                  <span style={{ flexShrink: 0 }}>{row.icon}</span>
                  <span style={{ flex: 1, fontSize: 15.5, color: "var(--theme-text)" }}>{row.label}</span>
                  <Val v={row.val} /><Chevron />
                </div>
                {i < arr.length - 1 && SEP}
              </Fragment>
            ))}
          </div>

          {/* ── CARTE 4 : Statistiques + Actions ── */}
          <div style={{ ...CARD_STYLE }}>
            <div style={{ ...ROW_STYLE }} onClick={() => setShowGrpStats(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span style={{ flex: 1, fontSize: 15.5, color: "var(--theme-text)" }}>Statistiques</span>
              <Chevron />
            </div>
            {SEP}
            <div style={{ ...ROW_STYLE }} onClick={() => {
              setGrpAuditLoading(true);
              setShowGrpAuditLog(true);
              apiGetGroupAuditLog(activeGroupId!).then(entries => {
                setGrpAuditLog(entries);
                setGrpAuditLoading(false);
              }).catch(() => setGrpAuditLoading(false));
            }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span style={{ flex: 1, fontSize: 15.5, color: "var(--theme-text)" }}>Actions récentes</span>
              <Chevron />
            </div>
          </div>

          {/* ── CARTE 5 : Supprimer ── */}
          <div style={{ ...CARD_STYLE, cursor: "pointer" }} onClick={() => setShowDeleteQuitDlg(true)}>
            <div style={{ padding: "15px 16px" }}>
              <span style={{ fontSize: 15.5, color: "#EF4444", fontWeight: 500 }}>Supprimer et quitter le groupe</span>
            </div>
          </div>
        </div>

        {/* ── LOADING OVERLAY ── */}
        {grpEditSaving && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "rgba(28,28,28,0.92)", borderRadius: 18, padding: "24px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "var(--bp-primary)", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>Enregistrement...</span>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>Veuillez patienter</span>
            </div>
          </div>
        )}

        {/* ── SUCCESS TOAST ── */}
        {grpEditToast && (
          <div style={{ position: "fixed", bottom: 40, left: "50%", transform: "translateX(-50%)", background: "rgba(34,197,94,0.96)", borderRadius: 26, padding: "12px 22px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.18)", animation: "ge-toast-in 0.3s ease", zIndex: 20, whiteSpace: "nowrap" }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Groupe mis à jour avec succès</span>
          </div>
        )}
      </div>
    , document.body);
  }

  /* ══════════════════════════════════════════════════════════════
     GROUP INFO VIEW — Telegram 99%
  ══════════════════════════════════════════════════════════════ */

  /* ── JOURNAL DES ACTIONS (audit log) ── */
  if (activeGroupId !== null && showGroupInfo && showGrpAuditLog) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    const AUDIT_FILTERS: { key: string; label: string }[] = [
      { key: "all",           label: "Tout" },
      { key: "member_kicked", label: "Exclusions" },
      { key: "role_changed",  label: "Permissions" },
      { key: "member_added",  label: "Ajouts" },
      { key: "member_left",   label: "Départs" },
      { key: "group_updated", label: "Paramètres" },
    ];

    const EVENT_ICONS: Record<string, React.ReactNode> = {
      member_kicked: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></svg>,
      member_added:  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
      member_left:   <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
      role_changed:  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
      group_updated: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>,
    };

    const EVENT_LABELS: Record<string, string> = {
      member_kicked: "Membre exclu",
      member_added:  "Membre(s) ajouté(s)",
      member_left:   "Membre parti",
      role_changed:  "Rôle modifié",
      group_updated: "Paramètres mis à jour",
    };

    const EVENT_COLORS: Record<string, string> = {
      member_kicked: "#EF4444",
      member_added:  "#22C55E",
      member_left:   "#F97316",
      role_changed:  "#8B5CF6",
      group_updated: "#3B82F6",
    };

    const EVENT_BG: Record<string, string> = {
      member_kicked: "#FEF2F2",
      member_added:  "#F0FDF4",
      member_left:   "#FFF7ED",
      role_changed:  "#F5F3FF",
      group_updated: "#EFF6FF",
    };

    const visibleLog = grpAuditFilter === "all" ? grpAuditLog : grpAuditLog.filter(e => e.event === grpAuditFilter);

    const formatRelTime = (iso: string) => {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "à l'instant";
      if (mins < 60) return `il y a ${mins} min`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `il y a ${hrs} h`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `il y a ${days} j`;
      return new Date(iso).toLocaleDateString("fr", { day: "numeric", month: "short" });
    };

    return createPortal(
      <div style={{ position: "fixed", inset: 0, background: "#F8FAFC", zIndex: 10003, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ background: "var(--theme-surface)", display: "flex", alignItems: "center", height: 56, padding: "0 4px", flexShrink: 0, boxShadow: "0 1px 0 rgba(0,0,0,0.08)" }}>
          <button onClick={() => setShowGrpAuditLog(false)}
            style={{ background: "none", border: "none", cursor: "pointer", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontWeight: 600, fontSize: 17, color: "#000" }}>Journal des actions</div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>{grp?.name ?? "Groupe"}</div>
          </div>
          <div style={{ width: 48 }} />
        </div>

        {/* Filter tabs */}
        <div style={{ background: "var(--theme-surface)", borderBottom: "1px solid rgba(0,0,0,0.07)", overflowX: "auto", display: "flex", flexShrink: 0, scrollbarWidth: "none" }}>
          {AUDIT_FILTERS.map(f => (
            <button key={f.key} onClick={() => setGrpAuditFilter(f.key)}
              style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: "11px 14px", fontSize: 13.5, fontWeight: grpAuditFilter === f.key ? 700 : 400, color: grpAuditFilter === f.key ? "var(--bp-primary)" : "#6B7280", borderBottom: grpAuditFilter === f.key ? "2.5px solid var(--bp-primary)" : "2.5px solid transparent", transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {grpAuditLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
            </div>
          ) : visibleLog.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Aucune action pour l'instant</div>
              <div style={{ fontSize: 14, color: "#9CA3AF", lineHeight: 1.5 }}>
                {grpAuditFilter === "all" ? "Les bannissements, changements de permissions et départs apparaîtront ici." : `Aucun événement de type "${AUDIT_FILTERS.find(f=>f.key===grpAuditFilter)?.label}" trouvé.`}
              </div>
            </div>
          ) : (
            <div style={{ padding: "12px 0 32px" }}>
              {visibleLog.map((entry, i) => {
                const color = EVENT_COLORS[entry.event] ?? "#6B7280";
                const bg = EVENT_BG[entry.event] ?? "#F8FAFC";
                const icon = EVENT_ICONS[entry.event];
                const label = EVENT_LABELS[entry.event] ?? entry.event;
                const actorInitial = entry.actorName[0]?.toUpperCase() ?? "?";
                const actorColor = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#F59E0B"][entry.actorId % 6];
                return (
                  <div key={entry.id} style={{ display: "flex", gap: 12, padding: "12px 16px", background: i % 2 === 0 ? "var(--theme-surface)" : "transparent", borderBottom: "1px solid rgba(0,0,0,0.05)", alignItems: "flex-start" }}>
                    {/* Actor avatar */}
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: actorColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                      {entry.actorAvatar
                        ? <img src={entry.actorAvatar} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} alt="" />
                        : actorInitial}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 14.5, color: "#111" }}>{entry.actorName}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color, borderRadius: 20, padding: "2px 8px", fontSize: 12.5, fontWeight: 600 }}>
                          {icon}
                          {label}
                        </span>
                      </div>
                      {entry.targetName && (
                        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 2 }}>
                          Cible : <span style={{ fontWeight: 500, color: "#374151" }}>{entry.targetName}</span>
                        </div>
                      )}
                      {entry.detail && (
                        <div style={{ fontSize: 12.5, color: "#9CA3AF", fontStyle: "italic" }}>{entry.detail}</div>
                      )}
                      <div style={{ fontSize: 12, color: "#CBD5E1", marginTop: 4 }}>{formatRelTime(entry.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    , document.body);
  }

  /* ── UTILISATEURS BANNIS ── */
  if (activeGroupId !== null && showGrpBanned) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10003, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Utilisateurs bannis", () => setShowGrpBanned(false),
          <button style={{ background:"none", border:"none", cursor:"pointer", width:48, height:48, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
          </button>
        )}
        <div style={{ flex:1, overflowY:"auto" }}>
          {/* Bannir un utilisateur */}
          <div style={{ background:"#fff", margin:"8px 0 0", padding:"0 16px" }}>
            <div onClick={() => setShowGrpBanPicker(true)} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", cursor:"pointer" }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:"rgba(239,68,68,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              </div>
              <span style={{ fontSize:15.5, color:"#EF4444", fontWeight:500 }}>Bannir un utilisateur</span>
            </div>
          </div>
          {/* Description */}
          <div style={{ padding:"10px 16px" }}>
            <p style={{ fontSize:12.5, color:"#9CA3AF", lineHeight:1.55, margin:0 }}>
              Les utilisateurs éjectés du groupe par des administrateurs ne peuvent pas revenir dans le groupe via un lien d'invitation ou en rejoignant le groupe par recherche. Les administrateurs peuvent les débannir depuis cette liste.
            </p>
          </div>
          {/* Section header */}
          <div style={{ padding:"8px 16px 4px" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:0.8 }}>0 utilisateurs bannis</span>
          </div>
          <div style={{ textAlign:"center", padding:"40px 16px" }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" style={{ marginBottom:12 }}><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            <p style={{ fontSize:14, color:"#9CA3AF", margin:0 }}>Aucun utilisateur banni</p>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── BANNIR UN UTILISATEUR (picker) ── */
  if (activeGroupId !== null && showGrpBanPicker) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    const gInfo = groupInfo;
    const allM = gInfo?.members ?? [];
    const filtered = allM.filter(m => {
      const name = (m.firstName ?? "") + " " + (m.lastName ?? "");
      return grpBanSearch === "" || name.toLowerCase().includes(grpBanSearch.toLowerCase());
    });
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10004, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Bannir un utilisateur", () => setShowGrpBanPicker(false))}
        {/* Search */}
        <div style={{ padding:"8px 16px 4px" }}>
          <div style={{ display:"flex", alignItems:"center", background:"#fff", borderRadius:12, padding:"8px 12px", gap:8 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
            <input value={grpBanSearch} onChange={e=>setGrpBanSearch(e.target.value)}
              placeholder="Rechercher un membre…"
              style={{ flex:1, border:"none", outline:"none", fontSize:15, background:"transparent", color:"#111" }} />
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {/* Toggle cacher les membres */}
          <div style={{ background:"#fff", margin:"8px 0", padding:"0 16px" }}>
            <div style={{ display:"flex", alignItems:"center", padding:"14px 0" }}>
              <span style={{ flex:1, fontSize:15.5, color:"#000" }}>Cacher les membres</span>
              <div onClick={()=>setGrpHideMembers(v=>!v)} style={{ width:48, height:28, borderRadius:14, background:grpHideMembers?"var(--bp-primary)":"#E5E7EB", position:"relative", cursor:"pointer", transition:"background 0.2s", flexShrink:0 }}>
                <div style={{ position:"absolute", top:3, left:grpHideMembers?22:3, width:22, height:22, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.25)", transition:"left 0.2s" }} />
              </div>
            </div>
          </div>
          {filtered.length === 0 && <div style={{ textAlign:"center", color:"#9CA3AF", padding:"40px 16px", fontSize:14 }}>Aucun membre trouvé</div>}
          {filtered.length > 0 && (
            <>
              <div style={{ padding:"6px 16px 2px" }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:0.8 }}>Membres ({filtered.length})</span>
              </div>
              <div style={{ background:"#fff", margin:"4px 0" }}>
                {filtered.map((m, i) => {
                  const name = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim();
                  const col = CONV_COLORS[m.userId % CONV_COLORS.length];
                  const initials = mkInitials(name);
                  return (
                    <div key={m.userId} onClick={() => {
                      setShowGrpBanPicker(false);
                      setShowGrpBanned(false);
                    }} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:i<filtered.length-1?"1px solid rgba(0,0,0,0.06)":"none", cursor:"pointer" }}>
                      <div style={{ position:"relative" }}>
                        <div style={{ width:46, height:46, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:15, flexShrink:0 }}>{initials}</div>
                        <div style={{ position:"absolute", bottom:1, right:1, width:11, height:11, borderRadius:"50%", background:"#22C55E", border:"2px solid #fff" }} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:15, color:"#000" }}>{name || "Utilisateur"}</div>
                        <div style={{ fontSize:12.5, color:"#22C55E" }}>en ligne</div>
                      </div>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    , document.body);
  }

  /* ── APPARENCE ── */
  if (activeGroupId !== null && showGrpApparence) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    const grpColor = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#0EA5E9","#F59E0B"][activeGroupId % 7];
    const PALETTE = ["#2563EB","#0EA5E9","#22C55E","#16A34A","#F59E0B","#F97316","#EF4444","#EC4899","#8B5CF6","#6366F1","#14B8A6","#0F766E","#854D0E","#92400E","#1E293B","#64748B"];
    const selColor = grpApparenceColor || grpColor;
    const setSelColor_ = setGrpApparenceColor;
    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F1F5F9", zIndex:10003, display:"flex", flexDirection:"column" }}>
        {GRP_SUB_HEADER("Apparence", () => setShowGrpApparence(false))}
        <div style={{ flex:1, overflowY:"auto" }}>
          {/* Avatar preview */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"28px 0 18px", background:"#fff", marginBottom:8 }}>
            <div style={{ width:90, height:90, borderRadius:"50%", background:grpColor, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
              <span style={{ fontSize:36, fontWeight:700, color:"#fff" }}>{(grp?.name ?? "G")[0].toUpperCase()}</span>
            </div>
            <p style={{ fontSize:13, color:"#9CA3AF", margin:0 }}>Le groupe a <b>0</b> boost. <span style={{ color:"var(--bp-primary)", fontWeight:500 }}>Que sont les boosts ?</span></p>
          </div>
          {/* Color palette */}
          <div style={{ background:"#fff", padding:"14px 16px", marginBottom:8 }}>
            <p style={{ fontSize:13, color:"#9CA3AF", margin:"0 0 12px" }}>Couleur du groupe</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {PALETTE.map(c => (
                <div key={c} onClick={() => setSelColor_(c)}
                  style={{ width:38, height:38, borderRadius:"50%", background:c, cursor:"pointer", border:`3px solid ${selColor===c?"#fff":"transparent"}`, boxShadow:selColor===c?"0 0 0 2px "+c:"none", transition:"all 0.15s" }} />
              ))}
            </div>
          </div>
          {/* Locked features */}
          <div style={{ background:"#fff", padding:"0 16px", marginBottom:8 }}>
            {[
              { label:"Logo de profil", badge:"🔒 Niveau 5", status:"Désactivé" },
              { label:"Lot d'emoji du groupe", badge:"🔒 Niveau 4", status:"Désactivé" },
              { label:"Statut emoji du groupe", badge:"🔒 Niveau 8", status:"Désactivé" },
            ].map((item, i, arr) => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", padding:"14px 0", borderBottom:i<arr.length-1?"1px solid rgba(0,0,0,0.07)":"none", opacity:0.65 }}>
                <span style={{ flex:1, fontSize:15.5, color:"#000" }}>{item.label}</span>
                <span style={{ fontSize:12, color:"#9CA3AF", marginRight:8 }}>{item.badge}</span>
                <span style={{ fontSize:13.5, color:"#9CA3AF" }}>{item.status}</span>
              </div>
            ))}
          </div>
          {/* Appliquer */}
          <div style={{ padding:"16px" }}>
            <button style={{ width:"100%", padding:"14px", background:"var(--bp-primary)", border:"none", borderRadius:12, fontSize:16, fontWeight:700, color:"#fff", cursor:"pointer" }}
              onClick={() => setShowGrpApparence(false)}>
              Appliquer
            </button>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── HISTORIQUE DE DISCUSSION (bottom sheet) ── */
  if (activeGroupId !== null && showGrpHistoriqueSheet) {
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10005, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)" }} onClick={() => setShowGrpHistoriqueSheet(false)} />
        <div style={{ position:"relative", background:"#fff", borderRadius:"20px 20px 0 0", padding:"20px 16px 36px" }}>
          <div style={{ width:40, height:4, borderRadius:2, background:"#E5E7EB", margin:"0 auto 18px" }} />
          <h3 style={{ fontSize:17, fontWeight:700, color:"#000", margin:"0 0 6px", textAlign:"center" }}>Historique pour les nouveaux membres</h3>
          <p style={{ fontSize:13.5, color:"#9CA3AF", textAlign:"center", lineHeight:1.5, margin:"0 0 22px" }}>
            Choisissez si les nouveaux membres peuvent voir les messages précédents du groupe.
          </p>
          {[
            { val: true, label: "Visible", desc: "Les nouveaux membres peuvent lire l'historique complet des messages." },
            { val: false, label: "Invisible", desc: "Les nouveaux membres ne verront que les messages envoyés après qu'ils ont rejoint." },
          ].map(opt => (
            <div key={String(opt.val)} onClick={() => { setGrpHistoriqueVisible(opt.val); setShowGrpHistoriqueSheet(false); }}
              style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"14px 0", borderBottom:"1px solid rgba(0,0,0,0.07)", cursor:"pointer" }}>
              <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${grpHistoriqueVisible===opt.val?"var(--bp-primary)":"#CBD5E1"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                {grpHistoriqueVisible===opt.val && <div style={{ width:12, height:12, borderRadius:"50%", background:"var(--bp-primary)" }} />}
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:"#000", marginBottom:3 }}>{opt.label}</div>
                <div style={{ fontSize:13.5, color:"#9CA3AF", lineHeight:1.45 }}>{opt.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    , document.body);
  }

  if (activeGroupId !== null && showGroupInfo) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    const gInfo = groupInfo;
    const isChannelG = grp?.type === "channel";
    const memberCount = gInfo?.members.length ?? grp?.membersCount ?? 0;
    const grpInitialInfo = (grp?.name ?? "G")[0].toUpperCase();
    const grpColorInfo = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#0EA5E9","#F59E0B"][activeGroupId % 7];

    const allMembers = gInfo?.members ?? [];
    const filteredMembers = grpInfoSearchQ.trim()
      ? allMembers.filter(m => {
          const n = m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : `Utilisateur #${m.userId}`;
          return n.toLowerCase().includes(grpInfoSearchQ.toLowerCase());
        })
      : allMembers;

    const AUTO_DEL_OPTS: { key: "off"|"1d"|"1w"|"1m"|"custom"; label: string }[] = [
      { key: "off",    label: "Désactivée" },
      { key: "1d",     label: "1 jour" },
      { key: "1w",     label: "1 semaine" },
      { key: "1m",     label: "1 mois" },
      { key: "custom", label: "Définir un délai" },
    ];

    const MENU_ITEMS = [
      { key:"autodel", label:"Auto-suppression",               color:"#000", hasArrow:true,
        icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 15.5 14"/></svg>,
        action: () => { setShowAutoDelSubmenu(true); setShowGrpInfoMenu(false); } },
      { key:"video",   label:"Démarrer un appel vidéo",         color:"#000", hasArrow:false,
        icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
        action: () => setShowGrpInfoMenu(false) },
      { key:"search",  label:"Rechercher des membres",          color:"#000", hasArrow:false,
        icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>,
        action: () => { setShowGrpInfoSearch(true); setGrpInfoSearchQ(""); setShowGrpInfoMenu(false); } },
      { key:"home",    label:"Ajouter à l'écran d'accueil",    color:"#000", hasArrow:false,
        icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>,
        action: () => { setShowAddToHomeDlg(true); setShowGrpInfoMenu(false); } },
      { key:"quit",    label:"Supprimer et quitter le groupe", color:"#EF4444", hasArrow:false,
        icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
        action: () => { setShowDeleteQuitDlg(true); setShowGrpInfoMenu(false); } },
    ];

    /* computed */
    const memberIds     = new Set(allMembers.map(m => m.userId));
    const addCandidates = grpAllUsers.filter(u => !memberIds.has(u.id));

    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#F8FAFC", zIndex:10000, display:"flex", flexDirection:"column" }}>
        <style>{`
          @keyframes gi-menu-in  { from{opacity:0;transform:scale(0.93) translateY(-6px)} to{opacity:1;transform:scale(1) translateY(0)} }
          @keyframes gi-dlg-in   { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
          @keyframes gi-sheet-in { from{transform:translateY(100%)} to{transform:translateY(0)} }
        `}</style>

        {/* ── HEADER ── */}
        <div style={{ background:"var(--theme-surface)", display:"flex", alignItems:"center", padding:"6px 4px", flexShrink:0, boxShadow:"0 1px 0 rgba(0,0,0,0.07)" }}>
          {showGrpInfoSearch ? (
            <>
              <button onClick={() => { setShowGrpInfoSearch(false); setGrpInfoSearchQ(""); }} style={{ background:"none", border:"none", cursor:"pointer", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <input autoFocus value={grpInfoSearchQ} onChange={e => setGrpInfoSearchQ(e.target.value)} placeholder="Rechercher des membres…"
                style={{ flex:1, border:"none", outline:"none", fontSize:16, background:"transparent", color:"#000" }} />
              {grpInfoSearchQ && (
                <button onClick={() => setGrpInfoSearchQ("")} style={{ background:"none", border:"none", cursor:"pointer", padding:8 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </>
          ) : (
            <>
              <button onClick={() => setShowGroupInfo(false)} style={{ background:"none", border:"none", cursor:"pointer", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{ flex:1 }} />
              <button onClick={() => { setGrpEditName(grp?.name ?? ""); setGrpEditDesc(""); setShowGrpEdit(true); }} style={{ background:"none", border:"none", cursor:"pointer", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <div style={{ position:"relative" }}>
                <button onClick={() => setShowGrpInfoMenu(v => !v)} style={{ background:"none", border:"none", cursor:"pointer", width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#9CA3AF"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                </button>
                {showGrpInfoMenu && (
                  <>
                    <div onClick={() => setShowGrpInfoMenu(false)} style={{ position:"fixed", inset:0, zIndex:29 }} />
                    <div style={{ position:"absolute", top:48, right:0, width:280, background:"var(--theme-surface)", borderRadius:18, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", zIndex:30, overflow:"hidden", animation:"gi-menu-in 0.18s cubic-bezier(0.34,1.56,0.64,1)" }}>
                      {MENU_ITEMS.map((item, idx) => (
                        <div key={item.key}>
                          <div onClick={item.action} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 18px", cursor:"pointer" }}
                            onMouseEnter={e=>(e.currentTarget.style.background="#F1F5F9")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                            <span style={{ width:24, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.icon}</span>
                            <span style={{ flex:1, fontSize:15.5, color:item.color }}>{item.label}</span>
                            {item.hasArrow && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
                          </div>
                          {idx < MENU_ITEMS.length-1 && <div style={{ height:1, background:"rgba(0,0,0,0.07)", margin:"0 18px" }} />}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div style={{ flex:1, overflowY:"auto", paddingBottom:76 }} onClick={() => { setGrpMemberMenu(null); setShowGrpInfoMenu(false); }}>

          {/* ── PROFILE CARD ── */}
          <div style={{ background:"var(--theme-surface)", textAlign:"center", padding:"28px 16px 22px", marginBottom:8 }}>
            <div style={{ position:"relative", display:"inline-block", marginBottom:16 }}>
              <div style={{ width:104, height:104, borderRadius:"50%", background:grpColorInfo, border:"3.5px solid #22C55E", boxShadow:"0 0 0 5px rgba(34,197,94,0.13)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:44, overflow:"hidden" }}>
                {grp?.avatarUrl ? <img src={grp.avatarUrl} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={grp?.name} /> : grpInitialInfo}
              </div>
              <div style={{ position:"absolute", bottom:3, right:3, width:28, height:28, borderRadius:"50%", background:"#22C55E", border:"2.5px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,0.2)" }}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
            </div>
            <div style={{ fontWeight:700, fontSize:22, color:"#000", marginBottom:5 }}>{grp?.name ?? "Groupe"}</div>
            <div style={{ fontSize:14, color:"#9CA3AF", marginBottom:16 }}>{memberCount} membre{memberCount!==1?"s":""} • {isChannelG?"Canal":"Groupe"}</div>
            <button onClick={e => { e.stopPropagation(); setShowGrpAllActions(true); }} style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#F0FDF4", border:"1.5px solid rgba(34,197,94,0.5)", borderRadius:50, padding:"9px 18px", cursor:"pointer", color:"#22C55E", fontWeight:600, fontSize:14 }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
              Toutes les actions
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>

          {/* ── 4 QUICK ACTIONS ── */}
          <div style={{ display:"flex", gap:8, padding:"0 12px", marginBottom:10 }}>
            {([
              { label:"Message",   txtColor:"var(--bp-primary)", onClick:()=>setShowGroupInfo(false),
                icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              { label:"Silencieux", txtColor:"var(--bp-primary)", onClick:()=>setShowGrpInfoMuteSheet(true),
                icon:(
                  <svg viewBox="0 0 26 26" width="26" height="26" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round">
                    <path d="M19 9A7 7 0 0 0 7 9c0 8-3.5 10.5-3.5 10.5h19S19 17 19 9"/>
                    <path d="M14.7 22a2 2 0 0 1-3.4 0"/>
                    <text x="14" y="7" fontSize="6.5" fill="var(--bp-primary)" stroke="none" fontWeight="700">Zz</text>
                  </svg>
                ) },
              { label:"Vidéo",     txtColor:"var(--bp-primary)", onClick:()=>{},
                icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
              { label:"Quitter",   txtColor:"#EF4444",           onClick:()=>setShowDeleteQuitDlg(true),
                icon:<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> },
            ] as { label:string; txtColor:string; onClick:()=>void; icon:React.ReactNode }[]).map(a => (
              <div key={a.label} onClick={a.onClick}
                style={{ flex:1, background:"var(--theme-surface)", borderRadius:14, padding:"14px 4px 10px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.07)", border:"1px solid rgba(0,0,0,0.04)", transition:"transform 0.1s" }}
                onPointerDown={e=>(e.currentTarget.style.transform="scale(0.93)")}
                onPointerUp={e=>(e.currentTarget.style.transform="scale(1)")}
                onPointerLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
                {a.icon}
                <span style={{ fontSize:12, color:a.txtColor, fontWeight:400 }}>{a.label}</span>
              </div>
            ))}
          </div>

          {/* ── MEMBERS CARD ── */}
          <div style={{ background:"var(--theme-surface)", marginBottom:10, overflow:"hidden" }}>
            {/* Ajouter des membres */}
            <div onClick={() => setGrpAddMembersOpen(v=>!v)} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 16px", cursor:"pointer", borderBottom:"1px solid rgba(0,0,0,0.07)" }}
              onPointerDown={e=>(e.currentTarget.style.background="#F0FDF4")} onPointerUp={e=>(e.currentTarget.style.background="transparent")} onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
              <div style={{ width:46, height:46, borderRadius:"50%", background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15.5, color:"var(--bp-primary)", fontWeight:600 }}>Ajouter des membres</div>
                <div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:1 }}>Inviter des contacts dans le {isChannelG?"canal":"groupe"}</div>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            {grpAddMembersOpen && (
              <div style={{ borderBottom:"1px solid rgba(0,0,0,0.07)", maxHeight:280, overflowY:"auto" }}>
                {addCandidates.map(u => {
                  const n2 = `${u.firstName} ${u.lastName}`;
                  const c2 = CONV_COLORS[u.id % CONV_COLORS.length];
                  return (
                    <div key={u.id} onClick={e=>{ e.stopPropagation(); setGrpAddMembersOpen(false); apiAddChatGroupMembers(activeGroupId,[u.id]).then(refreshGroupInfo).catch(()=>{}); }}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", borderBottom:"1px solid rgba(0,0,0,0.06)", cursor:"pointer" }}>
                      <div style={{ width:40, height:40, borderRadius:"50%", background:c2, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:13 }}>{mkInitials(n2)}</div>
                      <span style={{ flex:1, fontSize:15, color:"#000", fontWeight:500 }}>{n2}</span>
                      <span style={{ fontSize:13, color:"var(--bp-primary)", fontWeight:600 }}>Ajouter</span>
                    </div>
                  );
                })}
                {addCandidates.length===0 && <p style={{ fontSize:13, color:"#9CA3AF", padding:"12px 16px", margin:0 }}>Aucun utilisateur à ajouter.</p>}
              </div>
            )}
            {/* Member rows */}
            {filteredMembers.map((m, i) => {
              const name = m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : `Utilisateur #${m.userId}`;
              const isMe = m.userId === meId;
              const roleLabel = m.role === "owner" ? "Propriétaire" : m.role === "admin" ? "Administrateur" : null;
              const avatarColor = CONV_COLORS[m.userId % CONV_COLORS.length];
              const menuOpen = grpMemberMenu === m.userId;
              const canManage = (gInfo?.role === "owner" || gInfo?.role === "admin") && !isMe;
              return (
                <div key={m.userId} style={{ position:"relative", borderBottom:i<filteredMembers.length-1?"1px solid rgba(0,0,0,0.07)":"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 16px", background:menuOpen?"rgba(0,0,0,0.02)":"transparent" }}>
                    <div style={{ position:"relative", flexShrink:0 }}>
                      <div style={{ width:46, height:46, borderRadius:"50%", background:avatarColor, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:16 }}>{mkInitials(name)}</div>
                      <div style={{ position:"absolute", bottom:1, right:1, width:13, height:13, borderRadius:"50%", background:"#22C55E", border:"2px solid var(--theme-surface)" }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:15.5, color:"#000", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{name}</div>
                      <div style={{ fontSize:12.5, color:"var(--bp-primary)", marginTop:1 }}>{isMe?"Vous":"en ligne"}</div>
                    </div>
                    {roleLabel && (
                      <div style={{ fontSize:12, color:"var(--bp-primary)", border:"1.5px solid var(--bp-primary)", borderRadius:20, padding:"3px 10px", flexShrink:0, fontWeight:500, background:"var(--theme-surface)", whiteSpace:"nowrap" }}>{roleLabel}</div>
                    )}
                    <button onClick={e=>{ e.stopPropagation(); setGrpMemberMenu(menuOpen?null:m.userId); }} style={{ background:"none", border:"none", cursor:"pointer", padding:8, flexShrink:0 }}>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="#CBD5E1"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                    </button>
                  </div>
                  {menuOpen && (
                    <>
                      <div onClick={e=>{ e.stopPropagation(); setGrpMemberMenu(null); }} style={{ position:"fixed", inset:0, zIndex:5 }} />
                      <div style={{ position:"absolute", right:8, top:52, background:"var(--theme-surface)", borderRadius:16, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", zIndex:10, width:230, overflow:"hidden" }}>
                        {(([
                          { label:"Voir le profil",    color:"#000",    icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, action:()=>setGrpMemberMenu(null) },
                          { label:"Envoyer un message",color:"#000",    icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, action:()=>setGrpMemberMenu(null) },
                          ...(canManage?[
                            { label:m.role==="member"?"Promouvoir admin":"Rétrograder", color:"#000", icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, action:()=>{ setGrpMemberMenu(null); apiSetChatGroupMemberRole(activeGroupId,m.userId,m.role==="member"?"admin":"member").then(refreshGroupInfo).catch(()=>{}); } },
                            { label:"Retirer du groupe",color:"#EF4444",icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>, action:()=>{ setGrpMemberMenu(null); apiRemoveChatGroupMember(activeGroupId,m.userId).then(refreshGroupInfo).catch(()=>{}); } },
                          ]:[]),
                        ] as {label:string;color:string;icon:React.ReactNode;action:()=>void}[])).map((item,idx,arr)=>(
                          <div key={item.label} onClick={e=>{ e.stopPropagation(); item.action(); }}
                            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", cursor:"pointer", borderBottom:idx<arr.length-1?"1px solid rgba(0,0,0,0.06)":"none" }}
                            onPointerDown={e=>(e.currentTarget.style.background="#F9FAFB")} onPointerUp={e=>(e.currentTarget.style.background="transparent")} onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
                            {item.icon}
                            <span style={{ fontSize:14.5, color:item.color }}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {grpInfoSearchQ.trim() && filteredMembers.length===0 && (
              <div style={{ textAlign:"center", color:"#9CA3AF", fontSize:14, padding:"24px 16px" }}>Aucun résultat</div>
            )}
          </div>

          {/* ── STATISTIQUES CARD ── */}
          <div style={{ background:"var(--theme-surface)", marginBottom:10, overflow:"hidden" }}>
            <div onClick={()=>setShowGrpStats(true)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", cursor:"pointer", borderBottom:"1px solid rgba(0,0,0,0.07)" }}
              onPointerDown={e=>(e.currentTarget.style.background="#F0F9FF")} onPointerUp={e=>(e.currentTarget.style.background="transparent")} onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
              <div style={{ width:46, height:46, borderRadius:"50%", background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15.5, color:"#3B82F6", fontWeight:600 }}>Statistiques du groupe</div>
                <div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:1 }}>Voir les statistiques de croissance et d'activité</div>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            {/* 4 stats grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", padding:"16px 6px 14px", gap:2 }}>
              {([
                { icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>, val:12,          label:"Messages aujourd'hui", sub:null },
                { icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, val:memberCount, label:"Membres total",         sub:null },
                { icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, val:15,          label:"Vues",                  sub:"7 derniers jours" },
                { icon:<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, val:3,           label:"Réactions",             sub:"7 derniers jours" },
              ] as {icon:React.ReactNode;val:number;label:string;sub:string|null}[]).map(s => (
                <div key={s.label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"2px 2px" }}>
                  {s.icon}
                  <div style={{ fontWeight:700, fontSize:20, color:"#000", lineHeight:1.2 }}>{s.val}</div>
                  <div style={{ fontSize:10.5, color:"#374151", textAlign:"center", lineHeight:1.3 }}>{s.label}</div>
                  {s.sub && <div style={{ fontSize:10, color:"#9CA3AF", textAlign:"center" }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* ── ACTIVITÉ RÉCENTE ── */}
          <div onClick={()=>setShowGrpStats(true)} style={{ background:"var(--theme-surface)", marginBottom:10, cursor:"pointer" }}
            onPointerDown={e=>(e.currentTarget.style.background="#F0FDF4")} onPointerUp={e=>(e.currentTarget.style.background="transparent")} onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
            <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px" }}>
              <div style={{ width:46, height:46, borderRadius:"50%", background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15.5, color:"#22C55E", fontWeight:600 }}>Activité récente</div>
                <div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:1 }}>Groupe actif • Réponse rapide • Bonne engagement</div>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>

        </div>{/* end scrollable */}

        {/* ── BOTTOM ACTION BAR ── */}
        <div style={{ background:"var(--theme-surface)", borderTop:"1px solid rgba(0,0,0,0.07)", padding:"10px 4px max(10px,env(safe-area-inset-bottom))", flexShrink:0 }}>
          <div style={{ display:"flex" }}>
            {([
              { label:"Modifier",                color:"#000",    icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>, onClick:()=>{ setGrpEditName(grp?.name??""); setGrpEditDesc(""); setShowGrpEdit(true); } },
              { label:"Ajouter des commentaires",color:"#000",    icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="10" y1="11" x2="14" y2="11"/></svg>, onClick:()=>{ import("sonner").then(({toast})=>toast.info("Bientôt disponible")); } },
              { label:"Redimensionner",          color:"#000",    icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>, onClick:()=>{ import("sonner").then(({toast})=>toast.info("Bientôt disponible")); } },
              { label:"Supprimer",               color:"#EF4444", icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>, onClick:()=>setShowDeleteQuitDlg(true) },
            ] as {label:string;color:string;icon:React.ReactNode;onClick:()=>void}[]).map(a => (
              <div key={a.label} onClick={a.onClick}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer", padding:"4px 4px", borderRadius:10 }}
                onPointerDown={e=>(e.currentTarget.style.background="#F1F5F9")} onPointerUp={e=>(e.currentTarget.style.background="transparent")} onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
                {a.icon}
                <span style={{ fontSize:9.5, color:a.color, textAlign:"center", lineHeight:1.2, maxWidth:64 }}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── "TOUTES LES ACTIONS" SHEET ── */}
        {showGrpAllActions && (
          <>
            <div onClick={()=>setShowGrpAllActions(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:40 }} />
            <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--theme-surface)", borderRadius:"22px 22px 0 0", zIndex:41, overflow:"hidden", animation:"gi-sheet-in 0.22s ease", paddingBottom:"env(safe-area-inset-bottom,20px)" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"#E5E7EB", margin:"14px auto 4px" }} />
              <div style={{ fontWeight:700, fontSize:17, color:"#000", textAlign:"center", padding:"8px 20px 12px" }}>Toutes les actions</div>
              {MENU_ITEMS.map((item,idx)=>(
                <div key={item.key} onClick={()=>{ setShowGrpAllActions(false); item.action(); }}
                  style={{ display:"flex", alignItems:"center", gap:16, padding:"13px 20px", cursor:"pointer", borderTop:idx>0?"1px solid rgba(0,0,0,0.06)":"none" }}
                  onPointerDown={e=>(e.currentTarget.style.background="#F9FAFB")} onPointerUp={e=>(e.currentTarget.style.background="transparent")} onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <span style={{ width:24, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{item.icon}</span>
                  <span style={{ flex:1, fontSize:15.5, color:item.color }}>{item.label}</span>
                  {item.hasArrow && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MUTE SHEET ── */}
        {showGrpInfoMuteSheet && (
          <>
            <div onClick={()=>setShowGrpInfoMuteSheet(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:40 }} />
            <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--theme-surface)", borderRadius:"22px 22px 0 0", zIndex:41, animation:"gi-sheet-in 0.22s ease", paddingBottom:"env(safe-area-inset-bottom,20px)" }}>
              <div style={{ width:36, height:4, borderRadius:2, background:"#E5E7EB", margin:"14px auto 4px" }} />
              <div style={{ fontWeight:700, fontSize:17, color:"#000", textAlign:"center", padding:"8px 0 2px" }}>Mettre en sourdine</div>
              <div style={{ fontSize:13, color:"#9CA3AF", textAlign:"center", marginBottom:8 }}>Choisissez la durée</div>
              {([{label:"1 heure",key:"1h"},{label:"8 heures",key:"8h"},{label:"1 semaine",key:"1w"},{label:"Jusqu'à désactivation",key:"always"}] as {label:string;key:string}[]).map((opt,i)=>(
                <div key={opt.key} onClick={()=>{ setShowGrpInfoMuteSheet(false); import("sonner").then(({toast})=>toast.success(`Groupe mis en sourdine (${opt.label})`)); }}
                  style={{ display:"flex", alignItems:"center", padding:"14px 24px", cursor:"pointer", borderTop:i>0?"1px solid rgba(0,0,0,0.06)":"none" }}
                  onPointerDown={e=>(e.currentTarget.style.background="#F9FAFB")} onPointerUp={e=>(e.currentTarget.style.background="transparent")} onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <span style={{ fontSize:16, color:"#000" }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── AUTO-DELETE DIALOG ── */}
        {showAutoDelSubmenu && (
          <>
            <div onClick={()=>setShowAutoDelSubmenu(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:40 }} />
            <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"var(--theme-surface)", borderRadius:"20px 20px 0 0", zIndex:41, padding:"18px 0 32px", animation:"gi-dlg-in 0.2s ease", boxShadow:"0 -4px 24px rgba(0,0,0,0.12)" }}>
              <div style={{ textAlign:"center", fontWeight:700, fontSize:17, color:"#000", marginBottom:6, padding:"0 20px" }}>Auto-suppression</div>
              <div style={{ textAlign:"center", fontSize:13.5, color:"#9CA3AF", marginBottom:14, padding:"0 20px" }}>Les messages seront supprimés automatiquement</div>
              {AUTO_DEL_OPTS.map(opt=>(
                <div key={opt.key} onClick={()=>{ setAutoDelOption(opt.key); setShowAutoDelSubmenu(false); }} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 24px", cursor:"pointer" }}>
                  <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${autoDelOption===opt.key?"var(--bp-primary)":"#CBD5E1"}`, background:autoDelOption===opt.key?"var(--bp-primary)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                    {autoDelOption===opt.key && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ fontSize:16, color:"#000", fontWeight:autoDelOption===opt.key?600:400 }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ADD TO HOME DIALOG ── */}
        {showAddToHomeDlg && (
          <>
            <div onClick={()=>setShowAddToHomeDlg(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:40 }} />
            <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(320px,90vw)", background:"var(--theme-surface)", borderRadius:18, zIndex:41, padding:"28px 24px 20px", animation:"gi-dlg-in 0.18s ease", boxShadow:"0 8px 32px rgba(0,0,0,0.18)", textAlign:"center" }}>
              <div style={{ fontWeight:700, fontSize:18, color:"#000", marginBottom:8 }}>Ajouter à l'écran d'accueil</div>
              <div style={{ fontSize:13.5, color:"#9CA3AF", marginBottom:20 }}>Ajoutez ce groupe à l'écran d'accueil pour un accès rapide.</div>
              <div style={{ width:72, height:72, borderRadius:"50%", background:grpColorInfo, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:28, margin:"0 auto 10px" }}>{grpInitialInfo}</div>
              <div style={{ fontWeight:600, fontSize:16, color:"#000", marginBottom:24 }}>{grp?.name??"Groupe"}</div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <button onClick={()=>setShowAddToHomeDlg(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, fontWeight:600, color:"var(--bp-primary)", padding:"8px 16px" }}>ANNULER</button>
                <button onClick={()=>setShowAddToHomeDlg(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, fontWeight:600, color:"var(--bp-primary)", padding:"8px 16px" }}>AJOUTER</button>
              </div>
            </div>
          </>
        )}

        {/* ── QUITTER / SUPPRIMER DIALOG ── */}
        {showDeleteQuitDlg && (
          <>
            <div onClick={()=>setShowDeleteQuitDlg(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:40 }} />
            <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"min(320px,90vw)", background:"var(--theme-surface)", borderRadius:18, zIndex:41, padding:"28px 24px 20px", animation:"gi-dlg-in 0.18s ease", boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }}>
              <div style={{ fontWeight:700, fontSize:18, color:"#000", marginBottom:8 }}>Quitter le groupe ?</div>
              <div style={{ fontSize:14, color:"#9CA3AF", marginBottom:20 }}>Êtes-vous sûr de vouloir quitter ce groupe ?</div>
              <div onClick={()=>setDeleteQuitAll(v=>!v)} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, cursor:"pointer" }}>
                <div style={{ width:22, height:22, borderRadius:5, border:`2px solid ${deleteQuitAll?"var(--bp-primary)":"#CBD5E1"}`, background:deleteQuitAll?"var(--bp-primary)":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                  {deleteQuitAll && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize:14.5, color:"#000" }}>Supprimer le groupe pour tous les membres</span>
              </div>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <button onClick={()=>setShowDeleteQuitDlg(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, fontWeight:600, color:"var(--bp-primary)", padding:"8px 16px" }}>ANNULER</button>
                <button onClick={async()=>{ setShowDeleteQuitDlg(false); await apiLeaveChatGroup(activeGroupId); setChatGroups(p=>p.filter(g=>g.id!==activeGroupId)); setActiveGroupId(null); setShowGroupInfo(false); }}
                  style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, fontWeight:600, color:"#EF4444", padding:"8px 16px" }}>QUITTER</button>
              </div>
            </div>
          </>
        )}
      </div>
    , document.body);
  }

  /* ══════════════════════════════════════════════════════════════
     INFO OVERLAY — BrutePawa 2026 premium
  ══════════════════════════════════════════════════════════════ */
  if (activeConv && activeUser && overlay === "info") {
    const bio = contactInfo?.bio?.trim() || "Bonjour ! J'utilise Brute Pawa.";
    const memberSince = contactInfo?.createdAt
      ? new Date(contactInfo.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : "—";
    const bpId = `BPW-${activeConv.toString(16).toUpperCase().padStart(8, "0")}`;
    const ciBlocked  = contactInfo?.isBlocked ?? false;
    const ciMuted    = contactInfo?.isMuted   ?? false;

    /* ── Chevron ── */
    const ChevronRight = ({ color = "#22C55E" }: { color?: string }) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    );
    /* ── Row touch feedback ── */
    const rowProps = (onClick: () => void) => ({
      onClick,
      style: { display:"flex", alignItems:"center", gap:14, padding:"15px 16px", cursor:"pointer" } as React.CSSProperties,
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.style.background = "#F0FDF4"; },
      onPointerUp:   (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.style.background = "transparent"; },
      onPointerLeave:(e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.style.background = "transparent"; },
    });
    /* ── Icon box ── */
    const IconBox = ({ children, red = false }: { children: React.ReactNode; red?: boolean }) => (
      <div style={{ width:40, height:40, borderRadius:12, background: red ? "#FEF2F2" : "#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{children}</div>
    );

    /* ═══════════════════════════════════════
       SUB-PAGE — À PROPOS
    ═══════════════════════════════════════ */
    if (showInfoAbout) return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"#F9FFF9", display:"flex", flexDirection:"column" }}>
        {/* header */}
        <div style={{ background:"#fff", padding:"14px 16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #F0F9F4", position:"sticky", top:0, zIndex:10 }}>
          <button onClick={() => setShowInfoAbout(false)} style={{ width:36, height:36, borderRadius:"50%", background:"#F0FDF4", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ flex:1, fontWeight:700, fontSize:16, color:"#111" }}>À propos</span>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 0 32px" }}>
          {/* big icon */}
          <div style={{ display:"flex", justifyContent:"center", paddingTop:28, paddingBottom:20 }}>
            <div style={{ width:68, height:68, borderRadius:"50%", background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 12px rgba(34,197,94,0.12)" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="#22C55E"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none"/><circle cx="9" cy="10" r="1.2" fill="#fff"/><circle cx="15" cy="10" r="1.2" fill="#fff"/></svg>
            </div>
          </div>
          {/* bio card */}
          <div style={{ margin:"0 16px 10px", background:"#fff", borderRadius:16, padding:"16px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#22C55E", textTransform:"uppercase", letterSpacing:0.7, marginBottom:10 }}>À propos</div>
            <p style={{ fontSize:14.5, color:"#374151", lineHeight:1.65, margin:0 }}>{bio}</p>
          </div>
          {/* detail rows */}
          <div style={{ margin:"0 16px", background:"#fff", borderRadius:16, overflow:"hidden" }}>
            {([
              { label:"Statut",         val: presence.online ? "En ligne" : presText, green: presence.online },
              { label:"Membre depuis",  val: memberSince, green: false },
              { label:"ID Brute Pawa",  val: bpId, green: false, mono: true },
            ] as { label:string; val:string; green:boolean; mono?:boolean }[]).map((row, i, arr) => (
              <div key={row.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderBottom:i<arr.length-1?"1px solid #F3F4F6":"none" }}>
                <span style={{ fontSize:13.5, color:"#9CA3AF", fontWeight:400 }}>{row.label}</span>
                <span style={{ fontSize:13.5, fontWeight:row.green?700:500, color:row.green?"#22C55E":"#111", fontFamily:row.mono?"monospace":undefined, display:"flex", alignItems:"center", gap:5 }}>
                  {row.green && <span style={{ width:7, height:7, borderRadius:"50%", background:"#22C55E", display:"inline-block" }} />}
                  {row.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    , document.body);

    /* ═══════════════════════════════════════
       SUB-PAGE — PARAMÈTRES DU CONTACT
    ═══════════════════════════════════════ */
    if (showInfoSettings) return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"#F9FFF9", display:"flex", flexDirection:"column" }}>
        {/* header */}
        <div style={{ background:"#fff", padding:"14px 16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #F0F9F4", position:"sticky", top:0, zIndex:10 }}>
          <button onClick={() => setShowInfoSettings(false)} style={{ width:36, height:36, borderRadius:"50%", background:"#F0FDF4", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ flex:1, fontWeight:700, fontSize:16, color:"#111" }}>{activeUser.name}</span>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {/* main settings */}
          <div style={{ background:"#fff", margin:"12px 0 2px" }}>
            {([
              { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
                label:"Notifications", val: ciMuted ? "Désactivées" : "Actives", green:!ciMuted, onClick:()=>{ setShowInfoSettings(false); setOverlay("contact-mute"); } },
              { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                label:"Confidentialité", val:"Personnalisée", green:false, onClick:()=>{} },
              { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
                label:"Médias partagés", val:"—", green:false, onClick:()=>{} },
              { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                label:"Fichiers", val:"—", green:false, onClick:()=>{} },
              { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                label:"Groupes en commun", val:"—", green:false, onClick:()=>{} },
              { icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
                label:"Contacts en commun", val:"—", green:false, onClick:()=>{} },
            ] as { icon:React.ReactNode; label:string; val:string; green:boolean; onClick:()=>void }[]).map((item, i, arr) => (
              <div key={item.label} onClick={item.onClick}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid #F3F4F6":"none", cursor:"pointer", background:"transparent" }}
                onPointerDown={e=>(e.currentTarget.style.background="#F9FFF9")}
                onPointerUp={e=>(e.currentTarget.style.background="transparent")}
                onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
                <IconBox>{item.icon}</IconBox>
                <span style={{ flex:1, fontSize:14.5, color:"#111", fontWeight:500 }}>{item.label}</span>
                {item.val !== "—" && <span style={{ fontSize:13, color:item.green?"#22C55E":"#9CA3AF", fontWeight:item.green?700:400 }}>{item.val}</span>}
                <ChevronRight color="#D1D5DB" />
              </div>
            ))}
          </div>
          {/* danger */}
          <div style={{ background:"#fff", margin:"8px 0 24px" }}>
            {[
              { label: ciBlocked ? "Débloquer le contact" : "Bloquer le contact",
                icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
                onClick:()=>{ setShowInfoSettings(false); setOverlay("contact-block"); } },
              { label:"Signaler le contact",
                icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
                onClick:()=>{ setReportReason(""); setReportDesc(""); setShowInfoSettings(false); setOverlay("contact-report"); } },
            ].map((item, i, arr) => (
              <div key={item.label} onClick={item.onClick}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderBottom:i<arr.length-1?"1px solid #FEF2F2":"none", cursor:"pointer" }}
                onPointerDown={e=>(e.currentTarget.style.background="#FFF5F5")}
                onPointerUp={e=>(e.currentTarget.style.background="transparent")}
                onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
                <IconBox red>{item.icon}</IconBox>
                <span style={{ flex:1, fontSize:14.5, color:"#EF4444", fontWeight:500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    , document.body);

    /* ═══════════════════════════════════════
       MAIN PAGE — INFOS DU CONTACT
    ═══════════════════════════════════════ */
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10000, overflowY:"auto", background:"#F9FFF9" }}
        onClick={() => showInfoMenu && setShowInfoMenu(false)}>

        {/* ── HEADER ── */}
        <div style={{ position:"sticky", top:0, zIndex:20, background:"#fff", padding:"14px 16px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid rgba(34,197,94,0.10)" }}>
          <button onClick={() => { setShowInfoAbout(false); setShowInfoSettings(false); setShowInfoMenu(false); setOverlay("none"); }}
            style={{ width:36, height:36, borderRadius:"50%", background:"#F0FDF4", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ flex:1, fontWeight:700, fontSize:17, color:"#111" }}>Infos du contact</span>
          {/* 3-dot menu */}
          <div style={{ position:"relative" }}>
            <button onClick={e => { e.stopPropagation(); setShowInfoMenu(v => !v); }}
              style={{ width:36, height:36, borderRadius:"50%", border:"none", background:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
            </button>
            {showInfoMenu && (
              <div style={{ position:"absolute", top:42, right:0, background:"#fff", borderRadius:14, boxShadow:"0 8px 30px rgba(0,0,0,0.14)", zIndex:100, minWidth:230, overflow:"hidden" }}
                onClick={e => e.stopPropagation()}>
                {([
                  { label:"Rechercher dans la conv.", onClick:()=>{ setContactSearchQ(""); setContactSearchResults([]); setShowInfoMenu(false); setOverlay("contact-search"); } },
                  { label:"Partager le contact", onClick:()=>{ const url=`${window.location.origin}${import.meta.env.BASE_URL}profile/${activeConv}`; if(navigator.share) navigator.share({title:activeUser.name,url}).catch(()=>{}); else navigator.clipboard.writeText(url).catch(()=>{}); setShowInfoMenu(false); } },
                  { label:"Bloquer", onClick:()=>{ setShowInfoMenu(false); setOverlay("contact-block"); } },
                  { label:"Signaler", onClick:()=>{ setReportReason(""); setReportDesc(""); setShowInfoMenu(false); setOverlay("contact-report"); } },
                  { label:"Supprimer la discussion", red:true, onClick:()=>{ setShowInfoMenu(false); setOverlay("contact-delete"); } },
                ] as { label:string; red?:boolean; onClick:()=>void }[]).map((item, i, arr) => (
                  <div key={item.label} onClick={item.onClick}
                    style={{ padding:"13px 18px", fontSize:14.5, color:item.red?"#EF4444":"#111827", cursor:"pointer", borderBottom:i<arr.length-1?"1px solid #F9FAFB":"none", fontWeight:item.red?500:400 }}
                    onPointerDown={e=>(e.currentTarget.style.background="#F9FAFB")}
                    onPointerUp={e=>(e.currentTarget.style.background="transparent")}
                    onPointerLeave={e=>(e.currentTarget.style.background="transparent")}>
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── CARTE PROFIL ── */}
        <div style={{ margin:"16px 16px 0", background:"#fff", borderRadius:20, padding:"28px 16px 22px", textAlign:"center", boxShadow:"0 2px 16px rgba(34,197,94,0.08), 0 1px 4px rgba(0,0,0,0.04)", border:"1px solid rgba(34,197,94,0.08)" }}>
          {/* avatar */}
          <div style={{ position:"relative", display:"inline-block", marginBottom:16 }}>
            {activeUser.avatarUrl
              ? <img src={activeUser.avatarUrl} alt={activeUser.name} style={{ width:96, height:96, borderRadius:"50%", objectFit:"cover", display:"block", border:"3px solid #22C55E", boxShadow:"0 0 0 5px rgba(34,197,94,0.12)" }} />
              : <div style={{ width:96, height:96, borderRadius:"50%", background:activeUser.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34, fontWeight:900, color:"#fff", border:"3px solid #22C55E", boxShadow:"0 0 0 5px rgba(34,197,94,0.12)" }}>{activeUser.initials}</div>}
            <div style={{ position:"absolute", bottom:5, right:5, width:15, height:15, borderRadius:"50%", background:presence.online?"#22C55E":"#9CA3AF", border:"2.5px solid #fff" }} />
          </div>
          {/* name */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginBottom:6 }}>
            <span style={{ fontWeight:800, fontSize:21, color:"#111", letterSpacing:-0.2 }}>{activeUser.name}</span>
            {[13,26,40].includes(activeConv) && <img src="/badge-verified.jpg" alt="Vérifié" style={{ width:20, height:20, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />}
          </div>
          {/* status */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginBottom:22 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:presence.online?"#22C55E":"#9CA3AF" }} />
            <span style={{ fontSize:13, color:presence.online?"#22C55E":"#9CA3AF", fontWeight:600 }}>{presence.online?"En ligne":presText}</span>
          </div>
          {/* actions */}
          <div style={{ display:"flex", gap:10 }}>
            {([
              { label:"Message", onClick:()=>{ setShowInfoAbout(false); setShowInfoSettings(false); setShowInfoMenu(false); setOverlay("none"); },
                icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="#22C55E"/><circle cx="8" cy="11" r="1.15" fill="#fff"/><circle cx="12" cy="11" r="1.15" fill="#fff"/><circle cx="16" cy="11" r="1.15" fill="#fff"/></svg> },
              { label:"Appel audio", onClick:()=>{ setOverlay("none"); sig.startCall(activeConv,"audio"); },
                icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="#22C55E"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01z"/></svg> },
              { label:"Vidéo", onClick:()=>{ setOverlay("none"); sig.startCall(activeConv,"video"); },
                icon:<svg width="24" height="24" viewBox="0 0 24 24" fill="#22C55E"><path d="M15 10l4.55-2.27A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg> },
            ]).map(btn => (
              <div key={btn.label} onClick={btn.onClick}
                style={{ flex:1, background:"#F0FDF4", borderRadius:14, padding:"13px 4px 11px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:7, border:"1px solid rgba(34,197,94,0.15)", transition:"transform 0.1s" }}
                onPointerDown={e=>(e.currentTarget.style.transform="scale(0.95)")}
                onPointerUp={e=>(e.currentTarget.style.transform="scale(1)")}
                onPointerLeave={e=>(e.currentTarget.style.transform="scale(1)")}>
                <div style={{ width:46, height:46, borderRadius:13, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 6px rgba(34,197,94,0.14)" }}>{btn.icon}</div>
                <span style={{ fontSize:11.5, fontWeight:600, color:"#374151" }}>{btn.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── INFO ROWS ── */}
        <div style={{ margin:"12px 16px 32px", background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 1px 8px rgba(0,0,0,0.04)", border:"1px solid rgba(34,197,94,0.07)" }}>
          {/* Row 1 — À propos */}
          <div {...rowProps(() => { setShowInfoAbout(true); })} style={{ ...rowProps(()=>{}).style, borderBottom:"1px solid #F3F4F6" }}>
            <div style={{ width:38, height:38, borderRadius:11, background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#22C55E"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none"/><circle cx="9" cy="10" r="1.2" fill="#fff"/><circle cx="15" cy="10" r="1.2" fill="#fff"/></svg>
            </div>
            <span style={{ flex:1, fontSize:14.5, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{bio}</span>
            <ChevronRight />
          </div>
          {/* Row 2 — Paramètres contact */}
          <div {...rowProps(() => { setShowInfoSettings(true); })}>
            <div style={{ width:38, height:38, borderRadius:11, background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#22C55E"><rect x="5" y="2" width="14" height="20" rx="3"/><rect x="9" y="4" width="6" height="1.5" rx="0.75" fill="#fff"/><circle cx="12" cy="18" r="1" fill="#fff"/></svg>
            </div>
            <span style={{ flex:1, fontSize:14.5, color:"#374151" }}>{activeUser.name}</span>
            <ChevronRight />
          </div>
        </div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
      </div>
    , document.body);
  }

  /* ══════════════════════════════════════════════════════════════
     CONTACT MANAGEMENT OVERLAYS
  ══════════════════════════════════════════════════════════════ */

  /* ── contact-options: feuille du bas ── */
  if (activeConv && activeUser && overlay === "contact-options") {
    const goInfo = () => setOverlay("info");
    const ci = contactInfo;
    const isMuted    = ci?.isMuted ?? false;
    const isPinned   = ci?.isPinned ?? false;
    const isFavorite = ci?.isFavorite ?? false;
    const isBlocked  = ci?.isBlocked ?? false;
    const friendStatus    = ci?.friendStatus;
    const friendDirection = ci?.friendDirection;

    const options = [
      {
        label: "Voir le profil",
        sub:   "Afficher le profil complet de ce contact",
        color: "var(--bp-primary)",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
        action: () => { navigate(`/profile/${activeConv}`); setOverlay("none"); },
      },
      {
        label: isMuted ? "Activer le son" : "Mettre en sourdine",
        sub:   isMuted ? "Recevoir à nouveau les notifications" : "Ne plus recevoir de notifications",
        color: "#F59E0B",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{isMuted ? <><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></> : <><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></>}</svg>,
        action: () => isMuted
          ? apiUnmuteContact(activeConv).then(() => { setContactInfo(p => p ? { ...p, isMuted: false, muteExpiresAt: null } : p); goInfo(); }).catch(() => {})
          : setOverlay("contact-mute"),
      },
      {
        label: isPinned ? "Désépingler" : "Épingler la conversation",
        sub:   isPinned ? "Retirer de vos conversations épinglées" : "Garder cette conversation en haut",
        color: "#3B82F6",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/></svg>,
        action: () => {
          (isPinned ? apiUnpinContact(activeConv) : apiPinContact(activeConv))
            .then(() => { setContactInfo(p => p ? { ...p, isPinned: !isPinned } : p); goInfo(); })
            .catch(() => {});
        },
      },
      {
        label: isFavorite ? "Retirer des favoris" : "Ajouter aux favoris",
        sub:   isFavorite ? "Ne plus voir dans vos favoris" : "Accéder rapidement à ce contact",
        color: "#EAB308",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill={isFavorite ? "#EAB308" : "none"} stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
        action: () => {
          (isFavorite ? apiUnfavoriteContact(activeConv) : apiFavoriteContact(activeConv))
            .then(() => { setContactInfo(p => p ? { ...p, isFavorite: !isFavorite } : p); goInfo(); })
            .catch(() => {});
        },
      },
      {
        label: "Rechercher dans la discussion",
        sub:   "Trouver des messages dans cette conversation",
        color: "var(--bp-primary)",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
        action: () => { setContactSearchQ(""); setContactSearchResults([]); setOverlay("contact-search"); },
      },
      ...(!friendStatus || friendStatus === "rejected" ? [{
        label: "Envoyer une demande d'ami",
        sub:   "Connectez-vous avec ce contact",
        color: "#8B5CF6",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
        action: () => setOverlay("contact-addfriend"),
      }] : friendStatus === "pending" && friendDirection === "sent" ? [{
        label: "Demande d'ami envoyée",
        sub:   "En attente de réponse",
        color: "#9CA3AF",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="20 6 9 17 4 12"/></svg>,
        action: () => {},
      }] : []),
      {
        label: "Ajouter à un groupe",
        sub:   "Inviter ce contact dans l'un de vos groupes",
        color: "#06B6D4",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
        action: () => { setAddGroupSearch(""); setAddGroupLoading(true); apiGetMyGroups().then(g => { setAddGroupList(g); setAddGroupLoading(false); }); setOverlay("contact-addgroup"); },
      },
      {
        label: "Partager le profil",
        sub:   "Envoyer le lien du profil à quelqu'un",
        color: "#10B981",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
        action: () => {
          const url = `${window.location.origin}${import.meta.env.BASE_URL}profile/${activeConv}`;
          if (navigator.share) {
            navigator.share({ title: activeUser.name, url }).catch(() => {});
          } else {
            navigator.clipboard.writeText(url).then(() => {
              import("sonner").then(({ toast }) => toast.success("Lien copié !"));
            }).catch(() => {});
          }
          goInfo();
        },
      },
      {
        label: isBlocked ? "Débloquer" : "Bloquer",
        sub:   isBlocked ? "Autoriser à nouveau ce contact" : "Empêcher ce contact de vous contacter",
        color: "#EF4444",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
        action: () => setOverlay("contact-block"),
      },
      {
        label: "Signaler",
        sub:   "Signaler un comportement inapproprié",
        color: "#F97316",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
        action: () => { setReportReason(""); setReportDesc(""); setOverlay("contact-report"); },
      },
      {
        label: "Supprimer la discussion",
        sub:   "Effacer tous les messages de cette conversation",
        color: "#DC2626",
        icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
        action: () => setOverlay("contact-delete"),
      },
    ];

    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"rgba(0,0,0,0.45)", display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
        onClick={goInfo}>
        <div style={{ background:"#fff", borderRadius:"19px 19px 0 0", maxHeight:"92vh", overflowY:"auto", paddingBottom:19 }}
          onClick={e => e.stopPropagation()}>
          <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 6px" }}>
            <div style={{ width:32, height:3, borderRadius:2, background:"#E5E7EB" }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"3px 16px 13px", borderBottom:"1px solid #F3F4F6" }}>
            {activeUser.avatarUrl
              ? <img src={activeUser.avatarUrl} alt={activeUser.name} style={{ width:35, height:35, borderRadius:"50%", objectFit:"cover", border:"1.5px solid var(--bp-primary)" }} />
              : <div style={{ width:35, height:35, borderRadius:"50%", background:activeUser.color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:"#fff", border:"1.5px solid var(--bp-primary)" }}>{activeUser.initials}</div>}
            <div>
              <div style={{ fontWeight:800, fontSize:13, color:"#111827" }}>{activeUser.name}</div>
              <div style={{ fontSize:10, color:presence.online ? "var(--bp-primary)" : "#9CA3AF", fontWeight:600 }}>{presence.online ? "En ligne" : presText}</div>
            </div>
          </div>
          {options.map((opt, i) => (
            <div key={i} onClick={opt.action}
              style={{ display:"flex", alignItems:"center", gap:11, padding:"11px 16px", cursor:"pointer", borderBottom: i < options.length - 1 ? "1px solid #F9FAFB" : "none" }}
              onPointerDown={e => (e.currentTarget.style.background = "#F9FAFB")}
              onPointerUp={e => (e.currentTarget.style.background = "transparent")}
              onPointerLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ width:32, height:32, borderRadius:10, background:`${opt.color}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {opt.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#111827" }}>{opt.label}</div>
                <div style={{ fontSize:10, color:"#9CA3AF", marginTop:1 }}>{opt.sub}</div>
              </div>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          ))}
        </div>
      </div>
    , document.body);
  }

  /* ── contact-mute: durée ── */
  if (activeConv && activeUser && overlay === "contact-mute") {
    const durations: { key: "8h" | "1w" | "always"; label: string; sub: string }[] = [
      { key:"8h",     label:"8 heures",  sub:"Les notifications reprennent dans 8 heures" },
      { key:"1w",     label:"1 semaine", sub:"Les notifications reprennent dans 7 jours" },
      { key:"always", label:"Toujours",  sub:"Jusqu'à ce que vous réactiviez manuellement" },
    ];
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"linear-gradient(160deg,#f0fdf4 0%,#fff 100%)", overflowY:"auto" }}>
        <div style={{ position:"sticky", top:0, zIndex:10, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderBottom:"1px solid rgba(34,197,94,0.12)", padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setOverlay("contact-options")} style={{ width:38, height:38, borderRadius:"50%", background:"#F0FDF4", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex:1, fontWeight:800, fontSize:17, color:"#111827" }}>Mettre en sourdine</div>
        </div>
        <div style={{ padding:"24px 16px 0" }}>
          <p style={{ fontSize:14, color:"#6B7280", marginBottom:20, lineHeight:1.6 }}>
            Choisissez la durée pendant laquelle les notifications de <strong>{activeUser.name}</strong> seront silencieuses.
          </p>
          <div style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.05)", border:"1px solid rgba(34,197,94,0.07)" }}>
            {durations.map((d, i) => (
              <div key={d.key} onClick={() => setMuteChoice(d.key)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderBottom: i < durations.length - 1 ? "1px solid #F0FDF4" : "none", cursor:"pointer", background: muteChoice === d.key ? "#F0FDF4" : "#fff" }}>
                <div style={{ width:38, height:38, borderRadius:12, background: muteChoice === d.key ? "var(--bp-primary)" : "#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={muteChoice === d.key ? "#fff" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6"/><path d="M17 9l6 6"/>
                  </svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>{d.label}</div>
                  <div style={{ fontSize:12.5, color:"#9CA3AF", marginTop:2 }}>{d.sub}</div>
                </div>
                {muteChoice === d.key && (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => apiMuteContact(activeConv, muteChoice).then(() => {
              setContactInfo(p => p ? { ...p, isMuted: true } : p);
              setOverlay("info");
            }).catch(() => {})}
            style={{ width:"100%", marginTop:24, padding:"15px", borderRadius:16, background:"var(--bp-primary)", border:"none", color:"#fff", fontWeight:800, fontSize:16, cursor:"pointer", boxShadow:"0 4px 16px rgba(34,197,94,0.30)" }}>
            Confirmer la mise en sourdine
          </button>
        </div>
      </div>
    , document.body);
  }

  /* ── contact-search: rechercher dans la discussion ── */
  if (activeConv && activeUser && overlay === "contact-search") {
    const runSearch = (q: string) => {
      if (!q.trim()) { setContactSearchResults([]); return; }
      setContactSearchLoading(true);
      apiSearchInConversation(activeConv, q)
        .then(r => setContactSearchResults(r))
        .finally(() => setContactSearchLoading(false));
    };
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"#fff", display:"flex", flexDirection:"column" }}>
        <div style={{ background:"#fff", padding:"8px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #E5E7EB", flexShrink:0 }}>
          <button onClick={() => setOverlay("contact-options")} style={{ background:"none", border:"none", cursor:"pointer", width:40, height:44, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <input
            autoFocus
            value={contactSearchQ}
            onChange={e => { setContactSearchQ(e.target.value); runSearch(e.target.value); }}
            placeholder="Rechercher dans la discussion..."
            style={{ flex:1, border:"none", outline:"none", fontSize:16, color:"#111827", background:"transparent", fontFamily:"inherit" }}
          />
          {contactSearchQ && (
            <button onClick={() => { setContactSearchQ(""); setContactSearchResults([]); }} style={{ background:"none", border:"none", cursor:"pointer", padding:6 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {contactSearchLoading && (
            <div style={{ padding:32, textAlign:"center", color:"#9CA3AF" }}>Recherche en cours…</div>
          )}
          {!contactSearchLoading && contactSearchQ.trim() && contactSearchResults.length === 0 && (
            <div style={{ padding:40, textAlign:"center" }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#D1D5DB" strokeWidth="1.5" style={{ margin:"0 auto 12px", display:"block" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <div style={{ color:"#9CA3AF", fontSize:15 }}>Aucun message trouvé</div>
            </div>
          )}
          {contactSearchResults.map(r => (
            <div key={r.id} style={{ padding:"14px 16px", borderBottom:"1px solid #F3F4F6" }}>
              <div style={{ fontSize:12, color: r.fromMe ? "var(--bp-primary)" : "#9CA3AF", fontWeight:600, marginBottom:4 }}>
                {r.fromMe ? "Vous" : activeUser.name}
              </div>
              <div style={{ fontSize:14.5, color:"#111827", lineHeight:1.5 }}
                dangerouslySetInnerHTML={{ __html: r.text.replace(new RegExp(`(${contactSearchQ.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"), "<mark style='background:#FEF9C3;border-radius:2px'>$1</mark>") }} />
              <div style={{ fontSize:11.5, color:"#9CA3AF", marginTop:4 }}>
                {new Date(r.createdAt).toLocaleDateString("fr-FR", { day:"numeric", month:"short", year:"numeric" })}
              </div>
            </div>
          ))}
          {!contactSearchQ.trim() && (
            <div style={{ padding:"60px 24px", textAlign:"center" }}>
              <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="#D1D5DB" strokeWidth="1.5" style={{ margin:"0 auto 16px", display:"block" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <div style={{ color:"#9CA3AF", fontSize:15 }}>Tapez pour rechercher dans vos messages avec <strong style={{ color:"#374151" }}>{activeUser.name}</strong></div>
            </div>
          )}
        </div>
      </div>
    , document.body);
  }

  /* ── contact-delete: confirmer suppression ── */
  if (activeConv && activeUser && overlay === "contact-delete") {
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
        <div style={{ background:"#fff", borderRadius:24, padding:"28px 24px 20px", maxWidth:380, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </div>
          <div style={{ fontWeight:800, fontSize:18, color:"#111827", textAlign:"center", marginBottom:10 }}>Supprimer la discussion</div>
          <div style={{ fontSize:14, color:"#6B7280", textAlign:"center", lineHeight:1.6, marginBottom:24 }}>
            Tous les messages échangés avec <strong>{activeUser.name}</strong> seront supprimés de votre côté. Cette action est irréversible.
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setOverlay("contact-options")}
              style={{ flex:1, padding:"13px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"#fff", fontWeight:700, fontSize:15, color:"#374151", cursor:"pointer" }}>
              Annuler
            </button>
            <button onClick={() => apiDeleteConversationContact(activeConv).then(() => { setActiveConv(null); setOverlay("none"); }).catch(() => {})}
              style={{ flex:1, padding:"13px", borderRadius:12, border:"none", background:"#DC2626", fontWeight:700, fontSize:15, color:"#fff", cursor:"pointer" }}>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── contact-block: bloquer / débloquer ── */
  if (activeConv && activeUser && overlay === "contact-block") {
    const isBlocked = contactInfo?.isBlocked ?? false;
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
        <div style={{ background:"#fff", borderRadius:24, padding:"28px 24px 20px", maxWidth:380, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div style={{ fontWeight:800, fontSize:18, color:"#111827", textAlign:"center", marginBottom:10 }}>
            {isBlocked ? `Débloquer ${activeUser.name}` : `Bloquer ${activeUser.name}`}
          </div>
          <div style={{ fontSize:14, color:"#6B7280", textAlign:"center", lineHeight:1.6, marginBottom:24 }}>
            {isBlocked
              ? `${activeUser.name} pourra à nouveau vous contacter et voir votre profil.`
              : `${activeUser.name} ne pourra plus vous envoyer de messages ni voir votre profil.`}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setOverlay("contact-options")}
              style={{ flex:1, padding:"13px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"#fff", fontWeight:700, fontSize:15, color:"#374151", cursor:"pointer" }}>
              Annuler
            </button>
            <button onClick={() => {
                (isBlocked ? apiUnblockUser(activeConv) : apiBlockUser(activeConv))
                  .then(() => { setContactInfo(p => p ? { ...p, isBlocked: !isBlocked } : p); setOverlay("info"); })
                  .catch(() => {});
              }}
              style={{ flex:1, padding:"13px", borderRadius:12, border:"none", background: isBlocked ? "var(--bp-primary)" : "#EF4444", fontWeight:700, fontSize:15, color:"#fff", cursor:"pointer" }}>
              {isBlocked ? "Débloquer" : "Bloquer"}
            </button>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── contact-report: signalement ── */
  if (activeConv && activeUser && overlay === "contact-report") {
    const reasons = ["Spam", "Fausse identité", "Contenu inapproprié", "Harcèlement", "Incitation à la haine", "Autre"];
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"linear-gradient(160deg,#f0fdf4 0%,#fff 100%)", overflowY:"auto" }}>
        <div style={{ position:"sticky", top:0, zIndex:10, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderBottom:"1px solid rgba(34,197,94,0.12)", padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => setOverlay("contact-options")} style={{ width:38, height:38, borderRadius:"50%", background:"#F0FDF4", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex:1, fontWeight:800, fontSize:17, color:"#111827" }}>Signaler</div>
        </div>
        <div style={{ padding:"20px 16px 32px" }}>
          <p style={{ fontSize:14, color:"#6B7280", marginBottom:20, lineHeight:1.6 }}>
            Choisissez la raison pour laquelle vous signalez <strong>{activeUser.name}</strong>.
          </p>
          <div style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.05)", border:"1px solid rgba(34,197,94,0.07)", marginBottom:16 }}>
            {reasons.map((r, i) => (
              <div key={r} onClick={() => setReportReason(r)}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"15px 18px", borderBottom: i < reasons.length - 1 ? "1px solid #F0FDF4" : "none", cursor:"pointer", background: reportReason === r ? "#F0FDF4" : "#fff" }}>
                <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${reportReason === r ? "var(--bp-primary)" : "#D1D5DB"}`, background: reportReason === r ? "var(--bp-primary)" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {reportReason === r && <div style={{ width:8, height:8, borderRadius:"50%", background:"#fff" }} />}
                </div>
                <span style={{ fontSize:15, color:"#111827", fontWeight: reportReason === r ? 700 : 500 }}>{r}</span>
              </div>
            ))}
          </div>
          <div style={{ background:"#fff", borderRadius:16, border:"1.5px solid #E5E7EB", marginBottom:20, overflow:"hidden" }}>
            <textarea
              value={reportDesc}
              onChange={e => setReportDesc(e.target.value)}
              placeholder="Description supplémentaire (optionnelle)…"
              rows={4}
              style={{ width:"100%", border:"none", outline:"none", padding:"14px 16px", fontSize:14.5, color:"#374151", fontFamily:"inherit", resize:"none", background:"transparent", boxSizing:"border-box" }}
            />
          </div>
          <button
            disabled={!reportReason || reportSending}
            onClick={() => {
              if (!reportReason) return;
              setReportSending(true);
              apiReportUser(activeConv, reportReason, reportDesc || undefined)
                .then(() => { import("sonner").then(({ toast }) => toast.success("Signalement envoyé")); setOverlay("info"); })
                .catch(() => {})
                .finally(() => setReportSending(false));
            }}
            style={{ width:"100%", padding:"15px", borderRadius:16, background: reportReason ? "var(--bp-primary)" : "#E5E7EB", border:"none", color: reportReason ? "#fff" : "#9CA3AF", fontWeight:800, fontSize:16, cursor: reportReason ? "pointer" : "default", boxShadow: reportReason ? "0 4px 16px rgba(34,197,94,0.30)" : "none", transition:"all 0.2s" }}>
            {reportSending ? "Envoi en cours…" : "Envoyer le signalement"}
          </button>
        </div>
      </div>
    , document.body);
  }

  /* ── contact-addfriend: demande d'ami ── */
  if (activeConv && activeUser && overlay === "contact-addfriend") {
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}>
        <div style={{ background:"#fff", borderRadius:24, padding:"28px 24px 20px", maxWidth:380, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", textAlign:"center" }}>
          {activeUser.avatarUrl
            ? <img src={activeUser.avatarUrl} alt={activeUser.name} style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover", border:"3px solid var(--bp-primary)", margin:"0 auto 16px", display:"block" }} />
            : <div style={{ width:72, height:72, borderRadius:"50%", background:activeUser.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, fontWeight:900, color:"#fff", border:"3px solid var(--bp-primary)", margin:"0 auto 16px" }}>{activeUser.initials}</div>}
          <div style={{ fontWeight:800, fontSize:18, color:"#111827", marginBottom:8 }}>Ajouter {activeUser.name}</div>
          <div style={{ fontSize:14, color:"#6B7280", lineHeight:1.6, marginBottom:24 }}>
            Envoyez une demande d'ami à <strong>{activeUser.name}</strong> pour vous connecter sur BrutePawa.
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setOverlay("contact-options")}
              style={{ flex:1, padding:"13px", borderRadius:12, border:"1.5px solid #E5E7EB", background:"#fff", fontWeight:700, fontSize:15, color:"#374151", cursor:"pointer" }}>
              Annuler
            </button>
            <button onClick={() => apiSendFriendRequest(activeConv)
                .then(() => { setContactInfo(p => p ? { ...p, friendStatus:"pending", friendDirection:"sent" } : p); import("sonner").then(({ toast }) => toast.success("Demande envoyée !")); setOverlay("info"); })
                .catch(() => {})}
              style={{ flex:1, padding:"13px", borderRadius:12, border:"none", background:"var(--bp-primary)", fontWeight:700, fontSize:15, color:"#fff", cursor:"pointer", boxShadow:"0 4px 16px rgba(34,197,94,0.25)" }}>
              Envoyer
            </button>
          </div>
        </div>
      </div>
    , document.body);
  }

  /* ── contact-addgroup: ajouter à un groupe ── */
  if (activeConv && activeUser && overlay === "contact-addgroup") {
    const filtered = addGroupList.filter(g => g.name.toLowerCase().includes(addGroupSearch.toLowerCase()));
    return createPortal(
      <div style={{ position:"fixed", inset:0, zIndex:10001, background:"linear-gradient(160deg,#f0fdf4 0%,#fff 100%)", display:"flex", flexDirection:"column" }}>
        <div style={{ position:"sticky", top:0, zIndex:10, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderBottom:"1px solid rgba(34,197,94,0.12)", padding:"12px 16px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <button onClick={() => setOverlay("contact-options")} style={{ width:38, height:38, borderRadius:"50%", background:"#F0FDF4", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex:1, fontWeight:800, fontSize:17, color:"#111827" }}>Ajouter à un groupe</div>
        </div>
        <div style={{ padding:"12px 16px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, background:"#F3F4F6", borderRadius:14, padding:"10px 14px" }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={addGroupSearch}
              onChange={e => setAddGroupSearch(e.target.value)}
              placeholder="Chercher un groupe…"
              style={{ flex:1, border:"none", outline:"none", background:"transparent", fontSize:14.5, color:"#111827", fontFamily:"inherit" }}
            />
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 16px 24px" }}>
          {addGroupLoading && <div style={{ padding:32, textAlign:"center", color:"#9CA3AF" }}>Chargement des groupes…</div>}
          {!addGroupLoading && filtered.length === 0 && (
            <div style={{ padding:40, textAlign:"center" }}>
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#D1D5DB" strokeWidth="1.5" style={{ margin:"0 auto 12px", display:"block" }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              <div style={{ color:"#9CA3AF", fontSize:15 }}>Aucun groupe disponible</div>
            </div>
          )}
          {filtered.map(g => {
            const col = ["var(--bp-primary)","#3B82F6","#8B5CF6","#F97316","#EC4899"][g.id % 5];
            return (
              <div key={g.id}
                onClick={() => apiAddContactToGroup(activeConv, g.id)
                  .then(() => { import("sonner").then(({ toast }) => toast.success(`${activeUser.name} ajouté au groupe`)); setOverlay("info"); })
                  .catch(() => {})}
                style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", background:"#fff", borderRadius:16, marginBottom:8, cursor:"pointer", boxShadow:"0 1px 6px rgba(0,0,0,0.05)", border:"1px solid rgba(34,197,94,0.07)" }}
                onPointerDown={e => (e.currentTarget.style.background = "#F0FDF4")}
                onPointerUp={e => (e.currentTarget.style.background = "#fff")}
                onPointerLeave={e => (e.currentTarget.style.background = "#fff")}>
                {g.avatarUrl
                  ? <img src={g.avatarUrl} alt={g.name} style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                  : <div style={{ width:44, height:44, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:17, color:"#fff", flexShrink:0 }}>{g.name[0].toUpperCase()}</div>}
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:"#111827" }}>{g.name}</div>
                  <div style={{ fontSize:12.5, color:"#9CA3AF" }}>Appuyez pour ajouter</div>
                </div>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            );
          })}
        </div>
      </div>
    , document.body);
  }

  /* ══════════════════════════════════════════════════════════════
     GROUP CHAT VIEW
  ══════════════════════════════════════════════════════════════ */
  let activeChatView = null;
  if (activeGroupId !== null) {
    const grp = chatGroups.find(g => g.id === activeGroupId);
    const gmsgs = groupMsgs[activeGroupId] ?? [];
    const grpInitial = (grp?.name ?? "G")[0].toUpperCase();
    const grpColor = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#0EA5E9","#F59E0B"][activeGroupId % 7];
    const isNewGroup = gmsgs.filter(m => m.type !== "system").length === 0;
    const showBanner = !dismissedAddBanner.has(activeGroupId);
    const showInfoCard = isNewGroup && !dismissedInfoPanel.has(activeGroupId);

    activeChatView = (
      <div style={{ position:"relative", flex: 1, display:"flex", flexDirection:"column", zIndex:10, overflow:"hidden",
        backgroundImage:`url(${import.meta.env.BASE_URL}wallpapers/bp-chat-bg.jpg)`,
        backgroundSize:"cover", backgroundRepeat:"no-repeat", backgroundPosition:"center" }}>
        <style>{`
          .bp-msg-mine   { background:#C8E6B2; color:#14532D; border-radius:16px 16px 4px 16px; box-shadow:0 1px 2px rgba(0,0,0,0.10); }
          .bp-msg-theirs { background:#fff;    color:#111; border-radius:4px 16px 16px 16px; box-shadow:0 1px 2px rgba(0,0,0,0.08); }
          textarea:focus { outline:none !important; box-shadow:none !important; border:none !important; }
          textarea { -webkit-appearance:none; scrollbar-width:none; }
          textarea::-webkit-scrollbar { display:none; }
          @keyframes grp-slide-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {/* ══ HEADER — Telegram exact ══ */}
        {showGrpSearch ? (
          /* ── SEARCH MODE header ── */
          <div style={{ background:"#fff", padding:"6px 8px", display:"flex", alignItems:"center", gap:8, flexShrink:0, boxShadow:"0 1px 4px rgba(0,0,0,0.10)" }}>
            <button onClick={() => { setShowGrpSearch(false); setGrpSearchQ(""); setGrpSearchIdx(0); }}
              style={{ background:"none", border:"none", cursor:"pointer", width:36, height:44, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <input autoFocus value={grpSearchQ} onChange={e => { setGrpSearchQ(e.target.value); setGrpSearchIdx(0); }}
              placeholder="Rechercher..."
              style={{ flex:1, border:"none", outline:"none", fontSize:16, color:"#000", background:"transparent", fontFamily:"inherit" }} />
            {(() => {
              const matches = grpSearchQ.trim() ? gmsgs.filter(m => m.type !== "system" && m.text.toLowerCase().includes(grpSearchQ.toLowerCase())) : [];
              return matches.length > 0 ? (
                <span style={{ fontSize:13, color:"#9CA3AF", whiteSpace:"nowrap", flexShrink:0 }}>
                  {grpSearchIdx + 1} sur {matches.length}
                </span>
              ) : grpSearchQ.trim() ? (
                <span style={{ fontSize:13, color:"#9CA3AF", flexShrink:0 }}>0 résultat</span>
              ) : null;
            })()}
            {grpSearchQ.trim() && (() => {
              const matches = gmsgs.filter(m => m.type !== "system" && m.text.toLowerCase().includes(grpSearchQ.toLowerCase()));
              return (
                <div style={{ display:"flex", gap:2, flexShrink:0 }}>
                  <button onClick={() => setGrpSearchIdx(i => Math.max(0, i - 1))} disabled={grpSearchIdx === 0}
                    style={{ background:"none", border:"none", cursor:"pointer", padding:4, opacity: grpSearchIdx === 0 ? 0.3 : 1 }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button onClick={() => setGrpSearchIdx(i => Math.min(matches.length - 1, i + 1))} disabled={grpSearchIdx >= matches.length - 1}
                    style={{ background:"none", border:"none", cursor:"pointer", padding:4, opacity: grpSearchIdx >= matches.length - 1 ? 0.3 : 1 }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
              );
            })()}
          </div>
        ) : (
          /* ── NORMAL header — Telegram compact ── */
          <div style={{ background:"#fff", padding:"5px 4px 5px 2px", display:"flex", alignItems:"center", gap:6, flexShrink:0, borderBottom:"1px solid #E5E7EB", boxShadow:"0 1px 3px rgba(0,0,0,0.04)", position:"relative" }}>
            <button onClick={() => { setActiveGroupId(null); setShowGroupInfo(false); setShowGrpMenu(false); }}
              style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 2px 8px 6px", display:"flex", alignItems:"center", flexShrink:0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#111827" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div onClick={() => setShowGroupInfo(true)}
              style={{ width:38, height:38, borderRadius:"50%", background:grpColor, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", flexShrink:0 }}>
              {grp?.avatarUrl
                ? <img src={grp.avatarUrl} style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover" }} alt={grp.name} />
                : grpInitial}
            </div>
            <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => setShowGroupInfo(true)}>
              <div style={{ fontWeight:700, fontSize:15.5, color:"#111827", lineHeight:1.25, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{grp?.name ?? "Groupe"}</div>
              <div style={{ fontSize:11.5, color:"#64748B" }}>
                {groupActivity?.membersCount ?? grp?.membersCount ?? 0} membre{(groupActivity?.membersCount ?? grp?.membersCount ?? 0) !== 1 ? "s" : ""}
                {groupActivity ? ` · ${groupActivity.onlineCount} en ligne` : " · Statut en ligne indisponible"}
              </div>
              {groupActivity && groupActivity.typing.length > 0 && <div aria-live="polite"
                title={groupActivity.typing.map(member => `${member.name} écrit`).join(", ")}
                style={{ fontSize:12, color:"var(--bp-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {groupActivity.typing.map(member => `${member.name} écrit`).join(", ")}…
              </div>}
            </div>
            <button onClick={() => setShowGrpMenu(m => !m)}
              style={{ background:"none", border:"none", width:40, height:40, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748B" strokeWidth="2.1" strokeLinecap="round"><circle cx="12" cy="5" r="1.2" fill="#64748B"/><circle cx="12" cy="12" r="1.2" fill="#64748B"/><circle cx="12" cy="19" r="1.2" fill="#64748B"/></svg>
            </button>

            {/* ── POPUP MENU ── */}
            {showGrpMenu && (
              <>
                <div style={{ position:"fixed", inset:0, zIndex:10050 }} onClick={() => setShowGrpMenu(false)} />
                <div style={{ position:"absolute", top:48, right:6, background:"#fff", borderRadius:16, boxShadow:"0 3px 16px rgba(0,0,0,0.16)", zIndex:10051, minWidth:192, overflow:"hidden", animation:"grp-slide-in 0.12s ease", transformOrigin:"top right" }}
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowGrpMenu(false)}
                    style={{ display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none", padding:"10px 16px", fontSize:14.5, color:"#111", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Mettre en sourdine
                  </button>
                  <div style={{ height:1, background:"#F8FAFC" }} />
                  <button onClick={() => { setShowGrpMenu(false); setShowGrpSearch(true); setGrpSearchQ(""); setGrpSearchIdx(0); }}
                    style={{ display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none", padding:"10px 16px", fontSize:14.5, color:"#111", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Rechercher
                  </button>
                  <div style={{ height:1, background:"#F8FAFC" }} />
                  <button onClick={() => { setShowGrpMenu(false); setShowClearHist(true); }}
                    style={{ display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none", padding:"10px 16px", fontSize:14.5, color:"#111", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    Effacer l'historique
                  </button>
                  <div style={{ height:1, background:"#F8FAFC" }} />
                  <button onClick={() => { setShowGrpMenu(false); setShowLeaveGrp(true); setLeaveDeleteAll(false); }}
                    style={{ display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none", padding:"10px 16px", fontSize:14.5, color:"#EF4444", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Quitter le groupe
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ ADD MEMBERS BANNER ══ */}
        {showBanner && (
          <div style={{ padding:"8px 12px 0", flexShrink:0, animation:"grp-slide-in 0.15s ease" }}>
            <div style={{ background:"#fff", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.14)", position:"relative" }}>
              <button onClick={() => setShowGroupInfo(true)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--bp-primary)", fontWeight:700, fontSize:15, padding:0, flex:1, textAlign:"center" }}>
                Add Members
              </button>
              <button onClick={() => setDismissedAddBanner(s => { const n = new Set(s); n.add(activeGroupId); return n; })}
                style={{ position:"absolute", right:14, background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", fontSize:18, lineHeight:1, padding:0 }}>✕</button>
            </div>
          </div>
        )}

        {/* ══ MESSAGES AREA ══ */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 10px 6px", display:"flex", flexDirection:"column", gap:2 }}>

          {/* Date pill */}
          <div style={{ alignSelf:"center", background:"rgba(0,0,0,0.32)", borderRadius:20, padding:"4px 14px", marginBottom:6 }}>
            <span style={{ fontSize:12, color:"#fff", fontWeight:500 }}>Aujourd'hui</span>
          </div>

          {(() => {
            const grpMatches = showGrpSearch && grpSearchQ.trim()
              ? gmsgs.filter(m => m.type !== "system" && m.text.toLowerCase().includes(grpSearchQ.toLowerCase()))
              : [];
            const grpHighlightId = grpMatches[grpSearchIdx]?.id ?? null;
            return gmsgs.map((msg, i) => {
              const isFirst = i === 0 || gmsgs[i - 1]?.mine !== msg.mine;
              const isMatch = showGrpSearch && grpSearchQ.trim() && msg.type !== "system" && msg.text.toLowerCase().includes(grpSearchQ.toLowerCase());
              const isCurrent = msg.id === grpHighlightId;
              if (msg.type === "system") {
                return (
                  <div key={msg.id} style={{ alignSelf:"center", background:"rgba(0,0,0,0.32)", borderRadius:20, padding:"4px 14px", margin:"4px auto" }}>
                    <span style={{ fontSize:12, color:"#fff", fontWeight:500 }}>{msg.text}</span>
                  </div>
                );
              }
              return (
                <div key={msg.id} id={`grp-msg-${msg.id}`}
                  style={{ display:"flex", justifyContent:msg.mine?"flex-end":"flex-start", alignItems:"flex-end", gap:6, marginTop:isFirst?6:1,
                    ...(isCurrent ? { scrollMarginTop: 60 } : {}) }}>
                  {!msg.mine && (
                    <div style={{ width:28, flexShrink:0, alignSelf:"flex-end", paddingBottom:2 }}>
                      {isFirst && <div style={{ width:26, height:26, borderRadius:"50%", background:CONV_COLORS[Math.abs(msg.text.length+i)%CONV_COLORS.length], display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:10, fontWeight:700 }}>{mkInitials(msg.senderName)}</div>}
                    </div>
                  )}
                  <div style={{ maxWidth:"72%", display:"flex", flexDirection:"column" }}>
                    {!msg.mine && isFirst && <div style={{ fontSize:11, color:"var(--bp-primary)", fontWeight:700, marginBottom:2, paddingLeft:2 }}>{msg.senderName}</div>}
                    <div className={msg.mine?"bp-msg-mine":"bp-msg-theirs"}
                      style={{ padding:"8px 12px 6px", fontSize:14.5, lineHeight:1.45, wordBreak:"break-word",
                        ...(isCurrent ? { outline:"2.5px solid var(--bp-primary)", outlineOffset:"1px" } : isMatch ? { opacity:0.65 } : {}) }}>
                      {msg.text}
                      <div style={{ fontSize:10, marginTop:2, color:"#888", textAlign:"right" }}>{msg.time}{msg.mine && <span style={{ marginLeft:3, color:"var(--bp-primary)" }}>✓✓</span>}</div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}

          {/* ── Info panel for new groups ── */}
          {showInfoCard && (
            <div style={{ alignSelf:"center", maxWidth:"85%", width:"fit-content", background:"rgba(70,110,70,0.65)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderRadius:24, padding:"20px 24px", margin:"12px auto", animation:"grp-slide-in 0.2s ease", boxShadow:"0 6px 20px rgba(0,0,0,0.15)", border:"none" }}
              onClick={() => setDismissedInfoPanel(s => { const n = new Set(s); n.add(activeGroupId); return n; })}>
              <div style={{ fontWeight:700, fontSize:15, color:"#fff", marginBottom:5 }}>Vous avez créé un groupe</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", marginBottom:10 }}>Les groupes peuvent avoir :</div>
              {["Jusqu'à 200 000 membres","Historique permanent","Appels de groupe","Plusieurs administrateurs","Liens d'invitation"].map(f => (
                <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize:13.5, color:"#fff" }}>{f}</span>
                </div>
              ))}
            </div>
          )}

          <div ref={groupBottomRef} />
        </div>

        {/* ── PARAMÈTRES sticky row (admin shortcut) ── */}
        {(() => {
          // Prefer the role from the group list (loaded upfront) to avoid depending on the
          // async groupInfo fetch. Fall back to groupInfo only if the list entry is missing.
          const grpEntry = chatGroups.find(g => g.id === activeGroupId);
          const myRole = grpEntry?.role ?? (groupInfo?.members ?? []).find(m => m.userId === meId)?.role;
          if (myRole !== "owner" && myRole !== "admin") return null;
          return (
            <div style={{ flexShrink:0, background:"rgba(255,255,255,0.96)", borderTop:"1px solid rgba(0,0,0,0.06)", display:"flex", alignItems:"center", justifyContent:"center", padding:"6px 16px", gap:10 }}>
              <button onClick={() => { const grp = chatGroups.find(g=>g.id===activeGroupId); setGrpEditName(grp?.name??""); setGrpEditDesc(""); setShowGrpEdit(true); }}
                style={{ background:"none", border:"none", cursor:"pointer", fontSize:13.5, fontWeight:700, color:"var(--bp-primary)", letterSpacing:1.2, padding:"4px 16px" }}>
                PARAMÈTRES
              </button>
              <div style={{ width:1, height:16, background:"rgba(0,0,0,0.12)" }} />
              <button onClick={() => setShowGrpStats(true)} style={{ background:"none", cursor:"pointer", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", border:"1.5px solid var(--bp-primary)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--bp-primary)" }}><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>
              </button>
            </div>
          );
        })()}

        {/* ══ INPUT BAR — Telegram pill ══ */}
        <div style={{ flexShrink:0, padding:"6px 10px 10px", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", background:"#fff", borderRadius:9999, padding:"0 6px 0 14px", minHeight:50, boxShadow:"0 1px 4px rgba(0,0,0,0.12)" }}>
            {/* Emoji */}
            <button style={{ background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0, display:"flex", alignItems:"center", marginRight:4 }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1.2" fill="#9CA3AF"/><circle cx="15" cy="9" r="1.2" fill="#9CA3AF"/></svg>
            </button>
            {/* Text */}
            <textarea ref={grpInputRef} value={groupNewMsg}
              rows={1}
              onChange={e => { setGroupNewMsg(e.target.value); autoResize(e.target); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendGroupMsg(); } }}
              placeholder="Écrire un message..."
              style={{ flex:1, background:"transparent", border:"none", outline:"none", resize:"none", padding:"0 6px", fontSize:15, color:"#000", minWidth:0, lineHeight:"22px", height:"22px", maxHeight:"130px", overflowY:"hidden", transition:"height 0.15s ease", display:"block", alignSelf:"center", fontFamily:"inherit", WebkitAppearance:"none" as React.CSSProperties["WebkitAppearance"] }} />
            {/* Attachment */}
            {!groupNewMsg.trim() && (
              <button style={{ background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0, display:"flex", alignItems:"center", marginRight:6 }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
            )}
          </div>
          {/* Mic / Send */}
          {groupNewMsg.trim() ? (
            <button onClick={sendGroupMsg}
              style={{ background:"var(--bp-primary)", border:"none", borderRadius:"50%", width:50, height:50, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(34,197,94,0.45)", cursor:"pointer" }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          ) : (
            <button style={{ background:"var(--bp-primary)", border:"none", borderRadius:"50%", width:50, height:50, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(34,197,94,0.45)" }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            </button>
          )}
        </div>

        {/* ── DIALOG: EFFACER L'HISTORIQUE ── */}
        {showClearHist && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)", zIndex:10060, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}
            onClick={() => setShowClearHist(false)}>
            <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:320, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.28)" }}
              onClick={e => e.stopPropagation()}>
              {/* Avatar + title row */}
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"18px 20px 14px" }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:grpColor, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:17, flexShrink:0 }}>{grpInitial}</div>
                <span style={{ fontWeight:700, fontSize:16, color:"#111" }}>Effacer l'historique</span>
              </div>
              <div style={{ padding:"0 20px 18px", fontSize:14, color:"#444", lineHeight:1.5 }}>
                Êtes-vous sûr de vouloir effacer l'historique des messages dans ce groupe ?
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:8, padding:"0 12px 14px" }}>
                <button onClick={() => setShowClearHist(false)}
                  style={{ background:"none", border:"none", padding:"10px 16px", fontSize:14, fontWeight:700, color:"var(--bp-primary)", cursor:"pointer", borderRadius:8, letterSpacing:0.3 }}>
                  ANNULER
                </button>
                <button onClick={() => { setGroupMsgs(prev => ({ ...prev, [activeGroupId]: [] })); setShowClearHist(false); }}
                  style={{ background:"none", border:"none", padding:"10px 16px", fontSize:14, fontWeight:700, color:"var(--bp-primary)", cursor:"pointer", borderRadius:8, letterSpacing:0.3 }}>
                  EFFACER
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DIALOG: QUITTER LE GROUPE ── */}
        {showLeaveGrp && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)", zIndex:10060, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}
            onClick={() => setShowLeaveGrp(false)}>
            <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:320, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.28)" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"18px 20px 14px" }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:grpColor, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:17, flexShrink:0 }}>{grpInitial}</div>
                <span style={{ fontWeight:700, fontSize:16, color:"#111" }}>Quitter le groupe</span>
              </div>
              <div style={{ padding:"0 20px 10px", fontSize:14, color:"#444", lineHeight:1.5 }}>
                Êtes-vous sûr de vouloir quitter ce groupe ?
              </div>
              {/* Checkbox: supprimer pour tous */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 20px 16px", cursor:"pointer" }}
                onClick={() => setLeaveDeleteAll(v => !v)}>
                <div style={{ width:20, height:20, borderRadius:4, border:`2px solid ${leaveDeleteAll ? "var(--bp-primary)" : "#CCC"}`, background: leaveDeleteAll ? "var(--bp-primary)" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                  {leaveDeleteAll && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize:14, color:"#333" }}>Supprimer le groupe pour tous les membres</span>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:8, padding:"0 12px 14px" }}>
                <button onClick={() => setShowLeaveGrp(false)}
                  style={{ background:"none", border:"none", padding:"10px 16px", fontSize:14, fontWeight:700, color:"var(--bp-primary)", cursor:"pointer", borderRadius:8, letterSpacing:0.3 }}>
                  ANNULER
                </button>
                <button onClick={() => { setActiveGroupId(null); setShowGroupInfo(false); setShowLeaveGrp(false); }}
                  style={{ background:"none", border:"none", padding:"10px 16px", fontSize:14, fontWeight:700, color:"#EF4444", cursor:"pointer", borderRadius:8, letterSpacing:0.3 }}>
                  SUPPRIMER
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  } else if (activeConv && activeUser) {
    const searchMatches = chatSearchQ.trim()
      ? currentMessages.filter(m => m.text.toLowerCase().includes(chatSearchQ.toLowerCase()))
      : [];
    const highlightId = searchMatches[chatSearchIdx]?.id ?? null;

    activeChatView = (
      <div style={{ position:"relative", flex: 1, display:"flex", flexDirection:"column", zIndex:10, overflow:"hidden",
        backgroundImage: `url(${import.meta.env.BASE_URL}chat-wallpaper.png)`, backgroundSize: "cover", backgroundPosition: "center" }}>
        <style>{`
          .fbl-msg-mine   { background:#DCFCE7; color:#14532D; border-radius:18px 18px 4px 18px; box-shadow:0 1px 2px rgba(0,0,0,0.05); padding:8px 12px; }
          .fbl-msg-theirs { background:#fff; color:#111; border-radius:4px 18px 18px 18px; box-shadow:0 1px 2px rgba(0,0,0,0.05); padding:8px 12px; }
          textarea:focus  { outline:none !important; box-shadow:none !important; border:none !important; }
          textarea        { -webkit-appearance:none; scrollbar-width:none; }
          textarea::-webkit-scrollbar { display:none; }
          .fbl-menu-btn { display:flex; align-items:center; gap:12px; padding:10px 16px; background:none; border:none; width:100%; font-size:14.5px; color:#111; cursor:pointer; text-align:left; font-family:inherit; }
          .fbl-menu-btn:active { background:#F1F5F9; }
          .fbl-react-btn:active { transform:scale(1.35); }
          @keyframes fbl-sheet-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
          @keyframes fbl-fade-in  { from{opacity:0} to{opacity:1} }
          @keyframes fbl-picker-in { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
          @keyframes fbl-picker-out { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(18px)} }
          @keyframes fbl-rec-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
          @keyframes fbl-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
          @keyframes wa-typing-dot { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
          @keyframes bp-send-in { from{transform:scale(0.55) rotate(-20deg);opacity:0} to{transform:scale(1) rotate(0deg);opacity:1} }
          @keyframes bp-mic-pulse { 0%,100%{box-shadow:0 4px 20px rgba(34,197,94,0.55)} 50%{box-shadow:0 4px 28px rgba(34,197,94,0.80),0 0 0 8px rgba(34,197,94,0.12)} }
          @keyframes fbl-loc-ripple { 0%{transform:scale(0.6);opacity:0.8} 100%{transform:scale(2.2);opacity:0} }
          @keyframes fbl-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes fbl-upload-card { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
          @keyframes fbl-upload-dot { 0%,100%{opacity:0.25;transform:scale(0.7)} 50%{opacity:1;transform:scale(1.2)} }
          @keyframes fbl-pending-spin { from{stroke-dashoffset:32} to{stroke-dashoffset:0} }
          .wa-typing-dot { width:7px; height:7px; border-radius:50%; background:#999; display:inline-block; animation:wa-typing-dot 1.2s infinite; }
          .wa-typing-dot:nth-child(2) { animation-delay:0.2s; }
          .wa-typing-dot:nth-child(3) { animation-delay:0.4s; }
          .tg-attach-btn { display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; background:none; border:none; padding:4px 6px; flex-shrink:0; }
          .tg-attach-btn span { font-size:13px; font-weight:500; color:#1E293B; text-align:center; white-space:nowrap; }
          .tg-attach-box { width:62px; height:62px; border-radius:18px; background:#F1F5F9; display:flex; align-items:center; justify-content:center; }
        `}</style>

        {/* ── HEADER ── */}
        {selectionMode ? (
          /* ── TELEGRAM-STYLE SELECTION HEADER ── */
          <div style={{ background:"#fff", height:52, display:"flex", alignItems:"center", padding:"0 4px", flexShrink:0, borderBottom:"1px solid rgba(0,0,0,0.08)" }}>
            {/* ✕ close */}
            <button onClick={() => { setSelectionMode(false); setSelectedMsgs(new Set()); setLongPressMsg(null); }}
              style={{ background:"none", border:"none", cursor:"pointer", width:46, height:46, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {/* Count */}
            <span style={{ flex:1, fontSize:17, fontWeight:600, color:"#111827" }}>{selectedMsgs.size}</span>
            {/* Copy */}
            <button onClick={() => { copySelected(); }}
              style={{ background:"none", border:"none", cursor:"pointer", width:46, height:46, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            {/* Forward */}
            <button onClick={() => { setSelectionMode(false); setSelectedMsgs(new Set()); setLongPressMsg(null); }}
              style={{ background:"none", border:"none", cursor:"pointer", width:46, height:46, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg>
            </button>
            {/* Delete */}
            <button onClick={() => { confirmDelete(); setLongPressMsg(null); }}
              style={{ background:"none", border:"none", cursor:"pointer", width:46, height:46, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        ) : showChatSearch ? (
          /* SEARCH HEADER */
          <div style={{ background:"#052e16", padding:"8px 10px", display:"flex", alignItems:"center", gap:8, flexShrink:0, boxShadow:"0 2px 4px rgba(0,0,0,0.18)" }}>
            <button onClick={() => { setShowChatSearch(false); setChatSearchQ(""); setChatSearchIdx(0); }}
              style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#fff", padding:"2px 4px 2px 0", display:"flex", alignItems:"center", lineHeight:1 }}>‹</button>
            <div style={{ fontWeight:700, fontSize:15, color:"#fff", flex:1 }}>Rechercher</div>
            {searchMatches.length > 0 && (
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.85)", flexShrink:0 }}>
                {chatSearchIdx + 1} sur {searchMatches.length}
              </div>
            )}
            <button style={{ background:"rgba(255,255,255,0.2)", border:"none", borderRadius:14, padding:"4px 10px", color:"#fff", fontSize:12, cursor:"pointer", fontWeight:600, flexShrink:0 }}>
              Afficher en liste
            </button>
            <div style={{ display:"flex" }}>
              <button onClick={() => setChatSearchIdx(i => Math.max(0, i - 1))}
                style={{ background:"none", border:"none", color:"#fff", fontSize:16, cursor:"pointer", padding:"4px 6px", opacity: searchMatches.length === 0 ? 0.4 : 1 }}>▲</button>
              <button onClick={() => setChatSearchIdx(i => Math.min(searchMatches.length - 1, i + 1))}
                style={{ background:"none", border:"none", color:"#fff", fontSize:16, cursor:"pointer", padding:"4px 6px", opacity: searchMatches.length === 0 ? 0.4 : 1 }}>▼</button>
            </div>
          </div>
        ) : (
          /* NORMAL HEADER */
          <div style={{ zIndex: 10, position: "relative" }}>
            {/* Floating Profile Card */}
            <div style={{ padding: "0 16px" }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              borderRadius: 24, padding: 12, display: 'flex', alignItems: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              marginTop: 12
            }}>
              <button onClick={() => { setActiveConv(null); setOverlay("none"); setShowConvMenu(false); }}
                style={{ background:"none", border:"none", paddingRight: 4, cursor:"pointer", display: "flex", alignItems: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              {/* avatar */}
              <div style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: activeUser.color || '#22C55E', flexShrink: 0 }}>
                {activeUser.avatarUrl
                  ? <img src={activeUser.avatarUrl} alt="" style={{ width:"100%", height:"100%", objectFit: "cover" }} />
                  : <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{activeUser.initials}</span>
                }
              </div>
              {/* Details */}
              <div style={{ flex: 1, marginLeft: 10, cursor:"pointer" }} onClick={() => setOverlay("info")}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeUser.name}</span>
                  {(activeUser.badgeType || activeUser.verified) && (
                    <span style={{ marginLeft: 4 }}>
                      <UserBadge type={activeUser.badgeType ?? "verified"} size={14} />
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 500 }}>{presenceLabel(presence.online, presence.lastSeenAt)}</div>
                <div style={{ fontSize: 10, color: '#666', fontWeight: 500 }}>Toujours plus loin 🚀</div>
                <div style={{ display: 'flex', marginTop: 4, gap: 4 }}>
                  {activeUser.badgeType === "premium" && (
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#22C55E', padding: '2px 6px', borderRadius: 8 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span style={{ fontSize: 9, color: '#fff', marginLeft: 2, fontWeight: 700 }}>Premium</span>
                    </div>
                  )}
                  {(activeUser.badgeType === "creator" || activeUser.role === "creator") && (
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: 8 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="#555"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span style={{ fontSize: 9, color: '#555', marginLeft: 2, fontWeight: 700 }}>Créateur</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: "relative" }}>
                <button onClick={() => sig.startCall(activeConv, "audio")} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </button>
                <button onClick={() => sig.startCall(activeConv, "video")} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </button>
                <button onClick={() => setShowConvMenu(!showConvMenu)} style={{ padding: '0 2px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#555"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                </button>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* SEARCH INPUT BAR */}
        {showChatSearch && (
          <div style={{ background:"#fff", padding:"6px 12px", borderBottom:"1px solid #E5E7EB", flexShrink:0 }}>
            <input value={chatSearchQ} onChange={e => { setChatSearchQ(e.target.value); setChatSearchIdx(0); }}
              placeholder="Rechercher dans la conversation…"
              autoFocus
              style={{ width:"100%", background:"#F1F5F9", border:"none", borderRadius:20, padding:"8px 14px", fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>
        )}

        {/* ── MESSAGES AREA ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"8px 10px 4px", display:"flex", flexDirection:"column", gap:2, position: "relative" }}>

          <img src="/chat-wallpaper.png" alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", zIndex:-1 }} />

          {/* ── Watermark Texts ── */}
          <div style={{ position: 'absolute', top: 120, left: 24, zIndex: 0, width: 160, pointerEvents: 'none' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#062417', letterSpacing: -0.5 }}>BrutePawa</div>
            <div style={{ fontSize: 14, color: '#1C7A42', marginTop: 4, lineHeight: "18px", fontWeight: 600 }}>Des connexions<br/>qui comptent</div>
            <div style={{ width: 24, height: 3, backgroundColor: '#22C55E', marginTop: 12, borderRadius: 2 }} />
            <div style={{ fontSize: 13, color: '#1C7A42', fontStyle: 'italic', marginTop: 40, lineHeight: "18px", fontWeight: 500 }}>
              "Des idées<br/>d'aujourd'hui,<br/>un meilleur<br/>demain."
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Load older messages button */}
          {activeConv && hasMoreMessages[activeConv] && (
            <button onClick={loadOlderMessages}
              style={{ alignSelf:"center", margin:"4px auto 8px", background:"rgba(0,0,0,0.06)", border:"none", borderRadius:20, padding:"5px 16px", fontSize:12, fontWeight:600, color:"#444", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#444" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12l7-7 7 7"/></svg>
              Messages précédents
            </button>
          )}

          {/* Empty state: wallpaper only — no placeholder text */}

          {currentMessages.map((msg, i) => {
            const isLast     = i === currentMessages.length - 1 || currentMessages[i + 1]?.mine !== msg.mine;
            const isHL       = showChatSearch && chatSearchQ.trim() && msg.text.toLowerCase().includes(chatSearchQ.toLowerCase());
            const isAct      = msg.id === highlightId;
            const isSelected = selectionMode && selectedMsgs.has(msg.id);
            const isAudio    = msg.attachment?.type === "audio";
            const legacyContactName = msg.text.match(/^👤\s*Contact\s*:\s*(.+)$/i)?.[1]?.trim();
            const legacyContact = legacyContactName
              ? allUsers.find(user => `${user.firstName} ${user.lastName}`.trim().toLocaleLowerCase() === legacyContactName.toLocaleLowerCase())
              : undefined;
            const isVoicePlaying = isAudio && playingAudioId === msg.id;
            const wfBars     = isAudio ? voiceWaveform(msg.id) : [];
            const playedBars = isVoicePlaying ? Math.floor(wfBars.length * audioProgress) : 0;
            const vUps       = isAudio ? mediaUploads.get(msg.id) : undefined;
            const prevMsg    = i > 0 ? currentMessages[i - 1] : null;
            const showDateSep = !prevMsg || (msg.date && prevMsg.date !== msg.date);
            const dateLabel  = showDateSep && msg.date ? fmtDateLabel(msg.date) : null;
            return (
              <Fragment key={msg.id}>
              {dateLabel && <div style={{ textAlign:"center", fontSize:11.5, color:"#111", background:"#fff", borderRadius:16, padding:"4px 12px", margin:"12px auto 8px", display:"inline-block", alignSelf:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.06)", fontWeight:700 }}>{dateLabel}</div>}
              <div
                style={{ display:"flex", justifyContent: msg.mine ? "flex-end" : "flex-start", alignItems:"flex-end", gap:6, marginTop:2,
                  background: isSelected ? "rgba(34,197,94,0.12)" : isAct ? "rgba(24,119,242,0.15)" : isHL ? "rgba(255,235,59,0.25)" : "transparent",
                  transition:"background 0.15s", paddingLeft: selectionMode ? 46 : 0, paddingRight: selectionMode ? 6 : 0, position:"relative",
                  cursor: selectionMode ? "pointer" : "default" }}
                onClick={() => { if (selectionMode) toggleSelect(msg.id); }}
                onPointerDown={() => { if (!selectionMode) startLongPress(msg.id); }}
                onPointerUp={cancelLongPress} onPointerLeave={cancelLongPress}
                onContextMenu={e => { e.preventDefault(); cancelLongPress(); setSelectionMode(true); setSelectedMsgs(new Set([msg.id])); setLongPressMsg(msg.id); }}>
                {/* Telegram-style selection circle — gray thin, green+check when selected */}
                {selectionMode && (
                  <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
                    width:22, height:22, borderRadius:"50%",
                    background: isSelected ? "var(--bp-primary)" : "transparent",
                    border: `1.5px solid ${isSelected ? "var(--bp-primary)" : "#94A3B8"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all 0.15s", flexShrink:0, zIndex:2 }}>
                    {isSelected && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                )}
                {!msg.mine && (
                  <div style={{ width:28, flexShrink:0, alignSelf:"flex-end", paddingBottom:2 }}>
                    {isLast && <div className="avatar xs" style={{ background:activeUser.color, width:26, height:26, fontSize:10 }}>{activeUser.initials}</div>}
                  </div>
                )}
                <div
                  data-msgid={msg.id}
                  style={{ maxWidth:"78%", position:"relative",
                    overflow: dustingMsgs.has(msg.id) ? "visible" : "hidden",
                    pointerEvents: dustingMsgs.has(msg.id) ? "none" : undefined }}>
                  {/* ── GREEN-PARTICLE DELETE — canvas extends beyond bubble ── */}
                  {dustingMsgs.has(msg.id) && (() => {
                    const dr = dustingMsgs.get(msg.id)!;
                    return (
                      <DustEffect
                        key={`dust-${msg.id}`}
                        rect={dr}
                        mine={msg.mine}
                        onComplete={() => {
                          setMessages(prev => ({ ...prev, [activeConv!]: (prev[activeConv!] ?? []).filter(m => m.id !== msg.id) }));
                          setDustingMsgs(prev => { const next = new Map(prev); next.delete(msg.id); return next; });
                        }}
                      />
                    );
                  })()}
                  {msg.attachment && (
                    msg.attachment.type === "poll" ? (
                      <PollMessageCard
                        pollId={Number(msg.attachment.label)}
                        msgId={msg.id}
                        mine={msg.mine}
                        time={msg.time}
                        status={msg.status}
                      />
                    ) : msg.attachment.type === "audio" ? (() => {
                      const durStr   = msg.attachment!.extra || "0:00";
                      const [dmm, dss] = durStr.split(":").map(Number);
                      const totalSecs  = (dmm || 0) * 60 + (dss || 0);
                      const curSec     = isVoicePlaying ? Math.floor(totalSecs * audioProgress) : totalSecs;
                      const dispTime   = `${Math.floor(curSec / 60)}:${(curSec % 60).toString().padStart(2, "0")}`;
                      const mine = msg.mine;
                      return (
                      /* ── VOICE MESSAGE BUBBLE — seekable, animated ── */
                      <div style={{
                        background: mine ? "#C8E6B2" : "#fff",
                        borderRadius: mine ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                        padding:"7px 10px 6px",
                        minWidth:196, maxWidth:258,
                        boxShadow: mine
                          ? "0 1px 4px rgba(0,0,0,0.10)"
                          : "0 1px 4px rgba(0,0,0,0.10)",
                        marginBottom:2,
                        userSelect:"none",
                        WebkitUserSelect:"none",
                      }}>
                        {/* Main row: play button | waveform | speed+avatar */}
                        <div style={{ display:"flex", alignItems:"center", gap:9 }}>

                          {/* Play / Pause — or Cancel upload with circular progress */}
                          {vUps && vUps.network !== "error" ? (
                            <div style={{ position:"relative", width:44, height:44, flexShrink:0 }}>
                              {/* Circular progress track + arc */}
                              <svg
                                style={{ position:"absolute", inset:0, transform:"rotate(-90deg)", pointerEvents:"none" }}
                                viewBox="0 0 44 44" width="44" height="44">
                                <circle cx="22" cy="22" r="17" fill="none"
                                  stroke={mine ? "rgba(139,203,122,0.30)" : "rgba(22,194,74,0.22)"}
                                  strokeWidth="2.5"/>
                                {(vUps.network === "waiting" || vUps.network === "offline")
                                  ? <circle cx="22" cy="22" r="17" fill="none"
                                      stroke={mine ? "var(--bp-primary)" : "var(--bp-primary)"} strokeWidth="2.5"
                                      strokeDasharray="20 87" strokeLinecap="round"
                                      style={{ animation:"fbl-spin 1.1s linear infinite", transformOrigin:"22px 22px" }}/>
                                  : <circle cx="22" cy="22" r="17" fill="none"
                                      stroke={mine ? "var(--bp-primary)" : "var(--bp-primary)"} strokeWidth="2.5"
                                      strokeDasharray={`${2 * Math.PI * 17}`}
                                      strokeDashoffset={`${2 * Math.PI * 17 * (1 - vUps.progress / 100)}`}
                                      strokeLinecap="round"
                                      style={{ transition:"stroke-dashoffset 0.3s ease" }}/>
                                }
                              </svg>
                              {/* Cancel × */}
                              <button
                                onClick={e => { e.stopPropagation(); cancelUploadMsg(msg.id); }}
                                style={{
                                  position:"absolute", inset:5, borderRadius:"50%", border:"none", cursor:"pointer",
                                  background: mine ? "var(--bp-primary)" : "var(--bp-primary)",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
                                  transition:"transform 0.12s, opacity 0.12s",
                                }}
                                onPointerDown={e => { e.currentTarget.style.transform="scale(0.86)"; e.currentTarget.style.opacity="0.80"; }}
                                onPointerUp={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.opacity="1"; }}
                                onPointerLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.opacity="1"; }}
                              >
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
                                  <path d="M18 6 6 18M6 6l12 12"/>
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleVoice(msg.id, msg.attachment!.label)}
                              style={{
                                width:42, height:42, borderRadius:"50%", flexShrink:0, border:"none", cursor:"pointer",
                                background: mine ? "var(--bp-primary)" : "var(--bp-primary)",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                boxShadow: "0 3px 10px rgba(34,197,94,0.35), 0 1px 3px rgba(34,197,94,0.18)",
                                transition:"transform 0.11s, opacity 0.11s",
                                WebkitTapHighlightColor:"transparent",
                                touchAction:"manipulation",
                              }}
                              onPointerDown={e => { e.currentTarget.style.transform="scale(0.88)"; e.currentTarget.style.opacity="0.82"; }}
                              onPointerUp={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.opacity="1"; }}
                              onPointerLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.opacity="1"; }}
                            >
                              {isVoicePlaying
                                ? <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff"><rect x="5" y="4" width="4.5" height="16" rx="1.8"/><rect x="14.5" y="4" width="4.5" height="16" rx="1.8"/></svg>
                                : <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M7.5 5.2v13.6l11-6.8z"/></svg>
                              }
                            </button>
                          )}

                          {/* Waveform — tap or drag to seek */}
                          <div
                            style={{ flex:1, display:"flex", alignItems:"center", height:42, gap:1.5, cursor:"pointer", touchAction:"none", position:"relative" }}
                            onPointerDown={e => {
                              e.stopPropagation();
                              e.currentTarget.setPointerCapture(e.pointerId);
                              const rect = e.currentTarget.getBoundingClientRect();
                              const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                              /* Instant visual feedback — actual seek fires on pointerUp */
                              setAudioProgress(p);
                              setPlayingAudioId(msg.id);
                            }}
                            onPointerMove={e => {
                              if (e.buttons !== 1) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                              /* Only update visual during drag — no audio seek spam */
                              setAudioProgress(p);
                            }}
                            onPointerUp={e => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                              /* Commit the seek + start playing on release */
                              seekVoice(msg.id, msg.attachment!.label, p);
                            }}
                          >
                            {wfBars.map((h, bi) => {
                              const fraction  = bi / wfBars.length;
                              const isActive  = playingAudioId === msg.id;
                              const played    = isActive ? fraction < audioProgress : false;
                              const isHead    = isActive && Math.abs(fraction - audioProgress) < (1.5 / wfBars.length);
                              const isNearA   = isActive && !isHead && Math.abs(fraction - audioProgress) < (3.5 / wfBars.length) && bi % 2 === 0;
                              const isNearB   = isActive && !isHead && Math.abs(fraction - audioProgress) < (3.5 / wfBars.length) && bi % 2 === 1;
                              const anim = isHead  ? `wf-playhead ${0.48}s ease-in-out infinite`
                                         : isNearA ? `wf-near-a ${0.58 + bi * 0.01}s ease-in-out infinite`
                                         : isNearB ? `wf-near-b ${0.54 + bi * 0.01}s ease-in-out infinite`
                                         : undefined;
                              return (
                                <div key={bi} style={{
                                  flex:1, borderRadius:3,
                                  height:`${Math.round(h * 100)}%`,
                                  minHeight:3,
                                  background: mine
                                    ? (played ? "var(--bp-primary)" : "#BBF7D0")
                                    : (played ? "var(--bp-primary)" : "#DCFCE7"),
                                  transition:"background 0.06s",
                                  transformOrigin:"center",
                                  animation: anim,
                                }}/>
                              );
                            })}
                          </div>

                          {/* Speed badge + avatar column */}
                          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flexShrink:0 }}>
                            <button
                              onClick={e => { e.stopPropagation(); cycleVoiceSpeed(); }}
                              style={{
                                background: mine ? "rgba(121,176,107,0.18)" : "rgba(22,194,74,0.13)",
                                border:"none", borderRadius:7, padding:"2px 7px", cursor:"pointer",
                                color: mine ? "var(--bp-primary)" : "var(--bp-primary)",
                                fontSize:11, fontWeight:800, letterSpacing:0.3,
                                transition:"background 0.15s",
                                WebkitTapHighlightColor:"transparent",
                              }}>
                              {voiceSpeed}x
                            </button>
                          </div>
                        </div>

                        {/* Error retry — only shown on upload failure */}
                        {mine && vUps?.network === "error" && (
                          <div style={{ marginTop:4, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <span style={{ fontSize:10.5, color:"#EF4444", fontWeight:600 }}>Échec de l'envoi</span>
                            <button onClick={() => retryUpload(msg.id)}
                              style={{ background:"rgba(239,68,68,0.10)", border:"none", borderRadius:10, color:"#EF4444",
                                fontSize:10.5, fontWeight:700, cursor:"pointer", padding:"2px 8px",
                                display:"flex", alignItems:"center", gap:3 }}>
                              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-7.6"/></svg>
                              Réessayer
                            </button>
                          </div>
                        )}

                        {/* Footer row: elapsed/total | time + ticks */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
                          <span style={{
                            fontSize:11, fontWeight:700, letterSpacing:0.15,
                            color: mine ? "#166534" : "#9CA3AF",
                            fontVariantNumeric:"tabular-nums",
                          }}>
                            {dispTime}
                          </span>
                          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:11, color: mine ? "#166534" : "#9CA3AF" }}>{msg.time}</span>
                            {mine && (vUps && vUps.network !== "error"
                              ? <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                                  <circle cx="8" cy="8" r="5.5" stroke="var(--bp-primary)" strokeWidth="1.5"/>
                                  <path d="M8 5.2V8l1.8 1.8" stroke="var(--bp-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              : <MsgStatus status={msg.status} dark={false} />
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })() : null
                  )}
                  {msg.attachment?.type === "sticker" && (() => {
                    const rawUrl = msg.attachment.label;
                    let stickerUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
                    if (stickerUrl.includes("/stickers/brutepawa-")) {
                      stickerUrl = stickerUrl.replace(/\.png(?:\?.*)?$/, "-animated.webp");
                      if (!stickerUrl.includes("?")) stickerUrl += "?v=2";
                    }
                    return (
                      <div style={{
                        position:"relative",
                        width:"min(210px, 55vw)",
                        height:"min(210px, 55vw)",
                        marginBottom:4,
                        animation:"fbl-fade-in 0.28s cubic-bezier(.22,1,.36,1)",
                      }}>
                        <img
                          src={stickerUrl}
                          alt={msg.attachment.extra || "Sticker"}
                          loading="lazy"
                          decoding="async"
                          onClick={() => openImageViewer(stickerUrl)}
                          style={{
                            width:"100%",
                            height:"100%",
                            display:"block",
                            objectFit:"contain",
                            cursor:"zoom-in",
                            filter:"drop-shadow(0 4px 5px rgba(15,23,42,.14))",
                          }}
                        />
                        <div style={{
                          position:"absolute",
                          right:4,
                          bottom:2,
                          display:"flex",
                          alignItems:"center",
                          gap:3,
                          padding:"2px 5px",
                          borderRadius:8,
                          background:"rgba(15,23,42,.34)",
                          backdropFilter:"blur(4px)",
                          WebkitBackdropFilter:"blur(4px)",
                        }}>
                          <span style={{ color:"#fff", fontSize:10.5, textShadow:"0 1px 2px rgba(0,0,0,.3)" }}>{msg.time}</span>
                          {msg.mine && <MsgStatus status={msg.status} dark />}
                        </div>
                      </div>
                    );
                  })()}
                  {msg.attachment?.type === "image" && (() => {
                    const rawUrl = msg.attachment.label;
                    const imgUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
                    const fname  = msg.attachment.extra || "photo";
                    const ups    = mediaUploads.get(msg.id);
                    const pct    = ups?.progress ?? 0;
                    const R      = 22; const CIRC = 2 * Math.PI * R;
                    const dash   = CIRC * (1 - pct / 100);
                    const sizeLabel = ups ? fmtBytes(ups.fileSize) : msg.attachment.size ? fmtBytes(msg.attachment.size) : "";
                    const ext = fname.includes(".") ? fname.split(".").pop()?.toUpperCase() ?? "" : "";
                    const captionSub = [sizeLabel, ext].filter(Boolean).join(" • ");
                    const counterText = ups ? `${fmtBytes(Math.round(ups.fileSize * pct / 100))} / ${fmtBytes(ups.fileSize)}` : "";
                    return (
                      <div style={{ borderRadius:18, overflow:"hidden", marginBottom:2, width:252,
                        background: msg.mine ? "#C8E6B2" : "#fff",
                        boxShadow:"0 2px 12px rgba(0,0,0,0.10)",
                        animation:"fbl-fade-in 0.28s cubic-bezier(.22,1,.36,1)" }}>
                        {/* Preserve the complete source ratio instead of cropping media into 4:3. */}
                        <div style={{ position:"relative", background:"transparent", lineHeight:0 }}>
                          <img key={imgUrl} src={imgUrl} alt={fname} loading="lazy" decoding="async"
                            onClick={() => { if (!ups) openImageViewer(imgUrl); }}
                            style={{ width:"100%", height:"auto", display:"block", objectFit:"contain",
                              cursor: ups ? "default" : "zoom-in" }} />

                          {/* Metadata over the image: no thick footer below the media. */}
                          <div style={{
                            position:"absolute", left:0, right:0, bottom:0, zIndex:2,
                            padding:"18px 9px 6px",
                            display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:5,
                            background:"linear-gradient(transparent, rgba(8,20,14,.58))",
                            lineHeight:1.2, pointerEvents:"none",
                          }}>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontWeight:750, fontSize:12, color:"#fff", textShadow:"0 1px 2px rgba(0,0,0,.4)" }}>Photo</div>
                              {captionSub && <div style={{ color:"rgba(255,255,255,.86)", fontSize:10.5 }}>{captionSub}</div>}
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                              {ups && (
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                                  <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/>
                                </svg>
                              )}
                              <span style={{ color:"#fff", fontSize:10.5, textShadow:"0 1px 2px rgba(0,0,0,.4)" }}>{msg.time}</span>
                              {msg.mine && !ups && <MsgStatus status={msg.status} dark />}
                            </div>
                          </div>

                          {/* Upload en cours — overlay Telegram style */}
                          {ups && ups.network !== "waiting" && ups.network !== "offline" && ups.network !== "error" && (
                            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.28)",
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {/* Compteur haut centre */}
                              <div style={{ position:"absolute", top:8, left:0, right:0, textAlign:"center" }}>
                                <span style={{ color:"#fff", fontSize:12, fontWeight:700,
                                  textShadow:"0 1px 3px rgba(0,0,0,0.6)" }}>{counterText}</span>
                              </div>
                              {/* × centré + cercle de progression */}
                              <div style={{ position:"relative", width:54, height:54 }}>
                                <svg width="54" height="54" viewBox="0 0 54 54"
                                  style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}>
                                  <circle cx="27" cy="27" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5"/>
                                  <circle cx="27" cy="27" r={R} fill="none" stroke="var(--bp-primary)" strokeWidth="3.5"
                                    strokeDasharray={CIRC} strokeDashoffset={dash}
                                    strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.35s ease" }}/>
                                </svg>
                                <button onClick={e => { e.stopPropagation(); ups.cancelFn?.(); }}
                                  style={{ position:"absolute", inset:5, display:"flex", alignItems:"center",
                                    justifyContent:"center", background:"#9CA3AF", border:"none",
                                    borderRadius:"50%", cursor:"pointer" }}>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                                    stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                  </svg>
                                </button>
                              </div>
                              {ups.network === "slow" && (
                                <div style={{ position:"absolute", bottom:8, left:0, right:0, textAlign:"center" }}>
                                  <span style={{ color:"#F59E0B", fontSize:11, fontWeight:700 }}>Connexion lente...</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* En attente de connexion */}
                          {(ups?.network === "waiting" || ups?.network === "offline") && (
                            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.52)",
                              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/>
                              </svg>
                              <span style={{ color:"#fff", fontWeight:700, fontSize:12, textAlign:"center", padding:"0 20px" }}>
                                En attente de connexion
                              </span>
                            </div>
                          )}

                          {/* Erreur */}
                          {ups?.network === "error" && (
                            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)",
                              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                              </svg>
                              <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>Échec de l'envoi</span>
                              <button onClick={() => retryUpload(msg.id)}
                                style={{ background:"var(--bp-primary)", border:"none", borderRadius:20, color:"#fff",
                                  padding:"5px 16px", fontSize:12, fontWeight:700, cursor:"pointer",
                                  display:"flex", alignItems:"center", gap:4 }}>
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                                  <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-7.6" fill="none"/>
                                </svg>
                                Réessayer
                              </button>
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()}
                  {msg.attachment?.type === "location" && (() => {
                    const coords  = msg.attachment.extra ?? "";
                    const [latStr, lngStr] = coords.split(",");
                    const lat = parseFloat(latStr);
                    const lng = parseFloat(lngStr);
                    const hasCoords = !isNaN(lat) && !isNaN(lng);
                    const geo = locationGeo[coords];

                    const validCoords = hasCoords
                      && lat >= -90 && lat <= 90
                      && lng >= -180 && lng <= 180;
                    const mapHref = validCoords
                      ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
                      : "";
                    const senderName = msg.mine ? "Vous" : (activeUser?.name ?? "Contact BrutePawa");
                    const address = geo
                      ? [geo.city, geo.district].filter(Boolean).join(", ")
                      : validCoords ? `${lat}, ${lng}` : "Indisponible";

                    const showLocationError = (title: string, detail: string) => {
                      window.alert(`${title}\n\n${detail}`);
                    };

                    const handleMapClick = () => {
                      if (!validCoords) {
                        showLocationError("Position indisponible", "Ce message ne contient pas de coordonnées valides.");
                        return;
                      }
                      window.open(mapHref, "_blank", "noopener,noreferrer");
                    };

                    const handleDirectionsClick = () => {
                      if (!validCoords) {
                        showLocationError("Itinéraire indisponible", "Ce message ne contient pas de coordonnées valides.");
                        return;
                      }
                      if (!navigator.geolocation) {
                        showLocationError("Localisation indisponible", "Votre navigateur ne permet pas d’obtenir votre position actuelle.");
                        return;
                      }

                      navigator.geolocation.getCurrentPosition(
                        position => {
                          const origin = `${position.coords.latitude},${position.coords.longitude}`;
                          const destination = `${lat},${lng}`;
                          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                          const directionsUrl = isIOS
                            ? `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&dirflg=d`
                            : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
                          window.open(directionsUrl, "_blank", "noopener,noreferrer");
                        },
                        error => {
                          const blocked = error.code === error.PERMISSION_DENIED;
                          showLocationError(
                            "Position actuelle indisponible",
                            blocked
                              ? "Autorisez BrutePawa à accéder à votre position dans les réglages du navigateur."
                              : "Activez le GPS et vérifiez votre connexion, puis réessayez.",
                          );
                        },
                        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
                      );
                    };

                    const handleLocationShare = async () => {
                      if (!validCoords) {
                        showLocationError("Partage indisponible", "Ce message ne contient pas de coordonnées valides.");
                        return;
                      }
                      const shareUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                      const shareText = [
                        "Position partagée",
                        `Nom de la personne : ${senderName}`,
                        `Localisation : ${address}`,
                        `Coordonnées : ${lat}, ${lng}`,
                        `Heure de partage : ${msg.time}`,
                        `Lien cartographique : ${shareUrl}`,
                      ].join("\n");

                      try {
                        if (navigator.share) {
                          await navigator.share({ title: "Position partagée", text: shareText, url: shareUrl });
                          return;
                        }
                        await navigator.clipboard.writeText(shareText);
                        window.alert("Les informations de position ont été copiées.");
                      } catch (error) {
                        if (error instanceof DOMException && error.name === "AbortError") return;
                        try {
                          const textarea = document.createElement("textarea");
                          textarea.value = shareText;
                          textarea.style.position = "fixed";
                          textarea.style.opacity = "0";
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand("copy");
                          textarea.remove();
                          window.alert("Les informations de position ont été copiées.");
                        } catch {
                          showLocationError("Partage indisponible", "Impossible de partager cette position pour le moment.");
                        }
                      }
                    };

                    return (
                      <div style={{ borderRadius:16, overflow:"hidden", marginBottom:2,
                        width:262, background:"#fff",
                        boxShadow:"0 3px 16px rgba(0,0,0,0.12)",
                        border:"1px solid #E5E7EB",
                        animation:"fbl-fade-in 0.35s cubic-bezier(.22,1,.36,1)" }}>

                        {/* Full-width map thumbnail */}
                        {hasCoords
                          ? <MapThumbnail lat={lat} lng={lng} />
                          : (
                            <div style={{ width:"100%", height:140,
                              background:"linear-gradient(160deg,#052e16,var(--bp-primary-dark))",
                              display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <span style={{ fontSize:48 }}>📍</span>
                            </div>
                          )
                        }

                        {/* Info section */}
                        <div style={{ padding:"10px 12px 6px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="#EF4444">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                            </svg>
                            <span style={{ fontWeight:700, fontSize:13.5, color:"#111" }}>
                              Position partagée
                            </span>
                          </div>
                          {/* City */}
                          {geo?.city
                            ? <span style={{ fontSize:12.5, color:"#64748B", display:"block", lineHeight:1.4 }}>
                                {geo.city}
                              </span>
                          : validCoords && !geo
                              ? <span style={{ fontSize:11.5, color:"#9CA3AF", display:"block" }}>
                                  {lat.toFixed(4)}, {lng.toFixed(4)}
                                </span>
                              : null
                          }
                          {/* District */}
                          {geo?.district &&
                            <span style={{ fontSize:12, color:"#64748B", display:"block", lineHeight:1.4 }}>
                              {geo.district}
                            </span>
                          }
                        </div>

                        {/* Divider */}
                        <div style={{ height:1, background:"#F1F5F9", margin:"4px 12px" }} />

                        {/* Footer: Voir sur la carte + Itineraire */}
                        <div style={{ padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <button type="button" onClick={handleMapClick}
                            style={{ textDecoration:"none", display:"flex", alignItems:"center",
                              gap:6, color:"#22C55E", fontWeight:700, fontSize:12,
                              background:"none", border:"none", padding:0, cursor:"pointer" }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                              stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                            </svg>
                            Voir sur la carte
                          </button>
                          <div style={{ display: "flex", gap: 12 }}>
                            <button type="button" onClick={handleDirectionsClick}
                              style={{ display:"flex", alignItems:"center", gap:6, color:"#111", fontWeight:700, fontSize:12, textDecoration: "none",
                                background:"none", border:"none", padding:0, cursor:"pointer" }}>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                              Itinéraire
                            </button>
                            <button type="button" onClick={handleLocationShare} aria-label="Partager cette position"
                              style={{ background: "none", border: "none", padding:0, cursor:"pointer" }}>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </button>
                          </div>
                        </div>
                        <div style={{ padding:"0 12px 6px", display:"flex", justifyContent:"flex-end" }}>
                          <span style={{ fontSize:10, float: "right", display:"flex", alignItems:"center", gap:2, color: "#444", margin: "0", position: "relative" }}>
                            {msg.time}
                            {msg.mine && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/><polyline points="24 6 13 17 8 12"/></svg>}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  {(msg.attachment?.type === "contact" || legacyContact) && (() => {
                    const contactId = msg.attachment?.type === "contact" ? Number(msg.attachment.label) : legacyContact!.id;
                    const contact = legacyContact ?? allUsers.find(user => user.id === contactId);
                    if (!contact) return null;
                    const contactName = `${contact.firstName} ${contact.lastName}`.trim();
                    const profileUrl = `${window.location.origin}${import.meta.env.BASE_URL}profile/${contact.id}`;
                    const shareContact = async () => {
                      if (navigator.share) {
                        await navigator.share({ title: contactName, text: `Contact BrutePawa : ${contactName}`, url: profileUrl }).catch(() => {});
                      } else {
                        await navigator.clipboard?.writeText(profileUrl).catch(() => {});
                      }
                    };
                    return (
                      <ContactMessageCard
                        user={contact}
                        online={Boolean(convPresence[contact.id]?.online)}
                        time={msg.time}
                        mine={msg.mine}
                        onMessage={() => setActiveConv(contact.id)}
                        onAudioCall={() => sig.startCall(contact.id, "audio")}
                        onVideoCall={() => sig.startCall(contact.id, "video")}
                        onProfile={() => navigate(`/profile/${contact.id}`)}
                        onShare={shareContact}
                      />
                    );
                  })()}
                  {msg.attachment?.type === "doc" && (() => {
                    const ups     = mediaUploads.get(msg.id);
                    const fname   = msg.attachment.extra ?? "Document";
                    const sizeStr = ups ? fmtBytes(ups.fileSize) : msg.attachment.size ? fmtBytes(msg.attachment.size) : "";
                    const rawUrl  = msg.attachment.label;
                    const docUrl  = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
                    const isPdf   = fname.toLowerCase().endsWith(".pdf");
                    const iconColor = isPdf ? "#EF4444" : "#0EA5E9";
                    const iconLabel = isPdf ? "PDF" : fname.split(".").pop()?.toUpperCase()?.slice(0,4) ?? "DOC";
                    const pct     = ups?.progress ?? 0;
                    const typeSize = [iconLabel, sizeStr].filter(Boolean).join(" • ");
                    /* ── Détection vidéo ── */
                    const isVid = /\.(mp4|mov|webm|avi|mkv|m4v|3gp)$/i.test(fname) || Boolean(ups?.file?.type?.startsWith("video/"));
                    if (isVid) {
                      const vExt      = fname.includes(".") ? fname.split(".").pop()?.toUpperCase() ?? "" : "";
                      const vCaption  = [sizeStr, vExt].filter(Boolean).join(" • ");
                      const Rv = 22; const CIRCv = 2 * Math.PI * Rv;
                      const dashv     = CIRCv * (1 - pct / 100);
                      const cntText   = ups ? `${fmtBytes(Math.round(ups.fileSize * pct / 100))} / ${fmtBytes(ups.fileSize)}` : "";
                      return (
                        <div style={{ borderRadius:18, overflow:"hidden", marginBottom:2, width:252,
                          background: msg.mine ? "#C8E6B2" : "#fff",
                          boxShadow:"0 2px 12px rgba(0,0,0,0.10)",
                          animation:"fbl-fade-in 0.28s cubic-bezier(.22,1,.36,1)" }}>
                          {/* Miniature vidéo */}
                          <div style={{ position:"relative", aspectRatio:"4/3", background:"#111" }}>
                            <video src={docUrl} preload="metadata" muted playsInline
                              style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", inset:0, display:"block" }}
                              onError={e => { (e.currentTarget as HTMLVideoElement).style.display="none"; }}/>
                            {/* Bouton play (quand pas en upload) */}
                            {!ups && (
                              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
                                justifyContent:"center", background:"rgba(0,0,0,0.18)" }}>
                                <div style={{ width:50, height:50, borderRadius:"50%",
                                  background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)",
                                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff">
                                    <polygon points="6,4 20,12 6,20"/>
                                  </svg>
                                </div>
                              </div>
                            )}
                            {/* Upload overlay */}
                            {ups && ups.network !== "waiting" && ups.network !== "offline" && ups.network !== "error" && (
                              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.28)",
                                display:"flex", alignItems:"center", justifyContent:"center" }}>
                                <div style={{ position:"absolute", top:8, left:0, right:0, textAlign:"center" }}>
                                  <span style={{ color:"#fff", fontSize:12, fontWeight:700,
                                    textShadow:"0 1px 3px rgba(0,0,0,0.6)" }}>{cntText}</span>
                                </div>
                                <div style={{ position:"relative", width:54, height:54 }}>
                                  <svg width="54" height="54" viewBox="0 0 54 54"
                                    style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}>
                                    <circle cx="27" cy="27" r={Rv} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5"/>
                                    <circle cx="27" cy="27" r={Rv} fill="none" stroke="var(--bp-primary)" strokeWidth="3.5"
                                      strokeDasharray={CIRCv} strokeDashoffset={dashv}
                                      strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.35s ease" }}/>
                                  </svg>
                                  <button onClick={e => { e.stopPropagation(); ups.cancelFn?.(); }}
                                    style={{ position:"absolute", inset:5, display:"flex", alignItems:"center",
                                      justifyContent:"center", background:"#9CA3AF", border:"none",
                                      borderRadius:"50%", cursor:"pointer" }}>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                                      stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                            {(ups?.network === "waiting" || ups?.network === "offline") && (
                              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.52)",
                                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6 }}>
                                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
                                  <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/>
                                </svg>
                                <span style={{ color:"#fff", fontWeight:700, fontSize:12, textAlign:"center", padding:"0 20px" }}>
                                  En attente de connexion
                                </span>
                              </div>
                            )}
                            {ups?.network === "error" && (
                              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)",
                                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round">
                                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                                </svg>
                                <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>Échec de l'envoi</span>
                                <button onClick={() => retryUpload(msg.id)}
                                  style={{ background:"var(--bp-primary)", border:"none", borderRadius:20, color:"#fff",
                                    padding:"5px 16px", fontSize:12, fontWeight:700, cursor:"pointer",
                                    display:"flex", alignItems:"center", gap:4 }}>
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-7.6" fill="none"/>
                                  </svg>
                                  Réessayer
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Bandeau compact */}
                          <div style={{ padding:"6px 10px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:4 }}>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontWeight:700, fontSize:12.5, color:"#111", lineHeight:1.2 }}>Vidéo</div>
                              {vCaption && <div style={{ color:"#64748B", fontSize:11, lineHeight:1.3 }}>{vCaption}</div>}
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                              {ups && (<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/></svg>)}
                              <span style={{ color:"#64748B", fontSize:11 }}>{msg.time}</span>
                              {msg.mine && !ups && <MsgStatus status={msg.status} dark={false} />}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div style={{ borderRadius:14, overflow:"hidden", marginBottom:2,
                        maxWidth:262, background:"#fff",
                        boxShadow:"0 2px 12px rgba(0,0,0,0.10)",
                        border:"1px solid #E5E7EB" }}>
                        {/* Header: icon + filename */}
                        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 14px 10px" }}>
                          <div style={{ width:42, height:50, background:iconColor,
                            borderRadius:8, flexShrink:0, position:"relative",
                            display:"flex", flexDirection:"column", alignItems:"center",
                            justifyContent:"center",
                            boxShadow:`0 2px 8px ${iconColor}55` }}>
                            <div style={{ position:"absolute", top:0, right:0, width:0, height:0,
                              borderStyle:"solid", borderWidth:"0 10px 10px 0",
                              borderColor:`transparent #fff transparent transparent` }} />
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                              stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              style={{ marginTop:4 }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span style={{ color:"#fff", fontSize:8.5, fontWeight:900,
                              letterSpacing:0.3, marginTop:2 }}>{iconLabel}</span>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:"#111",
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                              lineHeight:1.35 }}>
                              {fname}
                            </div>
                            <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{typeSize}</div>
                          </div>
                        </div>

                        {/* Upload progress / status */}
                        {ups && (
                          <div style={{ padding:"0 14px 10px" }}>
                            {/* Waiting state */}
                            {(ups.network === "waiting" || ups.network === "offline") && (
                              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round">
                                  <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/>
                                </svg>
                                <span style={{ fontSize:11.5, color:"#F59E0B", fontWeight:600 }}>En attente de connexion</span>
                              </div>
                            )}
                            {/* Progress bar */}
                            {ups.network !== "waiting" && ups.network !== "offline" && (
                              <div style={{ height:3, background:"#E5E7EB", borderRadius:2, marginBottom: ups.network === "error" || ups.network === "slow" ? 6 : 0 }}>
                                <div style={{ height:"100%", borderRadius:2,
                                  width: ups.network === "error" ? "35%" : `${pct}%`,
                                  background: ups.network === "error" ? "#EF4444"
                                    : ups.network === "slow" ? "#F59E0B" : "var(--bp-primary)",
                                  transition:"width 0.3s ease" }} />
                              </div>
                            )}
                            {/* Slow warning */}
                            {ups.network === "slow" && (
                              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round">
                                  <circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 3"/>
                                </svg>
                                <span style={{ fontSize:11, color:"#F59E0B", fontWeight:600 }}>Connexion lente...</span>
                              </div>
                            )}
                            {/* Error + retry */}
                            {ups.network === "error" && (
                              <div style={{ display:"flex", alignItems:"center",
                                justifyContent:"space-between" }}>
                                <span style={{ fontSize:11.5, color:"#EF4444", fontWeight:600 }}>Échec de l'envoi</span>
                                <button onClick={() => retryUpload(msg.id)}
                                  style={{ background:"none", border:"none", color:"var(--bp-primary)",
                                    fontSize:12, fontWeight:700, cursor:"pointer",
                                    display:"flex", alignItems:"center", gap:3, padding:0 }}>
                                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none"
                                    stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round">
                                    <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 .49-7.6" fill="none"/>
                                  </svg>
                                  Réessayer
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        {!ups && (
                          <div style={{ display:"flex", gap:8, padding:"2px 14px 12px" }}>
                            <a href={docUrl} target="_blank" rel="noreferrer"
                              style={{ flex:1, display:"flex", alignItems:"center",
                                justifyContent:"center", gap:5,
                                border:"1.5px solid var(--bp-primary)", borderRadius:20,
                                padding:"7px 0", color:"var(--bp-primary)",
                                textDecoration:"none", fontSize:13, fontWeight:600 }}>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                                stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                              Ouvrir
                            </a>
                            <a href={docUrl} download={fname} target="_blank" rel="noreferrer"
                              style={{ flex:1, display:"flex", alignItems:"center",
                                justifyContent:"center", gap:5,
                                border:"1.5px solid var(--bp-primary)", borderRadius:20,
                                padding:"7px 0", color:"var(--bp-primary)",
                                textDecoration:"none", fontSize:13, fontWeight:600 }}>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
                                stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Télécharger
                            </a>
                          </div>
                        )}

                        {/* Time row */}
                        <div style={{ display:"flex", justifyContent:"flex-end",
                          alignItems:"center", gap:3, padding:"0 14px 9px" }}>
                          <span style={{ fontSize:11, color:"#9CA3AF" }}>{msg.time}</span>
                          {msg.mine && <MsgStatus status={msg.status} dark={false} />}
                        </div>
                      </div>
                    );
                  })()}
                  {!isAudio && !legacyContact && !!msg.text && (() => {
                    /* Detect first URL for link preview */
                    URL_RE.lastIndex = 0;
                    const urlMatch = URL_RE.exec(msg.text || "");
                    const firstUrl = urlMatch ? normalizeUrl(urlMatch[0]) : null;
                    const preview = firstUrl ? linkPreviews[firstUrl] : null;
                    const isMine = msg.mine;
                    return (
                    <div className={isMine ? "fbl-msg-mine" : "fbl-msg-theirs"}
                      style={{ overflow:"hidden", wordBreak:"break-word" }}>
                      {/* Link preview card */}
                      {preview && (
                        preview.url.includes("binovex") ? (
                          <a href={preview.url} target="_blank" rel="noreferrer noopener"
                            onClick={e => e.stopPropagation()}
                            style={{ display:"block", textDecoration:"none", border: "1px solid #E5E7EB", borderRadius: 12, padding: "8px", margin: "4px 0", background: "#fff" }}>
                            <div style={{ display: "flex", gap: 10 }}>
                              {/* Black square logo */}
                              <div style={{ width: 72, height: 72, background: "#000", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#22C55E"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                <span style={{ color: "#fff", fontSize: 9, fontWeight: 800, marginTop: 4, letterSpacing: 0.5 }}>BINOVEX</span>
                              </div>
                              {/* Text info */}
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Binovex</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#22C55E"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                  </div>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                                </div>
                                <div style={{ fontSize: 11, color: "#555", marginTop: 2, lineHeight: 1.3 }}>Binovex — plateforme de réseau mobile.</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><span style={{ fontSize: 10, color: "#555" }}>Simple</span></div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><span style={{ fontSize: 10, color: "#555" }}>Sécurisé</span></div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#22C55E"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><span style={{ fontSize: 10, color: "#555" }}>Rapide</span></div>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 6, borderTop: "1px solid #F1F5F9" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              <span style={{ fontSize: 11, color: "#22C55E", textDecoration: "underline", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{preview.url}</span>
                            </div>
                          </a>
                        ) : (
                        <a href={preview.url} target="_blank" rel="noreferrer noopener"
                          onClick={e => e.stopPropagation()}
                          style={{ display:"block", textDecoration:"none", borderBottom:`1px solid ${isMine ? "rgba(0,0,0,0.05)" : "#E5E7EB"}`, margin: "0 0 6px" }}>
                          {preview.image && (
                            <img src={preview.image} alt="" loading="lazy" decoding="async"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display="none"; }}
                              style={{ width:"100%", height:140, objectFit:"cover", display:"block", borderRadius: "8px 8px 0 0" }} />
                          )}
                          <div style={{ padding:"8px 10px", background: isMine ? "rgba(0,0,0,0.05)" : "#F8FAFC", borderRadius: "0 0 8px 8px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                              {preview.favicon && (
                                <img src={preview.favicon} alt="" width={14} height={14}
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display="none"; }}
                                  style={{ borderRadius:3, flexShrink:0 }} />
                              )}
                              <span style={{ fontSize:10, fontWeight:700, color: isMine ? "#14532D" : "#9CA3AF",
                                textTransform:"uppercase", letterSpacing:"0.05em" }}>
                                {preview.siteName || (() => { try { return new URL(preview.url).hostname.replace("www.",""); } catch { return preview.url; } })()}
                              </span>
                            </div>
                            {preview.title && (
                              <div style={{ fontSize:13, fontWeight:700, color: "#111",
                                lineHeight:1.35, marginBottom:2, display:"-webkit-box",
                                WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                                {preview.title}
                              </div>
                            )}
                            {preview.description && (
                              <div style={{ fontSize:11, color: "#64748B",
                                lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:2,
                                WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                                {preview.description}
                              </div>
                            )}
                          </div>
                        </a>
                        )
                      )}
                      {/* Text content */}
                      <div style={{ fontSize:14.5, lineHeight:1.45, position: "relative" }}>
                        {renderText(msg.text, "#111")}
                        <span style={{ fontSize:10, float: "right", display:"flex", alignItems:"center", gap:2, color: "#444", margin: "4px 0 -2px 8px", position: "relative", top: 4 }}>
                          {msg.time}
                          {isMine && <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/><polyline points="24 6 13 17 8 12"/></svg>}
                        </span>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </div>
              </Fragment>
            );
          })}
          {false && currentMessages.length === 0 && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 16px 24px", gap:0 }}>

              {/* ── Illustration ── */}
              <div style={{ width:"100%", maxWidth:340 }}>
                <svg viewBox="0 0 340 240" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%", height:"auto" }}>
                  {/* Green background circle */}
                  <circle cx="170" cy="130" r="105" fill="#DCFCE7" opacity="0.7"/>
                  <circle cx="170" cy="130" r="75" fill="#DCFCE7" opacity="0.4"/>

                  {/* ── Man (left) — green hoodie ── */}
                  {/* Hoodie body */}
                  <rect x="55" y="120" width="52" height="72" rx="12" fill="var(--bp-primary)"/>
                  {/* Hood */}
                  <path d="M55 132 Q55 120 81 118 Q107 120 107 132" fill="var(--bp-primary)"/>
                  {/* BP logo on hoodie */}
                  <circle cx="81" cy="148" r="10" fill="var(--bp-primary)"/>
                  <text x="81" y="152" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff" fontFamily="Georgia, serif">bp</text>
                  {/* Legs */}
                  <rect x="62" y="188" width="14" height="40" rx="7" fill="#1E293B"/>
                  <rect x="83" y="188" width="14" height="40" rx="7" fill="#1E293B"/>
                  {/* Shoes */}
                  <ellipse cx="69" cy="229" rx="11" ry="5" fill="#111827"/>
                  <ellipse cx="90" cy="229" rx="11" ry="5" fill="#111827"/>
                  {/* Head */}
                  <circle cx="81" cy="106" r="20" fill="#1C1917"/>
                  {/* Hair short */}
                  <ellipse cx="81" cy="88" rx="20" ry="8" fill="#1C1917"/>
                  {/* Eyes */}
                  <circle cx="75" cy="105" r="2.8" fill="#fff"/>
                  <circle cx="87" cy="105" r="2.8" fill="#fff"/>
                  <circle cx="76" cy="105" r="1.4" fill="#1C1917"/>
                  <circle cx="88" cy="105" r="1.4" fill="#1C1917"/>
                  {/* Smile */}
                  <path d="M77 112 Q81 116 85 112" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  {/* Phone */}
                  <rect x="105" y="140" width="20" height="32" rx="4" fill="#111827"/>
                  <rect x="107" y="143" width="16" height="24" rx="2" fill="#BBF7D0"/>
                  {/* Arm */}
                  <path d="M107 140 Q106 128 104 140" stroke="#1C1917" strokeWidth="8" strokeLinecap="round" fill="none"/>

                  {/* ── Woman (right) — green BrutePawa t-shirt ── */}
                  {/* T-shirt body */}
                  <rect x="207" y="118" width="52" height="70" rx="12" fill="var(--bp-primary)"/>
                  {/* BP logo on t-shirt */}
                  <circle cx="233" cy="148" r="10" fill="var(--bp-primary)"/>
                  <text x="233" y="152" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff" fontFamily="Georgia, serif">bp</text>
                  {/* Skirt/pants */}
                  <rect x="211" y="182" width="18" height="42" rx="8" fill="#1E293B"/>
                  <rect x="234" y="182" width="18" height="42" rx="8" fill="#1E293B"/>
                  <ellipse cx="220" cy="225" rx="11" ry="5" fill="#111827"/>
                  <ellipse cx="243" cy="225" rx="11" ry="5" fill="#111827"/>
                  {/* Head */}
                  <circle cx="233" cy="104" r="20" fill="#1C1917"/>
                  {/* Bun hair */}
                  <ellipse cx="233" cy="87" rx="14" ry="9" fill="#1C1917"/>
                  <circle cx="233" cy="80" r="8" fill="#1C1917"/>
                  {/* Earring */}
                  <circle cx="253" cy="106" r="3" fill="#FBBF24"/>
                  {/* Eyes */}
                  <circle cx="227" cy="103" r="2.8" fill="#fff"/>
                  <circle cx="239" cy="103" r="2.8" fill="#fff"/>
                  <circle cx="228" cy="103" r="1.4" fill="#1C1917"/>
                  <circle cx="240" cy="103" r="1.4" fill="#1C1917"/>
                  {/* Smile */}
                  <path d="M229 110 Q233 114 237 110" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  {/* Phone */}
                  <rect x="192" y="140" width="20" height="32" rx="4" fill="#111827"/>
                  <rect x="194" y="143" width="16" height="24" rx="2" fill="#BBF7D0"/>
                  {/* Arm */}
                  <path d="M207 155 Q202 148 204 140" stroke="#1C1917" strokeWidth="8" strokeLinecap="round" fill="none"/>

                  {/* ── Floating chat bubbles ── */}
                  {/* Top left */}
                  <rect x="14" y="60" width="70" height="36" rx="14" fill="var(--bp-primary)"/>
                  <path d="M25 95 L16 106 L38 95" fill="var(--bp-primary)"/>
                  <rect x="22" y="71" width="22" height="5" rx="2.5" fill="#fff" opacity="0.9"/>
                  <rect x="22" y="80" width="52" height="5" rx="2.5" fill="#fff" opacity="0.7"/>
                  {/* Top right */}
                  <rect x="256" y="50" width="70" height="36" rx="14" fill="#fff" style={{filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.10))"}}/>
                  <path d="M315 85 L326 96 L304 85" fill="#fff"/>
                  <circle cx="274" cy="68" r="4" fill="#E5E7EB"/>
                  <circle cx="286" cy="68" r="4" fill="#E5E7EB"/>
                  <circle cx="298" cy="68" r="4" fill="#E5E7EB"/>
                  {/* Lock icon center */}
                  <rect x="149" y="82" width="42" height="42" rx="21" fill="#fff" style={{filter:"drop-shadow(0 4px 12px rgba(22,194,74,0.25))"}}/>
                  <rect x="160" y="94" width="20" height="16" rx="3" fill="var(--bp-primary)"/>
                  <path d="M163 94 Q163 88 170 88 Q177 88 177 94" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <circle cx="170" cy="101" r="2.5" fill="#fff"/>
                  {/* Small heart top right */}
                  <path d="M302 120 C302 117 298 116 297 119 C296 116 292 117 292 120 C292 124 297 128 297 128 C297 128 302 124 302 120z" fill="#FCA5A5"/>
                  {/* Small green dot decorations */}
                  <circle cx="145" cy="55" r="5" fill="var(--bp-primary)" opacity="0.5"/>
                  <circle cx="200" cy="45" r="3.5" fill="var(--bp-primary)" opacity="0.4"/>
                  <circle cx="30" cy="140" r="4" fill="var(--bp-primary)" opacity="0.35"/>
                </svg>
              </div>

              {/* Title */}
              <div style={{ fontWeight:800, fontSize:20, color:"#111827", textAlign:"center", lineHeight:1.3, margin:"4px 0 12px" }}>
                Commencez une conversation<br/>
                avec <span style={{ color:"var(--bp-primary)" }}>{activeUser!.name}</span>
              </div>

              {/* Security card */}
              <div style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", border:"1px solid #E5E7EB", borderRadius:16, padding:"12px 16px", margin:"0 4px 16px", width:"100%", boxSizing:"border-box", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <div style={{ fontSize:13, color:"#64748B", lineHeight:1.5 }}>
                  Vos messages sont protégés par un <span style={{ fontWeight:700, color:"var(--bp-primary)" }}>chiffrement de bout en bout.</span>
                </div>
              </div>

              {/* Suggestions header */}
              <div style={{ width:"100%", fontSize:14, fontWeight:700, color:"#111827", marginBottom:10, textAlign:"left" }}>
                Suggestions pour démarrer
              </div>

              {/* Suggestion chips */}
              <div style={{ display:"flex", gap:8, width:"100%", overflowX:"auto", scrollbarWidth:"none", paddingBottom:4 }}>
                {([
                  { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zM20.293 8.293A1 1 0 0 0 19.586 8H17V6a4 4 0 0 0-4-4 1 1 0 0 0-1 1v.667a4 4 0 0 1-1.902 3.43l-1.547.773A1 1 0 0 0 8 8.866V19a2 2 0 0 0 2 2h6.234a2 2 0 0 0 1.994-1.832l.582-7A2 2 0 0 0 20.293 8.293z"/></svg>, label:"Dire bonjour", msg:"Bonjour ! 👋" },
                  { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="var(--bp-primary)"/><circle cx="15" cy="9" r="1" fill="var(--bp-primary)"/></svg>, label:"Un emoji", msg:"😄" },
                  { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, label:"Une photo", msg:"Je voulais partager cette photo avec toi 📷" },
                  { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>, label:"Une musique", msg:"Tu connais cette chanson ? 🎵" },
                  { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>, label:"Un cadeau", msg:"J'ai quelque chose pour toi 🎁" },
                ] as {icon:React.ReactNode; label:string; msg:string}[]).map((s, i) => (
                  <button key={i}
                    onClick={() => {
                      if (!activeConv) return;
                      const id = Date.now();
                      setMessages(prev => ({ ...prev, [activeConv]: [...(prev[activeConv] ?? []), { id, text: s.msg, mine: true, time: new Date().toLocaleTimeString("fr", { hour:"2-digit", minute:"2-digit" }), status: "sent" }] }));
                      import("../lib/api").then(m => m.apiSendMessage(activeConv, s.msg).catch(() => {}));
                    }}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, background:"#fff", border:"1px solid #E5E7EB", borderRadius:16, padding:"12px 14px", cursor:"pointer", flexShrink:0, minWidth:72, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", transition:"all 0.15s" }}>
                    {s.icon}
                    <span style={{ fontSize:11, color:"#64748B", fontWeight:600, textAlign:"center", lineHeight:1.2 }}>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Security guarantee card */}
              <div style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", border:"1px solid #E5E7EB", borderRadius:16, padding:"14px 16px", marginTop:14, width:"100%", boxSizing:"border-box", cursor:"pointer", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ width:42, height:42, borderRadius:12, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"#111827", marginBottom:2 }}>Sécurité garantie</div>
                  <div style={{ fontSize:12, color:"#64748B", lineHeight:1.5 }}>Personne en dehors de cette discussion ne peut lire vos messages, pas même BrutePawa.</div>
                </div>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>

            </div>
          )}
          {peerTyping.typing && (
            <div style={{ display:"flex", alignItems:"center", gap:6, alignSelf:"flex-start", background:"#fff", borderRadius:"18px 18px 18px 4px", padding:"8px 14px", boxShadow:"0 1px 4px rgba(0,0,0,0.10)", marginBottom:4 }}>
              {peerTyping.activity === "audio" ? (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  <span style={{ fontSize:12, color:"#D97706", fontWeight:600 }}>En train d'envoyer un vocal...</span>
                </>
              ) : peerTyping.activity === "video" ? (
                <>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  <span style={{ fontSize:12, color:"#7C3AED", fontWeight:600 }}>En train d'envoyer une vidéo...</span>
                </>
              ) : (
                <>
                  <span className="wa-typing-dot" />
                  <span className="wa-typing-dot" />
                  <span className="wa-typing-dot" />
                </>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        </div>

        {/* ── INPUT BAR ── */}
        {selectionMode ? (
          /* ── TELEGRAM-STYLE SELECTION BOTTOM BAR ── */
          <div style={{ background:"#fff", borderTop:"1px solid rgba(0,0,0,0.09)", padding:"10px 12px", display:"flex", gap:10, flexShrink:0 }}>
            {/* Reply */}
            <button onClick={() => { setSelectionMode(false); setSelectedMsgs(new Set()); setLongPressMsg(null); }}
              style={{ flex:1, height:48, borderRadius:10, border:"none", background:"#F1F5F9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontSize:15, fontWeight:600, color:"#111827" }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
              Reply
            </button>
            {/* Forward */}
            <button onClick={() => { setSelectionMode(false); setSelectedMsgs(new Set()); setLongPressMsg(null); }}
              style={{ flex:1, height:48, borderRadius:10, border:"none", background:"#F1F5F9", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontSize:15, fontWeight:600, color:"#111827" }}>
              Forward
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
            </button>
          </div>
        ) : (
          /* NORMAL INPUT BAR — Floating pill composer */
          <div style={{ background:"transparent", flexShrink:0, display:"flex", flexDirection:"column" }}>

            {/* ── LOCKED RECORDING: full capsule with controls ── */}
            {isRecording && recLocked && (
              <div style={{ margin:"6px 10px 2px", display:"flex", alignItems:"center", gap:8,
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
                        transition: "height 0.07s ease",
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

            {showEmojiPicker && !isRecording && (
              <EmojiPicker
                isOpen={showEmojiPicker}
                isClosing={pickerClosing}
                onClose={toggleEmojiPicker}
                onSelectEmoji={(emoji) => {
                  const input = dmInputRef.current;
                  const cursor = input?.selectionStart ?? newMsg.length;
                  setNewMsg(prev => prev.slice(0, cursor) + emoji + prev.slice(cursor));
                  setTimeout(() => {
                    input?.setSelectionRange(cursor + emoji.length, cursor + emoji.length);
                  }, 10);
                }}
                onSelectMedia={(item, type) => {
                  const isBrutePawaSticker = item.id.startsWith("brutepawa-");
                  const filename = isBrutePawaSticker ? `${item.id}-animated.webp` : `GIPHY-${item.id}.gif`;
                  const isSticker = type === "sticker";
                  sendAttachMsg(
                    { type:isSticker ? "sticker" : "image", label:item.url, extra:filename },
                    "",
                    `${isSticker ? "__sticker__" : "__image__"}:${item.url}:${filename}:0`,
                  );
                  setShowEmojiPicker(false);
                }}
              />
            )}

            {/* ── Main input row — PREMIUM 2026 ── */}
            <div style={{ order:1, padding:"6px 12px 8px", display: recLocked ? "none" : "flex", alignItems:"flex-end", gap:10, userSelect:"none", WebkitUserSelect:"none" }}>
              {/* ═══ FLOATING GLASS PILL ═══ */}
              <div style={{ flex:1, display:"flex", alignItems:"center", background:"rgba(255,255,255,0.97)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderRadius:32, boxShadow:"0 4px 28px rgba(0,0,0,0.13), 0 1px 6px rgba(0,0,0,0.07)", padding:"6px 10px 6px 14px", minHeight:52, border:"1px solid rgba(255,255,255,0.85)", overflow:"visible", position:"relative" }}>

                {/* Unlocked recording: waveform lives inside the pill */}
                {isRecording && !recLocked && (
                  <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, overflow:"hidden", padding:"0 4px" }}>
                    <div style={{ width:9, height:9, borderRadius:"50%", background:"#EF4444", flexShrink:0,
                      animation: recPaused ? "none" : "fbl-rec-pulse 1s ease-in-out infinite",
                      opacity: recPaused ? 0.4 : 1 }} />
                    <span style={{ fontSize:15, fontWeight:800, color:"#EF4444", fontVariantNumeric:"tabular-nums", flexShrink:0, minWidth:44 }}>
                      {`${Math.floor(recSeconds/60).toString().padStart(2,"0")}:${(recSeconds%60).toString().padStart(2,"0")}`}
                    </span>
                    <div style={{ flex:1, display:"flex", alignItems:"center", gap:2, height:30, overflow:"hidden" }}>
                      {recLiveBars.map((h, i) => (
                        <div key={i} style={{ flex:1, borderRadius:2,
                          background: recPaused ? "#E5E7EB" : "var(--bp-primary)",
                          height: recPaused ? "30%" : `${h}%`,
                          transition:"height 0.07s ease",
                          opacity: recPaused ? 0.5 : 0.6 + Math.min(0.4, (h / 96) * 0.4) }} />
                      ))}
                    </div>
                    {recDragX < -50 && (
                      <span style={{ fontSize:12, fontWeight:700,
                        color: recDragX < -100 ? "#EF4444" : "#9CA3AF",
                        flexShrink:0, animation:"fbl-fade-in 0.15s ease" }}>
                        {recDragX < -100 ? "Relâcher pour annuler" : "← Annuler"}
                      </span>
                    )}
                  </div>
                )}

                {/* Emoji — hidden during recording */}
                {!isRecording && (
                  <button onClick={toggleEmojiPicker}
                    aria-label="Ouvrir les emojis"
                    aria-expanded={showEmojiPicker}
                    data-testid="emoji-picker-toggle"
                    style={{ background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0, display:"flex", alignItems:"center", marginRight:4 }}>
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="#9CA3AF"/><circle cx="15" cy="9" r="1" fill="#9CA3AF"/></svg>
                  </button>
                )}
                {/* Text input — hidden during recording */}
                {!isRecording && (
                  <textarea ref={dmInputRef} value={newMsg}
                    data-testid="message-composer-input"
                    rows={1}
                    onChange={e => {
                      setNewMsg(e.target.value);
                      autoResize(e.target);
                      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
                      apiSendTyping(activeConv!, "typing").catch(() => {});
                      typingDebounceRef.current = setTimeout(() => { typingDebounceRef.current = null; }, 2500);
                    }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                    placeholder="Écrire un message..."
                    style={{ flex:1, background:"transparent", border:"none", outline:"none", resize:"none", padding:"8px", fontSize:15, color:"#111827", minWidth:0, lineHeight:"22px", height:"38px", maxHeight:"130px", overflowY:"hidden", transition:"height 0.15s ease", display:"block", alignSelf:"center", fontFamily:"inherit", caretColor:"var(--bp-primary)", WebkitAppearance:"none" as React.CSSProperties["WebkitAppearance"] }} />
                )}

                {/* Attachment + Camera — inside pill, only when no text */}
                {!newMsg.trim() && !isRecording && (
                  <div style={{ display:"flex", alignItems:"center", gap:2, flexShrink:0 }}>
                    <button onClick={() => { setAttachSheet(true); setAttachPage("none"); }}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:"0 4px", flexShrink:0, display:"flex", alignItems:"center" }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <button onClick={() => cameraInputRef.current?.click()}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:"0 4px", flexShrink:0, display:"flex", alignItems:"center" }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>
                  </div>
                )}
              </div>{/* end glass pill */}

              {/* ═══ EXTERNAL RIGHT BUTTON — Send (when typing) or Mic ═══ */}
              {newMsg.trim() && !isRecording ? (
                <button onClick={() => sendMsg()}
                  style={{ width:52, height:52, borderRadius:"50%", flexShrink:0, border:"none", background:"linear-gradient(135deg,var(--bp-primary) 0%,#16a34a 100%)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(34,197,94,0.55)", cursor:"pointer", animation:"bp-send-in 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="#fff" stroke="none"/></svg>
                </button>
              ) : !recLocked ? (() => {
                const LOCK_DIST = 110;
                const LOCK_RADIUS = 24;
                const isNearLock = recDragY < -(LOCK_DIST - LOCK_RADIUS - 8);
                const isAtLock   = recDragY < -(LOCK_DIST - LOCK_RADIUS);
                const micDy = Math.max(-LOCK_DIST, recDragY);
                const visualDy = micDy < -70 ? micDy + (micDy + 70) * 0.18 : micDy;
                const visualDx = Math.max(-100, recDragX) * 0.35;
                const SIZE = isRecording ? 56 : 52;
                return (
                <div style={{ position:"relative", flexShrink:0, width:SIZE, height:SIZE,
                  overflow:"visible" }}>

                      {/* ── LOCK ICON — fixed 110px above mic (never moves) ── */}
                      {isRecording && (
                        <div style={{
                          position:"absolute",
                          /* center lock above mic center: top = -(LOCK_DIST - SIZE/2 + 22) */
                          top: -(LOCK_DIST - SIZE/2 + 22),
                          left:"50%", transform:"translateX(-50%)",
                          width:44, height:44, borderRadius:"50%",
                          background: isAtLock ? "var(--bp-primary)" : isNearLock ? "#EDE9FE" : "#fff",
                          boxShadow: isAtLock
                            ? "0 0 0 8px rgba(24,119,242,0.18), 0 6px 24px rgba(24,119,242,0.45)"
                            : "0 6px 24px rgba(0,0,0,0.14)",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          transition:"background 0.15s, box-shadow 0.15s",
                          pointerEvents:"none", zIndex:10,
                          animation: "fbl-fade-in 0.18s ease",
                        }}>
                          {isAtLock ? (
                            /* Locked padlock */
                            <svg viewBox="0 0 24 24" width="20" height="20">
                              <rect x="5" y="11" width="14" height="10" rx="2" fill="#fff"/>
                              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                            </svg>
                          ) : (
                            /* Open padlock */
                            <svg viewBox="0 0 24 24" width="20" height="20">
                              <rect x="5" y="11" width="14" height="10" rx="2" fill={isNearLock ? "var(--bp-primary)" : "#9CA3AF"}/>
                              <path d="M8 11V7a4 4 0 0 1 7-1.7" stroke={isNearLock ? "var(--bp-primary)" : "#9CA3AF"} strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                            </svg>
                          )}
                        </div>
                      )}

                      {/* Guide line removed — caused blue dashed line artifact on Android */}

                      {/* ── MIC BUTTON — follows finger fully ── */}
                      <button
                        onPointerDown={e => {
                          if (isRecording) return;
                          e.preventDefault();
                          // Block Android text-selection immediately (before async getUserMedia)
                          document.body.style.userSelect = "none";
                          (document.body.style as any).webkitUserSelect = "none";
                          recDragStartRef.current = { x: e.clientX, y: e.clientY };
                          recIsDraggingRef.current = true;
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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
                          width: SIZE, height: SIZE,
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
              })() : null}
            </div>
          </div>
        )}

        {/* ── ⋮ DROPDOWN MENU ── */}
        {showConvMenu && (
          <>
            <div style={{ position:"fixed", inset:0, zIndex:98 }} onClick={() => { setShowConvMenu(false); setShowNotifSub(false); }} />
            <div style={{ position:"fixed", top:50, right:6, background:"#fff", borderRadius:16, boxShadow:"0 3px 16px rgba(0,0,0,0.16)", zIndex:10001, minWidth:"min(200px, calc(100vw - 16px))", maxWidth:"calc(100vw - 16px)", overflow:"hidden", animation:"fbl-fade-in 0.12s ease" }}
              onClick={e => e.stopPropagation()}>
              <button className="fbl-menu-btn" onClick={() => setShowNotifSub(n => !n)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#555"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                <span style={{ flex:1 }}>Notifications</span>
                <span style={{ color:"#bbb", fontSize:16, transition:"transform 0.2s", transform: showNotifSub ? "rotate(90deg)" : "none" }}>›</span>
              </button>
              {showNotifSub && (
                <div style={{ background:"#F8FAFC", borderTop:"1px solid #E5E7EB", borderBottom:"1px solid #E5E7EB" }}>
                  <button className="fbl-menu-btn" style={{ paddingLeft:36, fontSize:14, color:"#555" }} onClick={() => setShowNotifSub(false)}>
                    <span style={{ fontSize:14 }}>‹</span> <span>Retour</span>
                  </button>
                  <button className="fbl-menu-btn" style={{ paddingLeft:36, fontSize:14 }}>🔕 Couper le son</button>
                  <button className="fbl-menu-btn" style={{ paddingLeft:36, fontSize:14 }}>⏱ Désactiver pour…</button>
                  <button className="fbl-menu-btn" style={{ paddingLeft:36, fontSize:14 }}>⚙️ Personnaliser</button>
                  <button className="fbl-menu-btn" style={{ paddingLeft:36, fontSize:14, color:"#EF4444" }} onClick={() => setShowConvMenu(false)}>🚫 Désactiver</button>
                </div>
              )}
              <button className="fbl-menu-btn" onClick={() => { sig.startCall(activeConv, "video"); setShowConvMenu(false); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#555"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                Appel vidéo
              </button>
              <button className="fbl-menu-btn" onClick={() => { setShowChatSearch(true); setShowConvMenu(false); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#555"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                Rechercher
              </button>
              <button className="fbl-menu-btn" onClick={() => { setPendingThemeKey(convThemeKey); setPendingWpKey(convWpKey); setShowWallpaper(true); setShowConvMenu(false); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#555"><path d="M21 3H3C2 3 1 4 1 5v14c0 1.1.9 2 2 2h18c1 0 2-1 2-2V5c0-1-1-2-2-2zM5 17l3.5-4.5 2.5 3.01L14.5 11l4.5 6H5z"/></svg>
                Fond d'écran
              </button>
              <div style={{ height:1, background:"#F1F5F9" }} />
              <button className="fbl-menu-btn" onClick={async () => {
                const id = activeConv!;
                setMessages(prev => ({ ...prev, [id]: [] }));
                setConvList(prev => prev.map(c => c.id === id ? { ...c, lastMessage: "", unread: 0 } : c));
                setShowConvMenu(false);
                await apiDeleteConversation(id).catch(() => {});
              }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#555"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                Effacer l'historique
              </button>
              <button className="fbl-menu-btn" style={{ color:"#EF4444" }} onClick={() => { setShowDeleteConv(true); setShowConvMenu(false); }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#EF4444"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 2.75c1.24 0 2.25 1.01 2.25 2.25S13.24 11.25 12 11.25 9.75 10.24 9.75 9 10.76 6.75 12 6.75zM17 17H7v-.75c0-1.67 3.33-2.5 5-2.5s5 .83 5 2.5V17z"/></svg>
                Supprimer l'échange
              </button>
            </div>
          </>
        )}

        {/* long-press modal removed — handled inline by selection header + bottom bar */}

        {/* ── WALLPAPER / THEME SELECTOR PREMIUM ── */}
        {showWallpaper && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:10001, display:"flex", flexDirection:"column", justifyContent:"flex-end", animation:"fbl-fade-in 0.18s ease" }}
            onClick={() => setShowWallpaper(false)}>
            <div style={{ background:"#fff", borderRadius:"24px 24px 0 0", maxHeight:"82dvh", overflowY:"auto", animation:"fbl-sheet-up 0.25s ease" }}
              onClick={e => e.stopPropagation()}>

              {/* Drag handle */}
              <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 0" }}>
                <div style={{ width:36, height:4, borderRadius:2, background:"#E5E7EB" }} />
              </div>

              {/* Title */}
              <div style={{ padding:"14px 20px 6px", fontWeight:800, fontSize:17, color:"#111827", textAlign:"center" }}>
                Personnaliser la conversation
              </div>

              {/* ── Live preview strip ── */}
              <div style={{ margin:"8px 16px 0", borderRadius:16, overflow:"hidden", border:"1px solid #E5E7EB",
                ...(pendingWpKey !== "none" && wpUrl(pendingWpKey) ? { backgroundImage:`url(${wpUrl(pendingWpKey)})`, backgroundSize:"cover", backgroundPosition:"center" } : { background: CONV_THEMES[pendingThemeKey].bg }) }}>
                <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:6 }}>
                  {/* Received */}
                  <div style={{ display:"flex", justifyContent:"flex-start" }}>
                    <div style={{ background:CONV_THEMES[pendingThemeKey].theirs, color:CONV_THEMES[pendingThemeKey].theirsText, borderRadius:"8px 8px 8px 2px", padding:"7px 11px", fontSize:12.5, maxWidth:"62%", boxShadow:"0 1px 2px rgba(0,0,0,0.10)" }}>
                      Salut ! Comment tu vas ? 😊
                    </div>
                  </div>
                  {/* Sent */}
                  <div style={{ display:"flex", justifyContent:"flex-end" }}>
                    <div style={{ background:CONV_THEMES[pendingThemeKey].mine, color:CONV_THEMES[pendingThemeKey].mineText, borderRadius:"8px 8px 2px 8px", padding:"7px 11px", fontSize:12.5, maxWidth:"62%", boxShadow:"0 1px 2px rgba(0,0,0,0.12)" }}>
                      Très bien merci ! Et toi ? 🙌
                    </div>
                  </div>
                  {/* Received */}
                  <div style={{ display:"flex", justifyContent:"flex-start" }}>
                    <div style={{ background:CONV_THEMES[pendingThemeKey].theirs, color:CONV_THEMES[pendingThemeKey].theirsText, borderRadius:"8px 8px 8px 2px", padding:"7px 11px", fontSize:12.5, maxWidth:"55%", boxShadow:"0 1px 2px rgba(0,0,0,0.10)" }}>
                      Super ! 🎉
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Couleurs de discussion ── */}
              <div style={{ padding:"18px 16px 4px" }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#111827", marginBottom:12 }}>Couleurs de discussion</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8 }}>
                  {(Object.entries(CONV_THEMES) as [ThemeKey, typeof CONV_THEMES[ThemeKey]][]).map(([key, t]) => {
                    const sel = pendingThemeKey === key;
                    return (
                      <div key={key} onClick={() => setPendingThemeKey(key)}
                        style={{ cursor:"pointer", borderRadius:14, border: sel ? `2.5px solid var(--bp-primary)` : "2px solid #E5E7EB", overflow:"hidden", position:"relative", transition:"border-color 0.15s", boxShadow: sel ? "0 0 0 3px rgba(22,194,74,0.18)" : "none" }}>
                        {/* Mini preview */}
                        <div style={{ background:t.bg, padding:"6px 6px 4px", display:"flex", flexDirection:"column", gap:3 }}>
                          {/* Their bubble */}
                          <div style={{ background:t.theirs, borderRadius:"5px 5px 5px 1px", height:8, width:"68%", boxShadow:"0 1px 1px rgba(0,0,0,0.08)" }} />
                          {/* Mine bubble */}
                          <div style={{ background:t.mine, borderRadius:"5px 5px 1px 5px", height:8, width:"55%", alignSelf:"flex-end", boxShadow:"0 1px 2px rgba(0,0,0,0.14)" }} />
                          {/* Their bubble 2 */}
                          <div style={{ background:t.theirs, borderRadius:"5px 5px 5px 1px", height:6, width:"50%", boxShadow:"0 1px 1px rgba(0,0,0,0.08)", marginBottom:2 }} />
                        </div>
                        {/* Label */}
                        <div style={{ background:"#fff", padding:"3px 4px 5px", textAlign:"center" }}>
                          <span style={{ fontSize:9.5, fontWeight: sel ? 700 : 500, color: sel ? "var(--bp-primary)" : "#64748B", lineHeight:1.1, display:"block" }}>{t.label}</span>
                        </div>
                        {/* Selected badge */}
                        {sel && (
                          <div style={{ position:"absolute", top:4, right:4, width:16, height:16, borderRadius:"50%", background:"var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Fond d'écran ── */}
              <div style={{ padding:"16px 16px 4px" }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#111827", marginBottom:12 }}>Fond d'écran</div>
                <div style={{ display:"flex", gap:8, overflowX:"auto", scrollbarWidth:"none", paddingBottom:4 }}>
                  {CONV_WALLPAPERS.map(w => {
                    const sel = pendingWpKey === w.key;
                    const url = wpUrl(w.key as WallpaperKey);
                    return (
                      <div key={w.key} onClick={() => setPendingWpKey(w.key as WallpaperKey)}
                        style={{ flexShrink:0, width:72, cursor:"pointer", borderRadius:14, overflow:"hidden", border: sel ? "2.5px solid var(--bp-primary)" : "2px solid #E5E7EB", position:"relative", boxShadow: sel ? "0 0 0 3px rgba(22,194,74,0.18)" : "0 2px 8px rgba(0,0,0,0.10)", transition:"all 0.15s" }}>
                        {url ? (
                          <img src={url} alt={w.label} style={{ width:"100%", height:72, objectFit:"cover", display:"block" }} />
                        ) : (
                          <div style={{ width:"100%", height:72, background:"#F0FDF4", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          </div>
                        )}
                        <div style={{ background:"#fff", padding:"3px 2px 5px", textAlign:"center", fontSize:9.5, fontWeight: sel ? 700 : 500, color: sel ? "var(--bp-primary)" : "#64748B", lineHeight:1.2 }}>{w.label}</div>
                        {sel && (
                          <div style={{ position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%", background:"var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}>
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Appliquer button ── */}
              <div style={{ padding:"16px 16px 32px" }}>
                <button onClick={() => {
                  setConvThemeKey(pendingThemeKey);
                  setConvWpKey(pendingWpKey);
                  setConvWallpaper(null);
                  setShowWallpaper(false);
                  if (activeConv) {
                    localStorage.setItem(`bp_theme_${activeConv}`, pendingThemeKey);
                    localStorage.setItem(`bp_wp_${activeConv}`, pendingWpKey);
                  }
                }}
                  style={{ width:"100%", background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary))", border:"none", borderRadius:99, padding:"15px", fontSize:16, fontWeight:800, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 18px rgba(22,194,74,0.45)", letterSpacing:0.2 }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUPPRIMER L'ÉCHANGE DIALOG ── */}
        {showDeleteConv && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10001, padding:"0 20px", animation:"fbl-fade-in 0.18s ease" }}
            onClick={e => { if (e.target === e.currentTarget) setShowDeleteConv(false); }}>
            <div style={{ background:"#fff", borderRadius:28, width:"100%", maxWidth:360, boxShadow:"0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)", overflow:"hidden", animation:"fbl-sheet-up 0.22s ease" }}
              onClick={e => e.stopPropagation()}>

              {/* Top icon area */}
              <div style={{ padding:"32px 24px 20px", textAlign:"center" }}>
                {/* Trash icon in layered circles */}
                <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
                  <div style={{ width:88, height:88, borderRadius:"50%", background:"rgba(239,68,68,0.10)" }} />
                  <div style={{ position:"absolute", width:66, height:66, borderRadius:"50%", background:"rgba(239,68,68,0.16)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <div style={{ fontWeight:800, fontSize:20, color:"#111827", marginBottom:8, letterSpacing:-0.3 }}>
                  Supprimer la discussion
                </div>

                {/* Subtitle */}
                <div style={{ fontSize:14, color:"#64748B", lineHeight:1.6, marginBottom:0 }}>
                  Cette action supprimera définitivement votre conversation avec <strong style={{ color:"#111827" }}>{activeUser?.name ?? "cet utilisateur"}</strong>.
                </div>
              </div>

              {/* Divider */}
              <div style={{ height:1, background:"#F1F5F9", margin:"0 0" }} />

              {/* User card */}
              <div style={{ padding:"16px 24px", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:46, height:46, borderRadius:"50%", background: activeUser?.color ?? "var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color:"#fff", fontWeight:800, fontSize:17 }}>{activeUser?.initials ?? "?"}</span>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ fontWeight:700, fontSize:15, color:"#111827" }}>{activeUser?.name ?? "Utilisateur"}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="var(--bp-primary)"/>
                      <polyline points="8,12 11,15 16,9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </div>
                  <div style={{ fontSize:13, color:"#9CA3AF", marginTop:1 }}>Hors ligne</div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height:1, background:"#F1F5F9" }} />

              {/* Checkbox option */}
              <label style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 24px", cursor:"pointer" }}>
                {/* Custom checkbox */}
                <div onClick={() => setDeleteForAll(v => !v)}
                  style={{ width:22, height:22, borderRadius:6, border: deleteForAll ? "none" : "2px solid #E5E7EB", background: deleteForAll ? "var(--bp-primary)" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" }}>
                  {deleteForAll && (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize:14, color:"#111827", fontWeight:500 }}>
                  Supprimer également pour <strong style={{ color:"#111827" }}>{activeUser?.name ?? "cet utilisateur"}</strong>
                </span>
              </label>

              {/* Divider */}
              <div style={{ height:1, background:"#F1F5F9" }} />

              {/* Action buttons */}
              <div style={{ display:"flex", gap:10, padding:"16px 20px 20px" }}>
                <button onClick={() => setShowDeleteConv(false)}
                  style={{ flex:1, background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:50, padding:"13px", fontSize:15, fontWeight:700, color:"var(--bp-primary)", cursor:"pointer" }}>
                  Annuler
                </button>
                <button onClick={async () => {
                  const id = activeConv!;
                  if (deleteForAll) {
                    await apiDeleteConversation(id).catch(() => {});
                  } else {
                    const hiddenKey = "bp_hidden_convs";
                    const hidden: number[] = JSON.parse(localStorage.getItem(hiddenKey) ?? "[]");
                    if (!hidden.includes(id)) localStorage.setItem(hiddenKey, JSON.stringify([...hidden, id]));
                  }
                  setMessages(prev => { const n = { ...prev }; delete n[id]; return n; });
                  setConvList(prev => prev.filter(c => c.id !== id));
                  setActiveConv(null);
                  setShowDeleteConv(false);
                  setDeleteForAll(false);
                }}
                  style={{ flex:1.4, background:"linear-gradient(135deg,#EF4444,#EF4444)", border:"none", borderRadius:50, padding:"13px 18px", fontSize:15, fontWeight:700, color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7, boxShadow:"0 4px 14px rgba(239,68,68,0.4)" }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file inputs — PERMANENTS, hors portal pour survivre à la fermeture de la sheet */}
        <input ref={galleryInputRef} type="file" accept="image/*" style={{ display:"none" }}
          onChange={e => { const f=e.target.files?.[0]; if(f) handleFileInput(f,"image"); e.target.value=""; }} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }}
          onChange={e => { const f=e.target.files?.[0]; if(f) handleFileInput(f,"image"); e.target.value=""; }} />
        <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.csv,.zip" style={{ display:"none" }}
          onChange={e => { const f=e.target.files?.[0]; if(f) handleFileInput(f,"doc"); e.target.value=""; }} />

        {/* ── ATTACHMENT SHEET ── */}
        {attachSheet && createPortal(
          <div style={{ position:"fixed", inset:0, zIndex:10002, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
            <div style={{ background:"rgba(0,0,0,0.45)", position:"absolute", inset:0 }} onClick={() => { setAttachSheet(false); setAttachPage("none"); }} />
            <div style={{ background:"#fff", borderRadius:"22px 22px 0 0", position:"relative", zIndex:1, animation:"fbl-sheet-up 0.22s cubic-bezier(.2,.8,.2,1)", boxShadow:"0 -2px 20px rgba(0,0,0,0.08)", maxHeight:"90dvh", overflowY:"auto" }}>

              {/* MAIN ICONS — Telegram Premium single row */}
              {attachPage === "none" && (
                <>
                  <div style={{ width:36, height:4, background:"#E5E7EB", borderRadius:2, margin:"10px auto 6px" }} />
                  <div style={{ display:"flex", flexDirection:"row", justifyContent:"space-evenly", alignItems:"center",
                    padding:"6px 4px 18px", overflowX:"auto" }}>

                    {/* 1 — GALERIE (actif) */}
                    <button className="tg-attach-btn" onClick={() => { galleryInputRef.current?.click(); setAttachSheet(false); }}>
                      <div className="tg-attach-box" style={{ background:"#DCFCE7" }}>
                        <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                          <rect x="3" y="6" width="22" height="16" rx="3" stroke="#0EA5E9" strokeWidth="1.8"/>
                          <circle cx="9" cy="11" r="2" fill="#0EA5E9" opacity="0.8"/>
                          <path d="M3 18l6-6 4.5 4.5 3-3 7.5 7.5" stroke="#0EA5E9" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{ color:"#0EA5E9" }}>Gallery</span>
                    </button>

                    {/* 2 — CAMÉRA */}
                    <button className="tg-attach-btn" onClick={() => { cameraInputRef.current?.click(); setAttachSheet(false); }}>
                      <div className="tg-attach-box">
                        <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                          <rect x="3" y="9" width="22" height="14" rx="3" stroke="#1E293B" strokeWidth="1.8"/>
                          <path d="M10.5 9V7.5C10.5 6.95 10.95 6.5 11.5 6.5h5C17.05 6.5 17.5 6.95 17.5 7.5V9" stroke="#1E293B" strokeWidth="1.7" strokeLinecap="round"/>
                          <circle cx="14" cy="16" r="3.8" stroke="#1E293B" strokeWidth="1.7"/>
                          <circle cx="14" cy="16" r="1.6" fill="#1E293B"/>
                          <circle cx="20.5" cy="11.5" r="1" fill="#1E293B"/>
                        </svg>
                      </div>
                      <span>Caméra</span>
                    </button>

                    {/* 3 — FICHIER */}
                    <button className="tg-attach-btn" onClick={() => { docInputRef.current?.click(); setAttachSheet(false); }}>
                      <div className="tg-attach-box">
                        <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                          <path d="M8 4h8l6 6v14H8V4z" stroke="#1E293B" strokeWidth="1.8" strokeLinejoin="round"/>
                          <path d="M16 4v6h6" stroke="#1E293B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="11" y1="14" x2="17" y2="14" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round"/>
                          <line x1="11" y1="17.5" x2="17" y2="17.5" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round"/>
                          <line x1="11" y1="21" x2="15" y2="21" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span>File</span>
                    </button>

                    {/* 4 — LOCALISATION */}
                    <button className="tg-attach-btn" onClick={() => { handleLocation(); setAttachSheet(false); }}>
                      <div className="tg-attach-box">
                        <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                          <path d="M14 3C10.13 3 7 6.13 7 10C7 15.25 14 25 14 25C14 25 21 15.25 21 10C21 6.13 17.87 3 14 3Z" stroke="#1E293B" strokeWidth="1.8" strokeLinejoin="round"/>
                          <circle cx="14" cy="10" r="3" stroke="#1E293B" strokeWidth="1.6"/>
                        </svg>
                      </div>
                      <span>Location</span>
                    </button>

                    {/* 5 — SONDAGE */}
                    <button className="tg-attach-btn" onClick={() => setAttachPage("poll")}>
                      <div className="tg-attach-box">
                        <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                          <rect x="5.5" y="9" width="4.5" height="13" rx="2" stroke="#1E293B" strokeWidth="1.7"/>
                          <rect x="11.75" y="13" width="4.5" height="9" rx="2" stroke="#1E293B" strokeWidth="1.7"/>
                          <rect x="18" y="17" width="4.5" height="5" rx="2" stroke="#1E293B" strokeWidth="1.7"/>
                          <line x1="4" y1="22.5" x2="24" y2="22.5" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span>Poll</span>
                    </button>

                    {/* 6 — CHECKLIST */}
                    <button className="tg-attach-btn" onClick={() => setAttachPage("poll")}>
                      <div className="tg-attach-box">
                        <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                          <rect x="5" y="5" width="18" height="18" rx="4" stroke="#1E293B" strokeWidth="1.8"/>
                          <path d="M9 14l3.5 3.5L19 10" stroke="#1E293B" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>Checklist</span>
                    </button>

                    {/* 7 — CONTACT */}
                    <button className="tg-attach-btn" onClick={() => setAttachPage("contacts")}>
                      <div className="tg-attach-box">
                        <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                          <circle cx="14" cy="10" r="5" stroke="#1E293B" strokeWidth="1.8"/>
                          <path d="M5 26C5 20.48 9 17 14 17C19 17 23 20.48 23 26" stroke="#1E293B" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span>Contact</span>
                    </button>

                  </div>
                </>
              )}

              {/* SONDAGE */}
              {attachPage === "poll" && (
                <div style={{ padding:"16px 18px 24px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
                    <button onClick={() => setAttachPage("none")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"#555", padding:0 }}>‹</button>
                    <div style={{ fontWeight:800, fontSize:17 }}>Créer un sondage</div>
                  </div>
                  <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Question…"
                    style={{ width:"100%", border:"none", borderBottom:"2px solid var(--bp-primary)", padding:"8px 0", fontSize:16, outline:"none", marginBottom:16, boxSizing:"border-box" }} />
                  <div style={{ fontSize:11, color:"#999", fontWeight:600, marginBottom:10, textTransform:"uppercase" as const }}>Options</div>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                      <input value={opt} onChange={e => { const o=[...pollOptions]; o[idx]=e.target.value; setPollOptions(o); }} placeholder={`Option ${idx+1}`}
                        style={{ flex:1, border:"none", borderBottom:"1.5px solid #E5E7EB", padding:"8px 0", fontSize:15, outline:"none" }} />
                      {pollOptions.length > 2 && (
                        <button onClick={() => setPollOptions(o => o.filter((_,i) => i !== idx))} style={{ background:"none", border:"none", cursor:"pointer", color:"#EF4444", fontSize:20, padding:0 }}>✕</button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setPollOptions(o => [...o, ""])} style={{ background:"none", border:"none", color:"var(--bp-primary)", fontSize:15, fontWeight:700, cursor:"pointer", padding:"4px 0", marginBottom:16 }}>+ Ajouter une option</button>
                  <label style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, cursor:"pointer" }}>
                    <input type="checkbox" checked={pollMultiple} onChange={e => setPollMultiple(e.target.checked)} style={{ width:18, height:18, accentColor:"var(--bp-primary)" }} />
                    <span style={{ fontSize:14 }}>Autoriser plusieurs réponses</span>
                  </label>
                  <button
                    onClick={async () => {
                      if (pollCreating) return;
                      const validOptions = pollOptions.filter(o => o.trim());
                      if (!pollQuestion.trim() || validOptions.length < 2) return;

                      const recipientId = activeConv;
                      if (!recipientId) return;

                      setPollCreating(true);
                      const oldQ = pollQuestion;
                      const expiresAt = new Date(Date.now() + 48 * 3600000).toISOString();

                      try {
                        const { apiCreatePoll } = await import("../lib/api");
                        const { message: m, poll } = await apiCreatePoll({
                          recipientId,
                          question: oldQ.trim(),
                          options: validOptions,
                          multipleChoice: pollMultiple,
                          expiresAt
                        });

                        setPollQuestion(""); setPollOptions(["",""]); setPollMultiple(true);
                        setAttachSheet(false); setAttachPage("none");

                        const time = new Date().toLocaleTimeString("fr",{hour:"2-digit",minute:"2-digit"});

                        if (activeConv) {
                          setMessages(prev => {
                            const list = [...(prev[activeConv] ?? [])];
                            list.push({
                              id: m.id,
                              text: m.content || "",
                              mine: true,
                              time,
                              status: "sent",
                              attachment: { type: "poll", label: String(poll.id) }
                            });
                            return { ...prev, [activeConv]: list };
                          });
                        }
                      } catch (err: any) {
                        import("sonner").then(({ toast }) => toast.error("Erreur lors de la création du sondage"));
                      } finally {
                        setPollCreating(false);
                      }
                    }}
                    disabled={!pollQuestion.trim() || pollOptions.filter(o=>o.trim()).length < 2 || pollCreating}
                    style={{ width:"100%", background: pollQuestion.trim() && pollOptions.filter(o=>o.trim()).length>=2 ? "var(--bp-primary)":"#E5E7EB", border:"none", borderRadius:30, padding:"15px", fontSize:16, fontWeight:800, color: pollQuestion.trim() && pollOptions.filter(o=>o.trim()).length>=2 ? "#fff":"#999", cursor:"pointer", transition:"all 0.2s" }}>
                    Envoyer le sondage
                  </button>
                </div>
              )}

              {/* ÉVÉNEMENT */}
              {attachPage === "event" && (
                <div style={{ padding:"16px 18px 24px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
                    <button onClick={() => setAttachPage("none")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"#555", padding:0 }}>‹</button>
                    <div style={{ fontWeight:800, fontSize:17 }}>Créer un événement</div>
                  </div>
                  <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Nom de l'événement"
                    style={{ width:"100%", border:"none", borderBottom:"2px solid var(--bp-primary)", padding:"8px 0", fontSize:18, fontWeight:700, outline:"none", marginBottom:16, boxSizing:"border-box" }} />
                  <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Description (optionnel)"
                    style={{ width:"100%", border:"none", borderBottom:"1.5px solid #E5E7EB", padding:"8px 0", fontSize:14, outline:"none", resize:"none" as const, height:56, marginBottom:16, boxSizing:"border-box", fontFamily:"inherit" }} />
                  <div style={{ display:"flex", gap:12, marginBottom:20 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:"#999", fontWeight:600, marginBottom:4 }}>DATE</div>
                      <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                        style={{ width:"100%", border:"none", borderBottom:"1.5px solid #E5E7EB", padding:"6px 0", fontSize:15, outline:"none", boxSizing:"border-box" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:"#999", fontWeight:600, marginBottom:4 }}>HEURE</div>
                      <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
                        style={{ width:"100%", border:"none", borderBottom:"1.5px solid #E5E7EB", padding:"6px 0", fontSize:15, outline:"none", boxSizing:"border-box" }} />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!eventName.trim()) return;
                      const text = `📅 ${eventName}${eventDesc.trim()?`\n${eventDesc}`:""}\n🗓 ${eventDate} à ${eventTime}`;
                      setMessages(prev => {
                        const list = [...(prev[activeConv!] ?? [])];
                        list.push({ id:Date.now(), text, mine:true, time:new Date().toLocaleTimeString("fr",{hour:"2-digit",minute:"2-digit"}), status:"sent" });
                        return { ...prev, [activeConv!]: list };
                      });
                      setEventName(""); setEventDesc("");
                      setAttachSheet(false); setAttachPage("none");
                    }}
                    disabled={!eventName.trim()}
                    style={{ width:"100%", background: eventName.trim()?"var(--bp-primary)":"#E5E7EB", border:"none", borderRadius:30, padding:"15px", fontSize:16, fontWeight:800, color: eventName.trim()?"#fff":"#999", cursor:"pointer", transition:"all 0.2s" }}>
                    Envoyer l'événement
                  </button>
                </div>
              )}

              {/* CONTACTS */}
              {attachPage === "contacts" && (
                <div style={{ padding:"16px 0 24px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8, padding:"0 18px" }}>
                    <button onClick={() => setAttachPage("none")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"#555", padding:0 }}>‹</button>
                    <div style={{ fontWeight:800, fontSize:17 }}>Partager un contact</div>
                  </div>
                  {allUsers.filter(u => u.id !== currentUser.id).slice(0,20).map(u => (
                    <button key={u.id} onClick={() => {
                       sendAttachMsg({ type:"contact", label:String(u.id) }, "", `__contact__:${u.id}`);
                      setAttachSheet(false); setAttachPage("none");
                    }} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none", padding:"12px 18px", cursor:"pointer", textAlign:"left" as const }}>
                      <div className="avatar" style={{ width:46, height:46, fontSize:16, flexShrink:0 }}>{`${u.firstName[0]}${u.lastName[0]}`.toUpperCase()}</div>
                      <div style={{ fontWeight:600, fontSize:15, color:"#111" }}>{u.firstName} {u.lastName}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* IMAGES D'IA */}
              {attachPage === "ai" && (
                <div style={{ padding:"16px 18px 28px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
                    <button onClick={() => setAttachPage("none")} style={{ background:"none", border:"none", cursor:"pointer", fontSize:22, color:"#555", padding:0 }}>‹</button>
                    <div style={{ fontWeight:800, fontSize:17 }}>Générer une image IA</div>
                  </div>
                  <div style={{ background:"linear-gradient(135deg,#0EA5E9,#8B5CF6)", borderRadius:14, padding:"16px", marginBottom:18, textAlign:"center" }}>
                    <div style={{ fontSize:36, marginBottom:8 }}>🤖✨</div>
                    <div style={{ color:"#fff", fontSize:13, lineHeight:1.5, fontWeight:500 }}>Décris l'image que tu veux générer et elle sera envoyée dans la conversation.</div>
                  </div>
                  <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Ex : un lion majestueux au coucher du soleil sur la savane africaine…"
                    rows={4}
                    style={{ width:"100%", border:"1.5px solid #E5E7EB", borderRadius:12, padding:"12px 14px", fontSize:15, outline:"none", resize:"none" as const, boxSizing:"border-box" as const, fontFamily:"inherit", marginBottom:16 }} />
                  <button
                    disabled={!aiPrompt.trim() || aiLoading}
                    onClick={async () => {
                      if (!aiPrompt.trim() || aiLoading) return;
                      setAiLoading(true);
                      try {
                        const r = await fetch("/api/ai/image", {
                          method:"POST",
                          headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("bp_token")||""}`},
                          body:JSON.stringify({ prompt: aiPrompt.trim() })
                        });
                        if (!r.ok) throw new Error("Génération impossible");
                        const d = await r.json() as { url?: string };
                        if (d.url) {
                          sendAttachMsg({ type:"image", label:d.url, extra:aiPrompt.trim() }, "🤖 Image générée par IA", `__image__:${d.url}:${aiPrompt.trim()}:0`);
                          setAiPrompt(""); setAttachSheet(false); setAttachPage("none");
                        }
                      } catch {
                        const text = `🤖 Image IA : "${aiPrompt.trim()}"`;
                        const fallbackUrl = `https://placehold.co/400x300/00BCD4/fff?text=${encodeURIComponent(aiPrompt.trim().slice(0,40))}`;
                        sendAttachMsg({ type:"image", label:fallbackUrl, extra:aiPrompt.trim() }, text, `__image__:${fallbackUrl}:${aiPrompt.trim()}:0`);
                        setAiPrompt(""); setAttachSheet(false); setAttachPage("none");
                      }
                      setAiLoading(false);
                    }}
                    style={{ width:"100%", background: aiPrompt.trim()&&!aiLoading?"linear-gradient(135deg,#0EA5E9,#8B5CF6)":"#E5E7EB", border:"none", borderRadius:30, padding:"15px", fontSize:16, fontWeight:800, color: aiPrompt.trim()&&!aiLoading?"#fff":"#999", cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    {aiLoading ? <><span style={{ animation:"fbl-rec-pulse 1s infinite", display:"inline-block" }}>⏳</span> Génération…</> : "✨ Générer et envoyer"}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     INBOX — Premium 2026
  ══════════════════════════════════════════════════════════════ */
  const totalUnread = convList.reduce((s, c) => s + c.unread, 0) + chatGroups.reduce((s, g) => s + g.unread, 0);

  const visibleConvs = filteredConvs.filter(c =>
    inboxTab === "groups" ? false :
    inboxTab === "unread" ? c.unread > 0 : true
  );
  const visibleGroups = chatGroups.filter(g =>
    (inboxTab === "all" || inboxTab === "groups") &&
    (inboxTab === "unread" ? g.unread > 0 : true) &&
    (!search || g.name.toLowerCase().includes(search.toLowerCase()))
  );

  /* ══════════════════════════════════════════════════════════════
     CHANNEL — Chat / Edit / Members view
  ══════════════════════════════════════════════════════════════ */
  if (activeChId !== null) {
    const ch = chConvs.find(c => c.id === activeChId);
    if (!ch) { setActiveChId(null); }
    else {
      const chCol = CONV_COLORS[ch.id % CONV_COLORS.length];
      const chInitials = mkInitials(ch.name);
      const handleChSend = () => {
        if (!chInput.trim()) return;
        const msg = { id: Date.now(), text: chInput.trim(), time: new Date().toLocaleTimeString("fr",{hour:"2-digit",minute:"2-digit"}) };
        setChConvs(prev => prev.map(c => c.id === activeChId ? {...c, msgs:[...c.msgs, msg]} : c));
        setChInput("");
      };
      const chMenuItems = [
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>, label:"Rechercher", action:()=>{ setChMenuOpen(false); } },
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, label:"Notifications", action:()=>{ setChMenuOpen(false); } },
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label:"Modifier le canal", action:()=>{ setChEditName(ch.name); setChEditDesc(ch.desc); setChEditLink(ch.link); setChEditType(ch.type); setChEditLinkAvail(null); setChViewPage("edit"); setChMenuOpen(false); } },
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, label:"Gérer les abonnés", action:()=>{ setChViewPage("members"); setChMenuOpen(false); } },
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>, label:"Copier le lien", action:()=>{ navigator.clipboard?.writeText(`https://brutepawa.com/c/${ch.link||ch.id}`); setChMenuOpen(false); } },
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>, label:"Partager le canal", action:()=>setChMenuOpen(false) },
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, label:"Booster le canal", action:()=>setChMenuOpen(false) },
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>, label:"Signaler", labelColor:"#EF4444", action:()=>setChMenuOpen(false) },
        { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>, label:"Supprimer le canal", labelColor:"#EF4444", action:()=>{ setChConvs(prev=>prev.filter(c=>c.id!==activeChId)); setActiveChId(null); setChMenuOpen(false); } },
      ];

      /* ── EDIT PAGE ── */
      if (chViewPage === "edit") return createPortal(
        <div style={{position:"fixed",inset:0,background:"#F8FAFC",zIndex:10001,display:"flex",flexDirection:"column"}}>
          <div style={{background:"#fff",display:"flex",alignItems:"center",padding:"0 4px",height:56,boxShadow:"0 1px 0 rgba(0,0,0,0.09)",flexShrink:0}}>
            <button onClick={()=>setChViewPage("chat")} style={{background:"none",border:"none",cursor:"pointer",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{flex:1,fontWeight:700,fontSize:16.5,color:"#111"}}>Modifier le canal</div>
            <button onClick={()=>{
              if(!chEditName.trim()) return;
              setChConvs(prev=>prev.map(c=>c.id===activeChId?{...c,name:chEditName.trim(),desc:chEditDesc.trim(),type:chEditType,link:chEditType==="public"?chEditLink:c.link}:c));
              setChViewPage("chat");
            }} style={{background:"none",border:"none",cursor:"pointer",padding:"0 14px",color:"var(--bp-primary)",fontWeight:700,fontSize:16}}>✓</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 0"}}>
            {/* Avatar + Name */}
            <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)",padding:"16px",display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
              <div style={{width:74,height:74,borderRadius:"50%",background:chCol,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",cursor:"pointer"}}>
                <span style={{color:"#fff",fontWeight:700,fontSize:24}}>{chInitials}</span>
                <div style={{position:"absolute",bottom:1,right:1,width:22,height:22,borderRadius:"50%",background:"var(--bp-primary)",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
              </div>
              <div style={{flex:1}}>
                <input value={chEditName} onChange={e=>setChEditName(e.target.value)} placeholder="Nom du canal" style={{width:"100%",border:"none",borderBottom:"2px solid var(--bp-primary)",outline:"none",fontSize:16,fontWeight:600,color:"#111",padding:"6px 0",background:"transparent"}}/>
                <textarea value={chEditDesc} onChange={e=>setChEditDesc(e.target.value)} placeholder="Description (facultative)" rows={2} style={{width:"100%",border:"none",outline:"none",fontSize:14,color:"#64748B",marginTop:8,background:"transparent",resize:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
            {/* Type */}
            <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)",marginBottom:8}}>
              <div onClick={()=>{setChEditType("public");}} style={{display:"flex",alignItems:"center",padding:"16px",gap:12,cursor:"pointer",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${chEditType==="public"?"var(--bp-primary)":"#CBD5E1"}`,background:chEditType==="public"?"var(--bp-primary)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {chEditType==="public"&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
                <div><div style={{fontWeight:600,fontSize:15,color:"#111"}}>Canal public</div><div style={{fontSize:13,color:"#64748B"}}>Visible dans la recherche</div></div>
              </div>
              <div onClick={()=>setChEditType("private")} style={{display:"flex",alignItems:"center",padding:"16px",gap:12,cursor:"pointer"}}>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${chEditType==="private"?"var(--bp-primary)":"#CBD5E1"}`,background:chEditType==="private"?"var(--bp-primary)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {chEditType==="private"&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
                <div><div style={{fontWeight:600,fontSize:15,color:"#111"}}>Canal privé</div><div style={{fontSize:13,color:"#64748B"}}>Accessible via invitation uniquement</div></div>
              </div>
            </div>
            {/* Link (public) */}
            {chEditType==="public" && (
              <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)",padding:"16px",marginBottom:8}}>
                <div style={{fontSize:13,color:"#64748B",marginBottom:6}}>Lien public</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{fontSize:15,color:"#64748B",whiteSpace:"nowrap"}}>brutepawa.com/c/</span>
                  <input value={chEditLink} onChange={e=>{const v=e.target.value.replace(/[^a-z0-9_]/g,"").slice(0,30);setChEditLink(v);setChEditLinkAvail(v.length>=5?"ok":null);}} placeholder="nom_canal" style={{flex:1,border:"none",borderBottom:`2px solid ${chEditLinkAvail==="ok"?"var(--bp-primary)":chEditLinkAvail==="err"?"#EF4444":"#E5E7EB"}`,outline:"none",fontSize:15,color:"#111",padding:"4px 0",background:"transparent"}}/>
                  {chEditLinkAvail==="ok"&&<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                {chEditLinkAvail==="ok"&&<div style={{fontSize:12,color:"var(--bp-primary)",marginTop:4}}>{chEditLink} est disponible</div>}
              </div>
            )}
          </div>
        </div>
      , document.body);

      /* ── MEMBERS PAGE ── */
      if (chViewPage === "members") return createPortal(
        <div style={{position:"fixed",inset:0,background:"#F8FAFC",zIndex:10001,display:"flex",flexDirection:"column"}}>
          <div style={{background:"#fff",display:"flex",alignItems:"center",padding:"0 4px",height:56,boxShadow:"0 1px 0 rgba(0,0,0,0.09)",flexShrink:0}}>
            <button onClick={()=>setChViewPage("chat")} style={{background:"none",border:"none",cursor:"pointer",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:16.5,color:"#111"}}>Gérer les abonnés</div>
              <div style={{fontSize:12,color:"#64748B"}}>{ch.members.length} abonné{ch.members.length>1?"s":""} mix</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",background:"#F8FAFC",paddingTop:8}}>
            {/* Ajouter admin + Inviter */}
            <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",cursor:"pointer",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                </div>
                <div style={{fontWeight:600,fontSize:15,color:"var(--bp-primary)"}}>Ajouter un administrateur</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",cursor:"pointer"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <div style={{fontWeight:600,fontSize:15,color:"var(--bp-primary)"}}>Inviter via lien</div>
              </div>
            </div>
            {/* Members list */}
            <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)"}}>
              {/* Owner (me) */}
              <div style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:CONV_COLORS[meId%CONV_COLORS.length],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16,flexShrink:0}}>
                  {mkInitials("Moi")}
                </div>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:15,color:"#111"}}>Vous</div><div style={{fontSize:13,color:"#64748B"}}>en ligne</div></div>
                <span style={{fontSize:13,color:"#64748B",fontWeight:500}}>Propriétaire</span>
              </div>
              {ch.members.map((uid,i) => {
                const u = allUsers.find(x=>x.id===uid);
                const name = u ? (u.firstName&&u.lastName?`${u.firstName} ${u.lastName}`:u.name??`#${uid}`) : `#${uid}`;
                const isAdmin = ch.admins.includes(uid);
                return (
                  <div key={uid} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderBottom:i<ch.members.length-1?"1px solid rgba(0,0,0,0.06)":"none"}}>
                    <div style={{width:44,height:44,borderRadius:"50%",background:CONV_COLORS[uid%CONV_COLORS.length],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16,flexShrink:0}}>{mkInitials(name)}</div>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:15,color:"#111"}}>{name}</div><div style={{fontSize:13,color:"#64748B"}}>vu récemment</div></div>
                    {isAdmin&&<span style={{fontSize:13,color:"#64748B",fontWeight:500}}>Administrateur</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      , document.body);

      /* ── CHAT VIEW ── */
      return createPortal(
        <div style={{position:"fixed",inset:0,background:`url(${import.meta.env.BASE_URL}wallpapers/bp-chat-bg.jpg) center/cover no-repeat`,zIndex:10000,display:"flex",flexDirection:"column"}}
          onClick={()=>{if(chMenuOpen)setChMenuOpen(false);}}>
          <style>{`@keyframes ch-menu-in{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>

          {/* Header */}
          <div style={{background:"rgba(255,255,255,0.97)",display:"flex",alignItems:"center",padding:"6px 6px",boxShadow:"0 1px 4px rgba(0,0,0,0.1)",flexShrink:0,position:"relative"}}>
            <button onClick={()=>{setActiveChId(null);setChViewPage("chat");}} style={{background:"none",border:"none",cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{width:40,height:40,borderRadius:"50%",background:chCol,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginRight:10,color:"#fff",fontWeight:700,fontSize:16}}>{chInitials}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:16,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ch.name}</div>
              <div style={{fontSize:12,color:"#64748B"}}>{ch.members.length} abonné{ch.members.length!==1?"s":""} mix</div>
            </div>
            <button onClick={e=>{e.stopPropagation();setChMenuOpen(p=>!p);}} style={{background:"none",border:"none",cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#64748B"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
            </button>
            {/* ⋮ Dropdown */}
            {chMenuOpen && (
              <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:54,right:8,background:"#fff",borderRadius:10,boxShadow:"0 6px 30px rgba(0,0,0,0.15)",zIndex:20,minWidth:220,overflow:"hidden",animation:"ch-menu-in 0.15s ease"}}>
                {chMenuItems.map((item,i)=>(
                  <div key={i} onClick={item.action} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",cursor:"pointer",borderBottom:i<chMenuItems.length-1?"1px solid rgba(0,0,0,0.06)":"none"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    {item.icon}
                    <span style={{fontSize:15,fontWeight:500,color:(item as any).labelColor??(i>=7?"#EF4444":"#111")}}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"12px 10px",display:"flex",flexDirection:"column",gap:6}}>
            {/* System messages */}
            <div style={{alignSelf:"center",background:"rgba(0,0,0,0.35)",borderRadius:12,padding:"4px 12px",fontSize:12,color:"#fff",fontWeight:500}}>
              {new Date().toLocaleDateString("fr",{day:"numeric",month:"long"})}
            </div>
            <div style={{alignSelf:"center",background:"rgba(0,0,0,0.35)",borderRadius:12,padding:"4px 12px",fontSize:12,color:"#fff",fontWeight:500}}>Canal créé</div>
            {ch.desc && <div style={{alignSelf:"center",background:"rgba(0,0,0,0.35)",borderRadius:12,padding:"4px 12px",fontSize:12,color:"#fff",fontWeight:500}}>Description du canal mise à jour</div>}
            {ch.msgs.map(m=>(
              <div key={m.id} style={{display:"flex",justifyContent:"flex-start"}}>
                <div style={{maxWidth:"78%",background:"rgba(255,255,255,0.97)",borderRadius:"16px 16px 16px 4px",padding:"8px 12px 6px",fontSize:14.5,boxShadow:"0 1px 2px rgba(0,0,0,0.1)"}}>
                  {m.text}
                  <div style={{fontSize:10,color:"#888",textAlign:"right",marginTop:2}}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{background:"rgba(255,255,255,0.97)",padding:"8px 10px",display:"flex",alignItems:"center",gap:8,boxShadow:"0 -1px 4px rgba(0,0,0,0.06)",flexShrink:0}}>
            <button style={{background:"none",border:"none",cursor:"pointer",width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1.2" fill="#64748B"/><circle cx="15" cy="9" r="1.2" fill="#64748B"/></svg>
            </button>
            <input value={chInput} onChange={e=>setChInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleChSend();}}
              placeholder="Diffuser..."
              style={{flex:1,height:42,borderRadius:22,border:"1px solid #E5E7EB",outline:"none",padding:"0 14px",fontSize:15,background:"#fff"}}/>
            <button style={{background:"none",border:"none",cursor:"pointer",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <button style={{background:"none",border:"none",cursor:"pointer",width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
            {chInput.trim() ? (
              <button onClick={handleChSend} style={{width:44,height:44,borderRadius:"50%",background:"var(--bp-primary)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(34,197,94,0.4)"}}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            ) : (
              <button style={{width:44,height:44,borderRadius:"50%",background:"var(--bp-primary)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(34,197,94,0.4)"}}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
            )}
          </div>
        </div>
      , document.body);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     CHANNEL — Wizard (info → type → members)
  ══════════════════════════════════════════════════════════════ */
  if (chWiz !== "none") {
    const WIZ_COLORS = ["#EC4899","#8B5CF6","#F97316","var(--bp-primary)","#0EA5E9","#EF4444","#0EA5E9","#F59E0B","#6366F1","#8B5CF6"];
    const wizCol = (id:number) => WIZ_COLORS[id % WIZ_COLORS.length];
    const chFilteredUsers = allUsers.filter(u => u.id !== meId && (
      !chSearch.trim() || `${u.firstName??""} ${u.lastName??""}`.toLowerCase().includes(chSearch.toLowerCase()) || (u.name??"").toLowerCase().includes(chSearch.toLowerCase())
    ));
    const chSelectedArr = [...chMembers];

    const handleChCreate = () => {
      const newCh = { id: Date.now(), name: chName.trim(), desc: chDesc.trim(), type: chType, link: chLink, members: chSelectedArr, admins: [] as number[], msgs: [] };
      setChConvs(prev => [...prev, newCh]);
      setActiveChId(newCh.id);
      setChViewPage("chat");
      setChWiz("none");
    };

    return createPortal(
      <div style={{position:"fixed",inset:0,background:chWiz==="members"?"#fff":"#fff",zIndex:10000,display:"flex",flexDirection:"column"}}>
        <style>{`@keyframes ch-wiz-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}} @keyframes ch-check{from{transform:scale(0.4)}to{transform:scale(1)}} .ch-wiz-row:active{background:#F1F5F9!important}`}</style>

        {/* ── HEADER ── */}
        <div style={{display:"flex",alignItems:"center",padding:"0 4px",height:56,background:"#fff",borderBottom:"1px solid rgba(0,0,0,0.09)",flexShrink:0}}>
          <button onClick={()=>{
            if(chWiz==="info"){setChWiz("none");} else if(chWiz==="type"){setChWiz("info");} else {setChWiz("type");}
          }} style={{background:"none",border:"none",cursor:"pointer",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {chWiz==="info" ? <span style={{color:"var(--bp-primary)",fontSize:15,fontWeight:600}}>Annuler</span>
              : <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>}
          </button>
          <div style={{flex:1,fontWeight:700,fontSize:17,color:"#111"}}>
            {chWiz==="info"?"Nouveau canal":chWiz==="type"?"Type de canal":"Ajouter des abonnés"}
          </div>
          {chWiz==="info" && chName.trim().length>=1 && (
            <button onClick={()=>setChWiz("type")} style={{background:"none",border:"none",cursor:"pointer",padding:"0 16px",color:"var(--bp-primary)",fontWeight:700,fontSize:16}}>Continuer</button>
          )}
          {chWiz==="type" && (
            <button onClick={()=>{if(chType==="public"&&chLink.length<5)return;setChWiz("members");}} style={{background:"none",border:"none",cursor:"pointer",padding:"0 16px",color:chType==="private"||(chLink.length>=5)?"var(--bp-primary)":"#CBD5E1",fontWeight:700,fontSize:16}}>Continuer</button>
          )}
          {chWiz==="members" && (
            <button onClick={handleChCreate} style={{background:"none",border:"none",cursor:"pointer",padding:"0 16px"}}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--bp-primary)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          )}
        </div>

        {/* ── STEP 1: INFO ── */}
        {chWiz==="info" && (
          <div style={{flex:1,overflowY:"auto",background:"#F8FAFC"}}>
            <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)",padding:"20px 16px",display:"flex",alignItems:"flex-start",gap:16,marginTop:8}}>
              {/* Camera circle */}
              <div style={{width:74,height:74,borderRadius:"50%",background:"var(--bp-primary)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",position:"relative"}}>
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <div style={{position:"absolute",bottom:1,right:1,width:22,height:22,borderRadius:"50%",background:"var(--bp-primary)",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
              </div>
              <div style={{flex:1,paddingTop:8}}>
                <div style={{display:"flex",alignItems:"center",borderBottom:"2px solid var(--bp-primary)",paddingBottom:6,marginBottom:10}}>
                  <input autoFocus value={chName} onChange={e=>setChName(e.target.value)} placeholder="Nom du canal" style={{flex:1,border:"none",outline:"none",fontSize:17,fontWeight:600,color:"#111",background:"transparent"}}/>
                  <button style={{background:"none",border:"none",cursor:"pointer",padding:4,flexShrink:0}}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1.2" fill="#CBD5E1"/><circle cx="15" cy="9" r="1.2" fill="#CBD5E1"/></svg>
                  </button>
                </div>
                <textarea value={chDesc} onChange={e=>setChDesc(e.target.value)} placeholder="Description (facultative)" rows={3} style={{width:"100%",border:"none",outline:"none",fontSize:15,color:"#64748B",resize:"none",background:"transparent",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div style={{padding:"10px 16px"}}>
              <p style={{fontSize:13,color:"#64748B",margin:0,lineHeight:1.6}}>
                Vous pouvez ajouter une description facultative pour votre canal.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: TYPE ── */}
        {chWiz==="type" && (
          <div style={{flex:1,overflowY:"auto",background:"#F8FAFC"}}>
            <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)",marginTop:8}}>
              {/* Public */}
              <div onClick={()=>setChType("public")} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px",cursor:"pointer",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${chType==="public"?"var(--bp-primary)":"#CBD5E1"}`,background:chType==="public"?"var(--bp-primary)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,transition:"all 0.15s"}}>
                  {chType==="public"&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
                <div>
                  <div style={{fontWeight:600,fontSize:15.5,color:"#111",marginBottom:3}}>Canal public</div>
                  <div style={{fontSize:13.5,color:"#64748B",lineHeight:1.5}}>Les canaux publics sont visibles dans la recherche et tout le monde peut les rejoindre.</div>
                </div>
              </div>
              {/* Private */}
              <div onClick={()=>setChType("private")} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"16px",cursor:"pointer"}}>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${chType==="private"?"var(--bp-primary)":"#CBD5E1"}`,background:chType==="private"?"var(--bp-primary)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,transition:"all 0.15s"}}>
                  {chType==="private"&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
                <div>
                  <div style={{fontWeight:600,fontSize:15.5,color:"#111",marginBottom:3}}>Canal privé</div>
                  <div style={{fontSize:13.5,color:"#64748B",lineHeight:1.5}}>Les canaux privés ne peuvent être rejoints que via un lien d'invitation.</div>
                </div>
              </div>
            </div>
            {/* Link field (public) */}
            {chType==="public" && (
              <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)",padding:"16px",marginTop:8}}>
                <div style={{display:"flex",alignItems:"center",gap:6,borderBottom:`2px solid ${chLinkAvail==="ok"?"var(--bp-primary)":chLinkAvail==="err"?"#EF4444":"#E5E7EB"}`,paddingBottom:8,marginBottom:6}}>
                  <span style={{fontSize:15,color:"#64748B",whiteSpace:"nowrap",flexShrink:0}}>brutepawa.com/c/</span>
                  <input autoFocus={chType==="public"} value={chLink} onChange={e=>{
                    const v=e.target.value.replace(/[^a-z0-9_]/g,"").slice(0,30);
                    setChLink(v);
                    setChLinkAvail(v.length>=5?"ok":v.length>0?"err":null);
                  }} placeholder="nom_canal" style={{flex:1,border:"none",outline:"none",fontSize:15,color:"#111",background:"transparent"}}/>
                  {chLinkAvail==="ok"&&<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                {chLinkAvail==="ok" && <div style={{fontSize:12.5,color:"var(--bp-primary)"}}>{chLink} est disponible.</div>}
                {chLinkAvail==="err" && <div style={{fontSize:12.5,color:"#64748B"}}>Vous pouvez utiliser a–z, 0–9 et underscore. Minimum 5 caractères.</div>}
                {!chLinkAvail && <div style={{fontSize:12.5,color:"#64748B"}}>Vous pouvez utiliser a–z, 0–9 et underscore. Minimum 5 caractères.</div>}
              </div>
            )}
            {/* Private invite link */}
            {chType==="private" && (
              <div style={{background:"#fff",borderTop:"1px solid rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.08)",padding:"16px",marginTop:8}}>
                <div style={{fontSize:13,color:"#64748B",marginBottom:6}}>Lien d'invitation</div>
                <div style={{fontSize:14.5,color:"var(--bp-primary)",fontWeight:600}}>https://brutepawa.com/invite/{Math.random().toString(36).slice(2,9)}</div>
                <div style={{fontSize:12,color:"#64748B",marginTop:4}}>Lien unique et sécurisé. Renouvelable à tout moment.</div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: MEMBERS ── */}
        {chWiz==="members" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflowY:"hidden",position:"relative"}}>
            {/* Selected strip */}
            {chSelectedArr.length>0 && (
              <div style={{padding:"12px 16px 0",flexShrink:0,borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
                <div style={{display:"flex",gap:16,overflowX:"auto",scrollbarWidth:"none",paddingBottom:12}}>
                  {chSelectedArr.map(uid=>{
                    const u=allUsers.find(x=>x.id===uid);
                    const nm=u?(u.firstName&&u.lastName?`${u.firstName} ${u.lastName}`:u.name??`#${uid}`):`#${uid}`;
                    return (
                      <div key={uid} onClick={()=>setChMembers(prev=>{const s=new Set(prev);s.delete(uid);return s;})} style={{flexShrink:0,textAlign:"center",cursor:"pointer",width:60,animation:"ch-wiz-in 0.15s ease"}}>
                        <div style={{position:"relative",marginBottom:4}}>
                          <div style={{width:52,height:52,borderRadius:"50%",background:wizCol(uid),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:17,margin:"0 auto"}}>{mkInitials(nm)}</div>
                          <div style={{position:"absolute",top:-1,right:2,width:18,height:18,background:"#9CA3AF",borderRadius:"50%",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <svg viewBox="0 0 24 24" width="8" height="8" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </div>
                        </div>
                        <div style={{fontSize:11,color:"#111",maxWidth:60,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nm.split(" ")[0]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Search */}
            <div style={{padding:"10px 16px 6px",flexShrink:0}}>
              <div className="bp-search">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={chSearch} onChange={e=>setChSearch(e.target.value)} placeholder="Rechercher des personnes..."/>
                {chSearch&&<div onClick={()=>setChSearch("")} style={{width:20,height:20,borderRadius:"50%",background:"#9CA3AF",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                  <svg viewBox="0 0 24 24" width="10" height="10" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>}
              </div>
            </div>
            {/* Contacts */}
            <div style={{flex:1,overflowY:"auto"}}>
              {chFilteredUsers.map(u=>{
                const nm=u.firstName&&u.lastName?`${u.firstName} ${u.lastName}`:u.name??`#${u.id}`;
                const sel=chMembers.has(u.id);
                return (
                  <div key={u.id} className="ch-wiz-row" onClick={()=>setChMembers(prev=>{const s=new Set(prev);if(s.has(u.id))s.delete(u.id);else s.add(u.id);return s;})}
                    style={{display:"flex",gap:14,padding:"10px 16px",alignItems:"center",cursor:"pointer",borderBottom:"1px solid rgba(0,0,0,0.06)",background:"#fff",transition:"background 0.1s"}}>
                    <div style={{width:50,height:50,borderRadius:"50%",background:wizCol(u.id),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:18,flexShrink:0}}>{mkInitials(nm)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:16,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{nm}</div>
                      <div style={{fontSize:13,color:"#64748B",marginTop:1}}>vu récemment</div>
                    </div>
                    <div style={{width:24,height:24,borderRadius:"50%",border:sel?"none":"2px solid #CBD5E1",background:sel?"var(--bp-primary)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                      {sel&&<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{animation:"ch-check 0.15s ease"}}><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                );
              })}
              {chFilteredUsers.length===0&&<div style={{padding:"52px 24px",textAlign:"center",color:"#64748B",fontSize:15}}>Aucun contact trouvé</div>}
              <div style={{height:80}}/>
            </div>
            {/* FAB — skip or confirm */}
            <button onClick={handleChCreate} style={{position:"absolute",bottom:24,right:20,width:56,height:56,borderRadius:"50%",background:"var(--bp-primary)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.25)",zIndex:10,transition:"transform 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.06)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}
      </div>
    , document.body);
  }

  /* ══════════════════════════════════════════════════════════════
     BROADCAST — Chat view
  ══════════════════════════════════════════════════════════════ */
  if (activeBcId !== null) {
    const bc = bcConvs.find(b => b.id === activeBcId);
    if (!bc) { setActiveBcId(null); }
    else {
      const bcRecipNames = bc.recipients.map(uid => {
        const u = allUsers.find(x => x.id === uid);
        return u ? (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name ?? `#${uid}`) : `#${uid}`;
      });
      const handleBcSend = () => {
        if (!bcInput.trim()) return;
        const msg = { id: Date.now(), text: bcInput.trim(), time: new Date().toLocaleTimeString("fr",{hour:"2-digit",minute:"2-digit"}), mine: true };
        setBcConvs(prev => prev.map(b => b.id === activeBcId ? {...b, msgs:[...b.msgs, msg]} : b));
        setBcInput("");
      };
      return createPortal(
        <div style={{ position:"fixed", inset:0, background: `url(${import.meta.env.BASE_URL}wallpapers/bp-chat-bg.jpg) center/cover no-repeat`, zIndex:10000, display:"flex", flexDirection:"column" }}>
          {/* Header */}
          <div style={{ background:"rgba(255,255,255,0.97)", display:"flex", alignItems:"center", padding:"6px 8px", boxShadow:"0 1px 4px rgba(0,0,0,0.1)", flexShrink:0 }}>
            <button onClick={() => setActiveBcId(null)} style={{ background:"none",border:"none",cursor:"pointer",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ width:40,height:40,borderRadius:"50%",background:"var(--bp-primary)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginRight:10 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6.1 6.1l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700,fontSize:16,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{bc.recipients.length} destinataire{bc.recipients.length>1?"s":""}</div>
              <div style={{ fontSize:12,color:"#64748B" }}>Liste de diffusion</div>
            </div>
            <button style={{ background:"none",border:"none",cursor:"pointer",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#64748B"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
            </button>
          </div>
          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"12px 10px", display:"flex", flexDirection:"column", gap:4 }}>
            {/* Info card */}
            <div style={{ alignSelf:"center", maxWidth:"85%", background:"rgba(70,110,70,0.65)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderRadius:20, padding:"16px 20px", margin:"8px auto", boxShadow:"0 4px 16px rgba(0,0,0,0.12)", textAlign:"center" }}>
              <div style={{ fontSize:13.5, color:"rgba(255,255,255,0.92)", lineHeight:1.5 }}>
                Seuls les contacts que vous avez enregistrés dans leur carnet d'adresses recevront vos messages de diffusion.
              </div>
              <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:4, justifyContent:"center" }}>
                {bcRecipNames.map(n => <span key={n} style={{ background:"rgba(255,255,255,0.18)", borderRadius:12, padding:"2px 10px", fontSize:12, color:"#fff" }}>{n}</span>)}
              </div>
            </div>
            {bc.msgs.map(m => (
              <div key={m.id} style={{ display:"flex", justifyContent:"flex-end" }}>
                <div style={{ maxWidth:"72%", background:"#C8E6B2", color:"#14532D", borderRadius:"16px 16px 4px 16px", padding:"8px 12px 6px", fontSize:14.5, boxShadow:"0 1px 2px rgba(0,0,0,0.1)" }}>
                  {m.text}
                  <div style={{ fontSize:10,color:"#166534",textAlign:"right",marginTop:2 }}>{m.time} <span style={{ color:"var(--bp-primary)" }}>✓✓</span></div>
                </div>
              </div>
            ))}
          </div>
          {/* Input */}
          <div style={{ background:"rgba(255,255,255,0.97)", padding:"8px 10px", display:"flex", alignItems:"center", gap:8, boxShadow:"0 -1px 4px rgba(0,0,0,0.06)", flexShrink:0 }}>
            <button style={{ background:"none",border:"none",cursor:"pointer",width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1.2" fill="#64748B"/><circle cx="15" cy="9" r="1.2" fill="#64748B"/></svg>
            </button>
            <input value={bcInput} onChange={e=>setBcInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleBcSend();}}
              placeholder="Message"
              style={{ flex:1,height:42,borderRadius:22,border:"1px solid #E5E7EB",outline:"none",padding:"0 14px",fontSize:15,background:"#fff" }} />
            <button style={{ background:"none",border:"none",cursor:"pointer",width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            {bcInput.trim() ? (
              <button onClick={handleBcSend} style={{ width:44,height:44,borderRadius:"50%",background:"var(--bp-primary)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(34,197,94,0.4)" }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            ) : (
              <button style={{ width:44,height:44,borderRadius:"50%",background:"var(--bp-primary)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(34,197,94,0.4)" }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
            )}
          </div>
        </div>
      , document.body);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     BROADCAST — Contact picker
  ══════════════════════════════════════════════════════════════ */
  if (showBroadcast) {
    const allContacts = allUsers.filter(u => u.id !== meId);
    const filteredContacts = bcSearch.trim()
      ? allContacts.filter(u => {
          const n = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name ?? "";
          return n.toLowerCase().includes(bcSearch.toLowerCase());
        })
      : allContacts;
    const selectedUsers = allContacts.filter(u => bcSelected.has(u.id));

    const toggleContact = (id: number) => {
      setBcSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    const handleValidate = async () => {
      if (bcSelected.size === 0) return;
      try {
        const r = await apiFetch("/broadcast", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Nouvelle diffusion" }),
        });
        const bc = await r.json() as { id: number };
        await Promise.allSettled([...bcSelected].map(uid =>
          apiFetch(`/broadcast/${bc.id}/members`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: uid }),
          })
        ));
        setBcSelected(new Set()); setBcSearch(""); setBcSearchMode(false); setShowBroadcast(false);
        navigate(`/broadcast/${bc.id}`);
      } catch {
        const newBc = { id: Date.now(), recipients: [...bcSelected], msgs: [] };
        setBcConvs(prev => [...prev, newBc]); setActiveBcId(newBc.id);
        setBcSelected(new Set()); setBcSearch(""); setBcSearchMode(false); setShowBroadcast(false);
      }
    };

    return createPortal(
      <div style={{ position:"fixed", inset:0, background:"#fff", zIndex:10000, display:"flex", flexDirection:"column" }}>
        <style>{`@keyframes bc-check-in{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}} @keyframes bc-strip-in{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* ── HEADER ── */}
        <div style={{ background:"#fff", display:"flex", alignItems:"center", height:56, padding:"0 4px", flexShrink:0, boxShadow:"0 1px 0 rgba(0,0,0,0.09)", zIndex:5 }}>
          {bcSearchMode ? (
            <>
              <button onClick={() => { setBcSearchMode(false); setBcSearch(""); }}
                style={{ background:"none",border:"none",cursor:"pointer",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <input autoFocus value={bcSearch} onChange={e=>setBcSearch(e.target.value)}
                placeholder="Rechercher..."
                style={{ flex:1,border:"none",outline:"none",fontSize:16,background:"transparent",color:"#111827" }} />
              {bcSearch && <button onClick={()=>setBcSearch("")} style={{ background:"none",border:"none",cursor:"pointer",padding:8 }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>}
            </>
          ) : (
            <>
              <button onClick={() => { setShowBroadcast(false); setBcSelected(new Set()); setBcSearch(""); }}
                style={{ background:"none",border:"none",cursor:"pointer",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:16.5, color:"#111827" }}>Nouvelle diffusion</div>
                <div style={{ fontSize:12, color:"#64748B" }}>{bcSelected.size} sélectionné{bcSelected.size>1?"s":""} sur {allContacts.length}</div>
              </div>
              <button onClick={() => { setBcSearchMode(true); setBcSearch(""); }}
                style={{ background:"none",border:"none",cursor:"pointer",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
              </button>
            </>
          )}
        </div>

        {/* ── SELECTED STRIP ── */}
        {selectedUsers.length > 0 && (
          <div style={{ background:"#fff", borderBottom:"1px solid #E5E7EB", padding:"10px 12px", display:"flex", gap:10, overflowX:"auto", flexShrink:0, animation:"bc-strip-in 0.2s ease" }}>
            {selectedUsers.map(u => {
              const name = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name ?? `#${u.id}`;
              const col = CONV_COLORS[u.id % CONV_COLORS.length];
              return (
                <div key={u.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, flexShrink:0, cursor:"pointer" }}
                  onClick={() => toggleContact(u.id)}>
                  <div style={{ position:"relative" }}>
                    <div style={{ width:50, height:50, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:18 }}>
                      {mkInitials(name)}
                    </div>
                    <div style={{ position:"absolute", top:-2, right:-2, width:20, height:20, borderRadius:"50%", background:"#64748B", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 3px rgba(0,0,0,0.25)" }}>
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:"#111827", maxWidth:58, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SEARCH BAR ── */}
        <div style={{ padding:"10px 14px", background:"#fff", borderBottom:"1px solid #E5E7EB", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", background:"#F3F4F6", borderRadius:30, padding:"9px 16px", gap:8 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></svg>
            <input value={bcSearch} onChange={e=>setBcSearch(e.target.value)}
              placeholder="Rechercher des personnes, groupes..."
              style={{ flex:1,border:"none",outline:"none",fontSize:14.5,background:"transparent",color:"#111827" }} />
          </div>
        </div>

        {/* ── CONTACT LIST ── */}
        <div style={{ flex:1, overflowY:"auto", background:"#fff" }}>
          {!bcSearch.trim() && (
            <div style={{ padding:"12px 16px 6px", fontSize:13, fontWeight:600, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em" }}>
              Contacts sur BrutePawa
            </div>
          )}
          {filteredContacts.map(u => {
            const name = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name ?? `Utilisateur #${u.id}`;
            const col = CONV_COLORS[u.id % CONV_COLORS.length];
            const isSelected = bcSelected.has(u.id);
            return (
              <div key={u.id} onClick={() => toggleContact(u.id)}
                style={{ display:"flex", alignItems:"center", padding:"10px 16px", gap:14, cursor:"pointer", borderBottom:"1px solid #F3F4F6", transition:"background 0.1s" }}
                onMouseEnter={e=>(e.currentTarget.style.background="#F8FAFC")}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                <div style={{ width:50, height:50, borderRadius:"50%", background:col, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:18, flexShrink:0 }}>
                  {mkInitials(name)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:15.5, color:"#111827", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{name}</div>
                  <div style={{ fontSize:13, color:"#64748B", marginTop:1 }}>en ligne</div>
                </div>
                {/* Checkbox */}
                <div style={{ width:24, height:24, borderRadius:"50%", border:`2px solid ${isSelected ? "var(--bp-primary)" : "#E5E7EB"}`, background: isSelected ? "var(--bp-primary)" : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s", animation: isSelected ? "bc-check-in 0.15s ease" : "none" }}>
                  {isSelected && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              </div>
            );
          })}
          {filteredContacts.length === 0 && (
            <div style={{ textAlign:"center", color:"#9CA3AF", fontSize:14, padding:"40px 16px" }}>Aucun contact trouvé</div>
          )}
          {/* Bottom padding for FAB */}
          <div style={{ height:80 }} />
        </div>

        {/* ── VALIDATE FAB ── */}
        {bcSelected.size > 0 && (
          <button onClick={handleValidate}
            style={{ position:"absolute", bottom:24, right:24, width:60, height:60, borderRadius:"50%", background:"var(--bp-primary)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(34,197,94,0.5)", animation:"bc-check-in 0.2s ease", zIndex:10 }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        )}
      </div>
    , document.body);
  }

  return (
    <>
    {/* Hidden voice player — lives here so it renders always, not only during calls */}
    <audio ref={voicePlayerRef} style={{ display:"none" }}
      onTimeUpdate={e => { const el = e.currentTarget; if (el.duration) setAudioProgress(el.currentTime / el.duration); }}
      onEnded={() => { setPlayingAudioId(null); setAudioProgress(0); }} />
    <style>{`
      .fbl-row{transition:background .1s}.fbl-row:active{background:#F1F5F9!important}
      @keyframes fbl-fab-in{from{opacity:0;transform:scale(.7) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
      .fbl-toggle{width:51px;height:31px;border-radius:16px;border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
      .fbl-toggle::after{content:'';position:absolute;top:3px;width:25px;height:25px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transition:left .2s}
      .fbl-toggle-on{background:var(--bp-primary)}.fbl-toggle-on::after{left:23px}
      .fbl-toggle-off{background:#ccc}.fbl-toggle-off::after{left:3px}
      .fbl-settings-row{display:flex;align-items:center;padding:14px 16px;gap:14px;border-bottom:1px solid #F1F5F9;cursor:pointer;background:#fff}
      .fbl-settings-row:active{background:#F1F5F9}
      @media (max-width: 768px) {
         .bp-desktop-sidebar { display: ${activeChatView ? 'none' : 'flex'} !important; width: 100% !important; max-width: 100% !important; border-right: none !important; }
         .bp-desktop-main { display: ${activeChatView ? 'flex' : 'none'} !important; }
      }
      @media (min-width: 769px) {
         .bp-messages-root { bottom: 0 !important; }
      }
    `}</style>

    <div
      className="sc-fixed-escape bp-messages-root"
      style={{
        position: "fixed",
        top: vpHeight !== null ? vpOffset : 0,
        bottom: vpHeight !== null ? "auto" : "58px",
        height: vpHeight !== null ? Math.max(0, vpHeight - 58) : undefined,
        left: 0,
        right: 0,
        display: "flex",
        background: "var(--theme-surface)",
        zIndex: 9999,
        overflow: "hidden",
      }}
    >
      {/* ── SIDEBAR ── */}
      <div className="bp-desktop-sidebar" style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 380, borderRight: "1px solid var(--theme-border)", flexShrink: 0, zIndex: 2 }}>
        {/* ── HEADER ── */}
        <div style={{ background: "var(--theme-surface)", flexShrink: 0, paddingTop: "env(safe-area-inset-top, 0px)" }}>
          {showInboxSearch ? (
            /* ── Expanded search row ── */
          <div style={{ display: "flex", alignItems: "center", padding: "10px 12px 10px", gap: 8 }}>
            <button onClick={() => { setShowInboxSearch(false); setSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 4px", display: "flex", alignItems: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#111827" strokeWidth="2.2" strokeLinecap="round"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#F1F5F9", borderRadius: 22, padding: "9px 14px" }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher des personnes, groupes…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: "var(--theme-text)" }} />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>}
            </div>
          </div>
        ) : (
          /* ── Normal header ── */
          <div style={{ display: "flex", alignItems: "center", padding: "10px 8px 10px 14px", gap: 4 }}>
            {/* BP Logo */}
            <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", flexShrink: 0, marginRight: 6 }}>
              <img src="/logo.png" alt="Brute Pawa" style={{ width: 30, height: 30, borderRadius: 9, objectFit: "cover" }} />
            </button>
            <span style={{ fontWeight: 800, fontSize: 20, color: "var(--theme-text)", letterSpacing: -0.4, flex: 1 }}>Messages</span>
            {/* Search icon */}
            <button onClick={() => setShowInboxSearch(true)} style={{ background: "none", border: "none", cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
            </button>
            {/* Filter ≡ */}
            <button onClick={() => setSettingsPage("main")} style={{ background: "none", border: "none", cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>
            </button>
            {/* Avatar initials */}
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0, cursor: "pointer", marginLeft: 2 }}
              onClick={() => navigate("/profile")}>
              {(currentUser.name ?? "").split(" ").map((w:string) => w[0]).join("").slice(0,2).toUpperCase() || "BP"}
            </div>
          </div>
        )}
        <div style={{ height: 1, background: "#F1F5F9" }} />
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--theme-surface)" }}>

        {/* Story / contacts bar */}
        {!search && convList.length > 0 && (
          <div style={{ background: "var(--theme-surface)", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", padding: "8px 6px 10px", gap: 0 }}>
              {/* "Votre note" */}
              <div style={{ flexShrink: 0, textAlign: "center", width: 66, padding: "0 3px" }}>
                <div style={{ position: "relative", marginBottom: 4 }}>
                  <div className="avatar" style={{ width: 52, height: 52, fontSize: 17, margin: "0 auto", background: "#E5E7EB", color: "#64748B", border: "2.5px solid #fff" }}>
                    {currentUser.name?.slice(0,2).toUpperCase() ?? "??"}
                  </div>
                  <div style={{ position: "absolute", bottom: 0, right: 5, width: 18, height: 18, background: "var(--bp-primary)", borderRadius: "50%", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 900, lineHeight: 1 }}>+</div>
                </div>
                <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Votre note</div>
              </div>
              {convList.slice(0, 8).map(conv => {
                const isOnline = convPresence[conv.id]?.online ?? false;
                return (
                <div key={conv.id} onClick={() => setActiveConv(conv.id)} style={{ flexShrink: 0, textAlign: "center", width: 66, padding: "0 3px", cursor: "pointer" }}>
                  <div style={{ position: "relative", marginBottom: 4 }}>
                    {conv.user.avatarUrl
                      ? <img src={conv.user.avatarUrl} alt={conv.user.name} loading="lazy" decoding="async" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", display: "block", margin: "0 auto", border: "2.5px solid #fff" }} />
                      : <div className="avatar" style={{ width: 52, height: 52, fontSize: 17, margin: "0 auto", background: conv.user.color, border: "2.5px solid #fff" }}>{conv.user.initials}</div>
                    }
                    {isOnline && <div style={{ position: "absolute", bottom: 1, right: 5, width: 12, height: 12, background: "var(--bp-primary)", borderRadius: "50%", border: "2px solid #fff" }} />}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {conv.user.name.split(" ")[0]}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Listes de diffusion envoyées (propriétaire) ── */}
        {!search && apiBcLists.length > 0 && (
          <div style={{ background: "var(--theme-surface)", borderBottom: "1px solid #F3F4F6", padding: "10px 16px 8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--bp-primary)", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>LISTES DE DIFFUSION</span>
              <button onClick={() => { setShowBroadcast(true); setBcSelected(new Set()); setBcSearch(""); setBcSearchMode(false); setFabOpen(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--bp-primary)", fontFamily: "Inter, sans-serif" }}>
                + Nouvelle
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none" }}>
              {apiBcLists.map(bc => (
                <div key={bc.id} onClick={() => navigate(`/broadcast/${bc.id}`)} style={{
                  flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer", width: 64,
                }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: "50%", background: bc.color ?? "var(--bp-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                  }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 10.5, color: "#64748B", fontWeight: 500, maxWidth: 60, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" }}>
                    {bc.name}
                  </span>
                  <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: "Inter, sans-serif" }}>{bc.recipientCount} dest.</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Diffusions reçues (destinataire) ── */}
        {!search && apiBcReceived.length > 0 && (
          <div style={{ background: "var(--theme-surface)", borderBottom: "1px solid #F3F4F6" }}>
            {apiBcReceived.map(bc => {
              const lastContent = bc.lastMessage?.content ?? "";
              const preview = lastContent.startsWith("__audio__") ? "🎤 Message vocal"
                : lastContent.startsWith("__sticker__") ? "Sticker"
                : lastContent.startsWith("__image__") && lastContent.includes("brutepawa-") ? "Sticker"
                : lastContent.startsWith("__image__") ? "📷 Photo"
                : lastContent.startsWith("__video__") ? "📹 Vidéo"
                : lastContent.startsWith("__doc__") ? "📎 Document"
                : lastContent.length > 50 ? lastContent.slice(0, 50) + "…" : lastContent;
              const time = bc.lastMessage ? new Date(bc.lastMessage.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <div key={bc.id} onClick={() => navigate(`/broadcast/${bc.id}/received`)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  borderBottom: "1px solid #F9FAFB", cursor: "pointer",
                }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: "50%", flexShrink: 0,
                    background: bc.color ?? "var(--bp-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                  }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "var(--theme-text)", fontFamily: "Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📢 {bc.name}
                      </span>
                      <span style={{ fontSize: 11.5, color: "#9CA3AF", flexShrink: 0, marginLeft: 8 }}>{time}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Inter, sans-serif" }}>
                        <span style={{ color: "#9CA3AF" }}>{bc.ownerName} · </span>{preview || "Aucun message"}
                      </span>
                      {bc.unreadCount > 0 && (
                        <span style={{ background: "var(--bp-primary)", color: "white", borderRadius: 12, fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0, marginLeft: 8 }}>
                          {bc.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* All conversations + groups merged */}
        {[
          ...visibleConvs.map(c => {
            const pres = convPresence[c.id];
            const { text: previewText, isAudio } = fmtConvPreview(c.lastMessage);
            return { type: "conv" as const, id: c.id, key: `c${c.id}`, name: c.user.name, previewText, isAudio, time: c.time, unread: c.unread, color: c.user.color, initials: c.user.initials, avatarUrl: c.user.avatarUrl ?? null, badgeType: c.user.badgeType ?? null, verified: c.user.verified ?? false, online: pres?.online ?? false, lastSeenAt: pres?.lastSeenAt ?? null, grp: null, lastMsgMine: c.lastMsgMine ?? false, lastMsgRead: c.lastMsgRead ?? false, lastMsgDelivered: c.lastMsgDelivered ?? false };
          }),
          ...visibleGroups.map(g => {
            const isChan = g.type === "channel";
            const ts = g.lastMessageAt ? new Date(g.lastMessageAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }) : "";
            const { text: previewText, isAudio } = fmtConvPreview(g.lastMessage || `${g.membersCount} membre${g.membersCount !== 1 ? "s" : ""}`);
            return { type: "group" as const, id: g.id, key: `g${g.id}`, name: g.name, previewText, isAudio, time: ts, unread: g.unread, color: isChan ? "#00838F" : "var(--bp-primary)", initials: isChan ? "📢" : "👥", online: false, lastSeenAt: null as string|null, grp: g, lastMsgMine: false, lastMsgRead: false, lastMsgDelivered: false };
          }),
        ].map(item => (
          <div key={item.key} className="fbl-row"
            onClick={() => item.type === "conv" ? setActiveConv(item.id) : setActiveGroupId(item.id)}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px", background:"#fff", borderBottom:"1px solid #F1F5F9", cursor:"pointer" }}>

            {/* Avatar + online dot */}
            <div style={{ position:"relative", flexShrink:0 }}>
              {"avatarUrl" in item && item.avatarUrl
                ? <img src={item.avatarUrl} alt={item.name} loading="lazy" decoding="async" style={{ width:50, height:50, borderRadius:"50%", objectFit:"cover", display:"block" }} />
                : <div className="avatar" style={{ width:50, height:50, fontSize: item.type==="group" ? 22 : 18, background:item.color, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#fff" }}>{item.initials}</div>
              }
              {item.online ? (
                <div style={{ position:"absolute", bottom:1, right:1, width:13, height:13, background:"var(--bp-primary)", borderRadius:"50%", border:"2px solid #fff" }} />
              ) : item.type === "conv" ? (
                <div style={{ position:"absolute", bottom:1, right:1, width:13, height:13, background:"#E5E7EB", borderRadius:"50%", border:"2px solid #fff" }} />
              ) : null}
            </div>

            {/* Content */}
            <div style={{ flex:1, minWidth:0 }}>
              {/* Row 1: name + (checkmark for mine + time) */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4, flex:1, minWidth:0, marginRight:6, overflow:"hidden" }}>
                  <span style={{ fontWeight: item.unread > 0 ? 700 : 600, fontSize:15.5, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {item.name}
                  </span>
                   {item.type === "conv" && (item.badgeType || item.verified) && (
                     <UserBadge type={item.badgeType ?? "verified"} size={14} />
                   )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
                  {/* Telegram-style checkmarks — only for mine, only in DM conv */}
                  {item.type === "conv" && item.lastMsgMine && (() => {
                    const read = item.lastMsgRead;
                    const delivered = item.lastMsgDelivered;
                    const color = read ? "var(--bp-primary)" : "#9CA3AF";
                    if (read || delivered) {
                      return (
                        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ flexShrink:0 }}>
                          <path d="M1 5.5L4.5 9L10.5 2" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 5.5L8.5 9L14.5 2" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      );
                    }
                    return (
                      <svg width="10" height="11" viewBox="0 0 10 11" fill="none" style={{ flexShrink:0 }}>
                        <path d="M1 5.5L4 8.5L9 2" stroke="#9CA3AF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    );
                  })()}
                  <span style={{ fontSize:12, color: item.unread > 0 ? "var(--bp-primary)" : "#9CA3AF", fontWeight: item.unread > 0 ? 700 : 400 }}>
                    {item.time}
                  </span>
                </div>
              </div>

              {/* Row 2: preview + badge */}
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ flex:1, display:"flex", alignItems:"center", gap:4, overflow:"hidden", minWidth:0 }}>
                  {item.isAudio ? (
                    <>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--bp-primary)" style={{ flexShrink:0 }}>
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="var(--bp-primary)" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
                        <line x1="12" y1="19" x2="12" y2="23" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize:13.5, color: item.unread > 0 ? "#111827" : "#64748B", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight: item.unread > 0 ? 500 : 400 }}>
                        {item.previewText}
                      </span>
                    </>
                  ) : (item.type === "conv" && convTypingMap[item.id]) ? (
                    <span style={{ fontSize:13.5, color:"var(--bp-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:500, fontStyle:"italic" }}>
                      écrit...
                    </span>
                  ) : (
                    <span style={{ fontSize:13.5, color: item.unread > 0 ? "#111827" : "#64748B", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight: item.unread > 0 ? 500 : 400 }}>
                      {item.previewText}
                    </span>
                  )}
                </div>
                {item.unread > 0 && (
                  <div style={{ background:"var(--bp-primary)", color:"#fff", borderRadius:99, minWidth:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, padding:"0 5px", flexShrink:0 }}>
                    {item.unread > 99 ? "99+" : item.unread}
                  </div>
                )}
              </div>

              {/* Row 3: last seen (offline users only) */}
              {!item.online && item.type === "conv" && item.lastSeenAt && (
                <div style={{ fontSize:11.5, color:"#9CA3AF", marginTop:1 }}>
                  {presenceLabel(false, item.lastSeenAt)}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* ── Loading skeleton ── */}
        {convLoading && convList.length === 0 && (
          <div style={{ padding:"0 16px" }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #F1F5F9" }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:"#E5E7EB", flexShrink:0, animation:"fbl-pulse 1.4s ease-in-out infinite" }} />
                <div style={{ flex:1 }}>
                  <div style={{ height:14, width:"55%", background:"#E5E7EB", borderRadius:7, marginBottom:8, animation:"fbl-pulse 1.4s ease-in-out infinite" }} />
                  <div style={{ height:12, width:"80%", background:"#F1F5F9", borderRadius:6, animation:"fbl-pulse 1.4s ease-in-out infinite" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Premium Empty State ── */}
        {false && !convLoading && !search && convList.length === 0 && chatGroups.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 24px" }}>

            {/* Illustration SVG */}
            <div style={{ width: "100%", maxWidth: 380, padding: "0 12px" }}>
              <svg viewBox="0 0 380 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "auto" }}>
                {/* Background circle */}
                <circle cx="190" cy="150" r="120" fill="#DCFCE7" opacity="0.6"/>
                <circle cx="190" cy="150" r="90" fill="#DCFCE7" opacity="0.4"/>

                {/* ── Person 1 — left, standing, hoodie ── */}
                {/* Body */}
                <rect x="60" y="130" width="44" height="60" rx="10" fill="var(--bp-primary)"/>
                {/* Head */}
                <circle cx="82" cy="118" r="18" fill="#8B5E3C"/>
                {/* Hair */}
                <ellipse cx="82" cy="103" rx="18" ry="8" fill="#1C1917"/>
                {/* Eyes */}
                <circle cx="76" cy="117" r="2.5" fill="#fff"/>
                <circle cx="88" cy="117" r="2.5" fill="#fff"/>
                <circle cx="77" cy="117" r="1.2" fill="#1C1917"/>
                <circle cx="89" cy="117" r="1.2" fill="#1C1917"/>
                {/* Legs */}
                <rect x="64" y="185" width="14" height="42" rx="7" fill="#1E293B"/>
                <rect x="82" y="185" width="14" height="42" rx="7" fill="#1E293B"/>
                {/* Shoes */}
                <ellipse cx="71" cy="228" rx="10" ry="5" fill="#111827"/>
                <ellipse cx="89" cy="228" rx="10" ry="5" fill="#111827"/>
                {/* Phone in hand */}
                <rect x="95" y="148" width="18" height="28" rx="4" fill="#111827"/>
                <rect x="97" y="151" width="14" height="20" rx="2" fill="#0EA5E9"/>
                {/* Arm */}
                <path d="M104 148 Q100 138 95 148" stroke="#8B5E3C" strokeWidth="6" strokeLinecap="round" fill="none"/>
                {/* Bag strap */}
                <path d="M60 135 Q48 155 55 175" stroke="#111827" strokeWidth="3" strokeLinecap="round" fill="none"/>

                {/* ── Person 2 — center, sitting on big chat bubble ── */}
                {/* Big green chat bubble as seat */}
                <rect x="140" y="190" width="100" height="60" rx="20" fill="var(--bp-primary)"/>
                <path d="M165 248 L155 265 L180 248" fill="var(--bp-primary)"/>
                {/* 3 dots inside bubble */}
                <circle cx="173" cy="220" r="5" fill="#fff"/>
                <circle cx="190" cy="220" r="5" fill="#fff"/>
                <circle cx="207" cy="220" r="5" fill="#fff"/>
                {/* Body sitting */}
                <rect x="163" y="155" width="44" height="40" rx="10" fill="#fff"/>
                {/* Legs dangling */}
                <rect x="167" y="190" width="13" height="30" rx="6" fill="#1E293B"/>
                <rect x="183" y="190" width="13" height="30" rx="6" fill="#1E293B"/>
                <ellipse cx="174" cy="221" rx="9" ry="5" fill="white"/>
                <ellipse cx="190" cy="221" rx="9" ry="5" fill="white"/>
                {/* Head */}
                <circle cx="185" cy="140" r="20" fill="#1C1917"/>
                {/* Bun hair */}
                <ellipse cx="185" cy="122" rx="12" ry="9" fill="#1C1917"/>
                <circle cx="185" cy="117" r="7" fill="#1C1917"/>
                {/* Eyes */}
                <circle cx="179" cy="139" r="2.5" fill="#fff"/>
                <circle cx="191" cy="139" r="2.5" fill="#fff"/>
                <circle cx="180" cy="139" r="1.2" fill="#1C1917"/>
                <circle cx="192" cy="139" r="1.2" fill="#1C1917"/>
                {/* Phone */}
                <rect x="195" y="158" width="18" height="28" rx="4" fill="#111827"/>
                <rect x="197" y="161" width="14" height="20" rx="2" fill="#8B5CF6"/>
                {/* Arm to phone */}
                <path d="M207 158 Q206 150 200 158" stroke="#1C1917" strokeWidth="6" strokeLinecap="round" fill="none"/>

                {/* ── Person 3 — right, sitting cross-legged ── */}
                {/* Body */}
                <rect x="262" y="155" width="44" height="48" rx="10" fill="var(--bp-primary)" opacity="0.9"/>
                {/* Crossed legs */}
                <path d="M262 198 Q255 215 268 222 Q280 230 280 215" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" fill="none"/>
                <path d="M306 198 Q313 215 300 222 Q288 230 288 215" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" fill="none"/>
                {/* Head */}
                <circle cx="284" cy="142" r="18" fill="#1C1917"/>
                {/* Short hair */}
                <ellipse cx="284" cy="126" rx="18" ry="7" fill="#1C1917"/>
                {/* Eyes */}
                <circle cx="278" cy="141" r="2.5" fill="#fff"/>
                <circle cx="290" cy="141" r="2.5" fill="#fff"/>
                <circle cx="279" cy="141" r="1.2" fill="#1C1917"/>
                <circle cx="291" cy="141" r="1.2" fill="#1C1917"/>
                {/* Phone in lap */}
                <rect x="272" y="175" width="24" height="16" rx="4" fill="#111827"/>
                <rect x="274" y="177" width="20" height="12" rx="2" fill="#FEF3C7"/>
                {/* Arm down */}
                <path d="M275 168 Q272 174 277 175" stroke="#1C1917" strokeWidth="6" strokeLinecap="round" fill="none"/>

                {/* ── Floating chat bubbles ── */}
                {/* Top left white bubble */}
                <rect x="18" y="80" width="72" height="36" rx="14" fill="#fff" style={{filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.12))"}}/>
                <path d="M30 115 L22 126 L42 115" fill="#fff"/>
                <circle cx="36" cy="98" r="4" fill="#E5E7EB"/>
                <circle cx="50" cy="98" r="4" fill="#E5E7EB"/>
                <circle cx="64" cy="98" r="4" fill="#E5E7EB"/>
                {/* Top right green bubble */}
                <rect x="288" y="60" width="72" height="36" rx="14" fill="var(--bp-primary)"/>
                <path d="M348 95 L360 106 L340 95" fill="var(--bp-primary)"/>
                <rect x="296" y="73" width="20" height="5" rx="2.5" fill="#fff" opacity="0.8"/>
                <rect x="296" y="82" width="50" height="5" rx="2.5" fill="#fff" opacity="0.6"/>
                {/* Small bubble top center */}
                <rect x="145" y="40" width="54" height="30" rx="12" fill="var(--bp-primary)" opacity="0.8"/>
                <path d="M155 69 L148 78 L165 69" fill="var(--bp-primary)" opacity="0.8"/>
                <circle cx="159" cy="55" r="3.5" fill="#fff"/>
                <circle cx="172" cy="55" r="3.5" fill="#fff"/>
                <circle cx="185" cy="55" r="3.5" fill="#fff"/>
                {/* Person icon top right area */}
                <rect x="308" y="110" width="32" height="32" rx="16" fill="#fff" opacity="0.9" style={{filter:"drop-shadow(0 1px 4px rgba(0,0,0,0.1))"}}/>
                <circle cx="324" cy="120" r="5" fill="#9CA3AF"/>
                <path d="M316 134c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="#9CA3AF"/>
                {/* Video icon left */}
                <rect x="22" y="155" width="32" height="32" rx="16" fill="#fff" opacity="0.9" style={{filter:"drop-shadow(0 1px 4px rgba(0,0,0,0.1))"}}/>
                <rect x="29" y="163" width="14" height="10" rx="2" fill="#9CA3AF"/>
                <path d="M43 165 l6 3 -6 3 z" fill="#9CA3AF"/>
              </svg>
            </div>

            {/* Text + button — centered */}
            <div style={{ padding: "0 24px 24px", width: "100%", boxSizing: "border-box", textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: "var(--theme-text)", marginBottom: 10, lineHeight: 1.2 }}>Aucune discussion</div>
              <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>Commencez une conversation avec vos amis ou rejoignez des groupes et canaux.</div>
              <button
                onClick={() => setFabOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 99, padding: "14px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 18px rgba(22,194,74,0.45)" }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Nouvelle discussion
              </button>
            </div>

          </div>
        )}
        {search && visibleConvs.length === 0 && visibleGroups.length === 0 && (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔍</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#333", marginBottom: 6 }}>Aucun résultat</div>
            <div style={{ fontSize: 13, color: "#888" }}>Aucune discussion pour «{search}»</div>
          </div>
        )}
      </div>

      {/* ── FAB — always visible ── */}
      <div style={{ position: "absolute", bottom: 80, right: 16, zIndex: 50 }}>
        {fabOpen && (
          <>
            <div onClick={() => setFabOpen(false)} style={{ position: "fixed", inset: 0, zIndex: -1, background: "rgba(0,0,0,0.18)" }} />
            <div style={{ position: "absolute", bottom: 68, right: 0, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              {([
                { label: "Nouvelle discussion", iconBg: "var(--bp-primary)", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, action: () => setFabOpen(false) },
                { label: "Nouveau groupe", iconBg: "#0EA5E9", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, action: () => { setGroupWizardType("group"); setGroupWizard("members"); setWizardSearch(""); setWizardMembers(new Set()); setFabOpen(false); } },
                { label: "Créer un canal", iconBg: "var(--bp-primary)", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>, action: () => { setChWiz("info"); setChName(""); setChDesc(""); setChType("public"); setChLink(""); setChLinkAvail(null); setChMembers(new Set()); setChSearch(""); setFabOpen(false); } },
                { label: "Diffuser une annonce", iconBg: "#F59E0B", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6.1 6.1l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, action: () => { setShowBroadcast(true); setBcSelected(new Set()); setBcSearch(""); setBcSearchMode(false); setFabOpen(false); } },
                { label: "Inviter des amis", iconBg: "#7C3AED", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>, action: () => setFabOpen(false) },
                { label: "Fermer", iconBg: "var(--bp-primary)", svg: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>, action: () => setFabOpen(false) },
              ] as {label:string;iconBg:string;svg:React.ReactNode;action:()=>void}[]).map((item, i) => (
                <div key={i} onClick={item.action} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", animation: `fbl-fab-in .18s ease ${i*.055}s both` }}>
                  <div style={{ background: "var(--theme-surface)", borderRadius: 99, padding: "9px 18px", boxShadow: "0 2px 14px rgba(0,0,0,.14)", fontSize: 14, fontWeight: 600, color: "var(--theme-text)", whiteSpace: "nowrap" }}>{item.label}</div>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: item.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 16px ${item.iconBg}55` }}>{item.svg}</div>
                </div>
              ))}
            </div>
          </>
        )}
        <button onClick={() => setFabOpen(!fabOpen)} style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--bp-primary)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(22,194,74,.55)", transition: "transform .2s", transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      </div>

      {/* ── DESKTOP MAIN CHAT VIEW ── */}
      <div className="bp-desktop-main" style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1, backgroundColor: "#EFF8F1" }}>
        {activeChatView ? activeChatView : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 8 }}>BrutePawa Messages</h2>
            <p style={{ fontSize: 15, color: "#64748B", textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>
              Sélectionnez une conversation pour commencer à discuter ou rechercher un contact.
            </p>
          </div>
        )}
      </div>
    </div>

    {/* ── SETTINGS OVERLAY (portaled) ── */}
    {settingsPage !== "none" && createPortal(
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", flexDirection: "column", background: "#F8FAFC" }}>

        {/* ── SCREEN 1 — Paramètres de messagerie PREMIUM ── */}
        {settingsPage === "main" && (() => {
          const fbUser = currentUser;
          const fullName = fbUser.firstName && fbUser.lastName ? `${fbUser.firstName} ${fbUser.lastName}` : fbUser.name ?? "Mon profil";
          const initials = fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
          const chevron = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>;
          const rows = [
            { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--bp-primary)"><circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.31 2.69-6 6-6s6 2.69 6 6H6z"/></svg>, label: "Statut en ligne", desc: "Autorisez les autres à vous voir en ligne", page: null as null, toggle: true },
            { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--bp-primary)"><path d="M18 8a6 6 0 0 0-12 0c0 4-2 5-2 5h16s-2-1-2-5"/><path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="var(--bp-primary)" strokeWidth="2"/></svg>, label: "Notifications de messages", desc: "Personnalisez vos notifications", page: "notifs" as const, toggle: false },
            { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--bp-primary)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>, label: "Invitations", desc: "Gérez vos invitations reçues", page: "invitations" as const, toggle: false },
            { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--bp-primary)"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5h13.76l.81.97H4.31l.81-.97z"/></svg>, label: "Archive", desc: "Voir et gérer vos conversations archivées", page: "archive" as const, toggle: false },
            { icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--bp-primary)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>, label: "Confidentialité et sécurité", desc: "Contrôlez votre confidentialité", page: "privacy" as const, toggle: false },
          ];
          return <>
            {/* ── Header ── */}
            <div style={{ background: "var(--theme-surface)", display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
              <button onClick={() => setSettingsPage("none")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 14px", display: "flex", alignItems: "center" }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="#111827"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
              </button>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 18, color: "var(--theme-text)" }}>Paramètres de messagerie</span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", background: "#F8FAFC", padding: "14px 14px 32px" }}>

              {/* ── Profile card premium ── */}
              <div onClick={() => setSettingsPage("status")}
                style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 50%,#bbf7d0 100%)", borderRadius: 28, padding: "18px 18px 18px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 16px rgba(34,197,94,0.13), 0 1px 4px rgba(0,0,0,.05)", marginBottom: 14, cursor: "pointer", border: "1px solid rgba(34,197,94,0.12)" }}>
                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  {fbUser.avatarUrl
                    ? <img src={fbUser.avatarUrl} alt={fullName} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #fff", boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }} />
                    : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 22, border: "3px solid #fff", boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}>{initials}</div>
                  }
                  {/* Online dot */}
                  <div style={{ position: "absolute", bottom: 2, right: 2, width: 16, height: 16, borderRadius: "50%", background: "var(--bp-primary)", border: "2.5px solid #fff", boxShadow: "0 1px 4px rgba(34,197,94,0.4)" }} />
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 16.5, color: "var(--theme-text)" }}>{fullName}</span>
                    <span style={{ background: "var(--bp-primary)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 9px", letterSpacing: .2 }}>Premium</span>
                    <img src="/bp-badge-premium.jpeg" alt="vérifié" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--bp-primary)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "var(--bp-primary)", fontWeight: 600 }}>En ligne</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748B" }}>Disponible pour discuter</div>
                </div>
                {chevron}
              </div>

              {/* ── Settings rows ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rows.map(item => (
                  <div key={item.label}
                    onClick={() => { if (item.toggle) { const v = !onlineStatus; setOnlineStatus(v); apiUpdateMessagingSettings({ onlineStatus: v }).catch(() => {}); } else if (item.page) setSettingsPage(item.page); }}
                    style={{ background: "var(--theme-surface)", borderRadius: 24, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 6px rgba(0,0,0,.06)", cursor: "pointer", transition: "background .15s, transform .1s", border: "1px solid rgba(0,0,0,0.035)" }}
                    onMouseDown={e => { (e.currentTarget.style.background = "#F0FDF4"); (e.currentTarget.style.transform = "scale(0.99)"); }}
                    onMouseUp={e => { (e.currentTarget.style.background = "#fff"); (e.currentTarget.style.transform = "scale(1)"); }}
                    onMouseLeave={e => { (e.currentTarget.style.background = "#fff"); (e.currentTarget.style.transform = "scale(1)"); }}
                    onTouchStart={e => (e.currentTarget.style.background = "#F0FDF4")}
                    onTouchEnd={e => (e.currentTarget.style.background = "#fff")}>
                    <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 4px rgba(34,197,94,0.15)" }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 600, color: "var(--theme-text)", marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12.5, color: "#9CA3AF", fontWeight: 400 }}>{item.desc}</div>
                    </div>
                    {item.toggle
                      ? <button onClick={e => { e.stopPropagation(); const v = !onlineStatus; setOnlineStatus(v); apiUpdateMessagingSettings({ onlineStatus: v }).catch(() => {}); }} className={`fbl-toggle ${onlineStatus ? "fbl-toggle-on" : "fbl-toggle-off"}`} />
                      : chevron
                    }
                  </div>
                ))}
              </div>

              {/* ── BrutePawa Premium card ── */}
              <div style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#dcfce7 60%,#bbf7d0 100%)", borderRadius: 28, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 16px rgba(34,197,94,0.13), 0 1px 4px rgba(0,0,0,.05)", marginTop: 14, border: "1px solid rgba(34,197,94,0.12)" }}>
                {/* BP Logo image */}
                <img src="/bp-logo-b.jpeg" alt="BrutePawa" style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 10px rgba(34,197,94,0.35)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>BrutePawa</span>
                    <span style={{ fontWeight: 700, fontSize: 16, color: "var(--bp-primary)" }}>Premium</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>Réseau social africain nouvelle génération</div>
                  <div style={{ width: 28, height: 3, borderRadius: 2, background: "linear-gradient(90deg,var(--bp-primary),#16a34a)", marginTop: 6 }} />
                </div>
                {/* Premium badge image */}
                <img src="/bp-badge-premium.jpeg" alt="Premium" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 12px rgba(34,197,94,0.4)" }} />
              </div>

              {/* ── Footer ── */}
              <div style={{ textAlign: "center", padding: "28px 0 8px", color: "#9CA3AF" }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Fait en Afrique 🇧🇯</div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>Version 1.0.0</div>
              </div>

            </div>
          </>;
        })()}

        {/* ── SCREEN 2 — Statut En ligne ── */}
        {settingsPage === "status" && <>
          <div style={{ background: "var(--theme-surface)", display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #E5E7EB", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            <button onClick={() => setSettingsPage("main")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 12px" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#111827"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 18, color: "var(--theme-text)" }}>Statut En ligne</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", paddingTop: 16 }}>
            <div style={{ background: "var(--theme-surface)", borderRadius: 14, margin: "0 14px 12px", padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 5px rgba(0,0,0,.07)" }}>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--theme-text)" }}>Indiquer si vous êtes en ligne</span>
              <button onClick={() => { const v = !onlineStatus; setOnlineStatus(v); apiUpdateMessagingSettings({ onlineStatus: v }).catch(() => {}); }} className={`fbl-toggle ${onlineStatus ? "fbl-toggle-on" : "fbl-toggle-off"}`} />
            </div>
            <div style={{ background: "var(--theme-surface)", borderRadius: 14, margin: "0 14px 12px", padding: "16px 18px", display: "flex", gap: 13, boxShadow: "0 1px 5px rgba(0,0,0,.07)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", border: "2.5px solid var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 17 }}>ℹ️</div>
              <span style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.7 }}>
                Lorsque ce paramètre est activé, votre statut En ligne est visible par les personnes avec qui vous êtes en contact sur <strong style={{ color: "var(--bp-primary)" }}>BrutePawa</strong>, et par celles auxquelles vous avez envoyé une invitation. Vous ne pouvez voir le statut En ligne des autres que si le vôtre est activé.
              </span>
            </div>
            <div style={{ background: "var(--theme-surface)", borderRadius: 14, margin: "0 14px 12px", padding: "16px 18px", display: "flex", gap: 13, boxShadow: "0 1px 5px rgba(0,0,0,.07)" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", border: "2.5px solid var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 17 }}>🔒</div>
              <div style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.7 }}>
                Pour ne plus afficher votre statut En ligne, désactivez-le partout où vous utilisez <strong style={{ color: "var(--bp-primary)" }}>BrutePawa</strong>.{" "}
                <span style={{ color: "var(--bp-primary)", fontWeight: 700, cursor: "pointer" }}>En savoir plus</span>
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "28px 20px 44px", marginTop: 4 }}>
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 30 }}>🤛</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>BrutePawa</span>
                <span style={{ fontSize: 12.5, color: "#9CA3AF" }}>Réseau social 100% africain ❤️</span>
              </div>
            </div>
          </div>
        </>}

        {/* ── Notifications de messages ── */}
        {settingsPage === "notifs" && <>
          <div style={{ background: "var(--theme-surface)", display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #E5E7EB", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            <button onClick={() => setSettingsPage("main")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 12px" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#111827"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 18, color: "var(--theme-text)" }}>Notifications de messages</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", paddingTop: 12 }}>
            {[
              { section: "Messages", desc: "Recevez des notifications push en temps réel lorsque vous recevez de nouveaux messages.", label: "Messages des discussions", val: notifMsgs, set: (v: boolean) => { setNotifMsgs(v); apiUpdateMessagingSettings({ notificationsEnabled: v }).catch(() => {}); } },
              { section: "Rappels de messages", desc: "Recevez des rappels occasionnels concernant des messages non lus dans des discussions récentes.", label: "Rappels de messages", val: notifReminders, set: (v: boolean) => setNotifReminders(v) },
              { section: "Aperçu des messages", desc: "Afficher les messages sur les notifications.", label: "Aperçu des messages", val: notifPreview, set: (v: boolean) => setNotifPreview(v) },
              { section: "Notifications en mode déconnecté", desc: "Continuez de recevoir les rappels de messages lorsqu'un autre compte est connecté.", label: "Notifications en mode déconnecté", val: notifOffline, set: (v: boolean) => setNotifOffline(v) },
            ].map(g => (
              <div key={g.section} style={{ margin: "0 14px 12px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--bp-primary)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, paddingLeft: 2 }}>{g.section}</div>
                <div style={{ background: "var(--theme-surface)", borderRadius: 14, padding: "6px 0", boxShadow: "0 1px 5px rgba(0,0,0,.07)" }}>
                  <div style={{ padding: "6px 18px 10px", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{g.desc}</div>
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderTop: "1px solid #F1F5F9" }}>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--theme-text)" }}>{g.label}</span>
                    <button onClick={() => g.set(!g.val)} className={`fbl-toggle ${g.val ? "fbl-toggle-on" : "fbl-toggle-off"}`} />
                  </div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: "center", padding: "28px 20px 44px", marginTop: 4 }}>
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 30 }}>🤛</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>BrutePawa</span>
                <span style={{ fontSize: 12.5, color: "#9CA3AF" }}>Réseau social 100% africain ❤️</span>
              </div>
            </div>
          </div>
        </>}

        {/* ── SCREEN 3 — Invitations par message ── */}
        {settingsPage === "invitations" && <>
          <div style={{ background: "var(--theme-surface)", display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #E5E7EB", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            <button onClick={() => setSettingsPage("main")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 12px" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#111827"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 18, color: "var(--theme-text)" }}>Invitations par message</span>
          </div>
          <div style={{ background: "var(--theme-surface)", display: "flex", flexShrink: 0 }}>
            {(["known", "spam"] as const).map(t => (
              <button key={t} onClick={() => setInvitTab(t)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "14px 4px", fontSize: 14, fontWeight: invitTab === t ? 700 : 500, color: invitTab === t ? "var(--bp-primary)" : "#64748B", borderBottom: `3px solid ${invitTab === t ? "var(--bp-primary)" : "transparent"}`, transition: "all .2s" }}>
                {t === "known" ? "Vous connaissez peut-être" : "Spam"}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", background: "var(--theme-surface)" }}>
            <div style={{ margin: "12px 14px", padding: "12px 14px", background: "#F0FDF4", borderRadius: 12, display: "flex", gap: 10, border: "1px solid #BBF7D0" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>ℹ️</span>
              <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.65 }}>
                Ouvrez une invitation pour en savoir plus sur la personne qui vous envoie le message. Elle n'en saura rien tant que vous ne l'aurez pas acceptée.{" "}
                <span style={{ color: "var(--bp-primary)", fontWeight: 700, cursor: "pointer" }}>Décidez qui peut vous envoyer un message</span>
              </div>
            </div>
            {msgRequests.length === 0 ? (
              <div style={{ padding: "52px 24px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>Aucune invitation en attente</div>
            ) : (
              msgRequests.map((req, i) => {
                const reqColors = ["var(--bp-primary)","#0EA5E9","#F97316","#8B5CF6","#EF4444","#0EA5E9","#D97706"];
                const c = reqColors[req.senderId % reqColors.length];
                const ini = req.senderName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                const t = req.createdAt ? new Date(req.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 16px", borderBottom: i < msgRequests.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer" }}
                    onClick={() => {
                      apiUpdateMessageRequest(req.id, "accepted").catch(() => {});
                      setActiveConv(req.senderId);
                      setActiveGroupId(null);
                      setSettingsPage("none");
                    }}>
                    <div style={{ width: 50, height: 50, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 17, flexShrink: 0 }}>{ini}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--theme-text)" }}>{req.senderName}</div>
                      <div style={{ fontSize: 13, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.messagePreview || "Invitation reçue"}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                      <span style={{ fontSize: 11.5, color: "#9CA3AF" }}>{t}</span>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="#E5E7EB"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </div>
                  </div>
                );
              })
            )}
            <div style={{ margin: "16px 14px", padding: "14px 16px", background: "var(--theme-surface)", borderRadius: 14, border: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 13, boxShadow: "0 1px 5px rgba(0,0,0,.07)", cursor: "pointer" }}
              onClick={() => setSettingsPage("privacy")}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--bp-primary)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)" }}>Contrôlez vos invitations</div>
                <div style={{ fontSize: 12.5, color: "#9CA3AF", marginTop: 2 }}>Paramètres de messagerie</div>
              </div>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#E5E7EB"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </div>
            <div style={{ textAlign: "center", padding: "28px 20px 44px", marginTop: 4 }}>
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 30 }}>🤛</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>BrutePawa</span>
                <span style={{ fontSize: 12.5, color: "#9CA3AF" }}>Réseau social 100% africain ❤️</span>
              </div>
            </div>
          </div>
        </>}

        {/* ── Archive ── */}
        {settingsPage === "archive" && <>
          <div style={{ background: "var(--theme-surface)", display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #E5E7EB", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            <button onClick={() => setSettingsPage("main")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 12px" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#111827"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 18, color: "var(--theme-text)" }}>Archive</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", background: "var(--theme-surface)" }}>
            <div style={{ padding: "52px 24px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>Aucune discussion archivée</div>
            <div style={{ textAlign: "center", padding: "8px 20px 44px" }}>
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 30 }}>🤛</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>BrutePawa</span>
                <span style={{ fontSize: 12.5, color: "#9CA3AF" }}>Réseau social 100% africain ❤️</span>
              </div>
            </div>
          </div>
        </>}

        {/* ── SCREEN 4 — Confidentialité et sécurité ── */}
        {settingsPage === "privacy" && <>
          <div style={{ background: "var(--theme-surface)", display: "flex", alignItems: "center", padding: "10px 4px", borderBottom: "1px solid #E5E7EB", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
            <button onClick={() => setSettingsPage("main")} style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 12px" }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#111827"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 18, color: "var(--theme-text)" }}>Confidentialité et sécurité</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", paddingTop: 8 }}>
            {[
              { section: "Qui peut vous contacter", items: [
                { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>, label: "Diffusion des messages", sub: "Choisissez qui peut vous envoyer un message" },
                { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/><line x1="17" y1="7" x2="23" y2="13" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round"/><line x1="23" y1="7" x2="17" y2="13" stroke="var(--bp-primary)" strokeWidth="2.2" strokeLinecap="round"/></svg>, label: "Comptes bloqués", sub: "Empêchez quelqu'un de vous contacter" },
                { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>, label: "Contacts masqués", sub: "Masquez des personnes dans vos suggestions" },
              ]},
              { section: "Ce que voient les personnes", items: [
                { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>, label: "Confirmations de lecture", sub: "Indiquez aux personnes que vous avez lu leurs messages", hasToggle: true },
              ]},
              { section: "Discussions chiffrées de bout en bout", items: [
                { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>, label: "Alertes de sécurité", sub: "Consultez et gérez les alertes de connexion" },
                { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M20 6h-2.18c.07-.44.18-.88.18-1a6 6 0 0 0-12 0c0 .12.11.56.18 1H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-5a4 4 0 0 1 4 4c0 .12-.12.55-.18.88L7.34 6H7.18C7.12 5.55 7 5.12 7 5a4 4 0 0 1 4-4h1z"/></svg>, label: "Stockage des messages", sub: "Gérez l'accès à votre historique des discussions" },
                { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="var(--bp-primary)" stroke="none"/></svg>, label: "Aperçus", sub: "Affichez les aperçus du contenu partagé" },
                { icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>, label: "Vérifier les clés dans la discussion", sub: "Appuyez longuement pour voir les clés" },
              ]},
            ].map(group => (
              <div key={group.section} style={{ margin: "0 14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--bp-primary)", textTransform: "uppercase", letterSpacing: .7, padding: "0 2px 8px" }}>{group.section}</div>
                <div style={{ background: "var(--theme-surface)", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 5px rgba(0,0,0,.07)" }}>
                  {group.items.map((item, idx) => (
                    <div key={item.label} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderTop: idx > 0 ? "1px solid #F1F5F9" : "none", gap: 14, cursor: "pointer" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 12.5, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</div>
                      </div>
                      {(item as { hasToggle?: boolean }).hasToggle
                        ? <button onClick={() => { const v = !readReceiptsEnabled; setReadReceiptsEnabled(v); apiUpdateMessagingSettings({ readReceiptsEnabled: v }).catch(() => {}); }} className={`fbl-toggle ${readReceiptsEnabled ? "fbl-toggle-on" : "fbl-toggle-off"}`} />
                        : <svg viewBox="0 0 24 24" width="18" height="18" fill="#E5E7EB"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                      }
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ textAlign: "center", padding: "12px 20px 44px", marginTop: 4 }}>
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 30 }}>🤛</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-text)" }}>BrutePawa</span>
                <span style={{ fontSize: 12.5, color: "#9CA3AF" }}>Réseau social 100% africain ❤️</span>
              </div>
            </div>
          </div>
        </>}

      </div>
    , document.body)}
    </>
  );
}
