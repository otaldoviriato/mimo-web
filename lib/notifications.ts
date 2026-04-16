import { messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";

const VAPID_KEY = "BGusb3U7P9HAoIiZksBteEjThFTl4KYFawJQPvn1Mb8XqY0J_J_Wz74soTGcCCRDAG1sZUgE8lQXc0gv_ZyWmTs";

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const msg = await messaging();
      if (!msg) return null;
      
      const token = await getToken(msg, { vapidKey: VAPID_KEY });
      return token;
    } else {
      console.warn("Notification permission denied");
      return null;
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
};

export const onForegroundMessage = async (callback: (payload: any) => void) => {
  const msg = await messaging();
  if (msg) {
    return onMessage(msg, (payload) => {
      callback(payload);
    });
  }
  return () => {};
};
