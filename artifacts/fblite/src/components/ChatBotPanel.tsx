import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../lib/api";
import { EXTRA_DEFAULTS, PermissionsSection, ProtectionSection, WelcomePreview, BotStatsSection, validateExtra } from "./BotExtraSections";
import type { BotExtra } from "./BotExtraSections";
import "./ChatBotPanel.css";

interface Settings extends BotExtra {
  enabled: boolean; antiSpam: boolean; maxMessages: number; windowSeconds: number;
  blockLinks: boolean; allowedDomains: string[]; words: string[];
  warnBeforeMute: number; warnBeforeBan: number; muteMinutes: number;
  rules: string; welcomeMessage: string;
}
interface Log { id: number; action: string; targetUserId: number | null; actorId: number | null; detail: string; createdAt: string; messageId?: number | null; expiresAt?: string | null; metadata?: Record<string, unknown> }
interface Sanction { userId: number; name: string; warnings: number; mutedUntil: string | null; banned: boolean; verificationUntil?: string | null }
interface Member { userId: number; name: string; role: "owner" | "admin" | "member" }
interface BotData { settings: Settings; logs: Log[]; sanctions: Sanction[]; members: Member[]; myRole?: "owner" | "admin" | "member" }
export type BotSection = "settings" | "moderation" | "stats" | "logs";
type Action = "warn" | "mute" | "unmute" | "kick" | "ban" | "unban" | "reset" | "delete" | "verify";

const DEFAULTS: Settings = {
  ...EXTRA_DEFAULTS, enabled: false, antiSpam: true, maxMessages: 5, windowSeconds: 10, blockLinks: false,
  allowedDomains: [], words: [], warnBeforeMute: 2, warnBeforeBan: 4, muteMinutes: 10,
  rules: "Respectez les membres du groupe.", welcomeMessage: "",
};

const ACTION_LABELS: Record<string, string> = {
  warn: "Avertissement", mute: "Mise en sourdine", unmute: "Fin de sourdine", ban: "Bannissement",
  unban: "Levée de bannissement", kick: "Expulsion", verify: "Confirmation des règles", settings: "Configuration", reset: "Réinitialisation", delete: "Suppression de message",
};

async function errMsg(res: Response): Promise<string> {
  const b = await res.json().catch(() => ({})) as { error?: string };
  return b.error ?? `Erreur ${res.status}`;
}
const parseList = (s: string) => s.split(/[\n,]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
const fmt = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); };

const card: CSSProperties = { background: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" };
const h3: CSSProperties = { margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "#1c1e21" };
const hint: CSSProperties = { fontSize: 12.5, color: "#65676b", margin: "4px 0 8px", lineHeight: 1.45 };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)", fontSize: 15, fontFamily: "inherit", background: "#fff" };
const btn = (primary = false, danger = false): CSSProperties => ({
  minHeight: 44, padding: "0 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
  border: primary || danger ? "none" : "1.5px solid var(--bp-primary)",
  background: danger ? "#d93025" : primary ? "var(--bp-primary)" : "#fff",
  color: primary || danger ? "#fff" : "var(--bp-primary)",
});

function Toggle({ label, checked, onChange, desc }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, cursor: "pointer" }}>
      <input className="bp-bot-switch" type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--bp-primary)", flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{label}</span>
        {desc && <span style={{ display: "block", fontSize: 12.5, color: "#65676b" }}>{desc}</span>}
      </span>
    </label>
  );
}
function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{label}</span>
      {children}
      {help && <span style={{ display: "block", fontSize: 12, color: "#65676b", marginTop: 3 }}>{help}</span>}
    </label>
  );
}

export default function ChatBotPanel({ groupId, onClose, initialSection, groupName }: { groupId: number; onClose: () => void; initialSection?: BotSection; groupName?: string }) {
  const [data, setData] = useState<BotData | null>(null);
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [domainsTxt, setDomainsTxt] = useState("");
  const [wordsTxt, setWordsTxt] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [actErr, setActErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const initRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeHandler = useRef(onClose);
  closeHandler.current = onClose;

  const [target, setTarget] = useState("");
  const [minutes, setMinutes] = useState("10");
  const [reason, setReason] = useState("");
  const [msgId, setMsgId] = useState("");

  const applySettings = useCallback((s: Settings) => {
    setForm({ ...s, permissions: { ...EXTRA_DEFAULTS.permissions, ...(s.permissions ?? {}) } }); setDomainsTxt(s.allowedDomains.join("\n")); setWordsTxt(s.words.join("\n"));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/chat-groups/${groupId}/bot`);
      if (!res.ok) throw new Error(await errMsg(res));
      const d = await res.json() as BotData;
      setData(d); setLoadErr("");
      if (!initRef.current || !dirtyRef.current) { applySettings({ ...DEFAULTS, ...d.settings }); initRef.current = true; }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
    } finally { setLoading(false); }
  }, [groupId, applySettings]);

  useEffect(() => { void load(); const t = setInterval(() => void load(), 5000); return () => clearInterval(t); }, [load]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeHandler.current(); }
      if (e.key !== "Tab") return;
      const nodes = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button, input, select, textarea, summary, a[href], [tabindex]") ?? [])]
        .filter(node => node.tabIndex >= 0 && !node.matches(":disabled") && node.offsetParent !== null);
      if (!nodes.length) { e.preventDefault(); return; }
      const first = nodes[0]!, last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("keydown", k); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);

  const reqIds = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!data || !initialSection) return;
    const id = { settings: "bp-g", moderation: "bp-a", stats: "bp-stats", logs: "bp-h" }[initialSection];
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(t);
  }, [!!data, initialSection]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setForm(f => ({ ...f, [k]: v })); dirtyRef.current = true; setDirty(true); setSaveMsg(null);
  };
  const num = (k: "maxMessages" | "windowSeconds" | "warnBeforeMute" | "warnBeforeBan" | "muteMinutes", min: number, max: number, label: string) => (
    <Field label={label} help={`Entre ${min} et ${max}`}>
      <input style={input} type="number" inputMode="numeric" min={min} max={max} value={form[k]} onChange={e => set(k, Number(e.target.value))} />
    </Field>
  );

  const save = async () => {
    const s: Settings = { ...form, allowedDomains: parseList(domainsTxt), words: parseList(wordsTxt) };
    const chk = (v: number, a: number, b: number) => Number.isInteger(v) && v >= a && v <= b;
    let bad = "";
    if (!chk(s.maxMessages, 2, 30)) bad = "Messages maximum : entre 2 et 30.";
    else if (!chk(s.windowSeconds, 3, 120)) bad = "Fenêtre : entre 3 et 120 secondes.";
    else if (!chk(s.warnBeforeMute, 1, 10)) bad = "Seuil de sourdine : entre 1 et 10.";
    else if (!chk(s.warnBeforeBan, 2, 30)) bad = "Seuil de bannissement : entre 2 et 30.";
    else if (s.warnBeforeBan <= s.warnBeforeMute) bad = "Le seuil de bannissement doit dépasser celui de la sourdine.";
    else if (!chk(s.muteMinutes, 1, 43200)) bad = "Durée de sourdine : entre 1 et 43200 minutes.";
    else if (s.rules.length > 2000) bad = "Règles : 2000 caractères maximum.";
    else if (s.welcomeMessage.length > 1000) bad = "Message de bienvenue : 1000 caractères maximum.";
    else if (s.allowedDomains.some(d => !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(d))) bad = "Domaines autorisés : noms d'hôte uniquement (exemple : exemple.com).";
    if (!bad) bad = validateExtra(s);
    if (bad) { setSaveMsg({ ok: false, text: bad }); return; }
    const old = data?.settings;
    const notes: string[] = [];
    if (old && old.enabled !== s.enabled) notes.push(s.enabled ? "Le bot sera activé." : "Le bot sera désactivé : le filtrage automatique s'arrête.");
    if (old && JSON.stringify({ ...EXTRA_DEFAULTS.permissions, ...old.permissions }) !== JSON.stringify(s.permissions)) notes.push("Les permissions des administrateurs seront modifiées.");
    if (s.violationAction === "kick" || s.violationAction === "ban" || s.finalSanction !== "mute") notes.push("Les infractions pourront entraîner une expulsion ou un bannissement.");
    if (notes.length && !window.confirm("Confirmer ces changements importants ?\n\n" + notes.join("\n"))) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await apiFetch(`/chat-groups/${groupId}/bot`, { method: "PUT", body: JSON.stringify(s) });
      if (!res.ok) throw new Error(await errMsg(res));
      const r = await res.json() as { settings: Settings };
      dirtyRef.current = false; setDirty(false);
      applySettings({ ...DEFAULTS, ...r.settings });
      setSaveMsg({ ok: true, text: "Configuration enregistrée." });
      await load();
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : "Échec de l'enregistrement" });
    } finally { setSaving(false); }
  };

  const act = async (action: Action, body: { targetUserId?: number; messageId?: number; durationMinutes?: number; reason?: string }) => {
    setBusy(true); setActErr("");
    const key = JSON.stringify([action, body]);
    const requestId = reqIds.current[key] ?? (reqIds.current[key] = crypto.randomUUID());
    try {
      const res = await apiFetch(`/chat-groups/${groupId}/bot/actions`, { method: "POST", body: JSON.stringify({ action, ...body, requestId }) });
      if (!res.ok) throw new Error(await errMsg(res));
      delete reqIds.current[key];
      await load();
      return true;
    } catch (e) { setActErr(e instanceof Error ? e.message : "Action impossible"); return false; }
    finally { setBusy(false); }
  };

  const members = data?.members ?? [];
  const sanctions = data?.sanctions ?? [];
  const selectableMembers = [...members, ...sanctions.filter(s => !members.some(m => m.userId === s.userId)).map(s => ({ userId: s.userId, name: s.name, role: "member" as const }))];
  const logs = data?.logs ?? [];
  const nameOf = (id: number | null) => id == null ? "-" : (members.find(m => m.userId === id)?.name ?? sanctions.find(s => s.userId === id)?.name ?? `ID ${id}`);
  const targetId = Number(target);
  const targetMember = selectableMembers.find(m => m.userId === targetId);
  const sanctionable = members.some(m => m.userId === targetId && m.role === "member");
  const targetSanction = sanctions.find(s => s.userId === targetId);
  const now = Date.now();
  const activeSanctions = sanctions.filter(s => s.banned || s.warnings > 0 || (s.mutedUntil && new Date(s.mutedUntil).getTime() > now) || (s.verificationUntil && new Date(s.verificationUntil).getTime() > now));
  const canAct = (action: Action) => {
    if (action === "delete") return !busy && !loadErr && !!data?.settings.enabled && (data.settings.permissions.deleteMessages || data.settings.permissions.deleteMedia);
    const key = ({ unmute: "mute", unban: "unban", reset: "warn", verify: "warn", delete: "deleteMessages" } as Record<string, string>)[action] ?? action;
    return !busy && !loadErr && !!data?.settings.enabled && !!data.settings.permissions[key];
  };

  const runTarget = (a: Action, extra: { durationMinutes?: number; reason?: string } = {}) => {
    if (!canAct(a)) { setActErr("Cette action n'est pas autorisée dans la configuration actuelle du bot."); return; }
    const restorative = ["unban", "unmute", "reset"].includes(a);
    if (!targetMember || targetMember.role !== "member" || (!sanctionable && !restorative)) { setActErr("Sélectionnez un membre simple : les administrateurs et le propriétaire sont protégés."); return; }
    if (a === "ban" && !window.confirm(`Bannir ${targetMember?.name} ?`)) return;
    if (a === "kick" && !window.confirm(`Expulser ${targetMember?.name} du groupe ?`)) return;
    void act(a, { targetUserId: targetId, ...extra });
  };
  const r = reason.trim() || undefined;

  const ui = (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Modération du groupe" style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#f0f2f5", width: "100%", maxWidth: 640, height: "94dvh", borderRadius: "18px 18px 0 0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>BrutePawa Bot</div>
            <div style={{ fontSize: 12.5, color: form.enabled && !dirty ? "var(--bp-primary)" : "#65676b" }}>
              {data ? (data.settings.enabled ? "Modération active" : "Modération désactivée") : "Chargement"}
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer" style={{ ...btn(), minWidth: 44 }}>Fermer</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 12, WebkitOverflowScrolling: "touch" }}>
          {loading && <div aria-busy="true" role="status">{[0, 1, 2].map(i => <div key={i} style={{ ...card, height: 90, opacity: 0.5 }} />)}<span style={{ position: "absolute", left: -9999 }}>Chargement</span></div>}
          {!loading && !data && (
            <div role="alert" style={card}>
              <p style={{ margin: "0 0 10px", color: "#d93025", fontWeight: 600 }}>{loadErr || "Impossible de charger la configuration."}</p>
              <button type="button" style={btn(true)} onClick={() => { setLoading(true); void load(); }}>Réessayer</button>
            </div>
          )}
          {data && (<>
            {loadErr && <div role="alert" style={{ ...card, color: "#d93025", fontSize: 13 }}>Actualisation impossible : {loadErr}</div>}

            <fieldset disabled={data.myRole !== "owner" && !data.settings.permissions.manageSettings} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            <section style={card} aria-labelledby="bp-g">
              <h3 id="bp-g" style={h3}>Fonctionnement</h3>
              <Toggle label={data.settings.enabled ? "Activer le bot de modération" : "Ajouter BrutePawa Bot"} checked={form.enabled} onChange={v => set("enabled", v)} />
              <p style={hint}>Protégez automatiquement votre groupe contre le spam, les abus et les comportements indésirables.</p>
              <p style={hint}>
                L'action choisie s'applique aux infractions. Les avertissements peuvent déclencher une sourdine puis la sanction finale configurée, uniquement si les permissions l'autorisent.
                Un message bloqué n'est jamais publié. Un bannissement interdit l'invitation et l'ajout tant qu'il n'est pas levé ; lever un bannissement ne fait pas rejoindre le groupe automatiquement.
              </p>
              <p style={hint}>
                Désactiver le bot arrête le filtrage automatique, mais les sanctions déjà en cours (sourdines, bannissements, avertissements) restent appliquées jusqu'à expiration ou retrait manuel.
              </p>
            </section>

            <section style={card} aria-labelledby="bp-s">
              <h3 id="bp-s" style={h3}>Anti-spam</h3>
              <Toggle label="Détecter les répétitions, les médias et les mentions excessives" checked={form.antiSpam} onChange={v => set("antiSpam", v)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                {num("maxMessages", 2, 30, "Messages maximum")}
                {num("windowSeconds", 3, 120, "Fenêtre (secondes)")}
              </div>
            </section>

            <section style={card} aria-labelledby="bp-l">
              <h3 id="bp-l" style={h3}>Liens et mots interdits</h3>
              <Toggle label="Bloquer les liens" checked={form.blockLinks} onChange={v => set("blockLinks", v)} />
              <Field label="Domaines autorisés" help="Un nom d'hôte par ligne, sans https:// ni chemin.">
                <textarea style={{ ...input, minHeight: 70 }} value={domainsTxt} onChange={e => { setDomainsTxt(e.target.value); dirtyRef.current = true; setDirty(true); }} placeholder="exemple.com" />
              </Field>
              <Field label="Mots interdits" help="Un mot ou une expression par ligne.">
                <textarea style={{ ...input, minHeight: 70 }} value={wordsTxt} onChange={e => { setWordsTxt(e.target.value); dirtyRef.current = true; setDirty(true); }} />
              </Field>
            </section>

            <section style={card} aria-labelledby="bp-w">
              <h3 id="bp-w" style={h3}>Sanctions</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {num("warnBeforeMute", 1, 10, "Seuil de sourdine")}
                {num("warnBeforeBan", 2, 30, "Seuil de sanction finale")}
              </div>
              {num("muteMinutes", 1, 43200, "Durée de sourdine (minutes)")}
              <p style={hint}>Le seuil de sanction finale doit être supérieur à celui de sourdine.</p>
            </section>

            <section style={card} aria-labelledby="bp-r">
              <h3 id="bp-r" style={h3}>Règles et bienvenue</h3>
              <Field label="Règles (commande /rules)" help={`${form.rules.length}/2000`}>
                <textarea style={{ ...input, minHeight: 80 }} maxLength={2000} value={form.rules} onChange={e => set("rules", e.target.value)} />
              </Field>
              <Field label="Message de bienvenue" help={`Vide : désactivé. ${form.welcomeMessage.length}/1000`}>
                <textarea style={{ ...input, minHeight: 80 }} maxLength={1000} value={form.welcomeMessage} onChange={e => set("welcomeMessage", e.target.value)} />
              </Field>
            </section>

            <WelcomePreview form={form} template={form.welcomeMessage} groupName={groupName ?? "votre groupe"} memberCount={members.length} username={members[0]?.name ?? "{username}"} setEnabled={v => set("welcomeEnabled", v)} />
            <ProtectionSection form={form} set={set} />
            <PermissionsSection form={form} set={set} isOwner={data.myRole === "owner"} />

            <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button type="button" style={{ ...btn(true), opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={() => void save()}>{saving ? "Enregistrement..." : "Enregistrer"}</button>
              {dirty && !saving && <span style={{ fontSize: 12.5, color: "#65676b" }}>Modifications non enregistrées</span>}
              {saveMsg && <span role={saveMsg.ok ? "status" : "alert"} style={{ fontSize: 13, fontWeight: 600, color: saveMsg.ok ? "var(--bp-primary)" : "#d93025" }}>{saveMsg.text}</span>}
            </div>
            </fieldset>
            {data.myRole !== "owner" && !data.settings.permissions.manageSettings && <p style={hint}>Le propriétaire n'a pas autorisé la modification des paramètres du bot.</p>}

            <section style={card} aria-labelledby="bp-a">
              <h3 id="bp-a" style={h3}>Actions des administrateurs</h3>
              <Field label="Membre" help="Seuls les membres simples peuvent être sanctionnés.">
                <select style={input} value={target} onChange={e => setTarget(e.target.value)}>
                  <option value="">Choisir un membre</option>
                  {selectableMembers.map(m => <option key={m.userId} value={m.userId} disabled={m.role !== "member"}>
                    {m.name} (ID {m.userId}){m.role === "owner" ? " - propriétaire" : m.role === "admin" ? " - admin" : ""}
                  </option>)}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Field label="Durée de sourdine (min)">
                  <select aria-label="Durée prédéfinie" style={{ ...input, marginBottom: 6 }} value={["1", "5", "10", "60", "360", "720", "1440", "10080"].includes(minutes) ? minutes : "custom"} onChange={e => { if (e.target.value !== "custom") setMinutes(e.target.value); else setMinutes(""); }}>
                    {[["1", "1 minute"], ["5", "5 minutes"], ["10", "10 minutes"], ["60", "1 heure"], ["360", "6 heures"], ["720", "12 heures"], ["1440", "24 heures"], ["10080", "7 jours"], ["custom", "Personnalisée"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input aria-label="Durée personnalisée en minutes" style={input} type="number" min={1} max={43200} value={minutes} onChange={e => setMinutes(e.target.value)} />
                </Field>
                <Field label="Raison (facultatif)"><input style={input} value={reason} maxLength={200} onChange={e => setReason(e.target.value)} /></Field>
              </div>
              {targetSanction && <p style={hint}>Avertissements : {targetSanction.warnings}{targetSanction.banned ? " - banni" : ""}{targetSanction.mutedUntil && new Date(targetSanction.mutedUntil).getTime() > now ? ` - sourdine jusqu'à ${fmt(targetSanction.mutedUntil)}` : ""}</p>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" style={btn()} disabled={!canAct("warn")} onClick={() => runTarget("warn", { reason: r })}>Avertir</button>
                <button type="button" style={btn()} disabled={!canAct("mute")} onClick={() => { const n = Number(minutes); if (!Number.isInteger(n) || n < 1 || n > 43200) { setActErr("Durée : entre 1 et 43200 minutes."); return; } runTarget("mute", { durationMinutes: n, reason: r }); }}>Sourdine</button>
                <button type="button" style={btn()} disabled={!canAct("unmute")} onClick={() => runTarget("unmute")}>Fin de sourdine</button>
                <button type="button" style={btn(false, true)} disabled={!canAct("kick")} onClick={() => runTarget("kick", { reason: r })}>Expulser</button>
                <button type="button" style={btn(false, true)} disabled={!canAct("ban")} onClick={() => runTarget("ban", { reason: r })}>Bannir</button>
                <button type="button" style={btn()} disabled={!canAct("unban")} onClick={() => runTarget("unban")}>Lever le bannissement</button>
                <button type="button" style={btn()} disabled={!canAct("reset")} onClick={() => runTarget("reset")}>Remettre à zéro</button>
                <button type="button" style={btn()} disabled={!canAct("verify")} onClick={() => runTarget("verify")}>Valider le membre</button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}><Field label="Supprimer un message (ID du message)"><input style={input} inputMode="numeric" value={msgId} onChange={e => setMsgId(e.target.value)} /></Field></div>
                <button type="button" style={{ ...btn(false, true), marginBottom: 10 }} disabled={!canAct("delete")} onClick={() => {
                  const n = Number(msgId);
                  if (!Number.isInteger(n) || n < 1) { setActErr("ID de message invalide."); return; }
                  if (!window.confirm(`Supprimer le message ${n} ?`)) return;
                  void act("delete", { messageId: n, reason: r }).then(ok => { if (ok) setMsgId(""); });
                }}>Supprimer</button>
              </div>
              {actErr && <p role="alert" style={{ color: "#d93025", fontSize: 13, fontWeight: 600 }}>{actErr}</p>}
            </section>

            {data.myRole === "owner" || data.settings.permissions.viewStats ? <BotStatsSection groupId={groupId} /> : <p style={hint}>La consultation des statistiques n'est pas autorisée.</p>}

            <section style={card} aria-labelledby="bp-c">
              <h3 id="bp-c" style={h3}>Commandes de chat</h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8, fontFamily: "monospace" }}>
                <li>/warn ID raison</li><li>/mute ID minutes raison</li><li>/kick ID raison</li><li>/ban ID raison</li>
                <li>/unmute ID</li><li>/unban ID</li><li>/reset ID</li><li>/delete messageID</li><li>/rules</li>
                <li>/help</li><li>/settings</li><li>/moderation</li><li>/logs</li><li>/stats</li>
              </ul>
              <p style={hint}>Les identifiants des membres :</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13.5 }}>
                {members.map(m => <li key={m.userId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <span>{m.name} <span style={{ color: "#65676b" }}>({m.role === "owner" ? "propriétaire" : m.role === "admin" ? "admin" : "membre"})</span></span>
                  <span style={{ fontFamily: "monospace" }}>ID {m.userId}</span>
                </li>)}
              </ul>
            </section>

            <section style={card} aria-labelledby="bp-sa">
              <h3 id="bp-sa" style={h3}>Sanctions en cours</h3>
              {activeSanctions.length === 0 ? <p style={hint}>Aucune sanction active dans ce groupe.</p> :
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {activeSanctions.map(s => {
                    const muted = !!s.mutedUntil && new Date(s.mutedUntil).getTime() > now;
                    return <li key={s.userId} style={{ padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: 13.5 }}>
                      <strong>{s.name}</strong> <span style={{ fontFamily: "monospace", color: "#65676b" }}>ID {s.userId}</span>
                      <div style={{ color: "#444" }}>Avertissements : {s.warnings}{muted ? ` - sourdine jusqu'à ${fmt(s.mutedUntil!)}` : ""}{s.banned ? " - banni" : ""}{s.verificationUntil && new Date(s.verificationUntil).getTime() > now ? " - confirmation des règles attendue" : ""}</div>
                    </li>;
                  })}
                </ul>}
            </section>

            <section style={card} aria-labelledby="bp-h">
              <h3 id="bp-h" style={h3}>Historique</h3>
              {logs.length === 0 ? <p style={hint}>{data.myRole !== "owner" && !data.settings.permissions.viewLogs ? "La consultation de l'historique n'est pas autorisée." : "Aucun événement enregistré."}</p> :
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {logs.map(l => <li key={l.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>{ACTION_LABELS[l.action] ?? l.action}</strong><span style={{ color: "#65676b" }}>{fmt(l.createdAt)}</span>
                    </div>
                    <div style={{ color: "#444" }}>Cible : {nameOf(l.targetUserId)}{l.targetUserId != null ? ` (ID ${l.targetUserId})` : ""} - Par : {l.actorId == null ? "bot" : nameOf(l.actorId)}</div>
                    {l.detail && <div style={{ color: "#65676b" }}>{l.detail}</div>}
                    {l.messageId != null && <div style={hint}>Message concerné : ID {l.messageId}</div>}
                    {l.expiresAt && <div style={hint}>Expiration : {fmt(l.expiresAt)}</div>}
                    {l.metadata && Object.keys(l.metadata).length > 0 && <details style={{ fontSize: 12, marginTop: 4 }}><summary>Détails techniques de l'événement</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", margin: "4px 0" }}>{JSON.stringify(l.metadata, null, 2)}</pre></details>}
                  </li>)}
                </ul>}
            </section>
          </>)}
        </div>
      </div>
    </div>
  );
  return createPortal(ui, document.body);
}
