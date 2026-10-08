import { useState, useEffect } from "react";
import { apiGetTontines, apiGetOpenTontines, apiCreateTontine, apiContribute, apiJoinTontine, type ApiTontine } from "../lib/api";

export default function TontinesPage({ initialTontineId }: { initialTontineId?: number } = {}) {
  const [tontines, setTontines]         = useState<ApiTontine[]>([]);
  const [openTontines, setOpenTontines] = useState<ApiTontine[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [selectedId, setSelectedId]     = useState<number | null>(initialTontineId ?? null);
  const [form, setForm]                 = useState({ name: "", amount: "", cycle: "Mensuel", emoji: "💼" });
  const [paid, setPaid]                 = useState<number[]>([]);
  const [creating, setCreating]         = useState(false);
  const [joining, setJoining]           = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([apiGetTontines(), apiGetOpenTontines()])
      .then(([mine, open]) => {
        setTontines(mine);
        setOpenTontines(open.filter(t => !mine.find(m => m.id === t.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const selected = tontines.find(t => t.id === selectedId);

  const handleCreate = async () => {
    if (!form.name || !form.amount) return;
    setCreating(true);
    try {
      const newT = await apiCreateTontine({
        name: form.name,
        contributionAmount: parseInt(form.amount),
        cycle: form.cycle,
      });
      setTontines(prev => [...prev, newT]);
      setShowCreate(false);
      setForm({ name: "", amount: "", cycle: "Mensuel", emoji: "💼" });
    } catch { /* silent */ }
    setCreating(false);
  };

  const handlePay = async (tontineId: number, amount: number) => {
    try {
      await apiContribute(tontineId, amount);
      setPaid(p => [...p, tontineId]);
    } catch { /* silent */ }
  };

  const handleJoin = async (tontineId: number) => {
    setJoining(tontineId);
    try {
      await apiJoinTontine(tontineId);
      loadData();
    } catch { /* silent */ }
    setJoining(null);
  };

  const emojis = ["💼", "👨‍👩‍👧‍👦", "🎓", "💰", "🏦", "🌍", "🙏", "💪"];
  const tontineEmoji = (t: ApiTontine) => ["💼", "👨‍👩‍👧‍👦", "🎓", "💰", "🏦", "🌍"][t.id % 6];
  const openEmoji    = (_: ApiTontine, i: number) => ["🌍", "🤝", "👩‍💼", "💪", "🎓", "🏦"][i % 6];

  const fmtDate = (d: string | null) => {
    if (!d) return "Non défini";
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  if (selectedId && selected) {
    const isPaid = paid.includes(selected.id);
    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: "var(--bp-primary)", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>←</button>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17 }}>{tontineEmoji(selected)} {selected.name}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{selected.membersCount} membres · {selected.cycle}</div>
          </div>
        </div>

        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Cotisation", value: `${selected.contributionAmount.toLocaleString()} FCFA`, icon: "📅", color: "var(--bp-primary)" },
            { label: "Membres", value: `${selected.membersCount} personnes`, icon: "👥", color: "#FF9800" },
            { label: "Prochain tour", value: fmtDate(selected.nextContributionDate), icon: "📆", color: "#9C27B0" },
            { label: "Statut", value: selected.status === "active" ? "Actif ✅" : selected.status, icon: "✅", color: "var(--bp-primary)" },
          ].map(card => (
            <div key={card.label} style={{ background: "var(--fb-white)", borderRadius: 12, padding: 14, border: "1px solid var(--fb-divider)" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{card.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 16, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ margin: "0 16px 16px" }}>
          {!isPaid ? (
            <button onClick={() => handlePay(selected.id, selected.contributionAmount)} style={{
              width: "100%", background: "var(--bp-primary)", color: "#fff", border: "none",
              borderRadius: 10, padding: "12px", fontWeight: 800, fontSize: 15, cursor: "pointer"
            }}>💳 Payer la cotisation — {selected.contributionAmount.toLocaleString()} FCFA</button>
          ) : (
            <div style={{ background: "#DCFCE7", borderRadius: 12, padding: 14, textAlign: "center", color: "var(--bp-primary)", fontWeight: 800 }}>
              ✅ Cotisation payée pour ce mois !
            </div>
          )}
        </div>

        <div style={{ background: "var(--fb-white)", margin: "0 0 4px" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)", fontWeight: 700, fontSize: 15 }}>
            📋 Historique des cotisations
          </div>
          <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--fb-text-secondary)", fontSize: 13 }}>
            Aucune cotisation enregistrée
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>💰 Mes Tontines</h2>
          <button onClick={() => setShowCreate(true)} style={{
            background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 20,
            padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer"
          }}>+ Créer une tontine</button>
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg, var(--bp-primary), #0EA5E9)", color: "#fff", padding: "16px" }}>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 4 }}>Total des cotisations mensuelles</div>
        <div style={{ fontSize: 28, fontWeight: 900 }}>
          {tontines.reduce((s, t) => s + t.contributionAmount, 0).toLocaleString()} FCFA
        </div>
        <div style={{ fontSize: 13, marginTop: 4, opacity: 0.9 }}>
          {tontines.length} tontine{tontines.length !== 1 ? "s" : ""} active{tontines.length !== 1 ? "s" : ""}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fb-text-secondary)" }}>
          Chargement des tontines...
        </div>
      )}

      {!loading && tontines.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--fb-text-secondary)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Aucune tontine</div>
          <div style={{ fontSize: 13 }}>Créez votre première tontine ou rejoignez-en une ci-dessous</div>
        </div>
      )}

      <div style={{ padding: "8px 0" }}>
        {tontines.map(t => {
          const isPaid = paid.includes(t.id);
          return (
            <div key={t.id} onClick={() => setSelectedId(t.id)} style={{
              background: "var(--fb-white)", margin: "0 0 4px", padding: "14px 16px", cursor: "pointer"
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 50, height: 50, background: "var(--fb-bg)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                  {tontineEmoji(t)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>
                    👥 {t.membersCount} membres · 📅 {t.cycle}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    💰 <strong>{t.contributionAmount.toLocaleString()} FCFA</strong> / membre
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {isPaid && <div style={{ color: "var(--bp-primary)", fontWeight: 700, fontSize: 12 }}>✓ Payé</div>}
                  <div style={{ fontSize: 11, color: "var(--fb-text-secondary)" }}>
                    Prochain : {t.nextContributionDate
                      ? new Date(t.nextContributionDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "var(--fb-white)", margin: "4px 0", padding: "14px 16px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🌍 Tontines ouvertes à rejoindre</div>
        {openTontines.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "16px", color: "var(--fb-text-secondary)", fontSize: 13 }}>
            Aucune tontine ouverte pour l'instant
          </div>
        )}
        {openTontines.map((t, i) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--fb-divider)" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 22 }}>{openEmoji(t, i)}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{t.membersCount} membres · {t.contributionAmount.toLocaleString()} FCFA/mois</div>
              </div>
            </div>
            <button
              onClick={() => handleJoin(t.id)}
              disabled={joining === t.id}
              style={{ background: joining === t.id ? "#ccc" : "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 16, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {joining === t.id ? "..." : "Rejoindre"}
            </button>
          </div>
        ))}
      </div>

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--fb-white)", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>💰 Créer une tontine</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {emojis.map(e => (
                <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))} style={{
                  width: 40, height: 40, fontSize: 22, border: `2px solid ${form.emoji === e ? "var(--bp-primary)" : "var(--fb-divider)"}`,
                  borderRadius: 10, background: form.emoji === e ? "var(--fb-blue-light)" : "var(--fb-bg)", cursor: "pointer"
                }}>{e}</button>
              ))}
            </div>

            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom de la tontine *" style={{ width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
            <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Montant par cotisation (FCFA) *" type="number" style={{ width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
            <select value={form.cycle} onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))} style={{ width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 16 }}>
              <option>Hebdomadaire</option><option>Mensuel</option><option>Trimestriel</option>
            </select>

            <button onClick={handleCreate} disabled={creating} style={{
              width: "100%", background: creating ? "#ccc" : "var(--bp-primary)", color: "#fff", border: "none",
              borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer"
            }}>
              {creating ? "Création en cours..." : "Créer la tontine"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
