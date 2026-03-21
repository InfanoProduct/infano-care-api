import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/client.js";
import { redis } from "../../db/redis.js";
import { smsProvider } from "./sms.service.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { logger } from "../../config/logger.js";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "infano_access_secret_dev";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "infano_refresh_secret_dev";
const JWT_TEMP_SECRET = process.env.JWT_TEMP_SECRET || "infano_temp_secret_dev";

const OTP_TTL_SECONDS = 10 * 60;   // 10 min
const OTP_RATE_LIMIT = 3;         // max attempts per window
const OTP_RATE_WINDOW_SEC = 15 * 60;   // 15 min window
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";
const TEMP_TOKEN_TTL = "15m";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  // 4-digit OTP as per reference code random.Next(1000, 9999)
  return String(crypto.randomInt(1000, 9999));
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function computeContentTier(age: number): string {
  if (age < 13) return "JUNIOR";
  if (age < 16) return "TEEN_EARLY";
  if (age < 18) return "TEEN_LATE";
  return "ADULT";
}

function computeAge(birthMonth: number, birthYear: number): number {
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  // Adjust if birthday hasn't occurred yet this year
  if (now.getMonth() + 1 < birthMonth) age -= 1;
  return age;
}

function signAccessToken(payload: object): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function signRefreshToken(payload: object, jti: string): string {
  return jwt.sign({ ...payload, jti }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export class AuthService {
  // ── 1. Send OTP ─────────────────────────────────────────────────────────────
  static async sendOtp(phone: string): Promise<void> {
    // 1. Strict Validation (Match Reference Pattern: ^\+91\d{10}$)
    const pattern = /^\+91\d{10}$/;
    if (!pattern.test(phone)) {
      throw new AppError("Invalid mobile number. Please add +91", 400);
    }

    // 2. Rule 1: User Must Exist (Gated Access)
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, isTestNumber: true, otpSendOn: true, otpRetryCount: true }
    });

    if (!user) {
      throw new AppError("You Are Not Enrolled. Please Register and Enroll", 400);
    }

    // 3. Rule 2: Test Number -> Bypass OTP
    if (user.isTestNumber) {
      logger.info({ phone }, "Test number detected - bypassing OTP send");
      return;
    }

    // 4. Rule 3: Rate Limiting (1-minute cooldown + 3 retries in 24h)
    const now = new Date();
    if (user.otpSendOn) {
      const diffMs = now.getTime() - user.otpSendOn.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffMinutes <= 1) {
        throw new AppError("Please retry after 1 minute", 429);
      }

      if (user.otpRetryCount < 3) {
        // Increment retry count
        await prisma.user.update({
          where: { id: user.id },
          data: { otpSendOn: now, otpRetryCount: user.otpRetryCount + 1 }
        });
      } else if (diffHours > 24) {
        // Reset after 24 hours
        await prisma.user.update({
          where: { id: user.id },
          data: { otpSendOn: now, otpRetryCount: 1 }
        });
      } else {
        throw new AppError("Retry counts exceeded more than 3 attempts, please retry after 24 hours", 429);
      }
    } else {
      // First attempt
      await prisma.user.update({
        where: { id: user.id },
        data: { otpSendOn: now, otpRetryCount: 1 }
      });
    }

    // 5. Send OTP via 2Factor.in
    const otp = generateOtp();
    await smsProvider.send(phone, otp);

    // Also store in Redis cache for 'mock' fallback if needed, 
    // but the reference uses 2Factor's verify endpoint.
    // For now we store it just in case we need it, but 2Factor is primary.
    await redis.setex(`otp:${phone}`, OTP_TTL_SECONDS, hashOtp(otp));

    logger.info({ phone }, "OTP sent successfully");
  }

  // ── 2. Verify OTP ───────────────────────────────────────────────────────────
  static async verifyOtp(phone: string, otp: string): Promise<{ tempToken: string; isNewUser: boolean; onboardingStage: number; accountStatus: string; accessToken?: string; refreshToken?: string }> {
    const pattern = /^\+91\d{10}$/;
    if (!pattern.test(phone)) {
      throw new AppError("Invalid mobile number. Please add +91", 400);
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, isTestNumber: true, accountStatus: true, onboardingStage: true, contentTier: true }
    });

    if (!user) {
      throw new AppError("Invalid user", 400);
    }

    // 1. Test Number -> Direct Login Bypass (Skip OTP Verify)
    if (user.isTestNumber) {
      logger.info({ phone }, "Test number detected - bypassing OTP verification");
    } else {
      // 2. Real OTP Verification via 2Factor.in /VERIFY3
      const apiKey = process.env.TWOFACTOR_API_KEY || "29813cba-6fdc-11ef-8b17-0200cd936042";
      const verifyUrl = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY3/${phone}/${otp}`;

      // Fallback for mock mode
      if (process.env.SMS_PROVIDER === "mock") {
        const storedHash = await redis.get(`otp:${phone}`);
        if (!storedHash || storedHash !== hashOtp(otp)) {
          throw new AppError("Invalid OTP. Please try again.", 400);
        }
      } else {
        const res = await fetch(verifyUrl);
        const data = await res.json() as any;
        if (data.Status !== "Success") {
          throw new AppError("OTP Authentication failed. Please retry...", 400);
        }
      }
    }

    // OTP verified successfully (or bypassed for test)
    await prisma.user.update({
      where: { id: user.id },
      data: { otpRetryCount: 0 }
    });

    await redis.del(`otp:${phone}`);

    const isNewUser = user.accountStatus === "PENDING_SETUP";

    // Issue temp token for registration flow
    const tempToken = jwt.sign(
      { phone, userId: user.id },
      JWT_TEMP_SECRET,
      { expiresIn: TEMP_TOKEN_TTL },
    );

    return {
      tempToken,
      isNewUser,
      onboardingStage: user.onboardingStage,
      accountStatus: user.accountStatus
    };
  }

  // ── 3. Register ──────────────────────────────────────────────────────────────
  static async register(data: {
    tempToken: string;
    displayName: string;
    birthMonth: number;
    birthYear: number;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    marketingOptIn?: boolean;
    locale?: string;
    timezone?: string;
  }) {
    // Validate temp token
    let tokenPayload: { phone: string; userId: string | null };
    try {
      tokenPayload = jwt.verify(data.tempToken, JWT_TEMP_SECRET) as any;
    } catch {
      throw new AppError("Session expired. Please verify your phone number again.", 401);
    }

    if (!data.termsAccepted || !data.privacyAccepted) {
      throw new AppError("Terms and Privacy Policy must be accepted.", 400);
    }

    const { phone } = tokenPayload;
    const age = computeAge(data.birthMonth, data.birthYear);

    if (age < 6) {
      throw new AppError("Infano.Care is for girls aged 10 and up.", 400);
    }

    const contentTier = computeContentTier(age) as any;
    const coppaRequired = age < 13;

    // Upsert user (handles re-registration after abandoned onboarding)
    const user = await prisma.user.upsert({
      where: { phone },
      create: {
        phone,
        birthMonth: data.birthMonth,
        birthYear: data.birthYear,
        ageAtSignup: age,
        contentTier,
        accountStatus: coppaRequired ? "PENDING_CONSENT" : "PENDING_SETUP",
        coppaConsentRequired: coppaRequired,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        marketingOptIn: data.marketingOptIn ?? false,
        locale: data.locale ?? "en",
        timezone: data.timezone ?? "UTC",
        onboardingStage: 2,
        profile: {
          create: {
            displayName: data.displayName,
            totalPoints: 10, // points from Stage 1 name entry
          },
        },
      },
      update: {
        birthMonth: data.birthMonth,
        birthYear: data.birthYear,
        ageAtSignup: age,
        contentTier,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        marketingOptIn: data.marketingOptIn ?? false,
        locale: data.locale ?? "en",
        timezone: data.timezone ?? "UTC",
        onboardingStage: 2,
        profile: {
          upsert: {
            create: {
              displayName: data.displayName,
              totalPoints: 10,
            },
            update: {
              displayName: data.displayName,
            },
          },
        },
      },
      include: { profile: true },
    });

    const jti = crypto.randomUUID();
    const tokenPayloadBase = { sub: user.id, contentTier: user.contentTier, accountStatus: user.accountStatus, obStage: user.onboardingStage };

    const accessToken = signAccessToken(tokenPayloadBase);
    const refreshToken = signRefreshToken(tokenPayloadBase, jti);

    // Store refresh token in Redis (blacklist pattern — store jti)
    await redis.setex(`rt:${jti}`, 30 * 24 * 60 * 60, user.id);

    return {
      userId: user.id,
      accessToken,
      refreshToken,
      onboardingStage: user.onboardingStage,
      coppaConsentRequired: user.coppaConsentRequired,
      initialPoints: user.profile?.totalPoints ?? 10,
    };
  }

  // ── 4. Refresh ───────────────────────────────────────────────────────────────
  static async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      throw new AppError("Invalid or expired refresh token.", 401);
    }

    const { jti, sub } = payload;

    // Check not blacklisted
    const stored = await redis.get(`rt:${jti}`);
    if (!stored) {
      throw new AppError("Refresh token revoked.", 401);
    }

    // Blacklist old token
    await redis.del(`rt:${jti}`);

    const user = await prisma.user.findUnique({ where: { id: sub }, select: { id: true, contentTier: true, accountStatus: true, onboardingStage: true } });
    if (!user) throw new AppError("User not found.", 404);

    const newJti = crypto.randomUUID();
    const tokenPayloadBase = { sub: user.id, contentTier: user.contentTier, accountStatus: user.accountStatus, obStage: user.onboardingStage };
    const newAccess = signAccessToken(tokenPayloadBase);
    const newRefresh = signRefreshToken(tokenPayloadBase, newJti);

    await redis.setex(`rt:${newJti}`, 30 * 24 * 60 * 60, user.id);

    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  // ── 5. Logout ────────────────────────────────────────────────────────────────
  static async logout(refreshToken: string) {
    try {
      const payload: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      await redis.del(`rt:${payload.jti}`);
    } catch {
      // Already expired — treat as success
    }
  }

  // ── 6. Login (returning user — phone already verified via verifyOtp) ──────────
  static async login(tempToken: string) {
    let tokenPayload: { phone: string; userId: string | null };
    try {
      tokenPayload = jwt.verify(tempToken, JWT_TEMP_SECRET) as any;
    } catch {
      throw new AppError("Session expired. Please verify your phone number again.", 401);
    }

    const user = await prisma.user.findUnique({
      where: { phone: tokenPayload.phone },
      select: { id: true, contentTier: true, accountStatus: true, onboardingStage: true },
    });

    if (!user) {
      throw new AppError("User not found. Please register first.", 404);
    }

    const allowedStatuses = ["ACTIVE", "ACTIVE_MINOR", "PENDING_SETUP", "PENDING_CONSENT"];
    if (!allowedStatuses.includes(user.accountStatus)) {
      throw new AppError("Account is suspended or deleted.", 403);
    }

    const jti = crypto.randomUUID();
    const tokenPayloadBase = {
      sub: user.id,
      contentTier: user.contentTier,
      accountStatus: user.accountStatus,
      obStage: user.onboardingStage,
    };

    const accessToken = signAccessToken(tokenPayloadBase);
    const refreshToken = signRefreshToken(tokenPayloadBase, jti);

    await redis.setex(`rt:${jti}`, 30 * 24 * 60 * 60, user.id);

    logger.info({ userId: user.id }, "Returning user login");

    return {
      userId: user.id,
      accessToken,
      refreshToken,
      onboardingStage: user.onboardingStage,
    };
  }
}
