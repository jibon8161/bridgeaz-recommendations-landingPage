import { getToken } from "firebase/messaging";
import { auth, messaging } from "./firebase";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://bridgeaz-recommendations-server.vercel.app";

const getDeviceType = () => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "iPhone / iPad";
  }

  if (/android/.test(userAgent)) {
    return "Android";
  }

  return "Desktop";
};

const getBrowser = () => {
  const userAgent = navigator.userAgent;

  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("Chrome/")) return "Chrome";
  if (userAgent.includes("Firefox/")) return "Firefox";
  if (userAgent.includes("Safari/")) return "Safari";

  return "Unknown";
};

export const enableBridgeNotifications = async () => {
  try {
    const user = auth.currentUser;

    if (!user) {
      return {
        success: false,
        error: "User is not logged in.",
      };
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return {
        success: false,
        permission,
        token: null,
      };
    }

    // Use the existing My Bridge PWA service worker
    const serviceWorkerRegistration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration,
    });

    if (!token) {
      return {
        success: false,
        permission,
        token: null,
      };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${API_BASE}/api/auth/push-device`, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        token,
        deviceType: getDeviceType(),
        browser: getBrowser(),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error("Push device save failed:", data);

      return {
        success: false,
        permission,
        token,
        error: data.error || "Could not save push device.",
      };
    }

    console.log("Push notifications enabled:", data);

    return {
      success: true,
      permission,
      token,
      device: data,
    };
  } catch (error) {
    console.error("Notification setup failed:", error);

    return {
      success: false,
      permission: Notification.permission,
      token: null,
      error,
    };
  }
};
