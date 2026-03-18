import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { logger } from "../../config/logger.js";

const CONSENT_JWT_SECRET  = process.env.CONSENT_JWT_SECRET || "infano_consent_secret_dev";
const CONSENT_TOKEN_TTL   = 7 * 24 * 60 * 60; // 7 days in seconds
const APP_BASE_URL        = process.env.APP_BASE_URL || "http://localhost:4000";

// ─── Email transport (Ethereal test in dev, real SMTP in prod) ────────────────
async function getTransport() {
  if (process.env.NODE_ENV === "production" && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT) || 587,
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Dev: use Ethereal (auto-creates free test account)
  const testAccount = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return transport;
}

// ─── Consent Service ─────────────────────────────────────────────────────────

export class ConsentService {
  // Send COPPA parental consent email
  static async sendConsentEmail(userId: string, parentEmail: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
    if (!user) throw new AppError("User not found.", 404);

    // JWT-signed token (7 days)
    const token = jwt.sign({ userId, parentEmail }, CONSENT_JWT_SECRET, { expiresIn: "7d" });
    const expiresAt = new Date(Date.now() + CONSENT_TOKEN_TTL * 1000);

    // Save consent request
    await prisma.consentRequest.create({
      data: {
        userId,
        parentEmail,
        token,
        expiresAt,
        status: "PENDING",
      },
    });

    const approvalUrl   = `${APP_BASE_URL}/parent/consent/approve?token=${token}`;
    const privacyUrl    = `${APP_BASE_URL}/privacy`;
    const displayName   = user.profile?.displayName ?? "your daughter";

    const transport = await getTransport();

    const info = await transport.sendMail({
      from:    `"Infano.Care" <hello@infano.care>`,
      to:      parentEmail,
      subject: `[Infano.Care] ${displayName} wants to join — quick approval needed`,
      html:    `
        <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #f0e6ff;">
          <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Infano.Care 🌸</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Your safe space to bloom</p>
          </div>
          <div style="padding: 32px; background: white;">
            <h2 style="color: #1e1b4b;">Hi there! 👋</h2>
            <p style="color: #4b5563; line-height: 1.7;">
              <strong>${displayName}</strong> wants to join <strong>Infano.Care</strong> — 
              a safe, COPPA-compliant platform designed for young girls to learn about their bodies, 
              track their health, and build confidence in a supportive community.
            </p>
            <h3 style="color: #7c3aed;">What Infano.Care does:</h3>
            <ul style="color: #4b5563; line-height: 1.8;">
              <li>📚 Age-appropriate health education (body, puberty, wellbeing)</li>
              <li>📅 Period tracker with gentle predictions</li>
              <li>💜 Supportive community and guided journeys</li>
              <li>🔒 No ads. No data sold. Privacy first.</li>
            </ul>
            <p style="color: #4b5563; line-height: 1.7;">
              Because ${displayName} is under 13, we need your approval before she can access any content. 
              This link is valid for <strong>7 days</strong>.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${approvalUrl}" style="background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; padding: 14px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                ✅ Approve ${displayName}'s Account
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 13px;">
              <a href="${privacyUrl}" style="color: #7c3aed;">Read our full Privacy Policy</a> · 
              This email was sent because someone entered this email as a parent/guardian. 
              If you did not request this, please ignore.
            </p>
          </div>
        </div>
      `,
    });

    if (process.env.NODE_ENV !== "production") {
      logger.info({ previewUrl: nodemailer.getTestMessageUrl(info) }, "Consent email preview URL");
    }
  }

  // Get consent status for polling
  static async getConsentStatus(userId: string): Promise<{ status: string }> {
    const latest = await prisma.consentRequest.findFirst({
      where:   { userId },
      orderBy: { sentAt: "desc" },
      select:  { status: true, expiresAt: true },
    });

    if (!latest)              return { status: "not_sent" };
    if (latest.expiresAt < new Date() && latest.status === "PENDING") {
      await prisma.consentRequest.updateMany({ where: { userId, status: "PENDING" }, data: { status: "EXPIRED" } });
      return { status: "expired" };
    }

    return { status: latest.status.toLowerCase() };
  }

  // Parent approves via link
  static async approveConsent(token: string, approverIp?: string): Promise<void> {
    let payload: { userId: string; parentEmail: string };
    try {
      payload = jwt.verify(token, CONSENT_JWT_SECRET) as any;
    } catch {
      throw new AppError("Approval link is invalid or has expired.", 400);
    }

    const request = await prisma.consentRequest.findFirst({
      where: { token, status: "PENDING" },
    });
    if (!request) throw new AppError("Approval link already used or not found.", 400);

    await prisma.$transaction([
      prisma.consentRequest.update({
        where: { id: request.id },
        data:  { status: "APPROVED", approvedAt: new Date(), approvedIp: approverIp },
      }),
      prisma.user.update({
        where: { id: payload.userId },
        data: {
          accountStatus:      "ACTIVE_MINOR",
          coppaConsentGranted: true,
          coppaConsentAt:      new Date(),
        },
      }),
    ]);

    logger.info({ userId: payload.userId }, "COPPA consent approved");
  }
}
