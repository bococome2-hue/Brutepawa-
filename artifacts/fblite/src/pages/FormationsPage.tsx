import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiGetCourses, apiGetEnrollments, apiEnrollCourse, apiUpdateEnrollmentProgress, type ApiCourse, type ApiEnrollment } from "../lib/api";

type Tab = "mes-cours" | "catalogue";

const CATEGORY_EMOJI: Record<string, string> = {
  "Tech": "💻", "Business": "💼", "Marketing": "📈", "Finance": "💰",
  "Design": "🎨", "Santé": "🏥", "Droit": "⚖️", "Langue": "🌐",
  "Développement personnel": "🧠", "Agriculture": "🌾", "Mode": "👗",
};
function courseEmoji(c: ApiCourse) { return CATEGORY_EMOJI[c.category] ?? "🎓"; }
function fmtDuration(mins: number) {
  if (!mins) return "N/A";
  return mins >= 60 ? `${Math.round(mins / 60)}h` : `${mins}min`;
}

type Tab2 = Tab;

export default function FormationsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab2>("mes-cours");
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([apiGetCourses(), apiGetEnrollments()]).then(([c, e]) => {
      setCourses(c);
      setEnrollments(e);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const enrolledIds = enrollments.map(e => e.courseId);
  const myCourses = courses.filter(c => enrolledIds.includes(c.id));
  const catalog = courses.filter(c =>
    !filter || c.title.toLowerCase().includes(filter.toLowerCase()) ||
    c.category.toLowerCase().includes(filter.toLowerCase())
  );

  const getProgress = (courseId: number) => {
    return enrollments.find(e => e.courseId === courseId)?.progress ?? 0;
  };

  const handleEnroll = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnrollingId(id);
    try { await apiEnrollCourse(id); } catch { /* may already be enrolled */ }
    const newEnrollments = await apiGetEnrollments();
    setEnrollments(newEnrollments);
    setEnrollingId(null);
    setTab("mes-cours");
  };

  const handleContinue = async (courseId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = getProgress(courseId);
    const next = Math.min(100, current + 10);
    try { await apiUpdateEnrollmentProgress(courseId, next); } catch { /* ignore */ }
    setEnrollments(prev => prev.map(en => en.courseId === courseId ? { ...en, progress: next } : en));
  };

  const levelColor: Record<string, string> = {
    "Débutant": "var(--bp-primary)", "beginner": "var(--bp-primary)",
    "Intermédiaire": "#FF9800", "intermediate": "#FF9800",
    "Avancé": "#EF4444", "advanced": "#EF4444",
    "Tous niveaux": "var(--bp-primary)", "all": "var(--bp-primary)"
  };
  const levelLabel: Record<string, string> = {
    "beginner": "Débutant", "intermediate": "Intermédiaire",
    "advanced": "Avancé", "all": "Tous niveaux"
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)" }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900 }}>🎓 Formations</h2>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--fb-bg)", borderRadius: 12, padding: 4 }}>
          {([["mes-cours", "📚 Mes cours"], ["catalogue", "🔍 Catalogue"]] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: tab === id ? "var(--fb-white)" : "transparent",
              color: tab === id ? "var(--bp-primary)" : "var(--fb-text-secondary)",
              boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none"
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: "var(--bp-primary)", color: "#fff", padding: "10px 16px", display: "flex", gap: 24, fontSize: 13 }}>
        <span><strong>{loading ? "…" : myCourses.length}</strong> cours en cours</span>
        <span><strong>{myCourses.filter(c => getProgress(c.id) === 100).length}</strong> complétés</span>
        <span><strong>{courses.length}</strong> dispo</span>
      </div>

      {tab === "mes-cours" && (
        <div style={{ padding: "8px 0" }}>
          {myCourses.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--fb-text-secondary)" }}>
              <div style={{ fontSize: 48 }}>🎓</div>
              <div style={{ fontWeight: 700, marginTop: 8 }}>Aucun cours en cours</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Parcourez le catalogue pour vous inscrire</div>
              <button onClick={() => setTab("catalogue")} style={{ marginTop: 16, background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 20, padding: "10px 24px", fontWeight: 700, cursor: "pointer" }}>
                Voir le catalogue
              </button>
            </div>
          )}
          {myCourses.map(course => {
            const progress = getProgress(course.id);
            const isComplete = progress >= 100;
            return (
              <div key={course.id} onClick={() => navigate(`/formations/${course.id}`)} style={{
                background: "var(--fb-white)", margin: "0 0 4px", padding: "14px 16px", cursor: "pointer"
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 52, height: 52, background: "var(--fb-bg)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
                    {courseEmoji(course)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{course.title}</div>
                    <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginBottom: 8 }}>⏱ {fmtDuration(course.duration)}</div>
                    <div style={{ background: "var(--fb-bg)", borderRadius: 10, height: 8, marginBottom: 4 }}>
                      <div style={{ background: isComplete ? "var(--bp-primary)" : "var(--bp-primary)", height: 8, borderRadius: 10, width: `${progress}%`, transition: "width 0.5s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: isComplete ? "var(--bp-primary)" : "var(--fb-text-secondary)", fontWeight: isComplete ? 700 : 400 }}>
                        {isComplete ? "✅ Complété !" : `${progress}% complété`}
                      </span>
                      {!isComplete && (
                        <button onClick={(e) => handleContinue(course.id, e)} style={{
                          background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 12, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                        }}>▶ Continuer</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "catalogue" && (
        <div>
          <div style={{ padding: "12px 16px", background: "var(--fb-white)", borderBottom: "1px solid var(--fb-divider)" }}>
            <div className="bp-search">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Rechercher une formation..."
              />
            </div>
          </div>
          <div style={{ padding: "8px 0" }}>
            {catalog.map(course => {
              const isEnrolled = enrolledIds.includes(course.id);
              return (
                <div key={course.id} onClick={() => navigate(`/formations/${course.id}`)} style={{
                  background: "var(--fb-white)", margin: "0 0 4px", padding: "14px 16px", cursor: "pointer"
                }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 56, height: 56, background: "var(--fb-bg)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
                      {courseEmoji(course)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>{course.title}</div>
                      <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginBottom: 6 }}>⏱ {fmtDuration(course.duration)} · 👥 {course.enrollmentsCount.toLocaleString()} élèves</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ background: (levelColor[course.level] ?? "var(--bp-primary)") + "20", color: levelColor[course.level] ?? "var(--bp-primary)", fontWeight: 700, fontSize: 11, padding: "2px 10px", borderRadius: 12 }}>
                          {levelLabel[course.level] ?? course.level}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: (course.isFree || !course.price) ? "var(--bp-primary)" : "var(--fb-text)" }}>
                          {(course.isFree || !course.price) ? "🆓 Gratuit" : `${(course.price ?? 0).toLocaleString()} ${course.currency ?? "FCFA"}`}
                        </span>
                        <button
                          onClick={(e) => !isEnrolled && handleEnroll(course.id, e)}
                          disabled={isEnrolled}
                          style={{
                            marginLeft: "auto", padding: "6px 14px", border: "none", borderRadius: 16, cursor: isEnrolled ? "default" : "pointer",
                            background: isEnrolled ? "#DCFCE7" : "var(--bp-primary)", color: isEnrolled ? "var(--bp-primary)" : "#fff",
                            fontWeight: 700, fontSize: 12
                          }}
                        >
                          {enrollingId === course.id ? "..." : isEnrolled ? "✓ Inscrit" : "S'inscrire"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
