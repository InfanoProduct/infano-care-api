import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { GamificationService } from "./gamification.service.js";

export class QuestService {
  static async ensureTrackPeriodTemplate() {
    let t = await prisma.questTemplate.findFirst({
      where: { title: "Track Your Period" },
    });
    if (!t) {
      t = await prisma.questTemplate.create({
        data: {
          title: "Track Your Period",
          description: "Configure your period tracker to unlock smart cycle predictions and health insights.",
          category: "tracker",
          pointsBase: 100,
          type: "daily",
          isActive: true,
          completionCondition: { event: "cycle_setup_completed", count: 1 },
          estimatedMinutes: 2,
          phaseWeights: { menstrual: 1, follicular: 1, ovulation: 1, luteal: 1, waiting: 1 },
        },
      });
    } else if (t.pointsBase !== 100) {
      t = await prisma.questTemplate.update({
        where: { id: t.id },
        data: { pointsBase: 100 },
      });
    }
    return t;
  }

  /**
   * Generates a personalized daily quest pool for the user.
   * Based on cycle phase, level, and category distribution.
   */
  static async generateDailyPool(userId: string) {
    const trackPeriodTpl = await QuestService.ensureTrackPeriodTemplate();

    // 1. Check if user already has quests for today (using a 24h window to handle timezones)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [cycleProfile, userLevel] = await Promise.all([
      prisma.cycleProfile.findUnique({ where: { userId } }),
      prisma.userLevel.findUnique({ where: { userId } }),
    ]);

    const isTrackerConfigured = cycleProfile?.lastPeriodStart != null;

    const existingQuests = await prisma.userDailyQuest.findMany({
      where: { 
        userId, 
        questDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: { questTemplate: true },
    });

    if (existingQuests.length > 0) {
      const hasTrackPeriodQuest = existingQuests.some(q => q.questTemplateId === trackPeriodTpl.id || q.questTemplate?.title === "Track Your Period");
      
      // If user hasn't configured period tracker yet, ensure "Track Your Period" quest is in the daily list
      if (!isTrackerConfigured && !hasTrackPeriodQuest) {
        try {
          const newQuest = await prisma.userDailyQuest.create({
            data: {
              userId,
              questTemplateId: trackPeriodTpl.id,
              questDate: startOfDay,
              status: "available",
            },
            include: { questTemplate: true },
          });
          existingQuests.unshift(newQuest);
        } catch (e: any) {
          if (e.code !== 'P2002') console.error('[QUEST] Error adding Track Your Period quest:', e);
        }
      }

      // If user HAS configured period tracker, auto-evaluate completion if quest is still pending
      if (isTrackerConfigured) {
        const pendingQuest = existingQuests.find(
          q => (q.questTemplateId === trackPeriodTpl.id || q.questTemplate?.title === "Track Your Period") && q.status !== "completed"
        );
        if (pendingQuest) {
          await QuestService.evaluateCompletion(userId, { type: "cycle_setup_completed" });
          pendingQuest.status = "completed";
          pendingQuest.completedAt = new Date();
          pendingQuest.pointsAwarded = 100;
        }
      }

      // Filter out Curiosity Quest permanently and deduplicate identical quest titles
      const seenTitles = new Set<string>();
      const filteredExisting = existingQuests.filter(q => {
        const title = q.questTemplate?.title?.toLowerCase().trim();
        if (!title || title.includes("curiosity")) return false;
        if (title === "track your periods") return false;
        if (seenTitles.has(title)) return false;
        seenTitles.add(title);
        return true;
      });

      // Sort deterministically by id so quest pool remains 100% fixed and stable without reshuffling
      const sorted = filteredExisting.sort((a, b) => a.id.localeCompare(b.id));
      return QuestService.formatUserQuests(userId, sorted);
    }

    const phase = cycleProfile?.currentPhase || "waiting";
    const level = userLevel?.currentLevel || 1;
    const today = startOfDay; // Re-define today for creation logic

    console.log(`[QUEST_GEN] User ${userId} context: Phase=${phase}, Level=${level}, TrackerConfigured=${isTrackerConfigured}`);

    // 3. Fetch all active daily quest templates (excluding Curiosity Quest)
    const templates = await prisma.questTemplate.findMany({
      where: { 
        type: "daily",
        isActive: true,
        title: { not: { contains: "Curiosity" } },
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

    // 4. Select EXACTLY 6 Quests: 2 Tracker + 1 Learning + 1 Wellbeing + 1 Circle + 1 Connect
    const selectedTemplates: any[] = [];

    // ── 1. TRACKER CATEGORY (EXACTLY 2 QUESTS) ──────────────────────────
    const trackerTemplates = templates.filter(t => t.category === "tracker");
    if (!isTrackerConfigured) {
      const setupQuest = trackerTemplates.find(t => t.title === "Track Your Period") || trackPeriodTpl;
      const symptomsQuest = trackerTemplates.find(t => t.title === "Log Symptoms & Mood");
      if (setupQuest) selectedTemplates.push(setupQuest);
      if (symptomsQuest) selectedTemplates.push(symptomsQuest);
    } else {
      // Always include Log Symptoms & Mood
      const symptomsQuest = trackerTemplates.find(t => t.title === "Log Symptoms & Mood");
      if (symptomsQuest) selectedTemplates.push(symptomsQuest);

      // Dynamic 2nd tracker quest based on phase
      if (phase === 'menstrual') {
        const endQuest = trackerTemplates.find(t => t.title === "Confirm Period End");
        if (endQuest) selectedTemplates.push(endQuest);
      } else {
        const startQuest = trackerTemplates.find(t => t.title === "Log Period Start");
        if (startQuest) selectedTemplates.push(startQuest);
      }
    }

    // Ensure exactly 2 tracker quests
    if (selectedTemplates.filter(t => t.category === "tracker").length < 2) {
      for (const t of trackerTemplates) {
        if (!selectedTemplates.some(st => st.id === t.id)) {
          selectedTemplates.push(t);
          if (selectedTemplates.filter(st => st.category === "tracker").length >= 2) break;
        }
      }
    }

    // ── 2. LEARNING CATEGORY (EXACTLY 1 QUEST) ──────────────────────────
    const learningTemplates = templates.filter(t => t.category === "learning");
    const { isEpisodeStarted } = await QuestService.getActiveEpisodeInfo(userId);
    if (!isEpisodeStarted) {
      const exploreQuest = learningTemplates.find(t => t.title === "Explore Episode") || learningTemplates[0];
      if (exploreQuest) selectedTemplates.push(exploreQuest);
    } else {
      const completeNodeQuest = learningTemplates.find(t => t.title === "Complete Node") || learningTemplates[0];
      if (completeNodeQuest) selectedTemplates.push(completeNodeQuest);
    }

    // ── 3. WELLBEING CATEGORY (EXACTLY 1 QUEST: Gratitude Note) ─────────
    const wellbeingTemplates = templates.filter(t => t.category === "wellbeing");
    const gratitudeQuest = wellbeingTemplates.find(t => t.title === "Gratitude Note") || wellbeingTemplates[0];
    if (gratitudeQuest) selectedTemplates.push(gratitudeQuest);

    // ── 4. CIRCLE CATEGORY (EXACTLY 1 QUEST) ─────────────────────────────
    const circleTemplates = templates.filter(t => t.category === "circle");
    if (circleTemplates.length > 0) {
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      const circlePick = circleTemplates[dayOfYear % circleTemplates.length] || circleTemplates[0];
      if (circlePick) selectedTemplates.push(circlePick);
    }

    // ── 5. CONNECT CATEGORY (EXACTLY 1 QUEST: PeerLine Connection) ──────
    const connectTemplates = templates.filter(t => t.category === "connect");
    const peerlineQuest = connectTemplates.find(t => t.title === "PeerLine Connection") || connectTemplates[0];
    if (peerlineQuest) selectedTemplates.push(peerlineQuest);

    console.log(`[QUEST_GEN] Final 6-Quest Pool selection: ${selectedTemplates.length} templates. Saving...`);

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

    // Auto-sync tracker quest completion status if already satisfied in CycleProfile
    await QuestService.syncTrackerQuestStatus(userId);

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

  static async syncTrackerQuestStatus(userId: string) {
    try {
      const profile = await prisma.cycleProfile.findUnique({ where: { userId } });
      if (!profile) return;

      if (profile.setupCompletedAt) {
        await this.evaluateCompletion(userId, { type: "cycle_setup_completed" });
      }

      if (profile.lastPeriodStart) {
        await this.evaluateCompletion(userId, { type: "period_start_marked" });
      }

      if (
        profile.lastPeriodEnd &&
        profile.lastPeriodStart &&
        new Date(profile.lastPeriodEnd).getTime() >= new Date(profile.lastPeriodStart).getTime()
      ) {
        await this.evaluateCompletion(userId, { type: "period_end_marked" });
      }

      // Check if a log has been saved or updated for today to auto-complete Log Symptoms & Mood
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const todayLog = await prisma.cycleLog.findFirst({
        where: {
          userId,
          OR: [
            { date: { gte: startOfToday } },
            { updatedAt: { gte: past24h } }
          ]
        }
      });

      if (todayLog) {
        await this.evaluateCompletion(userId, { type: "log_saved" });
      }

      // Check if a journal entry has been created or updated for today to auto-complete Gratitude Note
      const todayJournal = await prisma.journalEntry.findFirst({
        where: {
          userId,
          isDeleted: false,
          OR: [
            { createdAt: { gte: startOfToday } },
            { createdAt: { gte: past24h } }
          ]
        }
      });

      if (todayJournal) {
        await this.evaluateCompletion(userId, { type: "reflection_added" });
        await this.evaluateCompletion(userId, { type: "journal_entry_created" });
      }

      // Check if a community post has been created for today to auto-complete Connect & Share
      const todayPost = await prisma.communityPost.findFirst({
        where: {
          authorId: userId,
          createdAt: { gte: startOfToday }
        }
      });

      if (todayPost) {
        await this.evaluateCompletion(userId, { type: "post_created" });
      }

      // Check if a creative journey node has been completed today to auto-complete Explore Episode / Complete Node
      const todayCreativeNode = await prisma.creativeNodeProgress.findFirst({
        where: {
          userId,
          status: "COMPLETED",
          updatedAt: { gte: startOfToday }
        }
      });

      if (todayCreativeNode) {
        await this.evaluateCompletion(userId, { type: "node_completed" });
        await this.evaluateCompletion(userId, { type: "episode_started" });
      }
    } catch (err) {
      console.error("[QUEST] Error in syncTrackerQuestStatus:", err);
    }
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
   * Evaluates completion of active/available quests based on a domain event.
   * Automatically promotes matching available quests to accepted (zero friction).
   */
  static async evaluateCompletion(userId: string, event: { type: string, count?: number, detail?: string }): Promise<number> {
    // 1. Find accepted OR available quests for this user
    const activeQuests = await prisma.userDailyQuest.findMany({
      where: { userId, status: { in: ["accepted", "available"] } },
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

      if ((uq.questTemplate.title === "Gratitude Note" || condition.event === "reflection_added") &&
          (event.type === "reflection_added" || event.type === "journal_entry_created" || event.type === "journal_added")) {
        matches = true;
      }

      if ((uq.questTemplate.title === "Connect & Share" || uq.questTemplate.title === "Support a Friend" || condition.event === "post_created") &&
          (event.type === "post_created" || event.type === "circle_post_created" || event.type === "reply_created")) {
        matches = true;
      }

      if ((uq.questTemplate.title === "PeerLine Connection" || condition.event === "peerline_session_started") &&
          (event.type === "peerline_session_started" || event.type === "match_action")) {
        matches = true;
      }

      if ((uq.questTemplate.title === "Explore Episode" || uq.questTemplate.title === "Complete Node") &&
          (event.type === "node_completed" || event.type === "episode_started" || event.type === "episode_completed")) {
        matches = true;
      }

      if (matches) {
        // Auto-promote available quest to accepted (Zero friction auto-claim)
        if (uq.status === "available") {
          await prisma.userDailyQuest.update({
            where: { id: uq.id },
            data: { status: "accepted", acceptedAt: new Date() }
          });
        }

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
        const xp = challenge.rewardPoints;
        const coins = Math.max(25, Math.round(xp / 6));
        await GamificationService.awardPoints(
          userId,
          xp,
          coins,
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

    const xp = uq.questTemplate.pointsBase;
    const title = uq.questTemplate.title;
    let coins = Math.max(5, Math.round(xp / 6));
    if (title === "Track Your Period" || title === "PeerLine Connection") {
      coins = 10;
    } else if (title === "Log Period Start" || title === "Confirm Period End" || title === "Connect & Share" || title === "Explore Episode") {
      coins = 5;
    } else if (title === "Log Symptoms & Mood" || title === "Gratitude Note" || title === "Support a Friend") {
      coins = 3;
    } else if (title === "Complete Node") {
      coins = 2;
    }

    // 1. Mark as completed
    await prisma.userDailyQuest.update({
      where: { id: userQuestId },
      data: { 
        status: "completed", 
        completedAt: new Date(),
        pointsAwarded: xp
      },
      include: { questTemplate: true },
    });

    // Check if points/coins were already awarded during tracker_setup to prevent duplicate awards
    if (uq.questTemplate.title === "Track Your Period" || (uq.questTemplate.completionCondition as any)?.event === "cycle_setup_completed") {
      const setupLedger = await prisma.pointsLedger.findFirst({
        where: { userId, sourceType: "tracker_setup" },
      });
      if (setupLedger) {
        return;
      }
    }

    // 2. Award XP & Spendable Coins
    await GamificationService.awardPoints(
      userId,
      xp,
      coins,
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

  /**
   * Rerolls an uncompleted daily quest with another available template of the same category.
   * Costs 50 Coins (or free if user has a reroll token in inventory).
   */
  static async rerollQuest(userId: string, userQuestId: string) {
    const uq = await prisma.userDailyQuest.findFirst({
      where: { id: userQuestId, userId },
      include: { questTemplate: true }
    });

    if (!uq) throw new AppError("Quest not found", 404);
    if (uq.status === "completed") throw new AppError("Cannot reroll a completed quest", 400);

    // Check if user has reroll token in inventory
    const rerollToken = await prisma.userInventory.findUnique({
      where: { userId_itemType_itemId: { userId, itemType: "reroll_token", itemId: "reroll" } }
    });

    if (rerollToken && rerollToken.quantity > 0) {
      await prisma.userInventory.update({
        where: { id: rerollToken.id },
        data: { quantity: { decrement: 1 } }
      });
    } else {
      // Deduct 50 spendable coins
      await GamificationService.spendCoins(userId, 50, "reroll_token", "reroll", "Quest Reroll Purchase");
    }

    // Find unused template of same category
    const activeDailyQuests = await prisma.userDailyQuest.findMany({
      where: { userId },
      select: { questTemplateId: true }
    });
    const usedTemplateIds = activeDailyQuests.map(q => q.questTemplateId);

    const alternativeTemplate = await prisma.questTemplate.findFirst({
      where: {
        category: uq.questTemplate.category,
        isActive: true,
        id: { notIn: usedTemplateIds }
      }
    });

    if (!alternativeTemplate) {
      // Fallback: pick any unused active template
      const fallbackTemplate = await prisma.questTemplate.findFirst({
        where: { isActive: true, id: { notIn: usedTemplateIds } }
      });
      if (!fallbackTemplate) throw new AppError("No available replacement quests found", 400);

      const updated = await prisma.userDailyQuest.update({
        where: { id: userQuestId },
        data: { questTemplateId: fallbackTemplate.id, status: "available", progressJson: {} },
        include: { questTemplate: true }
      });
      return QuestService.formatUserQuest(userId, updated);
    }

    const updated = await prisma.userDailyQuest.update({
      where: { id: userQuestId },
      data: { questTemplateId: alternativeTemplate.id, status: "available", progressJson: {} },
      include: { questTemplate: true }
    });

    return QuestService.formatUserQuest(userId, updated);
  }

  /**
   * Creative Micro-Activity: Gigi's Daily Vibe Check (30s Emotion & Energy Slider)
   * Awards 30 XP + 20 Spendable Coins.
   */
  static async submitVibeCheck(userId: string, data: { moodScore: number; energyScore: number; primaryEmotion?: string }) {
    const xp = 30;
    const coins = 20;

    const result = await GamificationService.awardPoints(
      userId,
      xp,
      coins,
      "vibe_check",
      undefined,
      `Completed Gigi's Daily Vibe Check (${data.primaryEmotion || "Balanced"})`
    );

    // Evaluate associated quests
    await this.evaluateCompletion(userId, { type: "vibe_check_completed" });

    return {
      ...result,
      success: true,
      affirmation: `Your energy is valid today! Nurture yourself with quiet moments.`,
    };
  }

  /**
   * Creative Micro-Activity: Quick Spark Quiz (3-Question Trivia Blitz)
   * Awards 50 XP + 35 Spendable Coins.
   */
  static async submitQuickSpark(userId: string, data: { score: number; totalQuestions: number }) {
    const xp = Math.min(50, Math.round((data.score / (data.totalQuestions || 3)) * 50));
    const coins = Math.min(35, Math.round((data.score / (data.totalQuestions || 3)) * 35));

    const result = await GamificationService.awardPoints(
      userId,
      xp,
      coins,
      "quick_spark",
      undefined,
      `Completed Quick Spark Trivia (${data.score}/${data.totalQuestions || 3})`
    );

    await this.evaluateCompletion(userId, { type: "quick_spark_completed" });

    return {
      ...result,
      success: true,
    };
  }

  /**
   * Unlocks Mystery Discovery Chest when 3/3 daily quests are completed.
   */
  static async openMysteryChest(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedQuestsToday = await prisma.userDailyQuest.count({
      where: {
        userId,
        status: "completed",
        completedAt: { gte: startOfDay }
      }
    });

    if (completedQuestsToday < 3) {
      throw new AppError("Complete at least 3 daily quests to unlock the Mystery Discovery Chest!", 400);
    }

    const xp = 150;
    const coins = 100;

    const result = await GamificationService.awardPoints(
      userId,
      xp,
      coins,
      "mystery_chest",
      undefined,
      "Opened Daily Mystery Discovery Chest!"
    );

    // Add 1 Streak Freeze to Inventory as chest bonus
    await prisma.userInventory.upsert({
      where: { userId_itemType_itemId: { userId, itemType: "streak_freeze", itemId: "streak_freeze" } },
      update: { quantity: { increment: 1 } },
      create: { userId, itemType: "streak_freeze", itemId: "streak_freeze", quantity: 1 }
    });

    return {
      ...result,
      success: true,
      itemReward: "1x Streak Freeze Protection",
    };
  }

  /**
   * Purchases a Streak Freeze Token for 200 Coins.
   */
  static async buyStreakFreeze(userId: string) {
    return await GamificationService.spendCoins(
      userId,
      200,
      "streak_freeze",
      "streak_freeze",
      "Purchased 1x Streak Freeze Protection Token"
    );
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

    const latestProgress = await prisma.creativeNodeProgress.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { episode: { include: { journey: true } } },
    });

    let activeJourneyId: string | null = null;
    let activeEpisode: any = null;

    if (latestProgress) {
      activeJourneyId = latestProgress.episode.journeyId;
      activeJourneyTitle = latestProgress.episode.journey.title;

      const incompleteEpisode = await prisma.creativeEpisode.findFirst({
        where: {
          journeyId: activeJourneyId,
          isActive: true,
          nodeProgresses: {
            none: { userId, status: "COMPLETED" }
          }
        },
        orderBy: { order: "asc" }
      });

      if (incompleteEpisode) {
        activeEpisode = incompleteEpisode;
      } else {
        const nextJourney = await prisma.creativeJourney.findFirst({
          where: {
            isActive: true,
            id: { not: activeJourneyId }
          },
          orderBy: { createdAt: "asc" }
        });
        if (nextJourney) {
          activeJourneyId = nextJourney.id;
          activeJourneyTitle = nextJourney.title;
          activeEpisode = await prisma.creativeEpisode.findFirst({
            where: { journeyId: activeJourneyId, isActive: true },
            orderBy: { order: "asc" }
          });
        }
      }
    } else {
      const firstJourney = await prisma.creativeJourney.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" }
      });
      if (firstJourney) {
        activeJourneyId = firstJourney.id;
        activeJourneyTitle = firstJourney.title;
        activeEpisode = await prisma.creativeEpisode.findFirst({
          where: { journeyId: activeJourneyId, isActive: true },
          orderBy: { order: "asc" }
        });
      }
    }

    let isEpisodeStarted = false;
    if (activeEpisode) {
      activeEpisodeTitle = activeEpisode.title;
      const completedNodeCount = await prisma.creativeNodeProgress.count({
        where: { userId, episodeId: activeEpisode.id, status: "COMPLETED" }
      });

      if (completedNodeCount > 0) {
        isEpisodeStarted = true;
      }

      if (completedNodeCount >= 4) {
        sequenceState = "reflection";
      } else if (completedNodeCount >= 2) {
        sequenceState = "quiz";
      } else {
        sequenceState = "read";
      }
    }

    return { activeEpisodeTitle, activeJourneyTitle, sequenceState, isEpisodeStarted };
  }

  static async formatUserQuest(userId: string, q: any) {
    if (!q || !q.questTemplate) return q;
    
    const t = q.questTemplate;
    if (t.title !== "Explore Episode" && t.title !== "Complete Node" && t.title !== "Quiz Challenge" && t.title !== "Wisdom Journal") {
      return q;
    }

    try {
      const { activeEpisodeTitle, activeJourneyTitle } = await QuestService.getActiveEpisodeInfo(userId);
      let title = t.title;
      let description = t.description;

      if (title === "Explore Episode") {
        title = `Explore: ${activeEpisodeTitle}`;
        description = `Read the next episode "${activeEpisodeTitle}" in your "${activeJourneyTitle}" journey.`;
      } else if (title === "Complete Node") {
        title = `Complete Node: ${activeEpisodeTitle}`;
        description = `Continue reading and complete the active node in "${activeEpisodeTitle}".`;
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
