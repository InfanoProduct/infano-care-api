import admin from "firebase-admin";
import fs from "fs/promises";
import path from "path";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

let firebaseApp: admin.app.App | null = null;

/**
 * Initializes the Firebase Admin SDK if not already initialized.
 */
async function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  try {
    // 1. Check for JSON string in ENV (Best for Cloud/Remote)
    let serviceAccount;
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
      logger.info("Loaded Firebase credentials from FIREBASE_SERVICE_ACCOUNT_JSON env variable.");
    } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // 2. Check for manual path in ENV 
      serviceAccount = JSON.parse(await fs.readFile(env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
      logger.info(`Loaded Firebase credentials from path: ${env.FIREBASE_SERVICE_ACCOUNT_PATH}`);
    } else {
      // 3. Default location: /config/firebase-service-account.json
      const defaultPath = path.resolve(process.cwd(), "config", "firebase-service-account.json");
      try {
        serviceAccount = JSON.parse(await fs.readFile(defaultPath, "utf8"));
        logger.info(`Loaded Firebase credentials from default path: ${defaultPath}`);
      } catch (err) {
        logger.warn(`Firebase credentials NOT found. Push notifications will be disabled.`);
        return null;
      }
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info("Firebase Admin SDK initialized successfully.");
    return firebaseApp;
  } catch (error) {
    logger.error({ err: error }, "Failed to initialize Firebase Admin SDK");
    return null;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, string>;
}

export class FirebaseService {
  /**
   * Sends a push notification to a specific FCM token.
   */
  static async sendPushNotification(fcmToken: string, payload: PushNotificationPayload) {
    const adminApp = await getFirebaseAdmin();
    if (!adminApp) {
      logger.warn("Skipping push notification: Firebase not initialized.");
      return;
    }

    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          ...payload.data,
          deepLink: payload.deepLink || "",
        },
        android: {
          notification: {
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
            channelId: "high_priority",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      const response = await adminApp.messaging().send(message);
      logger.info({ response }, `Push notification sent to token successfully.`);
      return response;
    } catch (error: any) {
      // Handle the case where the token is no longer valid
      if (error.code === "messaging/registration-token-not-registered" || 
          error.code === "messaging/invalid-registration-token") {
        logger.warn(`FCM Token is invalid or expired. Consider removing it from the user profile.`);
      } else {
        logger.error({ err: error }, "Failed to send push notification");
      }
      return null;
    }
  }
}
