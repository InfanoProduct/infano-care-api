import { PrismaClient, MatchStatus } from "@prisma/client";
import { logger } from "../../config/logger.js";
import { emitFriendMatch } from "./friends.socket.js";

const prisma = new PrismaClient();

// ── Vibe tag categories for weighted compatibility scoring ─────────────────────
const VIBE_CATEGORIES: Record<string, string[]> = {
  Interests: ["Books", "Art", "Music", "Sport", "Gaming", "Cooking", "Nature", "Fashion", "Tech", "Dance", "Writing", "Film"],
  Personality: ["Introvert", "Extrovert", "Homebody", "Adventurer", "Thinker", "Maker", "Empath", "Leader"],
  Values: ["Kindness", "Honesty", "Loyalty", "Creativity", "Justice", "Humour", "Growth", "Quiet"],
  LifeStage: ["Studying", "Starting work", "Gap year", "Sports focus", "Arts focus"],
};

const CATEGORY_WEIGHTS: Record<string, number> = {
  Interests: 0.20,
  Personality: 0.25,
  Values: 0.25,
  LifeStage: 0.15,
};

const INTENT_WEIGHT = 0.10;
const CIRCLES_WEIGHT = 0.03;
const EVENTS_WEIGHT = 0.02;

function getCategoryForTag(tag: string): string | null {
  for (const [cat, tags] of Object.entries(VIBE_CATEGORIES)) {
    if (tags.includes(tag)) return cat;
  }
  return null;
}

function calcCompatibility(
  userTags: string[],
  targetTags: string[],
  userIntent: string[],
  targetIntent: string[],
  sharedCircles: number,
  sharedEvents: number,
): number {
  let score = 0;

  // Vibe tag scoring per category
  for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const userCatTags = userTags.filter(t => getCategoryForTag(t) === cat);
    const targetCatTags = targetTags.filter(t => getCategoryForTag(t) === cat);
    const union = new Set([...userCatTags, ...targetCatTags]);
    if (union.size === 0) continue;
    const intersection = userCatTags.filter(t => targetCatTags.includes(t));
    score += weight * (intersection.length / union.size);
  }

  // Intent alignment
  const intentUnion = new Set([...userIntent, ...targetIntent]);
  if (intentUnion.size > 0) {
    const intentIntersection = userIntent.filter(i => targetIntent.includes(i));
    score += INTENT_WEIGHT * (intentIntersection.length / intentUnion.size);
  }

  // Circles & events bonus (fixed small boost per shared item)
  score += CIRCLES_WEIGHT * Math.min(sharedCircles, 3) / 3;
  score += EVENTS_WEIGHT * Math.min(sharedEvents, 3) / 3;

  // Cap at 99, floor at 1
  return Math.min(99, Math.max(1, Math.round(score * 100)));
}

function compatibilityLabel(score: number): string {
  if (score < 40) return "Some things in common";
  if (score < 66) return "Good vibe match";
  if (score < 81) return "Strong vibe match";
  return "Kindred spirit";
}

function getLocationLabel(userGeohash: string | null, targetGeohash: string | null, radius: string): string {
  if (!userGeohash || !targetGeohash) return "Nearby";
  if (userGeohash.substring(0, 5) === targetGeohash.substring(0, 5)) return "Nearby";
  if (userGeohash.substring(0, 4) === targetGeohash.substring(0, 4)) return "Same city";
  if (userGeohash.substring(0, 3) === targetGeohash.substring(0, 3)) return "~50km away";
  return "Across the country";
}

function getAgeBand(birthYear: number | null): string {
  if (!birthYear) return "18+";
  const age = new Date().getFullYear() - birthYear;
  if (age <= 13) return "10-13";
  if (age <= 15) return "14-15";
  if (age <= 17) return "16-17";
  return "18+";
}

function getBirthYearRangeForBand(band: string): { gte: number; lte: number } {
  const currentYear = new Date().getFullYear();
  switch (band) {
    case "10-13": return { gte: currentYear - 13, lte: currentYear - 10 };
    case "14-15": return { gte: currentYear - 15, lte: currentYear - 14 };
    case "16-17": return { gte: currentYear - 17, lte: currentYear - 16 };
    default:      return { gte: currentYear - 50, lte: currentYear - 18 };
  }
}

// ── Radius → geohash prefix length mapping ────────────────────────────────────
function geohashPrefixForRadius(radius: string): number {
  switch (radius) {
    case "neighbourhood": return 6;
    case "city":          return 4;
    case "50km":          return 3;
    case "country":       return 2;
    default:              return 4;
  }
}

export class FriendsService {
  // ── Profile upsert ─────────────────────────────────────────────────────────
  async getProfile(userId: string) {
    return prisma.friendProfile.findUnique({ where: { userId } });
  }

  async optInAndSetupProfile(userId: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const age = new Date().getFullYear() - (user.birthYear || 0);
    if (age < 15) {
      throw new Error("Connect+ Friends is only available for users 15 and older.");
    }

    return await prisma.friendProfile.upsert({
      where: { userId },
      update: {
        ...data,
        isActive: true,
      },
      create: {
        ...data,
        userId,
        isActive: true,
        status: "ACTIVE",
      },
    });
  }

  async deleteProfile(userId: string) {
    const profile = await prisma.friendProfile.findUnique({ where: { userId } });
    if (!profile) return;

    // Delete all matches (which cascades to messages)
    await prisma.friendMatch.deleteMany({
      where: {
        OR: [
          { userId: profile.id },
          { targetId: profile.id }
        ]
      }
    });

    // Delete the profile itself
    await prisma.friendProfile.delete({ where: { id: profile.id } });
  }

  async toggleDiscovery(userId: string, isActive: boolean) {
    return await prisma.friendProfile.update({
      where: { userId },
      data: { isActive }
    });
  }

  private async placeholderModeration(data: any): Promise<any> {
    if (data.nickname && data.nickname.toLowerCase().includes("admin")) {
      return "PENDING_REVIEW";
    }
    return "ACTIVE";
  }

  // ── Discovery ──────────────────────────────────────────────────────────────
  async discoverProfiles(userId: string, batchSize: number, radius: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { friendProfile: true },
    });
    if (!user || !user.friendProfile) throw new Error("User profile not found");

    const age = new Date().getFullYear() - (user.birthYear || 0);
    if (age < 15) {
      throw new Error("Connect+ Friends is only available for users 15 and older.");
    }

    const ageBand = getAgeBand(user.birthYear);
    const birthYearRange = getBirthYearRangeForBand(ageBand);

    const userGeohash = user.friendProfile.geohash || 'tdr1y'; // Default fallback
    const prefixLen = geohashPrefixForRadius(radius);
    const hashPrefix = userGeohash.substring(0, prefixLen);

    // Exclude already-swiped profiles
    const swiped = await prisma.friendMatch.findMany({
      where: { userId: user.friendProfile.id },
      select: { targetId: true },
    });
    const excludedIds = swiped.map(m => m.targetId);
    excludedIds.push(user.friendProfile.id); // exclude self

    const candidates = await prisma.friendProfile.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        id: { notIn: excludedIds },
        ...(hashPrefix ? { geohash: { startsWith: hashPrefix } } : {}),
        user: {
          birthYear: {
            gte: birthYearRange.gte,
            lte: birthYearRange.lte,
          }
        }
      },
      include: {
        user: {
          select: {
            birthYear: true,
            profile: { select: { displayName: true } },
          },
        },
      },
      take: batchSize,
    });

    // Attach compatibility scores and labels
    return candidates.map(p => {
      const score = calcCompatibility(
        user.friendProfile!.vibeTags,
        p.vibeTags,
        user.friendProfile!.intent,
        p.intent,
        0, // TODO: real circle/event overlap
        0,
      );
      return {
        id: p.id,
        userId: p.userId,
        nickname: p.nickname ?? p.user.profile?.displayName ?? "Anonymous",
        ageBand: getAgeBand(p.user.birthYear),
        locationLabel: getLocationLabel(userGeohash, p.geohash, radius),
        vibeTags: p.vibeTags,
        intent: p.intent,
        photoUrl: p.photoUrl,
        discoveryRadius: p.discoveryRadius,
        compatibilityScore: score,
        compatibilityLabel: compatibilityLabel(score),
        sharedCircles: 0,
        sharedEvents: 0,
      };
    });
  }

  // ── Saved profiles ─────────────────────────────────────────────────────────
  async getSavedProfiles(userId: string) {
    const userProfile = await prisma.friendProfile.findUnique({ where: { userId } });
    if (!userProfile) return [];

    const saved = await (prisma as any).friendMatch.findMany({
      where: { userId: userProfile.id, status: "SAVED" },
      include: {
        target: {
          include: {
            user: { select: { profile: { select: { displayName: true } } } },
          },
        },
      },
    });

    return saved.map((m: any) => ({
      id: m.target.id,
      userId: m.target.userId,
      nickname: m.target.nickname ?? m.target.user.profile?.displayName ?? "Anonymous",
      vibeTags: m.target.vibeTags,
      intent: m.target.intent,
      photoUrl: m.target.photoUrl,
    }));
  }

  // ── Swipe ──────────────────────────────────────────────────────────────────
  async recordSwipe(userId: string, targetId: string, action: "LIKE" | "PASS" | "SUPER_CONNECT" | "SAVE") {
    const userProfile = await prisma.friendProfile.findUnique({ where: { userId } });
    if (!userProfile) throw new Error("Friend profile not found");

    if (action === "SAVE") {
      // Store as SAVED status (raw SQL since Prisma enum may not have it yet)
      await prisma.$executeRawUnsafe(
        `INSERT INTO "FriendMatch" ("id","userId","targetId","status","createdAt","updatedAt")
         VALUES (gen_random_uuid()::text, $1, $2, 'SAVED', now(), now())
         ON CONFLICT ("userId","targetId") DO UPDATE SET "status"='SAVED', "updatedAt"=now()`,
        userProfile.id, targetId
      );
      return { result: "saved" };
    }

    if (action === "PASS") {
      await prisma.friendMatch.upsert({
        where: { userId_targetId: { userId: userProfile.id, targetId } },
        create: { userId: userProfile.id, targetId, status: MatchStatus.REJECTED },
        update: { status: MatchStatus.REJECTED },
      });
      return { result: "no_match" };
    }

    // LIKE or SUPER_CONNECT — check for mutual match
    const existingOpposite = await prisma.friendMatch.findUnique({
      where: { userId_targetId: { userId: targetId, targetId: userProfile.id } },
    });

    if (existingOpposite && existingOpposite.status === MatchStatus.PENDING) {
      // Mutual match!
      await prisma.friendMatch.update({
        where: { id: existingOpposite.id },
        data: { status: MatchStatus.MATCHED },
      });
      const match = await prisma.friendMatch.upsert({
        where: { userId_targetId: { userId: userProfile.id, targetId } },
        create: { userId: userProfile.id, targetId, status: MatchStatus.MATCHED },
        update: { status: MatchStatus.MATCHED },
      });

      // Emit to both users
      const targetProfile = await prisma.friendProfile.findUnique({ where: { id: targetId }});
      if (targetProfile) {
        const sharedTags = userProfile.vibeTags.filter(t => targetProfile.vibeTags.includes(t));
        const score = calcCompatibility(userProfile.vibeTags, targetProfile.vibeTags, userProfile.intent, targetProfile.intent, 0, 0);

        emitFriendMatch(userProfile.userId, {
          type: 'friend_match',
          match_id: match.id,
          profile: {
            id: targetProfile.id,
            userId: targetProfile.userId,
            nickname: targetProfile.nickname,
            photoUrl: targetProfile.photoUrl,
            vibeTags: targetProfile.vibeTags
          },
          compatibility_score: score,
          shared_tags: sharedTags
        });

        emitFriendMatch(targetProfile.userId, {
          type: 'friend_match',
          match_id: existingOpposite.id,
          profile: {
            id: userProfile.id,
            userId: userProfile.userId,
            nickname: userProfile.nickname,
            photoUrl: userProfile.photoUrl,
            vibeTags: userProfile.vibeTags
          },
          compatibility_score: score,
          shared_tags: sharedTags
        });
      }

      return { result: "match", matchId: match.id };
    }

    // Pending (LIKE / SUPER_CONNECT)
    const match = await prisma.friendMatch.upsert({
      where: { userId_targetId: { userId: userProfile.id, targetId } },
      create: { userId: userProfile.id, targetId, status: MatchStatus.PENDING },
      update: { status: MatchStatus.PENDING },
    });
    return { result: "pending", matchId: match.id };
  }

  // ── Matches & Unmatch ──────────────────────────────────────────────────────
  async getMatches(userId: string, statusFilter?: string) {
    const userProfile = await prisma.friendProfile.findUnique({ where: { userId } });
    if (!userProfile) return [];

    const matches = await prisma.friendMatch.findMany({
      where: { userId: userProfile.id, status: MatchStatus.MATCHED },
      include: {
        target: {
          include: {
            user: { select: { profile: { select: { displayName: true } } } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
    });

    return Promise.all(matches.map(async m => {
      const unreadCount = await prisma.friendMessage.count({
        where: {
          matchId: m.id,
          senderId: { not: userId },
          isRead: false
        }
      });

      return {
        id: m.id,
        matched_at: m.updatedAt,
        profile: {
          id: m.target.id,
          userId: m.target.userId,
          nickname: m.target.nickname ?? m.target.user?.profile?.displayName ?? "Anonymous",
          vibeTags: m.target.vibeTags,
          intent: m.target.intent,
          photoUrl: m.target.photoUrl,
        },
        chat_id: m.id,
        last_message: m.messages[0]?.content ?? null,
        unread_count: unreadCount
      };
    }));
  }

  async unmatch(userId: string, matchId: string) {
    const userProfile = await prisma.friendProfile.findUnique({ where: { userId } });
    if (!userProfile) throw new Error("Friend profile not found");

    const match = await prisma.friendMatch.findUnique({ where: { id: matchId } });
    if (!match || match.userId !== userProfile.id) throw new Error("Match not found");

    // Soft delete by updating status (if UNMATCHED enum exists) or fallback to raw update if needed
    // Assuming we can use REJECTED or add UNMATCHED enum. We'll use a raw update for 'UNMATCHED'
    // since prisma enum might not contain it if not generated
    await prisma.$executeRawUnsafe(
      `UPDATE "FriendMatch" SET "status"='UNMATCHED', "updatedAt"=now() WHERE "id" = $1`,
      matchId
    );
    
    // Also update the opposite match side
    await prisma.$executeRawUnsafe(
      `UPDATE "FriendMatch" SET "status"='UNMATCHED', "updatedAt"=now() WHERE "userId" = $1 AND "targetId" = $2`,
      match.targetId, match.userId
    );

    return { unmatched: true };
  }

  // ── Legacy: nearby profiles (kept for backward compat) ────────────────────
  async getNearbyPotentials(userId: string) {
    return this.discoverProfiles(userId, 20, "city");
  }
}
