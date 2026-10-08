import { useState } from "react";
import { useNavigate } from "../router";
import { apiCreatePost } from "../lib/api";

const LIFE_EVENT_CATEGORIES = [
  { id: "travail",       icon: "💼", label: "Nouvel emploi / promotion",     color: "var(--bp-primary)" },
  { id: "etudes",        icon: "🎓", label: "Diplôme / études",              color: "#8B5CF6" },
  { id: "relation",      icon: "❤️", label: "Relation amoureuse",            color: "#E91E63" },
  { id: "fiancailles",   icon: "💍", label: "Fiançailles",                   color: "#D97706" },
  { id: "mariage",       icon: "💒", label: "Mariage",                       color: "#EF4444" },
  { id: "enfant",        icon: "👶", label: "Naissance d'un enfant",         color: "#43A047" },
  { id: "maison",        icon: "🏠", label: "Nouvelle maison",               color: "#00838F" },
  { id: "voyage",        icon: "✈️", label: "Voyage / expatriation",         color: "#1565C0" },
  { id: "entreprise",    icon: "🚀", label: "Création d'entreprise",         color: "#D97706" },
  { id: "sante",         icon: "💪", label: "Santé & bien-être",             color: "#388E3C" },
  { id: "deuil",         icon: "🕊️", label: "Deuil / perte",                color: "#546E7A" },
  { id: "religion",      icon: "🙏", label: "Événement religieux",           color: "#795548" },
  { id: "sport",         icon: "🏆", label: "Récompense / victoire",         color: "#FFA000" },
  { id: "amitie",        icon: "🤝", label: "Nouvelle amitié / réseau",      color: "#0288D1" },
  { id: "achat",         icon: "🛍️", label: "Grand achat",                   color: "#AB47BC" },
  { id: "autre",         icon: "✨", label: "Autre moment important",        color: "#546E7A" },
];

export default function CreateLifeEventPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCat = LIFE_EVENT_CATEGORIES.find(c => c.id === selected);

  const handlePublish = async () => {
    if (!selected || !selectedCat) { setError("Sélectionne une catégorie"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const text = `${selectedCat.icon} Évènement marquant : ${selectedCat.label}${detail ? `\n${detail}` : ""}`;
      await apiCreatePost(text);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--fb-bg)", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "var(--theme-surface)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--bp-primary)", padding: "4px 8px" }}>←</button>
        <div style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>Créer un évènement marquant</div>
        <button
          onClick={handlePublish}
          disabled={!selected || submitting}
          style={{
            background: selected && !submitting ? "var(--bp-primary)" : "#E5E7EB",
            border: "none", color: selected && !submitting ? "#fff" : "#bbb",
            borderRadius: 20, padding: "8px 18px", fontSize: 14, fontWeight: 700,
            cursor: selected && !submitting ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Envoi…" : "Publier"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {error && <div style={{ background: "#FEE2E2", color: "#EF4444", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>{error}</div>}

        {/* Selected category preview */}
        {selectedCat && (
          <div style={{ background: `${selectedCat.color}18`, border: `1.5px solid ${selectedCat.color}40`, borderRadius: 14, padding: "16px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: selectedCat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{selectedCat.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--theme-text)" }}>{selectedCat.label}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Catégorie sélectionnée</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748B" }}>✕</button>
          </div>
        )}

        {/* Detail input */}
        <div style={{ background: "var(--theme-surface)", borderRadius: 14, border: "1px solid #E5E7EB", padding: "14px 16px", marginBottom: 20 }}>
          <textarea
            placeholder={selectedCat ? `Raconte cet évènement — ${selectedCat.label.toLowerCase()}…` : "Décris ton évènement marquant…"}
            value={detail}
            onChange={e => setDetail(e.target.value)}
            style={{ width: "100%", border: "none", outline: "none", fontFamily: "inherit", fontSize: 15, color: "var(--theme-text)", resize: "none", minHeight: 70, boxSizing: "border-box" }}
            maxLength={500}
          />
          <div style={{ textAlign: "right", fontSize: 11, color: "#bbb", marginTop: 4 }}>{detail.length}/500</div>
        </div>

        {/* Category grid */}
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, color: "var(--theme-text)" }}>Choisir une catégorie</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {LIFE_EVENT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelected(selected === cat.id ? null : cat.id)}
              style={{
                background: selected === cat.id ? `${cat.color}18` : "#fff",
                border: selected === cat.id ? `2px solid ${cat.color}` : "1.5px solid #E5E7EB",
                borderRadius: 14, padding: "16px 12px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 12, background: selected === cat.id ? cat.color : `${cat.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>{cat.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: selected === cat.id ? cat.color : "#111827", textAlign: "center", lineHeight: 1.3 }}>{cat.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
