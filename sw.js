/* Onward — service worker minimal : il sert uniquement à afficher les notifications et à rouvrir l'appli quand on clique dessus.
   Il ne met rien en cache : le site reste toujours à jour. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var d = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    var c = cs[0];
    if (c) { c.postMessage({ type: 'open', data: d }); return c.focus(); }
    return self.clients.openWindow(self.registration.scope);
  }));
});
