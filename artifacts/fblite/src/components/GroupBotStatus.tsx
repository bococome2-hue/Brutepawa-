import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

interface Profile { name: string; handle: string; official: boolean; enabled: boolean; description: string; pendingVerification: boolean; verificationExpiresAt?: string | null }

interface GroupBotStatusProps {
  groupId: number;
  onSettings?: () => void;
  onModeration?: () => void;
  onStatistics?: () => void;
}

export default function GroupBotStatus({ groupId, onSettings, onModeration, onStatistics }: GroupBotStatusProps) {
  const [p, setP] = useState<Profile | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const currentRequest = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const load = useCallback(async () => {
    if (currentRequest.current) return;
    const controller = new AbortController();
    currentRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await apiFetch(`/chat-groups/${groupId}/bot/profile`, { signal: controller.signal });
      if (!res.ok) throw new Error("Statut du bot indisponible");
      const profile = await res.json() as Profile;
      if (mounted.current) { setP(profile); setErr(""); setNow(Date.now()); }
    } catch (e) { if (mounted.current) { setP(null); setErr(e instanceof Error ? e.message : "Erreur"); } }
    finally { clearTimeout(timeout); if (currentRequest.current === controller) currentRequest.current = null; }
  }, [groupId]);

  useEffect(() => {
    mounted.current = true; setP(null); void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const t = setInterval(refresh, 15000);
    window.addEventListener("online", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { mounted.current = false; currentRequest.current?.abort(); currentRequest.current = null; clearInterval(t); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  useEffect(() => { if (!p?.pendingVerification) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [p?.pendingVerification]);

  const verify = async () => {
    setBusy(true); setErr("");
    try {
      const res = await apiFetch(`/chat-groups/${groupId}/bot/verify`, { method: "POST" });
      if (!res.ok) throw new Error("Confirmation impossible");
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Confirmation impossible"); }
    finally { setBusy(false); }
  };

  const exp = p?.verificationExpiresAt ? new Date(p.verificationExpiresAt).getTime() : 0;
  const left = Math.max(0, Math.floor((exp - now) / 1000));
  const pending = !!p?.pendingVerification && (exp === 0 || left > 0);
  if (!p && !err) return null;
  const btn = { minHeight: 44, padding: "0 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none", background: "var(--bp-primary)", color: "#fff" } as const;

  return (
    <div className="bp-group-bot-card">
      {p && (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="bp-group-bot-profile">
          <span aria-hidden className="bp-group-bot-avatar">BP</span>
          <span className="bp-group-bot-identity">
            <span className="bp-group-bot-name">{p.name}{p.official && <svg aria-label="Compte officiel vérifié" viewBox="0 0 20 20" width="16" height="16"><path fill="#22C55E" d="M10 1.4 12.3 2l2.3-.3 1.2 2 2 1.2-.3 2.3.7 2.3-.7 2.3.3 2.3-2 1.2-1.2 2-2.3-.3-2.3.7-2.3-.7-2.3.3-1.2-2-2-1.2.3-2.3L1.8 9.5l.7-2.3-.3-2.3 2-1.2 1.2-2 2.3.3z"/><path d="m6.5 10 2.2 2.2 4.7-4.8" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
            <span className="bp-group-bot-handle">{p.handle}{p.official ? " · Officiel" : ""}</span>
          </span>
          <span className={`bp-group-bot-state${p.enabled ? " is-active" : ""}`}><i />{p.enabled ? "Actif" : "Inactif"}<svg aria-hidden viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></span>
        </button>
      )}
      {open && p && <p className="bp-group-bot-description">{p.description}</p>}
      {pending && (
        <div role="region" aria-label="Confirmation requise" style={{ background: "var(--bp-green-surface)", borderRadius: 12, padding: 10, margin: "6px 0" }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.45, color: "#1c1e21" }}>
            Confirmez que vous avez lu les règles du groupe. Il s'agit d'une simple confirmation de votre part, pas d'un CAPTCHA.
            {exp > 0 && ` Temps restant : ${Math.floor(left / 60)} min ${String(left % 60).padStart(2, "0")} s.`}
          </p>
          <button type="button" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={() => void verify()}>{busy ? "Envoi..." : "Je suis humain"}</button>
        </div>
      )}
      {err && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#d93025", padding: "4px 0" }}>
          <span style={{ flex: 1 }}>{err}</span>
          <button type="button" style={{ ...btn, background: "#fff", color: "var(--bp-primary)", border: "1.5px solid var(--bp-primary)" }} onClick={() => void (p?.pendingVerification ? verify() : load())}>Réessayer</button>
        </div>
      )}
      {(onSettings || onModeration || onStatistics) && <div className="bp-group-bot-actions">
        {onSettings && <button onClick={onSettings}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z"/></svg><span>Paramètres</span></button>}
        {onModeration && <button onClick={onModeration}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg><span>Bot de modération</span></button>}
        {onStatistics && <button onClick={onStatistics}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 20v-7h4v7M10 20V4h4v16M16 20v-11h4v11"/></svg><span>Statistiques</span></button>}
      </div>}
      <style>{`
        .bp-group-bot-card{flex-shrink:0;margin:8px 12px 6px;background:rgba(255,255,255,.97);border:1px solid rgba(255,255,255,.9);border-radius:17px;box-shadow:0 4px 14px rgba(41,105,56,.12);overflow:hidden}
        .bp-group-bot-profile{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;padding:7px 13px;background:none;border:0;text-align:left;cursor:pointer}
        .bp-group-bot-avatar{width:44px;height:44px;flex:none;border-radius:50%;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800}
        .bp-group-bot-identity{display:flex;flex:1;min-width:0;flex-direction:column;gap:1px}
        .bp-group-bot-name{display:flex;align-items:center;gap:4px;color:#111827;font-size:17px;font-weight:750;line-height:22px}
        .bp-group-bot-handle{color:#7a818b;font-size:14px;line-height:18px}
        .bp-group-bot-state{display:flex;align-items:center;gap:5px;color:#667085;font-size:12px;padding:6px 8px;border-radius:18px;background:#f2f4f2}
        .bp-group-bot-state i{width:8px;height:8px;border-radius:50%;background:#98a2a0}
        .bp-group-bot-state.is-active{background:#eaf8ed;color:#207a38}.bp-group-bot-state.is-active i{background:#16a34a}
        .bp-group-bot-actions{min-height:51px;border-top:1px solid #edf0ed;display:grid;grid-template-columns:1fr 1.22fr 1fr}
        .bp-group-bot-actions button{display:flex;align-items:center;justify-content:center;gap:8px;min-width:0;padding:5px 4px;background:none;border:0;color:#202522;font-family:inherit;font-size:13.5px;font-weight:500;line-height:1.15;cursor:pointer;white-space:nowrap}
        .bp-group-bot-actions button+button{border-left:1px solid #e9ede9}
        .bp-group-bot-actions svg{width:21px;height:21px;flex:none;color:#149447}
        .bp-group-bot-description{margin:0;padding:0 16px 8px 66px;color:#65676b;font-size:12px;line-height:1.4}
        @media(max-width:360px){.bp-group-bot-actions button{font-size:10px;gap:4px}.bp-group-bot-actions svg{width:18px;height:18px}}
      `}</style>
    </div>
  );
}
