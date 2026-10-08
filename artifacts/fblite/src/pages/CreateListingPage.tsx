import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "../router";
import { COUNTRIES } from "../data/mock";
import { apiCreateProduct } from "../lib/api";
import { getCurrentUser } from "../hooks/useCurrentUser";
import { useR2Upload, phaseLabel } from "../hooks/useR2Upload";
import { trackEvent } from "../lib/analytics";
import imgAI      from "@assets/file_00000000dc9871f486329b83a7a1d9d1_1782125734073.png";
import imgShield  from "@assets/file_00000000a50c71f49a3cfccdfd4ceab1_1782125734281.png";
import imgGlobe   from "@assets/file_00000000b41c71f494fdafca86977d00_1782125734393.png";
import imgCard    from "@assets/file_000000004adc71f4984d0ffa850d6fbf_1782125734448.png";
import imgTrust   from "@assets/file_00000000f6bc71f48736fd5fc12d67f2_1782125734519.png";

/* ═══════════════════════════════════════════════════════════════════════════
   TOKENS
═══════════════════════════════════════════════════════════════════════════ */
const G  = "var(--bp-primary)";
const GD = "var(--bp-primary-dark)";
const BG = "#F8FAFC";

const CATEGORIES = [
  "Électronique","Mode","Maison","Beauté","Automobile","Immobilier",
  "Artisanat","Services","Alimentation","Agriculture","Santé","Éducation",
];
const CONDITIONS = ["Neuf","Très bon état","Bon état","Occasion"];

const VISIBILITY_PLANS = [
  {
    id:"standard", label:"Publication standard", price:0, priceLabel:"Gratuit",
    desc:"Votre annonce sera visible dans votre ville",
    reach:"Locale", audience:"500 – 1 500", conversion:"1.2%",
    badge:null, color:"#6B7280",
  },
  {
    id:"local", label:"Mise en avant locale", price:1200, priceLabel:"1 200 FCFA",
    desc:"Visible dans tout Bamako pendant 7 jours",
    reach:"Régionale", audience:"2 450 – 3 800", conversion:"3.8%",
    badge:"Populaire", color:G,
  },
  {
    id:"national", label:"Mise en avant nationale", price:2500, priceLabel:"2 500 FCFA",
    desc:"Visible dans tout le Mali pendant 7 jours",
    reach:"Nationale", audience:"5 000 – 8 000", conversion:"5.2%",
    badge:"Recommandé", color:"#3B82F6",
  },
  {
    id:"continental", label:"Mise en avant continentale", price:5000, priceLabel:"5 000 FCFA",
    desc:"Visible dans plusieurs pays d'Afrique",
    reach:"Continentale", audience:"15 000 – 25 000", conversion:"7.1%",
    badge:"Meilleur retour", color:"#F59E0B",
  },
];

const DURATIONS = [
  { days:7, discount:0 }, { days:14, discount:10 },
  { days:30, discount:20 }, { days:60, discount:30 },
];

function perf(vis: string, days: number) {
  const base: Record<string,[number,number,number,number,number,number]> = {
    standard:    [450,800,25,45,2,5],
    local:       [2450,3800,120,210,10,18],
    national:    [5000,8000,250,450,20,35],
    continental: [15000,25000,800,1500,65,120],
  };
  const b = base[vis] ?? base.standard;
  const m = days/7;
  return {
    viewsMin:Math.round(b[0]*m), viewsMax:Math.round(b[1]*m),
    clicksMin:Math.round(b[2]*m), clicksMax:Math.round(b[3]*m),
    ctMin:Math.round(b[4]*m), ctMax:Math.round(b[5]*m),
  };
}

interface Photo { localUrl:string; r2Url:string; name:string; }

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════════════════════════ */
const IcBack   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M5 12l7-7M5 12l7 7"/></svg>;
const IcCloud  = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>;
const IcPlus   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcX      = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcCheckW = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcCheckG = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcStar   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="#F4C542" stroke="#F4C542" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcLoc    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcShield = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcAI     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>;
const IcPen    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcEye    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcClick  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>;
const IcMsg    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>;
const IcRocket = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="m12 15-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
const IcBulb   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>;
const IcPhone  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.07 1.18 2 2 0 012.03 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.72 6.72l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>;
const IcShare  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const IcHeart  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
const IcFlag   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const IcChevL  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IcChevR  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IcTrend  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IcUsers  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IcTimer  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

/* ═══════════════════════════════════════════════════════════════════════════
   STEP PROGRESS BAR
═══════════════════════════════════════════════════════════════════════════ */
const STEP_LABELS = ["Médias","Informations","Visibilité","Aperçu"];
function StepBar({ step }: { step: number }) {
  return (
    <div style={{ padding:"12px 16px 10px", background:"#fff", borderBottom:"1px solid #F1F5F9" }}>
      <div style={{ display:"flex", alignItems:"center", maxWidth:340, margin:"0 auto" }}>
        {[1,2,3,4].map((n,i) => {
          const done = n < step, active = n === step;
          return (
            <div key={n} style={{ display:"flex", alignItems:"center", flex: i < 3 ? 1 : "none" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{
                  width:28, height:28, borderRadius:"50%",
                  background: done||active ? G : "#E5E7EB",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.3s ease",
                  boxShadow: active ? `0 0 0 4px ${G}25` : "none",
                }}>
                  {done
                    ? <IcCheckW/>
                    : <span style={{ fontSize:12, fontWeight:700, color: active?"#fff":"#9CA3AF", lineHeight:1 }}>{n}</span>
                  }
                </div>
                <span style={{ fontSize:10, fontWeight: active?700:500, color: active?G:"#9CA3AF", whiteSpace:"nowrap" }}>{STEP_LABELS[i]}</span>
              </div>
              {i < 3 && <div style={{ flex:1, height:2, background: done?G:"#E5E7EB", margin:"0 4px", marginBottom:18, transition:"background 0.4s ease" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 1 — 3D ILLUSTRATIONS
═══════════════════════════════════════════════════════════════════════════ */
const IllustAI = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
    <defs>
      <linearGradient id="chipTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#34D399"/><stop offset="100%" stopColor="var(--bp-primary-dark)"/></linearGradient>
      <linearGradient id="chipFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--bp-primary)"/><stop offset="100%" stopColor="#15803D"/></linearGradient>
      <linearGradient id="platBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(34,197,94,0.25)"/><stop offset="100%" stopColor="rgba(34,197,94,0.05)"/></linearGradient>
      <filter id="glowAI"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
    </defs>
    <ellipse cx="36" cy="62" rx="22" ry="5" fill="rgba(34,197,94,0.18)"/>
    <ellipse cx="36" cy="59" rx="18" ry="3.5" fill="rgba(34,197,94,0.10)"/>
    <rect x="14" y="20" width="44" height="36" rx="7" fill="url(#chipFace)" filter="url(#glowAI)"/>
    <rect x="17" y="23" width="38" height="30" rx="5" fill="var(--bp-primary)" opacity="0.4"/>
    <rect x="20" y="26" width="32" height="24" rx="3" fill="#166534" opacity="0.6"/>
    <line x1="24" y1="26" x2="24" y2="50" stroke="var(--bp-primary)" strokeWidth="0.6" opacity="0.5"/>
    <line x1="30" y1="26" x2="30" y2="50" stroke="var(--bp-primary)" strokeWidth="0.6" opacity="0.5"/>
    <line x1="36" y1="26" x2="36" y2="50" stroke="var(--bp-primary)" strokeWidth="0.6" opacity="0.5"/>
    <line x1="42" y1="26" x2="42" y2="50" stroke="var(--bp-primary)" strokeWidth="0.6" opacity="0.5"/>
    <line x1="48" y1="26" x2="48" y2="50" stroke="var(--bp-primary)" strokeWidth="0.6" opacity="0.5"/>
    <line x1="20" y1="32" x2="52" y2="32" stroke="var(--bp-primary)" strokeWidth="0.6" opacity="0.5"/>
    <line x1="20" y1="38" x2="52" y2="38" stroke="var(--bp-primary)" strokeWidth="0.6" opacity="0.5"/>
    <line x1="20" y1="44" x2="52" y2="44" stroke="var(--bp-primary)" strokeWidth="0.6" opacity="0.5"/>
    <rect x="22" y="28" width="28" height="20" rx="2" fill="#14532D" opacity="0.8"/>
    <text x="36" y="41" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="Inter,sans-serif" letterSpacing="1">AI</text>
    <rect x="8" y="30" width="6" height="3" rx="1.5" fill="#4ADE80"/><rect x="8" y="36" width="6" height="3" rx="1.5" fill="#4ADE80"/><rect x="8" y="42" width="6" height="3" rx="1.5" fill="#4ADE80"/>
    <rect x="58" y="30" width="6" height="3" rx="1.5" fill="#4ADE80"/><rect x="58" y="36" width="6" height="3" rx="1.5" fill="#4ADE80"/><rect x="58" y="42" width="6" height="3" rx="1.5" fill="#4ADE80"/>
    <rect x="26" y="14" width="3" height="6" rx="1.5" fill="#4ADE80"/><rect x="33" y="14" width="3" height="6" rx="1.5" fill="#4ADE80"/><rect x="40" y="14" width="3" height="6" rx="1.5" fill="#4ADE80"/>
    <rect x="2" y="28" width="7" height="5" rx="2.5" fill="rgba(34,197,94,0.3)" stroke="var(--bp-primary)" strokeWidth="0.5"/>
    <rect x="2" y="35" width="7" height="5" rx="2.5" fill="rgba(34,197,94,0.3)" stroke="var(--bp-primary)" strokeWidth="0.5"/>
    <rect x="2" y="42" width="7" height="5" rx="2.5" fill="rgba(34,197,94,0.3)" stroke="var(--bp-primary)" strokeWidth="0.5"/>
    <ellipse cx="36" cy="20" rx="14" ry="3" fill="url(#chipTop)" opacity="0.7"/>
  </svg>
);

const IllustShield = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
    <defs>
      <linearGradient id="shBase" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#374151"/><stop offset="100%" stopColor="#1F2937"/></linearGradient>
      <linearGradient id="shFace" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor="#4B5563"/><stop offset="100%" stopColor="#111827"/></linearGradient>
      <linearGradient id="shGreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--bp-primary)"/><stop offset="100%" stopColor="var(--bp-primary-dark)"/></linearGradient>
    </defs>
    <ellipse cx="36" cy="63" rx="20" ry="4" fill="rgba(0,0,0,0.18)"/>
    <rect x="12" y="55" width="48" height="7" rx="3" fill="#111827" opacity="0.5"/>
    <path d="M36 10 L58 20 L58 42 C58 52 48 60 36 64 C24 60 14 52 14 42 L14 20 Z" fill="url(#shBase)"/>
    <path d="M36 14 L55 23 L55 41 C55 50 46 57 36 61 C26 57 17 50 17 41 L17 23 Z" fill="url(#shFace)"/>
    <path d="M36 16 L53 24.5 L53 40.5 C53 49 45 55.5 36 59 C27 55.5 19 49 19 40.5 L19 24.5 Z" fill="#1F2937" opacity="0.7"/>
    <circle cx="36" cy="39" r="12" fill="url(#shGreen)" opacity="0.9"/>
    <rect x="31" y="35" width="10" height="9" rx="2" fill="white" opacity="0.9"/>
    <path d="M33 35 L33 33 C33 31 39 31 39 33 L39 35" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <circle cx="36" cy="40" r="2" fill="var(--bp-primary-dark)"/>
    <path d="M36 42 L36 44" stroke="var(--bp-primary-dark)" strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="36" cy="58" rx="5" ry="1.5" fill="rgba(34,197,94,0.2)"/>
    <path d="M22 22 L28 24" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IllustGlobe = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
    <defs>
      <radialGradient id="ocean" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#3B82F6"/><stop offset="100%" stopColor="#1D4ED8"/></radialGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(34,197,94,0.3)"/><stop offset="100%" stopColor="rgba(34,197,94,0)"/></radialGradient>
    </defs>
    <circle cx="36" cy="36" r="22" fill="url(#ocean)"/>
    <circle cx="36" cy="36" r="22" fill="url(#glow)"/>
    <ellipse cx="36" cy="63" rx="16" ry="4" fill="rgba(59,130,246,0.2)"/>
    <ellipse cx="36" cy="14" rx="22" ry="4" fill="rgba(59,130,246,0.2)"/>
    <path d="M28 22 C26 24 24 28 24 32 C24 36 25 38 28 40 C30 41 32 40 34 38 C35 36 36 32 35 28 C34 24 30 20 28 22Z" fill="var(--bp-primary)" opacity="0.95"/>
    <path d="M34 28 C35 30 36 33 35 36 C34 39 32 41 30 42 C32 44 35 44 38 43 C40 42 41 40 41 37 C41 33 39 29 37 27 C36 26 34 26 34 28Z" fill="var(--bp-primary-dark)"/>
    <path d="M36 40 C37 42 38 44 37 46 C36 47 35 46 35 44 C34 43 35 41 36 40Z" fill="var(--bp-primary)" opacity="0.8"/>
    <path d="M21 26 C22 25 24 25 25 26 C25 28 24 29 23 29 C22 28 21 27 21 26Z" fill="#34D399" opacity="0.6"/>
    <path d="M44 20 C46 21 47 23 46 25 C45 26 43 26 42 24 C42 22 43 20 44 20Z" fill="#4ADE80" opacity="0.6"/>
    <ellipse cx="36" cy="36" rx="22" ry="6" stroke="rgba(147,197,253,0.3)" strokeWidth="0.8" fill="none"/>
    <ellipse cx="36" cy="36" rx="6" ry="22" stroke="rgba(147,197,253,0.3)" strokeWidth="0.8" fill="none"/>
    <line x1="14" y1="36" x2="58" y2="36" stroke="rgba(147,197,253,0.3)" strokeWidth="0.8"/>
    <path d="M14 28 Q36 24 58 28" stroke="rgba(147,197,253,0.25)" strokeWidth="0.7" fill="none"/>
    <path d="M14 44 Q36 48 58 44" stroke="rgba(147,197,253,0.25)" strokeWidth="0.7" fill="none"/>
    <circle cx="36" cy="36" r="22" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
    <ellipse cx="29" cy="28" rx="5" ry="3" fill="rgba(255,255,255,0.08)" transform="rotate(-20 29 28)"/>
  </svg>
);

const IllustCard = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
    <defs>
      <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1F2937"/><stop offset="100%" stopColor="#0F172A"/></linearGradient>
      <linearGradient id="cardShine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(255,255,255,0.12)"/><stop offset="50%" stopColor="rgba(255,255,255,0.04)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></linearGradient>
      <linearGradient id="lockBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9CA3AF"/><stop offset="100%" stopColor="#4B5563"/></linearGradient>
      <linearGradient id="chipCard" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F4C542"/><stop offset="100%" stopColor="#D97706"/></linearGradient>
    </defs>
    <ellipse cx="36" cy="63" rx="20" ry="4" fill="rgba(0,0,0,0.2)"/>
    <rect x="8" y="22" width="50" height="32" rx="5" fill="url(#cardBg)"/>
    <rect x="8" y="22" width="50" height="32" rx="5" fill="url(#cardShine)"/>
    <rect x="8" y="30" width="50" height="8" fill="rgba(255,255,255,0.06)"/>
    <rect x="13" y="34" width="18" height="13" rx="2" fill="url(#chipCard)"/>
    <line x1="13" y1="38" x2="31" y2="38" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
    <line x1="13" y1="42" x2="31" y2="42" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8"/>
    <line x1="18" y1="34" x2="18" y2="47" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"/>
    <line x1="24" y1="34" x2="24" y2="47" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8"/>
    {[0,1,2,3,4,5,6,7].map(i=><circle key={i} cx={35+(i%4)*5} cy={50-(Math.floor(i/4)*4)} r="1.5" fill="rgba(255,255,255,0.2)"/>)}
    <text x="49" y="51" textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="6" fontFamily="monospace" fontWeight="600">VISA</text>
    <circle cx="51" cy="46" r="12" fill="#1F2937"/>
    <rect x="43" y="44" width="16" height="12" rx="2.5" fill="url(#lockBody)"/>
    <rect x="44" y="44" width="14" height="7" rx="2" fill="#6B7280"/>
    <path d="M47 44 L47 41.5 C47 39.5 55 39.5 55 41.5 L55 44" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <circle cx="51" cy="49.5" r="2" fill="#374151"/>
    <path d="M51 51.5 L51 53" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="52" cy="45" r="8" fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.2)" strokeWidth="0.5"/>
  </svg>
);

const ShieldUserSVG = () => (
  <svg width="56" height="64" viewBox="0 0 56 64" fill="none">
    <defs>
      <linearGradient id="sug1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--bp-primary)"/><stop offset="100%" stopColor="var(--bp-primary-dark)"/></linearGradient>
    </defs>
    <path d="M28 4 L52 14 L52 36 C52 50 42 59 28 62 C14 59 4 50 4 36 L4 14 Z" fill="url(#sug1)"/>
    <path d="M28 8 L48 17 L48 35 C48 48 39 56 28 59 C17 56 8 48 8 35 L8 17 Z" fill="var(--bp-primary-dark)" opacity="0.5"/>
    <circle cx="28" cy="28" r="9" fill="white" opacity="0.95"/>
    <circle cx="28" cy="26" r="4" fill="var(--bp-primary)"/>
    <path d="M19 38 C19 33 22 31 28 31 C34 31 37 33 37 38" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <circle cx="28" cy="26" r="4" fill="var(--bp-primary-dark)"/>
    <polyline points="24 26 27 29 33 23" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShieldPhoneLockSVG = () => (
  <svg width="72" height="64" viewBox="0 0 72 64" fill="none">
    <defs>
      <linearGradient id="spl1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--bp-primary)"/><stop offset="100%" stopColor="var(--bp-primary-dark)"/></linearGradient>
      <linearGradient id="spl2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#374151"/><stop offset="100%" stopColor="#1F2937"/></linearGradient>
    </defs>
    <circle cx="36" cy="32" r="28" fill="rgba(34,197,94,0.08)"/>
    <circle cx="36" cy="32" r="20" fill="rgba(34,197,94,0.05)"/>
    <path d="M36 6 L54 14 L54 30 C54 40 46 47 36 50 C26 47 18 40 18 30 L18 14 Z" fill="url(#spl1)" opacity="0.9"/>
    <polyline points="27 30 33 36 46 23" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="52" y="18" width="16" height="26" rx="3" fill="url(#spl2)"/>
    <rect x="53.5" y="19.5" width="13" height="23" rx="2" fill="#111827"/>
    <rect x="55" y="22" width="10" height="16" rx="1" fill="#1F2937"/>
    <circle cx="60" cy="41" r="1.2" fill="#374151"/>
    <rect x="3" y="28" width="14" height="10" rx="2" fill="#4B5563"/>
    <rect x="4" y="29" width="12" height="6" rx="1.5" fill="#374151"/>
    <path d="M6 29 L6 27.5 C6 25.5 12 25.5 12 27.5 L12 29" stroke="#6B7280" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <circle cx="10" cy="33" r="1.3" fill="#6B7280"/>
    <path d="M10 34.3 L10 35.5" stroke="#6B7280" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const FEATURE_CARDS_DATA = [
  { img:imgAI,     title:"Assistant IA",     desc:"Optimise automatiquement votre annonce.",   badge:"Optimisation intelligente" },
  { img:imgShield, title:"Protection totale", desc:"Vos données restent protégées.",            badge:"100% sécurisé" },
  { img:imgGlobe,  title:"Audience africaine",desc:"Touchez des acheteurs partout.",            badge:"Visibilité maximale" },
  { img:imgCard,   title:"Paiement protégé", desc:"Transactions fiables et garanties.",        badge:"Paiement sécurisé" },
];

function Step1({ photos, uploading, progress, phase, onSelectFiles, onRemove, onSetMain, onDrop }: {
  photos:Photo[]; uploading:boolean; progress:number; phase:string;
  onSelectFiles:(f:File[])=>void; onRemove:(i:number)=>void;
  onSetMain:(i:number)=>void; onDrop:(e:React.DragEvent)=>void;
}) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const featRef  = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hovCard,  setHovCard]  = useState<number|null>(null);

  const qualityScore = Math.min(100,
    40 + (photos.length>=1?15:0) + (photos.length>=3?15:0) +
    (photos.length>=5?10:0) + (photos.length>=7?10:0) + (photos.length>=10?10:0)
  );

  const checklist = [
    { label:"Photo principale",  ok: photos.length >= 1 },
    { label:"Au moins 3 photos", ok: photos.length >= 3 },
    { label:"Bonne luminosité",  ok: photos.length >= 1 },
    { label:"Photo nette",       ok: photos.length >= 1 },
    { label:"Plusieurs angles",  ok: photos.length >= 3 },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" multiple style={{ display:"none" }}
        onChange={e => { if (e.target.files) { onSelectFiles(Array.from(e.target.files)); e.target.value=""; }}} />

      {/* ── HERO UPLOAD CARD (left/right split) ── */}
      <div style={{ background:"#fff", borderRadius:24, border:`1.5px solid ${dragOver?G:"#E5E7EB"}`, boxShadow: dragOver?`0 0 0 4px ${G}20,0 10px 40px rgba(15,23,42,0.08)`:"0 10px 40px rgba(15,23,42,0.08)", overflow:"hidden", transition:"all 0.2s" }}>
        <div style={{ display:"flex", minHeight:170 }}>

          {/* LEFT — drag zone + CTA */}
          <div
            onDragOver={e=>{ e.preventDefault(); setDragOver(true); }}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{ e.preventDefault(); setDragOver(false); onDrop(e); }}
            onClick={()=>!uploading&&photos.length<10&&fileRef.current?.click()}
            style={{ flex:"0 0 52%", padding:"20px 14px 16px", display:"flex", flexDirection:"column", gap:9, justifyContent:"center", cursor:uploading||photos.length>=10?"default":"pointer" }}
          >
            {/* Cloud icon */}
            <div style={{ width:40, height:40 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
            </div>
            {uploading ? (
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:"#0F172A" }}>{phaseLabel(phase as never, progress)}</div>
                <div style={{ marginTop:8, width:"100%", height:4, background:"#E5E7EB", borderRadius:99 }}>
                  <div style={{ width:`${progress}%`, height:"100%", background:`linear-gradient(90deg,${G},${GD})`, borderRadius:99, transition:"width 0.3s" }}/>
                </div>
                <div style={{ fontSize:11, color:G, fontWeight:700, marginTop:4 }}>{progress}%</div>
              </div>
            ) : (
              <>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, color:"#0F172A", lineHeight:1.35 }}>Glissez-déposez vos photos ou vidéos</div>
                  <div style={{ fontSize:12, color:"#64748B", marginTop:4 }}>ou sélectionnez depuis votre galerie</div>
                </div>
                {/* Format pills */}
                <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:4 }}>
                  {["JPG","PNG","WEBP","MP4"].map(f=>(
                    <span key={f} style={{ fontSize:10.5, fontWeight:600, color:"#64748B", background:"#F8FAFC", border:"1px solid #E5E7EB", borderRadius:99, padding:"2px 7px" }}>{f}</span>
                  ))}
                  <span style={{ fontSize:10.5, color:"#9CA3AF" }}>• Max 50 Mo</span>
                </div>
                {/* Badge */}
                <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#F0FDF4", border:`1px solid ${G}50`, borderRadius:99, padding:"4px 10px", alignSelf:"flex-start" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span style={{ fontSize:11, color:GD, fontWeight:600 }}>Jusqu'à 10 photos ou 1 vidéo</span>
                </div>
              </>
            )}
          </div>

          {/* RIGHT — photo fan + add button */}
          <div style={{ flex:1, padding:"14px 12px", display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8, overflow:"hidden" }}>
            {photos.length > 0 ? (
              <div style={{ position:"relative", width:130, height:130, flexShrink:0 }}>
                {photos.slice(0,3).map((ph,i) => {
                  const rots = [-10, 0, 10];
                  const txs = [-28, 0, 28];
                  return (
                    <div key={i} style={{
                      position:"absolute", left:"50%", top:"50%",
                      width:86, height:108,
                      borderRadius:14, overflow:"hidden",
                      border:"2.5px solid #fff",
                      boxShadow:"0 6px 20px rgba(0,0,0,0.18)",
                      transform:`translate(calc(-50% + ${txs[i]}px), -50%) rotate(${rots[i]}deg)`,
                      zIndex: i===1?3:i===0?2:1,
                    }}>
                      <img src={ph.localUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      {i===1 && (
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, background:`linear-gradient(transparent,rgba(0,0,0,0.65))`, padding:"14px 4px 5px", textAlign:"center" }}>
                          <span style={{ fontSize:8.5, fontWeight:700, color:"#fff" }}>👑 Photo principale</span>
                        </div>
                      )}
                      <button onClick={e=>{ e.stopPropagation(); onRemove(photos.indexOf(ph)); }} style={{ position:"absolute", top:4, right:4, background:"rgba(239,68,68,0.9)", border:"none", borderRadius:"50%", width:17, height:17, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <IcX/>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ width:86, height:108, borderRadius:14, border:"2px dashed #D1D5DB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
            )}
            {photos.length < 10 && (
              <button onClick={()=>fileRef.current?.click()} style={{ width:44, height:44, borderRadius:12, border:"1.5px dashed #D1D5DB", background:"#F8FAFC", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, fontSize:22, color:"#9CA3AF", lineHeight:1 }}>
                +
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── QUALITY CARD (3 columns) ── */}
      <div style={{ background:"#fff", borderRadius:24, padding:"16px", boxShadow:"0 10px 40px rgba(15,23,42,0.08)", border:"1px solid #E5E7EB" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:12 }}>Qualité des médias</div>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>

          {/* Score ring */}
          <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <div style={{
              width:62, height:62, borderRadius:"50%",
              background:`conic-gradient(${G} ${qualityScore*3.6}deg, #E5E7EB ${qualityScore*3.6}deg)`,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:"#fff", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:0 }}>
                <span style={{ fontSize:17, fontWeight:800, color:"#0F172A", lineHeight:1 }}>{qualityScore}</span>
                <span style={{ fontSize:9, color:"#64748B", lineHeight:1 }}>/100</span>
              </div>
            </div>
          </div>

          {/* Checklist 2-column */}
          <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px 6px", alignContent:"start" }}>
            {checklist.map(item => (
              <div key={item.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:17, height:17, borderRadius:"50%", background: item.ok ? G : "#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.3s" }}>
                  {item.ok
                    ? <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="10 3 5 9 2 6"/></svg>
                    : <div style={{ width:5, height:5, borderRadius:"50%", background:"#D1D5DB" }}/>
                  }
                </div>
                <span style={{ fontSize:11, color: item.ok?"#0F172A":"#9CA3AF", fontWeight: item.ok?500:400 }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Conseil BrutePawa box */}
          <div style={{ flexShrink:0, width:112, background:"#F0FDF4", borderRadius:14, padding:"10px 9px", border:"1px solid #DCFCE7" }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:GD, marginBottom:5, display:"flex", alignItems:"center", gap:3 }}>
              <span>✨</span> Conseil BrutePawa
            </div>
            <div style={{ fontSize:10, color:"#374151", lineHeight:1.55 }}>Les annonces avec 5+ photos se vendent 3x plus vite ! Ajoutez des photos sous plusieurs angles.</div>
          </div>
        </div>
      </div>

      {/* ── WHY BRUTEPAWA — PREMIUM ── */}
      <div ref={featRef}>

        {/* Section header */}
        <div style={{ textAlign:"center", padding:"10px 4px 18px" }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:5,
            background:"linear-gradient(135deg,#DCFCE7 0%,#F0FDF4 100%)",
            borderRadius:99, padding:"5px 14px", marginBottom:12,
            border:"1px solid rgba(34,197,94,0.25)",
          }}>
            <span style={{ fontSize:11, color:GD, fontWeight:700, letterSpacing:0.3 }}>✨ Fonctionnalités</span>
          </div>
          <div style={{ fontSize:19, fontWeight:800, color:"#0F172A", letterSpacing:"-0.4px", lineHeight:1.25 }}>
            Pourquoi publier sur<br/>
            <span style={{ background:`linear-gradient(135deg,${G},${GD})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              BrutePawa ?
            </span>
          </div>
          <div style={{ fontSize:13, color:"#64748B", marginTop:8, lineHeight:1.6 }}>
            Vendez plus rapidement grâce à nos outils<br/>intelligents et notre sécurité renforcée.
          </div>
        </div>

        {/* 2×2 premium card grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {FEATURE_CARDS_DATA.map((card, i) => {
            const isHov = hovCard === i;
            return (
              <div
                key={card.title}
                onMouseEnter={() => setHovCard(i)}
                onMouseLeave={() => setHovCard(null)}
                style={{
                  position:"relative", overflow:"hidden",
                  background:"#fff",
                  borderRadius:24,
                  padding:"22px 14px 18px",
                  border:`1.5px solid ${isHov ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.12)"}`,
                  boxShadow: isHov
                    ? "0 24px 60px rgba(34,197,94,0.22), 0 8px 32px rgba(15,23,42,0.10)"
                    : "0 4px 24px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:10,
                  animation: `cardIn 0.5s cubic-bezier(0.34,1.2,0.64,1) ${i*0.09}s both`,
                  transform: `translateY(${isHov ? -6 : 0}px) scale(${isHov ? 1.02 : 1})`,
                  transition: `transform 0.35s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.25s ease, border-color 0.25s ease`,
                  cursor:"default",
                }}
              >
                {/* Subtle corner glow */}
                <div style={{
                  position:"absolute", top:-20, right:-20, width:80, height:80,
                  borderRadius:"50%",
                  background:`radial-gradient(circle, rgba(34,197,94,${isHov?0.18:0.07}) 0%, transparent 70%)`,
                  transition:"all 0.3s ease", pointerEvents:"none",
                }}/>

                {/* Icon with floating glow halo */}
                <div style={{ position:"relative", width:84, height:84 }}>
                  <div style={{
                    position:"absolute", inset:-6, borderRadius:"50%",
                    background:`radial-gradient(circle, rgba(34,197,94,${isHov?0.2:0.09}) 0%, transparent 68%)`,
                    transition:"all 0.3s ease",
                  }}/>
                  <img
                    src={card.img}
                    alt={card.title}
                    style={{
                      width:84, height:84, objectFit:"contain", position:"relative",
                      animation:`float 3s ease-in-out ${i*0.6}s infinite`,
                      filter: isHov ? "drop-shadow(0 8px 16px rgba(34,197,94,0.35))" : "drop-shadow(0 4px 8px rgba(15,23,42,0.12))",
                      transition:"filter 0.3s ease",
                    }}
                  />
                </div>

                {/* Title */}
                <div style={{
                  fontWeight:800, fontSize:14.5, color:"#0F172A",
                  textAlign:"center", lineHeight:1.25, letterSpacing:"-0.2px",
                }}>
                  {card.title}
                </div>

                {/* Description */}
                <div style={{
                  fontSize:12, color:"#64748B",
                  textAlign:"center", lineHeight:1.6,
                  maxWidth:150,
                }}>
                  {card.desc}
                </div>

                {/* Badge */}
                <div style={{
                  background:`linear-gradient(135deg,#DCFCE7,#F0FDF4)`,
                  borderRadius:99, padding:"5px 13px",
                  border:`1px solid rgba(34,197,94,${isHov?0.35:0.2})`,
                  boxShadow: isHov ? "0 4px 14px rgba(34,197,94,0.22)" : "none",
                  transition:"all 0.25s ease",
                }}>
                  <span style={{ fontSize:11, color:GD, fontWeight:700 }}>✓ {card.badge}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TRUST BANNER ── */}
      <div style={{ borderRadius:20, overflow:"hidden", boxShadow:"0 4px 20px rgba(34,197,94,0.10)" }}>
        <img src={imgTrust} alt="BrutePawa protège vos données" style={{ width:"100%", height:"auto", display:"block" }}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 2 — INFORMATIONS
═══════════════════════════════════════════════════════════════════════════ */
function Step2({
  title,setTitle,price,setPrice,category,setCategory,condition,setCondition,
  country,setCountry,city,setCity,description,setDescription,negotiable,setNegotiable,
}: {
  title:string;setTitle:(v:string)=>void;price:string;setPrice:(v:string)=>void;
  category:string;setCategory:(v:string)=>void;condition:string;setCondition:(v:string)=>void;
  country:string;setCountry:(v:string)=>void;city:string;setCity:(v:string)=>void;
  description:string;setDescription:(v:string)=>void;negotiable:boolean;setNegotiable:(v:boolean)=>void;
}) {
  const selectedCountry = COUNTRIES.find(c=>c.code===country)??COUNTRIES[0];
  const fmtPrice = (raw:string) => { const n=raw.replace(/\D/g,""); return n?parseInt(n).toLocaleString("fr-FR"):""; };
  const rawPrice = price.replace(/[\s\u202f]/g,"");
  const marketMin = rawPrice ? Math.round(parseInt(rawPrice)*0.9).toLocaleString("fr-FR") : null;
  const marketMax = rawPrice ? Math.round(parseInt(rawPrice)*1.1).toLocaleString("fr-FR") : null;
  const isCompetitive = rawPrice && parseInt(rawPrice) <= parseInt(rawPrice)*1.05;

  const inp: React.CSSProperties = { flex:1, border:"none", outline:"none", fontSize:15, color:"#111827", background:"transparent", fontFamily:"inherit", padding:"13px 0" };

  const [aiTitle, setAiTitle] = useState(false);
  const [aiDesc,  setAiDesc]  = useState(false);

  const generateTitle = () => {
    if (aiTitle) return; setAiTitle(true);
    const s = ["iPhone 15 Pro Max 256 Go","Samsung Galaxy S24 Ultra","MacBook Pro M3 14 pouces","AirPods Pro 2ème génération","iPad Air 5 Wifi 64 Go"];
    setTimeout(() => { if (!title.trim()) setTitle(s[Math.floor(Math.random()*s.length)]); setAiTitle(false); }, 1200);
  };
  const generateDesc = () => {
    if (aiDesc) return; setAiDesc(true);
    setTimeout(() => {
      if (!description.trim()) setDescription(`${title||"Article"} en parfait état.\nAucune rayure, batterie à 100%.\nVendu avec chargeur et boîte d'origine.\nPrix légèrement négociable.`);
      setAiDesc(false);
    }, 1500);
  };

  const card: React.CSSProperties = { background:"#fff", borderRadius:20, padding:"16px", boxShadow:"0 10px 30px rgba(0,0,0,0.07)", border:"1px solid #F1F5F9" };
  const field: React.CSSProperties = { background:"#F8FAFC", border:"1.5px solid #E5E7EB", borderRadius:14, padding:"0 14px", display:"flex", alignItems:"center", gap:8 };
  const lbl: React.CSSProperties = { fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:8 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Titre */}
      <div style={card}>
        <label style={lbl}>Titre de l'annonce *</label>
        <div style={field}>
          <IcPen/>
          <input style={inp} placeholder="Ex: iPhone 15 Pro Max 256 Go" value={title} maxLength={80} onChange={e=>setTitle(e.target.value)} />
          <span style={{ fontSize:12, color:"#9CA3AF", flexShrink:0 }}>{title.length}/80</span>
          {title.length>5 && <span style={{ color:G, flexShrink:0 }}><IcCheckG/></span>}
        </div>
        <button onClick={generateTitle} disabled={aiTitle} style={{
          marginTop:8, display:"flex", alignItems:"center", gap:7, background:`${G}12`,
          border:`1px solid ${G}30`, borderRadius:12, padding:"8px 14px",
          color:G, fontWeight:600, fontSize:13, cursor:"pointer", width:"100%", justifyContent:"center",
          opacity:aiTitle?0.7:1, transition:"all 0.2s",
        }}>
          <IcAI/> {aiTitle ? "Génération en cours…" : "✨ Générer un titre avec l'IA"}
        </button>
      </div>

      {/* Prix */}
      <div style={card}>
        <label style={lbl}>Prix (FCFA) *</label>
        <div style={field}>
          <span style={{ fontSize:17, fontWeight:700, color:"#9CA3AF", flexShrink:0 }}>₣</span>
          <input style={inp} placeholder="350 000" inputMode="numeric" value={price} onChange={e=>setPrice(fmtPrice(e.target.value))} />
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <span style={{ fontSize:12.5, fontWeight:600, color:"#6B7280" }}>Négociable</span>
            <div onClick={()=>setNegotiable(!negotiable)} style={{ width:44, height:24, borderRadius:12, background:negotiable?G:"#D1D5DB", position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
              <div style={{ position:"absolute", top:2, left:negotiable?20:2, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        </div>
        {marketMin && (
          <div style={{ marginTop:8, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
            <span style={{ fontSize:12, color:"#9CA3AF" }}>Prix du marché : <span style={{ color:G, fontWeight:700 }}>{marketMin} – {marketMax} FCFA</span></span>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {isCompetitive && <span style={{ fontSize:11, fontWeight:700, color:G, background:`${G}15`, padding:"2px 8px", borderRadius:99 }}>✓ Prix compétitif</span>}
              <button style={{ background:"none", border:"none", color:G, fontWeight:700, fontSize:12, cursor:"pointer" }}>Ajuster le prix</button>
            </div>
          </div>
        )}
      </div>

      {/* Catégorie + État */}
      <div style={card}>
        <div style={{ display:"flex", gap:12 }}>
          <div style={{ flex:1 }}>
            <label style={lbl}>Catégorie *</label>
            <div style={{ ...field, padding:"0 12px" }}>
              <select value={category} onChange={e=>setCategory(e.target.value)} style={{ width:"100%", border:"none", outline:"none", fontSize:13.5, color:"#111827", background:"transparent", fontFamily:"inherit", padding:"12px 0", cursor:"pointer" }}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ flex:1 }}>
            <label style={lbl}>État *</label>
            <div style={{ ...field, padding:"0 12px" }}>
              <select value={condition} onChange={e=>setCondition(e.target.value)} style={{ width:"100%", border:"none", outline:"none", fontSize:13.5, color:"#111827", background:"transparent", fontFamily:"inherit", padding:"12px 0", cursor:"pointer" }}>
                {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Localisation */}
      <div style={card}>
        <label style={lbl}>Localisation *</label>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"#9CA3AF", display:"block", marginBottom:5 }}>Pays *</label>
            <div style={{ ...field, padding:"0 12px" }}>
              <span style={{ fontSize:18 }}>{selectedCountry.flag}</span>
              <select value={country} onChange={e=>{ const c=COUNTRIES.find(x=>x.code===e.target.value)??COUNTRIES[0]; setCountry(e.target.value); setCity(c.cities[0]); }} style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#111827", background:"transparent", fontFamily:"inherit", padding:"12px 0", cursor:"pointer" }}>
                {COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"#9CA3AF", display:"block", marginBottom:5 }}>Ville *</label>
            <div style={{ ...field, padding:"0 12px" }}>
              <IcLoc/>
              <select value={city} onChange={e=>setCity(e.target.value)} style={{ flex:1, border:"none", outline:"none", fontSize:13, color:"#111827", background:"transparent", fontFamily:"inherit", padding:"12px 0", cursor:"pointer" }}>
                {selectedCountry.cities.map(ci=><option key={ci}>{ci}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={card}>
        <label style={lbl}>Description *</label>
        <div style={{ background:"#F8FAFC", border:"1.5px solid #E5E7EB", borderRadius:14, overflow:"hidden" }}>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={1000}
            placeholder="Décrivez votre article : état, dimensions, couleur, défauts éventuels..."
            style={{ width:"100%", border:"none", outline:"none", resize:"none", padding:"13px", fontSize:14, fontFamily:"inherit", color:"#111827", height:110, boxSizing:"border-box", background:"transparent" }} />
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 13px", borderTop:"1px solid #F1F5F9", background:"#FAFAFA" }}>
            <span style={{ fontSize:11, color:"#9CA3AF", fontStyle:"italic" }}>Soyez précis et honnête</span>
            <span style={{ fontSize:11, color: description.length>900?"#EF4444":"#9CA3AF" }}>{description.length}/1000 {description.length>5 && <span style={{ color:G }}>✓</span>}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
          {[
            { label: aiDesc?"Génération…":"✨ Assistant IA", fn:generateDesc, primary:true },
            { label:"Suggérer une description", fn:generateDesc, primary:false },
            { label:"Mots-clés recommandés", fn:()=>{}, primary:false },
          ].map(btn => (
            <button key={btn.label} onClick={btn.fn} style={{
              display:"flex", alignItems:"center", gap:5,
              background: btn.primary ? `${G}12` : "#F1F5F9",
              border: btn.primary ? `1px solid ${G}30` : "1px solid #E5E7EB",
              borderRadius:10, padding:"7px 12px",
              color: btn.primary ? G : "#6B7280",
              fontWeight:600, fontSize:12, cursor:"pointer",
            }}>
              {btn.primary && <IcAI/>} {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 3 — VISIBILITÉ (PREMIUM)
═══════════════════════════════════════════════════════════════════════════ */
function Step3({ visibility, setVisibility, duration, setDuration }: {
  visibility:string; setVisibility:(v:string)=>void;
  duration:number;   setDuration:(v:number)=>void;
}) {
  const p = perf(visibility, duration);
  const plan = VISIBILITY_PLANS.find(pl=>pl.id===visibility)!;

  const badgeColor = (badge:string|null) => {
    if (badge==="Populaire") return G;
    if (badge==="Recommandé") return "#3B82F6";
    if (badge==="Meilleur retour") return "#F59E0B";
    return G;
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Visibility cards */}
      <div style={{ background:"#fff", borderRadius:24, padding:"18px", boxShadow:"0 10px 30px rgba(0,0,0,0.08)", border:"1px solid #F1F5F9" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#374151", marginBottom:14 }}>Choisissez votre option de visibilité</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {VISIBILITY_PLANS.map(plan => {
            const active = visibility === plan.id;
            return (
              <div key={plan.id} onClick={()=>setVisibility(plan.id)} style={{
                border:`2px solid ${active ? plan.color : "#E5E7EB"}`,
                borderRadius:18, padding:"12px 14px", cursor:"pointer",
                background: active ? `${plan.color}08` : "#fff",
                transition:"all 0.25s ease",
                boxShadow: active ? `0 6px 20px ${plan.color}25` : "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  {/* Radio */}
                  <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${active?plan.color:"#D1D5DB"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2, background:active?plan.color:"#fff", transition:"all 0.2s" }}>
                    {active && <div style={{ width:7, height:7, borderRadius:"50%", background:"#fff" }} />}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:3 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"#111827" }}>{plan.label}</span>
                      {plan.badge && (
                        <span style={{ fontSize:10.5, fontWeight:700, color:badgeColor(plan.badge), background:`${badgeColor(plan.badge)}18`, padding:"2px 8px", borderRadius:99 }}>{plan.badge}</span>
                      )}
                      <span style={{ marginLeft:"auto", fontWeight:800, fontSize:14, color: plan.price===0?G:"#111827", flexShrink:0 }}>{plan.priceLabel}</span>
                    </div>
                    <div style={{ fontSize:12.5, color:"#6B7280", marginBottom: active?8:0 }}>{plan.desc}</div>
                    {active && (
                      <div style={{ display:"flex", gap:12, flexWrap:"wrap", paddingTop:8, borderTop:"1px solid #F1F5F9" }}>
                        {[
                          { label:"Portée", value:plan.reach },
                          { label:"Audience", value:plan.audience },
                          { label:"Conversion", value:plan.conversion },
                        ].map(m => (
                          <div key={m.label} style={{ flex:1, minWidth:60 }}>
                            <div style={{ fontSize:10, color:"#9CA3AF", marginBottom:2 }}>{m.label}</div>
                            <div style={{ fontSize:13, fontWeight:700, color:plan.color }}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <div style={{ background:"#fff", borderRadius:24, padding:"18px", boxShadow:"0 10px 30px rgba(0,0,0,0.08)", border:"1px solid #F1F5F9" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#374151", marginBottom:12 }}>Durée de publication</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          {DURATIONS.map(d => {
            const active = duration===d.days;
            return (
              <div key={d.days} onClick={()=>setDuration(d.days)} style={{
                border:`2px solid ${active?G:"#E5E7EB"}`, borderRadius:16,
                padding:"12px 6px", cursor:"pointer", textAlign:"center",
                background: active ? `linear-gradient(135deg,${G},${GD})` : "#fff",
                transition:"all 0.25s ease",
                boxShadow: active ? `0 6px 16px ${G}40` : "none",
              }}>
                <div style={{ fontWeight:800, fontSize:15, color: active?"#fff":"#111827" }}>{d.days}</div>
                <div style={{ fontSize:11, fontWeight:600, color: active?"rgba(255,255,255,0.85)":"#9CA3AF", marginTop:1 }}>jours</div>
                {d.discount>0 && (
                  <div style={{ fontSize:11, fontWeight:700, color: active?"#fff":G, marginTop:4, background: active?"rgba(255,255,255,0.2)":"#F0FDF4", borderRadius:99, padding:"1px 0" }}>-{d.discount}%</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance estimates */}
      <div style={{ background:"#fff", borderRadius:24, padding:"18px", boxShadow:"0 10px 30px rgba(0,0,0,0.08)", border:"1px solid #F1F5F9" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
          <span style={{ fontSize:14, fontWeight:700, color:"#374151" }}>Estimation des performances</span>
          <div style={{ width:16, height:16, borderRadius:"50%", border:"1.5px solid #9CA3AF", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:10, color:"#9CA3AF", fontWeight:700 }}>i</span>
          </div>
        </div>

        {/* 3 stat cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          {[
            { icon:<IcEye/>,   label:"Vues estimées",    min:p.viewsMin,  max:p.viewsMax,  color:"#3B82F6" },
            { icon:<IcClick/>, label:"Clics estimés",    min:p.clicksMin, max:p.clicksMax, color:"#8B5CF6" },
            { icon:<IcMsg/>,   label:"Contacts estimés", min:p.ctMin,     max:p.ctMax,     color:G },
          ].map(stat => (
            <div key={stat.label} style={{ background:`${stat.color}08`, borderRadius:14, padding:"10px 8px", textAlign:"center", border:`1px solid ${stat.color}20` }}>
              <div style={{ display:"flex", justifyContent:"center", color:stat.color, marginBottom:5 }}>{stat.icon}</div>
              <div style={{ fontSize:12, fontWeight:800, color:"#111827", lineHeight:1.3 }}>
                {stat.min.toLocaleString("fr-FR")}<br/>– {stat.max.toLocaleString("fr-FR")}
              </div>
              <div style={{ fontSize:10, color:"#9CA3AF", marginTop:3, lineHeight:1.3 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Performance bars */}
        {[
          { label:"Visibilité", pct: plan.id==="standard"?20:plan.id==="local"?50:plan.id==="national"?75:100, color:"#3B82F6" },
          { label:"Réactivité", pct: plan.id==="standard"?15:plan.id==="local"?45:plan.id==="national"?70:95, color:"#8B5CF6" },
          { label:"Conversions", pct: plan.id==="standard"?12:plan.id==="local"?40:plan.id==="national"?65:92, color:G },
        ].map(bar => (
          <div key={bar.label} style={{ marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:12, color:"#6B7280", fontWeight:500 }}>{bar.label}</span>
              <span style={{ fontSize:12, color:bar.color, fontWeight:700 }}>{bar.pct}%</span>
            </div>
            <div style={{ height:5, background:"#F1F5F9", borderRadius:99 }}>
              <div style={{ width:`${bar.pct}%`, height:"100%", background:`linear-gradient(90deg,${bar.color}80,${bar.color})`, borderRadius:99, transition:"width 0.5s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STEP 4 — APERÇU & PUBLICATION (PREMIUM)
═══════════════════════════════════════════════════════════════════════════ */
function Step4({
  title, price, condition, country, city, description, photos,
  visibility, termsOk, setTermsOk, infoOk, setInfoOk, onPublish, publishing, error,
}: {
  title:string; price:string; condition:string;
  country:string; city:string; description:string; photos:Photo[];
  visibility:string; termsOk:boolean; setTermsOk:(v:boolean)=>void;
  infoOk:boolean; setInfoOk:(v:boolean)=>void;
  onPublish:()=>void; publishing:boolean; error:string|null;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const fbUser  = getCurrentUser();
  const seller  = `${fbUser.firstName??""}${fbUser.lastName?" "+fbUser.lastName:""}`.trim()||"Vous";
  const selectedCo = COUNTRIES.find(c=>c.code===country)??COUNTRIES[0];
  const rawPrice   = price.replace(/[\s\u202f]/g,"");
  const displayPrice = rawPrice ? `${parseInt(rawPrice).toLocaleString("fr-FR")} FCFA` : "—";

  const photoScore  = photos.length>=3?92:photos.length>=1?78:45;
  const titleScore  = title.length>=20?95:title.length>=5?70:30;
  const descScore   = description.length>=100?94:description.length>=20?70:30;
  const globalScore = Math.round((photoScore+titleScore+descScore)/3);
  const scoreLabel  = globalScore>=90?"Excellent":globalScore>=75?"Très bon":globalScore>=55?"Bon":"À améliorer";
  const audienceEst = visibility==="continental"?"25 000+":visibility==="national"?"8 000+":visibility==="local"?"3 800+":"1 500";
  const sellDays    = visibility==="continental"?"2 à 4 jours":visibility==="national"?"3 à 6 jours":visibility==="local"?"3 à 7 jours":"7 à 14 jours";

  const memberSince = () => { const d=new Date(); d.setMonth(d.getMonth()-6); return d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}); };

  const canPublish = title.trim() && rawPrice && photos.length>0 && description.trim() && termsOk && infoOk;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* ── Swipeable Gallery ── */}
      <div style={{ background:"#fff", borderRadius:24, overflow:"hidden", boxShadow:"0 10px 30px rgba(0,0,0,0.10)", border:"1px solid #F1F5F9" }}>
        {/* Gallery */}
        <div style={{ position:"relative", height:220, background:"#F1F5F9", overflow:"hidden" }}>
          {photos.length > 0 ? (
            <>
              <img
                src={photos[photoIdx]?.localUrl}
                alt="preview"
                style={{ width:"100%", height:"100%", objectFit:"cover", transition:"opacity 0.3s" }}
              />
              {/* Nav arrows */}
              {photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx(i=>(i-1+photos.length)%photos.length)} style={{
                    position:"absolute", left:8, top:"50%", transform:"translateY(-50%)",
                    width:32, height:32, borderRadius:"50%", background:"rgba(0,0,0,0.45)", border:"none",
                    display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                  }}><IcChevL/></button>
                  <button onClick={() => setPhotoIdx(i=>(i+1)%photos.length)} style={{
                    position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                    width:32, height:32, borderRadius:"50%", background:"rgba(0,0,0,0.45)", border:"none",
                    display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                  }}><IcChevR/></button>
                  {/* Counter */}
                  <div style={{ position:"absolute", bottom:10, right:10, background:"rgba(0,0,0,0.55)", borderRadius:99, padding:"3px 10px", fontSize:12, fontWeight:700, color:"#fff" }}>
                    {photoIdx+1}/{photos.length}
                  </div>
                  {/* Dots */}
                  <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", display:"flex", gap:5 }}>
                    {photos.map((_,i) => (
                      <div key={i} onClick={()=>setPhotoIdx(i)} style={{ width: i===photoIdx?18:6, height:6, borderRadius:99, background: i===photoIdx?"#fff":"rgba(255,255,255,0.5)", transition:"all 0.2s", cursor:"pointer" }} />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8 }}>
              <IcCloud/>
              <span style={{ fontSize:13, color:"#9CA3AF" }}>Aucune photo ajoutée</span>
            </div>
          )}
        </div>

        {/* Listing info */}
        <div style={{ padding:"14px" }}>
          <div style={{ fontWeight:800, fontSize:18, color:"#111827", marginBottom:3 }}>{title||"Titre de l'annonce"}</div>
          <div style={{ fontWeight:800, fontSize:22, color:G, marginBottom:8 }}>{displayPrice}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8, flexWrap:"wrap" }}>
            <IcLoc/>
            <span style={{ fontSize:13, color:"#6B7280" }}>{city}, {selectedCo.name}</span>
            <span style={{ background:"#F1F5F9", borderRadius:99, padding:"2px 9px", fontSize:11.5, fontWeight:600, color:"#6B7280" }}>{condition}</span>
          </div>
          <div style={{ fontSize:13.5, color:"#374151", lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
            {description||"Description de votre annonce..."}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:0, borderTop:"1px solid #F1F5F9" }}>
          {[
            { icon:<IcMsg/>,   label:"Contacter", primary:true  },
            { icon:<IcPhone/>, label:"Appeler",   primary:false },
            { icon:<IcShare/>, label:"Partager",  primary:false },
            { icon:<IcHeart/>, label:"Enregistrer",primary:false },
            { icon:<IcFlag/>,  label:"Signaler",  primary:false },
          ].map(btn => (
            <button key={btn.label} style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:4, padding:"10px 4px", border:"none", background:"transparent", cursor:"pointer",
              color: btn.primary?G:"#6B7280",
              borderRight:"1px solid #F1F5F9",
              transition:"background 0.15s",
            }}>
              {btn.icon}
              <span style={{ fontSize:10, fontWeight:600 }}>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Seller card ── */}
      <div style={{ background:"#fff", borderRadius:24, padding:"16px", boxShadow:"0 10px 30px rgba(0,0,0,0.08)", border:"1px solid #F1F5F9" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          {fbUser.avatarUrl
            ? <img src={fbUser.avatarUrl} alt={seller} style={{ width:52, height:52, borderRadius:"50%", objectFit:"cover", border:`2px solid ${G}` }} />
            : <div style={{ width:52, height:52, borderRadius:"50%", background:`linear-gradient(135deg,${G},${GD})`, display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${GD}` }}>
                <span style={{ fontSize:20, fontWeight:800, color:"#fff" }}>{seller.charAt(0).toUpperCase()}</span>
              </div>
          }
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontWeight:700, fontSize:16, color:"#111827" }}>{seller}</span>
              <span style={{ fontSize:15 }}>✅</span>
            </div>
            <div style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>Membre depuis {memberSince()}</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:0, background:"#F8FAFC", borderRadius:14, overflow:"hidden" }}>
          {[
            { top:<div style={{ display:"flex", alignItems:"center", gap:3 }}><IcStar/><span style={{ fontWeight:800, fontSize:15, color:"#111827" }}>4.8</span></div>, bottom:"(128 avis)" },
            { top:<span style={{ fontWeight:800, fontSize:15, color:"#111827" }}>98%</span>, bottom:"Taux de réponse" },
            { top:<span style={{ fontWeight:800, fontSize:15, color:"#111827" }}>Rapide</span>, bottom:"Temps réponse" },
          ].map((m,i) => (
            <div key={i} style={{ padding:"10px 6px", textAlign:"center", borderRight: i<2?"1px solid #E5E7EB":"none" }}>
              <div style={{ marginBottom:2 }}>{m.top}</div>
              <div style={{ fontSize:10.5, color:"#9CA3AF" }}>{m.bottom}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Score card (rich) ── */}
      <div style={{ background:"#fff", borderRadius:24, padding:"16px", boxShadow:"0 10px 30px rgba(0,0,0,0.08)", border:`1.5px solid ${G}30` }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:`${G}15`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <IcCheckG/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color:GD }}>Annonce optimisée</div>
            <div style={{ fontSize:12.5, color:"#374151", lineHeight:1.5, marginTop:3 }}>Votre annonce respecte toutes les bonnes pratiques et a plus de chances d'être vue et vendue rapidement.</div>
          </div>
          <div style={{ textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:9.5, color:"#9CA3AF", marginBottom:3 }}>Score</div>
            <div style={{ width:48, height:48, borderRadius:"50%", background:`conic-gradient(${G} ${globalScore*3.6}deg, #E5E7EB 0deg)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:13, fontWeight:800, color:G }}>{globalScore}</span>
              </div>
            </div>
            <div style={{ fontSize:9.5, color:"#9CA3AF", marginTop:3 }}>/100</div>
          </div>
        </div>

        {/* Score breakdown */}
        <div style={{ background:"#F8FAFC", borderRadius:14, padding:"12px", marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:10 }}>Analyse IA détaillée</div>
          {[
            { label:"Qualité photos", pct:photoScore },
            { label:"Qualité titre",  pct:titleScore },
            { label:"Description",    pct:descScore  },
          ].map(b => (
            <div key={b.label} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:11.5, color:"#6B7280" }}>{b.label}</span>
                <span style={{ fontSize:11.5, color:G, fontWeight:700 }}>{b.pct}/100</span>
              </div>
              <div style={{ height:4, background:"#E5E7EB", borderRadius:99 }}>
                <div style={{ width:`${b.pct}%`, height:"100%", background:`linear-gradient(90deg,${G}90,${G})`, borderRadius:99, transition:"width 0.5s ease" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Metrics grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {[
            { icon:<IcTrend/>, label:"Probabilité vente", value:"Très forte", color:G },
            { icon:<IcTimer/>, label:"Temps moyen vente", value:sellDays,     color:"#3B82F6" },
            { icon:<IcUsers/>, label:"Audience potentielle", value:audienceEst+" pers.", color:"#8B5CF6" },
          ].map(m => (
            <div key={m.label} style={{ background:`${m.color}08`, borderRadius:12, padding:"10px 8px", textAlign:"center", border:`1px solid ${m.color}20` }}>
              <div style={{ display:"flex", justifyContent:"center", color:m.color, marginBottom:5 }}>{m.icon}</div>
              <div style={{ fontSize:11, fontWeight:800, color:"#111827", lineHeight:1.3 }}>{m.value}</div>
              <div style={{ fontSize:9.5, color:"#9CA3AF", marginTop:2, lineHeight:1.3 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Score label badge */}
        <div style={{ marginTop:12, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:G }} />
          <span style={{ fontSize:12.5, fontWeight:700, color:G }}>{scoreLabel} · Excellente visibilité</span>
        </div>
      </div>

      {/* ── Checkboxes ── */}
      <div style={{ background:"#fff", borderRadius:24, padding:"16px", boxShadow:"0 10px 30px rgba(0,0,0,0.08)", border:"1px solid #F1F5F9", display:"flex", flexDirection:"column", gap:12 }}>
        {[
          { label:"Conditions d'utilisation acceptées",           value:termsOk, set:setTermsOk },
          { label:"Je confirme que les informations sont exactes",value:infoOk,  set:setInfoOk  },
        ].map(cb => (
          <div key={cb.label} onClick={()=>cb.set(!cb.value)} style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
            <div style={{ width:24, height:24, borderRadius:7, border:`2px solid ${cb.value?G:"#D1D5DB"}`, background:cb.value?G:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.2s", boxShadow:cb.value?`0 2px 8px ${G}40`:"none" }}>
              {cb.value && <IcCheckW/>}
            </div>
            <span style={{ fontSize:14, color:"#374151", fontWeight:500 }}>{cb.label}</span>
            {cb.value && <span style={{ marginLeft:"auto", color:G }}><IcCheckG/></span>}
          </div>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:14, padding:"10px 14px", fontSize:13, color:"#DC2626" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Publish button ── */}
      <button onClick={onPublish} disabled={!canPublish||publishing} style={{
        width:"100%", background: canPublish ? `linear-gradient(135deg,${G},${GD})` : "#E5E7EB",
        border:"none", borderRadius:22, padding:"18px",
        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
        cursor:canPublish?"pointer":"default",
        boxShadow:canPublish?`0 10px 28px ${G}50`:"none",
        transition:"all 0.25s ease",
        transform:canPublish?"scale(1)":"scale(0.98)",
      }}>
        {publishing
          ? <div style={{ width:22, height:22, border:"2.5px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
          : <IcRocket/>
        }
        <span style={{ fontWeight:800, fontSize:17, color:canPublish?"#fff":"#9CA3AF" }}>
          {publishing ? "Publication en cours…" : "🚀 Publier maintenant"}
        </span>
      </button>
      <div style={{ textAlign:"center", fontSize:12.5, color: canPublish?"#9CA3AF":"#EF4444", marginTop:-4 }}>
        {canPublish ? "Votre annonce sera visible immédiatement" : "Complétez tous les champs requis et acceptez les conditions"}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */
export default function CreateListingPage() {
  const navigate = useNavigate();

  const [step,        setStep]        = useState(1);
  const [photos,      setPhotos]      = useState<Photo[]>([]);
  const [title,       setTitle]       = useState("");
  const [price,       setPrice]       = useState("");
  const [category,    setCategory]    = useState("Électronique");
  const [condition,   setCondition]   = useState("Neuf");
  const [negotiable,  setNegotiable]  = useState(false);
  const [country,     setCountry]     = useState("ML");
  const [city,        setCity]        = useState("Bamako");
  const [description, setDescription] = useState("");
  const [visibility,  setVisibility]  = useState("standard");
  const [duration,    setDuration]    = useState(7);
  const [termsOk,     setTermsOk]     = useState(false);
  const [infoOk,      setInfoOk]      = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [error,       setError]       = useState<string|null>(null);

  const { upload, phase, progress } = useR2Upload();
  const [uploading, setUploading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top:0, behavior:"smooth" }); }, [step]);

  const handleSelectFiles = useCallback(async (files: File[]) => {
    const allowed = files.slice(0, 10 - photos.length);
    if (!allowed.length) return;
    setUploading(true);
    for (const file of allowed) {
      const localUrl = URL.createObjectURL(file);
      const result = await upload(file);
      if (result) setPhotos(prev => [...prev, { localUrl, r2Url:result.url, name:file.name }]);
    }
    setUploading(false);
  }, [photos.length, upload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/")||f.type.startsWith("video/"));
    handleSelectFiles(files);
  }, [handleSelectFiles]);

  const canContinue = () => {
    if (step===1) return true;
    if (step===2) return title.trim().length>0 && price.replace(/[\s\u202f]/g,"").length>0 && description.trim().length>0;
    if (step===3) return true;
    return false;
  };

  const handlePublish = async () => {
    const rawP = price.replace(/[\s\u202f]/g,"");
    if (!title.trim()||!rawP||!photos.length||!description.trim()||!termsOk||!infoOk) return;
    setPublishing(true); setError(null);
    try {
      const co = COUNTRIES.find(c=>c.code===country)??COUNTRIES[0];
      await apiCreateProduct({ title:title.trim(), description:description.trim(), price:parseInt(rawP), currency:co.currency, category, imageUrl:photos[0]?.r2Url, location:`${city}, ${co.name}` });
      trackEvent("marketplace_listing_created", { category, media_count: photos.length });
      navigate("/marketplace");
    } catch(e:unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la publication");
    } finally {
      setPublishing(false);
    }
  };

  const TITLES    = ["Médias","Informations","Visibilité","Aperçu & Publication"];
  const SUBTITLES = ["Ajoutez des photos ou vidéos de votre article","Décrivez votre article avec précision","Choisissez la visibilité de votre annonce","Vérifiez et publiez votre annonce"];

  return (
    <div style={{ background:BG, minHeight:"100dvh", display:"flex", flexDirection:"column", fontFamily:"Inter,sans-serif" }}>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes float  { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-6px);} }
        @keyframes cardIn { from{opacity:0;} to{opacity:1;} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:0; }
        button:active { transform:scale(0.96); }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <div style={{ background:"#fff", borderBottom:"1px solid #F1F5F9", padding:"10px 16px 0", position:"sticky", top:0, zIndex:30, boxShadow:"0 4px 16px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <button onClick={()=>step>1?setStep(step-1):navigate("/marketplace")} style={{ width:38, height:38, borderRadius:"50%", background:"#F1F5F9", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#374151" }}>
            <IcBack/>
          </button>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11.5, color:"#9CA3AF", fontWeight:500 }}>Étape {step} sur 4</div>
            <div style={{ fontSize:17, fontWeight:800, color:"#111827", marginTop:1 }}>{TITLES[step-1]}</div>
            <div style={{ fontSize:12, color:"#6B7280", marginTop:1 }}>{SUBTITLES[step-1]}</div>
          </div>
          <button style={{ background:"none", border:"none", color:G, fontWeight:700, fontSize:12.5, cursor:"pointer", textAlign:"right" }}>
            Enregistrer<br/>en brouillon
          </button>
        </div>
        <StepBar step={step} />
      </div>

      {/* ═══ CONTENT ═══ */}
      <div ref={scrollRef} style={{ flex:1, overflowY:"auto", padding:"16px 16px 180px" }}>
        <div key={step} style={{ maxWidth:480, margin:"0 auto", animation:"fadeUp 0.3s ease" }}>
          {step===1 && (
            <Step1
              photos={photos} uploading={uploading} progress={progress} phase={phase}
              onSelectFiles={handleSelectFiles}
              onRemove={i => setPhotos(prev=>prev.filter((_,x)=>x!==i))}
              onSetMain={i => setPhotos(prev=>{ const a=[...prev]; const [item]=a.splice(i,1); return [item,...a]; })}
              onDrop={handleDrop}
            />
          )}
          {step===2 && (
            <Step2
              title={title} setTitle={setTitle} price={price} setPrice={setPrice}
              category={category} setCategory={setCategory} condition={condition} setCondition={setCondition}
              country={country} setCountry={setCountry} city={city} setCity={setCity}
              description={description} setDescription={setDescription}
              negotiable={negotiable} setNegotiable={setNegotiable}
            />
          )}
          {step===3 && (
            <Step3 visibility={visibility} setVisibility={setVisibility} duration={duration} setDuration={setDuration} />
          )}
          {step===4 && (
            <Step4
              title={title} price={price} condition={condition}
              country={country} city={city} description={description}
              photos={photos} visibility={visibility}
              termsOk={termsOk} setTermsOk={setTermsOk}
              infoOk={infoOk} setInfoOk={setInfoOk}
              onPublish={handlePublish} publishing={publishing} error={error}
            />
          )}
        </div>
      </div>

      {/* ═══ STICKY BOTTOM BUTTON ═══ */}
      {step < 4 && (
        <div style={{ position:"fixed", bottom:58, left:0, right:0, zIndex:150, padding:"12px 16px 14px", background:"#fff", borderTop:"1px solid #F1F5F9", boxShadow:"0 -6px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ maxWidth:480, margin:"0 auto" }}>
            <button
              onClick={() => canContinue() && setStep(step+1)}
              style={{
                width:"100%",
                background: canContinue() ? `linear-gradient(135deg,${G},${GD})` : "#E5E7EB",
                border:"none", borderRadius:20, padding:"17px",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                cursor:canContinue()?"pointer":"default",
                boxShadow:canContinue()?`0 10px 28px ${G}50`:"none",
                transition:"all 0.25s ease",
              }}
            >
              <span style={{ fontWeight:800, fontSize:16, color:canContinue()?"#fff":"#9CA3AF" }}>Continuer</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={canContinue()?"#fff":"#9CA3AF"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            {step===2 && !canContinue() && (
              <div style={{ textAlign:"center", fontSize:12, color:"#EF4444", marginTop:6 }}>
                Titre, prix et description requis pour continuer
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
