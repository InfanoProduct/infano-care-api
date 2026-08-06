import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { GamificationService } from "./gamification.service.js";

export class QuestService {
  /**
   * Generates a personalized daily quest pool for the user.
   * Based on cycle phase, level, and category distribution.
   */
  static async generateDailyPool(userId: string) {
    // 1. Check if user already has quests for today (using a 24h window to handle timezones)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const existingQuests = await prisma.userDailyQuest.findMany({
      where: { 
        userId, 
        questDate: {
          gte: new Date(startOfDay.getTime() - 12 * 60 * 60 * 1000), // Buffer for previous day/timezone
          lte: endOfDay
        }
      },
      include: { questTemplate: true },
    });

    if (existingQuests.length > 0) {
      // Filter for the most recent ones if multiple days found
      const sorted = existingQuests.sort((a, b) => b.questDate.getTime() - a.questDate.getTime()).slice(0, 8);
      return QuestService.formatUserQuests(userId, sorted);
    }

    // 2. Get user context (phase, level)
    const [cycleProfile, userLevel] = await Promise.all([
      prisma.cycleProfile.findUnique({ where: { userId } }),
      prisma.userLevel.findUnique({ where: { userId } }),
    ]);

    const phase = cycleProfile?.currentPhase || "waiting";
    const level = userLevel?.currentLevel || 1;
    const today = startOfDay; // Re-define today for creation logic

    console.log(`[QUEST_GEN] User ${userId} context: Phase=${phase}, Level=${level}`);

    // 3. Fetch all active daily quest templates
    const templates = await prisma.questTemplate.findMany({
      where: { 
        type: "daily",
        isActive: true,
        minLevel: { lte: level },
        OR: [
          { maxLevel: null },
          { maxLevel: { gte: level } },
        ]
      },
    });

    console.log(`[QUEST_GEN] Found ${templates.length} active matching templates`);

    if (templates.length === 0) {
      console.log(`[QUEST_GEN] ⚠️ NO ACTIVE TEMPLATES FOUND. Database might need seeding.`);
      return [];
    }

    // 4. Select quests based on category distribution and phase weights
    const counts = { tracker: 2, learning: 2, community: 2, wellbeing: 1, wildcard: 1 };
    const selectedTemplates: any[] = [];

    // Let's determine the tracker quests dynamically based on user state
    const isTrackingSetupCompleted = cycleProfile?.setupCompletedAt !== null && cycleProfile?.setupCompletedAt !== undefined;
    let isPeriodDelayed = false;

    if (isTrackingSetupCompleted && cycleProfile) {
      const lastStart = cycleProfile.lastPeriodStart;
      const lastEnd = cycleProfile.lastPeriodEnd;
      if (lastStart) {
        if (!lastEnd || lastEnd.getTime() < lastStart.getTime()) {
          // Period is ongoing. Calculate duration
          const durationDays = Math.ceil((Date.now() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
          const maxDuration = (cycleProfile.avgPeriodDuration || 5) + 3;
          if (durationDays > maxDuration) {
            isPeriodDelayed = true;
          }
        }
      }
    }

    const isCycleDelayed = isTrackingSetupCompleted && (cycleProfile?.currentPhase === "delayed" || cycleProfile?.currentPhase === "late");

    console.log(`[QUEST_GEN] Tracker state: setupCompleted=${isTrackingSetupCompleted}, periodDelayed=${isPeriodDelayed}, cycleDelayed=${isCycleDelayed}`);

    // ── DYNAMIC TRACKER SELECTION ──────────────────────────────────────────
    const trackerTemplates = templates.filter(t => t.category === "tracker");
    const trackerPicks: any[] = [];

    if (!isTrackingSetupCompleted) {
      // User is not tracking yet: assign "Track Your Periods" and "Review Daily Insights"
      const trackSetUp = trackerTemplates.find(t => t.title === "Track Your Periods");
      const reviewInsights = trackerTemplates.find(t => t.title === "Review Daily Insights");
      if (trackSetUp) trackerPicks.push(trackSetUp);
      if (reviewInsights) trackerPicks.push(reviewInsights);
    } else if (isPeriodDelayed) {
      // Period is delayed (user didn't mark end date): assign "Confirm Period End" and "Review Daily Insights"
      const confirmEnd = trackerTemplates.find(t => t.title === "Confirm Period End");
      const reviewInsights = trackerTemplates.find(t => t.title === "Review Daily Insights");
      if (confirmEnd) trackerPicks.push(confirmEnd);
      if (reviewInsights) trackerPicks.push(reviewInsights);
    } else if (isCycleDelayed) {
      // Next period start is delayed: assign "Log Period Start" and "Review Daily Insights"
      const logStart = trackerTemplates.find(t => t.title === "Log Period Start");
      const reviewInsights = trackerTemplates.find(t => t.title === "Review Daily Insights");
      if (logStart) trackerPicks.push(logStart);
      if (reviewInsights) trackerPicks.push(reviewInsights);
    } else {
      // User is tracking normally: assign "Hormone Harmony Log" and "Review Daily Insights"
      const harmonyLog = trackerTemplates.find(t => t.title === "Hormone Harmony Log");
      const reviewInsights = trackerTemplates.find(t => t.title === "Review Daily Insights");
      if (harmonyLog) trackerPicks.push(harmonyLog);
      if (reviewInsights) trackerPicks.push(reviewInsights);
    }

    // Fallback if we didn't fill the tracker picks
    if (trackerPicks.length < 2) {
      const others = trackerTemplates.filter(t => !trackerPicks.includes(t));
      trackerPicks.push(...others.slice(0, 2 - trackerPicks.length));
    }
    selectedTemplates.push(...trackerPicks);

    // ── DYNAMIC LEARNING SELECTION ──────────────────────────────────────────
    const learningTemplates = templates.filter(t => t.category === "learning");
    const learningPicks: any[] = [];

    const { sequenceState } = await QuestService.getActiveEpisodeInfo(userId);

    if (sequenceState === "read") {
      const exploreQuest = learningTemplates.find(t => t.title === "Explore Episode");
      if (exploreQuest) learningPicks.push(exploreQuest);
    } else if (sequenceState === "quiz") {
      const quizQuest = learningTemplates.find(t => t.title === "Quiz Challenge");
      if (quizQuest) learningPicks.push(quizQuest);
    } else if (sequenceState === "reflection") {
      const wisdomQuest = learningTemplates.find(t => t.title === "Wisdom Journal");
      if (wisdomQuest) learningPicks.push(wisdomQuest);
    }

    // Always assign "Mindful Meditation" as the second learning quest (standard helper)
    const mindfulQuest = learningTemplates.find(t => t.title === "Mindful Meditation");
    if (mindfulQuest) learningPicks.push(mindfulQuest);

    // Fallback if we didn't fill the learning picks to 2
    if (learningPicks.length < 2) {
      const others = learningTemplates.filter(t => !learningPicks.includes(t));
      learningPicks.push(...others.slice(0, 2 - learningPicks.length));
    }
    selectedTemplates.push(...learningPicks);

    // ── OTHER CATEGORIES ───────────────────────────────────────────────────
    const otherCategories = ["community", "wellbeing", "wildcard"];
    for (const cat of otherCategories) {
      const catTemplates = templates.filter(t => t.category === cat);
      if (catTemplates.length === 0) continue;
      
      const weighted = catTemplates.sort((a, b) => {
        const weightA = (a.phaseWeights as any)[phase] || 1;
        const weightB = (b.phaseWeights as any)[phase] || 1;
        return weightB - weightA;
      });

      selectedTemplates.push(...weighted.slice(0, (counts as any)[cat]));
    }

    // Fallback: If we have templates but selection yielded nothing, just take any 5
    if (selectedTemplates.length === 0 && templates.length > 0) {
      console.log(`[QUEST_GEN] ⚠️ Category selection yielded nothing. Using first 5 templates as fallback.`);
      selectedTemplates.push(...templates.slice(0, 5));
    }

    console.log(`[QUEST_GEN] Final selection: ${selectedTemplates.length} templates. Saving...`);

    // 5. Save to userDailyQuests
    try {
      await Promise.all(
        selectedTemplates.map(template => 
          prisma.userDailyQuest.create({
            data: {
              userId,
              questTemplateId: template.id,
              questDate: today,
              status: "available",
            }
          })
        )
      );
    } catch (error: any) {
      // If we hit a unique constraint error (P2002), it means another request 
      // already generated the quests for today. We can safely ignore this 
      // and just proceed to fetch the existing ones.
      if (error.code !== 'P2002') {
        console.error("[QUEST] Error creating daily quests:", error);
        throw error;
      }
    }

    const freshQuests = await prisma.userDailyQuest.findMany({
      where: { 
        userId, 
        questDate: {
          gte: new Date(startOfDay.getTime() - 12 * 60 * 60 * 1000),
          lte: endOfDay
        }
      },
      include: { questTemplate: true },
    });
    
    return QuestService.formatUserQuests(userId, freshQuests);
  }

  static async acceptQuest(userId: string, userQuestId: string) {
    const quest = await prisma.userDailyQuest.findFirst({
      where: { id: userQuestId, userId }
    });

    if (!quest) throw new AppError("Quest not found", 404);
    if (quest.status !== "available") throw new AppError(`Quest is already ${quest.status}`, 400);

    const updated = await prisma.userDailyQuest.update({
      where: { id: userQuestId },
      data: { status: "accepted", acceptedAt: new Date() },
      include: { questTemplate: true },
    });
    return QuestService.formatUserQuest(userId, updated);
  }

  /**
   * Evaluates completion of active quests based on a domain event.
   */
  static async evaluateCompletion(userId: string, event: { type: string, count?: number, detail?: string }): Promise<number> {
    // 1. Find accepted quests for this user
    const activeQuests = await prisma.userDailyQuest.findMany({
      where: { userId, status: "accepted" },
      include: { questTemplate: true }
    });

    let totalPoints = 0;
    
    // Evaluate Daily Quests
    for (const uq of activeQuests) {
      const condition = uq.questTemplate.completionCondition as any;
      let matches = condition.event === event.type;
      
      if (uq.questTemplate.title === "Review Daily Insights" && event.type === "insight_read") {
        matches = true;
      }

      if (matches) {
        if (uq.questTemplate.title === "Review Daily Insights") {
          const currentProgress = uq.progressJson as any || {};
          const readIds = currentProgress.readIds || [];
          const newInsightId = event.detail;

          if (newInsightId && !readIds.includes(newInsightId)) {
            readIds.push(newInsightId);
          }

          const { InsightsService } = await import("../tracker/insights.service.js");
          const { insights } = await InsightsService.getDailyInsights(userId);
          const totalInsightsCount = insights.length || 1;

          if (readIds.length >= totalInsightsCount) {
            await prisma.userDailyQuest.update({
              where: { id: uq.id },
              data: {
                progressJson: {
                  ...currentProgress,
                  currentCount: readIds.length,
                  totalCount: totalInsightsCount,
                  readIds
                }
              }
            });
            await this.completeQuest(userId, uq.id);
            totalPoints += uq.questTemplate.pointsBase;
          } else {
            await prisma.userDailyQuest.update({
              where: { id: uq.id },
              data: {
                progressJson: {
                  ...currentProgress,
                  currentCount: readIds.length,
                  totalCount: totalInsightsCount,
                  readIds
                }
              }
            });
          }
        } else {
          const targetCount = condition.count || 1;
          const currentProgress = uq.progressJson as any || {};
          const newCount = (currentProgress.currentCount || 0) + (event.count || 1);

          if (newCount >= targetCount) {
            await prisma.userDailyQuest.update({
              where: { id: uq.id },
              data: { progressJson: { ...currentProgress, currentCount: newCount } }
            });
            await this.completeQuest(userId, uq.id);
            totalPoints += uq.questTemplate.pointsBase;
          } else {
            await prisma.userDailyQuest.update({
              where: { id: uq.id },
              data: { progressJson: { ...currentProgress, currentCount: newCount } }
            });
          }
        }
      }
    }

    // Evaluate Weekly Challenges
    try {
      const weeklyPoints = await this.evaluateWeeklyCompletion(userId, event);
      totalPoints += weeklyPoints;
    } catch (err) {
      console.error("[QUEST_SERVICE] Error evaluating weekly completion:", err);
    }

    return totalPoints;
  }

  static async evaluateWeeklyCompletion(userId: string, event: { type: string, count?: number }): Promise<number> {
    const today = new Date();
    
    const activeWeekly = await prisma.questWeeklyChallenge.findMany({
      where: {
        startsAt: { lte: today },
        endsAt: { gte: today },
        isActive: true,
      }
    });

    let totalPoints = 0;

    for (const challenge of activeWeekly) {
      const condition = challenge.completionCondition as any;
      if (condition.event !== event.type) continue;

      let uwc = await prisma.userWeeklyChallenge.findUnique({
        where: {
          userId_weeklyChallengeId: {
            userId,
            weeklyChallengeId: challenge.id
          }
        }
      });

      if (!uwc) {
        try {
          uwc = await prisma.userWeeklyChallenge.create({
            data: {
              userId,
              weeklyChallengeId: challenge.id,
              progress: 0,
              isCompleted: false
            }
          });
        } catch (e: any) {
          if (e.code !== 'P2002') throw e;
          uwc = await prisma.userWeeklyChallenge.findUnique({
            where: {
              userId_weeklyChallengeId: {
                userId,
                weeklyChallengeId: challenge.id
              }
            }
          });
        }
      }

      if (!uwc || uwc.isCompleted) continue;

      const newProgress = uwc.progress + (event.count || 1);
      const isCompleted = newProgress >= challenge.targetTotal;

      await prisma.userWeeklyChallenge.update({
        where: { id: uwc.id },
        data: {
          progress: newProgress,
          isCompleted,
          completedAt: isCompleted ? new Date() : null
        }
      });

      if (isCompleted) {
        totalPoints += challenge.rewardPoints;
        await GamificationService.awardPoints(
          userId,
          challenge.rewardPoints,
          "weekly_challenge",
          challenge.id,
          `Completed weekly challenge: ${challenge.title}`
        );
      }
    }

    return totalPoints;
  }

  static async getWeeklyChallenges(userId: string) {
    const today = new Date();
    
    const activeWeekly = await prisma.questWeeklyChallenge.findMany({
      where: {
        startsAt: { lte: today },
        endsAt: { gte: today },
        isActive: true,
      }
    });

    return await Promise.all(
      activeWeekly.map(async (challenge) => {
        let uwc = await prisma.userWeeklyChallenge.findUnique({
          where: {
            userId_weeklyChallengeId: {
              userId,
              weeklyChallengeId: challenge.id
            }
          }
        });

        if (!uwc) {
          try {
            uwc = await prisma.userWeeklyChallenge.create({
              data: {
                userId,
                weeklyChallengeId: challenge.id,
                progress: 0,
                isCompleted: false
              }
            });
          } catch (e: any) {
            if (e.code !== 'P2002') throw e;
            uwc = await prisma.userWeeklyChallenge.findUnique({
              where: {
                userId_weeklyChallengeId: {
                  userId,
                  weeklyChallengeId: challenge.id
                }
              }
            });
          }
        }

        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          targetTotal: challenge.targetTotal,
          rewardPoints: challenge.rewardPoints,
          startsAt: challenge.startsAt,
          endsAt: challenge.endsAt,
          category: challenge.category,
          isActive: challenge.isActive,
          progress: uwc?.progress || 0,
          isCompleted: uwc?.isCompleted || false,
          completedAt: uwc?.completedAt || null,
        };
      })
    );
  }

  static async completeQuest(userId: string, userQuestId: string) {
    const uq = await prisma.userDailyQuest.findFirst({
      where: { id: userQuestId, userId },
      include: { questTemplate: true }
    });

    if (!uq || uq.status === "completed") return;

    // 1. Mark as completed
    await prisma.userDailyQuest.update({
      where: { id: userQuestId },
      data: { 
        status: "completed", 
        completedAt: new Date(),
        pointsAwarded: uq.questTemplate.pointsBase
      },
      include: { questTemplate: true },
    });

    // 2. Award points
    await GamificationService.awardPoints(
      userId,
      uq.questTemplate.pointsBase,
      "daily_quest",
      uq.id,
      `Completed quest: ${uq.questTemplate.title}`
    );

    // 3. Check for badge reward
    if (uq.questTemplate.badgeRewardId) {
      await this.awardBadge(userId, uq.questTemplate.badgeRewardId, uq.id);
    }

    // 4. Update complex badge progress
    await this.updateBadgeProgress(userId, "quest_completed", uq.questTemplate);
  }

  static async updateBadgeProgress(userId: string, type: 'quest_completed' | 'period_logged', payload: any) {
    // ── PERIOD PIONEER LOGIC ──────────────────────────────────────────────
    const PERIOD_PIONEER_ID = '1d809215-1a62-4237-b1eb-8b85a5a38f36';
    await this._updateSpecificBadgeProgress(userId, PERIOD_PIONEER_ID, type, payload, {
      totalSteps: 90,
      evaluate: (meta, t, p) => {
        let changed = false;
        if (t === 'quest_completed' && (p.title === 'Log Your Day' || p.title === 'Log Your Flow')) {
          meta.logDays = (meta.logDays || 0) + 1;
          changed = true;
        }
        if (t === 'period_logged') {
          const currentMonth = new Date().toISOString().substring(0, 7);
          if (meta.lastLogMonth !== currentMonth) {
            meta.consecutiveMonths = (meta.consecutiveMonths || 0) + 1;
            meta.lastLogMonth = currentMonth;
            changed = true;
          }
        }
        if (changed) {
          const logPart = Math.min(((meta.logDays || 0) / 90) * 50, 50);
          const monthPart = Math.min(((meta.consecutiveMonths || 0) / 3) * 50, 50);
          return { percentage: Math.round(logPart + monthPart), currentStep: meta.logDays || 0 };
        }
        return null;
      }
    });

    // ── COMMUNITY PILLAR LOGIC ───────────────────────────────────────────
    const COMMUNITY_PILLAR_ID = '5d9aa7e4-017b-419f-845c-64573b3dfc81';
    await this._updateSpecificBadgeProgress(userId, COMMUNITY_PILLAR_ID, type, payload, {
      totalSteps: 60,
      evaluate: (meta, t, p) => {
        if (t === 'quest_completed' && (p.title === 'Connect & Share' || p.title === 'Support a Friend')) {
          const today = new Date().toISOString().substring(0, 10);
          if (meta.lastActivityDate !== today) {
            meta.daysActive = (meta.daysActive || 0) + 1;
            meta.lastActivityDate = today;
            return { 
              percentage: Math.min(Math.round(((meta.daysActive || 0) / 60) * 100), 100),
              currentStep: meta.daysActive || 0 
            };
          }
        }
        return null;
      }
    });
  }

  private static async _updateSpecificBadgeProgress(
    userId: string, 
    badgeId: string, 
    type: string, 
    payload: any, 
    config: { 
      totalSteps: number, 
      evaluate: (meta: any, type: string, payload: any) => { percentage: number, currentStep: number } | null 
    }
  ) {
    // Check if user already has the badge
    const earned = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } }
    });
    if (earned) return;

    let progress = await prisma.userBadgeProgress.findUnique({
      where: { userId_badgeId: { userId, badgeId } }
    });

    if (!progress) {
      progress = await prisma.userBadgeProgress.create({
        data: { userId, badgeId, totalSteps: config.totalSteps, metadata: {} }
      });
    }

    const metadata = progress.metadata as any;
    const result = config.evaluate(metadata, type, payload);

    if (result) {
      await prisma.userBadgeProgress.update({
        where: { id: progress.id },
        data: { 
          progress: result.percentage,
          currentStep: result.currentStep,
          metadata 
        }
      });

      if (result.percentage >= 100) {
        await this.awardBadge(userId, badgeId);
      }
    }
  }

  static async awardBadge(userId: string, badgeId: string, sourceQuestId?: string) {
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } }
    });

    if (existing) return;

    try {
      return await prisma.userBadge.create({
        data: {
          userId,
          badgeId,
          sourceQuestId,
        }
      });
    } catch (error: any) {
      if (error.code !== 'P2002') throw error;
      return;
    }
  }

  static async getMyBadges(userId: string) {
    const earned = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true }
    });

    const progress = await prisma.userBadgeProgress.findMany({
      where: { userId }
    });

    return { earned, progress };
  }

  static async getAllBadges() {
    return prisma.badge.findMany({
      include: {
        rewardForQuests: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            pointsBase: true,
            difficulty: true,
            estimatedMinutes: true,
            completionCondition: true,
          },
        },
      },
    });
  }

  static async getActiveEpisodeInfo(userId: string) {
    let activeJourneyTitle = "your journey";
    let activeEpisodeTitle = "the current episode";
    let sequenceState: "read" | "quiz" | "reflection" = "read";

    const latestProgress = await prisma.userProgress.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { episode: { include: { journey: true } } },
    });

    let activeJourneyId: string | null = null;
    let activeEpisode: any = null;

    if (latestProgress) {
      activeJourneyId = latestProgress.episode.journeyId;
      activeJourneyTitle = latestProgress.episode.journey.title;

      const incompleteEpisode = await prisma.episode.findFirst({
        where: {
          journeyId: activeJourneyId,
          isActive: true,
          userProgress: {
            none: { userId, completed: true }
          }
        },
        orderBy: { order: "asc" }
      });

      if (incompleteEpisode) {
        activeEpisode = incompleteEpisode;
      } else {
        const nextJourney = await prisma.learningJourney.findFirst({
          where: {
            isActive: true,
            id: { not: activeJourneyId }
          },
          orderBy: { createdAt: "asc" }
        });
        if (nextJourney) {
          activeJourneyId = nextJourney.id;
          activeJourneyTitle = nextJourney.title;
          activeEpisode = await prisma.episode.findFirst({
            where: { journeyId: activeJourneyId, isActive: true },
            orderBy: { order: "asc" }
          });
        }
      }
    } else {
      const firstJourney = await prisma.learningJourney.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" }
      });
      if (firstJourney) {
        activeJourneyId = firstJourney.id;
        activeJourneyTitle = firstJourney.title;
        activeEpisode = await prisma.episode.findFirst({
          where: { journeyId: activeJourneyId, isActive: true },
          orderBy: { order: "asc" }
        });
      }
    }

    if (activeEpisode) {
      activeEpisodeTitle = activeEpisode.title;

      const epProgress = await prisma.userProgress.findUnique({
        where: { userId_episodeId: { userId, episodeId: activeEpisode.id } }
      });

      const reflection = await prisma.reflection.findFirst({
        where: { userId, episodeId: activeEpisode.id }
      });

      const hasCompletedQuiz = epProgress?.history ? (epProgress.history as any).quiz !== undefined : false;

      if (!epProgress || !epProgress.completed) {
        sequenceState = "read";
      } else if (!hasCompletedQuiz) {
        sequenceState = "quiz";
      } else if (!reflection) {
        sequenceState = "reflection";
      } else {
        sequenceState = "read";
      }
    }

    return { activeEpisodeTitle, activeJourneyTitle, sequenceState };
  }

  static async formatUserQuest(userId: string, q: any) {
    if (!q || !q.questTemplate) return q;
    
    const t = q.questTemplate;
    if (t.title !== "Explore Episode" && t.title !== "Quiz Challenge" && t.title !== "Wisdom Journal") {
      return q;
    }

    try {
      const { activeEpisodeTitle, activeJourneyTitle } = await QuestService.getActiveEpisodeInfo(userId);
      let title = t.title;
      let description = t.description;

      if (title === "Explore Episode") {
        title = `Explore: ${activeEpisodeTitle}`;
        description = `Read the next episode "${activeEpisodeTitle}" in your "${activeJourneyTitle}" journey.`;
      } else if (title === "Quiz Challenge") {
        title = `Quiz: ${activeEpisodeTitle}`;
        description = `Complete the knowledge check quiz for "${activeEpisodeTitle}" to test your knowledge.`;
      } else if (title === "Wisdom Journal") {
        title = `Reflect: ${activeEpisodeTitle}`;
        description = `Add a reflection journal entry on "${activeEpisodeTitle}" to share your thoughts.`;
      }

      return {
        ...q,
        questTemplate: {
          ...t,
          title,
          description,
        },
      };
    } catch (e) {
      console.error("[QUEST] Error formatting user quest:", e);
      return q;
    }
  }

  static async formatUserQuests(userId: string, quests: any[]) {
    try {
      const { activeEpisodeTitle, activeJourneyTitle } = await QuestService.getActiveEpisodeInfo(userId);
      return quests.map((q: any) => {
        if (!q.questTemplate) return q;
        const t = q.questTemplate;
        let title = t.title;
        let description = t.description;

        if (title === "Explore Episode") {
          title = `Explore: ${activeEpisodeTitle}`;
          description = `Read the next episode "${activeEpisodeTitle}" in your "${activeJourneyTitle}" journey.`;
        } else if (title === "Quiz Challenge") {
          title = `Quiz: ${activeEpisodeTitle}`;
          description = `Complete the knowledge check quiz for "${activeEpisodeTitle}" to test your knowledge.`;
        } else if (title === "Wisdom Journal") {
          title = `Reflect: ${activeEpisodeTitle}`;
          description = `Add a reflection journal entry on "${activeEpisodeTitle}" to share your thoughts.`;
        }

        return {
          ...q,
          questTemplate: {
            ...t,
            title,
            description,
          },
        };
      });
    } catch (e) {
      console.error("[QUEST] Error formatting user quests:", e);
      return quests;
    }
  }
}
