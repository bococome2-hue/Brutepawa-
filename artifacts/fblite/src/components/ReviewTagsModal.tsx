import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/api";

interface TaggedPost {
  id: number;
  content: string;
  imageUrl: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
}

interface Props {
  onClose: () => void;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

const AVATAR_COLORS = [
  "var(--bp-primary)","#EC4899","#8B5CF6","#D97706","#388E3C","#00838F","#EF4444",
];

export default function ReviewTagsModal({ onClose }: Props) {
  const [posts, setPosts] = useState<TaggedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "reviewed">("pending");
  const [actions, setActions] = useState<Record<number, "approved" | "rejected">>({});

  useEffect(() => {
    apiFetch("/posts?authorId=tagged").catch(() => {});
    const DEMO: TaggedPost[] = [
      {
        id: 1001,
        content: "Super soirée hier soir avec toute la team 🎉",
        imageUrl: null,
        authorName: "Kouadio Serge",
        authorAvatarUrl: null,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
      {
        id: 1002,
        content: "Félicitations pour ton projet ! 🚀",
        imageUrl: null,
        authorName: "Aminata Diallo",
        authorAvatarUrl: null,
        createdAt: new Date(Date.now() - 86400 * 1000).toISOString(),
      },
    ];
    const t = setTimeout(() => { setPosts(DEMO); setLoading(false); }, 500);
    return () => clearTimeout(t);
  }, []);

  const handleAction = (postId: number, action: "approved" | "rejected") => {
    setActions(prev => ({ ...prev, [postId]: action }));
  };

  const pending  = posts.filter(p => !actions[p.id]);
  const reviewed = posts.filter(p => !!actions[p.id]);
  const displayed = tab === "pending" ? pending : reviewed;

  return createPortal(
    /* ── overlay ── */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 200,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      {/* ── bottom sheet ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--theme-surface)",
          borderRadius: "20px 20px 0 0",
          width: "100%",
          maxWidth: 600,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflowY: "hidden",
        }}
      >
        {/* drag handle */}
        <div style={{ paddingTop: 10, paddingBottom: 4, display: "flex", justifyContent: "center" }}>
          <div style={{
            width: 40, height: 4, borderRadius: 4,
            background: "#E5E7EB",
          }} />
        </div>

        {/* header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 16px 10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>👁️</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text)" }}>
              Examiner les identifications
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#F1F5F9", border: "none", borderRadius: "50%",
              width: 32, height: 32, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, color: "var(--theme-text)", fontWeight: 700, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* description */}
        <p style={{
          margin: 0, padding: "0 16px 14px",
          fontSize: 13, color: "#64748B", lineHeight: 1.45,
        }}>
          Gérez les publications dans lesquelles vous avez été identifié(e) avant
          qu'elles apparaissent sur votre profil.
        </p>

        {/* tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #E5E7EB",
          padding: "0 4px",
        }}>
          {([
            ["pending",  `En attente (${pending.length})`],
            ["reviewed", `Examinées (${reviewed.length})`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1,
                background: "none", border: "none",
                padding: "12px 8px",
                fontWeight: tab === id ? 700 : 500,
                fontSize: 14,
                color: tab === id ? "var(--bp-primary)" : "#64748B",
                borderBottom: tab === id ? "3px solid var(--bp-primary)" : "3px solid transparent",
                cursor: "pointer",
                transition: "color .15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 24px" }}>
          {/* loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
              <div style={{
                width: 28, height: 28, border: "3px solid #E5E7EB",
                borderTopColor: "var(--bp-primary)", borderRadius: "50%",
                animation: "rt-spin .7s linear infinite",
                margin: "0 auto 10px",
              }} />
              Chargement…
            </div>
          )}

          {/* empty state */}
          {!loading && displayed.length === 0 && (
            <div style={{
              textAlign: "center", padding: "36px 16px",
              color: "#64748B",
            }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none"
                style={{ display: "block", margin: "0 auto 12px" }}>
                {tab === "pending" ? (
                  <path
                    d="M42 10H22a5 5 0 0 0-5 5v22a5 5 0 0 0 1.5 3.5l18 18a5 5 0 0 0 7 0l16-16a5 5 0 0 0 0-7L41.5 11.5A5 5 0 0 0 42 10z"
                    stroke="#CBD5E1" strokeWidth="3" fill="none"
                  />
                ) : (
                  <path d="M20 32l10 10 14-20" stroke="#CBD5E1"
                    strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "var(--theme-text)" }}>
                {tab === "pending"
                  ? "Aucune identification en attente"
                  : "Aucune identification examinée"}
              </div>
              <div style={{ fontSize: 13 }}>
                {tab === "pending"
                  ? "Vous êtes à jour !"
                  : "Les éléments approuvés ou refusés s'afficheront ici."}
              </div>
            </div>
          )}

          {/* cards */}
          {displayed.map((post, i) => {
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const inits = post.authorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            const status = actions[post.id];
            return (
              <div
                key={post.id}
                style={{
                  background: "var(--theme-surface)",
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  padding: "14px 14px 12px",
                  marginBottom: 10,
                }}
              >
                {/* author row */}
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  {post.authorAvatarUrl ? (
                    <img
                      src={post.authorAvatarUrl} alt=""
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontWeight: 800, fontSize: 15, flexShrink: 0,
                    }}>
                      {inits}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text)" }}>
                      {post.authorName}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 1 }}>
                      vous a identifié(e) · {timeAgo(post.createdAt)}
                    </div>
                  </div>
                  {status && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 9px",
                      borderRadius: 20, flexShrink: 0,
                      background: status === "approved" ? "#F0FDF4" : "#FEE2E2",
                      color: status === "approved" ? "#1e7e34" : "#EF4444",
                    }}>
                      {status === "approved" ? "✅ Approuvé" : "❌ Refusé"}
                    </span>
                  )}
                </div>

                {/* post content */}
                <div style={{
                  fontSize: 14, color: "var(--theme-text)", marginBottom: 12,
                  lineHeight: 1.45,
                }}>
                  {post.content}
                </div>

                {/* post image */}
                {post.imageUrl && (
                  <img
                    src={post.imageUrl} alt=""
                    style={{
                      width: "100%", borderRadius: 8,
                      objectFit: "cover", maxHeight: 200, display: "block",
                      marginBottom: 12,
                    }}
                  />
                )}

                {/* action buttons — only for pending */}
                {tab === "pending" && !status && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleAction(post.id, "approved")}
                      style={{
                        flex: 1, background: "#DCFCE7",
                        color: "var(--bp-primary)", border: "1px solid #DCFCE7",
                        borderRadius: 8, padding: "9px 0",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      ✅ Approuver
                    </button>
                    <button
                      onClick={() => handleAction(post.id, "rejected")}
                      style={{
                        flex: 1, background: "#FEE2E2",
                        color: "#EF4444", border: "1px solid #fdd",
                        borderRadius: 8, padding: "9px 0",
                        fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      ❌ Refuser
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes rt-spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
