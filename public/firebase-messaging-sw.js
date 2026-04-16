importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDcnCEQkV9iPsLkOtMe9LxlXISctjMlYuA",
  authDomain: "mimo-5b0a7.firebaseapp.com",
  projectId: "mimo-5b0a7",
  storageBucket: "mimo-5b0a7.firebasestorage.app",
  messagingSenderId: "777102504183",
  appId: "1:777102504183:web:e6ae0f3127620e48a6a3f2",
  measurementId: "G-PCJZKG6PGL"
});

const messaging = firebase.messaging();

// Hook para receber mensagens em background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Nova mensagem Mimo';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Listener para instalar o SW imediatamente (PWA)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener de fetch vazio para satisfazer critérios de instalação do PWA (PWA Installability)
self.addEventListener('fetch', (event) => {
  // Poderia ser usado para cache offline, mas por enquanto apenas para habilitar instalação
});
