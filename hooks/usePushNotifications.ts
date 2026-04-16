"use client";

import { useEffect, useState } from "react";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/notifications";
import { userApi } from "@/services/api";

export const usePushNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Registrar o Service Worker automaticamente
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((registration) => {
          console.log("Service Worker registrado com sucesso:", registration);
        })
        .catch((error) => {
          console.error("Falha ao registrar o Service Worker:", error);
        });
    }

    // Escutar eventos de foreground messages
    const setupForegroundListener = async () => {
      await onForegroundMessage((payload) => {
        console.log("Notificação recebida em foreground:", payload);
        // Aqui você pode disparar um toast (ex: react-hot-toast) ou custom UI
        if (payload.notification) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(payload.notification.title || "Nova mensagem", {
              body: payload.notification.body,
              icon: "/icon-192x192.png",
            });
          }
        }
      });
    };

    setupForegroundListener();

    // Lógica para detectar se o app pode ser instalado (PWA)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleRequestPermission = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      setFcmToken(token);
      console.log("FCM Token obtido:", token);
      try {
        await userApi.savePushToken(token);
        console.log("Token salvo no backend com sucesso");
      } catch (error) {
        console.error("Erro ao salvar token no backend:", error);
      }
    }
  };

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return {
    fcmToken,
    handleRequestPermission,
    isInstallable,
    promptInstall,
  };
};
