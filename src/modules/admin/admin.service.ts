import { prisma } from "../../db/client.js";

export class AdminService {
  static async getStats() {
    const [
      totalMembers,
      activeConsultations,
      totalJourneys,
      totalEpisodes
    ] = await Promise.all([
      prisma.user.count({ where: { role: "TEEN" } }),
      prisma.expertChatSession.count({ where: { status: "active" } }),
      prisma.learningJourney.count(),
      prisma.episode.count()
    ]);

    // Calculate growth (mocked for now as we'd need historical data)
    const growth = "+5.2%"; 
    const revenue = "$0.00"; // Placeholder if no payment integration yet

    return {
      totalMembers,
      activeConsultations,
      totalJourneys,
      totalEpisodes,
      revenue,
      growth
    };
  }

  static async getUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        include: { profile: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.user.count()
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getJourneys() {
    return prisma.learningJourney.findMany({
      include: {
        _count: {
          select: { episodes: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getJourneyById(id: string) {
    return prisma.learningJourney.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }
        ]
      },
      include: { episodes: { orderBy: { order: "asc" } } }
    });
  }

  static async createJourney(data: any) {
    return prisma.learningJourney.create({ data });
  }

  static async updateJourney(id: string, data: any) {
    return prisma.learningJourney.update({
      where: { id },
      data
    });
  }

  static async deleteJourney(id: string) {
    return prisma.learningJourney.delete({ where: { id } });
  }

  static async createEpisode(journeyId: string, data: any) {
    return prisma.episode.create({
      data: { ...data, journeyId }
    });
  }

  static async updateEpisode(id: string, data: any) {
    return prisma.episode.update({
      where: { id },
      data
    });
  }

  static async deleteEpisode(id: string) {
    return prisma.episode.delete({ where: { id } });
  }
}
