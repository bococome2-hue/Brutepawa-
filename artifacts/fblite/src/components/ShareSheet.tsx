import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { apiGetFriends, apiSendMessage, type PublicUser } from "../lib/api";
import { trackEvent } from "../lib/analytics";

export interface SharePost {
  id: number;
  authorName: string;
  content?: string;
}

interface Props {
  open: boolean;
  post: SharePost | null;
  onClose: () => void;
}

function getDisplayUrl(postId: number) {
  return `https://brutepawa.com/post/${postId}`;
}
function getShareUrl(postId: number) {
  return `${window.location.origin}/post/${postId}`;
}

function AvatarCircle({ user }: { user: PublicUser }) {
  const initials = ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() || "?";
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={initials} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
      {initials}
    </div>
  );
}

/* ── App icons ─────────────────────────────────────────────── */
const APPS = [
  {
    id: "quickshare", label: "Quick Share",
    bg: "linear-gradient(135deg,#FF8C00 0%,#4285F4 100%)",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>,
  },
  {
    id: "telegram", label: "Telegram",
    bg: "#29A8E0",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M21.05 2.26L1.33 9.93c-1.3.52-1.29 1.24-.24 1.57l5.07 1.58 11.71-7.38c.55-.33 1.06-.15.64.21L8.7 15.23l-.33 5.34c.49 0 .7-.22.97-.48l2.33-2.27 4.86 3.59c.9.49 1.54.24 1.76-.83l3.19-15.1c.33-1.31-.5-1.9-1.43-1.42z" /></svg>,
  },
  {
    id: "whatsapp", label: "WhatsApp",
    bg: "#25D366",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>,
  },
  {
    id: "facebook", label: "Facebook",
    bg: "#1877F2",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
  },
  {
    id: "instagram", label: "Instagram",
    bg: "linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>,
  },
  {
    id: "bluetooth", label: "Bluetooth",
    bg: "#1D6EE8",
    icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5" /></svg>,
  },
];

export default function ShareSheet({ open, post, onClose }: Props) {
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [copied, setCopied] = useState(false);
  const [sentTo, setSentTo] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState<Set<number>>(new Set());
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Load friends when sheet opens */
  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setSentTo(new Set());
    setSending(new Set());
    setToast(null);
    setShowAllFriends(false);
    apiGetFriends().then(f => setFriends(f)).catch(() => setFriends([]));
  }, [open]);

  /* Cleanup toast timer on unmount */
  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  /* Lock body scroll while open */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!post || !open) return null;

  const shareUrl = getShareUrl(post.id);
  const displayUrl = getDisplayUrl(post.id);

  /* Copy link */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    trackEvent("post_shared", { method: "copy_link" });
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  /* Show a brief toast */
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  /* Send to friend — real DM with optimistic update */
  const handleSendToFriend = async (friend: PublicUser) => {
    const { id: friendId } = friend;
    if (sentTo.has(friendId) || sending.has(friendId) || !post) return;

    /* Optimistic update */
    setSentTo(prev => new Set([...prev, friendId]));
    setSending(prev => new Set([...prev, friendId]));

    const messageContent = `https://brutepawa.com/post/${post.id}`;
    const firstName = friend.firstName ?? "Ami";

    try {
      await apiSendMessage(friendId, messageContent);
      trackEvent("post_shared", { method: "direct_message" });
      const name = `${firstName} ${friend.lastName ?? ""}`.trim() || "Ami";
      showToast(`Envoyé à ${name}`);
    } catch {
      /* Revert on error */
      setSentTo(prev => { const s = new Set(prev); s.delete(friendId); return s; });
      showToast("Échec de l'envoi, réessayez.");
    } finally {
      setSending(prev => { const s = new Set(prev); s.delete(friendId); return s; });
    }
  };

  /* External platform share */
  const handleExternalShare = (id: string) => {
    const text = "Publication Brute Pawa";
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text);
    const map: Record<string, string> = {
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}%0A${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    };
    if (map[id]) {
      window.open(map[id], "_blank", "noopener");
      trackEvent("post_shared", { method: id });
    } else if (navigator.share) {
      navigator.share({ title: text, url: shareUrl })
        .then(() => trackEvent("post_shared", { method: "native_share" }))
        .catch(() => {});
    } else {
      handleCopy();
    }
  };

  const visibleFriends = showAllFriends ? friends : friends.slice(0, 4);
  const hasMoreFriends = !showAllFriends && friends.length > 4;

  return createPortal(
    <>
      {/* ── Backdrop ─────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.48)",
          animation: "ssBackdropIn 0.22s ease both",
        }}
      />

      {/* ── Sheet ────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
          maxWidth: 520, margin: "0 auto",
          background: "#fff",
          borderRadius: "26px 26px 0 0",
          animation: "ssSlideUp 0.28s cubic-bezier(0.32,0.72,0,1) both",
          maxHeight: "92dvh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Handle ─────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--bp-primary)", opacity: 0.65 }} />
        </div>

        {/* ── Header ─────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "6px 16px 6px" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>Partager</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Partager ce lien avec vos amis</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: "50%", background: "#F3F4F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 2, flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#6B7280" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* ── Link preview card ───────────────────────── */}
        <div style={{ margin: "10px 14px", border: "1px solid #E5E7EB", borderRadius: 18, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, background: "#FAFAFA" }}>
          {/* Chain icon */}
          <div style={{
            width: 50, height: 50, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, var(--bp-green-soft,#3DDC72) 0%, var(--bp-primary,#22C55E) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 }}>b</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Publication Brute Pawa</span>
            </div>
            <div style={{ fontSize: 12, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayUrl}</div>
          </div>
          {/* Copy icon */}
          <button onClick={handleCopy} style={{ background: "none", border: "none", padding: 4, cursor: "pointer", flexShrink: 0 }}>
            {copied
              ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            }
          </button>
        </div>

        {/* ── Quick actions ────────────────────────────── */}
        <div style={{ margin: "0 14px 4px", border: "1px solid #E5E7EB", borderRadius: 18, display: "flex", overflow: "hidden", background: "#fff" }}>
          {/* Envoyer sur des appareils */}
          <button
            onClick={() => handleExternalShare("quickshare")}
            style={{ flex: 1, background: "none", border: "none", padding: "14px 6px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg, var(--bp-green-soft,#3DDC72), var(--bp-primary,#22C55E))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="14" height="11" rx="2" />
                <path d="M10 3h12v9h-4" />
              </svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line" }}>{"Envoyer sur\ndes appareils"}</span>
          </button>

          <div style={{ width: 1, background: "#E5E7EB", alignSelf: "stretch", margin: "10px 0" }} />

          {/* QR code */}
          <button
            onClick={handleCopy}
            style={{ flex: 1, background: "none", border: "none", padding: "14px 6px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg, var(--bp-green-soft,#3DDC72), var(--bp-primary,#22C55E))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 21 21" width="22" height="22" fill="#fff">
                <rect x="1" y="1" width="7" height="7" rx="1" fill="none" stroke="#fff" strokeWidth="1.8" />
                <rect x="3" y="3" width="3" height="3" />
                <rect x="13" y="1" width="7" height="7" rx="1" fill="none" stroke="#fff" strokeWidth="1.8" />
                <rect x="15" y="3" width="3" height="3" />
                <rect x="1" y="13" width="7" height="7" rx="1" fill="none" stroke="#fff" strokeWidth="1.8" />
                <rect x="3" y="15" width="3" height="3" />
                <rect x="13" y="13" width="2" height="2" />
                <rect x="16" y="13" width="2" height="2" />
                <rect x="13" y="16" width="2" height="2" />
                <rect x="16" y="16" width="2" height="2" />
              </svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>QR code</span>
          </button>

          <div style={{ width: 1, background: "#E5E7EB", alignSelf: "stretch", margin: "10px 0" }} />

          {/* Copier le lien */}
          <button
            onClick={handleCopy}
            style={{ flex: 1, background: "none", border: "none", padding: "14px 6px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: "50%",
              background: copied ? "var(--bp-primary)" : "var(--bp-green-surface, #ECFDF5)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
            }}>
              {copied
                ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--bp-primary,#22C55E)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
              }
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: copied ? "var(--bp-primary)" : "#374151", transition: "color 0.2s" }}>
              {copied ? "Copié !" : "Copier le lien"}
            </span>
          </button>
        </div>

        {/* ── Transfert instantané card ────────────────── */}
        <div style={{ margin: "12px 14px", border: "1px solid #E5E7EB", borderRadius: 18, padding: "14px 14px", display: "flex", alignItems: "center", gap: 12, background: "#F9FFFE" }}>
          {/* Icon */}
          <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#0EA5E9,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3l4 4-4 4" /><path d="M20 7H4" />
              <path d="M8 21l-4-4 4-4" /><path d="M4 17h16" />
            </svg>
          </div>
          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14.5, fontWeight: 800, color: "#111827" }}>Transfert instantané</span>
              <span style={{ background: "var(--bp-primary)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20, lineHeight: 1.6 }}>NOUVEAU</span>
            </div>
            <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>Partagez sans consommation de données</div>
            <div style={{ fontSize: 11.5, color: "#9CA3AF", lineHeight: 1.4, marginTop: 2 }}>Transfert rapide et sécurisé entre appareils à proximité.</div>
          </div>
          {/* Activer */}
          <button
            style={{
              background: "linear-gradient(135deg, var(--bp-green-soft,#3DDC72), var(--bp-primary,#22C55E))",
              color: "#fff", border: "none", borderRadius: 22, padding: "9px 18px",
              fontSize: 13.5, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
              boxShadow: "0 1px 4px var(--bp-green-shadow, rgba(34,197,94,0.3))",
            }}
          >
            Activer
          </button>
        </div>

        {/* ── Friends row ──────────────────────────────── */}
        {friends.length > 0 && (
          <div style={{ padding: "2px 0 6px" }}>
            <div
              style={{
                display: "flex", overflowX: "auto", padding: "6px 14px 4px", gap: 14,
                scrollbarWidth: "none",
              }}
            >
              {visibleFriends.map(friend => {
                const sent = sentTo.has(friend.id);
                const name = `${friend.firstName ?? ""} ${friend.lastName ?? ""}`.trim() || "Ami";
                return (
                  <button
                    key={friend.id}
                    onClick={() => handleSendToFriend(friend)}
                    disabled={sending.has(friend.id)}
                    style={{ background: "none", border: "none", cursor: sending.has(friend.id) ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, width: 62, opacity: sending.has(friend.id) ? 0.7 : 1, transition: "opacity 0.18s" }}
                  >
                    <div style={{ position: "relative" }}>
                      <AvatarCircle user={friend} />
                      {/* Send badge */}
                      <div style={{
                        position: "absolute", bottom: 0, right: 0,
                        width: 20, height: 20, borderRadius: "50%",
                        background: sent ? "var(--bp-primary)" : "var(--bp-primary)",
                        border: "2px solid #fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.18s",
                      }}>
                        {sent
                          ? <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          : <svg viewBox="0 0 24 24" width="11" height="11" fill="#fff"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
                        }
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#374151", fontWeight: 600, textAlign: "center", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                      {name}
                    </span>
                  </button>
                );
              })}
              {/* Plus button */}
              {hasMoreFriends && (
                <button
                  onClick={() => setShowAllFriends(true)}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, width: 62 }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#F3F4F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Plus</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#6B7280"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                  <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>Plus</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Divider ──────────────────────────────────── */}
        <div style={{ height: 1, background: "#F3F4F6", margin: "4px 14px 0" }} />

        {/* ── External apps ────────────────────────────── */}
        <div style={{ display: "flex", overflowX: "auto", padding: "14px 14px 22px", gap: 18, scrollbarWidth: "none" }}>
          {APPS.map(app => (
            <button
              key={app.id}
              onClick={() => handleExternalShare(app.id)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0, width: 60 }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: app.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
              }}>
                {app.icon}
              </div>
              <span style={{ fontSize: 11.5, color: "#374151", fontWeight: 600 }}>{app.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ssSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes ssBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ssToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        /* Hide scrollbar inside share sheet */
        [data-share-scroll]::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            background: "rgba(17,24,39,0.92)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 600,
            padding: "10px 20px",
            borderRadius: 24,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
            animation: "ssToastIn 0.22s ease both",
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>
      )}
    </>,
    document.body
  );
}
