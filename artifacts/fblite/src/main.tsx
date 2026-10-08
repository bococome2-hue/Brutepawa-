import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/* ── Bloquer menus natifs Android / navigateur ── */
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("selectstart", e => e.preventDefault());

if ("serviceWorker" in navigator) {
  /* Recharge automatiquement la page quand un nouveau service worker prend
     le contrôle (mise à jour publiée), sauf lors de la toute 1ère install. */
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return;
    reloaded = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL ?? "/";
    const swUrl = base.endsWith("/") ? `${base}sw.js` : `${base}/sw.js`;
    navigator.serviceWorker
      .register(swUrl, { scope: base })
      .then((reg) => {
        console.log("[SW] Enregistré — scope:", reg.scope);
        /* Vérifie une mise à jour immédiatement, à chaque retour au
           premier plan, et toutes les 30 minutes. */
        const check = () => reg.update().catch(() => {});
        check();
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") check();
        });
        setInterval(check, 30 * 60 * 1000);
      })
      .catch((err) => {
        console.warn("[SW] Échec enregistrement:", err);
      });
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    const { type, data } = event.data ?? {};
    if (type === "bp:navigate" && data?.url) {
      /* Use pushState + popstate so the SPA router updates without a full reload */
      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      window.history.pushState(null, "", base + data.url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    if (type === "bp:incoming-call" && data) {
      window.dispatchEvent(new CustomEvent("bp:sw-call", { detail: data }));
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
