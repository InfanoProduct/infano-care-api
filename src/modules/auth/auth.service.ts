import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/client.js";
import { redis } from "../../db/redis.js";
import { smsProvider } from "./sms.service.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { logger } from "../../config/logger.js";

const JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || "infano_access_secret_dev";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "infano_refresh_secret_dev";
const JWT_TEMP_SECRET    = process.env.JWT_TEMP_SECRET    || "infano_temp_secret_dev";

const OTP_TTL_SECONDS     = 10 * 60;   // 10 min
const OTP_RATE_LIMIT      = 3;         // max attempts per window
const OTP_RATE_WINDOW_SEC = 15 * 60;   // 15 min window
const ACCESS_TOKEN_TTL    = "15m";
const REFRESH_TOKEN_TTL   = "30d";
const TEMP_TOKEN_TTL      = "15m";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function computeContentTier(age: number): string {
  if (age < 13)  return "JUNIOR";
  if (age < 16)  return "TEEN_EARLY";
  if (age < 18)  return "TEEN_LATE";
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
    // Normalize to E.164
    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    // Rate-limit: max OTP_RATE_LIMIT sends per OTP_RATE_WINDOW_SEC
    const rateKey = `otp:rate:${normalizedPhone}`;
    const attempts = await redis.incr(rateKey);
    if (attempts === 1) {
      await redis.expire(rateKey, OTP_RATE_WINDOW_SEC);
    }
    if (attempts > OTP_RATE_LIMIT) {
      throw new AppError("Too many OTP requests. Please wait 15 minutes before trying again.", 429);
    }

    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);

    // Store hashed OTP with TTL
    await redis.setex(`otp:${normalizedPhone}`, OTP_TTL_SECONDS, hashedOtp);

    // Send via configured provider
    await smsProvider.send(normalizedPhone, otp);
    logger.info({ phone: normalizedPhone }, "OTP sent");
  }

  // ── 2. Verify OTP ───────────────────────────────────────────────────────────
  static async verifyOtp(phone: string, otp: string): Promise<{ tempToken: string; isNewUser: boolean }> {
    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    const storedHash = await redis.get(`otp:${normalizedPhone}`);

    if (!storedHash) {
      throw new AppError("OTP expired or not found. Please request a new one.", 400);
    }
    if (storedHash !== hashOtp(otp)) {
      throw new AppError("Invalid OTP. Please try again.", 400);
    }

    // OTP valid — delete immediately (one-time use)
    await redis.del(`otp:${normalizedPhone}`);
    await redis.del(`otp:rate:${normalizedPhone}`);

    const existingUser = await prisma.user.findUnique({ where: { phone: normalizedPhone }, select: { id: true, accountStatus: true, onboardingStage: true } });
    const isNewUser = !existingUser || existingUser.accountStatus === "PENDING_SETUP";

    // Issue a short-lived temp token to link the verify step to register
    const tempToken = jwt.sign(
      { phone: normalizedPhone, userId: existingUser?.id ?? null },
      JWT_TEMP_SECRET,
      { expiresIn: TEMP_TOKEN_TTL },
    );

    return { tempToken, isNewUser };
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

    const contentTier  = computeContentTier(age) as any;
    const coppaRequired = age < 13;

    // Upsert user (handles re-registration after abandoned onboarding)
    const user = await prisma.user.upsert({
      where: { phone },
      create: {
        phone,
        birthMonth:    data.birthMonth,
        birthYear:     data.birthYear,
        ageAtSignup:   age,
        contentTier,
        accountStatus:    coppaRequired ? "PENDING_CONSENT" : "PENDING_SETUP",
        coppaConsentRequired: coppaRequired,
        termsAcceptedAt:   new Date(),
        privacyAcceptedAt: new Date(),
        marketingOptIn:    data.marketingOptIn ?? false,
        locale:            data.locale ?? "en",
        timezone:          data.timezone ?? "UTC",
        onboardingStage:   2,
        profile: {
          create: {
            displayName: data.displayName,
            totalPoints: 10, // points from Stage 1 name entry
          },
        },
      },
      update: {
        birthMonth:    data.birthMonth,
        birthYear:     data.birthYear,
        ageAtSignup:   age,
        contentTier,
        termsAcceptedAt:   new Date(),
        privacyAcceptedAt: new Date(),
        marketingOptIn:    data.marketingOptIn ?? false,
        locale:            data.locale ?? "en",
        timezone:          data.timezone ?? "UTC",
        onboardingStage: 2,
      },
      include: { profile: true },
    });

    const jti = crypto.randomUUID();
    const tokenPayloadBase = { sub: user.id, contentTier: user.contentTier, accountStatus: user.accountStatus, obStage: user.onboardingStage };

    const accessToken  = signAccessToken(tokenPayloadBase);
    const refreshToken = signRefreshToken(tokenPayloadBase, jti);

    // Store refresh token in Redis (blacklist pattern — store jti)
    await redis.setex(`rt:${jti}`, 30 * 24 * 60 * 60, user.id);

    return {
      userId:              user.id,
      accessToken,
      refreshToken,
      onboardingStage:     user.onboardingStage,
      coppaConsentRequired: user.coppaConsentRequired,
      initialPoints:       user.profile?.totalPoints ?? 10,
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
    const newAccess  = signAccessToken(tokenPayloadBase);
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
}
