import { useState } from "react";
import { useNavigate } from "../router";

const C = { bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", text:"#111827", secondary:"#64748B", muted:"#9CA3AF", border:"#F1F5F9", shadow:"0 8px 30px rgba(0,0,0,0.05)" };

function SubHeader({ title, onBack }:{title:string;onBack:()=>void}) {
  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #F1F5F9", height:56, display:"flex", alignItems:"center", padding:"0 6px", position:"sticky", top:0, zIndex:30, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
      <button onClick={onBack} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <h1 style={{ flex:1, fontWeight:700, fontSize:17, color:C.text, margin:0, letterSpacing:"-0.3px", textAlign:"center" }}>{title}</h1>
      <button style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.5" fill={C.muted}/><circle cx="12" cy="12" r="1.5" fill={C.muted}/><circle cx="12" cy="19" r="1.5" fill={C.muted}/></svg>
      </button>
    </div>
  );
}

const Toggle = ({ on, onChange }:{on:boolean;onChange:(v:boolean)=>void}) => (
  <div onClick={()=>onChange(!on)} style={{ width:52,height:30,borderRadius:15,background:on?C.primary:"#E5E7EB",position:"relative",cursor:"pointer",transition:"background 250ms ease",flexShrink:0,boxShadow:on?"0 2px 10px rgba(34,197,94,0.35)":"inset 0 1px 3px rgba(0,0,0,0.08)" }}>
    <div style={{ position:"absolute",top:3,left:on?"calc(100% - 27px)":3,width:24,height:24,borderRadius:"50%",background:"#fff",boxShadow:"0 2px 6px rgba(0,0,0,0.2)",transition:"left 250ms cubic-bezier(0.34,1.56,0.64,1)" }}/>
  </div>
);

function NRow({ icon, label, sub, on, onChange, last=false }:{icon:React.ReactNode;label:string;sub?:string;on:boolean;onChange:(v:boolean)=>void;last?:boolean}) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:last?"none":"1px solid #F1F5F9" }}>
      <div style={{ width:40,height:40,borderRadius:"50%",background:on?"#F0FDF4":"#F8FAFC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:on?C.primary:C.muted,transition:"background 250ms" }}>
        {icon}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500,fontSize:15,color:C.text }}>{label}</div>
        {sub && <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{sub}</div>}
      </div>
      <Toggle on={on} onChange={onChange}/>
    </div>
  );
}

export default function NotifSettingsPage() {
  const navigate = useNavigate();
  const [all, setAll] = useState(true);
  const [msgs, setMsgs] = useState(true);
  const [comments, setComments] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [friends, setFriends] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [subs, setSubs] = useState(true);
  const [dnd, setDnd] = useState(false);

  const I = {
    bell: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    msg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    comment: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
    at: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/></svg>,
    friends: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    clock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    sub: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="16" y2="11"/><line x1="19" y1="8" x2="19" y2="14"/></svg>,
    moon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  };

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Notifications" onBack={()=>navigate("/settings")}/>

      <div style={{ padding:"24px 14px 40px" }}>
        {/* Premium Bell illustration */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
          <div style={{ position:"relative" }}>
            <div style={{ width:110,height:110,borderRadius:"50%",background:"radial-gradient(circle at 40% 35%,#FEF9C3,#FEF08A)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 0 12px #FEFCE8,0 8px 30px rgba(234,179,8,0.2)" }}>
              <svg width="58" height="58" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" fill="#F59E0B" opacity=".15"/>
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round"/>
                {/* Glow ring */}
                <circle cx="18" cy="5.5" r="4" fill="#EF4444" opacity=".9"/>
                <text x="18" y="8.5" textAnchor="middle" fill="white" fontSize="5.5" fontWeight="bold" fontFamily="Arial">3</text>
              </svg>
            </div>
            {/* Sparkle dots */}
            <div style={{ position:"absolute",top:4,right:-4,width:10,height:10,borderRadius:"50%",background:"#F59E0B",opacity:.6 }}/>
            <div style={{ position:"absolute",bottom:8,left:-6,width:7,height:7,borderRadius:"50%",background:"#FBBF24",opacity:.5 }}/>
          </div>
        </div>

        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontWeight:700, fontSize:20, color:C.text, letterSpacing:"-0.4px", marginBottom:5 }}>Personnalisez vos alertes</div>
          <div style={{ fontSize:14, color:C.secondary }}>Choisissez ce que vous voulez recevoir.</div>
        </div>

        {/* Toggle list */}
        <div style={{ background:C.card, borderRadius:24, boxShadow:C.shadow, overflow:"hidden" }}>
          <NRow icon={I.bell} label="Toutes les notifications" on={all} onChange={setAll}/>
          <NRow icon={I.msg} label="Messages" on={msgs} onChange={setMsgs}/>
          <NRow icon={I.comment} label="Commentaires" on={comments} onChange={setComments}/>
          <NRow icon={I.at} label="Mentions" on={mentions} onChange={setMentions}/>
          <NRow icon={I.friends} label="Amis" on={friends} onChange={setFriends}/>
          <NRow icon={I.clock} label="Rappels" on={reminders} onChange={setReminders}/>
          <NRow icon={I.sub} label="Abonnés" on={subs} onChange={setSubs}/>
          <NRow icon={I.moon} label="Ne pas déranger" sub={dnd?"22:00 – 07:00":undefined} on={dnd} onChange={setDnd} last/>
        </div>
      </div>
    </div>
  );
}
