import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiGetJob, apiGetJobs, apiApplyToJob, type ApiJob } from "../lib/api";
import { getAppliedJobs, applyJob } from "../lib/store";

interface Props { id: number; }

const TYPE_EMOJI: Record<string, string> = { CDI: "💼", CDD: "📋", Freelance: "💡" };

function fmtAge(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return `Il y a ${Math.min(days, 30)} jours`;
}

export default function JobDetail({ id }: Props) {
  const navigate = useNavigate();
  const [job, setJob] = useState<ApiJob | null>(null);
  const [similar, setSimilar] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(getAppliedJobs().includes(id));
  const [showForm, setShowForm] = useState(false);
  const [cv, setCv] = useState("");
  const [letter, setLetter] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([apiGetJob(id), apiGetJobs()]).then(([j, all]) => {
      setJob(j);
      if (j) {
        setLetter(`Madame, Monsieur,\n\nJe vous soumets ma candidature pour le poste de ${j.title} au sein de ${j.company}. Très motivé(e) par cette opportunité, je suis convaincu(e) de pouvoir apporter une contribution significative à votre équipe.\n\nCordialement.`);
        setSimilar(all.filter(x => x.type === j.type && x.id !== j.id).slice(0, 3));
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const typeColor: Record<string, string> = { CDI: "var(--bp-primary)", CDD: "#FF9800", Freelance: "#9C27B0" };

  const handleApply = async () => {
    if (!job) return;
    setSending(true);
    try { await apiApplyToJob(job.id, { coverLetter: letter, cvUrl: cv || undefined }); } catch { /* mark locally */ }
    applyJob(job.id);
    setApplied(true);
    setSending(false);
    setDone(true);
    setTimeout(() => { setDone(false); setShowForm(false); }, 3000);
  };

  if (loading) return (
    <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 40 }}>⏳</div>
      <div style={{ marginTop: 12, color: "var(--fb-text-secondary)" }}>Chargement…</div>
    </div>
  );

  if (!job) return (
    <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 40 }}>❌</div>
      <div style={{ marginTop: 12, fontWeight: 700 }}>Offre introuvable</div>
      <button onClick={() => navigate("/jobs")} style={{ marginTop: 16, background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 20, padding: "10px 24px", cursor: "pointer", fontWeight: 700 }}>← Retour</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 60, zIndex: 10, borderBottom: "1px solid var(--fb-divider)" }}>
        <button onClick={() => navigate("/jobs")} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>Offre d'emploi</div>
      </div>

      {/* Job hero */}
      <div style={{ background: "var(--fb-white)", padding: "20px 16px" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ width: 64, height: 64, background: "var(--fb-bg)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, flexShrink: 0 }}>
            {TYPE_EMOJI[job.type] ?? "💼"}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: 19, fontWeight: 900 }}>{job.title}</h1>
            <div style={{ fontSize: 14, color: "var(--fb-text-secondary)", marginBottom: 6 }}>🏢 {job.company}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ background: (typeColor[job.type] ?? "#9CA3AF") + "20", color: typeColor[job.type] ?? "#9CA3AF", fontWeight: 700, fontSize: 12, padding: "3px 12px", borderRadius: 12 }}>
                {job.type}
              </span>
              <span style={{ background: "var(--fb-bg)", fontSize: 12, padding: "3px 12px", borderRadius: 12, fontWeight: 600 }}>
                📍 {job.location}
              </span>
              <span style={{ background: "var(--fb-bg)", fontSize: 12, padding: "3px 12px", borderRadius: 12, fontWeight: 600 }}>
                {fmtAge(job.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Salary highlight */}
        <div style={{ background: "linear-gradient(135deg, var(--bp-primary), #0EA5E9)", color: "#fff", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 2 }}>💰 Rémunération</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>
            {job.salary ? `${job.salary.toLocaleString()} ${job.currency}` : "Non spécifié"}
          </div>
        </div>

        {/* Apply button */}
        {applied ? (
          <div style={{ background: "#DCFCE7", color: "var(--bp-primary-dark)", borderRadius: 12, padding: "14px", textAlign: "center", fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
            ✅ Vous avez postulé à cette offre
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} style={{
            width: "100%", background: "var(--bp-primary)", color: "#fff", border: "none",
            borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 16, cursor: "pointer", marginBottom: 10
          }}>
            📨 Postuler maintenant
          </button>
        )}
        <button
          onClick={() => {
            const enc = job ? encodeURIComponent(job.title + " — " + job.company) : "";
            navigate(`/jobs/inbox${job ? `?jobTitle=${enc}` : ""}`);
          }}
          style={{ width: "100%", background: "var(--theme-surface)", color: "var(--bp-primary)", border: "2px solid var(--bp-primary)", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          💬 Contacter le recruteur
        </button>
      </div>

      {/* Job details */}
      <div style={{ background: "var(--fb-white)", marginTop: 4, padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📋 Description du poste</div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--fb-text)", marginBottom: 16 }}>
          {job.company} recherche un(e) <strong>{job.title}</strong> dans le cadre d'un contrat {job.type}.
          Le/la candidat(e) retenu(e) sera en charge de missions variées et stratégiques au sein de notre équipe basée à {job.location}.
          Nous cherchons un profil dynamique, créatif et passionné par son domaine.
        </div>

        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>🎯 Missions principales</div>
        {["Contribuer aux objectifs stratégiques de l'équipe",
          "Collaborer avec les différentes parties prenantes",
          "Produire des livrables de haute qualité",
          "Participer aux réunions hebdomadaires et rapports",
          "Proposer des améliorations continues du processus"].map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: "var(--bp-primary)", fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span>{m}</span>
          </div>
        ))}

        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, marginTop: 16 }}>📚 Profil recherché</div>
        {["Diplôme universitaire ou expérience équivalente",
          "Excellentes aptitudes communicationnelles",
          "Maîtrise des outils bureautiques",
          "Esprit d'initiative et sens des responsabilités",
          job.type === "Freelance" ? "Disponibilité immédiate" : "2+ ans d'expérience minimum"].map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: "var(--bp-primary)", fontWeight: 700, flexShrink: 0 }}>•</span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      {/* Company info */}
      <div style={{ background: "var(--fb-white)", marginTop: 4, padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🏢 À propos de {job.company}</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, background: "var(--fb-bg)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
            {TYPE_EMOJI[job.type] ?? "🏢"}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{job.company}</div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>📍 {job.location}</div>
          </div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--fb-text)" }}>
          {job.company} est une entreprise reconnue dans son secteur, opérant dans la région ({job.location}) et dans la sous-région.
          Rejoindre notre équipe, c'est intégrer un environnement stimulant, inclusif et porteur d'avenir.
        </div>
      </div>

      {/* Similar jobs */}
      {similar.length > 0 && (
        <div style={{ background: "var(--fb-white)", marginTop: 4, padding: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>💼 Offres similaires</div>
          {similar.map(j => (
            <div key={j.id} onClick={() => navigate(`/jobs/${j.id}`)} style={{
              display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--fb-divider)", cursor: "pointer"
            }}>
              <div style={{ fontSize: 28 }}>{TYPE_EMOJI[j.type] ?? "💼"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{j.title}</div>
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{j.company} · {j.location}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--bp-primary)" }}>
                  {j.salary ? `${j.salary.toLocaleString()} ${j.currency}` : "—"}
                </div>
              </div>
              <span style={{ background: (typeColor[j.type] ?? "#9CA3AF") + "20", color: typeColor[j.type] ?? "#9CA3AF", fontWeight: 700, fontSize: 11, padding: "2px 10px", borderRadius: 12, height: "fit-content" }}>
                {j.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Application modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "var(--fb-white)", borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxWidth: 600, margin: "0 auto", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17 }}>📨 Postuler — {job.title}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            {done ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--bp-primary)" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: 17, marginTop: 10 }}>Candidature envoyée !</div>
                <div style={{ fontSize: 14, color: "var(--fb-text-secondary)", marginTop: 6 }}>
                  {job.company} examinera votre dossier sous 48h
                </div>
              </div>
            ) : (
              <>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Lien vers votre CV (Google Drive, etc.)</label>
                <input value={cv} onChange={e => setCv(e.target.value)} placeholder="https://drive.google.com/..." style={{
                  width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 10,
                  padding: "11px 14px", fontSize: 14, marginBottom: 12, boxSizing: "border-box"
                }} />
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Lettre de motivation</label>
                <textarea value={letter} onChange={e => setLetter(e.target.value)} rows={8} style={{
                  width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 10,
                  padding: "11px 14px", fontSize: 13, lineHeight: 1.6, resize: "none", marginBottom: 16, boxSizing: "border-box"
                }} />
                <button onClick={handleApply} disabled={sending} style={{
                  width: "100%", background: sending ? "#ccc" : "var(--bp-primary)", color: "#fff",
                  border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer"
                }}>
                  {sending ? "Envoi en cours..." : "Envoyer ma candidature"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
