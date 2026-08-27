import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

// Calibrated Level XP Thresholds
export const LEVEL_THRESHOLDS = [0, 3000, 8000, 18000, 35000, 60000, 100000, 150000, 220000, 300000];
export const LEVEL_BONUS_COINS = [0, 30, 50, 75, 100, 150, 200, 300, 400, 500];

export class GamificationService {
  /**
   * Awards Lifetime XP (points) and Spendable Coins to a user.
   * Updates PointsLedger, CoinLedger, UserLevel (pointsTotal, coinsBalance, coinsTotal) and Profile.
   */
  static async awardPoints(
    userId: string, 
    points: number, 
    coins: number = Math.max(1, Math.round(points / 5)), 
    sourceType: string = "activity", 
    sourceId?: string, 
    description?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Create Points Ledger entry
      if (points > 0) {
        await tx.pointsLedger.create({
          data: {
            userId,
            points,
            sourceType,
            sourceId,
            description: description || `Earned ${points} XP`,
          },
        });
      }

      // 2. Create Coin Ledger entry if coins > 0
      if (coins > 0) {
        await tx.coinLedger.create({
          data: {
            userId,
            amount: coins,
            type: sourceType,
            referenceId: sourceId,
            description: description || `Earned ${coins} Coins`,
          },
        });
      }

      // 3. Update user level balances
      const level = await tx.userLevel.upsert({
        where: { userId },
        update: {
          pointsTotal: { increment: points },
          coinsBalance: { increment: coins },
          coinsTotal: { increment: coins },
        },
        create: {
          userId,
          pointsTotal: points,
          coinsBalance: coins,
          coinsTotal: coins,
          currentLevel: 1,
        },
      });

      // 4. Check for Level Up
      let newLevel = level.currentLevel;
      for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
        const threshold = LEVEL_THRESHOLDS[i];
        if (threshold !== undefined && level.pointsTotal >= threshold) {
          newLevel = i + 1;
          break;
        }
      }

      let levelBonusCoinsAwarded = 0;
      if (newLevel > level.currentLevel) {
        const levelBonusCoins = LEVEL_BONUS_COINS[newLevel - 1] || 50;
        levelBonusCoinsAwarded = levelBonusCoins;

        // Apply Level Up & Bonus Coins
        await tx.userLevel.update({
          where: { userId },
          data: {
            currentLevel: newLevel,
            coinsBalance: { increment: levelBonusCoins },
            coinsTotal: { increment: levelBonusCoins },
            lastLevelUpAt: new Date(),
          },
        });

        // Record bonus coin transaction
        await tx.coinLedger.create({
          data: {
            userId,
            amount: levelBonusCoins,
            type: "level_up_bonus",
            description: `Level Up Bonus for reaching Level ${newLevel}`,
          },
        });

        // Update Profile
        await tx.profile.update({
          where: { userId },
          data: {
            totalPoints: level.pointsTotal,
            totalCoins: level.coinsBalance + levelBonusCoins,
            bloomLevel: newLevel,
          },
        });

        return { 
          pointsEarned: points, 
          coinsEarned: coins + levelBonusCoinsAwarded, 
          leveledUp: true, 
          newLevel,
          bonusCoins: levelBonusCoinsAwarded 
        };
      }

      // Update profile total points & coins even if no level up
      await tx.profile.update({
        where: { userId },
        data: {
          totalPoints: level.pointsTotal,
          totalCoins: level.coinsBalance,
        },
      });

      return { pointsEarned: points, coinsEarned: coins, leveledUp: false };
    });
  }

  /**
   * Spend coins from user's spendable balance for shop items, streak freezes, or quest rerolls.
   */
  static async spendCoins(
    userId: string,
    amount: number,
    itemType: string,
    itemId: string,
    description: string
  ) {
    if (amount <= 0) throw new AppError("Invalid coin amount", 400);

    return await prisma.$transaction(async (tx) => {
      const level = await tx.userLevel.findUnique({ where: { userId } });
      if (!level || level.coinsBalance < amount) {
        throw new AppError(`Insufficient coins balance. Required: ${amount}, Available: ${level?.coinsBalance || 0}`, 400);
      }

      // 1. Deduct coins balance
      const updatedLevel = await tx.userLevel.update({
        where: { userId },
        data: {
          coinsBalance: { decrement: amount },
        },
      });

      // 2. Record negative coin ledger transaction
      await tx.coinLedger.create({
        data: {
          userId,
          amount: -amount,
          type: `spend_${itemType}`,
          referenceId: itemId,
          description,
        },
      });

      // 3. Add item to user inventory
      const inventory = await tx.userInventory.upsert({
        where: { userId_itemType_itemId: { userId, itemType, itemId } },
        update: { quantity: { increment: 1 } },
        create: { userId, itemType, itemId, quantity: 1 },
      });

      // 4. Sync profile
      await tx.profile.update({
        where: { userId },
        data: { totalCoins: updatedLevel.coinsBalance },
      });

      return { success: true, coinsBalance: updatedLevel.coinsBalance, inventory };
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
    const [level, streak, badges, inventory] = await Promise.all([
      prisma.userLevel.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userBadge.count({ where: { userId } }),
      prisma.userInventory.findMany({ where: { userId } }),
    ]);

    const currentLvl = level?.currentLevel || 1;
    const nextLevelXP = LEVEL_THRESHOLDS[currentLvl] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

    return {
      pointsTotal: level?.pointsTotal || 0,
      coinsBalance: level?.coinsBalance || 0,
      coinsTotal: level?.coinsTotal || 0,
      currentLevel: currentLvl,
      nextLevelXP,
      lastLevelUpAt: level?.lastLevelUpAt,
      logStreak: streak?.logStreakCurrent || 0,
      badgesEarned: badges,
      inventory,
    };
  }
}
