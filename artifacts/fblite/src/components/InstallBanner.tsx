import { useState, useEffect, useRef } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

const AUTO_DISMISS_SEC = 30;

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible]   = useState(false);
  const [ios, setIos]           = useState(false);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SEC);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    setIos(isIos());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const show = setTimeout(() => setVisible(true), 800);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(show);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    setCountdown(AUTO_DISMISS_SEC);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          dismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (dismissRef.current) clearTimeout(dismissRef.current);
    };
  }, [visible]);

  const dismiss = () => {
    if (timerRef.current)  clearInterval(timerRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);
    setVisible(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") { dismiss(); return; }
    }
    dismiss();
  };

  if (!visible) return null;

  const pct = (countdown / AUTO_DISMISS_SEC) * 100;

  return (
    <div style={{
      position: "fixed", bottom: 60, left: 0, right: 0, zIndex: 9999,
      background: "var(--theme-surface)",
      borderTop: "1px solid #E5E7EB",
      boxShadow: "0 -3px 16px rgba(0,0,0,0.13)",
      fontFamily: "Inter, sans-serif",
    }}>
      {/* Countdown progress bar */}
      <div style={{ height: 3, background: "#E5E7EB", position: "relative" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`,
          background: "linear-gradient(90deg,var(--bp-primary),var(--bp-primary))",
          transition: "width 1s linear",
          borderRadius: "0 2px 2px 0",
        }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        {/* BP icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(22,194,74,0.4)",
        }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 13, letterSpacing: -0.5, fontStyle: "italic" }}>BP</span>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", lineHeight: 1.3 }}>
            Brute Pawa — Application
          </div>
          {ios && !deferredPrompt ? (
            <div style={{ fontSize: 11.5, color: "#606770", marginTop: 2, lineHeight: 1.4 }}>
              Appuyez sur <strong style={{ fontSize: 13 }}>⬆</strong> → <strong>Ajouter à l'écran d'accueil</strong>
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: "#606770", marginTop: 2, lineHeight: 1.4 }}>
              Profitez de la meilleure expérience dans l'application
            </div>
          )}
        </div>

        {/* Install button */}
        {deferredPrompt ? (
          <button onClick={install} style={{
            background: "var(--bp-primary)", color: "#fff", border: "none",
            borderRadius: 7, padding: "8px 14px",
            fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            flexShrink: 0, whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(22,194,74,0.4)",
          }}>
            Installer
          </button>
        ) : !ios && (
          <button onClick={dismiss} style={{
            background: "var(--bp-primary)", color: "#fff", border: "none",
            borderRadius: 7, padding: "8px 14px",
            fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            flexShrink: 0, whiteSpace: "nowrap",
          }}>
            Ouvrir
          </button>
        )}

        {/* Close × + countdown */}
        <button onClick={dismiss} aria-label="Fermer" style={{
          background: "rgba(0,0,0,0.07)", border: "none",
          borderRadius: "50%", width: 28, height: 28,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, position: "relative",
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#606770" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
          {/* Tiny countdown number */}
          <span style={{
            position: "absolute", top: -8, right: -6,
            background: "var(--bp-primary)", color: "#fff",
            borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>{countdown}</span>
        </button>
      </div>
    </div>
  );
}
