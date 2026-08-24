self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json()
      
      const options = {
        body: data.body,
        icon: data.icon || '/pwa-192x192.png',
        badge: '/favicon.svg',
        data: data.url || '/', // URL to open on click
        vibrate: [100, 50, 100],
      }
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'New Notification', options)
      )
    } catch (e) {
      console.error('Error parsing push data', e)
    }
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  
  if (event.notification.data) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data)
    )
  } else {
    event.waitUntil(
      self.clients.openWindow('/')
    )
  }
})
