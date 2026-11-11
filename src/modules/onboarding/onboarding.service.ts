import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { computeAge, computeContentTier } from "../auth/auth.service.js";

// Journey scoring algorithm from product spec
interface JourneyScore {
  id: string;
  score: number;
  title: string;
  description: string;
}

function scoreJourney(journey: any, profile: { interestTopics: string[]; goals: string[]; periodStatus: string; periodContentTone: string }, contentTier: string): number {
  let score = 0;
  const intersection = (a: string[], b: string[]) => a.filter((x) => b.includes(x));

  score += intersection(journey.topics || [], profile.interestTopics).length * 40;
  score += intersection(journey.goals || [], profile.goals).length * 30;
  if (journey.minContentTier === contentTier) score += 20;
  if (profile.periodStatus === "waiting" && (journey.tags || []).includes("pre_period")) score += 25;
  if (profile.periodStatus === "active" && (journey.tags || []).includes("cycle_aware")) score += 25;
  if (journey.contentTone === profile.periodContentTone) score += 15;

  return score;
}

export class OnboardingService {
  // ── POST /api/onboarding/profile ──────────────────────────────────────────────
  static async setupProfile(userId: string, data: {
    displayName: string;
    birthMonth: number;
    birthYear: number;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    marketingOptIn?: boolean;
    locale?: string;
    timezone?: string;
  }) {
    if (!data.termsAccepted || !data.privacyAccepted) {
      throw new AppError("Terms and Privacy Policy must be accepted.", 400);
    }

    const age = computeAge(data.birthMonth, data.birthYear);
    if (age < 6) {
      throw new AppError("Infano.Care is for girls aged 10 and up.", 400);
    }

    const contentTier = computeContentTier(age) as any;
    const coppaRequired = age < 13;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
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
        profile: {
          update: {
            displayName: data.displayName,
            totalPoints: 10,
          },
        },
      },
      include: { profile: true },
    });

    return {
      userId: user.id,
      onboardingStep: user.onboardingStep,
      coppaConsentRequired: user.coppaConsentRequired,
      initialPoints: user.profile?.totalPoints ?? 10,
    };
  }

  // ── POST /api/onboarding/personalization ──────────────────────────────────────
  static async savePersonalization(userId: string, data: {
    goals: string[];
    periodComfortScore?: number;
    periodStatus: string;
    interestTopics: string[];
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { contentTier: true } });
    if (!user) throw new AppError("User not found.", 404);

    const score = data.periodComfortScore ?? 3;
    const tone = score <= 2 ? "gentle" : score >= 4 ? "direct" : "moderate";

    const profile = await prisma.personalizationProfile.upsert({
      where: { userId },
      create: {
        userId,
        goals: data.goals,
        periodComfortScore: score,
        periodStatus: data.periodStatus,
        periodContentTone: tone,
        interestTopics: data.interestTopics,
        quizCompletedAt: new Date(),
      },
      update: {
        goals: data.goals,
        periodComfortScore: score,
        periodStatus: data.periodStatus,
        periodContentTone: tone,
        interestTopics: data.interestTopics,
        quizCompletedAt: new Date(),
      }
    });

    // Profile updated, skipping stage overwrite to avoid conflicting with mobile app sequence
    // await prisma.user.update({ where: { id: userId }, data: { onboardingStep: 3 } });

    // Award quiz points
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, displayName: "User", totalPoints: 45 },
      update: { totalPoints: { increment: 45 } },
    });

    // First-pass journey recommendations
    const allJourneys = await prisma.creativeJourney.findMany();
    const ranked: JourneyScore[] = allJourneys
      .map((j) => ({ id: j.id, title: j.title, description: j.description, score: scoreJourney(j, { interestTopics: data.interestTopics, goals: data.goals, periodStatus: data.periodStatus, periodContentTone: tone }, String(user.contentTier)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const userProfile = await prisma.profile.findUnique({ where: { userId }, select: { totalPoints: true } });

    return {
      profileId: profile.id,
      recommendedJourneys: ranked,
      pointsTotal: userProfile?.totalPoints ?? 55,
    };
  }

  // ── POST /api/onboarding/avatar ───────────────────────────────────────────────
  static async saveAvatar(userId: string, data: {
    bodyTypeId: number;
    skinToneId: number;
    hairStyleId: number;
    hairColorId: number;
    eyeShapeId: number;
    eyeColorId: number;
    outfitId: number;
    accessories?: number[];
  }) {
    const avatar = await prisma.userAvatar.upsert({
      where: { userId },
      create: { userId, ...data, accessories: data.accessories ?? [] },
      update: { ...data, accessories: data.accessories ?? [] },
    });

    await prisma.profile.upsert({
      where: { userId },
      create: { userId, displayName: "User", totalPoints: 25 },
      update: { totalPoints: { increment: 25 } },
    });
    // Avatar saved, skipping stage overwrite
    // await prisma.user.update({ where: { id: userId }, data: { onboardingStep: 4 } });

    return { avatarId: avatar.id };
  }

  // ── POST /api/onboarding/journey-name ─────────────────────────────────────────
  static async saveJourneyName(userId: string, journeyName: string) {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, displayName: "User", journeyName, totalPoints: 15 },
      update: { journeyName, totalPoints: { increment: 15 } },
    });
    // Journey name saved, skipping stage overwrite
    // await prisma.user.update({ where: { id: userId }, data: { onboardingStep: 4 } });

    const profile = await prisma.profile.findUnique({ where: { userId }, select: { totalPoints: true, displayName: true } });
    return { journeyName, pointsTotal: profile?.totalPoints ?? 0 };
  }

  // ── POST /api/onboarding/complete ─────────────────────────────────────────────
  static async completeOnboarding(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "ACTIVE",
        onboardingStep: 5,
        onboardingCompletedAt: new Date(),
      },
    });
    return { accountStatus: user.accountStatus, onboardingStep: user.onboardingStep };
  }

  // ── NEW FLOW: Parent & Daughter Onboarding ──────────────────────────────────
  static async saveParentConsent(userId: string, data: {
    consentGuardian: boolean;
    consentChildData: boolean;
    consentAnalytics?: boolean;
    parentName?: string;
  }) {
    if (!data.consentGuardian || !data.consentChildData) {
      throw new AppError("Required parental consents must be accepted.", 400);
    }

    if (data.parentName && data.parentName.trim()) {
      await prisma.profile.upsert({
        where: { userId },
        create: { userId, displayName: data.parentName.trim() },
        update: { displayName: data.parentName.trim() },
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        parentConsent: true,
        privacyAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
        marketingOptIn: Boolean(data.consentAnalytics),
        onboardingStep: 2,
      },
    });

    return { success: true, onboardingStep: user.onboardingStep };
  }

  static async saveDaughterProfile(userId: string, data: {
    name: string;
    age: string;
    periodStatus?: string;
    worries?: string[];
  }) {
    if (!data.name || !data.name.trim()) {
      throw new AppError("Daughter's name is required.", 400);
    }

    let learner = await prisma.learnerProfile.findFirst({
      where: { parentId: userId },
    });

    if (learner) {
      learner = await prisma.learnerProfile.update({
        where: { id: learner.id },
        data: {
          name: data.name.trim(),
          age: data.age || "11",
          periodStatus: data.periodStatus || null,
          worries: data.worries || [],
        },
      });
    } else {
      learner = await prisma.learnerProfile.create({
        data: {
          parentId: userId,
          name: data.name.trim(),
          age: data.age || "11",
          periodStatus: data.periodStatus || null,
          worries: data.worries || [],
          flowersCount: 0,
          petalsCount: 0,
          streakDays: 1,
        },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: 3 },
    });

    return { success: true, learner, onboardingStep: 3 };
  }

  static async saveParentSpace(userId: string, data: {
    parentPin: string;
    learningStyle?: string;
    whatsappWeeklySummary?: boolean;
    whatsappLessonNudge?: boolean;
    whatsappNudgeTime?: string;
  }) {
    if (!data.parentPin || data.parentPin.length !== 4) {
      throw new AppError("A 4-digit parent PIN is required.", 400);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        parentPin: data.parentPin,
        learningStyle: data.learningStyle || "side_by_side",
        whatsappWeeklySummary: data.whatsappWeeklySummary ?? true,
        whatsappLessonNudge: data.whatsappLessonNudge ?? true,
        whatsappNudgeTime: data.whatsappNudgeTime || "6:30 PM",
        accountStatus: "ACTIVE",
        onboardingStep: 4,
        onboardingCompletedAt: new Date(),
      },
      include: {
        learners: true,
        profile: true,
      },
    });

    return {
      success: true,
      user: {
        id: user.id,
        role: user.role,
        accountStatus: user.accountStatus,
        hasParentPin: true,
        learningStyle: user.learningStyle,
        learners: user.learners,
        profile: user.profile,
      },
    };
  }

  static async verifyParentPin(userId: string, pin: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentPin: true },
    });

    if (!user || !user.parentPin) {
      throw new AppError("Parent PIN not set.", 400);
    }

    if (user.parentPin !== pin) {
      throw new AppError("Incorrect PIN. Please try again.", 400);
    }

    return { success: true, verified: true };
  }

  static async getLearners(userId: string) {
    const learners = await prisma.learnerProfile.findMany({
      where: { parentId: userId },
      orderBy: { createdAt: "asc" },
    });
    return { learners };
  }

  static async addLearner(userId: string, data: {
    name: string;
    age: string;
    periodStatus?: string;
    worries?: string[];
  }) {
    if (!data.name || !data.name.trim()) {
      throw new AppError("Learner's name is required.", 400);
    }

    const learner = await prisma.learnerProfile.create({
      data: {
        parentId: userId,
        name: data.name.trim(),
        age: data.age || "11",
        periodStatus: data.periodStatus || null,
        worries: data.worries || [],
        flowersCount: 0,
        petalsCount: 0,
        streakDays: 1,
      },
    });

    return { success: true, learner };
  }

  /**
   * Reset Parent PIN via OTP identity verification.
   * Step 1 — request: sends OTP to the parent's registered phone/email.
   * Step 2 — confirm: verifies OTP + sets the new 4-digit PIN.
   */
  static async requestPinReset(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, isTestNumber: true },
    });
    if (!user) throw new AppError("User not found.", 404);
    if (!user.phone && !user.email) throw new AppError("No phone or email on file to verify identity.", 400);

    // Re-use the existing sendOtp pathway for phone users
    const { AuthService } = await import("../auth/auth.service.js");
    if (user.phone) {
      await AuthService.sendOtp(user.phone);
    } else if (user.email) {
      await AuthService.sendEmailOtp(user.email);
    }

    return { success: true, message: "Verification code sent to your registered contact." };
  }

  static async confirmPinReset(userId: string, data: { otp: string; newPin: string }) {
    if (!data.newPin || data.newPin.length !== 4 || !/^\d{4}$/.test(data.newPin)) {
      throw new AppError("New PIN must be exactly 4 digits.", 400);
    }
    if (!data.otp || data.otp.length !== 4) {
      throw new AppError("A valid 4-digit OTP is required.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true },
    });
    if (!user) throw new AppError("User not found.", 404);

    // Verify OTP using the same auth service verification
    const { AuthService } = await import("../auth/auth.service.js");
    if (user.phone) {
      await AuthService.verifyOtpOnly(user.phone, data.otp);
    } else if (user.email) {
      await AuthService.verifyEmailOtpOnly(user.email, data.otp);
    } else {
      throw new AppError("No registered contact to verify against.", 400);
    }

    // OTP verified — update PIN
    await prisma.user.update({
      where: { id: userId },
      data: { parentPin: data.newPin },
    });

    return { success: true, message: "Parent PIN has been reset successfully." };
  }

  static async getOnboardingStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        accountStatus: true,
        onboardingStep: true,
        onboardingCompletedAt: true,
        parentConsent: true,
        parentPin: true,
        learningStyle: true,
        whatsappWeeklySummary: true,
        whatsappLessonNudge: true,
        whatsappNudgeTime: true,
        learners: {
          orderBy: { createdAt: "asc" },
        },
        profile: {
          select: { displayName: true },
        },
      },
    });

    if (!user) throw new AppError("User not found.", 404);

    const isCompleted = Boolean(
      (user.accountStatus === "ACTIVE" || user.onboardingCompletedAt !== null) &&
      (user.learners && user.learners.length > 0)
    );

    return {
      success: true,
      onboardingStep: user.onboardingStep || 1,
      isOnboardingCompleted: isCompleted,
      parentConsent: Boolean(user.parentConsent),
      hasParentPin: Boolean(user.parentPin),
      learningStyle: user.learningStyle || "side_by_side",
      whatsappWeeklySummary: user.whatsappWeeklySummary ?? true,
      whatsappLessonNudge: user.whatsappLessonNudge ?? true,
      whatsappNudgeTime: user.whatsappNudgeTime || "6:30 PM",
      learners: user.learners || [],
      parentName: user.profile?.displayName || "Parent",
    };
  }
}
