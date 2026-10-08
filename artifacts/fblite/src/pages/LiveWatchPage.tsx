import { useEffect, useState, useRef } from "react";
import { useNavigate } from "../router";
import { useViewerPresence } from "../hooks/useViewerPresence";
import { getBpToken } from "../lib/api";
import GiftPicker from "../components/GiftPicker";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface LiveInfo {
  id: number;
  userId: string;
  userName: string;
  userFlag: string;
  playbackUrl: string;
  viewerCount: number;
}

interface TopDonor {
  senderId: number;
  senderName: string;
  totalTokens: number;
  giftsCount: number;
}

interface FloatingGift {
  id: number;
  emoji: string;
  x: number;
}

interface FeedEntry {
  id: number;
  type: "gift" | "chat" | "join";
  senderName: string;
  userFlag?: string;
  giftEmoji?: string;
  giftName?: string;
  content?: string;
}

interface Props {
  streamId: number;
}

export default function LiveWatchPage({ streamId }: Props) {
  const navigate = useNavigate();
  const localUser = useCurrentUser();
  const viewerName = localUser.name || "Anonyme";
  const viewerFlag = localUser.flag || "";

  const [stream, setStream]           = useState<LiveInfo | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [topDonors, setTopDonors]     = useState<TopDonor[]>([]);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [floatingGifts, setFloatingGifts]  = useState<FloatingGift[]>([]);
  const [feedEntries, setFeedEntries]      = useState<FeedEntry[]>([]);
  const [chatInput, setChatInput]          = useState("");
  const [sendingChat, setSendingChat]      = useState(false);
  const floatIdRef  = useRef(0);
  const feedIdRef   = useRef(0);
  const feedBottomRef = useRef<HTMLDivElement>(null);
  const sseRef      = useRef<EventSource | null>(null);

  useViewerPresence(stream?.id ?? null, viewerName, viewerFlag);

  useEffect(() => {
    const token = getBpToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`/api/stream/live/${streamId}`, { headers })
      .then(r => r.json())
      .then((data: LiveInfo & { status?: string }) => {
        if (data.status === "ended" || !data.playbackUrl) {
          setError("Ce live est terminé.");
        } else {
          setStream(data);
        }
      })
      .catch(() => setError("Impossible de charger le live."))
      .finally(() => setLoading(false));
  }, [streamId]);

  // Fetch viewer token balance
  useEffect(() => {
    const token = getBpToken();
    if (!token) return;
    fetch("/api/creator/wallet", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { tokenBalance?: number }) => {
        if (d.tokenBalance !== undefined) setTokenBalance(d.tokenBalance);
      })
      .catch(() => {});
  }, []);

  // Fetch + refresh top donors every 15 s
  useEffect(() => {
    if (!stream) return;
    const load = () => {
      fetch(`/api/gifts/top-donors/live/${stream.id}`)
        .then(r => r.json())
        .then((d: TopDonor[]) => setTopDonors(Array.isArray(d) ? d.slice(0, 5) : []))
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 15_000);
    return () => clearInterval(iv);
  }, [stream]);

  // SSE — subscribe to gift + chat events for the live feed
  useEffect(() => {
    if (!stream) return;

    const es = new EventSource(`/api/stream/live/${stream.id}/events`);
    sseRef.current = es;

    es.addEventListener("gift", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          senderName: string;
          giftEmoji: string;
          giftName: string;
        };
        const fid = ++feedIdRef.current;
        setFeedEntries(prev => [...prev.slice(-49), {
          id: fid,
          type: "gift",
          senderName: data.senderName || "Anonyme",
          giftEmoji: data.giftEmoji  || "🎁",
          giftName:  data.giftName   || "Cadeau",
        }]);
        spawnFloat(data.giftEmoji || "🎁");
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("chat", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          userName: string;
          userFlag?: string;
          content: string;
        };
        const fid = ++feedIdRef.current;
        setFeedEntries(prev => [...prev.slice(-49), {
          id: fid,
          type: "chat",
          senderName: data.userName || "Anonyme",
          userFlag: data.userFlag ?? "",
          content: data.content,
        }]);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("join", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as {
          userName: string;
          userFlag?: string;
        };
        const fid = ++feedIdRef.current;
        setFeedEntries(prev => [...prev.slice(-49), {
          id: fid,
          type: "join",
          senderName: data.userName || "Anonyme",
          userFlag: data.userFlag ?? "",
        }]);
      } catch { /* ignore parse errors */ }
    });

    return () => {
      es.close();
      sseRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?.id]);

  // Auto-scroll feed to newest entry
  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedEntries]);

  const spawnFloat = (emoji: string) => {
    const id = ++floatIdRef.current;
    const x  = 15 + Math.random() * 60;
    setFloatingGifts(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingGifts(prev => prev.filter(g => g.id !== id)), 2200);
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !stream || sendingChat) return;
    setSendingChat(true);
    try {
      const token = getBpToken();
      await fetch(`/api/stream/live/${stream.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: text }),
      });
      setChatInput("");
    } catch { /* ignore */ } finally {
      setSendingChat(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000", color: "#fff" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "var(--bp-primary)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000", color: "#fff", gap: 16 }}>
        <p style={{ color: "rgba(255,255,255,0.6)" }}>{error ?? "Live introuvable."}</p>
        <button
          onClick={() => navigate("/")}
          style={{ padding: "10px 24px", borderRadius: 24, background: "var(--theme-surface)", color: "#000", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
        >
          Retour
        </button>
      </div>
    );
  }

  const broadcasterId = parseInt(stream.userId, 10);
  const token = getBpToken();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", color: "#fff", position: "relative", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "rgba(0,0,0,0.8)", zIndex: 10 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", padding: 4 }}>✕</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "#EF4444", color: "#fff", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4, animation: "livePulse 1.5s ease-in-out infinite", letterSpacing: 0.5 }}>LIVE</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{stream.userFlag} {stream.userName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="rgba(255,255,255,0.7)"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            <span>{stream.viewerCount}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#FBBF24", fontWeight: 700 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="#FBBF24"><circle cx="12" cy="12" r="10"/></svg>
            <span>{tokenBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Video player */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", position: "relative" }}>
        <video
          src={stream.playbackUrl}
          autoPlay
          playsInline
          controls
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />

        {/* Floating gift animations */}
        {floatingGifts.map(g => (
          <div
            key={g.id}
            style={{
              position: "absolute",
              bottom: "80px",
              left: `${g.x}%`,
              fontSize: 40,
              pointerEvents: "none",
              animation: "giftFloat 2.2s ease-out forwards",
              zIndex: 50,
            }}
          >
            {g.emoji}
          </div>
        ))}

        {/* Unified activity feed overlay (gifts + chat) */}
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            width: "calc(100% - 24px)",
            maxHeight: 180,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 5,
            pointerEvents: "none",
            zIndex: 40,
            scrollbarWidth: "none",
          }}
        >
          {feedEntries.map(fe => (
            fe.type === "gift" ? (
              <div
                key={fe.id}
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(4px)",
                  borderRadius: 20,
                  padding: "4px 12px 4px 8px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  animation: "feedSlideIn 0.3s ease-out",
                }}
              >
                <span style={{ fontSize: 18 }}>{fe.giftEmoji}</span>
                <span style={{ color: "#FBBF24" }}>{fe.senderName}</span>
                <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.8)" }}>a envoyé</span>
                <span style={{ color: "#EC4899" }}>{fe.giftName}</span>
              </div>
            ) : fe.type === "join" ? (
              <div
                key={fe.id}
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(4px)",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.75)",
                  animation: "feedSlideIn 0.3s ease-out",
                  whiteSpace: "nowrap",
                }}
              >
                <span>👋</span>
                <span style={{ fontWeight: 700, color: "#fff" }}>
                  {fe.userFlag ? `${fe.userFlag} ` : ""}{fe.senderName}
                </span>
                <span>a rejoint le live</span>
              </div>
            ) : (
              <div
                key={fe.id}
                style={{
                  display: "inline-flex",
                  alignSelf: "flex-start",
                  alignItems: "baseline",
                  gap: 5,
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(4px)",
                  borderRadius: 20,
                  padding: "5px 12px",
                  fontSize: 13,
                  color: "#fff",
                  animation: "feedSlideIn 0.3s ease-out",
                  maxWidth: "90%",
                }}
              >
                <span style={{ color: "#64B5F6", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {fe.userFlag ? `${fe.userFlag} ` : ""}{fe.senderName}
                </span>
                <span style={{ wordBreak: "break-word" }}>{fe.content}</span>
              </div>
            )
          ))}
          <div ref={feedBottomRef} />
        </div>
      </div>

      {/* Top Donors bar (shown if there are any) */}
      {topDonors.length > 0 && (
        <div
          style={{
            background: "rgba(0,0,0,0.75)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "6px 16px",
            display: "flex",
            gap: 12,
            alignItems: "center",
            overflowX: "auto",
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>🏆 Top</span>
          {topDonors.map((d, i) => (
            <div key={d.senderId} style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 12, color: i === 0 ? "#FBBF24" : i === 1 ? "#C0C0C0" : "#CD7F32" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{d.senderName || "Anonyme"}</span>
              <span style={{ fontSize: 11, color: "#FBBF24" }}>🪙{d.totalTokens.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom action bar: chat input + gift button */}
      <div
        style={{
          background: "rgba(0,0,0,0.85)",
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          zIndex: 10,
        }}
      >
        {token ? (
          <>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
              placeholder="Écrire un message…"
              maxLength={300}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 22,
                padding: "9px 14px",
                fontSize: 14,
                color: "#fff",
                outline: "none",
              }}
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || sendingChat}
              style={{
                background: chatInput.trim() ? "var(--bp-primary)" : "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "50%",
                width: 38,
                height: 38,
                color: "#fff",
                fontSize: 17,
                cursor: chatInput.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.2s",
              }}
            >
              ➤
            </button>
          </>
        ) : (
          <div style={{ flex: 1, color: "rgba(255,255,255,0.5)", fontSize: 13, paddingLeft: 4 }}>
            Connecte-toi pour participer au chat
          </div>
        )}
        <button
          onClick={() => setShowGiftPicker(true)}
          style={{
            background: "linear-gradient(135deg, var(--bp-primary), var(--bp-primary))",
            border: "none",
            borderRadius: 24,
            padding: "9px 16px",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            flexShrink: 0,
            boxShadow: "0 0 16px rgba(22,194,74,0.45)",
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M20 6h-2.18c.07-.31.18-.59.18-.9C18 3.4 16.6 2 14.9 2c-.92 0-1.73.42-2.3 1.08L12 3.7l-.6-.62C10.83 2.42 10.02 2 9.1 2 7.4 2 6 3.4 6 5.1c0 .31.11.59.18.9H4c-1.11 0-2 .89-2 2v13c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>
        </button>
      </div>

      {/* Gift Picker Modal */}
      {showGiftPicker && !isNaN(broadcasterId) && (
        <GiftPicker
          streamId={stream.id}
          receiverId={broadcasterId}
          receiverName={stream.userName}
          contextType="live"
          contextId={stream.id}
          tokenBalance={tokenBalance}
          onClose={() => setShowGiftPicker(false)}
          onSent={(gift, newBalance) => {
            setTokenBalance(newBalance);
            spawnFloat(gift.iconEmoji);
          }}
          onBuyTokens={() => {
            setShowGiftPicker(false);
            navigate("/wallet?tab=jetons");
          }}
        />
      )}

      <style>{`
        @keyframes giftFloat {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          80%  { transform: translateY(-160px) scale(1.3); opacity: 0.9; }
          100% { transform: translateY(-220px) scale(0.8); opacity: 0; }
        }
        @keyframes feedSlideIn {
          from { transform: translateX(-16px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(229,57,53,0.6); }
          50%      { opacity: 0.85; box-shadow: 0 0 0 5px rgba(229,57,53,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
