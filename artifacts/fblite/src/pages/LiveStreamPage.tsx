import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "../router";
import { useCloudflareStream } from "../hooks/useCloudflareStream";
import { getBpToken } from "../lib/api";
import GiftPicker from "../components/GiftPicker";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { trackEvent } from "../lib/analytics";

const REACTIONS = ["❤️", "😍", "🔥", "👏", "😂", "🎉"];

interface LiveComment { id: number; user: string; text: string; }
interface FloatingReaction { id: number; emoji: string; x: number; }

export default function LiveStreamPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const userInitials = user.name ? user.name.slice(0, 2).toUpperCase() : "ME";
  const userId = user.email || user.name || "anonymous";

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFront, setCameraFront] = useState(true);
  const [cameraFlipping, setCameraFlipping] = useState(false);
  const [muted, setMuted] = useState(false);

  const [duration, setDuration] = useState(0);
  const [viewers, setViewers] = useState(0);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [eligibility, setEligibility] = useState<{ canGoLive: boolean; followersCount: number } | null>(null);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  interface FloatingGift { id: number; emoji: string; senderName: string; giftName: string; x: number; }
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);

  interface GiftFeedEntry { id: number; emoji: string; senderName: string; giftName: string; }
  const [giftFeedEntries, setGiftFeedEntries] = useState<GiftFeedEntry[]>([]);
  const giftFeedIdRef = useRef(0);
  const giftFeedBottomRef = useRef<HTMLDivElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  const cfStream = useCloudflareStream();
  const isLive = cfStream.status === "live";
  const isConnecting = cfStream.status === "connecting" || cfStream.status === "creating";

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const acquireCamera = async (front = true): Promise<MediaStream> => {
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: front ? "user" : "environment" }, audio: true },
      { video: true, audio: true },
      { video: true, audio: false },
    ];
    let lastErr: unknown = null;
    for (const constraints of attempts) {
      for (let retry = 0; retry < 5; retry++) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
          lastErr = e;
          const name = (e instanceof DOMException) ? e.name : "";
          if (name === "NotAllowedError" || name === "SecurityError") throw e;
          if (name !== "NotReadableError") break;
          if (retry < 4) await new Promise(r => setTimeout(r, 1200));
        }
      }
    }
    throw lastErr;
  };

  const initCamera = useCallback(async (front = true) => {
    setCameraError(null);
    setCameraLoading(true);
    try {
      stopLocalStream();
      const stream = await acquireCamera(front);
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (e) {
      const name = (e instanceof DOMException) ? e.name : "";
      if (name === "NotAllowedError") {
        setCameraError("Accès refusé — touchez l'icône 🔒 dans la barre d'adresse et autorisez la caméra.");
      } else if (name === "NotFoundError") {
        setCameraError("Aucune caméra détectée sur cet appareil.");
      } else if (name === "NotReadableError") {
        setCameraError("La caméra est utilisée dans un autre onglet. Fermez les autres onglets Brute Pawa puis revenez ici.");
      } else {
        setCameraError(`Caméra indisponible (${name || "inconnue"}). Réessayez.`);
      }
    } finally {
      setCameraLoading(false);
    }
  }, [stopLocalStream]);

  useEffect(() => {
    initCamera();
    return () => {
      stopLocalStream();
      cfStream.stopLocalTracks();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cameraReady) return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && !cameraReady) initCamera();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [cameraReady, initCamera]);

  useEffect(() => {
    if (!isLive) return;
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive]);

  // Fetch eligibility (follower gate) on mount
  useEffect(() => {
    const token = getBpToken();
    if (!token) return;
    fetch("/api/stream/live/eligibility", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { canGoLive: boolean; followersCount: number } | null) => {
        if (data) setEligibility(data);
      })
      .catch(() => {});
  }, []);

  // Load token balance
  useEffect(() => {
    const token = getBpToken();
    if (!token) return;
    fetch("/api/creator/wallet", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { tokenBalance?: number }) => { if (d.tokenBalance !== undefined) setTokenBalance(d.tokenBalance); })
      .catch(() => {});
  }, []);

  // SSE — subscribe to incoming gift + chat events when live
  useEffect(() => {
    if (!isLive || !cfStream.session?.id) return;
    const dbId = cfStream.session.id;
    const es = new EventSource(`/api/stream/live/${dbId}/events`);
    sseRef.current = es;

    es.addEventListener("gift", (evt) => {
      try {
        const g = JSON.parse((evt as MessageEvent).data) as { id: number; giftEmoji: string; senderName: string; giftName: string };
        const x = 10 + Math.random() * 60;
        const newGift = { id: g.id, emoji: g.giftEmoji, senderName: g.senderName, giftName: g.giftName, x };
        setFloatingGifts(prev => [...prev, newGift]);
        setTimeout(() => setFloatingGifts(prev => prev.filter(fg => fg.id !== newGift.id)), 3500);
        setComments(prev => [...prev.slice(-30), {
          id: Date.now(),
          user: g.senderName || "Anonyme",
          text: `a envoyé ${g.giftEmoji} ${g.giftName} !`,
        }]);
        // Feed overlay entry — auto-expires after 4 s
        const fid = ++giftFeedIdRef.current;
        const feedEntry = { id: fid, emoji: g.giftEmoji || "🎁", senderName: g.senderName || "Anonyme", giftName: g.giftName || "Cadeau" };
        setGiftFeedEntries(prev => [...prev.slice(-19), feedEntry]);
        setTimeout(() => setGiftFeedEntries(prev => prev.filter(fe => fe.id !== fid)), 4000);
      } catch { /* ignore */ }
    });

    es.addEventListener("chat", (evt) => {
      try {
        const m = JSON.parse((evt as MessageEvent).data) as { userName: string; userFlag?: string; content: string };
        setComments(prev => [...prev.slice(-30), {
          id: Date.now() + Math.random(),
          user: (m.userFlag ? `${m.userFlag} ` : "") + (m.userName || "Anonyme"),
          text: m.content,
        }]);
      } catch { /* ignore */ }
    });

    es.addEventListener("join", (evt) => {
      try {
        const m = JSON.parse((evt as MessageEvent).data) as { userName: string; userFlag?: string };
        setComments(prev => [...prev.slice(-30), {
          id: Date.now() + Math.random(),
          user: "👋",
          text: `${m.userFlag ? `${m.userFlag} ` : ""}${m.userName || "Anonyme"} a rejoint le live`,
        }]);
      } catch { /* ignore */ }
    });

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [isLive, cfStream.session?.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    giftFeedBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [giftFeedEntries]);

  const goLive = async () => {
    if (!localStreamRef.current) return;
    await cfStream.startStream(localStreamRef.current, {
      userId,
      userName: user.name ?? "",
      userFlag: user.flag ?? "",
    });
    trackEvent("live_started", { camera_facing: cameraFront ? "front" : "rear", audio_enabled: !muted });
  };

  const flipCamera = async () => {
    setCameraFlipping(true);
    const newFront = !cameraFront;
    await initCamera(newFront);
    setCameraFront(newFront);
    setCameraFlipping(false);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = muted; });
    }
    setMuted(m => !m);
  };

  const sendReaction = (emoji: string) => {
    const id = Date.now() + Math.random();
    const x = 20 + Math.random() * 50;
    setFloatingReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2500);
    setReactingEmoji(emoji);
    setTimeout(() => setReactingEmoji(null), 350);
  };

  const sendComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    setNewComment("");
    setShowCommentInput(false);
    // Optimistic: add locally immediately
    setComments(prev => [...prev.slice(-30), { id: Date.now(), user: (user.name ?? "").split(" ")[0], text }]);
    // Persist to the server if we're live so viewers also see it
    if (isLive && cfStream.session?.id) {
      const token = getBpToken();
      fetch(`/api/stream/live/${cfStream.session.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      }).catch(() => {});
    }
  };

  const endLive = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await cfStream.stopStream();
    stopLocalStream();
    navigate("/");
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── PRE-LAUNCH SCREEN ──────────────────────────────────────────────────────
  const GOAL_FOLLOWERS = 7000;
  const followPct = eligibility ? Math.min(100, (eligibility.followersCount / GOAL_FOLLOWERS) * 100) : 0;
  const locked = eligibility !== null && !eligibility.canGoLive;

  if (!isLive) {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#000", zIndex: 100,
        display: "flex", flexDirection: "column", alignItems: "stretch",
      }}>
        {/* Camera preview fills screen */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover",
            transform: cameraFront ? "scaleX(-1)" : "scaleX(1)",
            opacity: cameraReady ? 1 : 0,
            transition: "opacity 0.4s",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.62)", pointerEvents: "none" }} />

        {/* Top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 16px", zIndex: 10 }}>
          <button onClick={() => { stopLocalStream(); navigate("/"); }} style={{
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", border: "none", borderRadius: "50%",
            width: 44, height: 44, color: "#fff", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Fermer</span>

          {cameraReady && !isConnecting && (
            <button onClick={flipCamera} style={{
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)", border: "none", borderRadius: "50%",
              width: 44, height: 44, color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.3s",
              transform: cameraFlipping ? "rotate(180deg)" : "rotate(0deg)",
            }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M20 5h-3.17L15 3H9L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-10 9V9l5 2.5-5 2.5z"/></svg>
            </button>
          )}
          {(!cameraReady || isConnecting) && <div style={{ width: 44 }} />}
        </div>

        {/* Main content */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 0, padding: "0 24px",
        }}>
          {/* Title */}
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 32, textAlign: "center", lineHeight: 1.1, marginBottom: 4 }}>
            Lancer
          </div>
          <div style={{ color: "var(--bp-primary)", fontWeight: 900, fontSize: 32, textAlign: "center", lineHeight: 1.1, marginBottom: 24 }}>
            un direct
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center", marginBottom: 24 }}>
            Partagez votre moment avec<br />la communauté <strong style={{ color: "var(--bp-primary)" }}>BrutePawa</strong>
          </div>

          {/* Camera loading */}
          {cameraLoading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "var(--bp-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>Connexion à la caméra…</div>
            </div>
          )}
          {isConnecting && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.2)", borderTopColor: "var(--bp-primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                {cfStream.status === "creating" ? "Création du flux…" : "Connexion WebRTC…"}
              </div>
            </div>
          )}

          {/* Follower gate card */}
          {eligibility !== null && (
            <div style={{
              width: "100%", maxWidth: 360,
              background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20,
              padding: "20px 22px", marginBottom: 20,
            }}>
              {locked ? (
                <>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(22,194,74,0.4)" }}>
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="#fff"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                    </div>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center", marginBottom: 12, lineHeight: 1.5 }}>
                    Le direct est disponible à partir de <strong style={{ color: "var(--bp-primary)", fontSize: 15 }}>{GOAL_FOLLOWERS.toLocaleString("fr-FR")} abonnés</strong>
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${followPct}%`, background: "linear-gradient(90deg,var(--bp-primary),var(--bp-primary))", borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                      <span>{eligibility.followersCount.toLocaleString("fr-FR")} abonné{eligibility.followersCount !== 1 ? "s" : ""}</span>
                      <span>{GOAL_FOLLOWERS.toLocaleString("fr-FR")} abonnés</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="var(--bp-primary)"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
                    Continuez à publier du contenu pour débloquer cette fonctionnalité.
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", color: "var(--bp-primary)", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--bp-primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Vous êtes éligible au direct !
                </div>
              )}
            </div>
          )}

          {/* Feature icons */}
          {!isConnecting && (
            <div style={{ display: "flex", gap: 16, justifyContent: "center", width: "100%", maxWidth: 360, marginBottom: 24 }}>
              {[
                { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>, label: "Diffusion HD" },
                { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>, label: "Chat temps réel" },
                { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>, label: "Modération" },
                { icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--bp-primary)"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>, label: "Partage instantané" },
              ].map(f => (
                <div key={f.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", backdropFilter: "blur(6px)", borderRadius: 14, padding: "12px 6px" }}>
                  {f.icon}
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 1.3 }}>{f.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {cameraError && (
            <div style={{ background: "rgba(244,67,54,0.15)", border: "1px solid rgba(244,67,54,0.5)", borderRadius: 14, padding: "12px 16px", maxWidth: 320, marginBottom: 16, lineHeight: 1.5 }}>
              <div style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>⚠️ {cameraError}</div>
            </div>
          )}
          {cfStream.error && (
            <div style={{ background: "rgba(244,67,54,0.15)", border: "1px solid rgba(244,67,54,0.5)", borderRadius: 14, padding: "12px 16px", maxWidth: 320, marginBottom: 16 }}>
              <div style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>⚠️ {cfStream.error}</div>
            </div>
          )}

          {/* Buttons */}
          {!isConnecting && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
              {cameraReady && (
                <button
                  onClick={goLive}
                  disabled={locked}
                  style={{
                    background: locked ? "rgba(255,255,255,0.12)" : "linear-gradient(135deg,var(--bp-primary),var(--bp-primary))",
                    border: locked ? "1px solid rgba(255,255,255,0.15)" : "none",
                    borderRadius: 50, padding: "16px 0", color: locked ? "rgba(255,255,255,0.4)" : "#fff",
                    fontWeight: 900, fontSize: 16, cursor: locked ? "not-allowed" : "pointer", width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    boxShadow: locked ? "none" : "0 6px 28px rgba(22,194,74,0.5)",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill={locked ? "rgba(255,255,255,0.4)" : "#fff"}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                  Démarrer le direct
                  {locked && <svg viewBox="0 0 24 24" width="18" height="18" fill="rgba(255,255,255,0.35)"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>}
                </button>
              )}
              {(cameraError || (!cameraReady && !cameraLoading)) && (
                <button onClick={() => initCamera(cameraFront)} style={{
                  background: "#0EA5E9", border: "none", borderRadius: 50,
                  padding: "14px 0", color: "#fff", fontWeight: 800, fontSize: 15,
                  cursor: "pointer", width: "100%",
                }}>
                  Réessayer
                </button>
              )}
              <button onClick={() => { stopLocalStream(); navigate("/"); }} style={{
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 50, padding: "14px 0", color: "#fff", fontWeight: 700,
                fontSize: 15, cursor: "pointer", width: "100%",
              }}>
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Tip at bottom */}
        {!isConnecting && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 20px 32px", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(22,194,74,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--bp-primary)"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>
            </div>
            <div>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Astuce : publiez régulièrement du contenu </span>
              <span style={{ color: "var(--bp-primary)", fontSize: 12, fontWeight: 700 }}>pour augmenter rapidement votre audience.</span>
            </div>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="rgba(255,255,255,0.25)" style={{ flexShrink: 0, marginLeft: "auto" }}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // ── LIVE SCREEN ──────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 100, overflow: "hidden" }}>

      {/* Full-screen camera */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover",
          transform: `${cameraFront ? "scaleX(-1)" : "scaleX(1)"} ${cameraFlipping ? "scaleY(0)" : "scaleY(1)"}`,
          transition: "transform 0.3s",
        }}
      />

      {/* Gradients */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.7) 100%)",
        pointerEvents: "none",
      }} />

      {/* Floating reactions */}
      {floatingReactions.map(r => (
        <div key={r.id} style={{
          position: "absolute", bottom: 180, left: `${r.x}%`,
          fontSize: 28, pointerEvents: "none",
          animation: "floatUp 2.5s ease-out forwards",
        }}>
          {r.emoji}
        </div>
      ))}

      {/* Floating gifts from SSE */}
      {floatingGifts.map(g => (
        <div key={g.id} style={{
          position: "absolute", bottom: 220, left: `${g.x}%`,
          pointerEvents: "none", textAlign: "center",
          animation: "floatUp 3.5s ease-out forwards",
          zIndex: 15,
        }}>
          <div style={{ fontSize: 40 }}>{g.emoji}</div>
          <div style={{
            background: "rgba(233,30,140,0.85)", borderRadius: 12, padding: "3px 8px",
            fontSize: 11, color: "#fff", fontWeight: 700, marginTop: 2, whiteSpace: "nowrap",
          }}>
            {g.senderName || "Anonyme"}
          </div>
        </div>
      ))}

      {/* Gift feed overlay — mirrors viewer's feed, auto-expires after 4 s */}
      {giftFeedEntries.length > 0 && (
        <div style={{
          position: "absolute",
          top: 120,
          left: 12,
          maxWidth: "calc(100% - 24px)",
          maxHeight: 200,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          pointerEvents: "none",
          zIndex: 20,
          scrollbarWidth: "none",
        }}>
          {giftFeedEntries.map(fe => (
            <div key={fe.id} style={{
              display: "inline-flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 6,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
              borderRadius: 20,
              padding: "5px 14px 5px 10px",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              whiteSpace: "nowrap",
              animation: "feedSlideIn 0.3s ease-out",
            }}>
              <span style={{ fontSize: 20 }}>{fe.emoji}</span>
              <span style={{ color: "#FBBF24" }}>{fe.senderName}</span>
              <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.8)" }}>a envoyé</span>
              <span style={{ color: "#E91E63" }}>{fe.giftName}</span>
            </div>
          ))}
          <div ref={giftFeedBottomRef} />
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "16px 14px 12px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          background: "#EF4444", borderRadius: 6, padding: "4px 10px",
          fontWeight: 900, fontSize: 13, color: "#fff", letterSpacing: 0.5, flexShrink: 0,
        }}>
          EN DIRECT
        </div>
        <div style={{
          background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: "4px 10px",
          fontSize: 13, color: "#fff", fontWeight: 700, backdropFilter: "blur(4px)",
        }}>
          {fmtTime(duration)}
        </div>
        <div style={{
          background: "rgba(0,0,0,0.5)", borderRadius: 20, padding: "4px 10px",
          fontSize: 13, color: "#fff", fontWeight: 600, backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          👁 {viewers}
        </div>
        <div style={{ flex: 1 }} />
        {/* Token earnings badge */}
        {tokenBalance > 0 && (
          <div style={{
            background: "rgba(233,30,140,0.75)", borderRadius: 20, padding: "4px 10px",
            fontSize: 13, color: "#fff", fontWeight: 700, backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            🪙 {tokenBalance.toLocaleString()}
          </div>
        )}
        <button onClick={toggleMute} style={{
          background: muted ? "rgba(244,67,54,0.8)" : "rgba(0,0,0,0.5)",
          border: "none", borderRadius: "50%", width: 36, height: 36,
          color: "#fff", fontSize: 17, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          {muted ? "🔇" : "🎙️"}
        </button>
        <button onClick={flipCamera} disabled={cameraFlipping} style={{
          background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
          width: 36, height: 36, color: "#fff", fontSize: 17, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
          transition: "transform 0.4s",
          transform: cameraFlipping ? "rotate(180deg)" : "rotate(0deg)",
          opacity: cameraFlipping ? 0.5 : 1,
        }}>
          🔁
        </button>
      </div>

      {/* Streamer info */}
      <div style={{
        position: "absolute", top: 70, left: 14,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%", background: "var(--bp-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 13, border: "2px solid #fff",
        }}>{userInitials}</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{user.name} {user.flag}</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>🌐 Public</div>
        </div>
      </div>

      {/* ── BOTTOM SECTION ── */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 10px 32px" }}>

        {/* Comments scroll */}
        <div style={{
          maxHeight: 180, overflowY: "auto", marginBottom: 12,
          scrollbarWidth: "none", display: "flex", flexDirection: "column", gap: 6,
        }}>
          {comments.map(c => (
            <div key={c.id} style={{
              display: "inline-flex", alignItems: "baseline", gap: 5,
              background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
              borderRadius: 20, padding: "6px 12px",
              maxWidth: "80%", alignSelf: "flex-start",
            }}>
              <span style={{ color: "#0EA5E9", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>{c.user}</span>
              <span style={{ color: "#fff", fontSize: 13 }}>{c.text}</span>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* Comment input */}
        {showCommentInput && (
          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <input
              autoFocus
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendComment(); }}
              placeholder="Écrire un commentaire..."
              style={{
                flex: 1, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 22, padding: "10px 16px", fontSize: 14, color: "#fff",
                outline: "none", backdropFilter: "blur(4px)",
              }}
            />
            <button onClick={sendComment} style={{
              background: "var(--bp-primary)", border: "none", borderRadius: "50%",
              width: 40, height: 40, color: "#fff", fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>➤</button>
            <button onClick={() => setShowCommentInput(false)} style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
              width: 40, height: 40, color: "#fff", fontSize: 16, cursor: "pointer", flexShrink: 0,
            }}>✕</button>
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Compact emoji pills */}
          <div style={{
            display: "flex", gap: 3,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)",
            borderRadius: 30, padding: "5px 8px",
          }}>
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => sendReaction(emoji)} style={{
                background: "none", border: "none", padding: "2px 3px",
                fontSize: 22, cursor: "pointer", lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                transform: reactingEmoji === emoji ? "scale(1.55)" : "scale(1)",
                transition: "transform 0.15s cubic-bezier(.34,1.8,.64,1)",
                filter: reactingEmoji === emoji ? "drop-shadow(0 0 6px rgba(255,255,255,0.8))" : "none",
              }}>
                {emoji}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowCommentInput(v => !v)} style={{
            background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
            width: 38, height: 38, fontSize: 18, cursor: "pointer",
            backdropFilter: "blur(4px)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>💬</button>
          <button onClick={() => setShowGiftPicker(true)} style={{
            background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary))", border: "none", borderRadius: "50%",
            width: 38, height: 38, cursor: "pointer",
            boxShadow: "0 0 14px rgba(22,194,74,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M20 6h-2.18c.07-.31.18-.59.18-.9C18 3.4 16.6 2 14.9 2c-.92 0-1.73.42-2.3 1.08L12 3.7l-.6-.62C10.83 2.42 10.02 2 9.1 2 7.4 2 6 3.4 6 5.1c0 .31.11.59.18.9H4c-1.11 0-2 .89-2 2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>
          </button>
          <button onClick={() => {
            navigator.share?.({
              title: `${user.name} est en direct sur Brute Pawa`,
              url: window.location.href,
            }).catch(() => {});
          }} style={{
            background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%",
            width: 38, height: 38, fontSize: 18, cursor: "pointer",
            backdropFilter: "blur(4px)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>➦</button>
          <button onClick={() => setShowConfirmEnd(true)} style={{
            background: "#EF4444", border: "none", borderRadius: 20,
            padding: "9px 14px", color: "#fff", fontWeight: 800, fontSize: 13,
            cursor: "pointer", boxShadow: "0 2px 10px rgba(244,67,54,0.5)",
            whiteSpace: "nowrap",
          }}>
            Terminer
          </button>
        </div>
      </div>

      {/* Gift panel — shows received gifts for this live */}
      {showGiftPicker && (
        <div
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 30, display: "flex", alignItems: "flex-end" }}
          onClick={e => { if (e.target === e.currentTarget) setShowGiftPicker(false); }}
        >
          <div style={{ width: "100%", background: "#0d1b2a", borderRadius: "20px 20px 0 0", padding: "20px 16px 36px", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>🎁 Cadeaux reçus</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: "#FBBF24" }}>🪙 {tokenBalance.toLocaleString()}</div>
            </div>
            {floatingGifts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎁</div>
                <div>Les spectateurs peuvent vous envoyer des cadeaux</div>
                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>Ils apparaîtront ici en temps réel</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                {floatingGifts.map(g => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 14px" }}>
                    <div style={{ fontSize: 30 }}>{g.emoji}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{g.senderName || "Anonyme"}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>a envoyé {g.giftName}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowGiftPicker(false)} style={{ width: "100%", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 12, padding: 12, fontWeight: 700, fontSize: 14, marginTop: 16, cursor: "pointer" }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Confirm end modal */}
      {showConfirmEnd && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20, padding: 32,
        }}>
          <div style={{
            background: "#1e1e2e", borderRadius: 20, padding: 28, width: "100%", maxWidth: 300, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔴</div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Terminer le direct ?</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 24 }}>
              {viewers} spectateurs regardent. Êtes-vous sûr de vouloir terminer ?
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setShowConfirmEnd(false)} style={{
                flex: 1, background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10,
                padding: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>Continuer</button>
              <button onClick={endLive} style={{
                flex: 1, background: "#EF4444", border: "none", borderRadius: 10,
                padding: 14, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
              }}>Terminer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-160px) scale(1.4); opacity: 0; }
        }
        @keyframes feedSlideIn {
          from { transform: translateX(-12px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
