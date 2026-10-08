import { useState, useEffect } from "react";
import { useNavigate } from "../router";
import { apiFetch, getBpToken } from "../lib/api";

const C = { bg:"#F8FAFC",card:"#FFFFFF",primary:"var(--bp-primary)",text:"#111827",secondary:"#64748B",muted:"#9CA3AF",border:"#E5E7EB",shadow:"0 2px 16px rgba(0,0,0,0.05)",danger:"#EF4444" };

const Toggle = ({ on,onChange }:{on:boolean;onChange:(v:boolean)=>void}) => (
  <div onClick={()=>onChange(!on)} style={{ width:52,height:30,borderRadius:15,background:on?C.primary:"#E5E7EB",position:"relative",cursor:"pointer",transition:"background 250ms ease",flexShrink:0,boxShadow:on?"0 2px 10px rgba(34,197,94,0.35)":"inset 0 1px 3px rgba(0,0,0,0.08)" }}>
    <div style={{ position:"absolute",top:3,left:on?"calc(100% - 27px)":3,width:24,height:24,borderRadius:"50%",background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.2)",transition:"left 250ms cubic-bezier(0.34,1.56,0.64,1)" }}/>
  </div>
);

const SLabel = ({ t }:{t:string}) => (
  <div style={{ fontSize:12,fontWeight:700,color:C.primary,textTransform:"uppercase",letterSpacing:"0.8px",padding:"20px 4px 10px" }}>{t}</div>
);

function NavRow({ icon,title,sub,value,danger=false,last=false,onClick }:{icon:React.ReactNode;title:string;sub?:string;value?:string;danger?:boolean;last?:boolean;onClick?:()=>void}) {
  const [p,setP]=useState(false);
  return (
    <button onClick={onClick} onPointerDown={()=>setP(true)} onPointerUp={()=>setP(false)} onPointerLeave={()=>setP(false)}
      style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:p?"#F8FAFC":"none",border:"none",cursor:"pointer",width:"100%",textAlign:"left",borderBottom:last?"none":"1px solid #F8FAFC",transition:"background 150ms" }}>
      <div style={{ width:44,height:44,borderRadius:"50%",background:danger?"linear-gradient(135deg,#FEE2E2,#FCA5A5)":"linear-gradient(135deg,#F0FDF4,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500,fontSize:15,color:danger?C.danger:C.text }}>{title}</div>
        {sub && <div style={{ fontSize:12,color:C.muted,marginTop:1 }}>{sub}</div>}
      </div>
      {value && <span style={{ fontSize:13,color:C.secondary,fontWeight:500,marginRight:4 }}>{value}</span>}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>
    </button>
  );
}

function ToggleRow({ icon,title,sub,on,onChange,last=false }:{icon:React.ReactNode;title:string;sub?:string;on:boolean;onChange:(v:boolean)=>void;last?:boolean}) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:last?"none":"1px solid #F8FAFC" }}>
      <div style={{ width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500,fontSize:15,color:C.text }}>{title}</div>
        {sub && <div style={{ fontSize:12,color:C.muted,marginTop:1 }}>{sub}</div>}
      </div>
      <Toggle on={on} onChange={onChange}/>
    </div>
  );
}

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

export default function MessagingPrivacyPage() {
  const navigate = useNavigate();
  const [readReceipts, setReadReceipts] = useState(true);
  const [whoMsg, setWhoMsg] = useState("Amis");
  const [whoFind, setWhoFind] = useState("Tout le monde");
  const [whoFriends, setWhoFriends] = useState("Amis uniquement");
  const [whoPub, setWhoPub] = useState("Amis");
  const [blockedCount, setBlockedCount] = useState(12);
  const [onlineStatus, setOnlineStatus] = useState("Activé");
  const isLoggedIn = !!getBpToken();

  useEffect(() => {
    if (!isLoggedIn) return;
    apiFetch("/messaging/privacy")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setReadReceipts(d.readReceipts ?? true);
        setBlockedCount(d.blockedCount ?? 0);
        setOnlineStatus(d.onlineStatusVisibility === "everyone" ? "Activé" : "Restreint");
        const toLabel = (v: string) =>
          v === "everyone" ? "Tout le monde" : v === "friends_only" ? "Amis uniquement" : "Amis";
        setWhoMsg(toLabel(d.messagePermission));
        setWhoFind(toLabel(d.searchVisibility));
        setWhoFriends(toLabel(d.friendListVisibility));
        setWhoPub(toLabel(d.profileVisibility));
      });
  }, []);

  const saveReadReceipts = async (v: boolean) => {
    setReadReceipts(v);
    if (!isLoggedIn) return;
    await apiFetch("/messaging/privacy", { method:"PATCH", body: JSON.stringify({ readReceipts: v }) });
  };

  const icons = {
    pub:   <svg width="18" height="18" viewBox="0 0 24 24" stroke={C.primary} {...sv}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    msg:   <svg width="18" height="18" viewBox="0 0 24 24" stroke={C.primary} {...sv}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    find:  <svg width="18" height="18" viewBox="0 0 24 24" stroke={C.primary} {...sv}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
    list:  <svg width="18" height="18" viewBox="0 0 24 24" stroke={C.primary} {...sv}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    block: <svg width="18" height="18" viewBox="0 0 24 24" stroke={C.danger} {...sv}><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>,
    check: <svg width="18" height="18" viewBox="0 0 24 24" stroke={C.primary} {...sv}><path d="M20 6L9 17l-5-5"/></svg>,
    online:<svg width="18" height="18" viewBox="0 0 24 24" stroke={C.primary} {...sv}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14M15.54 8.46a5 5 0 010 7.07M8.46 8.46a5 5 0 000 7.07"/></svg>,
    alert: <svg width="18" height="18" viewBox="0 0 24 24" stroke="#F59E0B" {...sv}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    v2fa:  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#8B5CF6" {...sv}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>,
    sess:  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#3B82F6" {...sv}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    enc:   <svg width="18" height="18" viewBox="0 0 24 24" stroke="var(--bp-primary-dark)" {...sv}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
  };

  return (
    <div style={{ background:C.bg,minHeight:"100dvh",fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <div style={{ background:"#fff",borderBottom:"1px solid "+C.border,height:56,display:"flex",alignItems:"center",padding:"0 6px",position:"sticky",top:0,zIndex:30 }}>
        <button onClick={()=>navigate("/settings/messaging")} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,textAlign:"center",letterSpacing:"-0.3px" }}>Confidentialité et sécurité</h1>
        <div style={{ width:44 }}/>
      </div>

      <div style={{ padding:"0 14px 32px" }}>
        <SLabel t="Qui peut vous contacter"/>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          <NavRow icon={icons.pub}   title="Qui peut voir mes publications"   value={whoPub}/>
          <NavRow icon={icons.msg}   title="Qui peut m'envoyer des messages"  value={whoMsg}/>
          <NavRow icon={icons.find}  title="Qui peut me trouver"              value={whoFind}/>
          <NavRow icon={icons.list}  title="Qui peut voir ma liste d'amis"    value={whoFriends}/>
          <NavRow icon={icons.block} title="Comptes bloqués" value={`${blockedCount} utilisateur${blockedCount>1?"s":""}`} danger last/>
        </div>

        <SLabel t="Sécurité"/>
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden" }}>
          <ToggleRow icon={icons.check}  title="Confirmations de lecture" on={readReceipts} onChange={saveReadReceipts}/>
          <NavRow icon={icons.online} title="Statut en ligne"          value={onlineStatus} onClick={()=>navigate("/settings/messaging/online")}/>
          <NavRow icon={icons.alert}  title="Alertes de sécurité"/>
          <NavRow icon={icons.v2fa}   title="Vérification en 2 étapes"/>
          <NavRow icon={icons.sess}   title="Sessions connectées"      value="3 sessions actives"/>
          <NavRow icon={icons.enc}    title="Chiffrement des discussions" sub="Les discussions sont chiffrées de bout en bout" last/>
        </div>
      </div>
      <Footer/>
    </div>
  );
}
