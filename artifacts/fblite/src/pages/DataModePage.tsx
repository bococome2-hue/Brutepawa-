import { useState, useEffect } from "react";
import { useNavigate } from "../router";

const C = { bg:"#F8FAFC", card:"#FFFFFF", primary:"var(--bp-primary)", primaryDark:"var(--bp-primary-dark)", text:"#111827", secondary:"#64748B", muted:"#9CA3AF", shadow:"0 8px 30px rgba(0,0,0,0.05)" };

function SubHeader({ title, onBack }:{title:string;onBack:()=>void}) {
  return (
    <div style={{ background:"#fff", borderBottom:"1px solid #F1F5F9", height:56, display:"flex", alignItems:"center", padding:"0 6px", position:"sticky", top:0, zIndex:30, boxShadow:"0 1px 8px rgba(0,0,0,0.04)" }}>
      <button onClick={onBack} style={{ width:44,height:44,borderRadius:"50%",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </button>
      <h1 style={{ flex:1,fontWeight:700,fontSize:17,color:C.text,margin:0,letterSpacing:"-0.3px",textAlign:"center" }}>{title}</h1>
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

function DonutChart({ pct, on }:{pct:number;on:boolean}) {
  const r=52, cx=64, cy=64, circ=2*Math.PI*r;
  const [animated, setAnimated] = useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setAnimated(pct),200); return()=>clearTimeout(t); },[pct]);
  const dash = (animated/100)*circ;
  const color = on ? C.primary : C.muted;

  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E5E7EB" strokeWidth="12"/>
      {/* Progress */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ*0.25} style={{ transition:"stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1),stroke 500ms" }}/>
      {/* Label */}
      <text x={cx} y={cy-10} textAnchor="middle" fill={C.text} fontSize="13" fontWeight="700" fontFamily="Inter,sans-serif">Économiseur</text>
      <text x={cx} y={cy+6} textAnchor="middle" fill={on?C.primary:C.muted} fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">{on?"Activé":"Désactivé"}</text>
      <text x={cx} y={cy+24} textAnchor="middle" fill={C.text} fontSize="22" fontWeight="800" fontFamily="Inter,sans-serif">{animated}%</text>
    </svg>
  );
}

export default function DataModePage() {
  const navigate = useNavigate();
  const [dataSaver, setDataSaver] = useState(()=>localStorage.getItem("bp_data_saver")!=="false");
  const [mediaWifi, setMediaWifi] = useState(true);
  const [videoQuality, setVideoQuality] = useState<"eco"|"normal"|"hd">("eco");

  const pct = dataSaver ? 78 : 22;

  const save = (v:boolean) => {
    setDataSaver(v);
    localStorage.setItem("bp_data_saver", String(v));
  };

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Mode données" onBack={()=>navigate("/settings")}/>

      <div style={{ padding:"24px 14px 40px" }}>
        {/* Donut chart card */}
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,padding:"24px 20px",marginBottom:12,textAlign:"center" }}>
          <div style={{ display:"flex",justifyContent:"center",marginBottom:12 }}>
            <DonutChart pct={pct} on={dataSaver}/>
          </div>
          <div style={{ fontWeight:700,fontSize:16,color:C.text,marginBottom:4 }}>
            {dataSaver ? "Vous économisez vos données" : "Mode données standard"}
          </div>
          <div style={{ fontSize:13,color:C.secondary }}>
            {dataSaver ? `${pct}% d'économies sur la session` : "Activez l'économiseur pour économiser"}
          </div>
        </div>

        {/* Settings list */}
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden",marginBottom:12 }}>
          {/* Mode données toggle */}
          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:"1px solid #F1F5F9" }}>
            <div style={{ width:46,height:46,borderRadius:"50%",background:dataSaver?"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))":"#F1F5F9",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 300ms",boxShadow:dataSaver?"0 3px 10px rgba(34,197,94,0.3)":"none" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={dataSaver?"#fff":C.muted} strokeWidth="2" strokeLinecap="round">
                <path d="M1.5 8.5a17 17 0 0121 0M5 12a12 12 0 0114 0M8.5 15.5a7 7 0 017 0M12 19h.01"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600,fontSize:15,color:C.text }}>Mode données</div>
              <div style={{ fontSize:13,color:C.secondary,marginTop:2 }}>Économiseur {dataSaver?"activé":"désactivé"}</div>
            </div>
            <Toggle on={dataSaver} onChange={save}/>
          </div>

          {/* Chargement médias */}
          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:"1px solid #F1F5F9" }}>
            <div style={{ width:46,height:46,borderRadius:"50%",background:mediaWifi?"linear-gradient(135deg,#0EA5E9,#06B6D4)":"#F1F5F9",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background 300ms",boxShadow:mediaWifi?"0 3px 10px rgba(6,182,212,0.3)":"none" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={mediaWifi?"#fff":C.muted} strokeWidth="2" strokeLinecap="round">
                <path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0"/>
                <line x1="12" y1="20" x2="12.01" y2="20"/>
              </svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600,fontSize:15,color:C.text }}>Chargement des médias</div>
              <div style={{ fontSize:13,color:C.secondary,marginTop:2 }}>Wi-Fi uniquement</div>
            </div>
            <Toggle on={mediaWifi} onChange={setMediaWifi}/>
          </div>

          {/* Qualité vidéo */}
          <div style={{ padding:"14px 18px" }}>
            <div style={{ fontWeight:600,fontSize:15,color:C.text,marginBottom:12 }}>Qualité vidéo</div>
            <div style={{ display:"flex",gap:8 }}>
              {([["eco","Économique"],["normal","Normale"],["hd","HD"]] as const).map(([v,l])=>(
                <button key={v} onClick={()=>setVideoQuality(v)} style={{ flex:1,padding:"10px 4px",borderRadius:12,border:videoQuality===v?"2px solid "+C.primary:"1.5px solid #E5E7EB",background:videoQuality===v?"#F0FDF4":"#F8FAFC",color:videoQuality===v?C.primary:C.secondary,fontWeight:videoQuality===v?700:500,fontSize:13,cursor:"pointer",transition:"all 200ms" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,padding:"16px 18px" }}>
          <div style={{ fontWeight:700,fontSize:15,color:C.text,marginBottom:14 }}>Statistiques ce mois</div>
          {[
            { label:"Données économisées", value:"340 Mo", color:C.primary },
            { label:"Médias chargés", value:"1,2 Go",  color:"#3B82F6" },
            { label:"Vidéos lues",    value:"890 Mo",  color:"#8B5CF6" },
          ].map((s,i)=>(
            <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<2?"1px solid #F1F5F9":"none" }}>
              <span style={{ fontSize:13,color:C.secondary }}>{s.label}</span>
              <span style={{ fontWeight:700,fontSize:14,color:s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
