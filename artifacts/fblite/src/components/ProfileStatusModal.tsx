import { useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  userName: string;
  avatarUrl?: string;
  onClose: () => void;
}

type Survey = "none" | "rating" | "text" | "done";

const AVATAR_COLORS = ["var(--bp-primary)","#E91E63","#9C27B0","#D97706","#388E3C","#00838F"];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const RATINGS = ["Très satisfait", "Légèrement satisfait", "Neutre", "Légèrement insatisfait", "Très insatisfait"];

export default function ProfileStatusModal({ userName, avatarUrl, onClose }: Props) {
  const [survey, setSurvey] = useState<Survey>("none");
  const [rating, setRating] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);
  const firstName = userName.split(" ")[0] ?? userName;
  const color = avatarColor(userName);

  const content = (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#F1F5F9", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Mode bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 8px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text)", display: "flex", alignItems: "center", gap: 4 }}>
          Mode payant
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: "#64748B", color: "#fff", fontSize: 10, fontWeight: 700 }}>?</span>
        </span>
        <button style={{ background: "#E5E7EB", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Changer de mode</button>
      </div>
      {/* Title bar */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--theme-text)", padding: "0 12px 0 0", lineHeight: 1 }}>‹</button>
        <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>Statut du profil</span>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Avatar + name */}
        <div style={{ background: "var(--theme-surface)", padding: "20px 16px 16px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid #E5E7EB" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 20, overflow: "hidden" }}>
              {avatarUrl ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : getInitials(userName)}
            </div>
            <div style={{ position: "absolute", bottom: 0, right: -2, width: 18, height: 18, borderRadius: "50%", background: "var(--bp-primary)", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>✓</span>
            </div>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{userName}</span>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          {/* Welcome */}
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>Bienvenue, {firstName}&nbsp;!</h3>
          <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
            Si nous prenons des mesures à l'encontre de votre profil ou de votre contenu suite à une infraction à nos Standards, vous les verrez ici.
          </p>

          {/* Extra features */}
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>Fonctionnalités supplémentaires</h3>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: "#64748B" }}>
            Pour utiliser ces fonctionnalités, vous devez être éligible et éviter d'enfreindre les règles.
          </p>
          <div style={{ background: "var(--theme-surface)", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden", marginBottom: 20 }}>
            {[
              { icon: "⭐", label: "Recommandations", status: "Actif", statusColor: "#111827" },
              { icon: "⚠️", label: "Monétisation", status: "Non éligible", statusColor: "#64748B" },
            ].map((row, i) => (
              <button key={row.label} style={{ width: "100%", background: "none", border: "none", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", borderBottom: i === 0 ? "1px solid #F1F5F9" : "none" }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: "#1E293B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {row.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: row.statusColor }}>{row.status}</div>
                </div>
                <span style={{ color: "#64748B", fontSize: 20 }}>›</span>
              </button>
            ))}
          </div>

          {/* En savoir plus */}
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>En savoir plus</h3>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
            Consultez nos Standards de la communauté et obtenez des conseils pour du contenu de qualité.
          </p>

          {/* Illustrated cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { title: "Présentation des Standards de la communauté", bg: "#DCFCE7", emoji: "👴" },
              { title: "Application des Standards de la communauté", bg: "#FEE2E2", emoji: "👩" },
            ].map(card => (
              <button key={card.title} style={{ background: "var(--theme-surface)", border: "1px solid #E5E7EB", borderRadius: 12, overflow: "hidden", textAlign: "left", cursor: "pointer", padding: 0 }}>
                <div style={{ background: card.bg, height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>{card.emoji}</div>
                <div style={{ padding: "10px 10px 12px", fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{card.title}</div>
              </button>
            ))}
          </div>

          {/* Feedback */}
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800 }}>Donnez-nous votre avis</h3>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
            Dans quelle mesure êtes-vous satisfait ou insatisfait de l'aide que vous avez reçue par rapport à votre problème ?
          </p>
          <button
            onClick={() => setSurvey("rating")}
            style={{ width: "100%", background: "var(--theme-surface)", border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}
          >
            <span>💬</span> Donner votre avis
          </button>
        </div>
      </div>

      {/* Survey popups */}
      {(survey === "rating" || survey === "text") && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 10, display: "flex", alignItems: "flex-end" }}
          onClick={() => setSurvey("none")}>
          <div style={{ background: "var(--theme-surface)", borderRadius: "20px 20px 0 0", width: "100%", padding: "20px 20px 40px" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setSurvey("none")} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", marginBottom: 16, color: "var(--theme-text)", padding: 0 }}>✕</button>

            {survey === "rating" && (
              <>
                <p style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
                  Dans quelle mesure êtes-vous satisfait ou insatisfait de l'aide que vous avez reçue par rapport à votre problème&nbsp;?
                </p>
                <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
                  {RATINGS.map((r, i) => (
                    <button key={r} onClick={() => setRating(r)} style={{ width: "100%", background: "none", border: "none", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderBottom: i < RATINGS.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                      <span style={{ fontSize: 14 }}>{r}</span>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${rating === r ? "var(--bp-primary)" : "#CBD5E1"}`, background: rating === r ? "var(--bp-primary)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {rating === r && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--theme-surface)" }} />}
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => { if (rating) setSurvey("text"); }} style={{ width: "100%", background: rating ? "var(--bp-primary)" : "#CBD5E1", color: "#fff", border: "none", borderRadius: 24, padding: "14px", fontSize: 15, fontWeight: 700, cursor: rating ? "pointer" : "default" }}>
                  Continuer
                </button>
              </>
            )}

            {survey === "text" && (
              <>
                <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
                  Pourquoi êtes-vous satisfait ou insatisfait de l'aide que vous avez reçue par rapport à votre problème&nbsp;? Veuillez donner le plus de détails possible.
                </p>
                <input
                  type="text"
                  placeholder="Entrez la réponse ici"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  style={{ width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 16, boxSizing: "border-box", outline: "none" }}
                />
                <button onClick={() => setSurvey("done")} style={{ width: "100%", background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 24, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  Continuer
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {survey === "done" && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--theme-surface)", borderRadius: 16, padding: "32px 24px", margin: "0 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🙏</div>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Merci pour votre avis&nbsp;!</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>Votre retour nous aide à améliorer Brute Pawa.</div>
            <button onClick={() => setSurvey("none")} style={{ background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
