// Service worker minimal de Carnet : il ne met rien en cache, il sert
// uniquement à afficher les notifications (obligatoire sur iPhone) et à
// rouvrir l'app quand on touche une notification.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => "focus" in f);
      if (ouverte) return ouverte.focus();
      return self.clients.openWindow("/");
    })
  );
});
