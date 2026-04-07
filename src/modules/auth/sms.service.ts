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
}

// ─── 2Factor.in Provider ──────────────────────────────────────────────────────
class TwoFactorSmsProvider implements SmsProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.TWOFACTOR_API_KEY || "";
  }

  async send(phone: string, otp: string, appHash?: string): Promise<void> {
    // 2Factor.in expects the phone number with prefix (e.g. 919876543210), usually without the '+' for the SMS URL
    const mobile = phone.replace("+", "");
    const encodedPhone = encodeURIComponent(mobile);
    
    // URL format: https://2factor.in/API/V1/{api_key}/SMS/{phone}/{otp}/{template}
    // Note: To include the hash and <#> prefix, the dashboard template 'InfanoOTPMessage' must be updated.
    // Recommended Template: "<#> Your OTP is {otp}. {hash}"
    let url = `https://2factor.in/API/V1/${this.apiKey}/SMS/${encodedPhone}/${otp}/InfanoOTPMessage`;
    
    if (appHash) {
      // Pass the hash as an extra variable (template dependent)
      url += `?var1=${encodeURIComponent(appHash)}`;
      logger.info({ phone: encodedPhone, appHash }, `[SMS 2FACTOR] Sending OTP with appHash (and expected <#> prefix in template) via 2Factor.in...`);
    } else {
      logger.info({ phone: encodedPhone }, `[SMS 2FACTOR] Sending OTP via 2Factor.in...`);
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
