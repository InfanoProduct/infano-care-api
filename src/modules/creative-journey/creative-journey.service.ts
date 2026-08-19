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

export class CreativeJourneyService {
  // ── Journeys ──────────────────────────────────────────────────────────────

  static async listJourneys() {
    return prisma.creativeJourney.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      include: { episodes: { where: { isActive: true }, orderBy: { order: "asc" } } },
    });
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
    const currentIds = new Set(allNodes.map((n) => n.nodeId));

    // Check if we already have a persisted order (stored on ANY node progress row)
    const progressList = await prisma.creativeNodeProgress.findMany({
      where: { userId, episodeId },
      select: { nodeOrder: true },
    });
    const existing = progressList.find((p) => p.nodeOrder != null);

    if (existing?.nodeOrder) {
      const order = existing.nodeOrder as string[];
      const isStale = order.length !== allNodes.length || !order.every((id) => currentIds.has(id));
      if (!isStale) {
        return order;
      }
    }

    // Compute order for the first time or if stale
    const storyNode = allNodes.find((n) => n.position === "fixed_start");
    const reflectionNode = allNodes.find((n) => n.position === "fixed_end");
    const middlePool = allNodes.filter((n) => n.position === "random_pool");

    const seed = djb2Hash(userId + episodeId);
    const shuffled = seededShuffle(middlePool, seed);
    const balanced = balanceEnergyTags(shuffled);

    const orderedNodes = [
      ...(storyNode ? [storyNode] : []),
      ...balanced,
      ...(reflectionNode ? [reflectionNode] : []),
    ];

    const nodeOrder = orderedNodes.map((n) => n.nodeId);

    // Persist on story/first node row (unlock the story node)
    const firstNodeId = storyNode?.nodeId ?? nodeOrder[0];
    if (firstNodeId) {
      await prisma.creativeNodeProgress.upsert({
        where: { userId_episodeId_nodeId: { userId, episodeId, nodeId: firstNodeId } },
        update: { nodeOrder, status: "UNLOCKED" },
        create: { userId, episodeId, nodeId: firstNodeId, status: "UNLOCKED", nodeOrder },
      });
    }

    return nodeOrder;
  }

  // ── Node Progress ─────────────────────────────────────────────────────────

  static async getEpisodeProgress(userId: string, episodeId: string) {
    const nodeOrder = await CreativeJourneyService.getOrCreateNodeOrder(userId, episodeId);
    const progressList = await prisma.creativeNodeProgress.findMany({
      where: { userId, episodeId },
    });

    const progressMap = new Map<string, any>();
    for (const p of progressList) {
      progressMap.set(p.nodeId, p);
    }

    // Ensure linear progression: unlock node i if node i-1 is COMPLETED
    let updatedNeeded = false;
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
          updatedNeeded = true;
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
    const record = await prisma.creativeNodeProgress.upsert({
      where: { userId_episodeId_nodeId: { userId, episodeId, nodeId } },
      update: { status, xpEarned, lastScreen },
      create: { userId, episodeId, nodeId, status, xpEarned, lastScreen },
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

      // Award XP via gamification
      if (xpEarned > 0) {
        try {
          await GamificationService.awardPoints(
            userId,
            xpEarned,
            "creative_journey_node",
            nodeId,
            `Completed node ${nodeId}`
          );
        } catch (e) {
          console.error("[CREATIVE JOURNEY] Failed to award XP:", e);
        }
      }
    }

    return record;
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
