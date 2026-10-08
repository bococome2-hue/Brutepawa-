import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiFetch, getBpToken } from "../lib/api";

const C = { bg:"#F8FAFC",card:"#FFFFFF",primary:"var(--bp-primary)",text:"#111827",secondary:"#64748B",muted:"#9CA3AF",border:"#E5E7EB",shadow:"0 2px 16px rgba(0,0,0,0.05)" };

const Toggle = ({ on,onChange }:{on:boolean;onChange:(v:boolean)=>void}) => (
  <div onClick={()=>onChange(!on)} style={{ width:52,height:30,borderRadius:15,background:on?C.primary:"#E5E7EB",position:"relative",cursor:"pointer",transition:"background 250ms",flexShrink:0,boxShadow:on?"0 2px 10px rgba(34,197,94,0.35)":"inset 0 1px 3px rgba(0,0,0,0.08)" }}>
    <div style={{ position:"absolute",top:3,left:on?"calc(100% - 27px)":3,width:24,height:24,borderRadius:"50%",background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.2)",transition:"left 250ms cubic-bezier(0.34,1.56,0.64,1)" }}/>
  </div>
);

const Footer = () => (
  <div style={{ textAlign:"center",padding:"20px 0 32px" }}>
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:4 }}>
      <div style={{ width:24,height:24,borderRadius:7,background:C.primary,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:"#fff",fontWeight:900,fontSize:14,fontFamily:"Arial,sans-serif" }}>b</span></div>
      <span style={{ fontWeight:700,fontSize:15,color:C.text }}>BrutePawa</span>
    </div>
    <div style={{ fontSize:12,color:C.secondary }}>Connecter · Partager · Créer</div>
  </div>
);

const sv = { strokeWidth:1.8,strokeLinecap:"round" as const };

function formatSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes/1073741824).toFixed(1)} Go`;
  return `${Math.round(bytes/1048576)} Mo`;
}
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return `Aujourd'hui, ${d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}`;
    }
    return d.toLocaleDateString("fr-FR",{day:"numeric",month:"long"}) + ", " + d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  } catch { return iso; }
}

export default function ChatBackupPage() {
  const navigate = useNavigate();
  const [autoBackup, setAutoBackup] = useState(true);
  const [inclVideos, setInclVideos] = useState(false);
  const [inclFiles, setInclFiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastBackup, setLastBackup] = useState(new Date().toISOString());
  const [backupSize, setBackupSize] = useState(134217728);
  const isLoggedIn = !!getBpToken();

  useEffect(() => {
    if (!isLoggedIn) return;
    apiFetch("/messaging/backup")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setAutoBackup(d.autoBackup ?? true);
        setInclVideos(d.includeVideos ?? false);
        setInclFiles(d.includeFiles ?? false);
        setLastBackup(d.lastBackup ?? new Date().toISOString());
        setBackupSize(d.backupSize ?? 134217728);
      });
  }, []);

  const patch = async (patch: object) => {
    if (!isLoggedIn) return;
    await apiFetch("/messaging/backup", { method:"PATCH", body:JSON.stringify(patch) });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isLoggedIn) {
        const r = await apiFetch("/messaging/backup/now", { method:"POST" });
        if (r.ok) {
          const d = await r.json();
          setLastBackup(d.lastBackup);
          setBackupSize(d.backupSize);
        }
      }
      setSaved(true);
      setTimeout(()=>setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Sauvegarde des discussions</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ padding:"16px 14px 0" }}>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,padding:"18px",marginBottom:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:16 }}>
            <div style={{ width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#DCFCE7,#BBF7D0)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(34,197,94,0.2)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.primary} {...sv}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            </div>
            <div>
              <div style={{ fontWeight:700,fontSize:15,color:C.text }}>Dernière sauvegarde</div>
              <div style={{ fontSize:13,color:C.secondary,marginTop:2 }}>{formatDate(lastBackup)}</div>
              <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>Taille : {formatSize(backupSize)}</div>
            </div>
          </div>
          <button onClick={handleSave} style={{ width:"100%",background:saving||saved?"var(--bp-primary-dark)":"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))",color:"#fff",border:"none",borderRadius:18,padding:"14px",fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:"0 6px 20px rgba(34,197,94,0.3)",transition:"all 300ms",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            {saving ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation:"spin 1s linear infinite" }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0"/></svg>Sauvegarde en cours...</>
            ) : saved ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>Sauvegardé !</>
            ) : "Sauvegarder maintenant"}
          </button>
        </div>

        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden",marginBottom:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:"1px solid #F8FAFC" }}>
            <div style={{ width:42,height:42,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} {...sv}><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:500,fontSize:14,color:C.text }}>Sauvegarde automatique</div>
              <div style={{ fontSize:12,color:C.muted }}>Quotidienne</div>
            </div>
            <Toggle on={autoBackup} onChange={v=>{setAutoBackup(v);patch({autoBackup:v});}}/>
          </div>

          <button style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:"none",border:"none",cursor:"pointer",width:"100%",textAlign:"left",borderBottom:"1px solid #F8FAFC" }}>
            <div style={{ width:42,height:42,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.primary} {...sv}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:500,fontSize:14,color:C.text }}>Compte de sauvegarde</div>
              <div style={{ fontSize:12,color:C.muted }}>pat***@brutepawa.com</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>
          </button>

          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:"1px solid #F8FAFC" }}>
            <div style={{ width:42,height:42,borderRadius:"50%",background:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.secondary} {...sv}><polygon points="23,7 16,12 23,17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            </div>
            <div style={{ flex:1 }}><div style={{ fontWeight:500,fontSize:14,color:C.text }}>Inclure les vidéos</div></div>
            <Toggle on={inclVideos} onChange={v=>{setInclVideos(v);patch({includeVideos:v});}}/>
          </div>

          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px" }}>
            <div style={{ width:42,height:42,borderRadius:"50%",background:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.secondary} {...sv}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13,2 13,9 20,9"/></svg>
            </div>
            <div style={{ flex:1 }}><div style={{ fontWeight:500,fontSize:14,color:C.text }}>Inclure les fichiers</div></div>
            <Toggle on={inclFiles} onChange={v=>{setInclFiles(v);patch({includeFiles:v});}}/>
          </div>
        </div>

        <div style={{ background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",borderRadius:20,padding:"14px 16px",display:"flex",gap:10,border:"1px solid #BBF7D0" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary-dark)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0,marginTop:1 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          <p style={{ fontSize:13,color:"var(--bp-primary-dark)",margin:0,lineHeight:1.6 }}>Vos sauvegardes sont protégées par chiffrement de bout en bout.</p>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <Footer/>
    </div>
  );
}
