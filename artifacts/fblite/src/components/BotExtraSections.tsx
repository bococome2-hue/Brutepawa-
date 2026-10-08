import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { apiFetch } from "../lib/api";

export type Perms = Record<string, boolean>;
export interface BotExtra {
  antiFlood: boolean; duplicateThreshold: number; maxMedia: number; maxMentions: number;
  wordFilter: boolean; newMemberProtection: boolean; protectionMinutes: number;
  verificationEnabled: boolean; verificationMinutes: number; welcomeEnabled: boolean;
  violationAction: "delete" | "warn" | "mute" | "kick" | "ban";
  finalSanction: "mute" | "kick" | "ban";
  permissions: Perms;
}
export const EXTRA_DEFAULTS: BotExtra = {
  antiFlood: true, duplicateThreshold: 3, maxMedia: 3, maxMentions: 8, wordFilter: true,
  newMemberProtection: false, protectionMinutes: 10, verificationEnabled: false, verificationMinutes: 10,
  welcomeEnabled: true, violationAction: "warn", finalSanction: "mute",
  permissions: { deleteMessages: true, deleteMedia: true, deleteLinks: true, warn: true, mute: true, kick: false, ban: false, unban: false, viewLogs: true, viewStats: true, manageSettings: true },
};
export const PERM_LABELS: [string, string][] = [
  ["deleteMessages", "Supprimer des messages"], ["deleteMedia", "Supprimer des médias"], ["deleteLinks", "Supprimer des liens"],
  ["warn", "Avertir"], ["mute", "Mettre en sourdine"], ["kick", "Expulser"], ["ban", "Bannir"], ["unban", "Lever un bannissement"],
  ["viewLogs", "Consulter l'historique"], ["viewStats", "Consulter les statistiques"], ["manageSettings", "Modifier la configuration"],
];
export function validateExtra(s: BotExtra): string {
  const chk = (v: number, a: number, b: number) => Number.isInteger(v) && v >= a && v <= b;
  if (!chk(s.duplicateThreshold, 2, 10)) return "Messages identiques : entre 2 et 10.";
  if (!chk(s.maxMedia, 1, 30)) return "Médias maximum : entre 1 et 30.";
  if (!chk(s.maxMentions, 2, 100)) return "Mentions maximum : entre 2 et 100.";
  if (!chk(s.protectionMinutes, 1, 1440)) return "Protection des nouveaux membres : entre 1 et 1440 minutes.";
  if (!chk(s.verificationMinutes, 1, 60)) return "Délai de confirmation : entre 1 et 60 minutes.";
  return "";
}

const card: CSSProperties = { background: "#fff", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" };
const h3: CSSProperties = { margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "#1c1e21" };
const hint: CSSProperties = { fontSize: 12.5, color: "#65676b", margin: "4px 0 8px", lineHeight: 1.45 };
const input: CSSProperties = { width: "100%", boxSizing: "border-box", minHeight: 44, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)", fontSize: 15, fontFamily: "inherit", background: "#fff" };
const chipBtn = (on: boolean): CSSProperties => ({ minHeight: 44, padding: "0 14px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", border: "1.5px solid var(--bp-primary)", background: on ? "var(--bp-primary)" : "#fff", color: on ? "#fff" : "var(--bp-primary)" });

function Tg({ label, checked, onChange, desc, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; desc?: string; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      <input className="bp-bot-switch" type="checkbox" role="switch" disabled={disabled} checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 22, height: 22, accentColor: "var(--bp-primary)", flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 700, fontSize: 14.5 }}>{label}</span>
        {desc && <span style={{ display: "block", fontSize: 12.5, color: "#65676b" }}>{desc}</span>}
      </span>
    </label>
  );
}
function Num({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{label}</span>
      <input style={input} type="number" inputMode="numeric" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} />
      <span style={{ display: "block", fontSize: 12, color: "#65676b", marginTop: 3 }}>Entre {min} et {max}</span>
    </label>
  );
}

type SetFn = <K extends keyof BotExtra>(k: K, v: BotExtra[K]) => void;

export function ProtectionSection({ form, set }: { form: BotExtra; set: SetFn }) {
  const act = { delete: "Supprimer le message", warn: "Avertir", mute: "Mise en sourdine", kick: "Expulser", ban: "Bannir" } as const;
  return (
    <section style={card} aria-labelledby="bp-p">
      <h3 id="bp-p" style={h3}>Protection avancée</h3>
      <Tg label="Anti-flood" desc="Limite le nombre de messages envoyés dans la fenêtre configurée." checked={form.antiFlood} onChange={v => set("antiFlood", v)} />
      <Num label="Messages identiques avant action (anti-spam)" value={form.duplicateThreshold} min={2} max={10} onChange={n => set("duplicateThreshold", n)} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
        <Num label="Médias maximum" value={form.maxMedia} min={1} max={30} onChange={n => set("maxMedia", n)} />
        <Num label="Mentions maximum" value={form.maxMentions} min={2} max={100} onChange={n => set("maxMentions", n)} />
      </div>
      <Tg label="Filtre de mots interdits" checked={form.wordFilter} onChange={v => set("wordFilter", v)} />
      <Tg label="Protection des nouveaux membres" desc="Restrictions renforcées pendant leurs premières minutes." checked={form.newMemberProtection} onChange={v => set("newMemberProtection", v)} />
      {form.newMemberProtection && <Num label="Durée de protection (minutes)" value={form.protectionMinutes} min={1} max={1440} onChange={n => set("protectionMinutes", n)} />}
      <Tg label="Confirmation de lecture des règles" desc="Le nouveau membre confirme qu'il a lu les règles. Ce n'est pas un CAPTCHA." checked={form.verificationEnabled} onChange={v => set("verificationEnabled", v)} />
      {form.verificationEnabled && <Num label="Délai de confirmation (minutes)" value={form.verificationMinutes} min={1} max={60} onChange={n => set("verificationMinutes", n)} />}
      <label style={{ display: "block", marginBottom: 10 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Action en cas d'infraction</span>
        <select style={input} value={form.violationAction} onChange={e => set("violationAction", e.target.value as BotExtra["violationAction"])}>
          {(Object.keys(act) as (keyof typeof act)[]).map(k => <option key={k} value={k}>{act[k]}</option>)}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 4 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Sanction finale</span>
        <select style={input} value={form.finalSanction} onChange={e => set("finalSanction", e.target.value as BotExtra["finalSanction"])}>
          <option value="mute">Mise en sourdine</option><option value="kick">Expulsion</option><option value="ban">Bannissement</option>
        </select>
      </label>
      <p style={hint}>Les sanctions kick et ban nécessitent que les administrateurs disposent de la permission correspondante.</p>
    </section>
  );
}

export function PermissionsSection({ form, set, isOwner }: { form: BotExtra; set: SetFn; isOwner: boolean }) {
  return (
    <section style={card} aria-labelledby="bp-pm">
      <h3 id="bp-pm" style={h3}>Permissions des administrateurs</h3>
      <p style={hint}>{isOwner ? "Accordez uniquement ce qui est nécessaire. Ces permissions limitent les actions du bot et de ses administrateurs. Seul le propriétaire peut les modifier." : "Seul le propriétaire peut modifier ces permissions."}</p>
      {PERM_LABELS.map(([k, l]) => (
        <Tg key={k} label={l} disabled={!isOwner} checked={!!form.permissions[k]} onChange={v => set("permissions", { ...form.permissions, [k]: v })} />
      ))}
    </section>
  );
}

export function WelcomePreview({ form, template, groupName, memberCount, username, setEnabled }: { form: BotExtra; template: string; groupName: string; memberCount: number; username: string; setEnabled: (v: boolean) => void }) {
  const date = new Date().toLocaleDateString("fr-FR", { timeZone: "UTC" });
  const vals: Record<string, string> = { username, group: groupName, group_name: groupName, date, member_count: String(memberCount) };
  const out = template.replace(/\{(username|group|group_name|date|member_count)\}/g, (_, k: string) => vals[k]);
  return (
    <section style={card} aria-labelledby="bp-wp">
      <h3 id="bp-wp" style={h3}>Message de bienvenue</h3>
      <Tg label="Envoyer le message de bienvenue" checked={form.welcomeEnabled} onChange={setEnabled} />
      <p style={hint}>Variables : {"{username}"}, {"{group_name}"}, {"{group}"}, {"{date}"}, {"{member_count}"}. Le nombre de membres affiché est celui actuellement chargé.</p>
      <div style={{ background: "#f0f2f5", borderRadius: 12, padding: 12, fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: form.welcomeEnabled ? 1 : 0.5 }} aria-live="polite">
        {template.trim() ? out : "Aucun message : saisissez un texte ci-dessus pour voir l'aperçu."}
      </div>
    </section>
  );
}

interface Stats { analyzed: number; deleted: number; blocked: number; spam: number; links: number; warnings: number; mutes: number; kicks: number; bans: number; protectedUsers: number; trackingSince: string | null; timeZone: string }
const PERIODS: [string, string][] = [["today", "Aujourd'hui"], ["seven", "7 jours"], ["thirty", "30 jours"], ["total", "Total"]];

export function BotStatsSection({ groupId }: { groupId: number }) {
  const [period, setPeriod] = useState("seven");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true); setErr("");
    try {
      const res = await apiFetch(`/chat-groups/${groupId}/bot/statistics?period=${period}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; throw new Error(b.error ?? `Erreur ${res.status}`); }
      const result = await res.json() as Stats;
      if (current === generation.current) setStats(result);
    } catch (e) { if (current === generation.current) { setStats(null); setErr(e instanceof Error ? e.message : "Erreur de chargement"); } }
    finally { if (current === generation.current) setLoading(false); }
  }, [groupId, period]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const rows: [string, number][] = stats ? [
    ["Messages analysés", stats.analyzed], ["Bloqués avant publication", stats.blocked], ["Messages supprimés", stats.deleted],
    ["Spam", stats.spam], ["Liens", stats.links], ["Avertissements", stats.warnings], ["Sourdines", stats.mutes],
    ["Expulsions", stats.kicks], ["Bannissements", stats.bans], ["Membres protégés", stats.protectedUsers],
  ] : [];
  const empty = !!stats && rows.every(([, n]) => n === 0);
  const wrap = (c: ReactNode) => <section id="bp-stats" style={card} aria-labelledby="bp-st"><h3 id="bp-st" style={h3}>Statistiques du bot</h3>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }} role="group" aria-label="Période">
      {PERIODS.map(([k, l]) => <button key={k} type="button" aria-pressed={period === k} style={chipBtn(period === k)} onClick={() => setPeriod(k)}>{l}</button>)}
    </div>{c}</section>;
  if (loading) return wrap(<div aria-busy="true" role="status" style={{ height: 80, background: "#f0f2f5", borderRadius: 10, opacity: 0.6 }}><span style={{ position: "absolute", left: -9999 }}>Chargement</span></div>);
  if (err) return wrap(<div role="alert"><p style={{ color: "#d93025", fontWeight: 600, margin: "0 0 8px" }}>{err}</p><button type="button" style={chipBtn(true)} onClick={() => void load()}>Réessayer</button></div>);
  return wrap(<>
    {empty && <p style={hint}>Aucun événement enregistré sur cette période.</p>}
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {rows.map(([l, n]) => <li key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: 14 }}><span>{l}</span><strong>{n}</strong></li>)}
    </ul>
    <p style={hint}>{stats?.trackingSince ? `Suivi des analyses depuis le ${new Date(stats.trackingSince).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" })} (${stats.timeZone}). Les compteurs d'analyses ne sont pas reconstitués rétroactivement ; les sanctions proviennent du journal conservé.` : "Le suivi des analyses n'a pas encore démarré pour ce groupe."} Les messages bloqués avant publication sont comptés séparément des messages réellement supprimés.</p>
  </>);
}
