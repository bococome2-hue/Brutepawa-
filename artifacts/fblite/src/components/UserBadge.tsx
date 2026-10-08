import type { ReactNode } from "react";

export const BADGE_CONFIG: Record<string, { icon: ReactNode; color: string; label: string; bg: string }> = {
  verified:  { icon: <svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 6l2.5 2.5L10 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, color:"var(--bp-primary)", bg:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", label:"Vérifié" },
  creator:   { icon: <span style={{ fontSize:9, lineHeight:1 }}>👑</span>, color:"#F59E0B", bg:"linear-gradient(135deg,#F59E0B,#D97706)", label:"Créateur" },
  vip:       { icon: <span style={{ fontSize:9, lineHeight:1 }}>💎</span>, color:"#8B5CF6", bg:"linear-gradient(135deg,#8B5CF6,#7C3AED)", label:"VIP" },
  premium:   { icon: <span style={{ fontSize:9, lineHeight:1 }}>⭐</span>, color:"#F59E0B", bg:"linear-gradient(135deg,#F59E0B,#EAB308)", label:"Premium" },
  business:  { icon: <span style={{ fontSize:9, lineHeight:1 }}>🏢</span>, color:"#3B82F6", bg:"linear-gradient(135deg,#3B82F6,#2563EB)", label:"Entreprise" },
  moderator: { icon: <svg viewBox="0 0 12 12" width="10" height="10" fill="#fff"><path d="M6 1L2 3v3c0 2.5 1.7 4.8 4 5.4 2.3-.6 4-2.9 4-5.4V3L6 1z"/></svg>, color:"#10B981", bg:"linear-gradient(135deg,#10B981,#059669)", label:"Modérateur" },
  admin:     { icon: <svg viewBox="0 0 12 12" width="10" height="10" fill="#fff"><polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9.2,11 6,9.3 2.8,11 3.5,7.5 1,5 4.5,4.5"/></svg>, color:"#EF4444", bg:"linear-gradient(135deg,#EF4444,#DC2626)", label:"Admin" },
  partner:   { icon: <span style={{ fontSize:9, lineHeight:1 }}>🤝</span>, color:"#06B6D4", bg:"linear-gradient(135deg,#06B6D4,#0891B2)", label:"Partenaire" },
};

export function UserBadge({ type, showLabel = false, size = 18 }: { type?: string | null; showLabel?: boolean; size?: number }) {
  const cfg = type ? (BADGE_CONFIG[type] ?? BADGE_CONFIG.verified) : BADGE_CONFIG.verified;
  if (type === "premium") {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        <img
          src="/badge-verified.jpg"
          alt="Premium"
          style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}
        />
        {showLabel && <span style={{ fontSize:size * 0.61, fontWeight:700, color:"var(--bp-primary)" }}>Premium</span>}
      </div>
    );
  }
  const iconSize = Math.round(size * 0.55);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <div style={{ width:iconSize, height:iconSize, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {cfg.icon}
        </div>
      </div>
      {showLabel && <span style={{ fontSize:size * 0.61, fontWeight:700, color:cfg.color }}>{cfg.label}</span>}
    </div>
  );
}
