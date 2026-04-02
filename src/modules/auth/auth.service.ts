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

export function computeContentTier(age: number): string {
  if (age < 13) return "JUNIOR";
  if (age < 16) return "TEEN_EARLY";
  if (age < 18) return "TEEN_LATE";
  return "ADULT";
}

export function computeAge(birthMonth: number, birthYear: number): number {
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
  static async sendOtp(phone: string, appHash?: string): Promise<void> {
    logger.info({ phone, appHash }, "[AUTH] sendOtp request received");
    // 1. Strict Validation
    const pattern = /^\+91\d{10}$/;
    if (!pattern.test(phone)) {
      logger.warn({ phone }, "[AUTH] Invalid phone number pattern");
      throw new AppError("Invalid phone number, please try again", 400);
    }

    // 2. Rule 1: User Existence check (Optional for enrollment)
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, isTestNumber: true, otpSendOn: true, otpRetryCount: true, accountStatus: true }
    });

    // We no longer throw error if user not found, 
    // to allow new users to register.
    logger.debug({ phone, userStatus: user?.accountStatus, isTest: user?.isTestNumber }, "[AUTH] User lookup result");

    // 3. Rule 2: Test Number -> Bypass OTP
    if (user?.isTestNumber) {
      logger.info({ phone }, "Test number detected - bypassing OTP send");
      return;
    }

    // 4. Rule 3: Rate Limiting (1-minute cooldown + 3 retries in 24h)
    const now = new Date();
    if (user) {
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
    }

    // 5. Send OTP via configured provider
    const otp = generateOtp();
    try {
      await smsProvider.send(phone, otp, appHash);
    } catch (err: any) {
      if (err.message && err.message.includes("Invalid Phone Number")) {
        throw new AppError("Invalid phone number, please try again", 400);
      }
      throw err;
    }

    // Also store in Redis cache for 'mock' fallback if needed, 
    // but the reference uses 2Factor's verify endpoint.
    // For now we store it just in case we need it, but 2Factor is primary.
    await redis.setex(`otp:${phone}`, OTP_TTL_SECONDS, hashOtp(otp));

    logger.info({ phone }, "OTP sent successfully");
  }

  // ── 2. Verify OTP ───────────────────────────────────────────────────────────
  static async verifyOtp(phone: string, otp: string): Promise<{ accessToken: string; refreshToken: string; isNewUser: boolean; onboardingStep: number; accountStatus: string; isOnboardingCompleted: boolean }> {
    const pattern = /^\+91\d{10}$/;
    if (!pattern.test(phone)) {
      throw new AppError("Invalid phone number, please try again", 400);
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, isTestNumber: true, accountStatus: true, onboardingStep: true, contentTier: true, onboardingCompletedAt: true }
    });

    // We no longer throw if user doesn't exist, as this could be a new user.

    // 1. Test Number -> Direct Login Bypass (Skip OTP Verify)
    if (user?.isTestNumber) {
      logger.info({ phone }, "Test number detected - bypassing OTP verification");
    } else {
      // 2. Real OTP Verification via 2Factor.in /VERIFY3
      const apiKey = process.env.TWOFACTOR_API_KEY || "29813cba-6fdc-11ef-8b17-0200cd936042";
      const encodedPhone = encodeURIComponent(phone);
      const verifyUrl = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY3/${encodedPhone}/${otp}`;

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
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpRetryCount: 0 }
      });
    }

    await redis.del(`otp:${phone}`);

    const isNewUser = !user || user.accountStatus === "PENDING_SETUP";
    let finalUser = user;

    if (!finalUser) {
      finalUser = await prisma.user.create({
        data: {
          phone,
          accountStatus: "PENDING_SETUP",
          onboardingStep: 1,
          profile: {
            create: {
              displayName: "",
              totalPoints: 0,
            }
          }
        },
        select: { id: true, isTestNumber: true, accountStatus: true, onboardingStep: true, contentTier: true, onboardingCompletedAt: true }
      });
      logger.info({ userId: finalUser.id }, "Created new user via OTP verify");
    }

    const jti = crypto.randomUUID();
    const tokenPayloadBase = { 
      sub: finalUser.id, 
      contentTier: finalUser.contentTier, 
      accountStatus: finalUser.accountStatus, 
      obStep: finalUser.onboardingStep 
    };

    const accessToken = signAccessToken(tokenPayloadBase);
    const refreshToken = signRefreshToken(tokenPayloadBase, jti);

    // Store refresh token in Redis (blacklist pattern — store jti)
    await redis.setex(`rt:${jti}`, 30 * 24 * 60 * 60, finalUser.id);

    return {
      accessToken,
      refreshToken,
      isNewUser,
      onboardingStep: finalUser.onboardingStep,
      accountStatus: finalUser.accountStatus,
      isOnboardingCompleted: finalUser.onboardingCompletedAt !== null
    };
  }

  // ── 3. Refresh ───────────────────────────────────────────────────────────────
  static async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      throw new AppError("Invalid or expired refresh token.", 401);
    }

    const { jti, sub } = payload;
    const stored = await redis.get(`rt:${jti}`);
    if (!stored) throw new AppError("Refresh token revoked.", 401);

    await redis.del(`rt:${jti}`);

    const user = await prisma.user.findUnique({ where: { id: sub }, select: { id: true, contentTier: true, accountStatus: true, onboardingStep: true } });
    if (!user) throw new AppError("User not found.", 404);

    const newJti = crypto.randomUUID();
    const tokenPayloadBase = { sub: user.id, contentTier: user.contentTier, accountStatus: user.accountStatus, obStep: user.onboardingStep };
    const newAccess = signAccessToken(tokenPayloadBase);
    const newRefresh = signRefreshToken(tokenPayloadBase, newJti);

    await redis.setex(`rt:${newJti}`, 30 * 24 * 60 * 60, user.id);

    return { accessToken: newAccess, refreshToken: newRefresh };
  }

  // ── 4. Logout ────────────────────────────────────────────────────────────────
  static async logout(refreshToken: string) {
    try {
      const payload: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      await redis.del(`rt:${payload.jti}`);
    } catch {
      // Already expired — treat as success
    }
  }

  static async updateOnboardingStep(userId: string, step: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: step },
    });
    return { success: true, onboardingStep: step };
  }
}
