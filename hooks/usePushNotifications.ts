"use client";

import { useEffect, useState } from "react";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/notifications";
import { userApi } from "@/services/api";
import { toast } from "react-hot-toast";

export const usePushNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

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
        
        if (payload.notification) {
          const { title, body } = payload.notification;

          // 1. Mostrar Toast (UI interna)
          toast(title || "Nova mensagem", {
            description: body,
            icon: '💬',
            duration: 5000,
          } as any);

          // 2. Mostrar Notificação de Sistema (Banner)
          if ("Notification" in window && Notification.permission === "granted") {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(title || "Nova mensagem", {
                body: body,
                icon: "/icon-192x192.png",
                badge: "/icon-192x192.png",
                tag: 'mimo-foreground-notification',
                renotify: true
              });
            });
          }
        }
      });
    };

    setupForegroundListener();
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

  return {
    fcmToken,
    handleRequestPermission,
  };
};
