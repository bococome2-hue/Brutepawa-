import { useEffect, useState, useRef } from "react";

export default function TopLoadingBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (doneRef.current)  clearTimeout(doneRef.current);
  };

  const start = () => {
    clear();
    setProgress(0);
    setVisible(true);
    // jump to 20% immediately, then ease to 80%
    requestAnimationFrame(() => {
      setProgress(20);
      timerRef.current = setTimeout(() => setProgress(80), 50);
    });
    // auto-complete after 700 ms (covers most fast navigations)
    doneRef.current = setTimeout(finish, 700);
  };

  const finish = () => {
    clear();
    setProgress(100);
    // hide after transition completes
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  };

  useEffect(() => {
    const onNavigate = () => start();
    window.addEventListener("bp:navigate", onNavigate);
    return () => window.removeEventListener("bp:navigate", onNavigate);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position:   "fixed",
        top:        0,
        left:       0,
        width:      `${progress}%`,
        height:     3,
        background: "var(--bp-primary)",
        zIndex:     99999,
        transition: progress === 100 ? "width 0.2s ease-out, opacity 0.2s ease-out" : "width 0.4s ease-out",
        boxShadow:  "0 0 6px rgba(24,119,242,0.6)",
        borderRadius: "0 2px 2px 0",
        pointerEvents: "none",
      }}
    />
  );
}
