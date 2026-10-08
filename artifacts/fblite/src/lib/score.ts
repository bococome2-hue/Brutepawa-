export interface ScoreLevel {
  level: "bronze" | "argent" | "or" | "platine" | "elite";
  label: string;
  color: string;
  emoji: string;
  min: number;
  description: string;
  perks: string[];
}

export const SCORE_LEVELS: ScoreLevel[] = [
  {
    level: "bronze",
    label: "Bronze",
    color: "#CD7F32",
    emoji: "🥉",
    min: 0,
    description: "Bienvenue sur Brute Pawa ! Commence à compléter ton profil.",
    perks: ["Accès aux publications", "Accès au marketplace", "Accès aux offres d'emploi"],
  },
  {
    level: "argent",
    label: "Argent",
    color: "#9E9E9E",
    emoji: "🥈",
    min: 20,
    description: "Tu as posé les bases. Continue à enrichir ton profil.",
    perks: ["Badge Argent visible", "Accès aux tontines", "Candidature aux offres"],
  },
  {
    level: "or",
    label: "Or",
    color: "#FFD700",
    emoji: "🏅",
    min: 40,
    description: "Profil actif et bien rempli. Tu fais partie des membres reconnus.",
    perks: ["Badge Or visible", "Priorité dans les résultats", "Accès aux formations avancées"],
  },
  {
    level: "platine",
    label: "Platine",
    color: "#78909C",
    emoji: "💎",
    min: 70,
    description: "Membre très actif et de confiance sur la plateforme.",
    perks: ["Badge Platine visible", "Mise en avant du profil", "Accès aux ventes premium"],
  },
  {
    level: "elite",
    label: "Élite",
    color: "#9C27B0",
    emoji: "⭐",
    min: 90,
    description: "Le plus haut niveau de confiance. Ambassadeur Brute Pawa.",
    perks: ["Badge Élite visible", "Vérification prioritaire", "Accès exclusif aux événements"],
  },
];

export interface ScoreFactors {
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  phone?: string;
  postsCount: number;
  friendsCount: number;
  extCity?: string;
  extHometown?: string;
  extLanguages?: string;
  extHobbies?: string;
}

export interface ScoreResult {
  points: number;
  pct: number;
  level: ScoreLevel["level"];
  label: string;
  color: string;
  emoji: string;
  nextLevel: string | null;
  pointsToNext: number | null;
  breakdown: { label: string; earned: number; max: number }[];
}

export function computeScore(f: ScoreFactors): ScoreResult {
  const breakdown: { label: string; earned: number; max: number }[] = [
    { label: "Photo de profil", earned: f.avatarUrl ? 15 : 0, max: 15 },
    { label: "Photo de couverture", earned: f.coverUrl ? 10 : 0, max: 10 },
    { label: "Biographie", earned: (f.bio && f.bio.trim().length > 5) ? 10 : 0, max: 10 },
    { label: "Téléphone", earned: (f.phone && f.phone.trim().length > 4) ? 5 : 0, max: 5 },
    { label: "Ville actuelle", earned: (f.extCity && f.extCity.trim()) ? 5 : 0, max: 5 },
    { label: "Ville natale", earned: (f.extHometown && f.extHometown.trim()) ? 5 : 0, max: 5 },
    { label: "Langues parlées", earned: (f.extLanguages && f.extLanguages.trim()) ? 5 : 0, max: 5 },
    { label: "Centres d'intérêt", earned: (f.extHobbies && f.extHobbies.trim()) ? 5 : 0, max: 5 },
    { label: "Publications", earned: Math.min(f.postsCount * 2, 20), max: 20 },
    { label: "Amis", earned: Math.min(f.friendsCount * 2, 20), max: 20 },
  ];

  const points = breakdown.reduce((s, b) => s + b.earned, 0);

  let levelData = SCORE_LEVELS[0];
  for (const l of SCORE_LEVELS) {
    if (points >= l.min) levelData = l;
  }
  const idx = SCORE_LEVELS.findIndex(l => l.level === levelData.level);
  const next = SCORE_LEVELS[idx + 1] ?? null;

  return {
    points,
    pct: points,
    level: levelData.level,
    label: levelData.label,
    color: levelData.color,
    emoji: levelData.emoji,
    nextLevel: next?.label ?? null,
    pointsToNext: next ? next.min - points : null,
    breakdown,
  };
}
