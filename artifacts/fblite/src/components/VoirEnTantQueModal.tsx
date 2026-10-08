import { createPortal } from "react-dom";

interface Props {
  onClose: () => void;
  userName: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  flag?: string;
  friendsCount: number;
  postsCount: number;
  followersCount?: number;
  likesCount?: number;
}

const AVATAR_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#FF9800","var(--bp-primary)","#0EA5E9","#EF4444","#6366F1"];

export default function VoirEnTantQueModal({
  onClose, userName, avatarUrl, bio, country, flag,
  friendsCount, postsCount, followersCount = 0, likesCount = 0
}: Props) {
  const initials = (userName ?? "??").slice(0, 2).toUpperCase();
  const colorIdx = (userName?.charCodeAt(0) ?? 0) + (userName?.charCodeAt(1) ?? 0);
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];

  const stats = [
    { icon: "👥", value: friendsCount, label: "Amis" },
    { icon: "👤", value: followersCount, label: "Abonnés" },
    { icon: "📋", value: postsCount, label: "Publications" },
    { icon: "❤️", value: likesCount, label: "Likes" },
  ];

  const badges: { icon: string; label: string }[] = [];
  if (country) badges.push({ icon: "📍", label: country + (flag ? ` ${flag}` : "") });
  if (bio) badges.push({ icon: "💼", label: bio.split(" ").slice(0, 3).join(" ") });
  badges.push({ icon: "🟢", label: "BrutePawa Creator" });

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, overflowY: "auto" }}>
      <style>{`
        @keyframes vtqSlideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .vtq-tabs::-webkit-scrollbar { display: none; }
      `}</style>
      <div style={{ maxWidth: 600, margin: "0 auto", minHeight: "100vh", background: "#F8FAFC", position: "relative", animation: "vtqSlideUp 0.22s ease-out", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

        {/* ── TOP BAR ── */}
        <div style={{ background: "var(--theme-surface)", boxShadow: "0 1px 0 #E5E7EB", padding: "0 14px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onPointerDown={e => (e.currentTarget.style.background = "#F1F5F9")}
            onPointerUp={e => (e.currentTarget.style.background = "none")}
            onPointerLeave={e => (e.currentTarget.style.background = "none")}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(34,197,94,0.35)" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 17, lineHeight: 1, fontFamily: "Arial Black,Arial,sans-serif" }}>b</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text)", letterSpacing: -0.3 }}>BrutePawa</span>
          </div>
          <div style={{ width: 40 }} />
        </div>

        {/* ── INFO BANNER ── */}
        <div style={{ background: "#F0FDF4", borderLeft: "4px solid var(--bp-primary)", padding: "10px 16px", fontSize: 13, color: "var(--bp-primary-dark)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>👁️</span>
          <span>Aperçu visiteur — seules vos informations publiques sont visibles.</span>
        </div>

        {/* ── COVER + AVATAR ── */}
        <div style={{ position: "relative" }}>
          <div style={{ height: 195, position: "relative", overflow: "hidden" }}>
            <svg viewBox="0 0 480 195" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <defs>
                <radialGradient id="vtqGlow1" cx="55%" cy="40%" r="65%">
                  <stop offset="0%" stopColor="var(--bp-primary)" stopOpacity="0.36"/>
                  <stop offset="100%" stopColor="var(--bp-primary)" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="vtqGlow2" cx="18%" cy="72%" r="38%">
                  <stop offset="0%" stopColor="var(--bp-primary)" stopOpacity="0.18"/>
                  <stop offset="100%" stopColor="var(--bp-primary)" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <rect width="480" height="195" fill="#052e16"/>
              <rect width="480" height="195" fill="url(#vtqGlow1)"/>
              <rect width="480" height="195" fill="url(#vtqGlow2)"/>
              <path d="M-10 108 C 70 52, 150 148, 250 96 S 390 44, 500 82" stroke="var(--bp-primary)" strokeOpacity="0.26" strokeWidth="2.5" fill="none"/>
              <path d="M-10 138 C 80 78, 165 162, 265 112 S 400 62, 510 108" stroke="var(--bp-primary)" strokeOpacity="0.18" strokeWidth="1.8" fill="none"/>
              <path d="M-10 78 C 100 28, 185 118, 285 68 S 415 18, 510 52" stroke="var(--bp-primary)" strokeOpacity="0.14" strokeWidth="1.2" fill="none"/>
              <path d="M-10 162 C 60 108, 155 178, 255 138 S 392 92, 510 132" stroke="var(--bp-primary)" strokeOpacity="0.09" strokeWidth="1" fill="none"/>
            </svg>
            <div style={{ position: "absolute", right: -8, top: -18, fontSize: 158, fontWeight: 900, color: "var(--bp-primary)", opacity: 0.1, lineHeight: 1, fontFamily: "Arial Black,Arial,sans-serif", userSelect: "none", pointerEvents: "none" }}>b</div>
          </div>

          <div style={{ position: "absolute", bottom: -46, left: 16, zIndex: 5 }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              {avatarUrl
                ? <img src={avatarUrl} alt={userName} style={{ width: 94, height: 94, borderRadius: "50%", border: "4px solid #fff", objectFit: "cover", boxShadow: "0 4px 20px rgba(0,0,0,0.22)", display: "block" }} />
                : <div style={{ width: 94, height: 94, borderRadius: "50%", background: color, border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 30, boxShadow: "0 4px 20px rgba(0,0,0,0.22)" }}>{initials}</div>
              }
              <div style={{ position: "absolute", bottom: 4, right: 3, width: 18, height: 18, borderRadius: "50%", background: "var(--bp-primary)", border: "2.5px solid #fff", boxShadow: "0 1px 4px rgba(34,197,94,0.5)" }} />
            </div>
          </div>
        </div>

        {/* ── PROFILE CARD ── */}
        <div style={{ background: "var(--theme-surface)", paddingTop: 62, borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ padding: "0 16px 18px" }}>

            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontWeight: 900, fontSize: 22, color: "var(--theme-text)", letterSpacing: -0.3 }}>{userName}</span>
              {flag && <span style={{ fontSize: 17 }}>{flag}</span>}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill="#0EA5E9"/>
                <polyline points="7,12 10,15 17,9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>

            {bio && <div style={{ fontSize: 13.5, color: "#64748B", marginBottom: 10, lineHeight: 1.5 }}>{bio}</div>}

            {badges.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {badges.map((badge, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: 20, padding: "4px 10px" }}>
                    <span style={{ fontSize: 12 }}>{badge.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--bp-primary-dark)" }}>{badge.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", paddingTop: 14, borderTop: "1px solid #F1F5F9", marginTop: 4 }}>
              {stats.map((stat, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", borderRight: i < 3 ? "1px solid #F1F5F9" : "none", padding: "2px 4px" }}>
                  <div style={{ fontSize: 14, marginBottom: 2 }}>{stat.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: 17, color: "var(--theme-text)", lineHeight: 1.15 }}>{stat.value}</div>
                  <div style={{ fontSize: 10.5, color: "#94A3B8", marginTop: 2, fontWeight: 500 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <div style={{ flex: 2, padding: "12px 8px", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", color: "#fff", borderRadius: 14, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 14px rgba(34,197,94,0.35)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                Ajouter comme ami
              </div>
              <div style={{ flex: 1, padding: "12px 6px", background: "var(--theme-surface)", color: "#64748B", border: "1.5px solid #E5E7EB", borderRadius: 14, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Message
              </div>
              <div style={{ flex: 1, padding: "12px 6px", background: "var(--theme-surface)", color: "#64748B", border: "1.5px solid #E5E7EB", borderRadius: 14, fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Suivre
              </div>
            </div>
          </div>

          <div className="vtq-tabs" style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", borderTop: "1px solid #F1F5F9" }}>
            {["Publications", "Photos", "Vidéos", "Amis", "À propos"].map((t, i) => (
              <button key={t} style={{ flex: "0 0 auto", padding: "13px 16px", background: "none", border: "none", cursor: "default", fontSize: 13, fontWeight: i === 0 ? 800 : 500, color: i === 0 ? "var(--bp-primary)" : "#94A3B8", borderBottom: i === 0 ? "2.5px solid var(--bp-primary)" : "2.5px solid transparent", whiteSpace: "nowrap" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── LOCKED CONTENT ── */}
        <div style={{ padding: "20px 14px 24px" }}>
          <div style={{ background: "var(--theme-surface)", borderRadius: 22, padding: "32px 20px 28px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid rgba(34,197,94,0.07)" }}>
            <div style={{ marginBottom: 18, display: "flex", justifyContent: "center" }}>
              <svg width="100" height="110" viewBox="0 0 100 110" fill="none">
                <ellipse cx="50" cy="102" rx="40" ry="5.5" fill="#F0FDF4" opacity="0.9"/>
                <path d="M20 97 Q 8 72 28 62 Q 22 82 38 93Z" fill="#BBF7D0" opacity="0.7"/>
                <path d="M80 97 Q 92 72 72 62 Q 78 82 62 93Z" fill="#BBF7D0" opacity="0.7"/>
                <path d="M12 90 Q 2 68 20 58 Q 16 78 30 88Z" fill="#DCFCE7" opacity="0.8"/>
                <path d="M88 90 Q 98 68 80 58 Q 84 78 70 88Z" fill="#DCFCE7" opacity="0.8"/>
                <path d="M27 98 Q 14 76 32 65 Q 28 84 44 95Z" fill="var(--bp-primary)" opacity="0.45"/>
                <path d="M73 98 Q 86 76 68 65 Q 72 84 56 95Z" fill="var(--bp-primary)" opacity="0.45"/>
                <rect x="28" y="84" width="44" height="16" rx="8" fill="#fff" stroke="#E5E7EB" strokeWidth="1.5"/>
                <rect x="33" y="55" width="34" height="31" rx="7" fill="#fff" stroke="#E5E7EB" strokeWidth="1.5"/>
                <rect x="37" y="59" width="26" height="23" rx="5" fill="#F0FDF4"/>
                <path d="M40 55V45a10 10 0 0120 0v10" stroke="var(--bp-primary)" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <circle cx="50" cy="69" r="5" fill="var(--bp-primary)"/>
                <rect x="48" y="69" width="4" height="7" rx="2" fill="var(--bp-primary)"/>
              </svg>
            </div>
            <div style={{ fontWeight: 900, fontSize: 17, color: "var(--theme-text)", marginBottom: 8 }}>Publications visibles par vos amis uniquement</div>
            <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.65, marginBottom: 22 }}>Les visiteurs qui ne sont pas vos amis voient cette vue.</div>
            <button style={{ padding: "12px 28px", background: "var(--theme-surface)", color: "var(--bp-primary)", border: "2px solid var(--bp-primary)", borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: "default", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Ajouter des amis
            </button>
          </div>
        </div>

        {/* ── QUIT BUTTON ── */}
        <div style={{ padding: "0 14px 52px" }}>
          <button onClick={onClose} style={{ width: "100%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", color: "#fff", border: "none", borderRadius: 16, padding: 15, fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 16px rgba(34,197,94,0.35)" }}>
            Quitter l'aperçu
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
