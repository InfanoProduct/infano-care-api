import { initializeApp, cert, App } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import fs from "fs/promises";
import path from "path";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

let firebaseApp: App | null = null;

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

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
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
      const message: Message = {
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
            channelId: "high_priority_channel",
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

      const response = await getMessaging(adminApp).send(message);
      logger.info({ response }, `Push notification sent to token successfully.`);
      return response;
    } catch (error: any) {
      // Handle the case where the token is no longer valid
      if (error.code === "messaging/registration-token-not-registered" || 
          error.code === "messaging/invalid-registration-token") {
        logger.warn(`FCM Token is invalid or expired. Cleaning up in database...`);
        try {
          const { prisma } = await import('../../db/client.js');
          await prisma.user.updateMany({
            where: { fcmToken },
            data: { fcmToken: null }
          });
          logger.info(`Successfully nullified invalid FCM token in database.`);
        } catch (dbErr) {
          logger.error({ err: dbErr }, "Failed to clean up invalid FCM token in database");
        }
      } else {
        logger.error({ err: error }, "Failed to send push notification");
      }
      return null;
    }
  }

  /**
   * Sends multicast push notifications to multiple FCM tokens in efficient parallel batches of up to 500 tokens.
   */
  static async sendMulticastNotification(fcmTokens: string[], payload: PushNotificationPayload) {
    const adminApp = await getFirebaseAdmin();
    if (!adminApp) {
      logger.warn("Skipping multicast push: Firebase not initialized.");
      return { successCount: 0, failureCount: 0 };
    }

    const validTokens = Array.from(new Set(fcmTokens.filter(Boolean)));
    if (validTokens.length === 0) return { successCount: 0, failureCount: 0 };

    const BATCH_SIZE = 500;
    let totalSuccess = 0;
    let totalFailure = 0;
    const tokensToClean: string[] = [];

    for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
      const batchTokens = validTokens.slice(i, i + BATCH_SIZE);
      try {
        const message = {
          tokens: batchTokens,
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
              channelId: "high_priority_channel",
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

        const batchResponse = await getMessaging(adminApp).sendEachForMulticast(message);
        totalSuccess += batchResponse.successCount;
        totalFailure += batchResponse.failureCount;

        // Check for any invalid tokens in this batch
        batchResponse.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errCode = resp.error.code;
            if (
              errCode === "messaging/registration-token-not-registered" ||
              errCode === "messaging/invalid-registration-token"
            ) {
              const token = batchTokens[idx];
              if (token) {
                tokensToClean.push(token);
              }
            }
          }
        });
      } catch (batchErr) {
        logger.error({ err: batchErr }, "Failed to send multicast batch");
      }
    }

    // Clean up all invalid tokens discovered across batches in a single DB query
    if (tokensToClean.length > 0) {
      try {
        const { prisma } = await import('../../db/client.js');
        await prisma.user.updateMany({
          where: { fcmToken: { in: tokensToClean } },
          data: { fcmToken: null }
        });
        logger.info(`Nullified ${tokensToClean.length} invalid FCM tokens after multicast send.`);
      } catch (cleanErr) {
        logger.error({ err: cleanErr }, "Failed to clean invalid multicast FCM tokens");
      }
    }

    logger.info({ totalSuccess, totalFailure, totalTokens: validTokens.length }, "Multicast push notification batch completed.");
    return { successCount: totalSuccess, failureCount: totalFailure };
  }
}

