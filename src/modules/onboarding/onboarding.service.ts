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

  score += intersection(journey.topics  || [], profile.interestTopics).length * 40;
  score += intersection(journey.goals   || [], profile.goals).length * 30;
  if (journey.minContentTier === contentTier) score += 20;
  if (profile.periodStatus === "waiting" && (journey.tags || []).includes("pre_period"))  score += 25;
  if (profile.periodStatus === "active"  && (journey.tags || []).includes("cycle_aware")) score += 25;
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
      onboardingStage: user.onboardingStage,
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
      where:  { userId },
      create: {
        userId,
        goals:              data.goals,
        periodComfortScore: score,
        periodStatus:       data.periodStatus,
        periodContentTone:  tone,
        interestTopics:     data.interestTopics,
        quizCompletedAt:    new Date(),
      },
      update: {
        goals:              data.goals,
        periodComfortScore: score,
        periodStatus:       data.periodStatus,
        periodContentTone:  tone,
        interestTopics:     data.interestTopics,
        quizCompletedAt:    new Date(),
      }
    });

    // Profile updated, skipping stage overwrite to avoid conflicting with mobile app sequence
    // await prisma.user.update({ where: { id: userId }, data: { onboardingStage: 3 } });

    // Award quiz points
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, displayName: "User", totalPoints: 45 },
      update: { totalPoints: { increment: 45 } },
    });

    // First-pass journey recommendations
    const allJourneys = await prisma.learningJourney.findMany();
    const ranked: JourneyScore[] = allJourneys
      .map((j) => ({ id: j.id, title: j.title, description: j.description, score: scoreJourney(j, { interestTopics: data.interestTopics, goals: data.goals, periodStatus: data.periodStatus, periodContentTone: tone }, String(user.contentTier)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const userProfile = await prisma.profile.findUnique({ where: { userId }, select: { totalPoints: true } });

    return {
      profileId:           profile.id,
      recommendedJourneys: ranked,
      pointsTotal:         userProfile?.totalPoints ?? 55,
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
      where:  { userId },
      create: { userId, ...data, accessories: data.accessories ?? [] },
      update: { ...data, accessories: data.accessories ?? [] },
    });

    await prisma.profile.upsert({
      where: { userId },
      create: { userId, displayName: "User", totalPoints: 25 },
      update: { totalPoints: { increment: 25 } },
    });
    // Avatar saved, skipping stage overwrite
    // await prisma.user.update({ where: { id: userId }, data: { onboardingStage: 4 } });

    return { avatarId: avatar.id };
  }

  // ── POST /api/onboarding/journey-name ─────────────────────────────────────────
  static async saveJourneyName(userId: string, journeyName: string) {
    await prisma.profile.upsert({
      where:  { userId },
      create: { userId, displayName: "User", journeyName, totalPoints: 15 },
      update: { journeyName, totalPoints: { increment: 15 } },
    });
    // Journey name saved, skipping stage overwrite
    // await prisma.user.update({ where: { id: userId }, data: { onboardingStage: 4 } });

    const profile = await prisma.profile.findUnique({ where: { userId }, select: { totalPoints: true, displayName: true } });
    return { journeyName, pointsTotal: profile?.totalPoints ?? 0 };
  }

  // ── POST /api/onboarding/complete ─────────────────────────────────────────────
  static async completeOnboarding(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data:  {
        accountStatus:          "ACTIVE",
        onboardingStage:        5,
        onboardingCompletedAt:  new Date(),
      },
    });
    return { accountStatus: user.accountStatus, onboardingStage: user.onboardingStage };
  }
}
