import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiFetch, getBpToken } from "../lib/api";

const C = { bg:"#F8FAFC",card:"#FFFFFF",primary:"var(--bp-primary)",text:"#111827",secondary:"#64748B",muted:"#9CA3AF",border:"#E5E7EB",shadow:"0 2px 16px rgba(0,0,0,0.05)" };

const Toggle = ({ on,onChange }:{on:boolean;onChange:(v:boolean)=>void}) => (
  <div onClick={()=>onChange(!on)} style={{ width:52,height:30,borderRadius:15,background:on?C.primary:"#E5E7EB",position:"relative",cursor:"pointer",transition:"background 250ms",flexShrink:0,boxShadow:on?"0 2px 10px rgba(34,197,94,0.35)":"inset 0 1px 3px rgba(0,0,0,0.08)" }}>
    <div style={{ position:"absolute",top:3,left:on?"calc(100% - 27px)":3,width:24,height:24,borderRadius:"50%",background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.2)",transition:"left 250ms cubic-bezier(0.34,1.56,0.64,1)" }}/>
  </div>
);

const SLabel = ({ t }:{t:string}) => (
  <div style={{ fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.8px",padding:"20px 4px 10px" }}>{t}</div>
);

const TRow = ({ icon,label,sub,on,onChange,last=false }:{icon:React.ReactNode;label:string;sub?:string;on:boolean;onChange:(v:boolean)=>void;last?:boolean}) => (
  <div style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 18px",borderBottom:last?"none":"1px solid #F8FAFC" }}>
    <div style={{ width:40,height:40,borderRadius:"50%",background:on?"#F0FDF4":"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:on?C.primary:C.muted,transition:"background 250ms" }}>{icon}</div>
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:500,fontSize:14,color:C.text }}>{label}</div>
      {sub && <div style={{ fontSize:12,color:C.muted,marginTop:1 }}>{sub}</div>}
    </div>
    <Toggle on={on} onChange={onChange}/>
  </div>
);

const NRow = ({ icon,label,sub,value,last=false }:{icon:React.ReactNode;label:string;sub?:string;value?:string;last?:boolean}) => (
  <button style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 18px",background:"none",border:"none",cursor:"pointer",width:"100%",textAlign:"left",borderBottom:last?"none":"1px solid #F8FAFC" }}>
    <div style={{ width:40,height:40,borderRadius:"50%",background:"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{icon}</div>
    <div style={{ flex:1 }}>
      <div style={{ fontWeight:500,fontSize:14,color:C.text }}>{label}</div>
      {sub && <div style={{ fontSize:12,color:C.muted,marginTop:1 }}>{sub}</div>}
    </div>
    {value && <span style={{ fontSize:13,color:C.secondary,marginRight:4 }}>{value}</span>}
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>
  </button>
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

const sv = { fill:"none",strokeWidth:1.8,strokeLinecap:"round" as const };
const ic = (c:string) => ({ stroke:c,...sv });

type NS = {
  messages:boolean;groups:boolean;invitations:boolean;calls:boolean;
  archive:boolean;pinned:boolean;download:boolean;quality:boolean;
  backup:boolean;mentions:boolean;reactions:boolean;pins:boolean;master:boolean;
};

const DEFAULT_NS: NS = {
  messages:true,groups:true,invitations:true,calls:true,
  archive:true,pinned:true,download:true,quality:true,
  backup:true,mentions:true,reactions:true,pins:true,master:true,
};

export default function MessagingNotifPage() {
  const navigate = useNavigate();
  const [ns, setNs] = useState<NS>(DEFAULT_NS);
  const [dirty, setDirty] = useState(false);
  const isLoggedIn = !!getBpToken();

  useEffect(() => {
    if (!isLoggedIn) return;
    apiFetch("/messaging/notifications")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setNs({
          messages:    d.messages    ?? true,
          groups:      d.groups      ?? true,
          invitations: d.invitations ?? true,
          calls:       d.calls       ?? true,
          archive:     d.archiveNotifs ?? true,
          pinned:      d.pinnedNotifs  ?? true,
          download:    d.downloadNotifs ?? true,
          quality:     d.qualityNotifs  ?? false,
          backup:      d.backupNotifs   ?? false,
          mentions:    d.mentions     ?? true,
          reactions:   d.reactions    ?? true,
          pins:        d.pins         ?? true,
          master:      d.messages && d.groups,
        });
      });
  }, []);

  useEffect(() => {
    if (!dirty || !isLoggedIn) return;
    const t = setTimeout(() => {
      apiFetch("/messaging/notifications", {
        method:"PATCH",
        body: JSON.stringify({
          messages:ns.messages, groups:ns.groups, invitations:ns.invitations,
          calls:ns.calls, archiveNotifs:ns.archive, pinnedNotifs:ns.pinned,
          downloadNotifs:ns.download, qualityNotifs:ns.quality, backupNotifs:ns.backup,
          mentions:ns.mentions, reactions:ns.reactions, pins:ns.pins,
        }),
      });
    }, 800);
    return () => clearTimeout(t);
  }, [ns, dirty]);

  const set = (k: keyof NS, v: boolean) => { setNs(p=>({...p,[k]:v})); setDirty(true); };

  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Notifications de messages</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ padding:"0 14px 32px" }}>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,marginTop:16,overflow:"hidden" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"16px 18px" }}>
            <div style={{ width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#D97706,#F59E0B)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(245,158,11,0.3)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <div style={{ flex:1 }}><div style={{ fontWeight:600,fontSize:15,color:C.text }}>Activer les notifications</div></div>
            <Toggle on={ns.master} onChange={v=>set("master",v)}/>
          </div>
        </div>

        <SLabel t="Types de notifications"/>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>} label="Messages" sub="Notifications pour les nouveaux messages" on={ns.messages} onChange={v=>set("messages",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>} label="Groupes" sub="Notifications pour les messages de groupes" on={ns.groups} onChange={v=>set("groups",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>} label="Invitations" on={ns.invitations} onChange={v=>set("invitations",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14z"/></svg>} label="Appels" on={ns.calls} onChange={v=>set("calls",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><polyline points="21,8 21,21 3,21 3,8"/><rect x="1" y="3" width="22" height="5"/></svg>} label="Archive" on={ns.archive} onChange={v=>set("archive",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"/><polygon points="12,15 7,10 17,10"/></svg>} label="Discussions épinglées" on={ns.pinned} onChange={v=>set("pinned",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>} label="Téléchargement automatique" on={ns.download} onChange={v=>set("download",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>} label="Qualité des médias" on={ns.quality} onChange={v=>set("quality",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} label="Sauvegarde des discussions" on={ns.backup} onChange={v=>set("backup",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/></svg>} label="Mentions" on={ns.mentions} onChange={v=>set("mentions",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>} label="Réactions" on={ns.reactions} onChange={v=>set("reactions",v)}/>
          <TRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.primary)}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1"/><polygon points="12,15 7,10 17,10"/></svg>} label="Épinglages" on={ns.pins} onChange={v=>set("pins",v)} last/>
        </div>

        <SLabel t="Paramètres"/>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          <NRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.secondary)}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>} label="Son de notification" value="Par défaut"/>
          <NRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.secondary)}><path d="M5 3l14 9-14 9V3z"/></svg>} label="Vibreur" value="Par défaut"/>
          <NRow icon={<svg width="18" height="18" viewBox="0 0 24 24" {...ic(C.secondary)}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>} label="Aperçu des messages" sub="Afficher le contenu" last/>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
