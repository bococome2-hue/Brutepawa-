const CACHE = "brutepawa-v20260815c";
const PRECACHE = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); } catch { data = { title: "Brute Pawa", body: e.data.text() }; }

  const title  = data.title || "Brute Pawa";
  const isCall = !!data.data?.callType;

  /* Augment the reply action with type:"text" + placeholder so Android Chrome
     shows an inline text field the user can type into without opening the app. */
  const actions = (data.actions || []).map((a) =>
    a.action === "reply"
      ? { ...a, type: "text", placeholder: "Votre message…" }
      : a
  );

  const options = {
    body:               data.body || "",
    /* Use sender avatar (proxied via same-origin /api/users/:id/avatar-icon).
       Falls back to app icon only if not provided. */
    icon:               data.icon || "/icons/icon-192.png",
    /* badge = tiny monochrome status-bar icon (white "b" on transparent) */
    badge:              data.badge || "/icons/badge-96.png",
    tag:                data.tag || "bp-notification",
    renotify:           true,
    requireInteraction: isCall ? true : (data.requireInteraction || false),
    data:               data.data || {},
    actions,
    vibrate:            isCall
                          ? [500, 200, 500, 200, 500, 200, 500]
                          : (data.vibrate || [200, 100, 200]),
    silent:             false,
  };

  /* ── Delivery receipt: call server as soon as push is received (app can be closed) ── */
  const deliveryPromise = (data.data?.deliveryToken && data.data?.msgId)
    ? fetch(self.location.origin + "/api/messages/sw-delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token:    data.data.deliveryToken,
          msgId:    data.data.msgId,
          toUserId: data.data.toUserId,
        }),
      }).catch(() => {})
    : Promise.resolve();

  e.waitUntil(Promise.all([
    self.registration.showNotification(title, options),
    deliveryPromise,
  ]));

  /* ── For calls: keep re-notifying every 4s while the notification persists ── */
  if (isCall) {
    let attempts = 0;
    const ring = setInterval(async () => {
      attempts++;
      if (attempts >= 5) { clearInterval(ring); return; }
      const openNotifs = await self.registration.getNotifications({ tag: "incoming-call" });
      if (!openNotifs.length) { clearInterval(ring); return; }
      await self.registration.showNotification(title, { ...options, renotify: true });
    }, 4000);
  }
});

/* Helper: close ALL open notifications from this app + clear badge */
function closeAllNotifications() {
  return self.registration.getNotifications().then((notifs) => {
    notifs.forEach((n) => n.close());
    if (self.navigator && self.navigator.clearAppBadge) {
      self.navigator.clearAppBadge().catch(() => {});
    }
  });
}

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const d      = e.notification.data || {};
  const action = e.action;
  const isCall = !!d.callType;

  /* ── Reject call ── */
  if (action === "reject") {
    if (d.rejectUrl) {
      fetch(d.rejectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: d.fromUserId, type: "call:reject", payload: {} }),
      }).catch(() => {});
    }
    e.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        const appClient = list.find((c) => c.url.startsWith(self.location.origin));
        if (appClient) appClient.postMessage({ type: "bp:call-rejected", data: d });
      })
    );
    return;
  }

  /* ── Accept call ── */
  if (action === "accept" && isCall) {
    const callData  = { fromUserId: d.fromUserId, callType: d.callType ?? "audio", callerName: d.callerName };
    const targetUrl = new URL(d.url || "/messages", self.location.origin).href;
    e.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        const appClient = list.find((c) => c.url.startsWith(self.location.origin));
        if (appClient) return appClient.focus().then((w) => w.postMessage({ type: "bp:incoming-call", data: callData }));
        return clients.openWindow(targetUrl).then((w) => {
          if (w) setTimeout(() => w.postMessage({ type: "bp:incoming-call", data: callData }), 1800);
        });
      })
    );
    return;
  }

  /* ── "Marquer comme lu" — ALWAYS silent, NEVER opens the app ─────────────────
     Even if the token is missing (race condition, restart, etc.), we return early
     rather than accidentally opening the conversation.                           */
  if (action === "mark_read") {
    if (d.markReadToken && d.fromUserId && d.toUserId) {
      e.waitUntil(
        fetch(self.location.origin + "/api/messages/sw-mark-read", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token:      d.markReadToken,
            fromUserId: d.fromUserId,
            toUserId:   d.toUserId,
          }),
        }).catch(() => {})
      );
    }
    /* Always return — never open the app for a "mark as read" action */
    return;
  }

  /* ── Répondre inline (Android Chrome 102+ / type:"text" action) ─────────────
     e.replyText contient le texte tapé directement dans la notification.
     Si disponible → envoi silencieux via API + confirmation toast.
     Si absent (bureau, navigateur non supporté) → ouvre l'application.          */
  if (action === "reply") {
    const text = e.replyText;

    if (text && text.trim() && d.replyToken && d.fromUserId && d.toUserId) {
      e.waitUntil(
        fetch(self.location.origin + "/api/messages/sw-reply", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token:      d.replyToken,
            fromUserId: d.fromUserId,
            toUserId:   d.toUserId,
            text:       text.trim(),
          }),
        })
          .then((r) => r.json())
          .then(() =>
            self.registration.showNotification("Message envoyé ✓", {
              body:    text.trim().slice(0, 80),
              icon:    d.senderAvatarUrl || "/icons/icon-192.png",
              badge:   "/icons/badge-96.svg",
              tag:     `reply-sent-${d.fromUserId}`,
              silent:  true,
              vibrate: [80],
            })
          )
          .catch(() => {})
      );
      return;   /* sent inline — don't open the app */
    }
    /* Fallback: browser doesn't support inline reply → open the conversation */
  }

  /* ── "Ouvrir le chat" action OR plain notification tap OR reply fallback ─── */
  const url = d.url || "/";

  e.waitUntil(
    Promise.all([
      closeAllNotifications(),
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
        const appClient = list.find((c) => c.url.startsWith(self.location.origin));

        if (appClient) {
          return appClient.focus().then((w) => {
            if (isCall) {
              w.postMessage({ type: "bp:incoming-call", data: d });
            } else {
              /* Naviguer vers la bonne conversation via le router SPA */
              w.postMessage({ type: "bp:navigate", data: { url } });
            }
          });
        }

        return clients.openWindow(new URL(url, self.location.origin).href).then((w) => {
          if (w && isCall) setTimeout(() => w.postMessage({ type: "bp:incoming-call", data: d }), 1500);
        });
      }),
    ])
  );
});
