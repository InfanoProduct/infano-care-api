import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class GamificationService {
  /**
   * Awards points to a user and records it in the ledger.
   * Also updates the denormalized total points and checks for level-up.
   */
  static async awardPoints(
    userId: string, 
    points: number, 
    sourceType: string, 
    sourceId?: string, 
    description?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create ledger entry
      await tx.pointsLedger.create({
        data: {
          userId,
          points,
          sourceType,
          sourceId,
          description,
        },
      });

      // 2. Update user level total
      const level = await tx.userLevel.upsert({
        where: { userId },
        update: {
          pointsTotal: { increment: points },
        },
        create: {
          userId,
          pointsTotal: points,
          currentLevel: 1,
        },
      });

      // 3. Check for Level Up
      // Thresholds: Level 1: 0, Level 2: 500, Level 3: 1500, Level 4: 3500, Level 5: 7000...
      const thresholds = [0, 500, 1500, 3500, 7000, 12000, 20000, 32000, 50000, 75000];
      let newLevel = level.currentLevel;
      for (let i = thresholds.length - 1; i >= 0; i--) {
        const threshold = thresholds[i];
        if (threshold !== undefined && level.pointsTotal >= threshold) {
          newLevel = i + 1;
          break;
        }
      }

      if (newLevel > level.currentLevel) {
        await tx.userLevel.update({
          where: { userId },
          data: {
            currentLevel: newLevel,
            lastLevelUpAt: new Date(),
          },
        });
        
        // Also update the Profile for backward compatibility/quick display
        await tx.profile.update({
          where: { userId },
          data: {
            totalPoints: level.pointsTotal,
            bloomLevel: newLevel,
          },
        });

        return { pointsEarned: points, leveledUp: true, newLevel };
      }

      // Update profile total points even if no level up
      await tx.profile.update({
        where: { userId },
        data: { totalPoints: level.pointsTotal },
      });

      return { pointsEarned: points, leveledUp: false };
    });
  }

  /**
   * Updates the user's log streak.
   */
  static async updateLogStreak(userId: string, isContinuous: boolean) {
    const streak = await prisma.userStreak.upsert({
      where: { userId },
      update: {
        logStreakCurrent: isContinuous ? { increment: 1 } : 1,
        updatedAt: new Date(),
      },
      create: {
        userId,
        logStreakCurrent: 1,
        logStreakLongest: 1,
      },
    });

    if (streak.logStreakCurrent > streak.logStreakLongest) {
      await prisma.userStreak.update({
        where: { userId },
        data: { logStreakLongest: streak.logStreakCurrent },
      });
    }

    return streak;
  }

  static async getUserProgress(userId: string) {
    const [level, streak, badges] = await Promise.all([
      prisma.userLevel.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userBadge.count({ where: { userId } }),
    ]);

    return {
      pointsTotal: level?.pointsTotal || 0,
      currentLevel: level?.currentLevel || 1,
      lastLevelUpAt: level?.lastLevelUpAt,
      logStreak: streak?.logStreakCurrent || 0,
      badgesEarned: badges,
    };
  }
}
