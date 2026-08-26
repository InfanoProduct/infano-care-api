import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { GamificationService } from "../quest/gamification.service.js";

// ── Seeded Shuffle Utility ────────────────────────────────────────────────────
// Uses a deterministic LCG PRNG so the same userId+episodeId always produces
// the same shuffle — stable across sessions.
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = seededRandom(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

// ── Energy-tag balancer ───────────────────────────────────────────────────────
// Prevents more than 2 consecutive nodes of the same energyTag (active/reflective)
function balanceEnergyTags(nodes: any[]): any[] {
  const result: any[] = [];
  const remaining = [...nodes];
  while (remaining.length > 0) {
    const lastTwo = result.slice(-2);
    const lastTwoTags = lastTwo.map((n) => n.energyTag ?? "reflective");
    const allSame = lastTwo.length === 2 && lastTwoTags.every((t) => t === lastTwoTags[0]);

    if (allSame) {
      // Must pick a different-tag node next
      const oppositeTag = lastTwoTags[0] === "active" ? "reflective" : "active";
      const idx = remaining.findIndex((n) => (n.energyTag ?? "reflective") === oppositeTag);
      if (idx !== -1) {
        const [picked] = remaining.splice(idx, 1);
        result.push(picked);
        continue;
      }
    }
    // Otherwise take the first remaining node
    result.push(remaining.shift());
  }
  return result;
}

// ── Service ───────────────────────────────────────────────────────────────────

let cachedJourneys: any[] | null = null;
let cachedJourneysTime = 0;

export class CreativeJourneyService {
  // ── Journeys ──────────────────────────────────────────────────────────────

  static async listJourneys() {
    const now = Date.now();
    if (cachedJourneys && now - cachedJourneysTime < 300000) {
      return cachedJourneys;
    }
    const journeys = await prisma.creativeJourney.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: { episodes: { where: { isActive: true }, orderBy: { order: "asc" } } },
    });
    cachedJourneys = journeys;
    cachedJourneysTime = now;
    return journeys;
  }

  static async getJourney(id: string) {
    const journey = await prisma.creativeJourney.findUnique({
      where: { id },
      include: { episodes: { where: { isActive: true }, orderBy: { order: "asc" } } },
    });
    if (!journey) throw new AppError("Creative Journey not found", 404);
    return journey;
  }

  static async getEpisode(id: string) {
    const episode = await prisma.creativeEpisode.findUnique({ where: { id } });
    if (!episode) throw new AppError("Episode not found", 404);
    return episode;
  }

  // ── Seeded Node Order ─────────────────────────────────────────────────────
  // Returns the stable shuffled node order for a user/episode pair.
  // On first call: computes + persists. On subsequent calls: returns persisted order (recomputed if stale).
  static async getOrCreateNodeOrder(userId: string, episodeId: string) {
    const episode = await prisma.creativeEpisode.findUnique({ where: { id: episodeId } });
    if (!episode) throw new AppError("Episode not found", 404);

    const allNodes: any[] = (episode.nodes as any[]) ?? [];
    if (allNodes.length === 0) return [];

    // Canonical order is the curated sequence defined in episode.nodes
    const canonicalOrder = allNodes.map((n) => n.nodeId);

    // Check if we already have a persisted order
    const progressList = await prisma.creativeNodeProgress.findMany({
      where: { userId, episodeId },
      select: { nodeOrder: true },
    });
    const existing = progressList.find((p) => p.nodeOrder != null);

    if (existing?.nodeOrder) {
      const order = existing.nodeOrder as string[];
      const isStale =
        order.length !== canonicalOrder.length ||
        !order.every((id, idx) => id === canonicalOrder[idx]);
      if (!isStale) {
        return order;
      }
    }

    // Persist canonical order on the first node progress row
    const firstNodeId = canonicalOrder[0];
    if (firstNodeId) {
      await prisma.creativeNodeProgress.upsert({
        where: { userId_episodeId_nodeId: { userId, episodeId, nodeId: firstNodeId } },
        update: { nodeOrder: canonicalOrder, status: "UNLOCKED" },
        create: { userId, episodeId, nodeId: firstNodeId, status: "UNLOCKED", nodeOrder: canonicalOrder },
      });
    }

    return canonicalOrder;
  }

  // ── Node Progress ─────────────────────────────────────────────────────────

  static async getEpisodeProgress(userId: string, episodeId: string) {
    const nodeOrder = await CreativeJourneyService.getOrCreateNodeOrder(userId, episodeId);
    const validSet = new Set(nodeOrder);

    const progressList = await prisma.creativeNodeProgress.findMany({
      where: { userId, episodeId },
    });

    // Delete obsolete progress rows referencing old/removed node IDs
    const obsoleteIds = progressList.filter((p) => !validSet.has(p.nodeId)).map((p) => p.id);
    if (obsoleteIds.length > 0) {
      await prisma.creativeNodeProgress.deleteMany({
        where: { id: { in: obsoleteIds } },
      });
    }

    const validProgress = progressList.filter((p) => validSet.has(p.nodeId));
    const progressMap = new Map<string, any>();
    for (const p of validProgress) {
      progressMap.set(p.nodeId, p);
    }

    // Find highest completed index in nodeOrder
    let maxCompletedIndex = -1;
    for (let i = 0; i < nodeOrder.length; i++) {
      if (progressMap.get(nodeOrder[i])?.status === "COMPLETED") {
        maxCompletedIndex = i;
      }
    }

    // Backfill any preceding nodes as COMPLETED if a later node was completed
    if (maxCompletedIndex > 0) {
      for (let i = 0; i < maxCompletedIndex; i++) {
        const id = nodeOrder[i];
        const prog = progressMap.get(id);
        if (prog?.status !== "COMPLETED") {
          const completedRow = await prisma.creativeNodeProgress.upsert({
            where: { userId_episodeId_nodeId: { userId, episodeId, nodeId: id } },
            update: { status: "COMPLETED", xpEarned: 10 },
            create: { userId, episodeId, nodeId: id, status: "COMPLETED", xpEarned: 10 },
          });
          progressMap.set(id, completedRow);
        }
      }
    }

    // Ensure first node is at least UNLOCKED if no nodes completed yet
    if (nodeOrder.length > 0) {
      const firstId = nodeOrder[0];
      const firstProg = progressMap.get(firstId);
      if (!firstProg) {
        const firstRow = await prisma.creativeNodeProgress.upsert({
          where: { userId_episodeId_nodeId: { userId, episodeId, nodeId: firstId } },
          update: { status: "UNLOCKED" },
          create: { userId, episodeId, nodeId: firstId, status: "UNLOCKED" },
        });
        progressMap.set(firstId, firstRow);
      }
    }

    // Ensure linear progression: unlock node i if node i-1 is COMPLETED
    for (let i = 1; i < nodeOrder.length; i++) {
      const prevId = nodeOrder[i - 1];
      const prevProg = progressMap.get(prevId);
      if (prevProg?.status === "COMPLETED") {
        const currId = nodeOrder[i];
        const currProg = progressMap.get(currId);
        if (!currProg || currProg.status === "LOCKED") {
          const unlockedRow = await prisma.creativeNodeProgress.upsert({
            where: { userId_episodeId_nodeId: { userId, episodeId, nodeId: currId } },
            update: { status: "UNLOCKED" },
            create: { userId, episodeId, nodeId: currId, status: "UNLOCKED" },
          });
          progressMap.set(currId, unlockedRow);
        }
      }
    }

    return Array.from(progressMap.values());
  }

  static async updateNodeProgress(
    userId: string,
    episodeId: string,
    nodeId: string,
    status: string,
    xpEarned = 0,
    lastScreen?: string
  ) {
    const existing = await prisma.creativeNodeProgress.findUnique({
      where: { userId_episodeId_nodeId: { userId, episodeId, nodeId } },
    });

    const isFirstTimeCompletion = (!existing || existing.status !== "COMPLETED") && status === "COMPLETED";
    const coinsToAward = isFirstTimeCompletion ? xpEarned : 0;

    const record = await prisma.creativeNodeProgress.upsert({
      where: { userId_episodeId_nodeId: { userId, episodeId, nodeId } },
      update: {
        status,
        xpEarned: existing?.status === "COMPLETED" ? existing.xpEarned : xpEarned,
        lastScreen,
      },
      create: { userId, episodeId, nodeId, status, xpEarned: coinsToAward, lastScreen },
    });

    // If node just completed, unlock the next node
    if (status === "COMPLETED") {
      const order = await CreativeJourneyService.getOrCreateNodeOrder(userId, episodeId);
      const idx = order.indexOf(nodeId);
      if (idx !== -1 && idx < order.length - 1) {
        const nextNodeId = order[idx + 1];
        const existingNext = await prisma.creativeNodeProgress.findUnique({
          where: { userId_episodeId_nodeId: { userId, episodeId, nodeId: nextNodeId } },
        });
        if (!existingNext) {
          await prisma.creativeNodeProgress.create({
            data: { userId, episodeId, nodeId: nextNodeId, status: "UNLOCKED" },
          });
        } else if (existingNext.status === "LOCKED") {
          await prisma.creativeNodeProgress.update({
            where: { id: existingNext.id },
            data: { status: "UNLOCKED" },
          });
        }
      }

      // Award coins via gamification ONLY on first-time completion
      if (coinsToAward > 0) {
        try {
          await GamificationService.awardPoints(
            userId,
            coinsToAward,
            "creative_journey_node",
            nodeId,
            `Completed node ${nodeId}`
          );
        } catch (e) {
          console.error("[CREATIVE JOURNEY] Failed to award coins:", e);
        }
      }

      // Check for episode completion & unlock notifications
      CreativeJourneyService.checkAndNotifyJourneyProgress(userId, episodeId).catch(e => {
        console.error("[CREATIVE JOURNEY] Error in checkAndNotifyJourneyProgress:", e);
      });
    }

    return { ...record, coinsAwarded: coinsToAward };
  }

  static async checkAndNotifyJourneyProgress(userId: string, episodeId: string) {
    try {
      const episode = await prisma.creativeEpisode.findUnique({
        where: { id: episodeId },
        include: { journey: { include: { episodes: { orderBy: { order: "asc" } } } } }
      });
      if (!episode || !episode.journey) return;

      const journey = episode.journey;
      const order = await CreativeJourneyService.getOrCreateNodeOrder(userId, episodeId);
      const progress = await prisma.creativeNodeProgress.findMany({
        where: { userId, episodeId, status: "COMPLETED" },
        select: { nodeId: true }
      });

      const isEpisodeComplete = order.length > 0 && progress.length >= order.length;
      if (!isEpisodeComplete) return;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });
      if (!user) return;
      const userName = user.profile?.displayName || user.username || "Your daughter";

      // 1. Check if next episode exists
      const currentIdx = journey.episodes.findIndex(e => e.id === episodeId);
      const nextEpisode = currentIdx !== -1 && currentIdx < journey.episodes.length - 1 ? journey.episodes[currentIdx + 1] : null;

      const { FirebaseService } = await import("../../common/services/firebase.service.js");

      if (nextEpisode) {
        // User notification for next unlocked episode
        const title = `🎉 Episode Unlocked: "${nextEpisode.title}"`;
        const body = `You finished "${episode.title}"! Tap to continue your creative journey ✨`;
        const deepLink = `infano://creative-journey/episode/${nextEpisode.id}`;

        await prisma.notificationHistory.create({
          data: {
            userId,
            type: "CREATIVE_EPISODE_UNLOCKED",
            title,
            body,
            deepLink,
            payload: { episodeId: nextEpisode.id, journeyId: journey.id },
            sentAt: new Date()
          }
        });

        if (user.fcmToken) {
          await FirebaseService.sendPushNotification(user.fcmToken, {
            title,
            body,
            deepLink,
            data: { notificationType: "CREATIVE_EPISODE_UNLOCKED", episodeId: nextEpisode.id }
          });
        }
      } else {
        // Entire journey complete!
        const title = `👑 Journey Completed: ${journey.title}!`;
        const body = `You've completed every episode in "${journey.title}"! Tap to view your milestone badge 🏆`;
        const deepLink = `infano://creative-journey`;

        await prisma.notificationHistory.create({
          data: {
            userId,
            type: "CREATIVE_JOURNEY_COMPLETED",
            title,
            body,
            deepLink,
            payload: { journeyId: journey.id },
            sentAt: new Date()
          }
        });

        if (user.fcmToken) {
          await FirebaseService.sendPushNotification(user.fcmToken, {
            title,
            body,
            deepLink,
            data: { notificationType: "CREATIVE_JOURNEY_COMPLETED", journeyId: journey.id }
          });
        }
      }

      // 2. Notify linked parents
      const links = await prisma.parentLink.findMany({
        where: { teenId: userId, status: "LINKED" },
        include: { parent: true }
      });

      for (const link of links) {
        if (!link.parent || !link.parentId) continue;
        const parentTitle = nextEpisode
          ? `🌟 Learning Progress: ${userName}`
          : `🏆 Journey Graduation: ${userName}`;
        const parentBody = nextEpisode
          ? `${userName} just completed Episode "${episode.title}" in ${journey.title}!`
          : `Congratulations! ${userName} has graduated from the "${journey.title}" journey!`;
        const deepLink = `infano://account/family`;

        await prisma.notificationHistory.create({
          data: {
            userId: link.parentId,
            type: "PARENT_TEEN_JOURNEY_PROGRESS",
            title: parentTitle,
            body: parentBody,
            deepLink,
            payload: { teenId: userId, journeyId: journey.id, episodeId },
            sentAt: new Date()
          }
        });

        if (link.parent.fcmToken) {
          await FirebaseService.sendPushNotification(link.parent.fcmToken, {
            title: parentTitle,
            body: parentBody,
            deepLink,
            data: { notificationType: "PARENT_TEEN_JOURNEY_PROGRESS", teenId: userId }
          });
        }
      }
    } catch (err) {
      console.error("[CREATIVE JOURNEY] Failed to process journey progress notifications:", err);
    }
  }

  // ── Ask Gigi ──────────────────────────────────────────────────────────────

  static async saveGigiEntry(
    userId: string,
    episodeId: string,
    nodeId: string,
    entryText: string
  ) {
    return prisma.creativeAskGigiEntry.create({
      data: { userId, episodeId, nodeId, entryText },
    });
  }

  // Parent/guardian access to their child's gigi entries
  static async getGigiEntriesForUser(requestingUserId: string, targetUserId: string) {
    // Verify requesting user is a linked parent/guardian
    const link = await prisma.parentLink.findFirst({
      where: {
        parentId: requestingUserId,
        teenId: targetUserId,
        status: "LINKED",
      },
    });
    if (!link) throw new AppError("Not authorized to view this user's entries", 403);

    return prisma.creativeAskGigiEntry.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ── My Progress ───────────────────────────────────────────────────────────

  static async getMyProgress(userId: string) {
    return prisma.creativeNodeProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Reset episode progress for user
  static async resetEpisodeProgress(userId: string, episodeId: string) {
    await prisma.creativeNodeProgress.deleteMany({
      where: { userId, episodeId },
    });
    await prisma.creativeAskGigiEntry.deleteMany({
      where: { userId, episodeId },
    });
    return CreativeJourneyService.getOrCreateNodeOrder(userId, episodeId);
  }
}
