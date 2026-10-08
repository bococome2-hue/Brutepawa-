import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "../router";
import { apiFetch, apiGetUsers, type PublicUser } from "../lib/api";

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
interface BroadcastList {
  id: number; name: string; emoji: string; color: string;
  coverImage: string | null; ownerId: number; description: string | null;
  createdAt: string; updatedAt: string; recipientCount: number;
}
interface BroadcastMember {
  memberId: number; userId: number; firstName: string; lastName: string;
  avatarUrl: string | null; phone: string | null; createdAt: string;
}
interface BroadcastMessage {
  id: number; broadcastId: number; senderId: number; messageType: string;
  content: string; mediaUrl: string | null; createdAt: string;
}
interface BroadcastInfo {
  id: number; name: string; emoji: string; color: string; coverImage: string | null;
  ownerId: number; createdAt: string; members: number;
  messagesSent: number; delivered: number; deliveredPct: string;
  read: number; readPct: string; openRate: string; engagementRate: string;
  lastActivity: string;
}
interface NotifSettings {
  notificationsEnabled: boolean; soundEnabled: boolean;
  vibrationEnabled: boolean; highPriority: boolean; muteUntil: string | null;
}

/* ═══════════════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════════════ */
const bcFetch = async (path: string, opts?: RequestInit) => {
  const r = await apiFetch(`/broadcast${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

/* ═══════════════════════════════════════════════════════════════
   ICONS (inline SVG, exact maquette shapes)
═══════════════════════════════════════════════════════════════ */
const IcBack       = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>;
const IcDots       = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>;
const IcInfo       = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IcEditPeople = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IcAddPerson  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>;
const IcPencil     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcSearch     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
const IcImage      = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
const IcBell       = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const IcExport     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>;
const IcTrashRed   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcTrashRedFill = () => <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IcMic        = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
const IcSmile      = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const IcPaperclip  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>;
const IcBroadcast  = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IcBroadcastLg = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IcCheck      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcChevronR   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IcPdf        = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="#EF4444"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6" fill="#EF4444" stroke="#fff" strokeWidth="0"/><text x="6" y="19" fontSize="6" fill="white" fontWeight="bold">PDF</text></svg>;
const IcXls        = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--bp-primary)"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><text x="5.5" y="19" fontSize="5" fill="white" fontWeight="bold">XLS</text></svg>;
const IcCsv        = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="#0EA5E9"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><text x="5.5" y="19" fontSize="5.5" fill="white" fontWeight="bold">CSV</text></svg>;
const IcCloud      = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>;
const IcBroom      = () => <svg width="80" height="80" viewBox="0 0 100 100" fill="none"><rect x="40" y="10" width="8" height="50" rx="4" fill="var(--bp-primary)"/><ellipse cx="44" cy="70" rx="20" ry="14" fill="var(--bp-primary)"/><path d="M24 75 Q44 85 64 75" stroke="var(--bp-primary-dark)" strokeWidth="3" fill="none"/><rect x="38" y="8" width="12" height="8" rx="3" fill="var(--bp-primary-dark)"/></svg>;
const IcCamera     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>;
const IcPhone      = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>;
const IcFile       = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcLink       = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IcShield     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

/* ═══════════════════════════════════════════════════════════════
   WALLPAPER PATTERN (exact maquette — very light green with icons)
═══════════════════════════════════════════════════════════════ */
const WallpaperBg = () => (
  <div style={{
    position: "absolute", inset: 0, overflow: "hidden", zIndex: 0,
    background: "#DCFCE7",
  }}>
    {/* Pattern of faint icons like WhatsApp chat bg */}
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.18 }}>
      <defs>
        <pattern id="bcPattern" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          {/* Chat bubble */}
          <path d="M10 20 Q10 10 20 10 L50 10 Q60 10 60 20 L60 35 Q60 45 50 45 L25 45 L15 55 L17 45 L20 45 Q10 45 10 35 Z" fill="var(--bp-primary)" opacity="0.5"/>
          {/* Smiley */}
          <circle cx="90" cy="30" r="12" fill="none" stroke="var(--bp-primary)" strokeWidth="2" opacity="0.5"/>
          <circle cx="86" cy="27" r="1.5" fill="var(--bp-primary)" opacity="0.5"/>
          <circle cx="94" cy="27" r="1.5" fill="var(--bp-primary)" opacity="0.5"/>
          <path d="M86 33 Q90 37 94 33" fill="none" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.5"/>
          {/* People */}
          <circle cx="30" cy="90" r="5" fill="var(--bp-primary)" opacity="0.5"/>
          <path d="M20 110 Q20 100 30 100 Q40 100 40 110" fill="var(--bp-primary)" opacity="0.5"/>
          {/* Star */}
          <polygon points="90,75 92,82 99,82 93,87 95,94 90,89 85,94 87,87 81,82 88,82" fill="var(--bp-primary)" opacity="0.4"/>
          {/* Shield */}
          <path d="M60 65 L60 57 L68 54 L76 57 L76 65 Q76 73 68 76 Q60 73 60 65Z" fill="none" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.5"/>
          {/* Camera */}
          <rect x="5" y="75" width="22" height="16" rx="3" fill="none" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.5"/>
          <circle cx="16" cy="83" r="4" fill="none" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.5"/>
          <path d="M22 75 L24 71 L28 71" fill="none" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.5"/>
          {/* Airplane */}
          <path d="M88 100 L100 110 L96 100 L100 90 Z" fill="var(--bp-primary)" opacity="0.5"/>
          {/* Gift box */}
          <rect x="55" y="97" width="20" height="16" rx="2" fill="none" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.5"/>
          <path d="M55 103 L75 103" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.5"/>
          <path d="M65 97 L65 113" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.5"/>
          {/* Game controller */}
          <rect x="2" y="50" width="26" height="16" rx="6" fill="none" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.4"/>
          <circle cx="20" cy="58" r="2" fill="var(--bp-primary)" opacity="0.4"/>
          <path d="M8 55 L8 61 M5 58 L11 58" stroke="var(--bp-primary)" strokeWidth="1.5" opacity="0.4"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bcPattern)"/>
    </svg>
    {/* BrutePawa watermark bottom-left */}
    <div style={{
      position: "absolute", bottom: 80, left: 20,
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, opacity: 0.25,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: "var(--bp-primary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 20, color: "white", fontFamily: "Inter, sans-serif",
      }}>b</div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-primary)", letterSpacing: 0.5, fontFamily: "Inter, sans-serif" }}>BrutePawa</span>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   AVATAR helper
═══════════════════════════════════════════════════════════════ */
function Avatar({ url, name, size = 40, color = "var(--bp-primary)" }: { url?: string | null; name?: string; size?: number; color?: string }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  const initials = (name ?? "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "white", flexShrink: 0,
      fontFamily: "Inter, sans-serif",
    }}>{initials}</div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORMAT DATE helpers
═══════════════════════════════════════════════════════════════ */
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) +
    " à " + dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(d: string | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Aujourd'hui à ${new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  return fmtDate(d);
}

/* ═══════════════════════════════════════════════════════════════
   PAGE HEADER (shared across sub-pages)
═══════════════════════════════════════════════════════════════ */
function SubPageHeader({ title, onBack, rightSlot }: { title: string; onBack: () => void; rightSlot?: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--bp-primary)", padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
    }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
        <IcBack />
      </button>
      <span style={{ flex: 1, fontSize: 18, fontWeight: 600, color: "white", fontFamily: "Inter, sans-serif" }}>{title}</span>
      {rightSlot ?? (
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          <IcDots />
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-PAGE WRAPPER
═══════════════════════════════════════════════════════════════ */
function SubPage({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "#F8FAFC",
      display: "flex", flexDirection: "column",
      transform: visible ? "translateX(0)" : "translateX(100%)",
      transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
      overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOGGLE SWITCH
═══════════════════════════════════════════════════════════════ */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 48, height: 26, borderRadius: 13, cursor: "pointer",
      background: checked ? "var(--bp-primary)" : "#E5E7EB",
      transition: "background 0.2s", position: "relative", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 3, left: checked ? 25 : 3,
        width: 20, height: 20, borderRadius: "50%", background: "var(--theme-surface)",
        transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      }}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS ROW
═══════════════════════════════════════════════════════════════ */
function SettingRow({ label, value, rightSlot, onClick }: { label: string; value?: string; rightSlot?: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 20px", background: "var(--theme-surface)", cursor: onClick ? "pointer" : "default",
    }}>
      <span style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {value && <span style={{ fontSize: 14, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{value}</span>}
        {rightSlot}
        {onClick && !rightSlot && <IcChevronR />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 1 : INFOS DE LA LISTE ──
═══════════════════════════════════════════════════════════════ */
function InfosPage({ bcId, onBack, onRename }: { bcId: number; onBack: () => void; onRename: () => void }) {
  const [info, setInfo] = useState<BroadcastInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bcFetch(`/${bcId}/info`).then(setInfo).catch(console.error).finally(() => setLoading(false));
  }, [bcId]);

  return (
    <SubPage visible>
      <SubPageHeader title="Infos de la liste" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading || !info ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div style={{ width: 32, height: 32, border: "3px solid var(--bp-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
          </div>
        ) : (
          <>
            {/* Avatar + name */}
            <div style={{ background: "var(--theme-surface)", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px 20px" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%", background: info.color ?? "var(--bp-primary)",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
              }}>
                <IcBroadcastLg />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{info.name}</span>
                <button onClick={onRename} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  <IcPencil />
                </button>
              </div>
            </div>

            <div style={{ height: 8, background: "#F8FAFC" }}/>

            {/* Meta */}
            <div style={{ background: "var(--theme-surface)" }}>
              <div style={{ padding: "12px 20px 4px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--bp-primary)", textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>Informations</span>
              </div>
              {[
                { label: "Créé par", value: "Vous" },
                { label: "Date de création", value: fmtDate(info.createdAt) },
                { label: "Nombre de destinataires", value: `${info.members} contacts` },
              ].map((row, i) => (
                <div key={i} style={{ padding: "13px 20px", borderTop: i > 0 ? "1px solid #F3F4F6" : "none", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 8, background: "#F8FAFC" }}/>

            {/* Stats */}
            <div style={{ background: "var(--theme-surface)" }}>
              <div style={{ padding: "12px 20px 4px" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--bp-primary)", textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>Statistiques d'envoi</span>
              </div>
              {[
                { label: "Messages envoyés",  value: String(info.messagesSent) },
                { label: "Messages délivrés", value: `${info.delivered} (${info.deliveredPct}%)` },
                { label: "Messages lus",      value: `${info.read} (${info.readPct}%)` },
                { label: "Taux d'ouverture",  value: `${info.openRate}%` },
                { label: "Taux d'engagement", value: `${info.engagementRate}%` },
              ].map((row, i) => (
                <div key={i} style={{ padding: "13px 20px", borderTop: i > 0 ? "1px solid #F3F4F6" : "none", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 8, background: "#F8FAFC" }}/>

            <div style={{ background: "var(--theme-surface)", padding: "13px 20px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "#64748B", fontFamily: "Inter, sans-serif" }}>Dernière activité</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{fmtRelative(info.lastActivity)}</span>
            </div>
          </>
        )}
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 2 : MODIFIER LES DESTINATAIRES ──
═══════════════════════════════════════════════════════════════ */
function ModifierPage({ bcId, onBack }: { bcId: number; onBack: () => void }) {
  const [members, setMembers]       = useState<BroadcastMember[]>([]);
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const [q, setQ]                   = useState("");
  const [loading, setLoading]       = useState(true);
  const [deleting, setDeleting]     = useState(false);
  const [total, setTotal]           = useState(0);
  const [selecting, setSelecting]   = useState(false);

  const load = useCallback((query = "") => {
    setLoading(true);
    bcFetch(`/${bcId}/members?q=${encodeURIComponent(query)}&limit=100`)
      .then((data: BroadcastMember[]) => { setMembers(data); setTotal(data.length); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bcId]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (uid: number) => {
    setSelected(prev => { const s = new Set(prev); s.has(uid) ? s.delete(uid) : s.add(uid); return s; });
  };

  const handleBulkRemove = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      await bcFetch(`/${bcId}/members/bulk-remove`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [...selected] }),
      });
      setSelected(new Set()); setSelecting(false); load(q);
    } finally { setDeleting(false); }
  };

  return (
    <SubPage visible>
      <SubPageHeader title="Modifier les destinataires" onBack={onBack} />
      {/* Search */}
      <div style={{ background: "var(--theme-surface)", padding: "10px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#F1F5F9", borderRadius: 24, padding: "8px 14px", gap: 8 }}>
          <IcSearch />
          <input value={q} onChange={e => { setQ(e.target.value); load(e.target.value); }} placeholder="Rechercher un contact"
            style={{ flex: 1, border: "none", background: "none", fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif", color: "var(--theme-text)" }}
          />
        </div>
      </div>
      {/* Count row */}
      <div style={{ background: "var(--theme-surface)", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F3F4F6" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--bp-primary)", fontFamily: "Inter, sans-serif" }}>{total} destinataires</span>
        <button onClick={() => setSelecting(!selecting)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--bp-primary)", fontFamily: "Inter, sans-serif" }}>
          {selecting ? "Annuler" : "Sélectionner"}
        </button>
      </div>
      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--theme-surface)" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div style={{ width: 28, height: 28, border: "3px solid var(--bp-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
          </div>
        ) : members.map((m, i) => (
          <div key={m.userId} onClick={() => selecting && toggleSelect(m.userId)} style={{
            display: "flex", alignItems: "center", padding: "10px 16px", gap: 12,
            borderTop: i > 0 ? "1px solid #F8FAFC" : "none",
            cursor: selecting ? "pointer" : "default",
          }}>
            {selecting && (
              <div style={{
                width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selected.has(m.userId) ? "var(--bp-primary)" : "#E5E7EB"}`,
                background: selected.has(m.userId) ? "var(--bp-primary)" : "white",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {selected.has(m.userId) && <IcCheck />}
              </div>
            )}
            <Avatar url={m.avatarUrl} name={`${m.firstName} ${m.lastName}`} size={44}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{m.firstName} {m.lastName}</div>
              <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>Membre depuis {fmtDate(m.createdAt).split(" à")[0]}</div>
            </div>
            {!selecting && (
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <IcDots />
              </button>
            )}
          </div>
        ))}
      </div>
      {/* Bottom actions */}
      <div style={{ background: "var(--theme-surface)", padding: "12px 16px", borderTop: "1px solid #F3F4F6", display: "flex", flexDirection: "column", gap: 8 }}>
        {selecting && selected.size > 0 && (
          <button onClick={handleBulkRemove} disabled={deleting} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "#EF4444", color: "white", border: "none", borderRadius: 14,
            padding: "14px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif",
          }}>
            <IcTrashRed />
            <span style={{ color: "white" }}>{deleting ? "Suppression…" : `Supprimer (${selected.size})`}</span>
          </button>
        )}
        <button style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "none", color: "var(--bp-primary)", border: "none", borderRadius: 14,
          padding: "12px 20px", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
        }}>
          <IcAddPerson />
          <span>Importer depuis contacts</span>
        </button>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 3 : AJOUTER DES DESTINATAIRES ──
═══════════════════════════════════════════════════════════════ */
function AjouterPage({ bcId, onBack }: { bcId: number; onBack: () => void }) {
  const [q, setQ]               = useState("");
  const [suggestions, setSugg]  = useState<PublicUser[]>([]);
  const [adding, setAdding]     = useState<Set<number>>(new Set());
  const [added, setAdded]       = useState<Set<number>>(new Set());

  useEffect(() => {
    apiGetUsers().then(u => setSugg(u.slice(0, 8))).catch(console.error);
  }, []);

  const addUser = async (uid: number) => {
    setAdding(prev => new Set(prev).add(uid));
    try {
      await bcFetch(`/${bcId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      setAdded(prev => new Set(prev).add(uid));
    } finally {
      setAdding(prev => { const s = new Set(prev); s.delete(uid); return s; });
    }
  };

  const filtered = q ? suggestions.filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q.toLowerCase())
  ) : suggestions;

  return (
    <SubPage visible>
      <SubPageHeader title="Ajouter des destinataires" onBack={onBack} />
      {/* Search */}
      <div style={{ background: "var(--theme-surface)", padding: "10px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#F1F5F9", borderRadius: 24, padding: "8px 14px", gap: 8 }}>
          <IcSearch />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un contact"
            style={{ flex: 1, border: "none", background: "none", fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif", color: "var(--theme-text)" }}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Quick options */}
        <div style={{ background: "var(--theme-surface)", marginTop: 8, borderRadius: 0 }}>
          {[
            { icon: <IcEditPeople />, label: "Contacts BrutePawa", sub: "Ajouter depuis vos contacts" },
            { icon: <IcPhone />,      label: "Importer depuis téléphone", sub: "Ajouter depuis votre répertoire" },
            { icon: <IcFile />,       label: "Importer depuis un fichier", sub: "Fichier CSV, Excel ou TXT" },
          ].map((opt, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", padding: "14px 20px", gap: 14,
              borderBottom: "1px solid #F3F4F6", cursor: "pointer",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: "#F0FDF4",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{opt.sub}</div>
              </div>
              <IcChevronR />
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div style={{ padding: "14px 20px 8px" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>Suggestions intelligentes</span>
        </div>
        <div style={{ background: "var(--theme-surface)" }}>
          {filtered.map((u, i) => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", padding: "10px 16px", gap: 12,
              borderTop: i > 0 ? "1px solid #F8FAFC" : "none",
            }}>
              <Avatar url={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} size={44}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{u.firstName} {u.lastName}</div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{u.bio ?? u.country ?? "Contact BrutePawa"}</div>
              </div>
              <button onClick={() => !added.has(u.id) && addUser(u.id)} style={{
                width: 32, height: 32, borderRadius: "50%", border: "none", cursor: "pointer",
                background: added.has(u.id) ? "var(--bp-primary)" : "#F0FDF4",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {adding.has(u.id) ? <div style={{ width: 14, height: 14, border: "2px solid var(--bp-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/> :
                  added.has(u.id) ? <IcCheck /> :
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                }
              </button>
            </div>
          ))}
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 4 : MÉDIAS PARTAGÉS ──
═══════════════════════════════════════════════════════════════ */
function MediasPage({ bcId, onBack }: { bcId: number; onBack: () => void }) {
  const [tab, setTab]       = useState<"photo" | "video" | "audio" | "doc" | "link">("photo");
  const [media, setMedia]   = useState<BroadcastMessage[]>([]);
  const [loading, setLoad]  = useState(true);
  const [searchQ, setSearchQ] = useState("");

  const TABS = [
    { key: "photo" as const, label: "Photos" },
    { key: "video" as const, label: "Vidéos" },
    { key: "audio" as const, label: "Audios" },
    { key: "doc"   as const, label: "Docs" },
    { key: "link"  as const, label: "Liens" },
  ];

  useEffect(() => {
    setLoad(true);
    bcFetch(`/${bcId}/media?type=${tab}`).then(setMedia).catch(console.error).finally(() => setLoad(false));
  }, [bcId, tab]);

  return (
    <SubPage visible>
      <SubPageHeader title="Médias partagés" onBack={onBack} />
      {/* Tabs */}
      <div style={{ background: "var(--theme-surface)", padding: "8px 16px", display: "flex", gap: 6, borderBottom: "1px solid #F3F4F6", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            background: tab === t.key ? "var(--bp-primary)" : "#F1F5F9",
            color: tab === t.key ? "white" : "#64748B",
            fontSize: 13, fontWeight: 600, fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <div style={{ width: 28, height: 28, border: "3px solid var(--bp-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
          </div>
        ) : media.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", gap: 12 }}>
            <IcImage />
            <span style={{ fontSize: 15, color: "#64748B", fontFamily: "Inter, sans-serif" }}>Aucun média pour l'instant</span>
          </div>
        ) : (
          <>
            {tab === "photo" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, padding: 2 }}>
                {media.map((m, i) => (
                  <div key={m.id} style={{ position: "relative", aspectRatio: "1", background: "#E5E7EB", overflow: "hidden" }}>
                    {m.mediaUrl && <img src={m.mediaUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>}
                    {i === media.length - 1 && media.length >= 9 && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>+{media.length - 8}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {tab !== "photo" && media.map((m, i) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", padding: "12px 16px", gap: 12,
                borderTop: i > 0 ? "1px solid #F3F4F6" : "none", background: "var(--theme-surface)",
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {tab === "video" ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16"/></svg>
                    : tab === "audio" ? <IcMic />
                    : tab === "doc"   ? <IcFile />
                    : <IcLink />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.content || m.mediaUrl?.split("/").pop() || `${tab} ${m.id}`}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{fmtRelative(m.createdAt)}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {/* Search bar */}
      <div style={{ background: "var(--theme-surface)", padding: "10px 16px", borderTop: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", background: "#F1F5F9", borderRadius: 24, padding: "8px 14px", gap: 8, flex: 1 }}>
          <IcSearch />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Rechercher un média"
            style={{ flex: 1, border: "none", background: "none", fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif", color: "var(--theme-text)" }}
          />
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
        </button>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 5 : PARAMÈTRES DE NOTIFICATION ──
═══════════════════════════════════════════════════════════════ */
function NotifPage({ bcId, onBack, onSubPage }: { bcId: number; onBack: () => void; onSubPage: (id: string) => void }) {
  const [settings, setSettings] = useState<NotifSettings>({
    notificationsEnabled: true, soundEnabled: true, vibrationEnabled: true, highPriority: true, muteUntil: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bcFetch(`/${bcId}/notifications`).then(setSettings).catch(console.error);
  }, [bcId]);

  const save = async (patch: Partial<NotifSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try { await bcFetch(`/${bcId}/notifications`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }); }
    finally { setSaving(false); }
  };

  return (
    <SubPage visible>
      <SubPageHeader title="Paramètres de notification" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)", borderRadius: 0 }}>
          <SettingRow label="Notifications activées" rightSlot={<Toggle checked={settings.notificationsEnabled} onChange={v => save({ notificationsEnabled: v })}/>}/>
          <div style={{ height: 1, background: "#F1F5F9", margin: "0 20px" }}/>
          <SettingRow label="Sonnerie" value="BrutePawa Notification" onClick={() => onSubPage("sonnerie")}/>
          <div style={{ height: 1, background: "#F1F5F9", margin: "0 20px" }}/>
          <SettingRow label="Vibration" value="Par défaut" onClick={() => onSubPage("vibration")}/>
          <div style={{ height: 1, background: "#F1F5F9", margin: "0 20px" }}/>
          <SettingRow label="Priorité" value="Haute priorité" onClick={() => onSubPage("priorite")}/>
          <div style={{ height: 1, background: "#F1F5F9", margin: "0 20px" }}/>
          <SettingRow label="Aperçu des messages" value="Toujours afficher" onClick={() => onSubPage("apercu")}/>
        </div>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)" }}>
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            padding: "14px 20px", gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>Mode silencieux</div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 4, lineHeight: "1.4", fontFamily: "Inter, sans-serif", maxWidth: 220 }}>
                Désactiver les notifications pendant une période donnée
              </div>
            </div>
            <Toggle checked={!!settings.muteUntil} onChange={() => {}}/>
          </div>
        </div>
        <div style={{ height: 12 }}/>
        {/* Notification preview illustration */}
        <div style={{ background: "var(--theme-surface)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: "#F0FDF4",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <IcBell />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>Aperçu</div>
            <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif", lineHeight: "1.4" }}>
              Vous recevrez des notifications pour tous les messages de cette liste de diffusion.
            </div>
          </div>
        </div>
        {saving && <div style={{ textAlign: "center", padding: 8, fontSize: 12, color: "var(--bp-primary)", fontFamily: "Inter, sans-serif" }}>Enregistrement…</div>}
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 6 : EXPORTER LA DIFFUSION ──
═══════════════════════════════════════════════════════════════ */
function ExportPage({ bcId, onBack }: { bcId: number; onBack: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done,    setDone]    = useState<string | null>(null);

  const doExport = async (type: string) => {
    setLoading(type);
    try {
      await bcFetch(`/${bcId}/export`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType: type }),
      });
      setDone(type);
      setTimeout(() => setDone(null), 3000);
    } finally { setLoading(null); }
  };

  const options = [
    { key: "pdf",    label: "Exporter en PDF",   sub: "Document PDF",              icon: <IcPdf /> },
    { key: "excel",  label: "Exporter en Excel",  sub: "Fichier Excel (.xlsx)",     icon: <IcXls /> },
    { key: "csv",    label: "Exporter en CSV",    sub: "Fichier CSV (.csv)",        icon: <IcCsv /> },
    { key: "cloud",  label: "Sauvegarder sur BrutePawa Cloud", sub: "Sauvegarde sécurisée en ligne", icon: <IcCloud /> },
  ];

  return (
    <SubPage visible>
      <SubPageHeader title="Exporter la diffusion" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "20px 20px 12px" }}>
          <span style={{ fontSize: 14, color: "#64748B", fontFamily: "Inter, sans-serif" }}>Choisissez le format d'exportation</span>
        </div>
        <div style={{ background: "var(--theme-surface)" }}>
          {options.map((opt, i) => (
            <div key={opt.key} onClick={() => doExport(opt.key)} style={{
              display: "flex", alignItems: "center", padding: "14px 20px", gap: 14,
              borderTop: i > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer",
            }}>
              <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{opt.label}</div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{opt.sub}</div>
              </div>
              {loading === opt.key
                ? <div style={{ width: 20, height: 20, border: "2px solid var(--bp-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                : done === opt.key
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <IcChevronR />}
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <IcShield />
          <span style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif", lineHeight: "1.5" }}>
            Vos données sont chiffrées de bout en bout et sécurisées par BrutePawa.
          </span>
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 7 : EFFACER LA CONVERSATION ──
═══════════════════════════════════════════════════════════════ */
function EffacerPage({ bcId, onBack, onCleared }: { bcId: number; onBack: () => void; onCleared: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    setLoading(true);
    try {
      await bcFetch(`/${bcId}/clear`, { method: "POST" });
      onCleared();
    } finally { setLoading(false); }
  };

  return (
    <SubPage visible>
      <SubPageHeader title="Effacer la conversation" onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px", gap: 20 }}>
        <IcBroom />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--theme-text)", marginBottom: 12, fontFamily: "Inter, sans-serif" }}>Effacer tous les messages ?</div>
          <div style={{ fontSize: 14, color: "#64748B", lineHeight: "1.6", fontFamily: "Inter, sans-serif" }}>
            Cette action supprimera tous les messages de cette conversation. Cette action ne supprimera pas la liste de diffusion.
          </div>
        </div>
      </div>
      <div style={{ padding: "0 20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={handleClear} disabled={loading} style={{
          background: "#EF4444", color: "white", border: "none", borderRadius: 14,
          padding: "15px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer",
          fontFamily: "Inter, sans-serif", opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Effacement…" : "Effacer la conversation"}
        </button>
        <button onClick={onBack} style={{
          background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 14,
          padding: "15px 20px", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
        }}>Annuler</button>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 8 : SUPPRIMER LA LISTE ──
═══════════════════════════════════════════════════════════════ */
function SupprimerPage({ bcId, memberCount, onBack, onDeleted }: { bcId: number; memberCount: number; onBack: () => void; onDeleted: () => void }) {
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (input !== "SUPPRIMER") return;
    setLoading(true);
    try {
      await bcFetch(`/${bcId}`, { method: "DELETE" });
      onDeleted();
    } finally { setLoading(false); }
  };

  return (
    <SubPage visible>
      <SubPageHeader title="Supprimer la liste de diffusion" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 28px 20px", gap: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: "#FEE2E2",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IcTrashRedFill />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--theme-text)", marginBottom: 10, fontFamily: "Inter, sans-serif" }}>Supprimer cette liste de diffusion ?</div>
            <div style={{ fontSize: 14, color: "#64748B", lineHeight: "1.6", fontFamily: "Inter, sans-serif" }}>
              Cette action supprimera définitivement cette liste et tous ses destinataires. Cette action est <span style={{ color: "#EF4444", fontWeight: 600 }}>irréversible</span>.
            </div>
          </div>
        </div>
        <div style={{ margin: "0 20px", padding: "14px 16px", background: "#FEE2E2", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <IcTrashRed />
          <span style={{ fontSize: 14, color: "#EF4444", fontFamily: "Inter, sans-serif" }}>
            <strong>{memberCount}</strong> destinataires seront supprimés de cette liste.
          </span>
        </div>
        <div style={{ margin: "20px 20px 0" }}>
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 8, fontFamily: "Inter, sans-serif" }}>
            Tapez <strong>"SUPPRIMER"</strong> pour confirmer
          </div>
          <input
            value={input} onChange={e => setInput(e.target.value)} placeholder="SUPPRIMER"
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 12,
              border: `2px solid ${input === "SUPPRIMER" ? "#EF4444" : "#E5E7EB"}`,
              fontSize: 15, fontFamily: "Inter, sans-serif", outline: "none",
              background: "var(--theme-surface)", color: "var(--theme-text)", boxSizing: "border-box",
              letterSpacing: input === "SUPPRIMER" ? 1.5 : 0,
            }}
          />
        </div>
      </div>
      <div style={{ padding: "16px 20px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={handleDelete} disabled={input !== "SUPPRIMER" || loading} style={{
          background: input === "SUPPRIMER" ? "#EF4444" : "#FCA5A5",
          color: "white", border: "none", borderRadius: 14,
          padding: "15px 20px", fontSize: 15, fontWeight: 600, cursor: input === "SUPPRIMER" ? "pointer" : "not-allowed",
          fontFamily: "Inter, sans-serif", transition: "background 0.2s",
        }}>
          {loading ? "Suppression…" : "Supprimer définitivement"}
        </button>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 9 : RECHERCHER DANS LA CONVERSATION ──
═══════════════════════════════════════════════════════════════ */
function RecherchePage({ bcId, onBack }: { bcId: number; onBack: () => void }) {
  const [q,        setQ]       = useState("");
  const [typeF,    setTypeF]   = useState<string | null>(null);
  const [results,  setResults] = useState<BroadcastMessage[]>([]);
  const [loading,  setLoading] = useState(false);

  const FILTERS = [
    { key: "image", label: "Photos",  icon: <IcImage /> },
    { key: "video", label: "Vidéos",  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16"/></svg> },
    { key: "doc",   label: "Fichiers",icon: <IcFile /> },
    { key: "link",  label: "Liens",   icon: <IcLink /> },
  ];

  const doSearch = useCallback(() => {
    if (!q && !typeF) { setResults([]); return; }
    setLoading(true);
    const params = new URLSearchParams();
    if (q)     params.set("q", q);
    if (typeF) params.set("type", typeF);
    bcFetch(`/${bcId}/search?${params}`).then(setResults).catch(console.error).finally(() => setLoading(false));
  }, [bcId, q, typeF]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const typeIcon: Record<string, React.ReactNode> = {
    image: <IcImage />, video: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16"/></svg>,
    doc: <IcFile />, link: <IcLink />, text: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>,
  };

  return (
    <SubPage visible>
      <SubPageHeader title="Rechercher dans la conversation" onBack={onBack} />
      <div style={{ background: "var(--theme-surface)", padding: "10px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#F1F5F9", borderRadius: 24, padding: "8px 14px", gap: 8 }}>
          <IcSearch />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un mot, un contact..."
            style={{ flex: 1, border: "none", background: "none", fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif", color: "var(--theme-text)" }}
            autoFocus
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Filters */}
        <div style={{ padding: "12px 16px 4px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 10, fontFamily: "Inter, sans-serif" }}>Filtres</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setTypeF(typeF === f.key ? null : f.key)} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20,
                background: typeF === f.key ? "#F0FDF4" : "#F1F5F9",
                border: `1.5px solid ${typeF === f.key ? "var(--bp-primary)" : "transparent"}`,
                color: typeF === f.key ? "var(--bp-primary)" : "#64748B",
                fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "Inter, sans-serif",
              }}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
        {/* Date & Author */}
        <div style={{ background: "var(--theme-surface)", marginTop: 8 }}>
          {[
            { label: "Recherche par date", value: "Sélectionner une période", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
            { label: "Recherche par auteur", value: "Tous les auteurs", icon: <IcEditPeople /> },
          ].map((row, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", padding: "13px 20px",
              borderTop: i > 0 ? "1px solid #F3F4F6" : "1px solid #F3F4F6",
              cursor: "pointer", gap: 12,
            }}>
              {row.icon}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{row.label}</div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{row.value}</div>
              </div>
              <IcChevronR />
            </div>
          ))}
        </div>
        {/* Results */}
        {(results.length > 0 || loading) && (
          <div style={{ marginTop: 8 }}>
            <div style={{ padding: "10px 20px 4px" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>
                {loading ? "Recherche…" : "Résultats récents"}
              </span>
            </div>
            <div style={{ background: "var(--theme-surface)" }}>
              {results.map((r, i) => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", padding: "10px 16px", gap: 12,
                  borderTop: i > 0 ? "1px solid #F8FAFC" : "none",
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {typeIcon[r.messageType] ?? typeIcon.text}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.content || r.mediaUrl?.split("/").pop() || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
                      {r.messageType.charAt(0).toUpperCase() + r.messageType.slice(1)}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0, fontFamily: "Inter, sans-serif" }}>{fmtRelative(r.createdAt)}</span>
                </div>
              ))}
            </div>
            {results.length >= 5 && (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--bp-primary)", fontFamily: "Inter, sans-serif" }}>
                  Voir tous les résultats
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 10 : RENOMMER LA LISTE ──
═══════════════════════════════════════════════════════════════ */
const COLORS = ["var(--bp-primary)", "#8B5CF6", "#DCFCE7", "#F97316", "#EF4444", "#EF4444", "#1E293B"];
const EMOJIS = ["📢", "👥", "🎯", "⭐", "🚀", "💎", "🌍"];

function RenommerPage({ bcId, list, onBack, onRenamed }: { bcId: number; list: BroadcastList; onBack: () => void; onRenamed: (updated: Partial<BroadcastList>) => void }) {
  const [name,    setName]    = useState(list.name);
  const [emoji,   setEmoji]   = useState(list.emoji);
  const [color,   setColor]   = useState(list.color);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || name.length > 100) { setError("Le nom doit contenir entre 1 et 100 caractères."); return; }
    setSaving(true); setError(null);
    try {
      await bcFetch(`/${bcId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), emoji, color }),
      });
      onRenamed({ name: name.trim(), emoji, color });
    } catch (e) { setError("Erreur lors de l'enregistrement."); }
    finally { setSaving(false); }
  };

  return (
    <SubPage visible>
      <SubPageHeader title="Renommer la liste" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Avatar */}
        <div style={{ background: "var(--theme-surface)", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px 20px" }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", background: color,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IcBroadcastLg />
            </div>
            <div style={{
              position: "absolute", bottom: 0, right: 0, width: 28, height: 28,
              borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid white", cursor: "pointer",
            }}>
              <IcCamera />
            </div>
          </div>
        </div>
        <div style={{ height: 8, background: "#F8FAFC" }}/>
        {/* Name input */}
        <div style={{ background: "var(--theme-surface)", padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>Nom de la liste</div>
          <input
            value={name} onChange={e => setName(e.target.value)} maxLength={100}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 12,
              border: "1.5px solid #E5E7EB", fontSize: 15, fontFamily: "Inter, sans-serif",
              outline: "none", color: "var(--theme-text)", boxSizing: "border-box", background: "var(--theme-surface)",
            }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--bp-primary)"}
            onBlur={e => e.currentTarget.style.borderColor = "#E5E7EB"}
          />
          {error && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 6, fontFamily: "Inter, sans-serif" }}>{error}</div>}
        </div>
        <div style={{ height: 8, background: "#F8FAFC" }}/>
        {/* Emoji picker */}
        <div style={{ background: "var(--theme-surface)", padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>Emoji</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {EMOJIS.map(em => (
              <button key={em} onClick={() => setEmoji(em)} style={{
                width: 44, height: 44, borderRadius: 12, border: `2px solid ${emoji === em ? "var(--bp-primary)" : "#E5E7EB"}`,
                background: emoji === em ? "#F0FDF4" : "white",
                fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{em}</button>
            ))}
          </div>
        </div>
        <div style={{ height: 8, background: "#F8FAFC" }}/>
        {/* Color picker */}
        <div style={{ background: "var(--theme-surface)", padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Inter, sans-serif" }}>Couleur</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 40, height: 40, borderRadius: "50%", background: c, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2,
              }}>
                {color === c && <IcCheck />}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 24 }}/>
      </div>
      <div style={{ padding: "0 20px 32px" }}>
        <button onClick={save} disabled={saving || !name.trim()} style={{
          width: "100%", background: "var(--bp-primary)", color: "white", border: "none", borderRadius: 14,
          padding: "15px 20px", fontSize: 15, fontWeight: 600, cursor: "pointer",
          fontFamily: "Inter, sans-serif", opacity: saving ? 0.7 : 1,
        }}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 11 : SONNERIE ──
═══════════════════════════════════════════════════════════════ */
function SonneriePage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState("brutepawanotif");
  const [volume, setVolume] = useState(70);
  const SONS = [
    { key: "brutepawanotif", label: "Son BrutePawa" },
    { key: "systeme",        label: "Son système" },
    { key: "perso",          label: "Son personnalisé" },
    { key: "aucun",          label: "Aucun son" },
  ];
  return (
    <SubPage visible>
      <SubPageHeader title="Sonnerie" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)" }}>
          {SONS.map((s, i) => (
            <div key={s.key} onClick={() => setSelected(s.key)} style={{
              display: "flex", alignItems: "center", padding: "15px 20px", gap: 14,
              borderTop: i > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${selected === s.key ? "var(--bp-primary)" : "#E5E7EB"}`,
                background: selected === s.key ? "var(--bp-primary)" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected === s.key && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--theme-surface)" }}/>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{s.label}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 12 }}/>
        {/* Waveform preview */}
        <div style={{ background: "var(--theme-surface)", padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginBottom: 12, fontFamily: "Inter, sans-serif" }}>Prévisualisation</div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, height: 40, marginBottom: 16 }}>
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, background: "var(--bp-primary)",
                height: `${20 + Math.sin(i * 0.7) * 16}px`,
                borderRadius: 2, opacity: 0.7,
              }}/>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9CA3AF", fontFamily: "Inter, sans-serif", marginBottom: 12 }}>
            <span>0:00</span><span>0:30</span>
          </div>
          {/* Volume */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
            <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(+e.target.value)}
              style={{ flex: 1, accentColor: "var(--bp-primary)" }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-primary)", fontFamily: "Inter, sans-serif", minWidth: 36 }}>{volume}%</span>
          </div>
        </div>
        <div style={{ height: 12 }}/>
        <div style={{ padding: "0 16px 24px" }}>
          <button style={{
            width: "100%", background: "var(--bp-primary)", color: "white", border: "none", borderRadius: 16,
            padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif",
          }}>Tester la sonnerie</button>
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 12 : VIBRATION ──
═══════════════════════════════════════════════════════════════ */
function VibrationPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState("normale");
  const VIBS = [
    { key: "desactivee",  label: "Désactivée" },
    { key: "courte",      label: "Courte" },
    { key: "normale",     label: "Normale" },
    { key: "longue",      label: "Longue" },
    { key: "perso",       label: "Personnalisée" },
  ];
  return (
    <SubPage visible>
      <SubPageHeader title="Vibration" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)" }}>
          {VIBS.map((v, i) => (
            <div key={v.key} onClick={() => setSelected(v.key)} style={{
              display: "flex", alignItems: "center", padding: "15px 20px", gap: 14,
              borderTop: i > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${selected === v.key ? "var(--bp-primary)" : "#E5E7EB"}`,
                background: selected === v.key ? "var(--bp-primary)" : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected === v.key && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--theme-surface)" }}/>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{v.label}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }}/>
        <div style={{ padding: "0 16px 24px" }}>
          <button style={{
            width: "100%", background: "var(--bp-primary)", color: "white", border: "none", borderRadius: 16,
            padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif",
          }}>Tester la vibration</button>
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 13 : PRIORITÉ ──
═══════════════════════════════════════════════════════════════ */
function PrioritePage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState("haute");
  const PRIOS = [
    { key: "faible",     label: "Faible",      desc: "Vous ne recevez pas de son.", color: "#9CA3AF" },
    { key: "normale",    label: "Normale",     desc: "Vous recevez les notifications standard.", color: "#0EA5E9" },
    { key: "haute",      label: "Haute",       desc: "Vous recevez toutes les notifications prioritaires.", color: "var(--bp-primary)" },
    { key: "urgente",    label: "Urgente",     desc: "Vous recevez toutes les notifications immédiatement.", color: "#F97316" },
    { key: "silencieuse",label: "Silencieuse", desc: "Aucune notification sonore.", color: "#8B5CF6" },
  ];
  return (
    <SubPage visible>
      <SubPageHeader title="Priorité" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)" }}>
          {PRIOS.map((p, i) => (
            <div key={p.key} onClick={() => setSelected(p.key)} style={{
              display: "flex", alignItems: "center", padding: "14px 20px", gap: 14,
              borderTop: i > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${selected === p.key ? p.color : "#E5E7EB"}`,
                background: selected === p.key ? p.color : "white",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected === p.key && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--theme-surface)" }}/>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{p.label}</div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 14 : APERÇU DES MESSAGES ──
═══════════════════════════════════════════════════════════════ */
function ApercuPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState("nom_apercu");
  const OPTS = [
    { key: "masque",         label: "Masqué",                    desc: "Aucun contenu visible" },
    { key: "nom_seul",       label: "Nom uniquement",            desc: "Affiche le nom de l'expéditeur" },
    { key: "nom_apercu",     label: "Nom + aperçu",              desc: "Nom et début du message" },
    { key: "complet",        label: "Message complet",           desc: "Message entier visible" },
    { key: "masque_verrou",  label: "Masqué sur écran verrouillé", desc: "Masqué quand l'écran est verrouillé" },
  ];
  return (
    <SubPage visible>
      <SubPageHeader title="Aperçu des messages" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)" }}>
          {OPTS.map((o, i) => (
            <div key={o.key} onClick={() => setSelected(o.key)} style={{
              display: "flex", alignItems: "center", padding: "14px 20px", gap: 14,
              borderTop: i > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{o.label}</div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{o.desc}</div>
              </div>
              {selected === o.key && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 6b : RECHERCHE PAR DATE ──
═══════════════════════════════════════════════════════════════ */
function RechercheParDatePage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const PERIODES = [
    { key: "today",   label: "Aujourd'hui" },
    { key: "hier",    label: "Hier" },
    { key: "week",    label: "Cette semaine" },
    { key: "7j",      label: "7 derniers jours" },
    { key: "30j",     label: "30 derniers jours" },
    { key: "mois",    label: "Ce mois-ci" },
    { key: "annee",   label: "Cette année" },
  ];
  return (
    <SubPage visible>
      <SubPageHeader title="Recherche par date" onBack={onBack} rightSlot={<span/>} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)" }}>
          {PERIODES.map((p, i) => (
            <div key={p.key} onClick={() => setSelected(p.key)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "15px 20px", borderTop: i > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{p.label}</span>
              {selected === p.key && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
          ))}
        </div>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)", padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bp-primary)", marginBottom: 14, fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: 0.8 }}>Période personnalisée</div>
          {[
            { label: "Date début", val: debut, set: setDebut },
            { label: "Date fin",   val: fin,   set: setFin   },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#64748B", marginBottom: 6, fontFamily: "Inter, sans-serif" }}>{f.label}</div>
              <input type="date" value={f.val} onChange={e => f.set(e.target.value)} style={{
                width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 12,
                padding: "10px 14px", fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none",
                accentColor: "var(--bp-primary)", boxSizing: "border-box",
              }}/>
            </div>
          ))}
          <button style={{
            width: "100%", background: "var(--bp-primary)", color: "white", border: "none", borderRadius: 14,
            padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif", marginTop: 8,
          }}>Appliquer le filtre</button>
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 9b : IMPORTER DEPUIS TÉLÉPHONE ──
═══════════════════════════════════════════════════════════════ */
function ImporterTelephonePage({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState("tous");
  const FILTRES = [
    { key: "tous",     label: "Tous les auteurs" },
    { key: "admin",    label: "Administrateurs" },
    { key: "modo",     label: "Modérateurs" },
    { key: "verifies", label: "Contacts vérifiés" },
    { key: "abonnes",  label: "Abonnés" },
    { key: "createurs",label: "Créateurs" },
    { key: "entreprises", label: "Entreprises" },
  ];
  return (
    <SubPage visible>
      <SubPageHeader title="Importer depuis téléphone" onBack={onBack} />
      <div style={{ background: "var(--theme-surface)", padding: "10px 16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#F1F5F9", borderRadius: 24, padding: "8px 14px", gap: 8 }}>
          <IcSearch />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un contact"
            style={{ flex: 1, border: "none", background: "none", fontSize: 14, outline: "none", fontFamily: "Inter, sans-serif", color: "var(--theme-text)" }}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)" }}>
          {FILTRES.map((f, i) => (
            <div key={f.key} onClick={() => setFiltre(f.key)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderTop: i > 0 ? "1px solid #F3F4F6" : "none", cursor: "pointer",
            }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{f.label}</span>
              {filtre === f.key && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
          ))}
        </div>
        <div style={{ height: 12 }}/>
        <div style={{ padding: "0 20px" }}>
          <button style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 500, color: "var(--bp-primary)", fontFamily: "Inter, sans-serif",
          }}>+ Rechercher un utilisateur</button>
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── SUB-PAGE 20 : PARAMÈTRES AVANCÉS ──
═══════════════════════════════════════════════════════════════ */
function ParamsAvancesPage({ onBack }: { onBack: () => void }) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    reponses: false, programmation: false, archivage: false,
    suppression: false, entreprise: false, createur: false,
  });
  const toggle = (k: string) => setToggles(p => ({ ...p, [k]: !p[k] }));
  const ITEMS = [
    { key: "reponses",     label: "Réponses automatiques",  desc: "Message auto-répond à vos contacts" },
    { key: "programmation",label: "Programmation messages", desc: "Envoyer plus tard" },
    { key: "archivage",    label: "Archivage automatique",  desc: "Archiver les anciennes discussions" },
    { key: "suppression",  label: "Suppression automatique",desc: "Supprimer les anciens messages" },
    { key: "entreprise",   label: "Mode entreprise",        desc: "Fonctionnalités avancées" },
    { key: "createur",     label: "Mode créateur",          desc: "Outils pour créateurs" },
  ];
  return (
    <SubPage visible>
      <SubPageHeader title="Paramètres avancés" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ height: 12 }}/>
        <div style={{ background: "var(--theme-surface)" }}>
          {ITEMS.map((item, i) => (
            <div key={item.key} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderTop: i > 0 ? "1px solid #F3F4F6" : "none",
            }}>
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "var(--theme-text)", fontFamily: "Inter, sans-serif" }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{item.desc}</div>
              </div>
              <Toggle checked={toggles[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      </div>
    </SubPage>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── DROPDOWN MENU (maquette 1) ──
═══════════════════════════════════════════════════════════════ */
type SubPageId = "infos" | "modifier" | "ajouter" | "medias" | "notifs" | "export" | "effacer" | "supprimer" | "recherche" | "renommer" | "sonnerie" | "vibration" | "priorite" | "apercu" | "rechdate" | "importtel" | "avance";

function DropdownMenu({ onSelect, onClose }: { onSelect: (id: SubPageId) => void; onClose: () => void }) {
  const items: { id: SubPageId; label: string; icon: React.ReactNode; danger?: boolean }[] = [
    { id: "infos",     label: "Infos de la liste",            icon: <IcInfo /> },
    { id: "modifier",  label: "Modifier les destinataires",   icon: <IcEditPeople /> },
    { id: "ajouter",   label: "Ajouter des destinataires",    icon: <IcAddPerson /> },
    { id: "renommer",  label: "Renommer la liste",            icon: <IcPencil /> },
    { id: "recherche", label: "Rechercher dans la conversation", icon: <IcSearch /> },
    { id: "medias",    label: "Médias partagés",              icon: <IcImage /> },
    { id: "notifs",    label: "Paramètres de notification",   icon: <IcBell /> },
    { id: "export",    label: "Exporter la diffusion",        icon: <IcExport /> },
    { id: "effacer",   label: "Effacer la conversation",      icon: <IcTrashRed />, danger: true },
    { id: "supprimer", label: "Supprimer la liste de diffusion", icon: <IcTrashRed />, danger: true },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="sc-fixed-escape" style={{ position: "fixed", inset: 0, zIndex: 40 }}/>
      {/* Menu card */}
      <div style={{
        position: "absolute", top: 56, right: 8, zIndex: 50,
        background: "var(--theme-surface)", borderRadius: 14,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        width: 280, overflow: "hidden",
        animation: "dropIn 0.18s ease-out",
      }}>
        {items.map((item, i) => (
          <div key={item.id}>
            {i > 0 && <div style={{ height: 1, background: "#F1F5F9", margin: "0 16px" }}/>}
            <div onClick={() => { onSelect(item.id); onClose(); }} style={{
              display: "flex", alignItems: "center", padding: "14px 16px", gap: 14, cursor: "pointer",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#F8FAFC"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "white"}
            >
              <div style={{ flexShrink: 0 }}>{item.icon}</div>
              <span style={{
                fontSize: 15, fontWeight: 500,
                color: item.danger ? "#EF4444" : "#111827",
                fontFamily: "Inter, sans-serif",
              }}>{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ── MAIN BROADCAST LIST PAGE ──
═══════════════════════════════════════════════════════════════ */
export default function BroadcastListPage({ broadcastId, recipientView }: { broadcastId: number; recipientView?: boolean }) {
  const navigate = useNavigate();
  const [list,     setList]     = useState<BroadcastList | null>(null);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const [subPage,  setSubPage]  = useState<SubPageId | null>(null);
  const messagesEndRef           = useRef<HTMLDivElement>(null);

  /* Load broadcast */
  useEffect(() => {
    if (recipientView) {
      // Recipient view: load from received-messages endpoint
      bcFetch(`/${broadcastId}/received-messages`)
        .then((data: { broadcast: BroadcastList & { ownerName: string }; messages: BroadcastMessage[] }) => {
          setList(data.broadcast);
          setMessages(data.messages);
        })
        .catch(() => navigate("/messages"))
        .finally(() => setLoading(false));
    } else {
      bcFetch(`/${broadcastId}`)
        .then((data: BroadcastList) => setList(data))
        .catch(() => navigate("/messages"))
        .finally(() => setLoading(false));
      bcFetch(`/${broadcastId}/messages`)
        .then(setMessages).catch(console.error);
    }
  }, [broadcastId, recipientView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const t = text; setText("");
    try {
      const msg: BroadcastMessage = await bcFetch(`/${broadcastId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: t }),
      });
      setMessages(prev => [...prev, msg]);
    } catch { setText(t); }
    finally { setSending(false); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#F8FAFC" }}>
      <div style={{ width: 40, height: 40, border: "4px solid var(--bp-primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
    </div>
  );

  if (!list) return null;

  return (
    <div style={{ position: "relative", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#DCFCE7", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dropIn { from { opacity:0; transform:scale(0.95) translateY(-8px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: "var(--bp-primary)", padding: "10px 8px 10px 4px",
        display: "flex", alignItems: "center", gap: 8, position: "relative", zIndex: 30, flexShrink: 0,
      }}>
        <button onClick={() => navigate("/messages")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", display: "flex" }}>
          <IcBack />
        </button>
        {/* Avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: "50%", background: list.color ?? "var(--bp-primary-dark)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          border: "2px solid rgba(255,255,255,0.3)",
        }}>
          <IcBroadcast />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1.2 }}>{list.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.2 }}>
            {list.recipientCount} destinataire{list.recipientCount !== 1 ? "s" : ""} · Liste de diffusion
          </div>
        </div>
        <button onClick={() => setDropdown(!dropdown)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", display: "flex", position: "relative" }}>
          <IcDots />
        </button>
        {dropdown && <DropdownMenu onSelect={p => setSubPage(p)} onClose={() => setDropdown(false)} />}
      </div>

      {/* ── BODY (wallpaper + messages) ── */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <WallpaperBg />

        {/* Messages scroll */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px", position: "relative", zIndex: 1 }}>
          {messages.length === 0 && (
            /* Info card — maquette 1 center card */
            <div style={{
              margin: "40px auto 0", maxWidth: 320,
              background: "rgba(134, 185, 130, 0.55)",
              borderRadius: 16, padding: "20px 18px",
              display: "flex", gap: 14, alignItems: "flex-start",
              backdropFilter: "blur(4px)",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <IcBroadcastLg />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: "white", lineHeight: "1.55", fontWeight: 500 }}>
                  Seuls les contacts que vous avez enregistrés dans leur carnet d'adresses recevront vos messages de diffusion.
                </p>
                <div style={{
                  marginTop: 12, display: "inline-block",
                  background: "rgba(255,255,255,0.3)", borderRadius: 20,
                  padding: "5px 14px", fontSize: 13, color: "white", fontWeight: 600,
                }}>{list.name}</div>
              </div>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <div style={{
                maxWidth: "75%", background: "var(--theme-surface)", borderRadius: "16px 4px 16px 16px",
                padding: "9px 13px", boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}>
                <div style={{ fontSize: 14, color: "var(--theme-text)", lineHeight: "1.45" }}>{m.content}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: 3 }}>
                  {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  <span style={{ marginLeft: 5 }}>✓✓</span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef}/>
        </div>

        {/* ── INPUT BAR (owner) / READ-ONLY NOTICE (recipient) ── */}
        {recipientView ? (
          <div style={{
            background: "#F1F5F9", padding: "12px 16px", flexShrink: 0,
            textAlign: "center", color: "#64748B", fontSize: 13, fontFamily: "Inter, sans-serif",
            borderTop: "1px solid #E5E7EB",
          }}>
            📢 Vous ne pouvez pas répondre à cette diffusion
          </div>
        ) : (
          <div style={{
            background: "#F1F5F9", padding: "8px 10px",
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
            position: "relative", zIndex: 1,
          }}>
            <div style={{
              flex: 1, background: "var(--theme-surface)", borderRadius: 26,
              display: "flex", alignItems: "center", padding: "6px 14px", gap: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}>
                <IcSmile />
              </button>
              <input
                value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Message"
                style={{
                  flex: 1, border: "none", background: "none", fontSize: 15,
                  outline: "none", color: "var(--theme-text)", fontFamily: "Inter, sans-serif",
                }}
              />
              <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", flexShrink: 0 }}>
                <IcPaperclip />
              </button>
            </div>
            <button onClick={sendMessage} disabled={sending} style={{
              width: 46, height: 46, borderRadius: "50%",
              background: "var(--bp-primary)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: "0 2px 8px rgba(34,197,94,0.4)",
            }}>
              {sending
                ? <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.5)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                : <IcMic />}
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SUB-PAGES (slide in over main screen)
      ═══════════════════════════════════════════════════════ */}
      {subPage === "infos" && (
        <InfosPage bcId={broadcastId} onBack={() => setSubPage(null)} onRename={() => setSubPage("renommer")} />
      )}
      {subPage === "modifier" && (
        <ModifierPage bcId={broadcastId} onBack={() => setSubPage(null)} />
      )}
      {subPage === "ajouter" && (
        <AjouterPage bcId={broadcastId} onBack={() => setSubPage(null)} />
      )}
      {subPage === "medias" && (
        <MediasPage bcId={broadcastId} onBack={() => setSubPage(null)} />
      )}
      {subPage === "notifs" && (
        <NotifPage bcId={broadcastId} onBack={() => setSubPage(null)} onSubPage={id => setSubPage(id as any)} />
      )}
      {subPage === "export" && (
        <ExportPage bcId={broadcastId} onBack={() => setSubPage(null)} />
      )}
      {subPage === "effacer" && (
        <EffacerPage bcId={broadcastId} onBack={() => setSubPage(null)} onCleared={() => { setMessages([]); setSubPage(null); }} />
      )}
      {subPage === "supprimer" && (
        <SupprimerPage
          bcId={broadcastId}
          memberCount={list?.recipientCount ?? 0}
          onBack={() => setSubPage(null)}
          onDeleted={() => navigate("/messages")}
        />
      )}
      {subPage === "recherche" && (
        <RecherchePage bcId={broadcastId} onBack={() => setSubPage(null)} />
      )}
      {subPage === "renommer" && list && (
        <RenommerPage
          bcId={broadcastId} list={list}
          onBack={() => setSubPage(null)}
          onRenamed={patch => { setList(prev => prev ? { ...prev, ...patch } : prev); setSubPage(null); }}
        />
      )}
      {subPage === "sonnerie" && (
        <SonneriePage onBack={() => setSubPage("notifs")} />
      )}
      {subPage === "vibration" && (
        <VibrationPage onBack={() => setSubPage("notifs")} />
      )}
      {subPage === "priorite" && (
        <PrioritePage onBack={() => setSubPage("notifs")} />
      )}
      {subPage === "apercu" && (
        <ApercuPage onBack={() => setSubPage("notifs")} />
      )}
      {subPage === "rechdate" && (
        <RechercheParDatePage onBack={() => setSubPage("recherche")} />
      )}
      {subPage === "importtel" && (
        <ImporterTelephonePage onBack={() => setSubPage("ajouter")} />
      )}
      {subPage === "avance" && (
        <ParamsAvancesPage onBack={() => setSubPage(null)} />
      )}
    </div>
  );
}
