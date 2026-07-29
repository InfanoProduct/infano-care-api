import { logger } from "../../config/logger.js";
import { normalizePhone } from "../utils/phone.js";

interface SendTemplateResponse {
  success?: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Generic helper to send a template message via WhatsApp Panel API
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  templateParams: string[]
): Promise<SendTemplateResponse | null> {
  try {
    if (!phone) {
      logger.warn("[WHATSAPP] Phone number not provided, skipping WhatsApp trigger.");
      return null;
    }

    const apiKey = process.env.WHATSAPP_API_KEY;
    const sessionId = process.env.WHATSAPP_SESSION_ID;

    // Check if configuration is available
    if (!apiKey || !sessionId || apiKey.includes("your_whatsapp_api_key_here") || sessionId.includes("your_whatsapp_session_id_here")) {
      logger.warn(
        { templateName, to: phone },
        "[WHATSAPP] WhatsApp credentials not configured or placeholder detected in environment variables. Trigger skipped."
      );
      return null;
    }

    // Normalize phone number to country code format (without leading +)
    const normalized = normalizePhone(phone);
    const cleanPhone = normalized.replace(/^\+/, "");

    const baseUrl = process.env.WHATSAPP_BASE_URL || "https://wa.optimml.com";
    const url = `${baseUrl}/api/project/v1/messages/send-template`;
    const payload = {
      sessionId,
      to: cleanPhone,
      templateName,
      languageCode: "en",
      templateParams,
    };

    logger.info({ to: cleanPhone, templateName, templateParams }, "[WHATSAPP] Sending template message request");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, statusText: response.statusText, error: errorText, templateName },
        "[WHATSAPP] Failed to send template message via WhatsApp API"
      );
      return { success: false, error: errorText };
    }

    const data = await response.json() as any;
    logger.info({ data, templateName }, "[WHATSAPP] Template message sent successfully");
    return { success: true, messageId: data?.messageId || data?.id };
  } catch (error: any) {
    logger.error({ error, templateName }, "[WHATSAPP] Exception occurred while sending WhatsApp message");
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * Trigger WhatsApp notification for Order Confirmation
 */
export async function sendOrderConfirmationWhatsApp(
  phone: string,
  data: {
    customerName: string;
    orderId: string;
    bookTitle: string;
    address: string;
  }
) {
  const templateName = process.env.WHATSAPP_TEMPLATE_ORDER_CONFIRMATION || "order_confirmation";
  const params = [
    data.customerName || "Customer",
    data.orderId,
    data.bookTitle,
    data.address,
  ];
  return sendWhatsAppTemplate(phone, templateName, params);
}

/**
 * Trigger WhatsApp notification for Shipped Order
 */
export async function sendOrderShippedWhatsApp(
  phone: string,
  data: {
    customerName: string;
    orderId: string;
    trackUrl: string;
    deliveryDate: string;
  }
) {
  const templateName = process.env.WHATSAPP_TEMPLATE_ORDER_SHIPPED || "order_shipped";
  const params = [
    data.customerName || "Customer",
    data.orderId,
    data.trackUrl || "https://infano.care/login",
    data.deliveryDate,
  ];
  return sendWhatsAppTemplate(phone, templateName, params);
}

/**
 * Trigger WhatsApp notification for Delivered Order
 */
export async function sendOrderDeliveredWhatsApp(
  phone: string,
  data: {
    customerName: string;
    orderId: string;
    feedbackUrl: string;
  }
) {
  const templateName = process.env.WHATSAPP_TEMPLATE_ORDER_DELIVERED || "order_delivered";
  const params = [
    data.customerName || "Customer",
    data.orderId,
    data.feedbackUrl || "https://infano.care/store/track",
  ];
  return sendWhatsAppTemplate(phone, templateName, params);
}
