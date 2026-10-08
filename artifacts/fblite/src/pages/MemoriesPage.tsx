import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiFetch } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface MemoryPost {
  id: number;
  content: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  yearsAgo: number;
}

export default function MemoriesPage() {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<MemoryPost[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = useCurrentUser();
  const userName: string = currentUser.name ?? "Utilisateur";
  const avatarUrl: string | null = currentUser.avatarUrl ?? null;
  const userInitials = userName.slice(0, 2).toUpperCase();

  useEffect(() => {
    apiFetch("/memories")
      .then(r => r.ok ? r.json() : [])
      .then(setMemories)
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const todayStr = today.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  const grouped = memories.reduce<Record<number, MemoryPost[]>>((acc, m) => {
    if (!acc[m.yearsAgo]) acc[m.yearsAgo] = [];
    acc[m.yearsAgo].push(m);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ background: "var(--theme-surface)", padding: "14px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>✨ Souvenirs</div>
      </div>

      {/* Date banner */}
      <div style={{ background: "linear-gradient(135deg, var(--bp-primary), #9C27B0)", padding: "20px 16px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 4 }}>Aujourd'hui, c'est le</div>
        <div style={{ fontWeight: 900, fontSize: 24, textTransform: "capitalize" }}>{todayStr}</div>
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>Voici ce que vous aviez publié par le passé</div>
      </div>

      <div style={{ padding: 16 }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>Chargement des souvenirs…
          </div>
        )}

        {!loading && memories.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>✨</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Aucun souvenir pour aujourd'hui</div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              Revenez chaque jour pour voir vos publications d'il y a 1 an, 2 ans, etc.
            </div>
          </div>
        )}

        {Object.entries(grouped)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([yearsAgoStr, posts]) => {
            const years = Number(yearsAgoStr);
            return (
              <div key={years} style={{ marginBottom: 28 }}>
                {/* Year header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                  <div style={{ background: "var(--theme-surface)", border: "2px solid var(--bp-primary)", color: "var(--bp-primary)", borderRadius: 20, padding: "4px 14px", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>
                    🕰 Il y a {years} an{years > 1 ? "s" : ""}
                  </div>
                  <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                </div>

                {posts.map(post => {
                  const date = new Date(post.createdAt);
                  const dateStr = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
                  const isVid = post.imageUrl && /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(post.imageUrl);
                  return (
                    <div key={post.id} style={{ background: "var(--theme-surface)", borderRadius: 12, border: "1px solid #E5E7EB", marginBottom: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      {/* Share memory banner */}
                      <div style={{ background: "#DCFCE7", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13, color: "var(--bp-primary)", fontWeight: 600 }}>
                          📅 {dateStr}
                        </div>
                        <button
                          onClick={() => navigate(`/post/${post.id}`)}
                          style={{ background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Voir
                        </button>
                      </div>

                      <div style={{ padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          {avatarUrl
                            ? <img src={avatarUrl} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
                            : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{userInitials}</div>
                          }
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{userName}</div>
                            <div style={{ fontSize: 12, color: "#64748B" }}>{dateStr}</div>
                          </div>
                        </div>
                        {post.content && <div style={{ fontSize: 14, lineHeight: 1.5, marginBottom: post.imageUrl ? 10 : 0 }}>{post.content}</div>}
                      </div>
                      {post.imageUrl && (
                        isVid
                          ? <video src={post.imageUrl} poster={post.thumbnailUrl ?? undefined} controls playsInline style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block", background: "#000" }} />
                          : <img src={post.imageUrl} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }} />
                      )}
                      <div style={{ padding: "10px 14px", borderTop: "1px solid #E5E7EB", display: "flex", gap: 12, fontSize: 13, color: "#64748B" }}>
                        <span>👍 {post.likesCount}</span>
                        <span>💬 {post.commentsCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
}
