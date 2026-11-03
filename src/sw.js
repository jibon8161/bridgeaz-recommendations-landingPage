import { precacheAndRoute } from "workbox-precaching";
import { cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

/* =====================================================
   PWA
===================================================== */

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

/* =====================================================
   FIREBASE
===================================================== */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);

const messaging = getMessaging(firebaseApp);

/* =====================================================
   BACKGROUND PUSH NOTIFICATION
===================================================== */

onBackgroundMessage(messaging, (payload) => {
  console.log("[My Bridge] Background notification:", payload);

  const notificationTitle =
    payload.notification?.title || payload.data?.title || "My Bridge";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      "You have a new Bridge update.",

    icon: "/pwa-192x192.png",

    badge: "/pwa-192x192.png",

    data: {
      url: payload.data?.url || "/",
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/* =====================================================
   NOTIFICATION CLICK
===================================================== */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (
            "focus" in client &&
            new URL(client.url).origin === self.location.origin
          ) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return null;
      }),
  );
});
