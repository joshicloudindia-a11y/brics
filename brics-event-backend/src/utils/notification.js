// brics-event-backend/src/utils/notification.js

import admin from "firebase-admin";
import serviceAccount from "../config/serviceAccountKey.json" with { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const sendPushNotification = async (token, title, body) => {
  if (!token) {
    console.warn("⚠️ No FCM token provided. Skipping notification.");
    return { success: false, error: "No token provided" };
  }

  const message = {
    notification: { 
      title: title, 
      body: body 
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("✅ Firebase Push Notification Sent Successfully:", response);
    return { success: true, response };
  } catch (error) {
    console.error("❌ Firebase Push Error Details:", error.message || error);
    throw error; 
  }
};