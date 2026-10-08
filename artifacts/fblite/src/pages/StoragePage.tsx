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

const CATS = [
  { label:"Publications", mo:420, color:"var(--bp-primary)" },
  { label:"Médias",       mo:420, color:"#3B82F6" },
  { label:"Messages",     mo:420, color:"#F59E0B" },
  { label:"Cache",        mo:120, color:"#8B5CF6" },
  { label:"Autre",        mo:80,  color:"#E5E7EB" },
];
const TOTAL_MO = CATS.reduce((s,c)=>s+c.mo, 0);
const TOTAL_GO  = 10;

function DonutChart({ animated }:{animated:boolean}) {
  const r=58, cx=72, cy=72, circ=2*Math.PI*r;
  let offset = -circ*0.25; // start top
  const [show, setShow] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setShow(true),300); return()=>clearTimeout(t); },[]);

  return (
    <svg width="144" height="144" viewBox="0 0 144 144">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth="16"/>
      {CATS.map((cat,i)=>{
        const pct = cat.mo / TOTAL_MO;
        const dash = show ? pct*circ : 0;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={cat.color} strokeWidth="16"
            strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={offset}
            style={{ transition:`stroke-dasharray 1.1s ${i*0.12}s cubic-bezier(0.4,0,0.2,1)` }}/>
        );
        offset -= pct*circ;
        return seg;
      })}
      {/* Center text */}
      <text x={cx} y={cy-8} textAnchor="middle" fill={C.text} fontSize="18" fontWeight="800" fontFamily="Inter,sans-serif">1,24 Go</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill={C.muted} fontSize="11" fontFamily="Inter,sans-serif">utilisés</text>
      <text x={cx} y={cy+26} textAnchor="middle" fill={C.muted} fontSize="11" fontFamily="Inter,sans-serif">/ {TOTAL_GO} Go</text>
    </svg>
  );
}

export default function StoragePage() {
  const navigate = useNavigate();
  const usedPct = Math.round(TOTAL_MO/(TOTAL_GO*1024)*100);

  return (
    <div style={{ background:C.bg, minHeight:"100dvh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif" }}>
      <SubHeader title="Stockage" onBack={()=>navigate("/settings")}/>

      <div style={{ padding:"20px 14px 110px" }}>
        {/* Donut + legend */}
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,padding:"20px",marginBottom:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:20 }}>
            <DonutChart animated/>
            <div style={{ flex:1 }}>
              {CATS.map((cat,i)=>(
                <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:i<CATS.length-1?10:0 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ width:10,height:10,borderRadius:"50%",background:cat.color,flexShrink:0 }}/>
                    <span style={{ fontSize:13,color:C.secondary }}>{cat.label}</span>
                  </div>
                  <span style={{ fontSize:13,fontWeight:700,color:C.text }}>{cat.mo} Mo</span>
                </div>
              ))}
            </div>
          </div>

          {/* Global bar */}
          <div style={{ marginTop:20 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
              <span style={{ fontSize:13,color:C.secondary }}>Espace utilisé</span>
              <span style={{ fontSize:13,fontWeight:700,color:C.text }}>{usedPct}%</span>
            </div>
            <div style={{ height:10,background:"#F1F5F9",borderRadius:999,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${usedPct}%`,background:`linear-gradient(90deg,var(--bp-primary),var(--bp-primary-dark))`,borderRadius:999,boxShadow:"0 0 8px rgba(34,197,94,0.4)",transition:"width 1.2s ease" }}/>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:6 }}>
              <span style={{ fontSize:11,color:C.muted }}>1,24 Go utilisés</span>
              <span style={{ fontSize:11,color:C.muted }}>8,76 Go libres</span>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div style={{ background:C.card,borderRadius:24,boxShadow:C.shadow,overflow:"hidden",marginBottom:12 }}>
          <div style={{ padding:"14px 18px 10px",fontWeight:700,fontSize:15,color:C.text,borderBottom:"1px solid #F1F5F9" }}>Répartition par catégorie</div>
          {CATS.map((cat,i)=>{
            const pct2 = Math.round(cat.mo/TOTAL_MO*100);
            return (
              <div key={i} style={{ padding:"13px 18px",borderBottom:i<CATS.length-1?"1px solid #F1F5F9":"none" }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ width:10,height:10,borderRadius:"50%",background:cat.color }}/>
                    <span style={{ fontSize:14,fontWeight:500,color:C.text }}>{cat.label}</span>
                  </div>
                  <span style={{ fontSize:14,fontWeight:700,color:C.text }}>{cat.mo} Mo</span>
                </div>
                <div style={{ height:5,background:"#F1F5F9",borderRadius:999,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${pct2}%`,background:cat.color,borderRadius:999,transition:"width 1.1s ease" }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Premium promo */}
        <div style={{ background:"linear-gradient(135deg,#052e16,#064E3B)",borderRadius:24,padding:"16px 18px",boxShadow:"0 8px 30px rgba(6,78,59,0.35)",marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:"50%",background:"rgba(244,197,66,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24"><path d="M2 19h20v2H2v-2zM4 16l-2-9 5.5 4L12 3l4.5 8L22 7l-2 9H4z" fill="#F4C542"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14,color:"#fff" }}>Passez à Premium</div>
              <div style={{ fontSize:12,color:"rgba(255,255,255,0.68)",marginTop:2 }}>20 Go de stockage inclus</div>
            </div>
            <button onClick={()=>navigate("/settings/premium")} style={{ background:"linear-gradient(135deg,#FBBF24,#F4C542)",color:"#1C1917",fontWeight:800,fontSize:12,padding:"8px 14px",borderRadius:14,border:"none",cursor:"pointer",whiteSpace:"nowrap" }}>
              Voir
            </button>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="sc-fixed-escape" style={{ position:"fixed",bottom:0,left:0,right:0,padding:"12px 14px",paddingBottom:"calc(12px + env(safe-area-inset-bottom,0px))",background:"rgba(248,250,252,0.97)",backdropFilter:"blur(16px)",borderTop:"1px solid #F1F5F9" }}>
        <button style={{ width:"100%",padding:"16px",borderRadius:18,background:"linear-gradient(135deg,var(--bp-primary-dark),var(--bp-primary))",border:"none",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:"0 8px 24px rgba(34,197,94,0.3)",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          Gérer le stockage
        </button>
      </div>
    </div>
  );
}
