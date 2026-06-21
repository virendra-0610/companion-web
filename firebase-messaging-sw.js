importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const APP_LINK = 'https://virendra-0610.github.io/companion-web/';
const ICON_PATH = '/companion-web/icons/Icon-192.png';

firebase.initializeApp({
  apiKey: "AIzaSyCvgQk98s3JIgTNgVDd3zNqBee8YbEep4s",
  authDomain: "companion-54a37.firebaseapp.com",
  projectId: "companion-54a37",
  storageBucket: "companion-54a37.firebasestorage.app",
  messagingSenderId: "912271580403",
  appId: "1:912271580403:web:2b439e27daf3d82baf6b86"
});

function safeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function parsePushPayload(event) {
  if (!event.data) return {};

  try {
    return event.data.json();
  } catch (error) {
    try {
      return { data: { body: event.data.text() } };
    } catch (_) {
      return {};
    }
  }
}

function notificationOptionsFromData(data, notification) {
  const body = safeString(data.body, safeString(notification?.body, ''));
  const url = safeString(data.url, APP_LINK);

  return {
    body,
    icon: ICON_PATH,
    badge: ICON_PATH,
    data: {
      url,
      ...data,
    },
  };
}

// Manual backend-display path.
// Backend messages set companionManualDisplay=true and are displayed here directly.
// This avoids relying on platform-specific Firebase auto-display behavior.
self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const data = payload.data || {};

  if (data.companionManualDisplay !== 'true') {
    return;
  }

  event.stopImmediatePropagation();

  const title = safeString(
    data.title,
    safeString(payload.notification?.title, 'Companion')
  );

  event.waitUntil(
    self.registration.showNotification(
      title,
      notificationOptionsFromData(data, payload.notification)
    )
  );
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};

  // Already handled by the raw push listener above.
  if (data.companionManualDisplay === 'true') {
    return;
  }

  // Firebase Console/browser notification payloads auto-display.
  // Returning here prevents duplicate notification banners.
  if (payload.notification) {
    console.log('[firebase-messaging-sw.js] Notification payload received. FCM/browser owns display.');
    return;
  }

  // Fallback for any future plain data-only message without companionManualDisplay.
  const title = safeString(data.title, 'Companion');
  self.registration.showNotification(title, notificationOptionsFromData(data, null));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || APP_LINK;

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

      return undefined;
    })
  );
});
