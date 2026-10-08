import React, { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { isAdmin, ADMIN_SECRET_PATH } from "../lib/admin";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { apiGetTontines, apiGetCourses, apiGetEnrollments, apiGetWallet, apiGetBlockedUsers, apiUnblockUser, apiGetConversations, apiGetFriendRequests, apiGetGroups, apiGetUserStats, clearBpToken, type ApiTontine, type ApiCourse, type ApiEnrollment, type BlockedUser } from "../lib/api";
import { BPFeed, BPMessages, BPAmis, BPGroupes, BPMarketplace, BPServices, BPEmplois, BPPages, BPPortefeuille, BPTontines, BPRevenus, BPPaiements, BPReels, BPLives, BPFormations, BPMonetisation, BPSocialHeader, BPBusinessHeader, BPFinanceHeader, BPCreateurHeader, BPPublier, BPReel, BPProduit, BPService, BPOffreEmploi, BPSearch, BPQR, BPBell } from "../components/BPIcons";

const SCORE_MAP: Record<string, { label: string; color: string; next: string; emoji: string; progress: number; bg: string }> = {
  bronze:  { label: "Bronze",  color: "#CD7F32", bg: "#FEF3C7", next: "Argent",  emoji: "🥉", progress: 45 },
  argent:  { label: "Argent",  color: "#9CA3AF", bg: "#F1F5F9", next: "Or",      emoji: "🥈", progress: 70 },
  or:      { label: "Or",      color: "#FBBF24", bg: "#FEF3C7", next: "Platine", emoji: "🏅", progress: 88 },
  platine: { label: "Platine", color: "#64748B", bg: "#F1F5F9", next: "Elite",   emoji: "💎", progress: 94 },
  elite:   { label: "Elite",   color: "#9C27B0", bg: "#EDE9FE", next: "Maximum", emoji: "⭐", progress: 100 },
};

type Section = "main" | "wallet" | "tontines" | "formations" | "emplois" | "boutiques" | "score" | "premium" | "settings" | "settings-privacy" | "settings-notifs" | "settings-lang" | "settings-appearance" | "settings-data" | "settings-verify" | "help" | "admin";

export default function Menu() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const userInitials = user.name ? user.name.slice(0, 2).toUpperCase() : "ME";

  const [activeSection, setActiveSection] = useState<Section>("main");
  const [tontines, setTontines] = useState<ApiTontine[]>([]);
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [wallet, setWallet] = useState<{ balance: number; currency: string } | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [blockedFetched, setBlockedFetched] = useState(false);

  const [userStats, setUserStats] = useState<{ postsCount: number; followersCount: number; followingCount: number } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);

  useEffect(() => {
    Promise.all([apiGetTontines(), apiGetCourses(), apiGetEnrollments(), apiGetWallet()]).then(([t, c, e, w]) => {
      setTontines(t);
      setCourses(c);
      setEnrollments(e);
      if (w) setWallet({ balance: w.balance, currency: w.currency });
    }).catch(() => {});

    if (user.id) {
      apiGetUserStats(Number(user.id)).then(setUserStats).catch(() => {});
    }
    apiGetConversations().then(convs => {
      setUnreadMessages(convs.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0));
    }).catch(() => {});
    apiGetFriendRequests().then(reqs => setPendingRequests(reqs.length)).catch(() => {});
    apiGetGroups().then(groups => setGroupsCount(groups.length)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeSection === "settings-privacy" && !blockedFetched && !blockedLoading) {
      setBlockedLoading(true);
      apiGetBlockedUsers().then(users => {
        setBlockedUsers(users);
        setBlockedFetched(true);
        setBlockedLoading(false);
      }).catch(() => {
        setBlockedFetched(true);
        setBlockedLoading(false);
      });
    }
  }, [activeSection, blockedFetched, blockedLoading]);

  const [isPremium, setIsPremium] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly"|"annual">("annual");

  // Settings state
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifJobs, setNotifJobs] = useState(true);
  const [notifTontines, setNotifTontines] = useState(true);
  const [dataSaver, setDataSaver] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLang, setSelectedLang] = useState("Français");
  const [selectedCountry, setSelectedCountry] = useState(user.country || "Côte d'Ivoire");
  const [profilePublic, setProfilePublic] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneSaved, setPhoneSaved] = useState(false);

  const score = SCORE_MAP["or"];

  const formatCount = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  };

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const logout = () => {
    clearBpToken();
    navigate("/login");
  };

  const Back = ({ label }: { label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <button onClick={() => setActiveSection("main")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{label}</div>
    </div>
  );

  if (activeSection === "wallet") return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Back label="💳 Mon Portefeuille" />
      <div style={{ background: "linear-gradient(135deg, var(--bp-primary), #0EA5E9)", borderRadius: 16, padding: "24px 20px", color: "#fff", marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Solde disponible</div>
        <div style={{ fontSize: 36, fontWeight: 900 }}>{(wallet?.balance ?? 0).toLocaleString()} <span style={{ fontSize: 18 }}>{wallet?.currency ?? "FCFA"}</span></div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>Mis à jour il y a 2 min</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[["📲 Dépôt", "MTN/Orange/Moov"], ["💸 Transfert", "P2P instantané"], ["🧾 Historique", "Transactions"], ["📊 Statistiques", "Revenus/Dépenses"]].map(([label, sub]) => (
          <button key={label} style={{ background: "var(--fb-white)", border: "1px solid var(--fb-divider)", borderRadius: 10, padding: "14px", cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginTop: 2 }}>{sub}</div>
          </button>
        ))}
      </div>
      <div style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Transactions récentes</div>
        {[
          { desc: "Transfert reçu – Aminata", amount: "+25 000", date: "Hier", icon: "↙️", color: "var(--bp-primary)" },
          { desc: "Achat marketplace", amount: "-15 000", date: "3 juin", icon: "🛍️", color: "#EF4444" },
          { desc: "Cotisation tontine", amount: "-50 000", date: "1er juin", icon: "💰", color: "#EF4444" },
          { desc: "Vente article", amount: "+35 000", date: "28 mai", icon: "🏷️", color: "var(--bp-primary)" },
        ].map((tx, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 3 ? "1px solid var(--fb-divider)" : "none" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 24 }}>{tx.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{tx.desc}</div>
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>{tx.date}</div>
              </div>
            </div>
            <div style={{ fontWeight: 700, color: tx.color }}>{tx.amount} FCFA</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (activeSection === "tontines") return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Back label="💰 Mes Tontines" />
      <button className="btn-primary" style={{ marginBottom: 16 }}>+ Créer une nouvelle tontine</button>
      {tontines.map(t => (
        <div key={t.id} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 32, width: 50, height: 50, background: "var(--fb-bg)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>💰</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
              <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>{t.membersCount} membres · {t.cycle}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div style={{ background: "var(--fb-bg)", borderRadius: 8, padding: 10, textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "var(--bp-primary)", fontSize: 16 }}>{t.contributionAmount.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "var(--fb-text-secondary)" }}>{t.currency}/{t.cycle}</div>
            </div>
            <div style={{ background: "var(--fb-bg)", borderRadius: 8, padding: 10, textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "var(--bp-primary)", fontSize: 16 }}>{t.status}</div>
              <div style={{ fontSize: 11, color: "var(--fb-text-secondary)" }}>statut</div>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--fb-text-secondary)" }}>
            📅 Prochaine échéance : <strong>{t.nextContributionDate ? new Date(t.nextContributionDate).toLocaleDateString('fr-FR') : "À définir"}</strong>
          </div>
          <button className="btn-primary" style={{ marginTop: 10, width: "100%", padding: 10 }}>💸 Payer ma cotisation</button>
        </div>
      ))}
    </div>
  );

  if (activeSection === "formations") return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Back label="🎓 Mes Formations" />
      <div style={{ fontWeight: 700, marginBottom: 12 }}>En cours</div>
      {courses.filter(c => enrollments.some(e => e.courseId === c.id)).map(course => {
        const cEmoji = ({"Tech":"💻","Business":"💼","Marketing":"📈","Finance":"💰","Design":"🎨","Santé":"🏥","Droit":"⚖️","Langue":"🌐","Développement personnel":"🧠","Agriculture":"🌾","Mode":"👗"} as Record<string, string>)[course.category] ?? "🎓";
        const cProg = enrollments.find(e => e.courseId === course.id)?.progress ?? 0;
        return (
          <div key={course.id} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ fontSize: 32, width: 50, height: 50, background: "var(--fb-bg)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{cEmoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{course.title}</div>
                <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>Par Formateur</div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: "var(--fb-text-secondary)" }}>Progression</span>
                    <span style={{ fontWeight: 700, color: "var(--bp-primary)" }}>{cProg}%</span>
                  </div>
                  <div style={{ background: "var(--fb-bg)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ background: "var(--bp-primary)", height: "100%", width: `${cProg}%`, borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                </div>
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop: 10, width: "100%", padding: 10 }}>▶ Continuer</button>
          </div>
        );
      })}
      <div style={{ fontWeight: 700, marginBottom: 12, marginTop: 8 }}>Recommandés</div>
      {courses.filter(c => !enrollments.some(e => e.courseId === c.id)).map(course => {
        const cEmoji = ({"Tech":"💻","Business":"💼","Marketing":"📈","Finance":"💰","Design":"🎨","Santé":"🏥","Droit":"⚖️","Langue":"🌐","Développement personnel":"🧠","Agriculture":"🌾","Mode":"👗"} as Record<string, string>)[course.category] ?? "🎓";
        const fmtD = (m: number) => !m ? "" : m >= 60 ? `${Math.round(m / 60)}h` : `${m}min`;
        return (
          <div key={course.id} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ fontSize: 32, width: 50, height: 50, background: "var(--fb-bg)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{cEmoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{course.title}</div>
                <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>Par Formateur · {fmtD(course.duration)}</div>
                <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>👥 {course.enrollmentsCount.toLocaleString()} apprenants</div>
                <div style={{ fontWeight: 700, color: (course.isFree || !course.price) ? "var(--bp-primary)" : "var(--bp-primary)", marginTop: 4 }}>
                  {(course.isFree || !course.price) ? "GRATUIT" : `${(course.price ?? 0).toLocaleString()} ${course.currency ?? "FCFA"}`}
                </div>
              </div>
            </div>
            <button className="btn-primary" style={{ marginTop: 10, width: "100%", padding: 10 }}>S'inscrire maintenant</button>
          </div>
        );
      })}
    </div>
  );

  if (activeSection === "score") return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Back label="🏅 Score de confiance" />
      <div style={{ background: `linear-gradient(135deg, ${score.color}44, ${score.bg})`, borderRadius: 16, padding: "24px 20px", textAlign: "center", marginBottom: 16, border: `2px solid ${score.color}` }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{score.emoji}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#333" }}>Niveau {score.label}</div>
        <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>Prochain niveau : {score.next}</div>
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.6)", borderRadius: 8, height: 10, overflow: "hidden" }}>
          <div style={{ background: score.color, height: "100%", width: `${score.progress}%`, borderRadius: 8 }} />
        </div>
        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{score.progress}% vers {score.next}</div>
      </div>

      <div style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Critères d'évaluation</div>
        {[
          { label: "Ancienneté du compte", value: 95, desc: "Compte créé il y a 2 ans" },
          { label: "Vérification téléphone", value: 100, desc: "✅ Téléphone vérifié" },
          { label: "Vérification identité", value: 80, desc: "Pièce d'identité soumise" },
          { label: "Activité du compte", value: 80, desc: "Très actif" },
          { label: "Avis reçus", value: 88, desc: "4.8/5 · 24 avis" },
          { label: "Transactions réussies", value: 92, desc: "48 transactions" },
          { label: "Fiabilité (délais)", value: 90, desc: "Livraisons à temps" },
          { label: "Signalements", value: 100, desc: "✅ Aucun signalement" },
        ].map(c => (
          <div key={c.label} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</span>
              <span style={{ fontSize: 13, color: "var(--bp-primary)", fontWeight: 700 }}>{c.value}%</span>
            </div>
            <div style={{ background: "var(--fb-bg)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{ background: "var(--bp-primary)", height: "100%", width: `${c.value}%`, borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--fb-text-secondary)", marginTop: 2 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Les 5 niveaux</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Bronze",  emoji: "🥉", color: "#CD7F32", desc: "Score 0–49" },
            { label: "Argent",  emoji: "🥈", color: "#9CA3AF", desc: "Score 50–69" },
            { label: "Or",      emoji: "🏅", color: "#FBBF24", desc: "Score 70–89", current: true },
            { label: "Platine", emoji: "💎", color: "#64748B", desc: "Score 90–95" },
            { label: "Elite",   emoji: "⭐", color: "#9C27B0", desc: "Score 96–100" },
          ].map(n => (
            <div key={n.label} style={{ background: n.current ? `${n.color}22` : "var(--fb-bg)", borderRadius: 8, padding: 10, textAlign: "center", border: n.current ? `2px solid ${n.color}` : "2px solid transparent" }}>
              <div style={{ fontSize: 24 }}>{n.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{n.label}</div>
              <div style={{ fontSize: 11, color: "var(--fb-text-secondary)" }}>{n.desc}</div>
              {n.current && <div style={{ fontSize: 10, color: n.color, fontWeight: 700, marginTop: 2 }}>← VOUS</div>}
            </div>
          ))}
          <div style={{ background: "linear-gradient(135deg, #EDE9FE, #EDE9FE)", borderRadius: 8, padding: 10, textAlign: "center", border: "2px solid #9C27B0" }}>
            <div style={{ fontSize: 24 }}>👑</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#9C27B0" }}>Elite Pro</div>
            <div style={{ fontSize: 11, color: "#8B5CF6" }}>Badge exclusif</div>
          </div>
        </div>
      </div>
    </div>
  );

  if (activeSection === "premium") {
    const BENEFITS = [
      {
        color:"var(--bp-primary)", bg:"#DCFCE7",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>,
        title:"Profil mis en avant", desc:"Apparaissez en premier dans les recherches"
      },
      {
        color:"#F59E0B", bg:"#FEF3C7",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#F59E0B"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>,
        title:"Publications boostées", desc:"+3x de visibilité sur vos publications"
      },
      {
        color:"var(--bp-primary)", bg:"#DCFCE7",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>,
        title:"Badge vérifié doré", desc:"Confiance et crédibilité renforcées"
      },
      {
        color:"#0EA5E9", bg:"#DCFCE7",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#0EA5E9"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>,
        title:"Statistiques avancées", desc:"Vues, clics, portée par pays"
      },
      {
        color:"#8B5CF6", bg:"#EDE9FE",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#8B5CF6"><path d="M19 6H17.82C17.4 4.84 16.3 4 15 4c-1.3 0-2.4.84-2.82 2H2v2h1v9c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8h1V6zm-4 0h-2.28C12.87 5.4 13.39 5 14 5s1.13.4 1.28 1zM15 19H5V8h10v11z"/></svg>,
        title:"Boutique Premium", desc:"Bannière publicitaire + catalogue enrichi"
      },
      {
        color:"#EF4444", bg:"#FEE2E2",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#EF4444"><path d="M20 6h-2.18c.07-.44.18-.88.18-1.34C18 2.54 15.42.12 12.24.12 9.74.12 7.69 1.8 6.84 4.12L6 6H4c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM4 18c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-6H4v6z"/></svg>,
        title:"Offres d'emploi sponsorisées", desc:"Vos annonces en tête de liste"
      },
      {
        color:"#0EA5E9", bg:"#DCFCE7",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#0EA5E9"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>,
        title:"Messagerie prioritaire", desc:"Notifications push en temps réel"
      },
      {
        color:"var(--bp-primary)", bg:"#DCFCE7",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>,
        title:"Visibilité multi-pays", desc:"Diffusion dans les 14 pays BrutePawa"
      },
      {
        color:"#F59E0B", bg:"#FEF3C7",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#F59E0B"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18c0-.55-.45-1-1-1s-1 .45-1 1v1.93C7.06 19.44 4.56 16.94 4.07 13H6c.55 0 1-.45 1-1s-.45-1-1-1H4.07C4.56 7.06 7.06 4.56 11 4.07V6c0 .55.45 1 1 1s1-.45 1-1V4.07C16.94 4.56 19.44 7.06 19.93 11H18c-.55 0-1 .45-1 1s.45 1 1 1h1.93C19.44 16.94 16.94 19.44 13 19.93zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>,
        title:"Support VIP 24h/24", desc:"Assistance prioritaire dédiée"
      },
      {
        color:"#8B5CF6", bg:"#EDE9FE",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#8B5CF6"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>,
        title:"Création de canaux premium", desc:"Audience illimitée"
      },
      {
        color:"#EF4444", bg:"#FEE2E2",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="#EF4444"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 6h-1.25C14.34 8 14 7.66 14 7.25V6H10v1.25C10 7.66 9.66 8 9.25 8H8v8h8V8zm-3 7H9l3-4v2h2l-3 4v-2z"/></svg>,
        title:"Publicités avancées", desc:"Ciblage intelligent par pays"
      },
      {
        color:"var(--bp-primary)", bg:"#DCFCE7",
        icon:<svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
        title:"Monétisation du profil", desc:"Génération de revenus via BrutePawa"
      },
    ];

    const FREE_FEATURES   = ["Publications normales", "Profil standard", "Messagerie basique"];
    const PREMIUM_FEATURES = ["Profil prioritaire", "Badge vérifié doré", "Statistiques avancées", "Multi-pays", "Support VIP", "Publicités boostées"];

    return (
      <div style={{ maxWidth:600, margin:"0 auto", background:"#F8FAFC", minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* ── HEADER ── */}
        <div style={{ background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary))", padding:"0 16px", height:60, display:"flex", alignItems:"center", gap:12, flexShrink:0, boxShadow:"0 2px 16px rgba(22,194,74,0.3)" }}>
          <button onClick={() => setActiveSection("settings")} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", padding:6 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </button>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="#FBBF24"><path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91z"/></svg>
          <span style={{ fontWeight:900, fontSize:19, color:"#fff", flex:1 }}>Compte Premium</span>
          {isPremium && <span style={{ background:"rgba(255,255,255,0.25)", borderRadius:12, padding:"3px 10px", fontSize:12, fontWeight:700, color:"#fff" }}>Actif</span>}
        </div>

        <div style={{ overflowY:"auto", flex:1 }}>

          {/* ── PREMIUM BANNER ── */}
          <div style={{ margin:"16px 16px 0", borderRadius:20, overflow:"hidden", background:"linear-gradient(135deg,#052e16 0%,var(--bp-primary) 45%,var(--bp-primary-dark) 100%)", padding:"24px 20px 20px", position:"relative", boxShadow:"0 8px 32px rgba(22,194,74,0.4)" }}>
            {/* Decorative circles */}
            <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
            <div style={{ position:"absolute", bottom:-20, right:60, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }} />
            {/* SVG Illustration */}
            <div style={{ position:"absolute", top:12, right:16 }}>
              <svg viewBox="0 0 120 110" width="120" height="110" fill="none">
                {/* Crown */}
                <path d="M30 85 L20 40 L45 60 L60 25 L75 60 L100 40 L90 85 Z" fill="#FBBF24" opacity="0.95"/>
                <path d="M30 85 L90 85 L88 90 Q60 95 32 90 Z" fill="#F97316"/>
                <circle cx="60" cy="25" r="6" fill="#fff" opacity="0.9"/>
                <circle cx="20" cy="40" r="5" fill="#fff" opacity="0.85"/>
                <circle cx="100" cy="40" r="5" fill="#fff" opacity="0.85"/>
                {/* Diamond */}
                <polygon points="85,5 100,20 85,40 70,20" fill="#BBF7D0" opacity="0.9"/>
                <polygon points="85,5 100,20 85,40 70,20" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                <polygon points="85,20 100,20 85,40 70,20" fill="#BBF7D0" opacity="0.7"/>
                {/* Stars */}
                <path d="M15 15 L17 10 L19 15 L24 15 L20 18 L21 23 L17 20 L13 23 L14 18 L10 15 Z" fill="#FBBF24" opacity="0.85"/>
                <path d="M108 65 L110 60 L112 65 L117 65 L113 68 L114 73 L110 70 L106 73 L107 68 L103 65 Z" fill="#FBBF24" opacity="0.75"/>
                <path d="M8 70 L9 67 L10 70 L13 70 L11 72 L11.5 75 L9 73.5 L6.5 75 L7 72 L5 70 Z" fill="#FBBF24" opacity="0.7"/>
              </svg>
            </div>
            <div style={{ maxWidth:"60%" }}>
              <div style={{ fontWeight:900, fontSize:22, color:"#fff", lineHeight:1.2, marginBottom:8 }}>Passez à Premium</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.88)", lineHeight:1.5 }}>Boostez votre visibilité{"\n"}sur toute l'Afrique</div>
            </div>
          </div>

          {/* ── PLAN SELECTOR ── */}
          <div style={{ display:"flex", gap:12, margin:"16px 16px 0" }}>
            {/* Mensuel */}
            <button onClick={() => setSelectedPlan("monthly")}
              style={{ flex:1, background:selectedPlan==="monthly" ? "#fff" : "#fff", border:`2.5px solid ${selectedPlan==="monthly" ? "var(--bp-primary)" : "#E5E7EB"}`, borderRadius:16, padding:"16px 12px", cursor:"pointer", position:"relative", textAlign:"center", boxShadow:selectedPlan==="monthly" ? "0 4px 16px rgba(22,194,74,0.18)" : "none", transition:"all 0.18s" }}>
              {selectedPlan==="monthly" && (
                <div style={{ position:"absolute", top:10, right:10, width:20, height:20, borderRadius:"50%", background:"var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
              )}
              <div style={{ fontSize:12, color:"#64748B", fontWeight:500, marginBottom:4 }}>Mensuel</div>
              <div style={{ fontWeight:900, fontSize:20, color: selectedPlan==="monthly" ? "var(--bp-primary)" : "#111827" }}>2 500</div>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:500 }}>FCFA/mois</div>
              <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>Sans engagement</div>
            </button>
            {/* Annuel */}
            <button onClick={() => setSelectedPlan("annual")}
              style={{ flex:1, background:"#fff", border:`2.5px solid ${selectedPlan==="annual" ? "var(--bp-primary)" : "#E5E7EB"}`, borderRadius:16, padding:"16px 12px", cursor:"pointer", position:"relative", textAlign:"center", boxShadow:selectedPlan==="annual" ? "0 4px 16px rgba(22,194,74,0.18)" : "none", transition:"all 0.18s" }}>
              {/* -20% badge */}
              <div style={{ position:"absolute", top:-10, right:10, background:"#EF4444", borderRadius:10, padding:"2px 9px", fontSize:11, fontWeight:800, color:"#fff", boxShadow:"0 2px 8px rgba(239,68,68,0.4)" }}>-20%</div>
              {selectedPlan==="annual" && (
                <div style={{ position:"absolute", top:10, right:10, width:20, height:20, borderRadius:"50%", background:"var(--bp-primary)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
              )}
              <div style={{ fontSize:12, color:"#64748B", fontWeight:500, marginBottom:4 }}>Annuel</div>
              <div style={{ fontWeight:900, fontSize:20, color: selectedPlan==="annual" ? "var(--bp-primary)" : "#111827" }}>24 000</div>
              <div style={{ fontSize:12, color:"#64748B", fontWeight:500 }}>FCFA/an</div>
              <div style={{ fontSize:11, color:"var(--bp-primary)", fontWeight:600, marginTop:4 }}>Soit 2 000/mois</div>
            </button>
          </div>

          {/* ── AVANTAGES ── */}
          <div style={{ margin:"20px 16px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="#FBBF24"><path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91z"/></svg>
              <span style={{ fontWeight:800, fontSize:17, color:"#111827" }}>Avantages Premium</span>
            </div>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{ background:"#fff", borderRadius:14, padding:"12px 14px", marginBottom:8, display:"flex", gap:12, alignItems:"center", boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ width:44, height:44, borderRadius:12, background:b.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {b.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"#111827" }}>{b.title}</div>
                  <div style={{ fontSize:12, color:"#64748B", marginTop:2 }}>{b.desc}</div>
                </div>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#E5E7EB"><path d="M8 5l8 7-8 7"/></svg>
              </div>
            ))}
          </div>

          {/* ── COMPARISON ── */}
          <div style={{ margin:"20px 16px 0", background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 1px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
              {/* Gratuit */}
              <div style={{ padding:"16px 14px", borderRight:"1px solid #F1F5F9" }}>
                <div style={{ fontWeight:700, fontSize:14, color:"#64748B", marginBottom:12, textAlign:"center" }}>Gratuit</div>
                {FREE_FEATURES.map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="#E5E7EB"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    <span style={{ fontSize:12, color:"#64748B" }}>{f}</span>
                  </div>
                ))}
              </div>
              {/* Premium */}
              <div style={{ padding:"16px 14px", background:"#F0FDF4" }}>
                <div style={{ fontWeight:800, fontSize:14, color:"var(--bp-primary)", marginBottom:12, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#FBBF24"><path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91z"/></svg>
                  Premium
                </div>
                {PREMIUM_FEATURES.map((f,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--bp-primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    <span style={{ fontSize:12, color:"#111827", fontWeight:600 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CTA + PAYMENT ── */}
          <div style={{ margin:"20px 16px 24px" }}>
            <button onClick={() => setIsPremium(true)}
              style={{ width:"100%", background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary))", border:"none", borderRadius:16, padding:"17px 20px", cursor:"pointer", boxShadow:"0 6px 24px rgba(22,194,74,0.45)", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#FBBF24"><path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.52l-5.62 3.97 2.09-6.26L3 8.26h6.91z"/></svg>
              <span style={{ color:"#fff", fontWeight:900, fontSize:17 }}>Activer Premium maintenant</span>
            </button>
            <div style={{ textAlign:"center", marginTop:10, fontSize:12, color:"#9CA3AF" }}>Débloquez tous les avantages</div>

            {/* Payment row */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:16, flexWrap:"wrap" }}>
              <div style={{ background:"#fff", borderRadius:8, padding:"5px 10px", boxShadow:"0 1px 6px rgba(0,0,0,0.08)", fontSize:11, fontWeight:700, color:"#D97706" }}>Orange Money</div>
              <div style={{ background:"#fff", borderRadius:8, padding:"5px 10px", boxShadow:"0 1px 6px rgba(0,0,0,0.08)", fontSize:11, fontWeight:700, color:"#0EA5E9" }}>Moov Money</div>
              <div style={{ background:"#fff", borderRadius:8, padding:"5px 10px", boxShadow:"0 1px 6px rgba(0,0,0,0.08)", fontSize:11, fontWeight:700, color:"#0EA5E9" }}>Wave</div>
              <div style={{ background:"#fff", borderRadius:8, padding:"5px 10px", boxShadow:"0 1px 6px rgba(0,0,0,0.08)", display:"flex", alignItems:"center", gap:3 }}>
                <svg viewBox="0 0 48 48" width="28" height="18"><rect width="48" height="48" rx="8" fill="#1E293B"/><path d="M20 14h8c3.3 0 5 1.6 5 4.5 0 4.5-3.5 7-9 7H21L19.5 34H16L20 14z" fill="#fff"/><path d="M22.5 22.5l1-5h2c1.5 0 2.5.7 2.5 2.2 0 2-1.5 2.8-3.5 2.8H22.5z" fill="#F59E0B"/></svg>
              </div>
              <div style={{ background:"#fff", borderRadius:8, padding:"5px 10px", boxShadow:"0 1px 6px rgba(0,0,0,0.08)", display:"flex", alignItems:"center", gap:3 }}>
                <svg viewBox="0 0 50 32" width="36" height="22"><rect width="50" height="32" rx="6" fill="#EF4444" opacity="0.15"/><circle cx="20" cy="16" r="10" fill="#EF4444"/><circle cx="30" cy="16" r="10" fill="#F59E0B"/><path d="M25 9.4a10 10 0 0 1 0 13.2A10 10 0 0 1 25 9.4z" fill="#D97706"/></svg>
              </div>
            </div>
            <div style={{ textAlign:"center", marginTop:8, fontSize:11, color:"#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="#E5E7EB"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
              Paiement sécurisé SSL
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (activeSection === "emplois") return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Back label="💼 Mes offres d'emploi" />
      <button className="btn-primary" style={{ marginBottom: 16 }}>+ Publier une offre</button>
      <div style={{ textAlign: "center", padding: 40, color: "var(--fb-text-secondary)", background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <div style={{ fontWeight: 600 }}>Aucune offre publiée</div>
        <div style={{ fontSize: 13, marginTop: 8 }}>Créez votre première offre pour attirer des talents</div>
      </div>
    </div>
  );

  if (activeSection === "boutiques") return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Back label="🏪 Mes boutiques" />
      <button className="btn-primary" style={{ marginBottom: 16 }}>+ Créer ma boutique</button>
      <div style={{ textAlign: "center", padding: 40, color: "var(--fb-text-secondary)", background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
        <div style={{ fontWeight: 600 }}>Vous n'avez pas encore de boutique</div>
        <div style={{ fontSize: 13, marginTop: 8 }}>Lancez votre boutique et vendez à toute l'Afrique francophone</div>
      </div>
    </div>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <div onClick={onChange} style={{
      width: 48, height: 26, borderRadius: 13, background: value ? "var(--bp-primary)" : "#ccc",
      position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", background: "var(--theme-surface)",
        position: "absolute", top: 2, left: value ? 24 : 2, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
      }} />
    </div>
  );

  if (activeSection === "settings") return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setActiveSection("main")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 900, fontSize: 20 }}>⚙️ Paramètres</div>
      </div>
      <div style={{ padding: "8px 0" }}>
        {[
          { emoji: "🔒", label: "Confidentialité", desc: "Gérer qui voit vos informations", action: () => setActiveSection("settings-privacy") },
          { emoji: "🔔", label: "Notifications", desc: "Personnaliser vos alertes", action: () => setActiveSection("settings-notifs") },
          { emoji: "🌐", label: "Langue & région", desc: `${selectedLang} · ${selectedCountry}`, action: () => setActiveSection("settings-lang") },
          { emoji: "📱", label: "Mode données", desc: `Économiseur : ${dataSaver ? "Activé" : "Désactivé"}`, action: () => setActiveSection("settings-data") },
          { emoji: "🎨", label: "Apparence", desc: darkMode ? "Thème sombre" : "Thème clair", action: () => setActiveSection("settings-appearance") },
          { emoji: "📞", label: "Vérification du compte", desc: phoneSaved ? `✅ Téléphone vérifié` : "Ajouter votre numéro de téléphone", action: () => setActiveSection("settings-verify") },
          { emoji: "✅", label: "Badge vérifié", desc: "Vérification identité · 2 500 FCFA", action: () => setActiveSection("premium") },
          { emoji: "💳", label: "Compte Premium", desc: isPremium ? "✅ Actif" : "Passer à Premium · 2 500 FCFA/mois", action: () => setActiveSection("premium") },
        ].map((item, i) => (
          <div key={i} onClick={item.action} style={{
            background: "var(--fb-white)", padding: "14px 16px", borderBottom: "1px solid var(--fb-divider)",
            display: "flex", alignItems: "center", gap: 12, cursor: "pointer"
          }}>
            <div style={{ fontSize: 22, width: 42, height: 42, background: "var(--fb-bg)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.label}</div>
              <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>{item.desc}</div>
            </div>
            <span style={{ color: "var(--fb-text-secondary)", fontSize: 20 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (activeSection === "settings-privacy") {
    const handleUnblock = async (userId: number) => {
      try {
        await apiUnblockUser(userId);
        setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      } catch {}
    };

    return (
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setActiveSection("settings")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
          <div style={{ fontWeight: 900, fontSize: 18 }}>🔒 Confidentialité</div>
        </div>
        <div style={{ padding: "8px 0" }}>
          {[
            { label: "Profil public", desc: "Tout le monde peut voir votre profil", value: profilePublic, onChange: () => setProfilePublic(v => !v) },
            { label: "Afficher mon téléphone", desc: "Visible par vos contacts", value: showPhone, onChange: () => setShowPhone(v => !v) },
            { label: "Afficher mon email", desc: "Visible dans votre profil public", value: showEmail, onChange: () => setShowEmail(v => !v) },
          ].map((item, i) => (
            <div key={i} style={{ background: "var(--fb-white)", padding: "14px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{item.label}</div>
                <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>{item.desc}</div>
              </div>
              <Toggle value={item.value} onChange={item.onChange} />
            </div>
          ))}
          <div style={{ padding: "14px 16px", background: "var(--fb-white)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Utilisateurs bloqués</div>
            {blockedLoading ? (
              <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", padding: "8px 0" }}>Chargement…</div>
            ) : blockedUsers.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>Aucun utilisateur bloqué</div>
            ) : (
              blockedUsers.map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--fb-divider)" }}>
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bp-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                      {u.firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{u.firstName} {u.lastName}</div>
                  <button
                    onClick={() => handleUnblock(u.id)}
                    style={{ background: "none", border: "1px solid var(--bp-primary)", color: "var(--bp-primary)", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    Débloquer
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === "settings-notifs") return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setActiveSection("settings")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 900, fontSize: 18 }}>🔔 Notifications</div>
      </div>
      <div style={{ padding: "8px 0" }}>
        {[
          { emoji: "❤️", label: "J'aime & réactions", value: notifLikes, onChange: () => setNotifLikes(v => !v) },
          { emoji: "💬", label: "Commentaires", value: notifComments, onChange: () => setNotifComments(v => !v) },
          { emoji: "✉️", label: "Messages privés", value: notifMessages, onChange: () => setNotifMessages(v => !v) },
          { emoji: "💼", label: "Nouvelles offres d'emploi", value: notifJobs, onChange: () => setNotifJobs(v => !v) },
          { emoji: "💰", label: "Rappels tontines", value: notifTontines, onChange: () => setNotifTontines(v => !v) },
        ].map((item, i) => (
          <div key={i} style={{ background: "var(--fb-white)", padding: "14px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{item.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{item.label}</div>
            </div>
            <Toggle value={item.value} onChange={item.onChange} />
          </div>
        ))}
      </div>
    </div>
  );

  if (activeSection === "settings-lang") return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setActiveSection("settings")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 900, fontSize: 18 }}>🌐 Langue & région</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Langue</div>
        {["Français", "English", "Wolof", "Hausa", "Bambara"].map(lang => (
          <div key={lang} onClick={() => setSelectedLang(lang)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "13px 16px", background: "var(--fb-white)", borderRadius: 10, marginBottom: 6,
            border: selectedLang === lang ? "2px solid var(--bp-primary)" : "1px solid var(--fb-divider)", cursor: "pointer"
          }}>
            <span style={{ fontWeight: selectedLang === lang ? 800 : 500 }}>{lang}</span>
            {selectedLang === lang && <span style={{ color: "var(--bp-primary)", fontWeight: 700 }}>✓</span>}
          </div>
        ))}
        <div style={{ fontWeight: 700, marginTop: 16, marginBottom: 10 }}>Pays / Région</div>
        {["Côte d'Ivoire", "Sénégal", "Mali", "Burkina Faso", "Bénin", "Togo", "Guinée", "RD Congo"].map(c => (
          <div key={c} onClick={() => setSelectedCountry(c)} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "13px 16px", background: "var(--fb-white)", borderRadius: 10, marginBottom: 6,
            border: selectedCountry === c ? "2px solid var(--bp-primary)" : "1px solid var(--fb-divider)", cursor: "pointer"
          }}>
            <span style={{ fontWeight: selectedCountry === c ? 800 : 500 }}>{c}</span>
            {selectedCountry === c && <span style={{ color: "var(--bp-primary)", fontWeight: 700 }}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  );

  if (activeSection === "settings-appearance") return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setActiveSection("settings")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 900, fontSize: 18 }}>🎨 Apparence</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Thème</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Clair", emoji: "☀️", active: !darkMode, onClick: () => setDarkMode(false) },
            { label: "Sombre", emoji: "🌙", active: darkMode, onClick: () => setDarkMode(true) },
          ].map(t => (
            <div key={t.label} onClick={t.onClick} style={{
              flex: 1, textAlign: "center", padding: "20px 0", borderRadius: 12, cursor: "pointer",
              border: t.active ? "2px solid var(--bp-primary)" : "2px solid var(--fb-divider)",
              background: t.active ? "var(--fb-blue-light)" : "var(--fb-white)"
            }}>
              <div style={{ fontSize: 32 }}>{t.emoji}</div>
              <div style={{ fontWeight: 700, marginTop: 6, color: t.active ? "var(--bp-primary)" : "var(--fb-text)" }}>{t.label}</div>
              {t.active && <div style={{ fontSize: 12, color: "var(--bp-primary)" }}>✓ Actif</div>}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderTop: "1px solid var(--fb-divider)" }}>
          <div>
            <div style={{ fontWeight: 700 }}>Lecture auto des vidéos</div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>Lire automatiquement les vidéos dans le fil</div>
          </div>
          <Toggle value={autoPlay} onChange={() => setAutoPlay(v => !v)} />
        </div>
      </div>
    </div>
  );

  if (activeSection === "settings-data") return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setActiveSection("settings")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 900, fontSize: 18 }}>📱 Mode données</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--fb-white)", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid var(--fb-divider)" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Économiseur de données</div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginTop: 2 }}>Réduit la qualité des images et vidéos</div>
          </div>
          <Toggle value={dataSaver} onChange={() => setDataSaver(v => !v)} />
        </div>
        <div style={{ background: dataSaver ? "#DCFCE7" : "var(--fb-bg)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: dataSaver ? "var(--bp-primary-dark)" : "var(--fb-text-secondary)" }}>
            {dataSaver ? "✅ Économiseur actif — données réduites" : "Mode normal — qualité maximale"}
          </div>
          <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginTop: 4 }}>
            {dataSaver ? "Vous économisez jusqu'à 70% de données mobiles." : "Toutes les images et vidéos sont chargées en haute qualité."}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--fb-white)", borderRadius: 12, padding: 16, border: "1px solid var(--fb-divider)" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Téléchargements auto</div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginTop: 2 }}>Télécharger les médias en Wi-Fi uniquement</div>
          </div>
          <Toggle value={!dataSaver} onChange={() => setDataSaver(v => !v)} />
        </div>
      </div>
    </div>
  );

  if (activeSection === "settings-verify") return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div style={{ background: "var(--fb-white)", padding: "12px 16px", borderBottom: "1px solid var(--fb-divider)", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setActiveSection("settings")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 900, fontSize: 18 }}>📞 Vérification du compte</div>
      </div>
      <div style={{ padding: 16 }}>
        {phoneSaved ? (
          <div style={{ background: "#DCFCE7", borderRadius: 16, padding: 20, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 17, marginTop: 8, color: "var(--bp-primary-dark)" }}>Téléphone vérifié</div>
            <div style={{ fontSize: 14, color: "#388E3C", marginTop: 4 }}>{phone}</div>
          </div>
        ) : (
          <div style={{ background: "var(--fb-white)", borderRadius: 16, padding: 20, border: "1px solid var(--fb-divider)" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Numéro de téléphone</div>
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginBottom: 14 }}>
              Ajoutez votre numéro pour sécuriser votre compte et permettre aux autres de vous trouver.
            </div>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+225 07 XX XX XX XX"
              style={{ width: "100%", background: "var(--fb-bg)", border: "none", borderRadius: 10, padding: "12px 14px", fontSize: 15, marginBottom: 14, boxSizing: "border-box" }}
            />
            <button
              onClick={() => { if (phone.trim()) setPhoneSaved(true); }}
              disabled={!phone.trim()}
              style={{ width: "100%", background: phone.trim() ? "var(--bp-primary)" : "#ccc", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
            >
              Envoyer le code de vérification
            </button>
          </div>
        )}
        <div style={{ background: "var(--fb-white)", borderRadius: 12, padding: 16, border: "1px solid var(--fb-divider)", marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Sécurité du compte</div>
          {[
            { icon: "🔑", label: "Changer le mot de passe", action: () => {} },
            { icon: "📧", label: "Modifier l'email", action: () => {} },
            { icon: "🛡️", label: "Authentification à deux facteurs", action: () => {} },
          ].map((item, i) => (
            <div key={i} onClick={item.action} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: i > 0 ? "1px solid var(--fb-divider)" : "none", cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
              </div>
              <span style={{ color: "var(--fb-text-secondary)" }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (activeSection === "help") return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <Back label="❓ Centre d'aide" />
      <input placeholder="🔍 Que puis-je vous aider ?" style={{ marginBottom: 16 }} />
      {[
        { emoji: "🔑", title: "Compte et sécurité", items: ["Réinitialiser mon mot de passe", "Protéger mon compte", "Vérification en deux étapes"] },
        { emoji: "💬", title: "Publications et fil", items: ["Créer une publication", "Signaler un contenu", "Paramètres de confidentialité"] },
        { emoji: "💳", title: "Paiements et wallet", items: ["Déposer de l'argent", "Envoyer un transfert", "Problème de transaction"] },
        { emoji: "🛍️", title: "Marketplace", items: ["Acheter en toute sécurité", "Signaler une annonce", "Politique de remboursement"] },
        { emoji: "🌍", title: "Multi-pays", items: ["Acheter depuis un autre pays", "Taux de change", "Livraison internationale"] },
      ].map((section, i) => (
        <div key={i} style={{ background: "var(--fb-white)", borderRadius: 10, border: "1px solid var(--fb-divider)", padding: "14px 16px", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>{section.emoji}</span> {section.title}
          </div>
          {section.items.map((item, j) => (
            <div key={j} style={{ padding: "8px 0", borderTop: j > 0 ? "1px solid var(--fb-divider)" : "none", fontSize: 14, color: "var(--bp-primary)", cursor: "pointer" }}>
              {item} →
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // ─── MAIN MENU — Ultra Premium 2026 ───
  const handle = user.name
    ? "@" + user.name.toLowerCase().replace(/\s+/g, "_")
    : "@pat_pat";

  type GridCard = {
    label: string;
    sub: string;
    bg: string;
    iconColor: string;
    badge: number;
    action: () => void;
    icon: (c: string) => React.ReactNode;
  };

  const gridCards: GridCard[] = [
    {
      label: "Reels", sub: "Découvrez et partagez des vidéos courtes",
      bg: "#FEE2E2", iconColor: "#EF4444", badge: 0, action: () => navigate("/reels"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <rect x="1" y="6" width="28" height="23" rx="5" fill="#EF4444"/>
          <rect x="1" y="3" width="28" height="8" rx="4" fill="#EF4444"/>
          <rect x="5" y="1" width="4" height="10" rx="2" fill="#EF4444"/>
          <rect x="13" y="1" width="4" height="10" rx="2" fill="#EF4444"/>
          <rect x="21" y="1" width="4" height="10" rx="2" fill="#EF4444"/>
          <circle cx="5.5" cy="16" r="2.2" fill="#FEE2E2"/>
          <circle cx="5.5" cy="23" r="2.2" fill="#FEE2E2"/>
          <circle cx="24.5" cy="16" r="2.2" fill="#FEE2E2"/>
          <circle cx="24.5" cy="23" r="2.2" fill="#FEE2E2"/>
          <circle cx="15" cy="19.5" r="6.5" fill="#EF4444"/>
          <polygon points="12.5,17.5 20,19.5 12.5,21.5" fill="white"/>
        </svg>
      ),
    },
    {
      label: "Messages", sub: "Discutez avec vos amis en privé",
      bg: "#DCFCE7", iconColor: "#0EA5E9", badge: unreadMessages, action: () => navigate("/messages"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <path d="M3 3 H27 A3 3 0 0 1 30 6 V20 A3 3 0 0 1 27 23 H11 L3 29 V23 A3 3 0 0 1 0 20 V6 A3 3 0 0 1 3 3 Z" fill="#0EA5E9"/>
          <circle cx="9" cy="13" r="2.3" fill="white"/>
          <circle cx="15" cy="13" r="2.3" fill="white"/>
          <circle cx="21" cy="13" r="2.3" fill="white"/>
        </svg>
      ),
    },
    {
      label: "Groupes", sub: "Rejoignez des communautés qui vous passionnent",
      bg: "#DCFCE7", iconColor: "var(--bp-primary)", badge: groupsCount, action: () => navigate("/community?tab=groupes"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <circle cx="20" cy="10" r="5" fill="var(--bp-primary)"/>
          <path d="M13 28 C13 22 16.5 18 20 18 C23.5 18 27 22 27 28 Z" fill="var(--bp-primary)"/>
          <circle cx="11" cy="11" r="6.5" fill="var(--bp-primary-dark)"/>
          <path d="M2 29 C2 22.5 6 17 11 17 C16 17 20 22.5 20 29 Z" fill="var(--bp-primary-dark)"/>
        </svg>
      ),
    },
    {
      label: "Ami(e)s", sub: "Retrouvez vos amis et faites-en de nouveaux",
      bg: "#FEF3C7", iconColor: "#F97316", badge: pendingRequests, action: () => navigate("/friends"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <circle cx="11" cy="11" r="6.5" fill="#F97316"/>
          <path d="M2 29 C2 22 6.5 17 11 17 C14.5 17 17.5 18.5 19.5 21.5" fill="#F97316" fillOpacity="0.8"/>
          <circle cx="23" cy="23" r="7" fill="#F97316"/>
          <rect x="19.5" y="21.5" width="7" height="3" rx="1.5" fill="white"/>
          <rect x="21.5" y="19.5" width="3" height="7" rx="1.5" fill="white"/>
        </svg>
      ),
    },
    {
      label: "Marketplace", sub: "Achetez et vendez en toute sécurité",
      bg: "#EDE9FE", iconColor: "#8B5CF6", badge: 0, action: () => navigate("/marketplace"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <rect x="3" y="11" width="24" height="17" rx="4" fill="#8B5CF6"/>
          <path d="M10 11 V8 A5 5 0 0 1 20 8 V11" stroke="#8B5CF6" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <rect x="9" y="17" width="12" height="3" rx="1.5" fill="#8B5CF6"/>
          <circle cx="15" cy="23" r="2.5" fill="#8B5CF6"/>
        </svg>
      ),
    },
    {
      label: "Portefeuille", sub: "Gérez vos paiements et transactions",
      bg: "#DCFCE7", iconColor: "var(--bp-primary-dark)", badge: 0, action: () => navigate("/wallet"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <rect x="2" y="9" width="26" height="18" rx="5" fill="var(--bp-primary-dark)"/>
          <rect x="2" y="9" width="26" height="6" rx="3" fill="var(--bp-primary-dark)"/>
          <rect x="16" y="15" width="11" height="7" rx="3" fill="#DCFCE7"/>
          <circle cx="21.5" cy="18.5" r="2.5" fill="var(--bp-primary-dark)"/>
          <rect x="4" y="16" width="9" height="2" rx="1" fill="#DCFCE7"/>
          <rect x="4" y="20" width="6" height="2" rx="1" fill="#DCFCE7"/>
        </svg>
      ),
    },
    {
      label: "Pages", sub: "Gérez vos pages et développez votre audience",
      bg: "#DCFCE7", iconColor: "#0EA5E9", badge: 0, action: () => {},
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <rect x="6" y="4" width="3.5" height="24" rx="1.75" fill="#0EA5E9"/>
          <path d="M9.5 5 L27 5 L22.5 13.5 L27 22 L9.5 22 Z" fill="#0EA5E9"/>
          <path d="M9.5 5 L27 5 L22.5 13.5" fill="#0EA5E9" opacity="0.35"/>
        </svg>
      ),
    },
    {
      label: "Évènements", sub: "Découvrez les événements autour de vous",
      bg: "#FEF3C7", iconColor: "#D97706", badge: 0, action: () => navigate("/events"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <rect x="2" y="7" width="26" height="22" rx="5" fill="#D97706"/>
          <rect x="2" y="7" width="26" height="9" rx="5" fill="#D97706"/>
          <rect x="2" y="12" width="26" height="4" fill="#D97706"/>
          <rect x="8" y="3" width="4" height="8" rx="2" fill="#FEF3C7"/>
          <rect x="18" y="3" width="4" height="8" rx="2" fill="#FEF3C7"/>
          <text x="15" y="24.5" textAnchor="middle" fontSize="11" fontWeight="900" fill="white" fontFamily="system-ui,Arial,sans-serif">17</text>
        </svg>
      ),
    },
    {
      label: "Brute Vérifié", sub: "Compte vérifié et sécurisé",
      bg: "#DCFCE7", iconColor: "var(--bp-primary)", badge: 0, action: () => setActiveSection("settings-verify"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <path d="M15 2 L28 7.5 V15 C28 22.5 22 27.5 15 30 C8 27.5 2 22.5 2 15 V7.5 Z" fill="var(--bp-primary-dark)"/>
          <path d="M15 2 L28 7.5 V15 C28 22.5 22 27.5 15 30" fill="#388E3C" opacity="0.45"/>
          <polyline points="9,16 13,20 21,11" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: "Tontines", sub: "Gérez et participez à des tontines",
      bg: "#FEF3C7", iconColor: "#F59E0B", badge: tontines.length, action: () => navigate("/tontines"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <ellipse cx="15" cy="8" rx="5.5" ry="3.5" fill="#D97706"/>
          <ellipse cx="15" cy="21" rx="12" ry="10" fill="#F59E0B"/>
          <ellipse cx="11" cy="17" rx="4" ry="5" fill="#FBBF24" opacity="0.45"/>
          <text x="15" y="25" textAnchor="middle" fontSize="12" fontWeight="900" fill="#D97706" fontFamily="system-ui,Arial,sans-serif">$</text>
        </svg>
      ),
    },
    {
      label: "Fils", sub: "Actualités et contenus personnalisés",
      bg: "#DCFCE7", iconColor: "#0EA5E9", badge: 0, action: () => navigate("/"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <path d="M2 10 H13.5 L16.5 7 H28 A2 2 0 0 1 30 9 V12 H2 Z" fill="#1565C0"/>
          <rect x="2" y="11" width="26" height="17" rx="4" fill="#0EA5E9"/>
          <rect x="7" y="16.5" width="14" height="2.5" rx="1.25" fill="#DCFCE7"/>
          <rect x="7" y="21" width="10" height="2.5" rx="1.25" fill="#DCFCE7"/>
        </svg>
      ),
    },
    {
      label: "Formations", sub: "Développez vos compétences et apprenez",
      bg: "#EDE9FE", iconColor: "#8B5CF6", badge: 0, action: () => navigate("/formations"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <polygon points="15,4 29,12 15,20 1,12" fill="#8B5CF6"/>
          <rect x="26" y="12" width="3" height="9" rx="1.5" fill="#8B5CF6"/>
          <circle cx="27.5" cy="23" r="2.5" fill="#8B5CF6"/>
          <path d="M8 16 V22 C8 22 11 27 15 27 C19 27 22 22 22 22 V16 L15 20 Z" fill="#7C3AED"/>
        </svg>
      ),
    },
    {
      label: "Score", sub: "Boostez votre score et gagnez en visibilité",
      bg: "#FEF3C7", iconColor: "#F97316", badge: 0, action: () => setActiveSection("score"),
      icon: (_c) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <path d="M10.5 13 L7.5 29 L15 24 L22.5 29 L19.5 13" fill="#D97706"/>
          <circle cx="15" cy="13" r="11" fill="#D97706"/>
          <circle cx="15" cy="13" r="8.5" fill="#F59E0B"/>
          <polygon points="15,7 16.8,12 22,12 17.6,15.2 19.4,20.5 15,17.3 10.6,20.5 12.4,15.2 8,12 13.2,12" fill="#D97706"/>
        </svg>
      ),
    },
    ...(isAdmin(user.email ?? "") ? [{
      label: "Admin", sub: "Panneau d'administration",
      bg: "#FEE2E2", iconColor: "#E91E63", badge: 0, action: () => navigate(ADMIN_SECRET_PATH),
      icon: (_c: string) => (
        <svg width="30" height="30" viewBox="0 0 30 30">
          <path d="M15 2 L28 7.5 V15 C28 22.5 22 27.5 15 30 C8 27.5 2 22.5 2 15 V7.5 Z" fill="#EC4899"/>
          <text x="15" y="20" textAnchor="middle" fontSize="13" fontWeight="900" fill="white" fontFamily="system-ui,Arial,sans-serif">A</text>
        </svg>
      ),
    } as GridCard] : []),
  ];

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", background: "#F8FAFC", minHeight: "100dvh", paddingBottom: 104, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes bp-menu-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bp-badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,.6); }
          70%       { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
        @keyframes bp-live-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.55; }
        }
      `}</style>

      {/* ══ HEADER ══ */}
      <div style={{ padding: "calc(env(safe-area-inset-top,0px) + 20px) 20px 16px", background: "#F8FAFC", animation: "bp-menu-in 300ms cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 32, color: "#0F172A", letterSpacing: "-0.8px", lineHeight: 1.1 }}>Menu</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 5 }}>Tout ce dont vous avez besoin, au même endroit.</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 2 }}>
            <button style={{ width: 40, height: 40, borderRadius: 13, background: "var(--theme-surface)", border: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", outline: "none" }}>
              <BPSearch size={18} />
            </button>
            <button style={{ width: 40, height: 40, borderRadius: 13, background: "var(--theme-surface)", border: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", outline: "none" }}>
              <BPQR size={18} />
            </button>
            <button onClick={() => navigate("/notifications")} style={{ width: 40, height: 40, borderRadius: 13, background: "var(--theme-surface)", border: "1.5px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", outline: "none" }}>
              <BPBell size={18} />
              <div style={{ position: "absolute", top: -5, right: -5, background: "var(--bp-primary)", color: "#fff", fontSize: 9, fontWeight: 800, minWidth: 19, height: 19, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", animation: "bp-badge-pulse 2s infinite" }}>12</div>
            </button>
          </div>
        </div>
      </div>

      {/* ══ SCROLLABLE CONTENT ══ */}
      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 14, animation: "bp-menu-in 300ms .04s cubic-bezier(0.22,1,0.36,1) both", paddingBottom: 8 }}>

        {/* ── CARTE PROFIL IMMERSIVE ── */}
        <div style={{ borderRadius: 28, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}>
          {/* Cover photo — paysage réel */}
          <div style={{ backgroundImage:"url('/profile-bg.png')", backgroundSize:"cover", backgroundPosition:"center 40%", position: "relative", padding: "20px 18px 0" }}>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(160deg,rgba(5,20,10,0.72) 0%,rgba(10,40,18,0.58) 50%,rgba(5,18,10,0.70) 100%)" }}/>
              <div style={{ position:"absolute",bottom:0,left:0,right:0,height:70,background:"linear-gradient(transparent,rgba(0,0,0,0.60))" }}/>
            </div>
            {/* Avatar + nom + CTA */}
            <div style={{ position:"relative",zIndex:2,display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ position:"relative",flexShrink:0 }}>
                <div style={{ width:68,height:68,borderRadius:"50%",background:user.avatarUrl?"transparent":"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",border:"3px solid #fff",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"#fff",boxShadow:"0 4px 20px rgba(0,0,0,0.35)" }}>
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                    : userInitials}
                </div>
                <div style={{ position:"absolute",bottom:1,right:1,width:22,height:22,borderRadius:"50%",background:"var(--bp-primary)",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <span style={{ fontWeight:700,fontSize:17,color:"#fff",letterSpacing:"-0.3px" }}>Brute Pawa</span>
                  <svg viewBox="0 0 24 24" width="17" height="17">
                    <circle cx="12" cy="12" r="10" fill="var(--bp-primary)"/>
                    <path d="M8 12l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                <div style={{ fontSize:13,color:"rgba(255,255,255,0.72)",marginTop:2 }}>@brutepawa</div>
              </div>
              <button onClick={()=>navigate("/profile")} style={{ flexShrink:0,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,0.28)",borderRadius:20,padding:"7px 12px",display:"flex",alignItems:"center",gap:4,cursor:"pointer",outline:"none" }}>
                <span style={{ fontSize:11.5,fontWeight:600,color:"#fff",whiteSpace:"nowrap" }}>Voir mon profil</span>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            {/* XP bar */}
            <div style={{ position:"relative",zIndex:2,marginTop:14,paddingBottom:18 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ display:"flex",alignItems:"center",gap:5,background:"rgba(20,20,20,0.65)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",borderRadius:20,padding:"5px 11px",flexShrink:0 }}>
                  <span style={{ fontSize:13 }}>⭐</span>
                  <span style={{ fontSize:12,fontWeight:700,color:"#fff" }}>Niveau 12</span>
                </div>
                <div style={{ flex:1,height:6,background:"rgba(255,255,255,0.18)",borderRadius:999,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:"47%",background:"linear-gradient(90deg,var(--bp-primary),#4ADE80)",borderRadius:999 }}/>
                </div>
                <span style={{ fontSize:11,color:"rgba(255,255,255,0.85)",fontWeight:600,whiteSpace:"nowrap" }}>2 350 / 5 000 XP</span>
              </div>
            </div>
          </div>
          {/* 4 stat cards — glassmorphism dark */}
          <div style={{ background:"rgba(8,28,16,0.92)",padding:"14px 10px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6 }}>
            {([
              { label:"Score BP",        value:"12 580",       arrow:true  },
              { label:"Revenus / mois",  value:"523 600 XOF",  arrow:false },
              { label:"Portefeuille",    value:"245 900 XOF",  arrow:false },
              { label:"Abonnés",         value:"18 745",       arrow:false },
            ] as {label:string;value:string;arrow:boolean}[]).map((s,i)=>(
              <div key={i} style={{ textAlign:"center",padding:"2px 0" }}>
                <div style={{ fontSize:9.5,color:"rgba(255,255,255,0.5)",marginBottom:3,lineHeight:1.3 }}>{s.label}</div>
                <div style={{ fontWeight:700,fontSize:i===0?13:10.5,color:"#fff",lineHeight:1.2,display:"flex",alignItems:"center",justifyContent:"center",gap:2,flexWrap:"wrap" }}>
                  {s.value}
                  {s.arrow&&<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── QUICK ACTIONS BAR ── */}
        <div style={{ background:"#fff",borderRadius:22,padding:"14px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,overflowX:"auto",msOverflowStyle:"none",scrollbarWidth:"none" } as React.CSSProperties}>
            {/* Bouton Créer */}
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5,flexShrink:0,minWidth:56 }}>
              <div style={{ width:50,height:50,borderRadius:"50%",background:"linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 6px 18px rgba(34,197,94,0.38)",cursor:"pointer" }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </div>
              <span style={{ fontSize:11,fontWeight:700,color:"#0F172A" }}>Créer</span>
            </div>
            <div style={{ width:1,height:48,background:"#E2E8F0",flexShrink:0,marginLeft:4,marginRight:4 }}/>
            {([
              { label:"Publier",         bg:"#F0FDF4", action:()=>{},                      icon:<BPPublier size={22} /> },
              { label:"Reel",            bg:"#FFF0F0", action:()=>navigate("/reels"),       icon:<BPReel size={22} /> },
              { label:"Produit",         bg:"#FFF7ED", action:()=>navigate("/marketplace"), icon:<BPProduit size={22} /> },
              { label:"Service",         bg:"#F0F9FF", action:()=>navigate("/marketplace"), icon:<BPService size={22} /> },
              { label:"Offre emploi",    bg:"#FAF5FF", action:()=>navigate("/jobs"),        icon:<BPOffreEmploi size={22} /> },
            ] as {label:string;bg:string;action:()=>void;icon:React.ReactNode}[]).map((item,i)=>(
              <div key={i} onClick={item.action}
                style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:5,flexShrink:0,minWidth:52,cursor:"pointer",transition:"transform 250ms cubic-bezier(0.22,1,0.36,1)" }}
                onPointerDown={e=>(e.currentTarget.style.transform="scale(0.92)")}
                onPointerUp={e=>(e.currentTarget.style.transform="scale(1)")}
                onPointerLeave={e=>(e.currentTarget.style.transform="scale(1)")}
              >
                <div style={{ width:48,height:48,borderRadius:16,background:item.bg,display:"flex",alignItems:"center",justifyContent:"center" }}>{item.icon}</div>
                <span style={{ fontSize:10.5,fontWeight:600,color:"#0F172A",textAlign:"center",lineHeight:1.2 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4 SECTIONS 2×2 ── */}
        {([
          {
            id:"social", title:"Social",
            titleIcon:<BPSocialHeader size={16} />,
            seeAll:()=>navigate("/"),
            cards:[
              { label:"Fil d'actualité", sub:"Dernières publications", bg:"#F0FDF4", badge:0,            live:false, action:()=>navigate("/"),
                icon:<BPFeed size={26} /> },
              { label:"Messages",         sub:"Vos conversations",      bg:"#EFF6FF", badge:unreadMessages||8, live:false, action:()=>navigate("/messages"),
                icon:<BPMessages size={26} /> },
              { label:"Amis",             sub:"Amis & invitations",     bg:"#FFF7ED", badge:pendingRequests, live:false, action:()=>navigate("/friends"),
                icon:<BPAmis size={26} /> },
              { label:"Groupes",          sub:"Vos groupes actifs",    bg:"#FAF5FF", badge:0,            live:false, action:()=>navigate("/community?tab=groupes"),
                icon:<BPGroupes size={26} /> },
            ],
          },
          {
            id:"business", title:"Business",
            titleIcon:<BPBusinessHeader size={16} />,
            seeAll:()=>navigate("/marketplace"),
            cards:[
              { label:"Marketplace", sub:"Acheter & vendre",    bg:"#F0FDF4", badge:0, live:false, action:()=>navigate("/marketplace"),
                icon:<BPMarketplace size={26} /> },
              { label:"Services",    sub:"Trouver ou proposer", bg:"#EFF6FF", badge:0, live:false, action:()=>navigate("/marketplace"),
                icon:<BPServices size={26} /> },
              { label:"Emplois",     sub:"Offres & candidats",  bg:"#FFF7ED", badge:0, live:false, action:()=>navigate("/jobs"),
                icon:<BPEmplois size={26} /> },
              { label:"Pages",       sub:"Gérer vos pages",    bg:"#F0FDF4", badge:0, live:false, action:()=>navigate("/pages"),
                icon:<BPPages size={26} /> },
            ],
          },
          {
            id:"finance", title:"Finance",
            titleIcon:<BPFinanceHeader size={16} />,
            seeAll:()=>navigate("/wallet"),
            cards:[
              { label:"Portefeuille", sub:"Gérer votre argent",  bg:"#F0FDF4", badge:0,             live:false, action:()=>navigate("/wallet"),
                icon:<BPPortefeuille size={26} /> },
              { label:"Tontines",    sub:"Épargner ensemble",   bg:"#FEF3C7", badge:tontines.length, live:false, action:()=>navigate("/tontines"),
                icon:<BPTontines size={26} /> },
              { label:"Revenus",     sub:"Suivre vos gains",    bg:"#F0FDF4", badge:0,             live:false, action:()=>{},
                icon:<BPRevenus size={26} /> },
              { label:"Paiements",   sub:"Envoyer & recevoir",  bg:"#EFF6FF", badge:0,             live:false, action:()=>{},
                icon:<BPPaiements size={26} /> },
            ],
          },
          {
            id:"createur", title:"Créateur",
            titleIcon:<BPCreateurHeader size={16} />,
            seeAll:()=>navigate("/reels"),
            cards:[
              { label:"Reels",        sub:"Créer des vidéos",     bg:"#FFF0F0", badge:0, live:false, action:()=>navigate("/reels"),
                icon:<BPReels size={26} /> },
              { label:"Lives",        sub:"Diffuser en direct",   bg:"#FFF0F0", badge:0, live:true,  action:()=>{},
                icon:<BPLives size={26} /> },
              { label:"Formations",   sub:"Apprendre & enseigner",bg:"#FAF5FF", badge:0, live:false, action:()=>navigate("/formations"),
                icon:<BPFormations size={26} /> },
              { label:"Monétisation", sub:"Gagner de l'argent",  bg:"#F0FDF4", badge:0, live:false, action:()=>{},
                icon:<BPMonetisation size={26} /> },
            ],
          },
        ] as {id:string;title:string;titleIcon:React.ReactNode;seeAll:()=>void;cards:{label:string;sub:string;bg:string;badge:number;live:boolean;action:()=>void;icon:React.ReactNode}[]}[]).map(section=>(
          <div key={section.id}>
            {/* Section header */}
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,paddingLeft:2 }}>
              <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                <div style={{ width:28,height:28,borderRadius:9,background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center" }}>{section.titleIcon}</div>
                <span style={{ fontWeight:700,fontSize:16,color:"#0F172A" }}>{section.title}</span>
              </div>
              <button onClick={section.seeAll} style={{ background:"none",border:"none",fontSize:12.5,fontWeight:600,color:"var(--bp-primary)",cursor:"pointer",display:"flex",alignItems:"center",gap:2,padding:0,outline:"none" }}>
                Tout voir
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            {/* 2×2 grid */}
            <div style={{ background:"#fff",borderRadius:24,padding:"16px 14px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
              {section.cards.map((card,i)=>(
                <div key={i} onClick={card.action}
                  style={{ display:"flex",flexDirection:"column",gap:8,cursor:"pointer",transition:"transform 250ms cubic-bezier(0.22,1,0.36,1)",position:"relative" }}
                  onPointerDown={e=>(e.currentTarget.style.transform="scale(0.97)")}
                  onPointerUp={e=>(e.currentTarget.style.transform="scale(1)")}
                  onPointerLeave={e=>(e.currentTarget.style.transform="scale(1)")}
                >
                  <div style={{ position:"relative",display:"inline-flex" }}>
                    <div style={{ width:44,height:44,borderRadius:14,background:card.bg,display:"flex",alignItems:"center",justifyContent:"center" }}>{card.icon}</div>
                    {card.badge>0&&(
                      <div style={{ position:"absolute",top:-5,right:-5,background:"var(--bp-primary)",color:"#fff",fontSize:9,fontWeight:800,minWidth:17,height:17,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px",animation:"bp-badge-pulse 2s infinite" }}>
                        {card.badge>99?"99+":card.badge}
                      </div>
                    )}
                    {card.live&&(
                      <div style={{ position:"absolute",top:-6,left:-2,background:"#EF4444",color:"#fff",fontSize:8,fontWeight:800,borderRadius:5,padding:"2px 5px",lineHeight:1,animation:"bp-live-pulse 1.5s infinite" }}>LIVE</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color:"#0F172A",lineHeight:1.2 }}>{card.label}</div>
                    <div style={{ fontSize:11,color:"#64748B",marginTop:2,lineHeight:1.3 }}>{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── BANNIÈRE PREMIUM ── */}
        <div style={{ background:"linear-gradient(135deg,#052E14 0%,#064E24 40%,#0A5E2A 70%,#0D7A36 100%)",borderRadius:28,padding:"20px 18px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 12px 40px rgba(0,0,0,0.2)",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:-30,right:-30,width:140,height:140,borderRadius:"50%",background:"rgba(34,197,94,0.12)",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",bottom:-20,left:120,width:80,height:80,borderRadius:"50%",background:"rgba(34,197,94,0.08)",pointerEvents:"none" }}/>
          <div style={{ flexShrink:0,fontSize:38,lineHeight:1 }}>👑</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontWeight:800,fontSize:15,color:"#fff",lineHeight:1.3 }}>Passez à BrutePawa Premium</div>
            <div style={{ fontSize:11.5,color:"rgba(255,255,255,0.7)",marginTop:4,lineHeight:1.4 }}>Plus de visibilité, d'opportunités et de revenus.</div>
          </div>
          <button onClick={()=>setActiveSection("premium")} style={{ flexShrink:0,background:"var(--bp-primary)",border:"none",borderRadius:20,padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,outline:"none" }}>
            <span style={{ fontWeight:700,fontSize:11.5,color:"#fff",whiteSpace:"nowrap" }}>Découvrir</span>
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <button
          type="button"
          onClick={logout}
          data-testid="button-logout"
          style={{ width:"100%",minHeight:52,border:"1px solid #FECACA",borderRadius:18,background:"#FFF",color:"#DC2626",fontSize:14,fontWeight:750,display:"flex",alignItems:"center",justifyContent:"center",gap:9,cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,0.04)" }}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 17l5-5-5-5"/>
            <path d="M15 12H3"/>
            <path d="M14 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5"/>
          </svg>
          Déconnexion
        </button>

      </div>
    </div>
  );
}
