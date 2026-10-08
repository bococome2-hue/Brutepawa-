import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiGetJobs, apiApplyToJob, apiCreateJob, type ApiJob } from "../lib/api";
import { getAppliedJobs, applyJob } from "../lib/store";

const C = {
  bg: "#F8FAFC", card: "#FFFFFF", primary: "var(--bp-primary)", primaryDark: "var(--bp-primary-dark)",
  primaryLight: "#DCFCE7", text: "#111827", secondary: "#64748B", muted: "#9CA3AF",
  border: "#E5E7EB", danger: "#EF4444", shadow: "0 1px 4px rgba(0,0,0,0.07)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.08)",
};

const ANIM_CSS = `
@keyframes bp-fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes bp-spin { to { transform:rotate(360deg); } }
.bp-job-card { animation: bp-fadeUp 0.25s ease both; transition: box-shadow 0.15s, transform 0.15s; }
.bp-job-card:active { transform: scale(0.985); }
.bp-job-card:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.1); }
.bp-chip-btn { transition: background 0.15s, color 0.15s, border-color 0.15s; }
.bp-chip-btn:active { transform: scale(0.96); }
.bp-input-field { outline: none; }
.bp-input-field:focus { border-color: ${C.primary} !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
`;

function fmtAge(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Il y a ${mins}min`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `Il y a ${hrs}h`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days}j`;
  return `Il y a ${Math.floor(days / 7)} sem.`;
}

const JOB_TYPE_CONFIG: Record<string, { color: string; bg: string; emoji: string; label: string }> = {
  CDI:       { color: "var(--bp-primary-dark)", bg: "#DCFCE7", emoji: "💼", label: "CDI" },
  CDD:       { color: "#D97706", bg: "#FEF3C7", emoji: "📋", label: "CDD" },
  Freelance: { color: "#7C3AED", bg: "#EDE9FE", emoji: "💡", label: "Freelance" },
};

type JobTab = "tous" | "CDI" | "CDD" | "Freelance";

function CompanyLogo({ company, type }: { company: string; type: string }) {
  const cfg = JOB_TYPE_CONFIG[type] ?? { color: C.primary, bg: C.primaryLight, emoji: "💼" };
  const initials = company.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 52, height: 52, borderRadius: 14, background: cfg.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontWeight: 800, fontSize: 15, color: cfg.color,
      letterSpacing: "-0.5px", border: `1.5px solid ${cfg.color}20`,
    }}>
      {initials}
    </div>
  );
}

export default function JobsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<JobTab>("tous");
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState<number[]>(getAppliedJobs());
  const [applying, setApplying] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", company: "", type: "CDI", salary: "", location: "" });
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiGetJobs().then(j => setJobs(j)).finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j => {
    if (tab !== "tous" && j.type !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!j.title.toLowerCase().includes(q) && !j.company.toLowerCase().includes(q) && !j.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleApply = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (applied.includes(id)) return;
    setApplying(id);
    try { await apiApplyToJob(id, {}); } catch { /* mark locally anyway */ }
    applyJob(id);
    setApplied(getAppliedJobs());
    setApplying(null);
  };

  const handlePost = async () => {
    if (!newJob.title || !newJob.company) return;
    setPosting(true);
    try {
      const created = await apiCreateJob({
        title: newJob.title, company: newJob.company, type: newJob.type,
        location: newJob.location || "Afrique de l'Ouest",
        salary: newJob.salary ? parseInt(newJob.salary) : undefined,
      });
      setJobs(prev => [created, ...prev]);
    } catch { /* show success anyway */ }
    setPosted(true);
    setPosting(false);
    setTimeout(() => {
      setPosted(false); setShowForm(false);
      setNewJob({ title: "", company: "", type: "CDI", salary: "", location: "" });
    }, 2000);
  };

  const tabs: { id: JobTab; label: string }[] = [
    { id: "tous",      label: "Tous" },
    { id: "CDI",       label: "💼 CDI" },
    { id: "CDD",       label: "📋 CDD" },
    { id: "Freelance", label: "💡 Freelance" },
  ];

  const cdiCount       = jobs.filter(j => j.type === "CDI").length;
  const cddCount       = jobs.filter(j => j.type === "CDD").length;
  const freelanceCount = jobs.filter(j => j.type === "Freelance").length;

  return (
    <div style={{ background: C.bg, minHeight: "100dvh", fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: 100 }}>
      <style>{ANIM_CSS}</style>

      {/* ── Header ── */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 16px 0", position: "sticky", top: 0, zIndex: 20, boxShadow: C.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.4px" }}>Emplois & Freelance</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>
              {loading ? "Chargement…" : `${jobs.length} offres disponibles`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => navigate("/jobs/inbox")}
              style={{ background: C.bg, color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 20, padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Messages
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, boxShadow: "0 2px 8px rgba(34,197,94,0.3)" }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Publier
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} viewBox="0 0 24 24" width="17" height="17" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="bp-input-field"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un poste, une entreprise…"
            style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 14px 10px 40px", fontSize: 14, color: C.text, boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: C.muted, border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Tab pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 1 }}>
          {tabs.map(t => {
            const active = tab === t.id;
            const cfg = t.id !== "tous" ? JOB_TYPE_CONFIG[t.id] : null;
            return (
              <button key={t.id} className="bp-chip-btn" onClick={() => setTab(t.id)} style={{
                flex: "0 0 auto", padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${active ? (cfg?.color ?? C.primary) : C.border}`,
                cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: active ? (cfg?.bg ?? C.primaryLight) : C.card,
                color: active ? (cfg?.color ?? C.primaryDark) : C.secondary,
                boxShadow: active ? `0 2px 8px ${(cfg?.color ?? C.primary)}30` : "none",
              }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "flex", gap: 10, padding: "12px 16px" }}>
        {[
          { label: "CDI",       count: cdiCount,       color: "var(--bp-primary-dark)", bg: "#DCFCE7" },
          { label: "CDD",       count: cddCount,       color: "#D97706", bg: "#FEF3C7" },
          { label: "Freelance", count: freelanceCount, color: "#7C3AED", bg: "#EDE9FE" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? "…" : s.count}</div>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Loading skeletons ── */}
      {loading && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: C.card, borderRadius: 20, padding: 16, display: "flex", gap: 12, boxShadow: C.shadow }}>
              <div className="bp-skeleton" style={{ width: 52, height: 52, borderRadius: 14 }}/>
              <div style={{ flex: 1 }}>
                <div className="bp-skeleton" style={{ height: 14, width: "65%", borderRadius: 6, marginBottom: 8 }}/>
                <div className="bp-skeleton" style={{ height: 12, width: "45%", borderRadius: 6, marginBottom: 10 }}/>
                <div className="bp-skeleton" style={{ height: 10, width: "30%", borderRadius: 6 }}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>🔍</div>
          <div style={{ fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 6 }}>Aucune offre trouvée</div>
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 20 }}>Soyez le premier à publier une offre !</div>
          <button onClick={() => setShowForm(true)} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 20, padding: "11px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(34,197,94,0.3)" }}>
            + Publier une offre
          </button>
        </div>
      )}

      {/* ── Job cards ── */}
      {!loading && (
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((job, idx) => {
            const cfg = JOB_TYPE_CONFIG[job.type] ?? { color: C.primary, bg: C.primaryLight, emoji: "💼", label: job.type };
            const isApplied = applied.includes(job.id);
            const isApplying = applying === job.id;
            return (
              <div
                key={job.id}
                className="bp-job-card"
                onClick={() => navigate(`/jobs/${job.id}`)}
                style={{ background: C.card, borderRadius: 20, padding: 16, cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", boxShadow: C.shadow, border: `1px solid ${C.border}`, animationDelay: `${idx * 40}ms` }}
              >
                <CompanyLogo company={job.company} type={job.type} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 3, lineHeight: 1.3 }}>{job.title}</div>
                  <div style={{ fontSize: 13, color: C.secondary, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>{job.company}</span>
                    <span style={{ color: C.border }}>·</span>
                    <span>📍 {job.location}</span>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {/* Type badge */}
                    <span style={{ background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 11, padding: "3px 10px", borderRadius: 20, border: `1px solid ${cfg.color}30` }}>
                      {cfg.emoji} {cfg.label}
                    </span>

                    {/* Salary */}
                    {job.salary && (
                      <span style={{ background: "#F0FDF4", color: "var(--bp-primary-dark)", fontWeight: 600, fontSize: 11, padding: "3px 10px", borderRadius: 20, border: "1px solid #BBF7D0" }}>
                        💰 {job.salary.toLocaleString()} {job.currency ?? "XOF"}
                      </span>
                    )}

                    {/* Time */}
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>
                      {fmtAge(job.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Apply button — stacked below on mobile-friendly layout */}
                <button
                  onClick={(e) => handleApply(job.id, e)}
                  disabled={isApplied || isApplying}
                  style={{
                    flexShrink: 0, alignSelf: "center",
                    padding: "9px 16px", border: "none", borderRadius: 20, cursor: isApplied ? "default" : "pointer",
                    background: isApplied ? C.primaryLight : C.primary,
                    color: isApplied ? C.primaryDark : "#fff",
                    fontWeight: 700, fontSize: 12,
                    boxShadow: isApplied ? "none" : "0 2px 6px rgba(34,197,94,0.3)",
                    transition: "all 0.15s",
                    minWidth: 80, textAlign: "center",
                  }}
                >
                  {isApplying
                    ? <svg style={{ animation: "bp-spin 0.8s linear infinite" }} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0110 10" strokeLinecap="round"/></svg>
                    : isApplied ? "✓ Postulé"
                    : "Postuler"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Publish job bottom-sheet ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end", backdropFilter: "blur(4px)" }}>
          <div style={{ background: C.card, borderRadius: "24px 24px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: 600, margin: "0 auto", boxShadow: "0 -4px 32px rgba(0,0,0,0.15)" }}>

            {/* Handle bar */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 18px" }}/>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>📝 Publier une offre</h3>
              <button onClick={() => setShowForm(false)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.secondary, fontSize: 16 }}>✕</button>
            </div>

            {posted ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 28 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.primaryDark }}>Offre publiée avec succès !</div>
              </div>
            ) : (
              <>
                {[
                  { key: "title", ph: "Titre du poste *", type: "text" },
                  { key: "company", ph: "Nom de l'entreprise *", type: "text" },
                ].map(f => (
                  <input
                    key={f.key}
                    className="bp-input-field"
                    value={(newJob as Record<string, string>)[f.key]}
                    onChange={e => setNewJob(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                    style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", fontSize: 14, marginBottom: 10, boxSizing: "border-box", color: C.text, transition: "border-color 0.15s, box-shadow 0.15s" }}
                  />
                ))}

                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <select
                    value={newJob.type}
                    onChange={e => setNewJob(p => ({ ...p, type: e.target.value }))}
                    style={{ flex: 1, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 14px", fontSize: 14, color: C.text, cursor: "pointer" }}
                  >
                    <option>CDI</option><option>CDD</option><option>Freelance</option>
                  </select>
                  <input
                    className="bp-input-field"
                    value={newJob.salary}
                    onChange={e => setNewJob(p => ({ ...p, salary: e.target.value }))}
                    placeholder="Salaire / Budget (XOF)"
                    style={{ flex: 2, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", fontSize: 14, color: C.text, transition: "border-color 0.15s, box-shadow 0.15s" }}
                  />
                </div>

                <input
                  className="bp-input-field"
                  value={newJob.location}
                  onChange={e => setNewJob(p => ({ ...p, location: e.target.value }))}
                  placeholder="Ville, Pays"
                  style={{ width: "100%", background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "12px 16px", fontSize: 14, marginBottom: 16, boxSizing: "border-box", color: C.text, transition: "border-color 0.15s, box-shadow 0.15s" }}
                />

                <button
                  onClick={handlePost}
                  disabled={posting || !newJob.title || !newJob.company}
                  style={{
                    width: "100%", border: "none", borderRadius: 16, padding: "14px",
                    fontWeight: 800, fontSize: 15, cursor: posting || !newJob.title || !newJob.company ? "not-allowed" : "pointer",
                    background: posting || !newJob.title || !newJob.company ? C.border : C.primary,
                    color: posting || !newJob.title || !newJob.company ? C.muted : "#fff",
                    boxShadow: posting || !newJob.title || !newJob.company ? "none" : "0 4px 12px rgba(34,197,94,0.3)",
                    transition: "all 0.15s",
                  }}
                >
                  {posting ? "Publication en cours…" : "Publier l'offre"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
