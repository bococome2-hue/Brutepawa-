import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiFetch } from "../lib/api";

interface SavedPost {
  id: number;
  postId: number;
  savedAt: string;
  content: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  authorCountry: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "À l'instant";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

const FLAGS: Record<string, string> = { CI: "🇨🇮", SN: "🇸🇳", BJ: "🇧🇯", TG: "🇹🇬", BF: "🇧🇫", GH: "🇬🇭", ML: "🇲🇱", CM: "🇨🇲" };

export default function SavedPage() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    apiFetch("/saved")
      .then(r => r.ok ? r.json() : [])
      .then(setSaved)
      .catch(() => setSaved([]))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (postId: number) => {
    setRemoving(postId);
    try {
      await apiFetch(`/saved/${postId}`, { method: "DELETE" });
      setSaved(prev => prev.filter(s => s.postId !== postId));
      showToast("Retiré des enregistrements");
    } catch { /* ignore */ }
    finally { setRemoving(null); }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ background: "var(--theme-surface)", padding: "14px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>🔖 Enregistrements</div>
        <div style={{ fontSize: 13, color: "#64748B" }}>{saved.length} élément{saved.length !== 1 ? "s" : ""}</div>
      </div>

      <div style={{ padding: 16 }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>Chargement…
          </div>
        )}

        {!loading && saved.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#64748B" }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>🔖</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Aucun enregistrement</div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>
              Enregistrez des publications pour les retrouver facilement.<br />
              Appuyez sur <strong>⋯</strong> d'une publication, puis <strong>Enregistrer</strong>.
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {saved.map(item => {
            const inits = item.authorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            const flag = item.authorCountry ? (FLAGS[item.authorCountry] ?? "🌍") : "🌍";
            const isVid = item.imageUrl && /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(item.imageUrl);
            return (
              <div key={item.id} style={{ background: "var(--theme-surface)", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {item.authorAvatarUrl
                      ? <img src={item.authorAvatarUrl} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>{inits}</div>
                    }
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.authorName} {flag}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{timeAgo(item.createdAt)}</div>
                    </div>
                    <button
                      onClick={() => remove(item.postId)}
                      disabled={removing === item.postId}
                      title="Retirer des enregistrements"
                      style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 13, color: "#64748B", fontWeight: 600 }}>
                      {removing === item.postId ? "…" : "🔖✕"}
                    </button>
                  </div>
                  {item.content && (
                    <div style={{ fontSize: 14, color: "var(--theme-text)", marginBottom: item.imageUrl ? 10 : 0, lineHeight: 1.5 }}>
                      {item.content.slice(0, 200)}{item.content.length > 200 ? "…" : ""}
                    </div>
                  )}
                </div>
                {item.imageUrl && (
                  isVid
                    ? <video src={item.imageUrl} poster={item.thumbnailUrl ?? undefined} controls playsInline style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block", background: "#000" }} />
                    : <img src={item.imageUrl} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }} />
                )}
                <div style={{ padding: "8px 12px", display: "flex", gap: 12, fontSize: 13, color: "#64748B", borderTop: "1px solid #E5E7EB" }}>
                  <span>👍 {item.likesCount}</span>
                  <span>💬 {item.commentsCount}</span>
                  <button onClick={() => navigate(`/post/${item.postId}`)}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--bp-primary)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                    Voir la publication →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", background: "#333", color: "#fff", borderRadius: 22, padding: "10px 18px", fontSize: 13, fontWeight: 600, zIndex: 200, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
