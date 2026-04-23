import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
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
  // Hardcode 1234 for dev mock mode, otherwise random
  if (process.env.SMS_PROVIDER === "mock") return "1234";
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
    
    // 1. Validation (Support 10-digit or +91 format)
    let processedPhone = phone;
    const is10Digit = /^\d{10}$/.test(phone);
    if (is10Digit) {
      processedPhone = `+91${phone}`;
    }

    const pattern = /^\+91\d{10}$/;
    if (!pattern.test(processedPhone)) {
      logger.warn({ phone }, "[AUTH] Invalid phone number pattern");
      throw new AppError("Invalid phone number, please try again", 400);
    }
    
    // Normalize phone for lookup and further processing
    const finalPhone = processedPhone;

    // 2. Rule 1: User Existence check (Optional for enrollment)
    const user = await prisma.user.findUnique({
      where: { phone: finalPhone },
      select: { id: true, isTestNumber: true, otpSendOn: true, otpRetryCount: true, accountStatus: true }
    });

    // We no longer throw error if user not found, 
    // to allow new users to register.
    logger.debug({ phone: finalPhone, userStatus: user?.accountStatus, isTest: user?.isTestNumber }, "[AUTH] User lookup result");

    // 3. Rule 2: Test Number -> Bypass OTP
    if (user?.isTestNumber) {
      logger.info({ phone: finalPhone }, "Test number detected - bypassing OTP send");
      return;
    }

    // 4. Rule 3: Rate Limiting (1-minute cooldown + 5 retries in 24h)
    const now = new Date();
    if (user) {
      if (user.otpSendOn) {
        const diffMs = now.getTime() - user.otpSendOn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Standard rate limit: Max 5 OTPs per 24 hours
        if (user.otpRetryCount < 5) {
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
           throw new AppError("Too many OTP requests. Please try again after 24 hours.", 429);
        }
      } else {
        // First attempt ever
        await prisma.user.update({
          where: { id: user.id },
          data: { otpSendOn: now, otpRetryCount: 1 }
        });
      }
    }

    // 5. Send OTP via configured provider
    const otp = generateOtp();
    try {
      await smsProvider.send(finalPhone, otp, appHash);
    } catch (err: any) {
      if (err.message && err.message.includes("Invalid Phone Number")) {
        throw new AppError("Invalid phone number, please try again", 400);
      }
      throw err;
    }

    // Also store in Redis cache for 'mock' fallback if needed
    await redis.setex(`otp:${finalPhone}`, OTP_TTL_SECONDS, hashOtp(otp));

    logger.info({ phone: finalPhone }, "OTP sent successfully");
  }

  // ── 2. Verify OTP ───────────────────────────────────────────────────────────
  static async verifyOtp(phone: string, otp: string): Promise<{ accessToken: string; refreshToken: string; isNewUser: boolean; onboardingStep: number; onboardingStage: number; accountStatus: string; isOnboardingCompleted: boolean; role: string; userId: string; tempToken: string }> {
    let processedPhone = phone;
    if (/^\d{10}$/.test(phone)) {
      processedPhone = `+91${phone}`;
    }
    const pattern = /^\+91\d{10}$/;
    if (!pattern.test(processedPhone)) {
      throw new AppError("Invalid phone number, please try again", 400);
    }

    const finalPhone = processedPhone;
    
    // Select all potential fields to satisfy type requirements across logical paths
    const user = await prisma.user.findUnique({
      where: { phone: finalPhone },
      select: { 
        id: true, 
        isTestNumber: true, 
        accountStatus: true, 
        onboardingStep: true, 
        contentTier: true, 
        onboardingCompletedAt: true,
        otpSendOn: true,
        otpRetryCount: true,
        role: true
      }
    });

    // 1. Test Number -> Allow ANY OTP
    if (user?.isTestNumber) {
      logger.info({ phone: finalPhone }, "Test number detected - allowing ANY OTP bypass");
      // Bypass external verification for test users
    } else if (process.env.SMS_PROVIDER === "mock") {
      const storedHash = await redis.get(`otp:${finalPhone}`);
      if (!storedHash || storedHash !== hashOtp(otp)) {
        throw new AppError("Invalid OTP. Please try again.", 400);
      }
    } else {
      const apiKey = process.env.TWOFACTOR_API_KEY || "29813cba-6fdc-11ef-8b17-0200cd936042";
      const mobile = finalPhone.replace("+", "");
      const encodedPhone = encodeURIComponent(mobile);
      const verifyUrl = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY3/${encodedPhone}/${otp}`;

      const res = await fetch(verifyUrl);
      const data = await res.json() as any;
      if (data.Status !== "Success") {
        throw new AppError("OTP Authentication failed. Please retry...", 400);
      }
    }

    // OTP verified successfully (or bypassed for test)
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpRetryCount: 0 }
      });
    }

    await redis.del(`otp:${finalPhone}`);

    const isNewUser = !user || user.accountStatus === "PENDING_SETUP";
    let finalUser: any = user;

    if (!finalUser) {
      finalUser = await prisma.user.create({
        data: {
          phone: finalPhone,
          accountStatus: "PENDING_SETUP",
          onboardingStep: 1,
          profile: {
            create: {
              displayName: "",
              totalPoints: 0,
            }
          }
        },
        select: { 
          id: true, 
          isTestNumber: true, 
          accountStatus: true, 
          onboardingStep: true, 
          contentTier: true, 
          onboardingCompletedAt: true,
          otpSendOn: true,
          otpRetryCount: true,
          role: true
        }
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

    await redis.setex(`rt:${jti}`, 30 * 24 * 60 * 60, finalUser.id);

    return {
      accessToken,
      refreshToken,
      tempToken: accessToken, // Frontend expects tempToken
      isNewUser,
      onboardingStep: finalUser.onboardingStep,
      onboardingStage: finalUser.onboardingStep, // Frontend expects onboardingStage
      accountStatus: finalUser.accountStatus,
      isOnboardingCompleted: finalUser.onboardingCompletedAt !== null,
      role: finalUser.role,
      userId: finalUser.id
    };
  }

  // ── 2b. Login (Returning User) ──────────────────────────────────────────────
  static async login(tempToken: string) {
    // In this system, tempToken is usually the accessToken from verifyOtp
    // But if we need a separate login call:
    let payload: any;
    try {
      payload = jwt.verify(tempToken, JWT_ACCESS_SECRET);
    } catch (err) {
      throw new AppError("Invalid or expired session. Please login again.", 401);
    }

    const userId = payload.sub || payload.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, accountStatus: true, onboardingStep: true, role: true }
    });

    if (!user) throw new AppError("User not found.", 404);

    return {
      accessToken: tempToken,
      refreshToken: "", // Refresh tokens usually come from verifyOtp
      userId: user.id,
      onboardingStage: user.onboardingStep,
      role: user.role,
      accountStatus: user.accountStatus,
      isOnboardingCompleted: (user as any).onboardingCompletedAt !== null
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

  // ── 5. Admin Login ──────────────────────────────────────────────────────────
  static async adminLogin(username: string, password: string) {
    logger.info({ username }, "[AUTH] adminLogin attempt");

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.role !== "ADMIN" || !user.password) {
      logger.warn({ username }, "[AUTH] Admin login failed: Invalid credentials or role");
      throw new AppError("Invalid username or password.", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn({ username }, "[AUTH] Admin login failed: Password mismatch");
      throw new AppError("Invalid username or password.", 401);
    }

    const jti = crypto.randomUUID();
    const tokenPayloadBase = { 
      sub: user.id, 
      role: user.role,
      accountStatus: user.accountStatus 
    };

    const accessToken = signAccessToken(tokenPayloadBase);
    const refreshToken = signRefreshToken(tokenPayloadBase, jti);

    await redis.setex(`rt:${jti}`, 30 * 24 * 60 * 60, user.id);

    return {
      accessToken,
      refreshToken,
      userId: user.id,
      role: user.role,
      username: user.username,
    };
  }

  static async updateOnboardingStep(userId: string, step: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: step },
    });
    return { success: true, onboardingStep: step };
  }
}
