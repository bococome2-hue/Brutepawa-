import { useState, useRef, useEffect } from "react";
import { useNavigate } from "../router";
import { apiCreateStory } from "../lib/api";
import { useR2Upload } from "../hooks/useR2Upload";
import { storyDraftStore } from "../lib/storyDraft";
import { useCurrentUser } from "../hooks/useCurrentUser";
import {
  Type, Smile, Music2, Sparkles, PenLine, UserPlus, Link2, Crop,
  ChevronDown, X, Settings, ArrowRight, Globe, ImageIcon,
} from "lucide-react";
import MusicLibraryPage, { type MusicTrack } from "./MusicLibraryPage";

const BG_OPTIONS = [
  { id: "blue",    value: "var(--bp-primary)" },
  { id: "pink",    value: "#E91E63" },
  { id: "purple",  value: "#9C27B0" },
  { id: "orange",  value: "#D97706" },
  { id: "green",   value: "#388E3C" },
  { id: "black",   value: "#212121" },
  { id: "red",     value: "#D32F2F" },
  { id: "teal",    value: "#00838F" },
  { id: "grad1",   value: "linear-gradient(135deg,var(--bp-primary),#9C27B0)" },
  { id: "grad2",   value: "linear-gradient(135deg,#E91E63,#D97706)" },
  { id: "grad3",   value: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))" },
];

const EMOJIS = ["🔥","😊","❤️","🎉","💪","🌍","😍","🙏","✨","🎵","🌅","💼","🎓","🤝","🛍️","🏆"];

const TOOLS = [
  { id: "text",     Icon: Type,      label: "Texte" },
  { id: "sticker",  Icon: Smile,     label: "Stickers" },
  { id: "music",    Icon: Music2,    label: "Musique" },
  { id: "effects",  Icon: Sparkles,  label: "Effets" },
  { id: "draw",     Icon: PenLine,   label: "Dessin" },
  { id: "tag",      Icon: UserPlus,  label: "Identifier" },
  { id: "link",     Icon: Link2,     label: "Lien" },
  { id: "crop",     Icon: Crop,      label: "Recadrer" },
];

type ActiveTool = "text" | "sticker" | "music" | "effects" | "draw" | "tag" | "link" | "crop" | null;

export default function CreateStoryPage({ onCreated }: { onCreated?: () => void }) {
  const navigate = useNavigate();

  const user = useCurrentUser();

  const [mode, setMode] = useState<"text" | "photo">("text");
  const [text, setText] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_OPTIONS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audience, setAudience] = useState<"public" | "friends">("public");
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [draftText, setDraftText] = useState("");
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [musicCardVisible, setMusicCardVisible] = useState(false);
  const [showMusicOptions, setShowMusicOptions] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, status: uploadStatus, progress } = useR2Upload();

  useEffect(() => {
    const d = storyDraftStore.get();
    if (!d) return;
    storyDraftStore.clear();
    const { file } = d;
    const freshPreview = URL.createObjectURL(file);
    setPhotoPreview(freshPreview);
    setMode("photo");
    upload(file).then(result => {
      if (result) {
        setPhotoUrl(result.url);
        setThumbnailUrl(result.thumbnailUrl ?? null);
      }
    });
    return () => URL.revokeObjectURL(freshPreview);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (e.target) e.target.value = "";
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setPhotoUrl(null);
    const result = await upload(file);
    if (result) {
      setPhotoUrl(result.url);
      setThumbnailUrl(result.thumbnailUrl ?? null);
      setMode("photo");
    } else {
      setPhotoPreview(null);
    }
  };

  const handlePublish = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const musicPayload = selectedMusic ? {
        musicTrackName:  selectedMusic.title,
        musicArtist:     selectedMusic.artist,
        musicUrl:        selectedMusic.previewUrl || null,
        musicArtworkUrl: selectedMusic.coverUrl   || null,
      } : {};

      if (mode === "photo") {
        if (!photoUrl) { setError("Photo en cours d'upload, attends encore…"); setSubmitting(false); return; }
        await apiCreateStory({ mediaUrl: photoUrl, thumbnailUrl: thumbnailUrl ?? undefined, content: text.trim() || undefined, ...musicPayload });
      } else {
        if (!text.trim() && !selectedEmoji) { setError("Écris quelque chose ou choisis un emoji"); setSubmitting(false); return; }
        await apiCreateStory({ content: text.trim() || undefined, bgColor: selectedBg.value, emoji: selectedEmoji ?? undefined, ...musicPayload });
      }
      onCreated?.();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToolTap = (toolId: ActiveTool) => {
    if (toolId === "text") {
      setDraftText(text);
      setActiveTool(activeTool === "text" ? null : "text");
    } else if (toolId === "sticker") {
      setActiveTool(activeTool === "sticker" ? null : "sticker");
    } else if (toolId === "effects") {
      setActiveTool(activeTool === "effects" ? null : "effects");
    } else if (toolId === "music") {
      setShowMusicLibrary(true);
    } else {
      setActiveTool(null);
    }
  };

  const confirmText = () => {
    setText(draftText);
    setActiveTool(null);
    if (draftText.trim()) setMode("text");
  };

  const handleMusicSelect = (track: MusicTrack) => {
    setSelectedMusic(track);
    setShowMusicLibrary(false);
    setMusicCardVisible(false);
    requestAnimationFrame(() => setTimeout(() => setMusicCardVisible(true), 50));
  };

  const handleRemoveMusic = () => {
    setMusicCardVisible(false);
    setTimeout(() => setSelectedMusic(null), 300);
    setShowMusicOptions(false);
  };

  const canPublish = mode === "photo"
    ? (!!photoUrl && uploadStatus !== "uploading")
    : (!!text.trim() || !!selectedEmoji);

  const photoBackground = mode === "photo" && photoPreview
    ? `url(${photoPreview}) center/cover no-repeat`
    : undefined;

  const textBackground = mode === "text"
    ? selectedBg.value
    : undefined;

  const visibleTools = toolbarExpanded ? TOOLS : TOOLS;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", flexDirection: "column",
      background: photoBackground
        ? photoBackground
        : textBackground && mode === "text" && (text || selectedEmoji)
          ? textBackground
          : `
            radial-gradient(circle at 18% 8%, rgba(34,197,94,0.28), transparent 40%),
            radial-gradient(circle at 82% 88%, rgba(22,163,74,0.20), transparent 38%),
            radial-gradient(circle at 50% 48%, rgba(34,197,94,0.06), transparent 52%),
            linear-gradient(180deg, #052e16 0%, #052e16 45%, #052e16 100%)
          `,
      transition: "background 0.3s ease-out",
      overflow: "hidden",
    }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileSelect} />

      {/* Aurora vignette overlay */}
      {!photoPreview && !(mode === "text" && (text || selectedEmoji)) && (
        <>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
            background: "radial-gradient(ellipse at center, transparent 25%, rgba(2,21,13,0.65) 100%)",
          }} />
          {/* Aurora animated blob */}
          <div style={{
            position: "absolute", top: "8%", left: "5%",
            width: 220, height: 220, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 1,
            animation: "bpAurora 6s ease-in-out infinite alternate",
          }} />
          <div style={{
            position: "absolute", bottom: "20%", right: "8%",
            width: 160, height: 160, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(21,128,61,0.07) 0%, transparent 70%)",
            pointerEvents: "none", zIndex: 1,
            animation: "bpAurora 8s ease-in-out infinite alternate-reverse",
          }} />
        </>
      )}

      {/* BrutePawa logo watermark */}
      {!photoPreview && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 2, pointerEvents: "none",
          paddingRight: 120,
        }}>
          <img
            src="/bp-logo-b.jpeg"
            alt=""
            style={{
              width: "78%", maxWidth: 300, opacity: 0.13,
              filter: "blur(0.3px) saturate(0.4)",
              userSelect: "none",
              mixBlendMode: "luminosity",
            }}
          />
        </div>
      )}

      {/* STORY PROGRESS BARS */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", gap: 4, padding: "12px 12px 0",
      }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 999,
            background: i === 0
              ? "linear-gradient(90deg, var(--bp-primary), var(--bp-primary-dark))"
              : "rgba(255,255,255,0.15)",
            overflow: "hidden",
          }}>
            {i === 0 && (
              <div style={{
                height: "100%", width: "60%",
                background: "linear-gradient(90deg, var(--bp-primary), var(--bp-primary-dark))",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* HEADER */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px 8px",
      }}>
        {/* Left: close + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#fff", borderRadius: "50%",
              width: 38, height: 38, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 200ms ease-out",
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          {/* Avatar with ring */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", padding: 2,
              background: "linear-gradient(135deg, var(--bp-primary), var(--bp-primary-dark))",
              boxShadow: "0 0 25px rgba(34,197,94,0.35)",
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                overflow: "hidden", background: "#052e16",
                border: "1.5px solid #052e16",
              }}>
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg, var(--bp-primary), var(--bp-primary-dark))",
                    fontSize: 18, fontWeight: 800, color: "#fff",
                  }}>
                    {user?.name?.[0]?.toUpperCase() ?? "B"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title + audience */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Votre story</span>
              <ChevronDown size={14} color="#9CA3AF" strokeWidth={2} />
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 999, padding: "2px 8px",
              width: "fit-content",
            }}>
              <Globe size={10} color="var(--bp-primary)" strokeWidth={2} />
              <span style={{ color: "var(--bp-primary)", fontSize: 11, fontWeight: 600 }}>Public</span>
            </div>
          </div>
        </div>

        {/* Right: settings */}
        <button
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#9CA3AF", borderRadius: "50%",
            width: 38, height: 38, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 200ms ease-out",
          }}
        >
          <Settings size={18} strokeWidth={1.8} />
        </button>
      </div>

      {/* MAIN CANVAS AREA */}
      <div style={{ flex: 1, position: "relative", zIndex: 3 }}>

        {/* RIGHT TOOLBAR */}
        <div style={{
          position: "absolute", right: 12, top: 8,
          display: "flex", flexDirection: "column", gap: 8, zIndex: 20,
        }}>
          {visibleTools.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => handleToolTap(id as ActiveTool)}
              style={{
                background: activeTool === id
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(24px)",
                border: activeTool === id
                  ? "1px solid rgba(34,197,94,0.35)"
                  : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 24, height: 56,
                padding: "0 16px 0 12px",
                display: "flex", alignItems: "center", gap: 8,
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
                transition: "all 200ms ease-out",
                minWidth: 110,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            >
              <Icon size={22} color="var(--bp-primary)" strokeWidth={2} />
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{label}</span>
            </button>
          ))}

          {/* Chevron décoratif bas */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: 32, alignSelf: "center",
            opacity: 0.4,
          }}>
            <ChevronDown size={16} color="#9CA3AF" strokeWidth={2} />
          </div>
        </div>

        {/* CENTRAL BRAND — shown when no photo */}
        {!photoPreview && !(mode === "text" && (text || selectedEmoji)) && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 5,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 8, paddingRight: 130,
          }}>
            <h1 style={{
              margin: 0,
              fontFamily: "'Inter', 'SF Pro Display', sans-serif",
              fontSize: 42, fontWeight: 800, lineHeight: 1,
              letterSpacing: "-1px",
              color: "#fff",
              textShadow: "0 2px 24px rgba(0,0,0,0.4)",
            }}>
              Brute<span style={{
                color: "var(--bp-primary)",
                textShadow: "0 0 32px rgba(34,197,94,0.5), 0 2px 8px rgba(0,0,0,0.3)",
              }}>Pawa</span>
            </h1>
            <p style={{
              margin: 0, fontSize: 15, color: "#DCFCE7",
              fontWeight: 400, letterSpacing: "0.02em",
              textAlign: "center",
              textShadow: "0 1px 8px rgba(0,0,0,0.3)",
            }}>
              Réseau social de nouvelle génération
            </p>
            <div style={{ width: 36, height: 2.5, background: "linear-gradient(90deg, var(--bp-primary), var(--bp-primary-dark))", borderRadius: 999, marginTop: 6, boxShadow: "0 0 12px rgba(34,197,94,0.5)" }} />
          </div>
        )}

        {/* TEXT OVERLAY on canvas */}
        {text && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            paddingRight: 130,
          }}>
            <div style={{
              color: "#fff", fontWeight: 800, fontSize: 24, textAlign: "center",
              padding: "12px 20px", maxWidth: 220,
              textShadow: mode === "photo" ? "0 2px 8px rgba(0,0,0,0.9)" : "0 2px 4px rgba(0,0,0,0.3)",
              background: mode === "photo" ? "rgba(0,0,0,0.35)" : "transparent",
              borderRadius: 14, backdropFilter: mode === "photo" ? "blur(8px)" : "none",
            }}>
              {selectedEmoji && <div style={{ fontSize: 52, marginBottom: 8 }}>{selectedEmoji}</div>}
              {text}
            </div>
          </div>
        )}

        {/* Emoji only (no text) */}
        {selectedEmoji && !text && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            paddingRight: 130,
          }}>
            <div style={{ fontSize: 80, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))" }}>
              {selectedEmoji}
            </div>
          </div>
        )}

        {/* Photo choose placeholder */}
        {mode === "photo" && !photoPreview && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 7,
            display: "flex", alignItems: "center", justifyContent: "center",
            paddingRight: 130,
          }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(24px)",
                border: "1.5px dashed rgba(255,255,255,0.2)",
                borderRadius: 24, padding: "32px 40px",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 12,
                transition: "all 200ms ease-out",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <ImageIcon size={48} color="rgba(255,255,255,0.4)" strokeWidth={1.5} />
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600 }}>Choisir une photo</span>
            </button>
          </div>
        )}

        {/* Upload progress */}
        {uploadStatus === "uploading" && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, padding: "0 0 4px" }}>
            <div style={{ height: 4, background: "rgba(255,255,255,0.15)" }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: "linear-gradient(90deg, var(--bp-primary), var(--bp-primary-dark))",
                transition: "width 0.2s ease-out",
                borderRadius: 999,
              }} />
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, textAlign: "center", padding: "4px 0" }}>
              Upload… {progress}%
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM SECTION ── */}
      <div style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 12, margin: "0 14px 8px",
            color: "#FCA5A5", fontSize: 13, padding: "8px 14px", textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Ajouter un effet row */}
        <div style={{ padding: "0 14px 10px" }}>
          <button
            onClick={() => handleToolTap("effects")}
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20, padding: "10px 16px",
              display: "flex", alignItems: "center", gap: 8,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              transition: "all 200ms ease-out",
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <Sparkles size={16} color="var(--bp-primary)" strokeWidth={2} />
            <span style={{ color: "#E5E7EB", fontSize: 13, fontWeight: 500 }}>Ajouter un effet</span>
          </button>
        </div>

        {/* Sharing row */}
        <div style={{ display: "flex", gap: 8, padding: "0 14px 10px", alignItems: "stretch" }}>

          {/* Votre story */}
          <button
            onClick={() => setAudience("public")}
            style={{
              flex: 1,
              background: audience === "public"
                ? "rgba(34,197,94,0.12)"
                : "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              border: audience === "public"
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: "10px 12px",
              display: "flex", alignItems: "center", gap: 8,
              cursor: "pointer", textAlign: "left",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              transition: "all 200ms ease-out",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--bp-primary), var(--bp-primary-dark))",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                  {user?.name?.[0]?.toUpperCase() ?? "B"}
                </span>
              )}
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>Votre story</div>
              <div style={{ color: "#9CA3AF", fontSize: 10, marginTop: 1 }}>Public</div>
            </div>
          </button>

          {/* Amis proches */}
          <button
            onClick={() => setAudience("friends")}
            style={{
              flex: 1,
              background: audience === "friends"
                ? "rgba(34,197,94,0.12)"
                : "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              border: audience === "friends"
                ? "1px solid rgba(34,197,94,0.3)"
                : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: "10px 12px",
              display: "flex", alignItems: "center", gap: 8,
              cursor: "pointer", textAlign: "left",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              transition: "all 200ms ease-out",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>Amis proches</div>
              <div style={{ color: "#9CA3AF", fontSize: 10, marginTop: 1 }}>Seulement eux</div>
            </div>
          </button>

          {/* Partager maintenant */}
          <button
            onClick={handlePublish}
            disabled={!canPublish || submitting}
            style={{
              flex: 1.2,
              background: canPublish && !submitting
                ? "linear-gradient(135deg, var(--bp-primary), var(--bp-primary-dark))"
                : "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: 20,
              padding: "10px 14px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              cursor: canPublish && !submitting ? "pointer" : "not-allowed",
              boxShadow: canPublish && !submitting
                ? "0 10px 40px rgba(34,197,94,0.35)"
                : "none",
              transition: "all 200ms ease-out",
              height: 60,
            }}
            onMouseEnter={e => { if (canPublish && !submitting) e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            onMouseDown={e => { if (canPublish && !submitting) e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e => (e.currentTarget.style.transform = "translateY(0)")}
          >
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
              {submitting ? "Publication…" : uploadStatus === "uploading" ? `${progress}%…` : "Partager maintenant"}
            </span>
            {!submitting && uploadStatus !== "uploading" && (
              <ArrowRight size={16} color="#fff" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* DYNAMIC MUSIC CARD — Instagram/TikTok style */}
        {selectedMusic && (
          <div
            onClick={() => setShowMusicOptions(v => !v)}
            style={{
              margin: "0 14px 14px",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(20px)",
              borderRadius: 20,
              padding: "11px 14px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15)",
              cursor: "pointer",
              opacity: musicCardVisible ? 1 : 0,
              transform: musicCardVisible ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 300ms ease, transform 300ms cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            {/* Album art */}
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: selectedMusic.coverColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}>
              {selectedMusic.coverEmoji}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "var(--theme-text)", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedMusic.title}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <Music2 size={10} color="#64748B" strokeWidth={2} />
                <span style={{ color: "#64748B", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedMusic.artist}
                </span>
              </div>
            </div>

            {/* Animated equalizer */}
            <div style={{ display: "flex", gap: 2.5, alignItems: "flex-end", height: 22, flexShrink: 0 }}>
              {[10, 18, 12, 20, 8, 16, 10].map((h, i) => (
                <div key={i} style={{
                  width: 3, borderRadius: 2,
                  background: "linear-gradient(180deg,var(--bp-primary),var(--bp-primary-dark))",
                  animation: `bpWave 0.75s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.09}s`,
                  height: h,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Music options popup */}
        {showMusicOptions && selectedMusic && (
          <div style={{
            position: "absolute", bottom: 80, left: 14, right: 14, zIndex: 55,
            background: "rgba(3,26,16,0.97)",
            backdropFilter: "blur(30px)",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            animation: "bpSlideUp 200ms cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <button
              onClick={() => { setShowMusicOptions(false); setShowMusicLibrary(true); }}
              style={{
                width: "100%", padding: "15px 18px", background: "none", border: "none",
                color: "#F1F5F9", fontSize: 15, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ width:36,height:36,borderRadius:"50%",background:"rgba(34,197,94,0.15)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <Music2 size={16} color="var(--bp-primary)" strokeWidth={2}/>
              </div>
              Changer la musique
            </button>
            <button
              onClick={handleRemoveMusic}
              style={{
                width: "100%", padding: "15px 18px", background: "none", border: "none",
                color: "#EF4444", fontSize: 15, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12, textAlign: "left",
              }}
            >
              <div style={{ width:36,height:36,borderRadius:"50%",background:"rgba(239,68,68,0.12)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <X size={16} color="#EF4444" strokeWidth={2.5}/>
              </div>
              Supprimer la musique
            </button>
          </div>
        )}
      </div>

      {/* ── TOOL OVERLAYS ── */}

      {/* TEXT TOOL OVERLAY */}
      {activeTool === "text" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 50,
          background: "rgba(2,21,13,0.85)",
          backdropFilter: "blur(20px)",
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          padding: "0 16px 24px",
        }}>
          <div style={{ marginBottom: 12 }}>
            <textarea
              autoFocus
              placeholder="Tapez votre message…"
              value={draftText}
              onChange={e => setDraftText(e.target.value)}
              style={{
                width: "100%", padding: "14px 16px",
                borderRadius: 18,
                border: "1px solid rgba(34,197,94,0.3)",
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(12px)",
                color: "#fff", fontSize: 16, resize: "none",
                minHeight: 80, outline: "none",
                fontFamily: "inherit", boxSizing: "border-box",
                lineHeight: 1.5,
              }}
              maxLength={200}
            />
          </div>

          {/* Bg colors */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", padding: "0 0 12px" }}>
            {BG_OPTIONS.map(bg => (
              <button
                key={bg.id}
                onClick={() => setSelectedBg(bg)}
                style={{
                  flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
                  background: bg.value,
                  border: selectedBg.id === bg.id
                    ? "3px solid var(--bp-primary)"
                    : "2px solid rgba(255,255,255,0.15)",
                  boxShadow: selectedBg.id === bg.id ? "0 0 0 2px rgba(34,197,94,0.4)" : "none",
                  cursor: "pointer", transition: "all 200ms ease-out",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setActiveTool(null)}
              style={{
                flex: 1, padding: "14px", borderRadius: 20,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#E5E7EB", fontWeight: 600, fontSize: 15, cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={confirmText}
              style={{
                flex: 2, padding: "14px", borderRadius: 20,
                background: "linear-gradient(135deg, var(--bp-primary), var(--bp-primary-dark))",
                border: "none",
                color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
                boxShadow: "0 8px 32px rgba(34,197,94,0.3)",
              }}
            >
              Appliquer
            </button>
          </div>
        </div>
      )}

      {/* STICKER TOOL OVERLAY */}
      {activeTool === "sticker" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "rgba(3,36,23,0.95)",
          backdropFilter: "blur(30px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "28px 28px 0 0",
          padding: "20px 16px 32px",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.4)",
        }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 999, margin: "0 auto 12px" }} />
            <span style={{ color: "#9CA3AF", fontSize: 13, fontWeight: 600 }}>Choisir un sticker</span>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8,
          }}>
            <button
              onClick={() => { setSelectedEmoji(null); setActiveTool(null); }}
              style={{
                width: "100%", aspectRatio: "1", borderRadius: "50%",
                border: !selectedEmoji ? "2px solid var(--bp-primary)" : "2px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                cursor: "pointer", fontSize: 14, color: "#E5E7EB",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
            {EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => { setSelectedEmoji(selectedEmoji === e ? null : e); setActiveTool(null); }}
                style={{
                  width: "100%", aspectRatio: "1", borderRadius: "50%",
                  border: selectedEmoji === e ? "2px solid var(--bp-primary)" : "2px solid rgba(255,255,255,0.08)",
                  background: selectedEmoji === e ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer", fontSize: 22,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 200ms ease-out",
                }}
              >{e}</button>
            ))}
          </div>
        </div>
      )}

      {/* EFFECTS OVERLAY */}
      {activeTool === "effects" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "rgba(3,36,23,0.95)",
          backdropFilter: "blur(30px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "28px 28px 0 0",
          padding: "20px 16px 40px",
        }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 999, margin: "0 auto 12px" }} />
            <span style={{ color: "#E5E7EB", fontSize: 15, fontWeight: 700 }}>Effets visuels</span>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 8 }}>
            {["Flou doux","Grain film","Rétro","Néon vert","Noir & blanc","Saturé"].map((fx) => (
              <button
                key={fx}
                onClick={() => setActiveTool(null)}
                style={{
                  flexShrink: 0, padding: "10px 16px",
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 999, color: "#E5E7EB", fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "all 200ms ease-out",
                  whiteSpace: "nowrap",
                }}
              >{fx}</button>
            ))}
          </div>
          <button
            onClick={() => setActiveTool(null)}
            style={{
              width: "100%", marginTop: 16, padding: "14px",
              borderRadius: 20, background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#9CA3AF", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >Fermer</button>
        </div>
      )}

      {/* Photo change button (when photo is loaded) */}
      {mode === "photo" && photoPreview && (
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            position: "absolute", top: 90, left: 14, zIndex: 20,
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20, padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 6,
            color: "#E5E7EB", fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 200ms ease-out",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <ImageIcon size={14} color="var(--bp-primary)" strokeWidth={2} />
          Changer
        </button>
      )}

      {/* Text/Photo mode toggle */}
      {!photoPreview && (
        <button
          onClick={() => {
            if (mode === "photo") { setMode("text"); setPhotoPreview(null); setPhotoUrl(null); }
            else { setMode("photo"); fileRef.current?.click(); }
          }}
          style={{
            position: "absolute", top: 90, left: 14, zIndex: 20,
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20, padding: "8px 14px",
            display: "flex", alignItems: "center", gap: 6,
            color: "#E5E7EB", fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 200ms ease-out",
          }}
        >
          <ImageIcon size={14} color="var(--bp-primary)" strokeWidth={2} />
          {mode === "photo" ? "Mode texte" : "Ajouter photo"}
        </button>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes bpWave {
          from { opacity: 0.5; transform: scaleY(0.6); }
          to   { opacity: 1;   transform: scaleY(1.0); }
        }
        @keyframes bpAurora {
          0%   { opacity: 0.6; transform: scale(1) translate(0, 0); }
          50%  { opacity: 1;   transform: scale(1.15) translate(6px, -8px); }
          100% { opacity: 0.7; transform: scale(0.95) translate(-4px, 6px); }
        }
        @keyframes bpSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>

      {/* MUSIC LIBRARY FULL-PAGE OVERLAY */}
      {showMusicLibrary && (
        <MusicLibraryPage
          onSelect={handleMusicSelect}
          onClose={() => setShowMusicLibrary(false)}
          initialTrack={selectedMusic}
        />
      )}
    </div>
  );
}
