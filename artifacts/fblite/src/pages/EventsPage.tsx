import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiFetch } from "../lib/api";
import { createPortal } from "react-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface ApiEvent {
  id: number;
  organizerId: number;
  organizerName: string;
  organizerAvatarUrl: string | null;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string | null;
  coverUrl: string | null;
  isOnline: boolean;
  type: string;
  goingCount: number;
  interestedCount: number;
  createdAt: string;
  myRsvp: "going" | "interested" | "not_going" | null;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

function CreateEventModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [type, setType] = useState("public");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !startAt) { setError("Titre et date de début requis"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/events", {
        method: "POST",
        body: JSON.stringify({ title, description, location, startAt, endAt: endAt || undefined, isOnline, type }),
      });
      if (!res.ok) throw new Error("Erreur lors de la création");
      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--theme-surface)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", padding: "20px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>📅 Créer un événement</div>
          <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        {error && <div style={{ background: "#FEE2E2", color: "#EF4444", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#64748B" }}>Titre *</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nom de l'événement"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#64748B" }}>Description</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez votre événement…" rows={3}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#64748B" }}>Date de début *</div>
              <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#64748B" }}>Date de fin</div>
              <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#64748B" }}>Lieu</div>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Adresse ou nom du lieu"
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} style={{ width: 16, height: 16 }} />
              Événement en ligne
            </label>
            <select value={type} onChange={e => setType(e.target.value)}
              style={{ marginLeft: "auto", padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, fontSize: 14, background: "var(--theme-surface)" }}>
              <option value="public">🌐 Public</option>
              <option value="friends">👥 Amis</option>
              <option value="private">🔒 Privé</option>
            </select>
          </div>
          <button onClick={submit} disabled={saving}
            style={{ background: saving ? "#ccc" : "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "13px", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Création…" : "Créer l'événement"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "my">("upcoming");
  const [showCreate, setShowCreate] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<number | null>(null);

  const user = useCurrentUser();
  const userId = user.id ?? 0;

  const load = async () => {
    try {
      const res = await apiFetch("/events");
      if (res.ok) setEvents(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRsvp = async (eventId: number, status: "going" | "interested") => {
    setRsvpLoading(eventId);
    try {
      const res = await apiFetch(`/events/${eventId}/rsvp`, { method: "POST", body: JSON.stringify({ status }) });
      if (res.ok) {
        const { myRsvp } = await res.json();
        setEvents(prev => prev.map(e => {
          if (e.id !== eventId) return e;
          const prevRsvp = e.myRsvp;
          let goingCount = e.goingCount;
          let interestedCount = e.interestedCount;
          if (prevRsvp === "going") goingCount = Math.max(0, goingCount - 1);
          if (prevRsvp === "interested") interestedCount = Math.max(0, interestedCount - 1);
          if (myRsvp === "going") goingCount += 1;
          if (myRsvp === "interested") interestedCount += 1;
          return { ...e, myRsvp, goingCount, interestedCount };
        }));
      }
    } catch { /* ignore */ }
    finally { setRsvpLoading(null); }
  };

  const displayed = tab === "my"
    ? events.filter(e => e.organizerId === userId || e.myRsvp)
    : events;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ background: "var(--theme-surface)", padding: "14px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <div style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>📅 Événements</div>
        <button onClick={() => setShowCreate(true)}
          style={{ background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          + Créer
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "var(--theme-surface)", borderBottom: "1px solid #E5E7EB" }}>
        {([["upcoming", "À venir"], ["my", "Mes événements"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, background: "none", border: "none", padding: "12px", fontWeight: tab === id ? 700 : 400, fontSize: 14, color: tab === id ? "var(--bp-primary)" : "#64748B", borderBottom: tab === id ? "3px solid var(--bp-primary)" : "3px solid transparent", cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>Chargement…
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748B" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📅</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Aucun événement</div>
            <div style={{ fontSize: 14 }}>Créez votre premier événement ou invitez des amis !</div>
            <button onClick={() => setShowCreate(true)}
              style={{ marginTop: 16, background: "var(--bp-primary)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>
              Créer un événement
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {displayed.map(event => {
            const isOrganizer = event.organizerId === userId;
            const start = new Date(event.startAt);
            const isPast = start < new Date();
            return (
              <div key={event.id} style={{ background: "var(--theme-surface)", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                {/* Cover or colored header */}
                {event.coverUrl
                  ? <img src={event.coverUrl} alt={event.title} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                  : <div style={{ width: "100%", height: 120, background: "linear-gradient(135deg, var(--bp-primary), #42b0ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📅</div>
                }
                <div style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      {isPast && <span style={{ background: "#F1F5F9", color: "#64748B", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, marginBottom: 6, display: "inline-block" }}>PASSÉ</span>}
                      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{event.title}</div>
                      <div style={{ fontSize: 13, color: "var(--bp-primary)", fontWeight: 600, marginBottom: 4 }}>🗓 {fmtDate(event.startAt)}</div>
                      {event.location && <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>📍 {event.location}</div>}
                      {event.isOnline && <div style={{ fontSize: 13, color: "var(--bp-primary)", marginBottom: 4 }}>🌐 En ligne</div>}
                      {event.description && <div style={{ fontSize: 13, color: "#64748B", marginTop: 6, lineHeight: 1.4 }}>{event.description.slice(0, 120)}{event.description.length > 120 ? "…" : ""}</div>}
                    </div>
                    {isOrganizer && <span style={{ background: "#DCFCE7", color: "var(--bp-primary)", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 10, flexShrink: 0 }}>Organisateur</span>}
                  </div>

                  {/* Counts */}
                  <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, color: "#64748B" }}>
                    {event.goingCount > 0 && <span>✅ {event.goingCount} participant{event.goingCount !== 1 ? "s" : ""}</span>}
                    {event.interestedCount > 0 && <span>⭐ {event.interestedCount} intéressé{event.interestedCount !== 1 ? "s" : ""}</span>}
                  </div>

                  {/* RSVP buttons */}
                  {!isPast && !isOrganizer && (
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button
                        onClick={() => handleRsvp(event.id, "going")}
                        disabled={rsvpLoading === event.id}
                        style={{
                          flex: 1, padding: "9px", borderRadius: 8, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
                          background: event.myRsvp === "going" ? "var(--bp-primary)" : "#DCFCE7",
                          color: event.myRsvp === "going" ? "#fff" : "var(--bp-primary)",
                        }}>
                        ✅ {event.myRsvp === "going" ? "Inscrit ✓" : "Participer"}
                      </button>
                      <button
                        onClick={() => handleRsvp(event.id, "interested")}
                        disabled={rsvpLoading === event.id}
                        style={{
                          flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #ccc", fontWeight: 700, fontSize: 13, cursor: "pointer",
                          background: event.myRsvp === "interested" ? "#fff3cd" : "#F1F5F9",
                          color: event.myRsvp === "interested" ? "#D97706" : "#64748B",
                        }}>
                        ⭐ {event.myRsvp === "interested" ? "Intéressé ✓" : "Intéressé"}
                      </button>
                    </div>
                  )}

                  {/* Organizer info */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid #E5E7EB" }}>
                    {event.organizerAvatarUrl
                      ? <img src={event.organizerAvatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bp-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>
                          {event.organizerName.slice(0, 2).toUpperCase()}
                        </div>
                    }
                    <span style={{ fontSize: 13, color: "#64748B" }}>Organisé par <strong>{event.organizerName}</strong></span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#aaa" }}>
                      {["public", "friends", "private"].includes(event.type)
                        ? { public: "🌐 Public", friends: "👥 Amis", private: "🔒 Privé" }[event.type]
                        : "🌐 Public"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
