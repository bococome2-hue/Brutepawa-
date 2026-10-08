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

const card = { background: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 10 } as const;
const fmtDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr", { weekday: "short", day: "numeric", month: "short" });
const fmtDate = (s: string) => new Date(s).toLocaleString("fr", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function GroupStatisticsPanel({ title, data, loading, error, onRetry, onClose }: Props) {
  const rows: [string, string | number][] = data ? [
    ["Messages aujourd'hui", data.messagesToday],
    ["Messages sur 7 jours", data.messagesLast7Days],
    ["Membres", data.membersTotal],
    ["Membres ayant écrit (7 j)", data.writersLast7Days],
    ["Vues (7 j)", data.viewsLast7Days],
    ["Lecteurs distincts (7 j)", data.readersLast7Days],
    ["Réactions (7 j)", "Non suivies"],
  ] : [];
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "#F1F5F9", zIndex: 10002, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
        <button onClick={onClose} aria-label="Retour" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: 4 }}>‹</button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Statistiques · {title}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {loading && !data && !error && <div style={card}>Chargement des statistiques…</div>}
        {error && (
          <div style={card}>
            <div style={{ color: "#B91C1C", marginBottom: 10 }}>{error}</div>
            <button onClick={onRetry} style={{ border: "none", background: "var(--bp-primary)", color: "#fff", borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer" }}>Réessayer</button>
          </div>
        )}
        {data && (
          <>
            <div style={card}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Résumé</div>
              {rows.map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: 14 }}>
                  <span>{l}</span><strong>{v}</strong>
                </div>
              ))}
              <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 8 }}>
                {data.lastMessageAt ? `Dernier message : ${fmtDate(data.lastMessageAt)}` : "Aucun message dans ce groupe."}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Période : {data.periodStart} au {data.periodEnd} ({data.timeZone})</div>
            </div>
            <div style={card}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Valeurs par jour</div>
              <table style={{ width: "100%", fontSize: 13.5, borderCollapse: "collapse" }}>
                <thead><tr style={{ textAlign: "left", color: "#64748B" }}><th style={{ padding: "4px 0" }}>Jour</th><th style={{ textAlign: "right" }}>Messages</th><th style={{ textAlign: "right" }}>Vues</th></tr></thead>
                <tbody>
                  {data.daily.map(d => (
                    <tr key={d.day} style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                      <td style={{ padding: "6px 0" }}>{fmtDay(d.day)}</td>
                      <td style={{ textAlign: "right" }}>{d.messages}</td>
                      <td style={{ textAlign: "right" }}>{d.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>{data.viewDefinition}</div>
            </div>
            <div style={card}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Activité récente</div>
              {data.recentActivity.length === 0 && <div style={{ fontSize: 13.5, color: "#64748B" }}>Aucune activité enregistrée.</div>}
              {data.recentActivity.map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 0", fontSize: 13.5, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                  <span>{a.name} · {a.type === "system" ? "message système" : "message"}</span>
                  <span style={{ color: "#64748B", flexShrink: 0 }}>{fmtDate(a.createdAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{ ...card, fontSize: 12.5, color: "#64748B" }}>
          L'historique de croissance des membres, les boosts et l'historique des réactions ne sont pas disponibles : ces données ne sont pas enregistrées.
        </div>
      </div>
    </div>,
    document.body,
  );
}
