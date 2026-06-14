importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCvgQk98s3JIgTNgVDd3zNqBee8YbEep4s",
  authDomain: "companion-54a37.firebaseapp.com",
  projectId: "companion-54a37",
  storageBucket: "companion-54a37.firebasestorage.app",
  messagingSenderId: "912271580403",
  appId: "1:912271580403:web:2b439e27daf3d82baf6b86"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};

  const title = data.title || 'Companion';
  const body = data.body || '';

  self.registration.showNotification(title, {
    body,
    icon: '/companion-web/icons/Icon-192.png',
    badge: '/companion-web/icons/Icon-192.png',
    data: {
      url: 'https://virendra-0610.github.io/companion-web/',
      ...data,
    },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    event.notification.data?.url ||
    'https://virendra-0610.github.io/companion-web/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/companion-web/') && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});