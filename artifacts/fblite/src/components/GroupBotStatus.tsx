import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

interface Profile { name: string; handle: string; official: boolean; enabled: boolean; description: string; pendingVerification: boolean; verificationExpiresAt?: string | null }

export default function GroupBotStatus({ groupId }: { groupId: number }) {
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
    <div style={{ flexShrink: 0, background: "rgba(255,255,255,0.96)", borderTop: "1px solid rgba(0,0,0,0.06)", padding: "6px 14px" }}>
      {p && (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: 0, padding: "4px 0", textAlign: "left", minHeight: 36 }}>
          <span aria-hidden style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--bp-primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>BP</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#1c1e21" }}>{p.name} <span style={{ color: "var(--bp-primary)", fontWeight: 600 }}>{p.handle}</span>{p.official ? " - Officiel" : ""}</span>
          <span style={{ fontSize: 12, color: p.enabled ? "var(--bp-primary)" : "#65676b" }}>{p.enabled ? "Actif" : "Inactif"}</span>
        </button>
      )}
      {open && p && <p style={{ fontSize: 12.5, color: "#65676b", margin: "4px 0 6px", lineHeight: 1.45 }}>{p.description}</p>}
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
    </div>
  );
}
