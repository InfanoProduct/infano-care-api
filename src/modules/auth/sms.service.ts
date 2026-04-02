import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface SmsProvider {
  send(phone: string, otp: string, appHash?: string): Promise<void>;
}

// ─── Mock Provider (dev) ──────────────────────────────────────────────────────
class MockSmsProvider implements SmsProvider {
  async send(phone: string, otp: string, appHash?: string): Promise<void> {
    logger.info({ phone, appHash }, `[SMS MOCK] OTP generated and would be sent in production.`);
  }
}

// ─── MSG91 Provider ───────────────────────────────────────────────────────────
class Msg91SmsProvider implements SmsProvider {
  private authKey: string;
  private templateId: string;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || "";
    this.templateId = process.env.MSG91_TEMPLATE_ID || "";
  }

  async send(phone: string, otp: string, appHash?: string): Promise<void> {
    // Remove + prefix, MSG91 uses country-code prefixed numbers without +
    const mobile = phone.replace("+", "");
    // Note: To use App Hash with MSG91, it usually needs to be part of the template body or passed as a separate param if supported.
    const url = `https://api.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=${mobile}&authkey=${this.authKey}&otp=${otp}`;
    
    if (appHash) {
      logger.info({ phone, appHash }, "[SMS MSG91] App Hash provided. Ensure your template contains {#var#} at the end for the hash.");
    }

    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MSG91 OTP send failed: ${body}`);
    }
  }
}

// ─── Twilio Provider ──────────────────────────────────────────────────────────
class TwilioSmsProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private from: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken  = process.env.TWILIO_AUTH_TOKEN || "";
    this.from       = process.env.TWILIO_FROM_NUMBER || "";
  }

  async send(phone: string, otp: string, appHash?: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const messageBody = `Your Infano.Care OTP is ${otp}. Valid for 10 minutes. Do not share this code.${appHash ? " " + appHash : ""}`;
    const body = new URLSearchParams({
      From: this.from,
      To:   phone,
      Body: messageBody,
    });
    const res = await fetch(url, {
      method:  "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Twilio OTP send failed: ${errBody}`);
    }
  }
}

// ─── 2Factor.in Provider ──────────────────────────────────────────────────────
class TwoFactorSmsProvider implements SmsProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TWOFACTOR_API_KEY || "";
  }

  async send(phone: string, otp: string, appHash?: string): Promise<void> {
    // 2Factor.in expects the phone number with prefix (e.g. +91), encoded for URL
    const encodedPhone = encodeURIComponent(phone);
    // URL format: https://2factor.in/API/V1/{api_key}/SMS/{phone}/{otp}/{template}
    const url = `https://2factor.in/API/V1/${this.apiKey}/SMS/${encodedPhone}/${otp}/InfanoOTPMessage`;
    
    logger.info({ phone: encodedPhone, appHash }, `[SMS 2FACTOR] Sending OTP via 2Factor.in...`);
    if (appHash) {
      logger.info(`[SMS 2FACTOR] 💡 TIP: Add ${appHash} to the end of your 'InfanoOTPMessage' template on 2Factor dashboard for completely silent Auto-OTP.`);
    }
    
    try {
      const res = await fetch(url);
      const data = await res.json() as any;
      
      if (!res.ok || data.Status !== "Success") {
        logger.error({ phone: encodedPhone, response: data }, `[SMS 2FACTOR] Failed to send OTP`);
        throw new Error(`2Factor OTP send failed: ${data.Details || res.statusText}`);
      }
      
      logger.info({ phone: encodedPhone, sessionId: data.Details }, `[SMS 2FACTOR] OTP sent successfully via 2Factor.in`);
    } catch (error: any) {
      logger.error({ phone: encodedPhone, error: error.message }, `[SMS 2FACTOR] Exception while sending OTP`);
      throw error;
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
function createProvider(): SmsProvider {
  const provider = (process.env.SMS_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "msg91":  return new Msg91SmsProvider();
    case "twilio": return new TwilioSmsProvider();
    case "twofactor": return new TwoFactorSmsProvider();
    default:       return new MockSmsProvider();
  }
}

export const smsProvider: SmsProvider = createProvider();
