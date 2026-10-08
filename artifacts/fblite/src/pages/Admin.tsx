import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { STATS_BY_COUNTRY, formatNumber } from "../data/mock";
import { isAdmin } from "../lib/admin";
import { apiGetUsers, type PublicUser, apiAdminGetWithdrawals, apiAdminPatchWithdrawal, type AdminWithdrawal, apiAdminGetReports, apiAdminPatchReport, type AdminReport } from "../lib/api";
import { useCurrentUser } from "../hooks/useCurrentUser";

type AdminSection = "dashboard" | "users" | "content" | "jobs" | "reports" | "monetization" | "withdrawals" | "settings";

type WithdrawalStatus = "all" | "pending" | "validated" | "paid" | "rejected";
type ReportStatusFilter = "all" | "pending" | "reviewed" | "dismissed";

const PENDING_VERIFS = [
  { id: 1, name: "Ibrahim Traoré", country: "🇹🇬 Togo", request: "Badge vérifié", date: "Hier" },
  { id: 2, name: "Marie-Claire Mbaye", country: "🇨🇲 Cameroun", request: "Boutique Premium", date: "Il y a 2 j" },
  { id: 3, name: "Sylvie Ondoua", country: "🇬🇦 Gabon", request: "Publication sponsorisée", date: "Il y a 3 j" },
];

export default function Admin() {
  const navigate = useNavigate();
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [apiUsers, setApiUsers] = useState<PublicUser[]>([]);

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [wdFilter, setWdFilter] = useState<WithdrawalStatus>("all");
  const [wdLoading, setWdLoading] = useState(false);
  const [wdActing, setWdActing] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [wdError, setWdError] = useState<string | null>(null);

  // Reports state
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [rptFilter, setRptFilter] = useState<ReportStatusFilter>("all");
  const [rptSort, setRptSort] = useState<"asc" | "desc">("desc");
  const [rptPage, setRptPage] = useState(1);
  const [rptTotalPages, setRptTotalPages] = useState(1);
  const [rptTotal, setRptTotal] = useState(0);
  const [rptLoading, setRptLoading] = useState(false);
  const [rptActing, setRptActing] = useState<number | null>(null);
  const [rptError, setRptError] = useState<string | null>(null);

  const user = useCurrentUser();

  useEffect(() => {
    if (!isAdmin(user.email ?? "")) {
      navigate("/");
      return;
    }
    apiGetUsers().then(setApiUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (section !== "reports") return;
    setRptLoading(true);
    setRptError(null);
    apiAdminGetReports({ page: rptPage, sort: rptSort, status: rptFilter })
      .then(data => {
        setReports(data.reports);
        setRptTotal(data.total);
        setRptTotalPages(data.totalPages);
      })
      .catch(() => setRptError("Impossible de charger les signalements"))
      .finally(() => setRptLoading(false));
  }, [section, rptFilter, rptSort, rptPage]);

  async function handleReportAction(id: number, action: "reviewed" | "dismissed") {
    setRptActing(id);
    setRptError(null);
    try {
      const updated = await apiAdminPatchReport(id, action);
      setReports(rs => rs.map(r => r.id === updated.id ? { ...r, status: updated.status as AdminReport["status"] } : r));
    } catch (e) {
      setRptError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setRptActing(null);
    }
  }

  useEffect(() => {
    if (section !== "withdrawals") return;
    setWdLoading(true);
    setWdError(null);
    apiAdminGetWithdrawals(wdFilter === "all" ? undefined : wdFilter)
      .then(setWithdrawals)
      .catch(() => setWdError("Impossible de charger les retraits"))
      .finally(() => setWdLoading(false));
  }, [section, wdFilter]);

  async function handleWithdrawalAction(id: number, action: "validated" | "paid" | "rejected", note?: string) {
    setWdActing(id);
    setWdError(null);
    try {
      const updated = await apiAdminPatchWithdrawal(id, action, note);
      setWithdrawals(ws => ws.map(w => w.id === updated.id ? updated : w));
    } catch (e) {
      setWdError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setWdActing(null);
    }
  }

  if (!isAdmin(user.email ?? "")) return null;

  const totalUsers = STATS_BY_COUNTRY.reduce((sum, c) => sum + c.users, 0);
  const totalActive = STATS_BY_COUNTRY.reduce((sum, c) => sum + c.active, 0);
  const totalPosts = STATS_BY_COUNTRY.reduce((sum, c) => sum + c.posts, 0);
  const totalJobs = STATS_BY_COUNTRY.reduce((sum, c) => sum + c.jobs, 0);

  const navBtn = (id: AdminSection, emoji: string, label: string) => (
    <button
      key={id}
      onClick={() => setSection(id)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "11px 16px", border: "none", textAlign: "left",
        cursor: "pointer", borderRadius: 8,
        background: section === id ? "var(--fb-blue-light)" : "transparent",
        color: section === id ? "var(--bp-primary)" : "var(--fb-text)",
        fontWeight: section === id ? 700 : 500, fontSize: 14,
      }}
    >
      <span style={{ fontSize: 18 }}>{emoji}</span> {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 20 }}>
      {/* Header */}
      <div style={{ background: "var(--bp-primary)", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>←</button>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>🛡️ Panneau Admin</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Brute Pawa · Tableau de bord régional</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ background: "var(--fb-white)", padding: "8px", borderBottom: "1px solid var(--fb-divider)", display: "flex", overflowX: "auto", scrollbarWidth: "none", gap: 4 }}>
        {(["dashboard", "users", "content", "jobs", "reports", "monetization", "withdrawals", "settings"] as AdminSection[]).map(id => {
          const labels: Record<AdminSection, [string, string]> = {
            dashboard: ["📊", "Stats"], users: ["👤", "Utilisateurs"], content: ["📝", "Contenus"],
            jobs: ["💼", "Emplois"], reports: ["⚠️", "Signalements"], monetization: ["💳", "Revenus"],
            withdrawals: ["💸", "Retraits"], settings: ["⚙️", "Config"]
          };
          const [emoji, label] = labels[id];
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              style={{
                flex: "0 0 auto", padding: "8px 12px", background: "none", border: "none",
                borderBottom: section === id ? "3px solid var(--bp-primary)" : "3px solid transparent",
                color: section === id ? "var(--bp-primary)" : "var(--fb-text-secondary)",
                fontWeight: section === id ? 700 : 500, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {emoji} {label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 16 }}>

        {/* DASHBOARD */}
        {section === "dashboard" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>📊 Vue d'ensemble — Afrique francophone</div>

            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Utilisateurs total", value: formatNumber(totalUsers), icon: "👤", color: "var(--bp-primary)" },
                { label: "Actifs ce mois", value: formatNumber(totalActive), icon: "🟢", color: "var(--bp-primary)" },
                { label: "Publications", value: formatNumber(totalPosts), icon: "📝", color: "#9C27B0" },
                { label: "Offres d'emploi", value: formatNumber(totalJobs), icon: "💼", color: "#FF9800" },
              ].map((kpi, i) => (
                <div key={i} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{kpi.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: 22, color: kpi.color }}>{kpi.value}</div>
                  <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Pending verifications */}
            {PENDING_VERIFS.length > 0 && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FBBF24", borderRadius: 10, padding: 14, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 10, color: "#D97706" }}>⏳ En attente de validation ({PENDING_VERIFS.length})</div>
                {PENDING_VERIFS.map(v => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid #FEF3C7" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name} {v.country}</div>
                      <div style={{ fontSize: 12, color: "#D97706" }}>{v.request} · {v.date}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✓</button>
                      <button style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✗</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats by country */}
            <div style={{ fontWeight: 700, marginBottom: 12 }}>🌍 Statistiques par pays</div>
            <div style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", overflow: "hidden" }}>
              {STATS_BY_COUNTRY.map((c, i) => {
                const maxUsers = STATS_BY_COUNTRY[0].users;
                const pct = Math.round((c.users / maxUsers) * 100);
                return (
                  <div key={c.code} style={{ padding: "12px 14px", borderTop: i > 0 ? "1px solid var(--fb-divider)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{c.flag}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "var(--fb-text-secondary)" }}>
                            {formatNumber(c.active)} actifs · {c.jobs} emplois
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, color: "var(--bp-primary)", fontSize: 14 }}>{formatNumber(c.users)}</div>
                        <div style={{ fontSize: 11, color: "var(--fb-text-secondary)" }}>utilisateurs</div>
                      </div>
                    </div>
                    <div style={{ background: "var(--fb-bg)", borderRadius: 4, height: 5, overflow: "hidden" }}>
                      <div style={{ background: "var(--bp-primary)", height: "100%", width: `${pct}%`, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* UTILISATEURS */}
        {section === "users" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>👤 Gestion des utilisateurs</div>
            <input placeholder="🔍 Rechercher un utilisateur..." style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["Tous", "Vérifiés", "Premium", "Signalés", "Suspendus"].map(f => (
                <button key={f} style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid var(--fb-border)", background: f === "Tous" ? "var(--bp-primary)" : "var(--fb-white)", color: f === "Tous" ? "#fff" : "var(--fb-text)", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>{f}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {apiUsers.map(u => {
                const fullName = `${u.firstName} ${u.lastName}`.trim() || "Utilisateur";
                const initials = (u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "") || "?";
                return (
                <div key={u.id} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0, overflow: "hidden" }}>
                    {u.avatarUrl ? <img src={u.avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      {fullName} {u.country && <span>{u.country}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>#{u.id} · {u.bio ?? "Membre Brute Pawa"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ background: "var(--fb-blue-light)", color: "var(--bp-primary)", border: "none", borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Voir</button>
                    <button style={{ background: "#FEF3C7", color: "#FF9800", border: "none", borderRadius: 6, padding: "5px 9px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>⚠️</button>
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}

        {/* CONTENUS */}
        {section === "content" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>📝 Gestion des contenus</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Publications actives", value: "124 812", icon: "📝", action: "Voir tout" },
                { label: "Annonces marketplace", value: "18 430", icon: "🛍️", action: "Modérer" },
                { label: "Contenus signalés", value: "47", icon: "⚠️", action: "Traiter" },
                { label: "Pubs sponsorisées", value: "1 204", icon: "📢", action: "Gérer" },
              ].map((item, i) => (
                <div key={i} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: "var(--bp-primary)" }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginBottom: 8 }}>{item.label}</div>
                  <button style={{ background: "var(--fb-blue-light)", color: "var(--bp-primary)", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>{item.action}</button>
                </div>
              ))}
            </div>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Contenus récents à modérer</div>
            {["Publication signalée – Spam publicitaire", "Annonce suspecte – Électronique", "Commentaire haineux détecté", "Photo inappropriée signalée"].map((c, i) => (
              <div key={i} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, flex: 1 }}>⚠️ {c}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✓ Approuver</button>
                  <button style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>✗ Supprimer</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* EMPLOIS */}
        {section === "jobs" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>💼 Gestion des emplois & entreprises</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Offres actives", value: "4 289", icon: "💼" },
                { label: "Candidatures", value: "28 400", icon: "📋" },
                { label: "Entreprises inscrites", value: "1 840", icon: "🏢" },
                { label: "Recrutements réussis", value: "3 120", icon: "✅" },
              ].map((item, i) => (
                <div key={i} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: "var(--bp-primary)" }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{item.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Offres sponsorisées en attente</div>
            {[
              { title: "DG Commercial", company: "Groupe Ondoua", country: "🇬🇦 Gabon", budget: "45 000 FCFA" },
              { title: "Ingénieur DevOps", company: "TechHub Douala", country: "🇨🇲 Cameroun", budget: "80 000 FCFA" },
            ].map((job, i) => (
              <div key={i} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{job.company} · {job.country} · {job.budget}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Publier</button>
                  <button style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>Refuser</button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* SIGNALEMENTS */}
        {section === "reports" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>⚠️ Gestion des signalements</div>

            {/* Filter + sort bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {([
                ["all", "Tous"],
                ["pending", "En attente"],
                ["reviewed", "Examinés"],
                ["dismissed", "Ignorés"],
              ] as [ReportStatusFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => { setRptFilter(val); setRptPage(1); }}
                  style={{
                    padding: "5px 12px", borderRadius: 20, border: "1px solid var(--fb-border)",
                    background: rptFilter === val ? "var(--bp-primary)" : "var(--fb-white)",
                    color: rptFilter === val ? "#fff" : "var(--fb-text)",
                    fontSize: 13, cursor: "pointer", fontWeight: 600,
                  }}
                >{label}</button>
              ))}
              <button
                onClick={() => { setRptSort(s => s === "desc" ? "asc" : "desc"); setRptPage(1); }}
                style={{
                  marginLeft: "auto", padding: "5px 12px", borderRadius: 20,
                  border: "1px solid var(--fb-border)", background: "var(--fb-white)",
                  color: "var(--fb-text)", fontSize: 13, cursor: "pointer", fontWeight: 600,
                }}
              >{rptSort === "desc" ? "⬇ Plus récents" : "⬆ Plus anciens"}</button>
            </div>

            {/* Total count */}
            {!rptLoading && (
              <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginBottom: 12 }}>
                {rptTotal} signalement{rptTotal !== 1 ? "s" : ""} au total
              </div>
            )}

            {rptError && (
              <div style={{ background: "#FEE2E2", color: "#EF4444", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                ⚠️ {rptError}
              </div>
            )}

            {rptLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--fb-text-secondary)", fontSize: 14 }}>Chargement…</div>
            ) : reports.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--fb-text-secondary)", fontSize: 14 }}>
                Aucun signalement trouvé
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {reports.map(r => {
                  const statusMeta: Record<string, { bg: string; color: string; label: string }> = {
                    pending:   { bg: "#FEE2E2", color: "#EF4444", label: "En attente" },
                    reviewed:  { bg: "#DCFCE7", color: "var(--bp-primary-dark)", label: "Examiné" },
                    dismissed: { bg: "#F1F5F9", color: "#9CA3AF", label: "Ignoré" },
                  };
                  const sm = statusMeta[r.status] ?? statusMeta.pending;
                  const reporterName = `${r.reporter.firstName} ${r.reporter.lastName}`.trim();
                  const reportedName = `${r.reported.firstName} ${r.reported.lastName}`.trim();
                  const date = new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                  const isBusy = rptActing === r.id;

                  return (
                    <div key={r.id} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>⚠️ Signalement #{r.id}</div>
                        <span style={{ background: sm.bg, color: sm.color, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, flexShrink: 0 }}>
                          {sm.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: "var(--fb-text-secondary)" }}>Raison : </span>
                        <strong>{r.reason}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginBottom: 10 }}>
                        Signalé par <strong>{reporterName}</strong> contre <strong>{reportedName}</strong>
                        <br />Le {date}
                      </div>
                      {r.status === "pending" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleReportAction(r.id, "reviewed")}
                            disabled={isBusy}
                            style={{ flex: 1, background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 6, padding: "7px", fontSize: 13, cursor: isBusy ? "not-allowed" : "pointer", fontWeight: 700, opacity: isBusy ? 0.6 : 1 }}
                          >
                            ✓ Marquer examiné
                          </button>
                          <button
                            onClick={() => handleReportAction(r.id, "dismissed")}
                            disabled={isBusy}
                            style={{ flex: 1, background: "#9CA3AF", color: "#fff", border: "none", borderRadius: 6, padding: "7px", fontSize: 13, cursor: isBusy ? "not-allowed" : "pointer", fontWeight: 700, opacity: isBusy ? 0.6 : 1 }}
                          >
                            ✗ Ignorer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {rptTotalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
                <button
                  onClick={() => setRptPage(p => Math.max(1, p - 1))}
                  disabled={rptPage <= 1}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-white)", cursor: rptPage <= 1 ? "not-allowed" : "pointer", fontSize: 13, opacity: rptPage <= 1 ? 0.4 : 1 }}
                >← Préc.</button>
                <span style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>
                  Page {rptPage} / {rptTotalPages}
                </span>
                <button
                  onClick={() => setRptPage(p => Math.min(rptTotalPages, p + 1))}
                  disabled={rptPage >= rptTotalPages}
                  style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-white)", cursor: rptPage >= rptTotalPages ? "not-allowed" : "pointer", fontSize: 13, opacity: rptPage >= rptTotalPages ? 0.4 : 1 }}
                >Suiv. →</button>
              </div>
            )}
          </>
        )}

        {/* MONÉTISATION */}
        {section === "monetization" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>💳 Revenus & Monétisation</div>
            <div style={{ background: "linear-gradient(135deg, var(--bp-primary), #9C27B0)", borderRadius: 16, padding: "20px", color: "#fff", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Revenus du mois (juin 2026)</div>
              <div style={{ fontSize: 40, fontWeight: 900, margin: "8px 0" }}>18 240 000 <span style={{ fontSize: 20 }}>FCFA</span></div>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12, fontSize: 13 }}>
                <div><div style={{ fontWeight: 700 }}>+24%</div><div style={{ opacity: 0.8 }}>vs mai</div></div>
                <div><div style={{ fontWeight: 700 }}>14 pays</div><div style={{ opacity: 0.8 }}>actifs</div></div>
              </div>
            </div>
            {[
              { label: "Comptes Premium actifs", value: "8 420", icon: "⭐", revenue: "4 210 000 FCFA" },
              { label: "Publications sponsorisées", value: "1 204", icon: "📢", revenue: "7 824 000 FCFA" },
              { label: "Offres d'emploi sponsorisées", value: "312", icon: "💼", revenue: "3 120 000 FCFA" },
              { label: "Badges vérifiés vendus", value: "890", icon: "✅", revenue: "2 225 000 FCFA" },
              { label: "Boutiques Premium", value: "156", icon: "🏪", revenue: "780 000 FCFA" },
              { label: "Publicités entreprises", value: "84", icon: "🏢", revenue: "84 000 FCFA" },
            ].map((item, i) => (
              <div key={i} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: "14px", marginBottom: 8, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ fontSize: 28, width: 48, height: 48, background: "var(--fb-blue-light)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>{item.value} actifs</div>
                </div>
                <div style={{ fontWeight: 900, color: "var(--bp-primary)", fontSize: 14, textAlign: "right" }}>{item.revenue}</div>
              </div>
            ))}
          </>
        )}

        {/* RETRAITS */}
        {section === "withdrawals" && (() => {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          const allPending = withdrawals.filter(w => w.status === "pending");
          const pendingCount = allPending.length;
          const pendingXof = allPending.reduce((s, w) => s + w.xofAmount, 0);

          const paidThisMonthXof = withdrawals
            .filter(w => {
              if (w.status !== "paid") return false;
              const d = new Date(w.createdAt);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((s, w) => s + w.xofAmount, 0);

          return (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>💸 Retraits créateurs</div>

            {/* Summary card */}
            {!wdLoading && (
              <div style={{
                background: "linear-gradient(135deg, var(--bp-primary) 0%, #0EA5E9 100%)",
                borderRadius: 14,
                padding: "16px 18px",
                marginBottom: 16,
                color: "#fff",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                textAlign: "center",
              }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{pendingCount}</div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>En attente</div>
                </div>
                <div style={{ borderLeft: "1px solid rgba(255,255,255,0.25)", borderRight: "1px solid rgba(255,255,255,0.25)", paddingLeft: 8, paddingRight: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.3 }}>{pendingXof.toLocaleString("fr-FR")}</div>
                  <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>XOF en attente</div>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.3 }}>{paidThisMonthXof.toLocaleString("fr-FR")}</div>
                  <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>XOF payés ce mois</div>
                </div>
              </div>
            )}

            {/* Status filter tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {([
                ["all", "Tous"],
                ["pending", "En attente"],
                ["validated", "Validés"],
                ["paid", "Payés"],
                ["rejected", "Rejetés"],
              ] as [WithdrawalStatus, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setWdFilter(val)}
                  style={{
                    padding: "5px 14px", borderRadius: 20, border: "1px solid var(--fb-border)",
                    background: wdFilter === val ? "var(--bp-primary)" : "var(--fb-white)",
                    color: wdFilter === val ? "#fff" : "var(--fb-text)",
                    fontSize: 13, cursor: "pointer", fontWeight: 600,
                  }}
                >{label}</button>
              ))}
            </div>

            {wdError && (
              <div style={{ background: "#FEE2E2", color: "#EF4444", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
                ⚠️ {wdError}
              </div>
            )}

            {wdLoading ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--fb-text-secondary)", fontSize: 14 }}>Chargement…</div>
            ) : withdrawals.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--fb-text-secondary)", fontSize: 14 }}>Aucun retrait trouvé</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {withdrawals.map(w => {
                  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                    pending:   { bg: "#FEF3C7", color: "#D97706", label: "En attente" },
                    validated: { bg: "#DCFCE7", color: "#1565C0", label: "Validé" },
                    paid:      { bg: "#DCFCE7", color: "var(--bp-primary-dark)", label: "Payé" },
                    rejected:  { bg: "#FEE2E2", color: "#EF4444", label: "Rejeté" },
                  };
                  const sc = statusColors[w.status] ?? statusColors.pending;
                  const operatorEmoji: Record<string, string> = { orange: "🟠", mtn: "🟡", wave: "🔵" };
                  const date = new Date(w.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
                  const isBusy = wdActing === w.id;

                  return (
                    <div key={w.id} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 14 }}>
                      {/* Header row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{w.creatorName || `Créateur #${w.creatorId}`}</div>
                          <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginTop: 2 }}>#{w.id} · {date}</div>
                        </div>
                        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, flexShrink: 0 }}>
                          {sc.label}
                        </span>
                      </div>

                      {/* Amount + operator row */}
                      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                        <div style={{ background: "var(--fb-bg)", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700 }}>
                          🪙 {w.tokensAmount.toLocaleString("fr-FR")} jetons
                        </div>
                        <div style={{ background: "var(--fb-bg)", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "var(--bp-primary-dark)" }}>
                          {w.xofAmount.toLocaleString("fr-FR")} XOF
                        </div>
                        <div style={{ background: "var(--fb-bg)", borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
                          {operatorEmoji[w.paymentMethod] ?? "📱"} {w.paymentMethod.toUpperCase()} · {w.paymentPhone}
                        </div>
                      </div>

                      {/* Admin note if present */}
                      {w.adminNote && (
                        <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginBottom: 8, fontStyle: "italic" }}>
                          Note : {w.adminNote}
                        </div>
                      )}

                      {/* Actions — only for actionable statuses */}
                      {w.status === "pending" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            disabled={isBusy}
                            onClick={() => handleWithdrawalAction(w.id, "validated")}
                            style={{ flex: 1, background: "#1565C0", color: "#fff", border: "none", borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer", fontWeight: 700, opacity: isBusy ? 0.6 : 1 }}
                          >
                            ✓ Valider
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => { setRejectModal({ id: w.id }); setRejectNote(""); }}
                            style={{ flex: 1, background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer", fontWeight: 700, opacity: isBusy ? 0.6 : 1 }}
                          >
                            ✗ Rejeter
                          </button>
                        </div>
                      )}
                      {w.status === "validated" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            disabled={isBusy}
                            onClick={() => handleWithdrawalAction(w.id, "paid")}
                            style={{ flex: 1, background: "var(--bp-primary-dark)", color: "#fff", border: "none", borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer", fontWeight: 700, opacity: isBusy ? 0.6 : 1 }}
                          >
                            💰 Marquer payé
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => { setRejectModal({ id: w.id }); setRejectNote(""); }}
                            style={{ flex: 1, background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer", fontWeight: 700, opacity: isBusy ? 0.6 : 1 }}
                          >
                            ✗ Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reject modal */}
            {rejectModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
                <div style={{ background: "var(--fb-white)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 380 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Rejeter le retrait</div>
                  <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginBottom: 14 }}>
                    Optionnel : expliquer la raison du rejet (visible par le créateur).
                  </div>
                  <textarea
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="Raison du rejet..."
                    rows={3}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid var(--fb-border)", padding: "8px 10px", fontSize: 14, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button
                      onClick={() => setRejectModal(null)}
                      style={{ flex: 1, background: "var(--fb-bg)", color: "var(--fb-text)", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer", fontWeight: 600 }}
                    >Annuler</button>
                    <button
                      onClick={async () => {
                        await handleWithdrawalAction(rejectModal.id, "rejected", rejectNote.trim() || undefined);
                        setRejectModal(null);
                      }}
                      style={{ flex: 1, background: "#EF4444", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 14, cursor: "pointer", fontWeight: 700 }}
                    >Confirmer le rejet</button>
                  </div>
                </div>
              </div>
            )}
          </>
          );
        })()}

        {/* SETTINGS */}
        {section === "settings" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>⚙️ Configuration plateforme</div>
            {[
              { emoji: "🌍", label: "Gestion des pays actifs", desc: "14 pays configurés" },
              { emoji: "💱", label: "Devises & taux de change", desc: "FCFA, GNF, CDF — synchronisé" },
              { emoji: "📱", label: "Mode économie de données", desc: "Activé par défaut" },
              { emoji: "🔔", label: "Paramètres de notification", desc: "Push, SMS, Email" },
              { emoji: "🔒", label: "Modération automatique", desc: "IA + équipe humaine" },
              { emoji: "📊", label: "Rapports hebdomadaires", desc: "Envoyés chaque lundi" },
              { emoji: "🎨", label: "Thèmes régionaux", desc: "Couleurs et langues par pays" },
            ].map((item, i) => (
              <div key={i} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: "13px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <div style={{ fontSize: 22, width: 40, height: 40, background: "var(--fb-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{item.desc}</div>
                </div>
                <span style={{ color: "var(--fb-text-secondary)", fontSize: 18 }}>›</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
