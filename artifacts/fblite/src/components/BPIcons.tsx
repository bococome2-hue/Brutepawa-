import React from "react";

const W = 1.85;
const CAP = "round" as const;
const JOIN = "round" as const;

function Icon({ children, size, color }: { children: React.ReactNode; size: number; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={color} strokeWidth={W} strokeLinecap={CAP} strokeLinejoin={JOIN}>
      {children}
    </svg>
  );
}


// ═══════════════════════════════════════════
// SOCIAL
// ═══════════════════════════════════════════

export function BPFeed({ size = 24, color = "var(--bp-primary)" }) {
  return (
    <Icon size={size} color={color}>
      <rect x="3" y="3" width="8" height="8" rx="2.5" fill={color} fillOpacity="0.15" />
      <rect x="3" y="3" width="8" height="8" rx="2.5" />
      <rect x="13" y="3" width="8" height="8" rx="2.5" />
      <rect x="3" y="13" width="8" height="8" rx="2.5" />
      <rect x="13" y="13" width="8" height="8" rx="2.5" fill={color} fillOpacity="0.12" />
      <rect x="13" y="13" width="8" height="8" rx="2.5" />
    </Icon>
  );
}

export function BPMessages({ size = 24, color = "#3B82F6" }) {
  return (
    <Icon size={size} color={color}>
      <path
        d="M4 3.5h16a2 2 0 012 2v10a2 2 0 01-2 2H8.8L5 21.5l-.5-4H4a2 2 0 01-2-2v-10a2 2 0 012-2z"
        fill={color} fillOpacity="0.13" />
      <path d="M4 3.5h16a2 2 0 012 2v10a2 2 0 01-2 2H8.8L5 21.5l-.5-4H4a2 2 0 01-2-2v-10a2 2 0 012-2z" />
      <circle cx="8.5" cy="10" r="1.1" fill={color} stroke="none" />
      <circle cx="12.5" cy="10" r="1.1" fill={color} stroke="none" />
      <circle cx="16.5" cy="10" r="1.1" fill={color} stroke="none" />
    </Icon>
  );
}

export function BPAmis({ size = 24, color = "#F97316" }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="8.5" cy="7" r="3.2" fill={color} fillOpacity="0.15" />
      <circle cx="8.5" cy="7" r="3.2" />
      <path d="M2 20.5c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" />
      <circle cx="17" cy="7.5" r="2.5" strokeOpacity="0.55" />
      <path d="M15.5 14.5c.48-.2 1-.32 1.5-.32 2.76 0 5 2.24 5 5" strokeOpacity="0.55" />
    </Icon>
  );
}

export function BPGroupes({ size = 24, color = "#8B5CF6" }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="6.5" r="2.8" fill={color} fillOpacity="0.15" />
      <circle cx="12" cy="6.5" r="2.8" />
      <path d="M6 20.5c0-3.31 2.69-6 6-6s6 2.69 6 6" />
      <circle cx="4.5" cy="8" r="2.2" strokeOpacity="0.55" />
      <path d="M2 20.5c0-2.76 1.12-5 2.5-5" strokeOpacity="0.55" />
      <circle cx="19.5" cy="8" r="2.2" strokeOpacity="0.55" />
      <path d="M22 20.5c0-2.76-1.12-5-2.5-5" strokeOpacity="0.55" />
    </Icon>
  );
}

// ═══════════════════════════════════════════
// BUSINESS
// ═══════════════════════════════════════════

export function BPMarketplace({ size = 24, color = "var(--bp-primary)" }) {
  return (
    <Icon size={size} color={color}>
      <path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7L18 2z" fill={color} fillOpacity="0.13" />
      <path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7L18 2z" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <path d="M16 11a4 4 0 01-8 0" />
    </Icon>
  );
}

export function BPServices({ size = 24, color = "#3B82F6" }) {
  return (
    <Icon size={size} color={color}>
      <path d="M14.5 2.5a5 5 0 010 7.07l-10 10a2 2 0 01-2.83-2.83l10-10A5 5 0 0114.5 2.5z"
        fill={color} fillOpacity="0.13" />
      <path d="M14.5 2.5a5 5 0 010 7.07l-10 10a2 2 0 01-2.83-2.83l10-10A5 5 0 0114.5 2.5z" />
      <circle cx="19.5" cy="19.5" r="2" fill={color} fillOpacity="0.2" />
      <circle cx="19.5" cy="19.5" r="2" />
      <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
    </Icon>
  );
}

export function BPEmplois({ size = 24, color = "#F97316" }) {
  return (
    <Icon size={size} color={color}>
      <rect x="2" y="8" width="20" height="13" rx="2.5" fill={color} fillOpacity="0.13" />
      <rect x="2" y="8" width="20" height="13" rx="2.5" />
      <path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="2" y1="14" x2="22" y2="14" />
      <line x1="10" y1="14" x2="10" y2="17" strokeOpacity="0.45" />
      <line x1="14" y1="14" x2="14" y2="17" strokeOpacity="0.45" />
    </Icon>
  );
}

export function BPPages({ size = 24, color = "var(--bp-primary)" }) {
  return (
    <Icon size={size} color={color}>
      <path d="M4 15s1.5-2 4.5-2 5.5 2.5 8.5 2.5S21 14 21 14V4s-1.5 2-4.5 2S11 3.5 8 3.5 4 5 4 5v16"
        fill={color} fillOpacity="0.12" />
      <path d="M4 15s1.5-2 4.5-2 5.5 2.5 8.5 2.5S21 14 21 14V4s-1.5 2-4.5 2S11 3.5 8 3.5 4 5 4 5v16" />
    </Icon>
  );
}

// ═══════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════

export function BPPortefeuille({ size = 24, color = "var(--bp-primary)" }) {
  return (
    <Icon size={size} color={color}>
      <rect x="2" y="6" width="20" height="14" rx="2.5" fill={color} fillOpacity="0.13" />
      <rect x="2" y="6" width="20" height="14" rx="2.5" />
      <path d="M16 2l-4 4-4-4" strokeOpacity="0.5" />
      <rect x="15" y="12" width="5" height="4" rx="1.5" fill={color} fillOpacity="0.25" />
      <rect x="15" y="12" width="5" height="4" rx="1.5" />
      <circle cx="17.5" cy="14" r="0.8" fill={color} stroke="none" />
    </Icon>
  );
}

export function BPTontines({ size = 24, color = "#EAB308" }) {
  return (
    <Icon size={size} color={color}>
      <ellipse cx="12" cy="6" rx="8" ry="3" fill={color} fillOpacity="0.2" />
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M20 12c0 1.66-3.58 3-8 3s-8-1.34-8-3" />
      <path d="M4 6v6" />
      <path d="M20 6v6" />
      <path d="M20 18c0 1.66-3.58 3-8 3s-8-1.34-8-3" />
      <path d="M4 12v6" />
      <path d="M20 12v6" />
    </Icon>
  );
}

export function BPRevenus({ size = 24, color = "var(--bp-primary)" }) {
  return (
    <Icon size={size} color={color}>
      <rect x="3" y="14" width="4" height="7" rx="1.5" fill={color} fillOpacity="0.2" />
      <rect x="3" y="14" width="4" height="7" rx="1.5" />
      <rect x="10" y="9" width="4" height="12" rx="1.5" fill={color} fillOpacity="0.2" />
      <rect x="10" y="9" width="4" height="12" rx="1.5" />
      <rect x="17" y="3" width="4" height="18" rx="1.5" fill={color} fillOpacity="0.2" />
      <rect x="17" y="3" width="4" height="18" rx="1.5" />
      <path d="M3.5 11L9 7l6 3.5L22 4" strokeOpacity="0.7" />
      <circle cx="22" cy="4" r="1.5" fill={color} fillOpacity="0.4" strokeOpacity="0.7" />
    </Icon>
  );
}

export function BPPaiements({ size = 24, color = "#3B82F6" }) {
  return (
    <Icon size={size} color={color}>
      <rect x="2" y="5.5" width="20" height="14" rx="2.5" fill={color} fillOpacity="0.13" />
      <rect x="2" y="5.5" width="20" height="14" rx="2.5" />
      <line x1="2" y1="10.5" x2="22" y2="10.5" />
      <rect x="4.5" y="13" width="5" height="3" rx="1" fill={color} fillOpacity="0.3" />
      <rect x="4.5" y="13" width="5" height="3" rx="1" />
      <circle cx="17.5" cy="14.5" r="2" fill={color} fillOpacity="0.2" />
      <circle cx="19.5" cy="14.5" r="2" fill={color} fillOpacity="0.2" />
      <circle cx="17.5" cy="14.5" r="2" />
      <circle cx="19.5" cy="14.5" r="2" />
    </Icon>
  );
}

// ═══════════════════════════════════════════
// CRÉATEUR
// ═══════════════════════════════════════════

export function BPReels({ size = 24, color = "#EF4444" }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="9.5" fill={color} fillOpacity="0.1" />
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="3.5" fill={color} fillOpacity="0.25" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="4" r="1.2" fill={color} fillOpacity="0.6" stroke="none" />
      <circle cx="12" cy="20" r="1.2" fill={color} fillOpacity="0.6" stroke="none" />
      <circle cx="4" cy="12" r="1.2" fill={color} fillOpacity="0.6" stroke="none" />
      <circle cx="20" cy="12" r="1.2" fill={color} fillOpacity="0.6" stroke="none" />
      <circle cx="6.34" cy="6.34" r="1" fill={color} fillOpacity="0.45" stroke="none" />
      <circle cx="17.66" cy="17.66" r="1" fill={color} fillOpacity="0.45" stroke="none" />
      <circle cx="6.34" cy="17.66" r="1" fill={color} fillOpacity="0.45" stroke="none" />
      <circle cx="17.66" cy="6.34" r="1" fill={color} fillOpacity="0.45" stroke="none" />
    </Icon>
  );
}

export function BPLives({ size = 24, color = "#EF4444" }) {
  return (
    <Icon size={size} color={color}>
      <rect x="2" y="6" width="14" height="12" rx="3" fill={color} fillOpacity="0.13" />
      <rect x="2" y="6" width="14" height="12" rx="3" />
      <path d="M16 9.5l6-3v11l-6-3" fill={color} fillOpacity="0.13" />
      <path d="M16 9.5l6-3v11l-6-3" />
      <circle cx="7" cy="12" r="2" fill={color} fillOpacity="0.3" />
      <circle cx="7" cy="12" r="2" />
    </Icon>
  );
}

export function BPFormations({ size = 24, color = "#8B5CF6" }) {
  return (
    <Icon size={size} color={color}>
      <path d="M2 10l10-5 10 5-10 5z" fill={color} fillOpacity="0.15" />
      <path d="M2 10l10-5 10 5-10 5z" />
      <path d="M6.5 12.5v5c3 3 8 3 11 0v-5" />
      <line x1="22" y1="10" x2="22" y2="16" />
      <circle cx="22" cy="17" r="1.2" fill={color} fillOpacity="0.5" />
    </Icon>
  );
}

export function BPMonetisation({ size = 24, color = "var(--bp-primary)" }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="9.5" fill={color} fillOpacity="0.12" />
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 6v12" />
      <path d="M15.5 8.5H10a2.5 2.5 0 000 5h4a2.5 2.5 0 010 5H8" />
    </Icon>
  );
}

// ═══════════════════════════════════════════
// SECTION HEADER ICONS (small, 16px)
// ═══════════════════════════════════════════

export function BPSocialHeader({ size = 16, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M3 20.5c0-3.31 2.69-6 6-6" />
      <circle cx="17" cy="8" r="2.8" strokeOpacity="0.6" />
      <path d="M15 14.6c.6-.4 1.3-.6 2-.6 2.76 0 5 2.24 5 5" strokeOpacity="0.6" />
    </svg>
  );
}

export function BPBusinessHeader({ size = 16, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} fillOpacity="0.15"
      stroke={color} strokeWidth="2.2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <rect x="2" y="8" width="20" height="13" rx="2.5" />
      <path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" fill="none" />
      <line x1="2" y1="14" x2="22" y2="14" />
    </svg>
  );
}

export function BPFinanceHeader({ size = 16, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} fillOpacity="0.15"
      stroke={color} strokeWidth="2.2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <rect x="2" y="5.5" width="20" height="14" rx="2.5" />
      <line x1="2" y1="10.5" x2="22" y2="10.5" />
      <line x1="5" y1="15" x2="8" y2="15" />
    </svg>
  );
}

export function BPCreateurHeader({ size = 16, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
      fill={color} stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ═══════════════════════════════════════════
// QUICK ACTIONS BAR
// ═══════════════════════════════════════════

export function BPPublier({ size = 22, color = "var(--bp-primary)" }) {
  return (
    <Icon size={size} color={color}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        fill={color} fillOpacity="0.14" />
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </Icon>
  );
}

export function BPReel({ size = 22, color = "#EF4444" }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="9.5" fill={color} fillOpacity="0.1" />
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="3.5" fill={color} fillOpacity="0.25" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="4" r="1.2" fill={color} stroke="none" fillOpacity="0.7" />
      <circle cx="12" cy="20" r="1.2" fill={color} stroke="none" fillOpacity="0.7" />
      <circle cx="4" cy="12" r="1.2" fill={color} stroke="none" fillOpacity="0.7" />
      <circle cx="20" cy="12" r="1.2" fill={color} stroke="none" fillOpacity="0.7" />
    </Icon>
  );
}

export function BPProduit({ size = 22, color = "#F97316" }) {
  return (
    <Icon size={size} color={color}>
      <path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7L18 2z"
        fill={color} fillOpacity="0.14" />
      <path d="M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7L18 2z" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <path d="M16 11a4 4 0 01-8 0" />
    </Icon>
  );
}

export function BPService({ size = 22, color = "#3B82F6" }) {
  return (
    <Icon size={size} color={color}>
      <path d="M14.5 2.5a5 5 0 010 7.07l-10 10a2 2 0 01-2.83-2.83l10-10A5 5 0 0114.5 2.5z"
        fill={color} fillOpacity="0.13" />
      <path d="M14.5 2.5a5 5 0 010 7.07l-10 10a2 2 0 01-2.83-2.83l10-10A5 5 0 0114.5 2.5z" />
      <circle cx="19.5" cy="19.5" r="2" fill={color} fillOpacity="0.2" />
      <circle cx="19.5" cy="19.5" r="2" />
    </Icon>
  );
}

export function BPOffreEmploi({ size = 22, color = "#8B5CF6" }) {
  return (
    <Icon size={size} color={color}>
      <rect x="2" y="8" width="20" height="13" rx="2.5"
        fill={color} fillOpacity="0.14" />
      <rect x="2" y="8" width="20" height="13" rx="2.5" />
      <path d="M16 8V6a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="2" y1="14" x2="22" y2="14" />
    </Icon>
  );
}

// ═══════════════════════════════════════════
// HEADER ACTIONS
// ═══════════════════════════════════════════

export function BPSearch({ size = 18, color = "#0F172A" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <circle cx="11" cy="11" r="7.5" />
      <line x1="17" y1="17" x2="22" y2="22" />
    </svg>
  );
}

export function BPQR({ size = 18, color = "#0F172A" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={color} strokeWidth="2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="5" y="5" width="3" height="3" fill={color} stroke="none" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="16" y="5" width="3" height="3" fill={color} stroke="none" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="5" y="16" width="3" height="3" fill={color} stroke="none" />
      <line x1="14" y1="14" x2="14" y2="14.01" strokeWidth="3" />
      <line x1="18" y1="14" x2="18" y2="14.01" strokeWidth="3" />
      <line x1="21" y1="14" x2="21" y2="17" />
      <line x1="14" y1="17" x2="17" y2="17" />
      <line x1="14" y1="21" x2="17" y2="21" />
      <line x1="21" y1="19" x2="21" y2="21" />
      <line x1="19" y1="21" x2="21" y2="21" />
    </svg>
  );
}

export function BPBell({ size = 18, color = "#0F172A" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <path d="M5 10a7 7 0 0114 0v3l2 3H3l2-3v-3z" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  );
}

// ═══════════════════════════════════════════
// NAVIGATION BAR
// ═══════════════════════════════════════════

export function BPNavHome({ size = 24, active = false, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={active ? color : "#94A3B8"} strokeWidth="2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"
        fill={active ? color : "none"} fillOpacity={active ? "0.15" : "0"} />
    </svg>
  );
}

export function BPNavFriends({ size = 24, active = false, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={active ? color : "#94A3B8"} strokeWidth="2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <circle cx="9" cy="8" r="3.5" fill={active ? color : "none"} fillOpacity={active ? "0.15" : "0"} />
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 21c0-3.31 2.69-6 6-6s6 2.69 6 6" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export function BPNavMessages({ size = 24, active = false, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={active ? color : "#94A3B8"} strokeWidth="2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <path d="M4 3.5h16a2 2 0 012 2v10a2 2 0 01-2 2H8.8L5 21.5l-.5-4H4a2 2 0 01-2-2v-10a2 2 0 012-2z"
        fill={active ? color : "none"} fillOpacity={active ? "0.13" : "0"} />
      <path d="M4 3.5h16a2 2 0 012 2v10a2 2 0 01-2 2H8.8L5 21.5l-.5-4H4a2 2 0 01-2-2v-10a2 2 0 012-2z" />
    </svg>
  );
}

export function BPNavProfile({ size = 24, active = false, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={active ? color : "#94A3B8"} strokeWidth="2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <circle cx="12" cy="8" r="4" fill={active ? color : "none"} fillOpacity={active ? "0.15" : "0"} />
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8" />
    </svg>
  );
}

export function BPNavDiscover({ size = 24, active = false, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke={active ? color : "#94A3B8"} strokeWidth="2" strokeLinecap={CAP} strokeLinejoin={JOIN}>
      <circle cx="12" cy="12" r="9.5" fill={active ? color : "none"} fillOpacity={active ? "0.1" : "0"} />
      <circle cx="12" cy="12" r="9.5" />
      <path d="M16.5 7.5l-3.5 7-3.5 3.5 7-3.5 3.5-7z" fill={active ? color : "none"} fillOpacity={active ? "0.3" : "0"} />
      <path d="M16.5 7.5l-3.5 7-3.5 3.5 7-3.5 3.5-7z" />
    </svg>
  );
}

// ═══════════════════════════════════════════
// AUTRES (Settings, Verify, Premium…)
// ═══════════════════════════════════════════

export function BPSettings({ size = 22, color = "#64748B" }) {
  return (
    <Icon size={size} color={color}>
      <circle cx="12" cy="12" r="3.5" fill={color} fillOpacity="0.15" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </Icon>
  );
}

export function BPVerify({ size = 22, color = "var(--bp-primary)" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <circle cx="12" cy="12" r="10" fill={color} fillOpacity="0.15" stroke={color} strokeWidth={W} />
      <circle cx="12" cy="12" r="10" fill="none" stroke={color} strokeWidth={W} strokeLinecap={CAP} strokeLinejoin={JOIN} />
      <path d="M7.5 12l3 3 6-6" fill="none" stroke={color} strokeWidth={W} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    </svg>
  );
}

export function BPPremiumStar({ size = 22, color = "#EAB308" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        fill={color} fillOpacity="0.25" stroke={color} strokeWidth={W} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    </svg>
  );
}
