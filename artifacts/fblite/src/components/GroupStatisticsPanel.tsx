import { useState } from "react";
import { createPortal } from "react-dom";
import type { GroupStatistics } from "../hooks/useGroupStatistics";

interface Props {
  title: string;
  data: GroupStatistics | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}

// Retain the original full-width sections and tabbed group statistics layout.
const card = { background: "#fff", padding: "16px", marginBottom: 10 } as const;
const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr", { day: "numeric", month: "short" });
const fmtDate = (s: string) => new Date(s).toLocaleString("fr", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const COLORS = ["#4F9DDE", "#5AC05A", "#F97316", "#E24444", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#6B7280", "#F43F5E", "#10B981", "#A3E635", "#FBBF24", "#7C3AED", "#E879F9", "#34D399", "#60A5FA"];

export default function GroupStatisticsPanel({ title, data, loading, error, onRetry, onClose }: Props) {
  const [tab, setTab] = useState<"stats" | "boosts">("stats");
  const period = data ? `${fmtDay(data.periodStart)} — ${fmtDay(data.periodEnd)}` : "7 derniers jours";
  const metrics = [
    { label: "Membres", value: data?.membersTotal },
    { label: "Messages", value: data?.messagesLast7Days },
    { label: "Membres lecteurs", value: data?.readersLast7Days },
    { label: "Membres rédacteurs", value: data?.writersLast7Days },
  ];
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "#F1F5F9", zIndex: 10002, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", display: "flex", alignItems: "center", height: 56, padding: "0 4px", flexShrink: 0, boxShadow: "0 1px 0 rgba(0,0,0,0.08)", zIndex: 5 }}>
        <button onClick={onClose} aria-label="Retour" style={{ background: "none", border: "none", cursor: "pointer", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 17, color: "#000", textAlign: "center" }}>{title}</span>
        <div style={{ width: 48 }} />
      </div>
      <div role="tablist" aria-label="Statistiques du groupe" style={{ background: "#fff", display: "flex", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
        {(["stats", "boosts"] as const).map(key => (
          <button key={key} role="tab" id={`group-${key}-tab`} aria-selected={tab === key} aria-controls={`group-${key}-panel`} onClick={() => setTab(key)}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, borderBottom: tab === key ? "2.5px solid var(--bp-primary)" : "2.5px solid transparent", color: tab === key ? "var(--bp-primary)" : "#9CA3AF", fontWeight: tab === key ? 700 : 400, fontSize: 14, transition: "all 0.15s" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {key === "stats" ? <><path d="M4 20V10M12 20V4M20 20V13" /></> : <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" />}
            </svg>
            {key === "stats" ? "Statistiques" : "Boosts"}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`group-${tab}-panel`} aria-labelledby={`group-${tab}-tab`} style={{ flex: 1, overflowY: "auto", padding: "14px 0 32px" }}>
        {tab === "stats" ? <>
          {loading && !data && !error && <div role="status" style={card}>Chargement des statistiques…</div>}
          {error && <div role="alert" style={card}>
            <div style={{ color: "#B91C1C", marginBottom: 10 }}>{error}</div>
            <button onClick={onRetry} style={{ border: "none", background: "var(--bp-primary)", color: "#fff", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer" }}>Réessayer</button>
          </div>}
          <div style={{ ...card, padding: "16px 16px 12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#000" }}>Vue d'ensemble</span>
              <span style={{ fontSize: 12.5, color: "#9CA3AF" }}>{period}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {metrics.map(metric => <div key={metric.label}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#000" }}>{metric.value ?? "—"}</div>
                <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>{metric.label}</div>
              </div>)}
            </div>
          </div>
          {["Croissance", "Membres du groupe"].map(label => <div key={label} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15.5, color: "#000" }}>{label}</span>
              <span style={{ fontSize: 12.5, color: "#9CA3AF" }}>{period}</span>
            </div>
            <div style={{ minHeight: label === "Croissance" ? 110 : 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: "#9CA3AF", fontSize: 12.5, textAlign: "center" }}>
              {label === "Membres du groupe" && <strong style={{ fontSize: 18, color: "#000" }}>{data?.membersTotal ?? "—"} membres actuellement</strong>}
              Historique non suivi : courbe indisponible.
            </div>
          </div>)}
          {data && <>
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: "#000", marginBottom: 14 }}>Consultations et réactions</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><strong style={{ fontSize: 18 }}>{data.viewsLast7Days}</strong><div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Vues · 7 derniers jours</div></div>
                <div><strong style={{ fontSize: 18 }}>—</strong><div style={{ fontSize: 12.5, color: "#9CA3AF" }}>Réactions · Non suivies</div></div>
              </div>
              <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 0 }}>{data.viewDefinition}</p>
            </div>
            <div style={card}>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: "#000", marginBottom: 10 }}>Activité récente</div>
              {data.recentActivity.length === 0 && <div style={{ fontSize: 13, color: "#9CA3AF" }}>Aucune activité enregistrée.</div>}
              {data.recentActivity.map(activity => <div key={activity.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 13, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                <span>{activity.name} · {activity.type === "system" ? "message système" : "message"}</span>
                <span style={{ color: "#9CA3AF", flexShrink: 0 }}>{fmtDate(activity.createdAt)}</span>
              </div>)}
            </div>
          </>}
        </> : <>
          <div style={{ ...card, padding: "20px 16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 14 }}>Les boosts ne sont pas encore disponibles pour ce groupe.</div>
            <div aria-hidden="true" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 16 }}>
              {COLORS.map((color, i) => <div key={color} style={{ width: 34, height: 34, borderRadius: "50%", background: i >= 9 ? `linear-gradient(135deg,${color},${COLORS[(i + 4) % COLORS.length]})` : color, border: "2px solid transparent" }} />)}
            </div>
          </div>
          {[
            { label: "Logo de profil", description: "Choisissez une couleur et un logo pour le profil du groupe." },
            { label: "Lot d'emoji du groupe", description: "Choisissez un lot d'emoji qui sera disponible pour tous les membres du groupe." },
            { label: "Statut emoji du groupe", description: "Choisissez un statut qui sera affiché à côté du nom du groupe." },
          ].map(item => <div key={item.label} style={{ ...card, marginBottom: 6, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 15.5, color: "#000", fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 500 }}>Indisponible</span>
            </div>
            <p style={{ fontSize: 12.5, color: "#9CA3AF", margin: 0, lineHeight: 1.5 }}>{item.description}</p>
          </div>)}
          <div style={{ padding: "0 16px" }}>
            <button disabled style={{ width: "100%", background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 24, padding: "15px 0", fontSize: 16, fontWeight: 700, marginTop: 8, opacity: 0.45 }}>Appliquer</button>
          </div>
        </>}
      </div>
    </div>,
    document.body,
  );
}
