import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDcnCEQkV9iPsLkOtMe9LxlXISctjMlYuA",
  authDomain: "mimo-5b0a7.firebaseapp.com",
  projectId: "mimo-5b0a7",
  storageBucket: "mimo-5b0a7.firebasestorage.app",
  messagingSenderId: "777102504183",
  appId: "1:777102504183:web:e6ae0f3127620e48a6a3f2",
  measurementId: "G-PCJZKG6PGL"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const messaging = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};

export { app };
