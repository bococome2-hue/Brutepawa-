import { useState } from "react";
import { useNavigate } from "../router";

const C = { bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", primaryDark:"var(--bp-primary-dark)", text:"#111827", secondary:"#64748B", muted:"#9CA3AF", border:"#F1F5F9", danger:"#EF4444", shadow:"0 8px 30px rgba(0,0,0,0.05)" };
type PVal = "Tout le monde"|"Amis"|"Amis uniquement"|"Moi uniquement";

function SubHeader({ title, onBack }:{title:string;onBack:()=>void}) {
  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #F1F5F9", height:56, display:"flex", alignItems:"center", padding:"0 6px", position:"sticky", top:0, zIndex:30, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
      <button onClick={onBack} style={{ width:44, height:44, borderRadius:"50%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <h1 style={{ flex:1, fontWeight:700, fontSize:17, color:C.text, margin:0, letterSpacing:"-0.3px", textAlign:"center" }}>{title}</h1>
      <button style={{ width:44, height:44, borderRadius:"50%", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill={C.muted}/><circle cx="12" cy="12" r="1.5" fill={C.muted}/><circle cx="12" cy="19" r="1.5" fill={C.muted}/></svg>
      </button>
    </div>
  );
}

function PrivRow({ label, value, danger=false, onPress, last=false }:{label:string;value:string;danger?:boolean;onPress:()=>void;last?:boolean}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button onClick={onPress} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ display:"flex", alignItems:"center", padding:"14px 18px", background:pressed?"#F8FAFC":"none", border:"none", cursor:"pointer", width:"100%", textAlign:"left", borderBottom:last?"none":"1px solid #F1F5F9", transition:"background 150ms" }}>
      {danger && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight:10, flexShrink:0 }}><circle cx="12" cy="12" r="10" fill="#FEE2E2"/><path d="M12 8v4m0 4h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/></svg>}
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500, fontSize:15, color:danger?"#EF4444":C.text }}>{label}</div>
        <div style={{ fontSize:13, color:C.secondary, marginTop:2 }}>{value}</div>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        <span style={{ fontSize:13, color:danger?"#EF4444":C.primary, fontWeight:600 }}>{value}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round"/></svg>
      </div>
    </button>
  );
}

function Sheet({ label, current, options, onSelect, onClose }:{label:string;current:PVal;options:PVal[];onSelect:(v:PVal)=>void;onClose:()=>void}) {
  return (
    <div className="sc-fixed-escape" style={{ position:"fixed", inset:0, zIndex:100 }} onClick={onClose}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)" }}/>
      <div onClick={e=>e.stopPropagation()} style={{ position:"absolute", bottom:0, left:0, right:0, background:"#fff", borderRadius:"24px 24px 0 0", paddingBottom:"env(safe-area-inset-bottom,0px)", animation:"slideUp 300ms cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ width:40,height:4,borderRadius:2,background:"#E5E7EB",margin:"12px auto 0" }}/>
        <div style={{ padding:"16px 20px 8px", fontWeight:700, fontSize:16, color:C.text }}>{label}</div>
        {options.map((o,i) => (
          <button key={o} onClick={()=>{onSelect(o);onClose();}}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", width:"100%", background:"none", border:"none", cursor:"pointer", borderTop:"1px solid #F1F5F9" }}>
            <span style={{ fontSize:15, color:C.text, fontWeight:current===o?700:400 }}>{o}</span>
            {current===o && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"/></svg>}
          </button>
        ))}
        <div style={{ height:12 }}/>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PVal>("Amis");
  const [msgs, setMsgs] = useState<PVal>("Amis");
  const [find, setFind] = useState<PVal>("Tout le monde");
  const [friends, setFriends] = useState<PVal>("Amis uniquement");
  const [sheet, setSheet] = useState<{label:string;current:PVal;onSelect:(v:PVal)=>void}|null>(null);
  const opts:PVal[] = ["Tout le monde","Amis","Amis uniquement","Moi uniquement"];

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Confidentialité" onBack={()=>navigate("/settings")}/>

      <div style={{ padding:"24px 14px 40px" }}>
        {/* Illustration */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:28 }}>
          <div style={{ position:"relative", width:110, height:110 }}>
            <div style={{ width:110,height:110,borderRadius:"50%",background:"radial-gradient(circle at 40% 35%,#DCFCE7,#BBF7D0)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 12px #F0FDF4,0 8px 30px rgba(34,197,94,0.2)" }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" fill="var(--bp-primary)" opacity=".18"/>
                <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" stroke="var(--bp-primary-dark)" strokeWidth="1.8" fill="none"/>
                <rect x="8" y="11" width="8" height="6" rx="1.5" stroke="var(--bp-primary-dark)" strokeWidth="1.6" fill="none"/>
                <path d="M10 11V9a2 2 0 014 0v2" stroke="var(--bp-primary-dark)" strokeWidth="1.6" strokeLinecap="round"/>
                <circle cx="12" cy="14.5" r="1" fill="var(--bp-primary-dark)"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Privacy rows */}
        <div style={{ background:C.card, borderRadius:24, boxShadow:C.shadow, overflow:"hidden", marginBottom:12 }}>
          <PrivRow label="Qui peut voir mes publications" value={posts} onPress={()=>setSheet({label:"Qui peut voir mes publications",current:posts,onSelect:setPosts})}/>
          <PrivRow label="Qui peut m'envoyer des messages" value={msgs} onPress={()=>setSheet({label:"Qui peut m'envoyer des messages",current:msgs,onSelect:setMsgs})}/>
          <PrivRow label="Qui peut me trouver" value={find} onPress={()=>setSheet({label:"Qui peut me trouver",current:find,onSelect:setFind})}/>
          <PrivRow label="Qui peut voir ma liste d'amis" value={friends} onPress={()=>setSheet({label:"Qui peut voir ma liste d'amis",current:friends,onSelect:setFriends})}/>
          <PrivRow label="Bloqués" value="12 utilisateurs" danger onPress={()=>{}} last/>
        </div>

        {/* Confidentialité avancée card */}
        <button style={{ width:"100%", background:"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))", borderRadius:24, padding:"18px 20px", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:14, boxShadow:"0 8px 30px rgba(34,197,94,0.3)", overflow:"hidden", position:"relative", textAlign:"left" }}>
          <div style={{ position:"absolute",top:-30,right:-30,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.08)",pointerEvents:"none" }}/>
          <div style={{ width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,backdropFilter:"blur(8px)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15, color:"#fff" }}>Confidentialité avancée</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.82)", marginTop:2 }}>Protégez votre compte</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}><path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,0.6)" strokeWidth="2.2" strokeLinecap="round"/></svg>
        </button>
      </div>

      {sheet && <Sheet {...sheet} options={opts} onClose={()=>setSheet(null)}/>}
    </div>
  );
}
