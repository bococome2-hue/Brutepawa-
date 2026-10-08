import { useEffect, useState } from "react";
import { apiGetStorageStats, type StorageStats } from "../lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} Go`;
  if (b >= 1_048_576)     return `${(b / 1_048_576).toFixed(1)} Mo`;
  if (b >= 1024)          return `${Math.round(b / 1024)} Ko`;
  return `${b} o`;
}

function barColor(pct: number): string {
  if (pct >= 90) return "#EF4444"; // rouge
  if (pct >= 70) return "#f59e0b"; // orange
  return "var(--bp-primary)";         // bleu normal
}

const PLAN_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  user:     { bg: "#DCFCE7", text: "#1877f2", label: "Gratuit" },
  verified: { bg: "#DCFCE7", text: "#388e3c", label: "Vérifié" },
  premium:  { bg: "#FEF3C7", text: "#F59E0B", label: "Premium" },
  admin:    { bg: "#EDE9FE", text: "#8B5CF6", label: "Admin" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function StorageSection() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);

  useEffect(() => {
    apiGetStorageStats()
      .then(s => { setStats(s); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ padding: "20px 16px", color: "var(--fb-text-secondary)", fontSize: 14 }}>
      Chargement du stockage…
    </div>
  );

  if (error || !stats) return null;

  const badge = PLAN_BADGE[stats.plan] ?? PLAN_BADGE.user;
  const color = barColor(stats.percent);

  return (
    <div style={{ padding: "16px 16px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--fb-text)" }}>
          💾 Stockage
        </span>
        <span style={{
          background: badge.bg, color: badge.text,
          fontSize: 12, fontWeight: 700, padding: "3px 10px",
          borderRadius: 20, border: `1px solid ${badge.text}22`,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        background: "var(--fb-bg, #F1F5F9)", borderRadius: 99,
        height: 10, overflow: "hidden", marginBottom: 10,
      }}>
        <div style={{
          width: `${stats.percent}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 0.6s ease",
          minWidth: stats.percent > 0 ? 4 : 0,
        }} />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--fb-text-secondary)" }}>
          <strong style={{ color: color }}>{fmtBytes(stats.used)}</strong> utilisés
        </span>
        <span style={{ color: "var(--fb-text-secondary)", fontWeight: 600 }}>
          {stats.percent}%
        </span>
        <span style={{ color: "var(--fb-text-secondary)" }}>
          {fmtBytes(stats.quota)} au total
        </span>
      </div>

      {/* Remaining */}
      <div style={{
        marginTop: 12, padding: "10px 14px",
        background: stats.percent >= 90 ? "#FEE2E2" : "var(--fb-bg, #F1F5F9)",
        borderRadius: 10, fontSize: 13,
        color: stats.percent >= 90 ? "#EF4444" : "var(--fb-text-secondary)",
      }}>
        {stats.percent >= 90
          ? `⚠️ Espace presque plein — il te reste ${fmtBytes(stats.remaining)}`
          : `✅ ${fmtBytes(stats.remaining)} disponibles`
        }
      </div>

      {/* Plan upgrade hint for free users */}
      {stats.plan === "user" && stats.percent >= 50 && (
        <div style={{
          marginTop: 10, padding: "10px 14px",
          background: "#DCFCE7", borderRadius: 10,
          fontSize: 12, color: "var(--bp-primary)",
        }}>
          💡 Passe en <strong>Premium</strong> pour obtenir jusqu'à 10 Go de stockage.
        </div>
      )}
    </div>
  );
}
