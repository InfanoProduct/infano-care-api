import {
  Client,
  Environment,
  LogLevel,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import { env, isProd } from "./env.js";
import { logger } from "./logger.js";

let _client: Client | null = null;

/**
 * Returns a lazily-initialized, singleton PayPal SDK client.
 * Uses Sandbox in development, Production in production — driven by NODE_ENV.
 */
export function getPaypalClient(): Client {
  if (!_client) {
    if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
      logger.warn("[PAYPAL] PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is not set — PayPal payments will fail");
    }
    _client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: env.PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || "",
        oAuthClientSecret: env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET || "",
      },
      environment: isProd ? Environment.Production : Environment.Sandbox,
      logging: {
        logLevel: isProd ? LogLevel.Warn : LogLevel.Info,
        logRequest: { logBody: !isProd },
        logResponse: { logHeaders: !isProd },
      },
    });
    logger.info(
      { environment: isProd ? "production" : "sandbox" },
      "[PAYPAL] Client initialized"
    );
  }
  return _client;
}

/**
 * Returns a fresh OrdersController bound to the singleton client.
 */
export function getPaypalOrdersController(): OrdersController {
  return new OrdersController(getPaypalClient());
}

/**
 * Base URL for PayPal REST API calls (used for webhook verification).
 */
export const PAYPAL_API_BASE = isProd
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

/**
 * Fetches a short-lived PayPal OAuth access token using client credentials.
 * Used internally for webhook signature verification (which isn't exposed via the SDK).
 */
export async function getPaypalAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${body}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}
