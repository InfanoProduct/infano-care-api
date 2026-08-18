import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export interface SmsProvider {
  send(phone: string, otp: string, appHash?: string): Promise<void>;
  sendAlert(phone: string, message: string): Promise<void>;
}

// ─── Mock Provider (dev) ──────────────────────────────────────────────────────
class MockSmsProvider implements SmsProvider {
  async send(phone: string, otp: string, appHash?: string): Promise<void> {
    logger.info({ phone, otp, appHash }, `[SMS MOCK] OTP Generated: ${otp}. This code would be sent via SMS in production.`);
  }

  async sendAlert(phone: string, message: string): Promise<void> {
    logger.info({ phone, message }, `[SMS MOCK] Alert Generated: ${message}. This message would be sent via SMS in production.`);
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
    
    // Construct URL with optional appHash as a template variable if your template supports it
    // Most MSG91 templates use {#var#} for variables.
    let url = `https://api.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=${mobile}&authkey=${this.authKey}&otp=${otp}`;
    
    if (appHash) {
      // MSG91 allows passing extra variables. We'll assume the template has a variable for the hash.
      // This is a common pattern for Android SMS Retriever API.
      url += `&extra_param=${encodeURIComponent(JSON.stringify({ hash: appHash }))}`;
      logger.info({ phone, appHash }, "[SMS MSG91] App Hash included in request.");
    }

    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MSG91 OTP send failed: ${body}`);
    }
  }

  async sendAlert(phone: string, message: string): Promise<void> {
    const mobile = phone.replace("+", "");
    // Note: For MSG91, a different template or transactional route is usually needed for alerts.
    // For MVP/Demo we will assume a generic alert template exists or just log it if not configured.
    let url = `https://api.msg91.com/api/v5/flow?authkey=${this.authKey}&recipients=[{"mobiles":"${mobile}","message":"${encodeURIComponent(message)}"}]`;
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MSG91 Alert send failed: ${body}`);
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
    // Match the Airtel/Production style: <#> OTP is your code. [HASH]
    const messageBody = `<#> ${otp} is your Infano code. Please do not share this with anyone. ${appHash || ""}`;
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

  async sendAlert(phone: string, message: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: this.from,
      To:   phone,
      Body: message,
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
      throw new Error(`Twilio Alert send failed: ${errBody}`);
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
    const templateName = process.env.TWOFACTOR_OTP_TEMPLATE || "InfanoOTPMessage";
    const url = `https://2factor.in/API/V1/${this.apiKey}/SMS/${encodedPhone}/${otp}/${templateName}`;
    
    logger.info({ phone: encodedPhone, templateName }, `[SMS 2FACTOR] Sending OTP via 2Factor.in (${templateName})...`);
    
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

  async sendAlert(phone: string, message: string): Promise<void> {
    const mobile = phone.replace("+", "");
    const url = `https://2factor.in/API/V1/${this.apiKey}/ADDON_SERVICES/SEND/TSMS`;
    
    const body = new URLSearchParams({
      From: "INFANO",
      To: mobile,
      Msg: message,
      TemplateName: "InfanoSOSAlert"
    });
    
    try {
      const res = await fetch(url, { method: 'POST', body });
      const data = await res.json() as any;
      
      if (!res.ok || data.Status !== "Success") {
        logger.error({ phone: mobile, response: data }, `[SMS 2FACTOR] Failed to send Alert`);
        throw new Error(`2Factor Alert send failed: ${data.Details || res.statusText}`);
      }
      
      logger.info({ phone: mobile }, `[SMS 2FACTOR] Alert sent successfully via 2Factor.in`);
    } catch (error: any) {
      logger.error({ phone: mobile, error: error.message }, `[SMS 2FACTOR] Exception while sending Alert`);
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
