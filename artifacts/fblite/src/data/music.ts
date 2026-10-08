export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  genre: string;
  previewUrl: string | null;
  artworkUrl: string | null;
}

export async function searchItunes(term: string, limit = 50, signal?: AbortSignal): Promise<Track[]> {
  const params = new URLSearchParams({ q: term, limit: String(limit) });
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/music/search?${params}`, { signal });
  if (!res.ok) throw new Error("Impossible de charger le catalogue musical.");
  const data: { tracks: Track[] } = await res.json();
  if (!Array.isArray(data.tracks)) throw new Error("Réponse du catalogue musical invalide.");
  return data.tracks;
}

// Category → iTunes search term
export const MUSIC_CATEGORIES: { id: string; label: string; term: string }[] = [
  { id: "all",        label: "Pour vous",          term: "afrobeats top hits" },
  { id: "anniversaire",label: "Anniversaire",       term: "happy birthday celebration africa" },
  { id: "amoureux",  label: "Sortie en amoureux",  term: "afrobeats love romantic" },
  { id: "famille",   label: "Famille",              term: "africa family gospel" },
  { id: "sport",     label: "Sport",                term: "afrobeats workout motivation" },
  { id: "fete",      label: "Fête",                 term: "coupé décalé zouglou party" },
  { id: "motivation",label: "Motivation",            term: "rap afrique francophone motivation" },
  { id: "detente",   label: "Détente",              term: "afrobeats chill relax" },
];
