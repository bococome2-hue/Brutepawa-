export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  genre: string;
  previewUrl: string | null;
  artworkUrl: string | null;
}

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl?: string;
  artworkUrl60?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  kind?: string;
}

function msToTime(ms?: number): string {
  if (!ms) return "3:30";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toTrack(r: ItunesResult): Track {
  return {
    id: String(r.trackId),
    title: r.trackName ?? "Unknown",
    artist: r.artistName ?? "Unknown",
    duration: msToTime(r.trackTimeMillis),
    genre: r.primaryGenreName ?? "Afro",
    previewUrl: r.previewUrl ?? null,
    artworkUrl: r.artworkUrl60 ?? null,
  };
}

export async function searchItunes(term: string, limit = 50): Promise<Track[]> {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&entity=song&media=music&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("iTunes API error");
  const data: { results: ItunesResult[] } = await res.json();
  return data.results
    .filter(r => r.kind === "song" && r.trackId)
    .map(toTrack);
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
