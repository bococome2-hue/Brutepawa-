import { useState, useEffect, useCallback } from "react";
import {
  apiGetGroupBots,
  apiPatchGroupBot,
  apiGetBotLogs,
  ApiGroupBot,
  ApiBotLog,
} from "../lib/api";

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return "À l'instant";
  if (d < 3600) return `Il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `Il y a ${Math.floor(d / 3600)} h`;
  const days = Math.floor(d / 86400);
  if (days < 30) return `Il y a ${days} j`;
  return `Il y a ${Math.floor(days / 30)} mois`;
}

const BOT_META: Record<string, { emoji: string; label: string; desc: string; color: string }> = {
  welcome: {
    emoji: "👋",
    label: "Bot de Bienvenue",
    desc: "Publie automatiquement un message de bienvenue quand un nouveau membre rejoint le groupe.",
    color: "var(--bp-primary)",
  },
  anti_insult: {
    emoji: "🛡️",
    label: "Bot Anti-Insultes",
    desc: "Supprime les messages contenant des mots interdits. Peut exclure automatiquement après plusieurs avertissements.",
    color: "#EF4444",
  },
  anti_link: {
    emoji: "🔗",
    label: "Bot Anti-Liens",
    desc: "Supprime automatiquement les messages contenant des liens non autorisés.",
    color: "#FF6900",
  },
  translator: {
    emoji: "🌍",
    label: "Bot Traducteur",
    desc: "Permet aux membres de traduire des publications dans leur langue avec un bouton dédié.",
    color: "var(--bp-primary)",
  },
  scheduler: {
    emoji: "📅",
    label: "Bot Annonces Programmées",
    desc: "Publie automatiquement des annonces dans le groupe selon un planning défini.",
    color: "#9C27B0",
  },
};

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: enabled ? "var(--bp-primary)" : "#CCD0D5",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "var(--theme-surface)",
        position: "absolute", top: 3,
        left: enabled ? 23 : 3,
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </button>
  );
}

function WelcomeSettings({
  settings, onChange,
}: { settings: { message?: string }; onChange: (s: object) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text)" }}>
        Message de bienvenue <span style={{ fontWeight: 400, color: "var(--fb-text-secondary)" }}>(utilisez {"{username}"} pour le prénom)</span>
      </label>
      <textarea
        value={settings.message ?? ""}
        onChange={e => onChange({ ...settings, message: e.target.value })}
        rows={3}
        placeholder="Bienvenue {username} dans le groupe !"
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8,
          border: "1px solid var(--fb-border)", fontSize: 14, fontFamily: "inherit",
          background: "var(--fb-bg)", color: "var(--fb-text)", resize: "vertical",
        }}
      />
    </div>
  );
}

function AntiInsultSettings({
  settings, onChange,
}: {
  settings: { words?: string[]; warnCount?: number; autoBan?: boolean };
  onChange: (s: object) => void;
}) {
  const words = settings.words ?? [];
  const [newWord, setNewWord] = useState("");

  const addWord = () => {
    const w = newWord.trim().toLowerCase();
    if (w && !words.includes(w)) {
      onChange({ ...settings, words: [...words, w] });
    }
    setNewWord("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text)", display: "block", marginBottom: 6 }}>
          Mots interdits
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {words.map(w => (
            <span key={w} style={{
              background: "#FEE2E2", color: "#D32F2F", borderRadius: 20, padding: "3px 10px",
              fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
            }}>
              {w}
              <button
                onClick={() => onChange({ ...settings, words: words.filter(x => x !== w) })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#D32F2F", padding: 0, fontSize: 14, lineHeight: 1 }}
              >×</button>
            </span>
          ))}
          {words.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>Aucun mot ajouté</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addWord()}
            placeholder="Ajouter un mot interdit…"
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--fb-border)",
              fontSize: 13, background: "var(--fb-bg)", color: "var(--fb-text)",
            }}
          />
          <button
            onClick={addWord}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: "var(--bp-primary)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >Ajouter</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text)" }}>
          Avertissements avant exclusion :
        </label>
        <select
          value={settings.warnCount ?? 3}
          onChange={e => onChange({ ...settings, warnCount: parseInt(e.target.value) })}
          style={{
            padding: "6px 10px", borderRadius: 8, border: "1px solid var(--fb-border)",
            fontSize: 13, background: "var(--fb-bg)", color: "var(--fb-text)",
          }}
        >
          {[1, 2, 3, 5, 10].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          id="autoBan"
          checked={settings.autoBan ?? true}
          onChange={e => onChange({ ...settings, autoBan: e.target.checked })}
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
        <label htmlFor="autoBan" style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text)", cursor: "pointer" }}>
          Exclure automatiquement après les avertissements
        </label>
      </div>
    </div>
  );
}

function AntiLinkSettings({
  settings, onChange,
}: {
  settings: { allowedDomains?: string[]; blockAll?: boolean };
  onChange: (s: object) => void;
}) {
  const domains = settings.allowedDomains ?? [];
  const [newDomain, setNewDomain] = useState("");

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "");
    if (d && !domains.includes(d)) {
      onChange({ ...settings, allowedDomains: [...domains, d] });
    }
    setNewDomain("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          id="blockAll"
          checked={settings.blockAll ?? true}
          onChange={e => onChange({ ...settings, blockAll: e.target.checked })}
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
        <label htmlFor="blockAll" style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text)", cursor: "pointer" }}>
          Bloquer tous les liens (sauf exceptions)
        </label>
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text)", display: "block", marginBottom: 6 }}>
          Domaines autorisés
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {domains.map(d => (
            <span key={d} style={{
              background: "#DCFCE7", color: "var(--bp-primary)", borderRadius: 20, padding: "3px 10px",
              fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
            }}>
              {d}
              <button
                onClick={() => onChange({ ...settings, allowedDomains: domains.filter(x => x !== d) })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bp-primary)", padding: 0, fontSize: 14, lineHeight: 1 }}
              >×</button>
            </span>
          ))}
          {domains.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--fb-text-secondary)" }}>Aucun domaine autorisé</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addDomain()}
            placeholder="ex: youtube.com"
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--fb-border)",
              fontSize: 13, background: "var(--fb-bg)", color: "var(--fb-text)",
            }}
          />
          <button
            onClick={addDomain}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: "var(--bp-primary)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >Ajouter</button>
        </div>
      </div>
    </div>
  );
}

function TranslatorSettings({
  settings, onChange,
}: { settings: { defaultLang?: string }; onChange: (s: object) => void }) {
  const LANGS = [
    { code: "fr", label: "Français" },
    { code: "en", label: "Anglais" },
    { code: "ar", label: "Arabe" },
    { code: "wo", label: "Wolof" },
    { code: "sw", label: "Swahili" },
    { code: "pt", label: "Portugais" },
    { code: "es", label: "Espagnol" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text)" }}>Langue cible par défaut :</label>
      <select
        value={settings.defaultLang ?? "fr"}
        onChange={e => onChange({ ...settings, defaultLang: e.target.value })}
        style={{
          padding: "6px 10px", borderRadius: 8, border: "1px solid var(--fb-border)",
          fontSize: 13, background: "var(--fb-bg)", color: "var(--fb-text)",
        }}
      >
        {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </div>
  );
}

type Announcement = { id: string; message: string; time: string; days: number[]; lastRun?: string | null };
const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function SchedulerSettings({
  settings, onChange,
}: { settings: { announcements?: Announcement[] }; onChange: (s: object) => void }) {
  const items: Announcement[] = settings.announcements ?? [];
  const [newMsg, setNewMsg] = useState("");
  const [newTime, setNewTime] = useState("08:00");
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const addAnnouncement = () => {
    if (!newMsg.trim()) return;
    const entry: Announcement = {
      id: Date.now().toString(),
      message: newMsg.trim(),
      time: newTime,
      days: newDays,
      lastRun: null,
    };
    onChange({ ...settings, announcements: [...items, entry] });
    setNewMsg("");
  };

  const removeAnnouncement = (id: string) => {
    onChange({ ...settings, announcements: items.filter(a => a.id !== id) });
  };

  const toggleDay = (day: number) => {
    setNewDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map(a => (
            <div key={a.id} style={{
              background: "var(--fb-bg)", borderRadius: 10, border: "1px solid var(--fb-divider)",
              padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fb-text)", marginBottom: 3 }}>📢 {a.message}</div>
                <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>
                  🕐 {a.time} · {a.days.map(d => DAY_NAMES[d]).join(", ")}
                </div>
              </div>
              <button
                onClick={() => removeAnnouncement(a.id)}
                style={{
                  padding: "5px 10px", borderRadius: 6, border: "1px solid #EF4444",
                  background: "#FEE2E2", color: "#D32F2F", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0,
                }}
              >Supprimer</button>
            </div>
          ))}
        </div>
      )}
      <div style={{
        background: "var(--fb-bg)", borderRadius: 10, border: "1px dashed var(--fb-border)", padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--fb-text)", marginBottom: 2 }}>+ Nouvelle annonce programmée</div>
        <textarea
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          rows={2}
          placeholder="Texte de l'annonce…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8,
            border: "1px solid var(--fb-border)", fontSize: 13, fontFamily: "inherit",
            background: "var(--fb-white)", color: "var(--fb-text)", resize: "vertical",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Heure :</label>
          <input
            type="time"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            style={{
              padding: "6px 10px", borderRadius: 8, border: "1px solid var(--fb-border)",
              fontSize: 13, background: "var(--fb-bg)", color: "var(--fb-text)",
            }}
          />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Jours :</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DAY_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                style={{
                  padding: "5px 10px", borderRadius: 20, border: "1px solid",
                  borderColor: newDays.includes(i) ? "var(--bp-primary)" : "var(--fb-border)",
                  background: newDays.includes(i) ? "rgba(var(--bp-primary-rgb),0.13)" : "var(--fb-bg)",
                  color: newDays.includes(i) ? "var(--bp-primary)" : "var(--fb-text-secondary)",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                }}
              >{name}</button>
            ))}
          </div>
        </div>
        <button
          onClick={addAnnouncement}
          disabled={!newMsg.trim()}
          style={{
            padding: "9px 0", borderRadius: 8, border: "none",
            background: newMsg.trim() ? "var(--bp-primary)" : "var(--fb-divider)",
            color: newMsg.trim() ? "#fff" : "var(--fb-text-secondary)",
            fontWeight: 700, fontSize: 14, cursor: newMsg.trim() ? "pointer" : "not-allowed",
          }}
        >➕ Ajouter cette annonce</button>
      </div>
    </div>
  );
}

function BotCard({ bot, onSave }: { bot: ApiGroupBot; onSave: (enabled: boolean, settings: object) => Promise<void> }) {
  const meta = BOT_META[bot.botType] ?? { emoji: "🤖", label: bot.botType, desc: "", color: "#888" };
  const [expanded, setExpanded] = useState(false);
  const [enabled, setEnabled] = useState(bot.enabled);
  const [settings, setSettings] = useState<object>(bot.settings ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleToggle = async (val: boolean) => {
    setEnabled(val);
    setSaving(true);
    try {
      await onSave(val, settings);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await onSave(enabled, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: "var(--fb-white)", borderRadius: 12, border: `1px solid ${enabled ? meta.color + "40" : "var(--fb-divider)"}`,
      overflow: "hidden", transition: "border-color 0.2s",
    }}>
      <div
        style={{
          padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
          borderLeft: `4px solid ${enabled ? meta.color : "var(--fb-divider)"}`, transition: "border-color 0.2s",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ fontSize: 26, flexShrink: 0 }}>{meta.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fb-text)" }}>{meta.label}</div>
          <div style={{ fontSize: 12, color: "var(--fb-text-secondary)", marginTop: 2 }}>{meta.desc}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {saving && <span style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>…</span>}
          <ToggleSwitch enabled={enabled} onChange={handleToggle} />
        </div>
        <span style={{ fontSize: 12, color: "var(--fb-text-secondary)", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--fb-divider)", background: "var(--fb-bg)" }}>
          {bot.botType === "welcome" && (
            <WelcomeSettings settings={settings as any} onChange={setSettings} />
          )}
          {bot.botType === "anti_insult" && (
            <AntiInsultSettings settings={settings as any} onChange={setSettings} />
          )}
          {bot.botType === "anti_link" && (
            <AntiLinkSettings settings={settings as any} onChange={setSettings} />
          )}
          {bot.botType === "translator" && (
            <TranslatorSettings settings={settings as any} onChange={setSettings} />
          )}
          {bot.botType === "scheduler" && (
            <SchedulerSettings settings={settings as any} onChange={setSettings} />
          )}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            style={{
              marginTop: 14, width: "100%", padding: "11px 0", borderRadius: 8, border: "none",
              background: saved ? "var(--bp-primary)" : meta.color, color: "#fff",
              fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}
          >
            {saved ? "✓ Paramètres sauvegardés" : saving ? "Sauvegarde…" : "💾 Sauvegarder les paramètres"}
          </button>
        </div>
      )}
    </div>
  );
}

const BOT_TYPE_LABELS: Record<string, string> = {
  welcome: "Bienvenue",
  anti_insult: "Anti-Insultes",
  anti_link: "Anti-Liens",
  translator: "Traducteur",
  scheduler: "Annonces",
};

export default function GroupBotsPanel({ groupId }: { groupId: number }) {
  const [bots, setBots] = useState<ApiGroupBot[]>([]);
  const [logs, setLogs] = useState<ApiBotLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const loadBots = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGetGroupBots(groupId);
      setBots(data);
    } catch (e: any) {
      setError(e.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const data = await apiGetBotLogs(groupId);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [groupId]);

  useEffect(() => { loadBots(); }, [loadBots]);

  const handleSaveBot = async (botType: string, enabled: boolean, settings: object) => {
    const updated = await apiPatchGroupBot(groupId, botType, { enabled, settings });
    setBots(prev => prev.map(b => b.botType === botType ? { ...b, ...updated } : b));
  };

  const handleToggleLogs = () => {
    if (!logsOpen) {
      setLogsOpen(true);
      loadLogs();
    } else {
      setLogsOpen(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--fb-text-secondary)" }}>
        Chargement des bots…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ color: "#D32F2F", fontSize: 14 }}>{error}</div>
        <button onClick={loadBots} style={{ marginTop: 10, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--fb-border)", background: "var(--fb-bg)", cursor: "pointer" }}>
          Réessayer
        </button>
      </div>
    );
  }

  const activeCount = bots.filter(b => b.enabled).length;

  return (
    <div style={{ padding: "12px 12px 40px" }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: "var(--fb-text)" }}>
          🤖 Bots de Modération
        </div>
        <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginTop: 4 }}>
          {activeCount} bot{activeCount !== 1 ? "s" : ""} actif{activeCount !== 1 ? "s" : ""} sur {bots.length}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {bots.map(bot => (
          <BotCard
            key={bot.botType}
            bot={bot}
            onSave={(enabled, settings) => handleSaveBot(bot.botType, enabled, settings)}
          />
        ))}
      </div>

      <button
        onClick={handleToggleLogs}
        style={{
          width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid var(--fb-border)",
          background: "var(--fb-white)", color: "var(--fb-text)", fontWeight: 700, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        📋 {logsOpen ? "Masquer" : "Voir"} le journal des actions
        {logsOpen ? " ▲" : " ▼"}
      </button>

      {logsOpen && (
        <div style={{ marginTop: 12, background: "var(--fb-white)", borderRadius: 12, border: "1px solid var(--fb-divider)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--fb-divider)", fontWeight: 700, fontSize: 14 }}>
            Journal des bots (100 dernières actions)
          </div>
          {logsLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fb-text-secondary)" }}>Chargement…</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fb-text-secondary)" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🗂</div>
              Aucune action enregistrée pour l'instant.
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {logs.map(log => {
                const meta = BOT_META[log.botType];
                return (
                  <div
                    key={log.id}
                    style={{
                      padding: "10px 14px", borderBottom: "1px solid var(--fb-divider)",
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{meta?.emoji ?? "🤖"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--fb-text)", fontWeight: 500 }}>{log.action}</div>
                      <div style={{ fontSize: 11, color: "var(--fb-text-secondary)", marginTop: 2, display: "flex", gap: 8 }}>
                        <span style={{
                          background: (meta?.color ?? "#888") + "20", color: meta?.color ?? "#888",
                          borderRadius: 10, padding: "1px 7px", fontWeight: 700,
                        }}>
                          {BOT_TYPE_LABELS[log.botType] ?? log.botType}
                        </span>
                        <span>{relTime(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
