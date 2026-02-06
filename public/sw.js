/**
 * COOPNAMA Service Worker
 * Handles Web Push notifications and offline caching.
 */

// eslint-disable-next-line no-undef
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    tag: data.tag || 'coopnama-notification',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Ver Turno' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  }

  event.waitUntil(
    // eslint-disable-next-line no-undef
    self.registration.showNotification(data.title || 'COOPNAMA Turnos', options)
  )
})

// eslint-disable-next-line no-undef
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const urlToOpen = event.notification.data?.url || '/mi-turno'

  event.waitUntil(
    // eslint-disable-next-line no-undef
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if found
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open new tab
      // eslint-disable-next-line no-undef
      return clients.openWindow(urlToOpen)
    })
  )
})

// eslint-disable-next-line no-undef
self.addEventListener('install', () => {
  // eslint-disable-next-line no-undef
  self.skipWaiting()
})

// eslint-disable-next-line no-undef
self.addEventListener('activate', (event) => {
  // eslint-disable-next-line no-undef
  event.waitUntil(self.clients.claim())
})
