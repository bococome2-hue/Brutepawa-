import { useState, useEffect } from "react";
import { useNavigate } from "../router";

const G = "var(--bp-primary)";
const GD = "var(--bp-primary-dark)";

const API = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("fb_token");
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
  });
}

interface SavedLoc {
  savedId: number;
  label: string | null;
  icon: string;
  name: string;
  city: string | null;
  region: string | null;
  country: string;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  display: string;
  flag: string;
}

const LABEL_ICONS: Record<string, string> = {
  "Maison": "🏠", "Travail": "💼", "École": "🎓", "Famille": "👨‍👩‍👧‍👦",
  "Gym": "🏋️", "Hôpital": "🏥", "Église": "⛪", "Mosquée": "🕌",
};

export default function SavedLocationsPage() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<SavedLoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [mounted, setMounted]     = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [addName, setAddName]     = useState("");
  const [addLabel, setAddLabel]   = useState("");
  const [addCity, setAddCity]     = useState("");
  const [addCountry, setAddCountry] = useState("Bénin");
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/location/saved");
      if (r.ok) setLocations(await r.json() as SavedLoc[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (savedId: number) => {
    setDeleting(savedId);
    await apiFetch(`/location/save/${savedId}`, { method: "DELETE" });
    setLocations(prev => prev.filter(l => l.savedId !== savedId));
    setDeleting(null);
  };

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/location/save", {
        method: "POST",
        body: JSON.stringify({ name: addName.trim(), city: addCity.trim() || undefined, country: addCountry, label: addLabel.trim() || undefined }),
      });
      setShowAdd(false);
      setAddName(""); setAddLabel(""); setAddCity(""); setAddCountry("Bénin");
      await load();
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#F8FAFC", zIndex: 50,
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 260ms ease, transform 260ms ease",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1.5px solid #F1F5F9", background: "var(--theme-surface)", flexShrink: 0, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 8px rgba(0,0,0,.04)" }}>
        <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "#F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 17, color: "var(--theme-text)", textAlign: "center" }}>Lieux enregistrés</div>
        <div style={{ width: 38 }} />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid #F8FAFC", background: "var(--theme-surface)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "#F1F5F9" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ width: "60%", height: 14, borderRadius: 6, background: "#F1F5F9" }} />
                  <div style={{ width: "80%", height: 11, borderRadius: 5, background: "#F8FAFC" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && locations.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>📍</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--theme-text)" }}>Aucun lieu enregistré</div>
            <div style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center" }}>Enregistrez vos lieux favoris pour les retrouver facilement.</div>
          </div>
        )}

        {!loading && locations.map(loc => (
          <div key={loc.savedId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: "1px solid #F8FAFC", background: "var(--theme-surface)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              {loc.label ? (LABEL_ICONS[loc.label] ?? loc.icon) : loc.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--theme-text)" }}>{loc.label ?? loc.name}</div>
              <div style={{ fontSize: 12.5, color: "#9CA3AF", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {loc.city ? `${loc.city}, ` : ""}{loc.country}
              </div>
            </div>
            <button onClick={() => handleDelete(loc.savedId)} disabled={deleting === loc.savedId}
              style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "#FEF2F2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: deleting === loc.savedId ? 0.5 : 1 }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
            <button style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "#F8FAFC", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div style={{ padding: "12px 16px 28px", background: "var(--theme-surface)", borderTop: "1.5px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={() => setShowAdd(true)} style={{ width: "100%", padding: 15, borderRadius: 16, border: "none", background: `linear-gradient(135deg,${G},${GD})`, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 16px rgba(34,197,94,.3)" }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
          Ajouter un nouveau lieu
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "var(--theme-surface)", borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", boxShadow: "0 -8px 40px rgba(0,0,0,.15)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#E5E7EB", margin: "0 auto 20px" }} />
            <div style={{ fontWeight: 700, fontSize: 18, color: "var(--theme-text)", marginBottom: 18 }}>Nouveau lieu</div>

            {[
              { label: "Nom du lieu *", value: addName, set: setAddName, placeholder: "Ex: Stade Mathieu Kérékou" },
              { label: "Étiquette", value: addLabel, set: setAddLabel, placeholder: "Ex: Maison, Travail, École…" },
              { label: "Ville", value: addCity, set: setAddCity, placeholder: "Ex: Cotonou" },
              { label: "Pays", value: addCountry, set: setAddCountry, placeholder: "Ex: Bénin" },
            ].map((f, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 5 }}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "13px 14px", border: "1.5px solid #E5E7EB", borderRadius: 14, fontSize: 15, outline: "none", background: "#F8FAFC", boxSizing: "border-box", fontFamily: "inherit" }}
                  onFocus={e => (e.currentTarget.style.borderColor = G)}
                  onBlur={e => (e.currentTarget.style.borderColor = "#E5E7EB")} />
              </div>
            ))}

            <button onClick={handleAdd} disabled={!addName.trim() || saving}
              style={{ width: "100%", padding: 15, borderRadius: 16, border: "none", background: addName.trim() ? `linear-gradient(135deg,${G},${GD})` : "#E5E7EB", color: addName.trim() ? "#fff" : "#9CA3AF", fontWeight: 700, fontSize: 15, cursor: addName.trim() ? "pointer" : "not-allowed" }}>
              {saving ? "Enregistrement…" : "Enregistrer ce lieu"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
