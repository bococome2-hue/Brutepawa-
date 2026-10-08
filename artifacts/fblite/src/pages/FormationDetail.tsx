import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiGetCourse, apiGetEnrollments, apiEnrollCourse, apiUpdateEnrollmentProgress, type ApiCourse, type ApiLesson, type ApiEnrollment } from "../lib/api";

interface Props { id: number; }

const CATEGORY_EMOJI: Record<string, string> = {
  "Tech": "💻", "Business": "💼", "Marketing": "📈", "Finance": "💰",
  "Design": "🎨", "Santé": "🏥", "Droit": "⚖️", "Langue": "🌐",
  "Développement personnel": "🧠", "Agriculture": "🌾", "Mode": "👗",
};

export default function FormationDetail({ id }: Props) {
  const navigate = useNavigate();
  const [course, setCourse] = useState<(ApiCourse & { lessons: ApiLesson[] }) | null>(null);
  const [enrollment, setEnrollment] = useState<ApiEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeLesson, setActiveLesson] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([apiGetCourse(id), apiGetEnrollments()]).then(([c, enrs]) => {
      setCourse(c);
      if (c) setEnrollment(enrs.find(e => e.courseId === c.id) ?? null);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 40 }}>⏳</div>
      <div style={{ marginTop: 12, color: "var(--fb-text-secondary)" }}>Chargement…</div>
    </div>
  );

  if (!course) return (
    <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 40 }}>❌</div>
      <div style={{ marginTop: 12, fontWeight: 700 }}>Formation introuvable</div>
      <button onClick={() => navigate("/formations")} style={{ marginTop: 16, background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 20, padding: "10px 24px", cursor: "pointer", fontWeight: 700 }}>← Retour</button>
    </div>
  );

  const isEnrolled = !!enrollment;
  const progress = enrollment?.progress ?? 0;
  const syllabus = course.lessons.length > 0
    ? course.lessons.map(l => l.title)
    : ["Module 1", "Module 2", "Module 3", "Module 4", "Module 5", "Module 6"];
  const lessonsCompleted = Math.round((progress / 100) * syllabus.length);
  const emoji = CATEGORY_EMOJI[course.category] ?? "🎓";
  const fmtDuration = (m: number) => !m ? "N/A" : m >= 60 ? `${Math.round(m / 60)}h` : `${m}min`;
  const isFreeDisplay = course.isFree || !course.price || course.price === 0;
  const levelLabel: Record<string, string> = {
    "beginner": "Débutant", "intermediate": "Intermédiaire",
    "advanced": "Avancé", "all": "Tous niveaux"
  };
  const levelColor: Record<string, string> = {
    "Débutant": "var(--bp-primary)", "beginner": "var(--bp-primary)",
    "Intermédiaire": "#FF9800", "intermediate": "#FF9800",
    "Avancé": "#EF4444", "advanced": "#EF4444",
    "Tous niveaux": "var(--bp-primary)", "all": "var(--bp-primary)"
  };
  const level = levelLabel[course.level] ?? course.level;
  const lvlColor = levelColor[course.level] ?? "var(--bp-primary)";

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await apiEnrollCourse(course.id);
      const enrs = await apiGetEnrollments();
      setEnrollment(enrs.find(e => e.courseId === course.id) ?? null);
    } catch {
      const enrs = await apiGetEnrollments();
      setEnrollment(enrs.find(e => e.courseId === course.id) ?? null);
    }
    setEnrolling(false);
  };

  const handleContinue = async (lessonIdx: number) => {
    setActiveLesson(lessonIdx);
    const newProgress = Math.min(100, Math.round(((lessonIdx + 1) / syllabus.length) * 100));
    try { await apiUpdateEnrollmentProgress(course.id, newProgress); } catch { /* ignore */ }
    setEnrollment(prev => prev ? { ...prev, progress: newProgress } : null);
    setTimeout(() => setActiveLesson(null), 1500);
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 60, zIndex: 10, borderBottom: "1px solid var(--fb-divider)" }}>
        <button onClick={() => navigate("/formations")} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>Détail formation</div>
      </div>

      {/* Course hero */}
      <div style={{ background: "linear-gradient(135deg, var(--bp-primary), #0d47a1)", color: "#fff", padding: "24px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>{emoji}</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900 }}>{course.title}</h1>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          ⏱ {fmtDuration(course.duration)} · 👥 {course.enrollmentsCount.toLocaleString()} élèves
        </div>
      </div>

      {/* Price + Enroll */}
      <div style={{ background: "var(--fb-white)", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 26, color: isFreeDisplay ? "var(--bp-primary)" : "var(--bp-primary)" }}>
              {isFreeDisplay ? "🆓 Gratuit" : `${(course.price ?? 0).toLocaleString()} ${course.currency ?? "FCFA"}`}
            </div>
            <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>Accès à vie · Certificat inclus</div>
          </div>
          <span style={{ background: lvlColor + "20", color: lvlColor, fontWeight: 700, fontSize: 13, padding: "5px 14px", borderRadius: 20 }}>
            {level}
          </span>
        </div>

        {isEnrolled ? (
          <>
            <div style={{ background: "var(--fb-bg)", borderRadius: 10, height: 10, marginBottom: 6 }}>
              <div style={{ background: progress >= 100 ? "var(--bp-primary)" : "var(--bp-primary)", height: 10, borderRadius: 10, width: `${progress}%`, transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginBottom: 14 }}>
              {progress >= 100 ? "✅ Cours complété !" : `${progress}% complété · ${lessonsCompleted}/${syllabus.length} leçons`}
            </div>
            {progress < 100 && (
              <button onClick={() => void handleContinue(lessonsCompleted)} style={{
                width: "100%", background: "var(--bp-primary)", color: "#fff", border: "none",
                borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 16, cursor: "pointer"
              }}>▶ Continuer la formation</button>
            )}
          </>
        ) : (
          <button onClick={handleEnroll} disabled={enrolling} style={{
            width: "100%", background: enrolling ? "#ccc" : (isFreeDisplay ? "var(--bp-primary)" : "var(--bp-primary)"),
            color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 16, cursor: "pointer"
          }}>
            {enrolling ? "Inscription..." : isFreeDisplay ? "🎓 S'inscrire gratuitement" : `💳 S'inscrire — ${(course.price ?? 0).toLocaleString()} ${course.currency ?? "FCFA"}`}
          </button>
        )}
      </div>

      {/* What you'll learn */}
      <div style={{ background: "var(--fb-white)", marginTop: 4, padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🎯 Ce que vous apprendrez</div>
        {["Maîtriser les concepts fondamentaux", "Créer des projets concrets", "Développer une expertise reconnue", "Obtenir votre certificat officiel"].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 14 }}>
            <span style={{ color: "var(--bp-primary)", fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      {/* Syllabus */}
      <div style={{ background: "var(--fb-white)", marginTop: 4, padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>📚 Programme ({syllabus.length} modules)</div>
        <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginBottom: 14 }}>
          {lessonsCompleted}/{syllabus.length} modules complétés
        </div>
        {syllabus.map((lesson, i) => {
          const isCompleted = i < lessonsCompleted;
          const isCurrent = i === lessonsCompleted && isEnrolled;
          const isLoading = activeLesson === i;
          return (
            <div key={i} style={{
              display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--fb-divider)",
              alignItems: "center", cursor: (isCurrent && isEnrolled) ? "pointer" : "default"
            }} onClick={() => isCurrent && isEnrolled && !isLoading && void handleContinue(i)}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: isCompleted ? "#DCFCE7" : isCurrent ? "var(--bp-primary)" : "var(--fb-bg)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
              }}>
                {isLoading ? "⏳" : isCompleted ? "✅" : isCurrent ? "▶" : `${i + 1}`}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: isCompleted || isCurrent ? 700 : 500, fontSize: 14, color: isCompleted ? "var(--bp-primary)" : isCurrent ? "var(--bp-primary)" : "var(--fb-text)" }}>
                  Module {i + 1} : {lesson}
                </div>
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>
                  {isCompleted ? "Complété" : isCurrent ? "En cours · Cliquez pour continuer" : "Non démarré"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructor */}
      <div style={{ background: "var(--fb-white)", marginTop: 4, padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>👤 Instructeur</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--bp-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20 }}>
            🎓
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
              Formateur Certifié
              <span style={{ color: "var(--bp-primary)", fontSize: 14 }}>✔️</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>Expert {course.category}</div>
            <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>📍 Afrique de l'Ouest</div>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
