// brics-event-frontend/public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDRA6awM8paZhFQjGgL1-xtMln9B-BMG1s",
  authDomain: "push-notification-67790.firebaseapp.com",
  projectId: "push-notification-67790",
  storageBucket: "push-notification-67790.firebasestorage.app",
  messagingSenderId: "817249013929",
  appId: "1:817249013929:web:1e8400f8a5f798cb1819b8",
  measurementId: "G-0WY88MS862"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[Service Worker] Received background message: ", payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "https://d3aipd12f5sbt0.cloudfront.net/wp-content/uploads/2026/01/12172450/brics-logo.jpeg" 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});