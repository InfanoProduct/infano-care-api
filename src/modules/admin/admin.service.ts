import { prisma } from "../../db/client.js";
import { ShopService } from "../shop/shop.service.js";

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

  static async getMentors() {
    return prisma.user.findMany({
      where: {
        profile: {
          mentorStatus: { not: "none" }
        }
      },
      include: {
        profile: true
      },
      orderBy: {
        username: "asc"
      }
    });
  }

  static async createUser(data: { username: string; password: string; phone: string; role: string; peerOnboarding?: boolean }) {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashed,
        phone: data.phone,
        role: data.role,
        peerOnboarding: data.peerOnboarding ?? false,
      },
    });
    return user;
  }

  static async getUsers(page: number = 1, limit: number = 20, peerOnboarding?: boolean) {
    const skip = (page - 1) * limit;
    
    const whereClause = peerOnboarding !== undefined ? { peerOnboarding } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { profile: true, peerApplication: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.user.count({ where: whereClause })
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

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, peerApplication: true }
    });
    if (!user) throw new Error('User not found');
    return user;
  }

  static async approvePeerApplication(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { peerApplication: true, profile: true }
    });

    if (!user) throw new Error('User not found');
    if (!user.peerApplication) throw new Error('No peer application found for this user');

    // Update the application status
    await prisma.peerApplication.update({
      where: { userId },
      data: { status: 'approved' }
    });

    // Update profile status but keep role as TEEN
    if (user.profile) {
      await prisma.profile.update({
        where: { userId },
        data: { mentorStatus: 'certified', isAvailable: true }
      });
    }

    return { success: true, message: 'Peer application approved successfully' };
  }

  static async approveCertification(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { peerApplication: true, profile: true }
    });

    if (!user) throw new Error('User not found');
    if (!user.peerApplication) throw new Error('No peer application found for this user');
    if (user.peerApplication.certificationStatus !== 'submitted') {
      throw new Error('Assessment has not been submitted yet');
    }

    // Update certification status
    await prisma.peerApplication.update({
      where: { userId },
      data: { certificationStatus: 'certified' }
    });

    // NOW upgrade role to PEER
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'PEER' }
    });

    if (user.profile) {
      await prisma.profile.update({
        where: { userId },
        data: { mentorStatus: 'certified', isAvailable: true }
      });
    }

    return { success: true, message: 'Certification approved. User is now a Peer Mentor.' };
  }

  static async unapproveAssessment(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { peerApplication: true }
    });

    if (!user) throw new Error('User not found');
    if (!user.peerApplication) throw new Error('No peer application found');

    // 1. Revert certification to pending_training and RESET attempts/progress
    await prisma.peerApplication.update({
      where: { userId },
      data: { 
        certificationStatus: 'pending_training',
        assessmentAttempts: 0,
        lastAttemptAt: null,
        lockUntil: null,
        completedEpisodes: []
      }
    });

    // 2. Downgrade role to TEEN if they were PEER
    if (user.role === 'PEER') {
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'TEEN' }
      });
    }

    // 3. Update profile mentor status
    if (user.profile) {
      await prisma.profile.update({
        where: { userId },
        data: { mentorStatus: 'none', isAvailable: false }
      });
    }

    return { success: true, message: 'Assessment unapproved. User reverted to training status.' };
  }

  static async revokePeerStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { peerApplication: true, profile: true }
    });

    if (!user) throw new Error('User not found');

    // 1. Revert application to pending & certification to pending_training
    if (user.peerApplication) {
      await prisma.peerApplication.update({
        where: { userId },
        data: { 
          status: 'pending',
          certificationStatus: 'uncertified' 
        }
      });
    }

    // 2. Downgrade role to TEEN
    if (user.role === 'PEER' || user.role === 'ADMIN' || user.role === 'EXPERT') { // ensure we just drop PEER role
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'TEEN' }
      });
    }

    // 3. Reset profile mentor status
    if (user.profile) {
      await prisma.profile.update({
        where: { userId },
        data: { mentorStatus: 'none', isAvailable: false }
      });
    }

    return { success: true, message: 'Peer status completely revoked (Application pending, Certification pending, Role TEEN).' };
  }

  static async getJourneys() {
    const journeys = await prisma.learningJourney.findMany({
      include: {
        _count: {
          select: { episodes: true }
        },
        episodes: {
          select: { isPremium: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return journeys.map(journey => ({
      ...journey,
      freeEpisodesCount: journey.episodes.filter(e => !e.isPremium).length,
      premiumEpisodesCount: journey.episodes.filter(e => e.isPremium).length,
    }));
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

  // Order Management
  static async getOrders(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        skip,
        take: limit,
        include: {
          items: {
            include: { book: true }
          },
          user: {
            select: { phone: true, username: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.order.count()
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getOrderById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { book: true }
        },
        user: true
      }
    });
  }

  static async updateOrderStatus(id: string, status: any) {
    return ShopService.updateStatus(id, status);
  }

  // Book Management
  static async getBooks() {
    return prisma.book.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  static async createBook(data: any) {
    return prisma.book.create({ data });
  }

  static async updateBook(id: string, data: any) {
    return prisma.book.update({
      where: { id },
      data
    });
  }

  static async deleteBook(id: string) {
    return prisma.book.delete({ where: { id } });
  }

  // Circle Management
  static async getCircles() {
    return prisma.communityCircle.findMany({
      include: {
        moderators: {
          include: { profile: true }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { sortOrder: "asc" }
    });
  }

  static async createCircle(data: any) {
    const { moderatorIds, ...rest } = data;
    return prisma.communityCircle.create({
      data: {
        ...rest,
        moderators: moderatorIds ? {
          connect: moderatorIds.map((id: string) => ({ id }))
        } : undefined
      }
    });
  }

  static async updateCircle(id: string, data: any) {
    const { moderatorIds, ...rest } = data;
    return prisma.communityCircle.update({
      where: { id },
      data: {
        ...rest,
        moderators: moderatorIds ? {
          set: moderatorIds.map((id: string) => ({ id }))
        } : undefined
      }
    });
  }

  static async deleteCircle(id: string) {
    return prisma.communityCircle.delete({ where: { id } });
  }
}
