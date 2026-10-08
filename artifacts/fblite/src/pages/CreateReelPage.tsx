import { useState, useRef } from "react";
import { useNavigate } from "../router";
import { useR2Upload } from "../hooks/useR2Upload";
import { apiCreatePost } from "../lib/api";

const POPULAR_MUSIC = [
  { id: 1, title: "Kpanlogo", artist: "Afro Moses", genre: "Highlife" },
  { id: 2, title: "Ye", artist: "Burna Boy", genre: "Afrobeats" },
  { id: 3, title: "Soco", artist: "Wizkid ft. Starboy", genre: "Afropop" },
  { id: 4, title: "Mama", artist: "Sauti Sol", genre: "Bongo" },
  { id: 5, title: "Djadja", artist: "Aya Nakamura", genre: "Afropop" },
  { id: 6, title: "One Dance", artist: "Drake", genre: "Afrobeats" },
  { id: 7, title: "Katapilla", artist: "Stonebwoy", genre: "Dancehall" },
  { id: 8, title: "Pull Up", artist: "Mr Eazi", genre: "Afrobeats" },
];

const GENRE_COLORS: Record<string, string> = {
  Highlife: "#8B5CF6", Afrobeats: "#D97706", Afropop: "#E91E63",
  Bongo: "#388E3C", Dancehall: "var(--bp-primary)",
};

export default function CreateReelPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, status: uploadStatus, progress } = useR2Upload();

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedMusic, setSelectedMusic] = useState<(typeof POPULAR_MUSIC)[0] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"gallery" | "music">("gallery");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";
    const preview = URL.createObjectURL(file);
    setVideoPreview(preview);
    setVideoUrl(null);
    const result = await upload(file);
    if (result) setVideoUrl(result.url);
    else { setVideoPreview(null); setError("Upload échoué"); }
  };

  const handlePublish = async () => {
    if (submitting) return;
    if (!videoUrl) { setError("Sélectionne d'abord une vidéo"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const musicTag = selectedMusic ? ` 🎵 ${selectedMusic.title} — ${selectedMusic.artist}` : "";
      await apiCreatePost(`🎬 Reel${caption ? ` · ${caption}` : ""}${musicTag}`, videoUrl);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#000", display: "flex", flexDirection: "column" }}>
      <input ref={fileRef} type="file" accept="video/*" style={{ display: "none" }} onChange={handleFileSelect} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", background: "rgba(0,0,0,0.8)", flexShrink: 0 }}>
        <button onClick={() => navigate("/")} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 17 }}>Créer un reel</div>
        <button
          onClick={handlePublish}
          disabled={!videoUrl || submitting}
          style={{ background: videoUrl && !submitting ? "var(--bp-primary)" : "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 20, padding: "8px 18px", fontSize: 14, fontWeight: 700, cursor: videoUrl && !submitting ? "pointer" : "not-allowed" }}
        >
          {submitting ? "Envoi…" : "Publier"}
        </button>
      </div>

      {/* Preview area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {videoPreview ? (
          <video src={videoPreview} style={{ width: "100%", height: "100%", objectFit: "contain" }} autoPlay loop muted playsInline />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <div style={{ fontSize: 72 }}>🎬</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, textAlign: "center" }}>Sélectionne une vidéo pour créer ton reel</div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ background: "var(--bp-primary)", border: "none", color: "#fff", borderRadius: 24, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
            >
              📱 Choisir une vidéo
            </button>
          </div>
        )}

        {/* Upload progress */}
        {uploadStatus === "uploading" && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
            <div style={{ height: 3, background: "rgba(255,255,255,0.3)" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--bp-primary)", transition: "width 0.2s" }} />
            </div>
          </div>
        )}

        {/* Music badge on preview */}
        {selectedMusic && videoPreview && (
          <div style={{
            position: "absolute", bottom: 16, left: 16, right: 16,
            background: "rgba(0,0,0,0.65)", borderRadius: 12, padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: GENRE_COLORS[selectedMusic.genre] ?? "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎵</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{selectedMusic.title}</div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{selectedMusic.artist}</div>
            </div>
            <button onClick={() => setSelectedMusic(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div style={{ background: "#111", padding: "0", flexShrink: 0 }}>
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #222" }}>
          {(["gallery", "music"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, background: "none", border: "none", padding: "14px", cursor: "pointer",
                color: tab === t ? "#fff" : "rgba(255,255,255,0.4)",
                fontWeight: 700, fontSize: 14,
                borderBottom: tab === t ? "2px solid var(--bp-primary)" : "2px solid transparent",
              }}
            >
              {t === "gallery" ? "📷 Galerie" : "🎵 Musique"}
            </button>
          ))}
        </div>

        {tab === "gallery" && (
          <div style={{ padding: "16px" }}>
            {error && <div style={{ color: "#FF5252", fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</div>}
            <textarea
              placeholder="Décris ton reel… (optionnel)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              style={{ width: "100%", background: "#1c1c1c", border: "1px solid #333", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, resize: "none", minHeight: 60, outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12 }}
              maxLength={150}
            />
            <button
              onClick={() => fileRef.current?.click()}
              style={{ width: "100%", background: "#222", border: "1px dashed #444", borderRadius: 10, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              {videoPreview ? "🔄 Changer la vidéo" : "📁 Sélectionner depuis la galerie"}
            </button>
          </div>
        )}

        {tab === "music" && (
          <div style={{ padding: "16px" }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 12 }}>Musique populaire</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
              {POPULAR_MUSIC.map(track => (
                <button
                  key={track.id}
                  onClick={() => setSelectedMusic(selectedMusic?.id === track.id ? null : track)}
                  style={{
                    background: selectedMusic?.id === track.id ? "rgba(24,119,242,0.15)" : "rgba(255,255,255,0.05)",
                    border: selectedMusic?.id === track.id ? "1.5px solid var(--bp-primary)" : "1.5px solid transparent",
                    borderRadius: 10, padding: "10px 14px",
                    display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: GENRE_COLORS[track.genre] ?? "#444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{track.artist} · {track.genre}</div>
                  </div>
                  {selectedMusic?.id === track.id && <span style={{ color: "var(--bp-primary)", fontSize: 18 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
