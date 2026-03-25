// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyDRA6awM8paZhFQjGgL1-xtMln9B-BMG1s",
    authDomain: "push-notification-67790.firebaseapp.com",
    projectId: "push-notification-67790",
    storageBucket: "push-notification-67790.firebasestorage.app",
    messagingSenderId: "817249013929",
    appId: "1:817249013929:web:1e8400f8a5f798cb1819b8"
};

const app = initializeApp(firebaseConfig);

let messaging;
if (typeof window !== "undefined") {
    messaging = getMessaging(app);
}

const VAPID_KEY = "BIXkIm3i3mzrbtCh2-OCQZd0knBcO5769Jtkd5Y8N5TN4qmupK76Qt4EIybj56DbNOaFAaEPMo-AxZQuZ8Cgo0c";

export const requestForToken = async () => {
    try {
        let registration = null;
        if ('serviceWorker' in navigator) {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log("Service Worker successfully registered manually.");
        }

        const currentToken = await getToken(messaging, { 
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration 
        });

        if (currentToken) {
            console.log('Firebase Token Received:', currentToken);
            return currentToken;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        return null;
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            console.log("Foreground Message received: ", payload);
            resolve(payload);
        });
    });

export default messaging;