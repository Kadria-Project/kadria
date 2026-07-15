self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = payload.title || 'Kadria';
  const options = {
    body: payload.body || 'Une information importante vous attend.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || 'kadria-notification',
    data: { url: typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/dashboard-v2' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/dashboard-v2', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((windowClient) => windowClient.url.startsWith(self.location.origin));
    return existing ? existing.focus().then(() => existing.navigate(target)) : clients.openWindow(target);
  }));
});
