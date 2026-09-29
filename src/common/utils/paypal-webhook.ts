import { env, isProd } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { getPaypalAccessToken, PAYPAL_API_BASE } from "../../config/paypal.js";

/**
 * Verifies a PayPal webhook signature by calling PayPal's
 * /v1/notifications/verify-webhook-signature REST endpoint.
 *
 * PayPal does NOT expose a simple shared secret — it uses an asymmetric
 * scheme that requires calling their API to validate. The raw Buffer is
 * required because the verification includes the raw body bytes.
 *
 * In development, if PAYPAL_WEBHOOK_ID is not set, verification is skipped
 * and a warning is logged. In production, missing PAYPAL_WEBHOOK_ID is fatal.
 */
export async function verifyPaypalWebhookSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
  if (!env.PAYPAL_WEBHOOK_ID) {
    if (isProd) {
      logger.error("[PAYPAL_WEBHOOK] PAYPAL_WEBHOOK_ID not set in production — rejecting webhook");
      return false;
    }
    // Development: skip verification but warn loudly
    logger.warn(
      "[PAYPAL_WEBHOOK] PAYPAL_WEBHOOK_ID not configured — skipping signature verification (DEV only). " +
      "Set PAYPAL_WEBHOOK_ID after registering the webhook URL in PayPal Developer Dashboard."
    );
    return true;
  }

  const getHeader = (name: string): string => {
    const val = headers[name.toLowerCase()];
    return Array.isArray(val) ? val[0] ?? "" : val ?? "";
  };

  const transmissionId = getHeader("paypal-transmission-id");
  const transmissionTime = getHeader("paypal-transmission-time");
  const certUrl = getHeader("paypal-cert-url");
  const authAlgo = getHeader("paypal-auth-algo");
  const transmissionSig = getHeader("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    logger.warn(
      { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig },
      "[PAYPAL_WEBHOOK] Missing required PayPal signature headers"
    );
    return false;
  }

  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(rawBody.toString("utf8"));
  } catch {
    logger.warn("[PAYPAL_WEBHOOK] Failed to parse raw body as JSON for signature verification");
    return false;
  }

  try {
    const accessToken = await getPaypalAccessToken();

    const res = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: env.PAYPAL_WEBHOOK_ID,
          webhook_event: webhookEvent,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { status: res.status, body: text },
        "[PAYPAL_WEBHOOK] Signature verification API returned error"
      );
      return false;
    }

    const result = await res.json() as { verification_status: string };
    const isValid = result.verification_status === "SUCCESS";

    if (!isValid) {
      logger.warn(
        { verificationStatus: result.verification_status },
        "[PAYPAL_WEBHOOK] Signature verification failed"
      );
    }

    return isValid;
  } catch (err) {
    logger.error({ err }, "[PAYPAL_WEBHOOK] Error calling PayPal signature verification API");
    // In production, fail closed (reject). In dev, allow through.
    return !isProd;
  }
}
