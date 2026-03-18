import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

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
  // ── POST /api/onboarding/personalization ──────────────────────────────────────
  static async savePersonalization(userId: string, data: {
    goals: string[];
    periodComfortScore: number;
    periodStatus: string;
    interestTopics: string[];
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { contentTier: true } });
    if (!user) throw new AppError("User not found.", 404);

    const tone = data.periodComfortScore <= 2 ? "gentle" : data.periodComfortScore >= 4 ? "direct" : "moderate";

    const profile = await prisma.personalizationProfile.upsert({
      where:  { userId },
      create: {
        userId,
        goals:              data.goals,
        periodComfortScore: data.periodComfortScore,
        periodStatus:       data.periodStatus,
        periodContentTone:  tone,
        interestTopics:     data.interestTopics,
        quizCompletedAt:    new Date(),
      },
      update: {
        goals:              data.goals,
        periodComfortScore: data.periodComfortScore,
        periodStatus:       data.periodStatus,
        periodContentTone:  tone,
        interestTopics:     data.interestTopics,
        quizCompletedAt:    new Date(),
      },
    });

    // Update onboarding stage
    await prisma.user.update({ where: { id: userId }, data: { onboardingStage: 3 } });

    // Award quiz points (45 pts total: 15+10+10+20 across screens 7-10)
    await prisma.profile.update({
      where: { userId },
      data:  { totalPoints: { increment: 45 } },
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

    await prisma.profile.update({ where: { userId }, data: { totalPoints: { increment: 25 } } });
    await prisma.user.update({ where: { id: userId }, data: { onboardingStage: 4 } });

    return { avatarId: avatar.id };
  }

  // ── POST /api/onboarding/journey-name ─────────────────────────────────────────
  static async saveJourneyName(userId: string, journeyName: string) {
    await prisma.profile.update({ where: { userId }, data: { journeyName, totalPoints: { increment: 15 } } });

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
