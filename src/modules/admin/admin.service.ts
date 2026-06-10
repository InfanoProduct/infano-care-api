import { prisma } from "../../db/client.js";
import { ShopService } from "../shop/shop.service.js";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { normalizePhone } from "../../common/utils/phone.js";
import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "",
  key_secret: env.RAZORPAY_KEY_SECRET || "",
});

export class AdminService {
  static async getStats() {
    const [
      totalMembers,
      activeConsultations,
      totalJourneys,
      totalEpisodes,
      totalEnquiries
    ] = await Promise.all([
      prisma.user.count({ where: { role: "TEEN" } }),
      prisma.expertChatSession.count({ where: { status: "active" } }),
      prisma.learningJourney.count(),
      prisma.episode.count(),
      prisma.enquiry.count()
    ]);

    // Calculate growth (mocked for now as we'd need historical data)
    const growth = "+5.2%"; 
    const revenue = "$0.00"; // Placeholder if no payment integration yet

    return {
      totalMembers,
      activeConsultations,
      totalJourneys,
      totalEpisodes,
      totalEnquiries,
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
        phone: normalizePhone(data.phone),
        role: data.role as UserRole,
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

    // Update profile status to training mode, but keep role as TEEN
    if (user.profile) {
      await prisma.profile.update({
        where: { userId },
        data: { mentorStatus: 'training', isAvailable: false }
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

    // Update certification status and generate ID
    const certificateId = `INF-PEER-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    await prisma.peerApplication.update({
      where: { userId },
      data: { 
        certificationStatus: 'certified',
        certificateId,
        certifiedAt: new Date()
      }
    });

    // ALWAYS ensure role is upgraded to PEER on certification approval
    // This handles both new certifications and re-approvals for previously unapproved users
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

    return { 
      success: true, 
      message: 'Certification approved. User is now a Peer Mentor.',
      certificateId 
    };
  }

  static async unapproveAssessment(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { peerApplication: true, profile: true }
    });

    if (!user) throw new Error('User not found');
    if (!user.peerApplication) throw new Error('No peer application found');

    // 1. Revert certification to unapproved and RESET attempts/progress
    await prisma.peerApplication.update({
      where: { userId },
      data: { 
        certificationStatus: 'unapproved',
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
      where: {
        category: { not: "Peer Support" }
      },
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
        AND: [
          {
            OR: [
              { id },
              { slug: id }
            ]
          },
          { category: { not: "Peer Support" } }
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

  static async verifyManualPayment(orderId: string, transactionId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { book: true } } }
    });

    if (!order) throw new Error("Order not found");
    if (order.paymentStatus === 'COMPLETED') throw new Error("Order is already paid");

    try {
      const payment = await razorpay.payments.fetch(transactionId);
      
      if (payment.status !== 'captured') {
        throw new Error(`Payment is not captured. Current status: ${payment.status}`);
      }

      const expectedAmount = Math.round(order.totalAmount * 100);
      if (Number(payment.amount) < expectedAmount) {
        throw new Error(`Payment amount mismatch. Expected at least ₹${order.totalAmount}, but got ₹${(Number(payment.amount) / 100).toFixed(2)}`);
      }

      let userId = order.userId;
      if (!userId && order.guestPhone) {
        const normalized = normalizePhone(order.guestPhone);
        let user = await prisma.user.findUnique({ where: { phone: normalized } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              phone: normalized,
              accountStatus: "PENDING_SETUP",
              onboardingStep: 1,
              role: "PARENT",
              profile: {
                create: {
                  displayName: order.guestName || "Parent",
                  totalPoints: 0,
                }
              }
            }
          });
        }
        userId = user.id;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentMethod: 'ONLINE',
          razorpayPaymentId: transactionId,
          userId: userId || undefined,
        },
      });

      if (userId) {
        for (const item of order.items) {
          const book = item.book as any;
          if (!book) continue;
          const isProg = book.id.endsWith("-private") || book.id.endsWith("-group");
          if (isProg) {
            const programTitle = book.id.split("-")[0].toUpperCase();
            const program = await prisma.program.findFirst({
              where: { title: { equals: programTitle, mode: "insensitive" } }
            });
            if (program) {
              const type = (item.book as any).id.endsWith("-private") ? "PRIVATE" : "GROUP";
              const existingEnrollment = await prisma.programEnrollment.findUnique({
                where: {
                  userId_programId: { userId, programId: program.id }
                }
              });
              if (!existingEnrollment) {
                await prisma.programEnrollment.create({
                  data: {
                    userId,
                    programId: program.id,
                    type,
                    pricePaid: item.price,
                    status: "ACTIVE",
                    guestName: order.guestName,
                    guestEmail: order.guestEmail,
                  }
                });
              }
            }
          }
        }
      }

      return updatedOrder;
    } catch (error: any) {
      throw new Error(`Razorpay Verification Failed: ${error.message || 'Invalid Transaction ID'}`);
    }
  }

  // Book Management
  static async getBooks() {
    const books = await prisma.book.findMany({
      where: {
        NOT: [
          { id: { endsWith: "-private" } },
          { id: { endsWith: "-group" } }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
    const coupon = await prisma.discountCoupon.findFirst({
      orderBy: { createdAt: "desc" },
    });
    return books.map(book => ({ ...book, coupon }));
  }

  static async createBook(data: any) {
    const { promo, id, createdAt, updatedAt, coupon, couponId, orderItems, ...bookData } = data;

    const book = await prisma.book.create({
      data: bookData
    });

    if (promo) {
      await prisma.discountCoupon.upsert({
        where: { code: promo.code },
        create: {
          code: promo.code,
          type: promo.type,
          value: promo.value,
          minOrderAmount: promo.minOrderAmount ?? 0,
          maxDiscount: promo.maxDiscount,
          expiryDate: promo.expiryDate ? new Date(promo.expiryDate) : null,
          usageLimit: promo.usageLimit ?? 100,
          isActive: promo.isActive ?? true,
        },
        update: {
          type: promo.type,
          value: promo.value,
          minOrderAmount: promo.minOrderAmount ?? 0,
          maxDiscount: promo.maxDiscount,
          expiryDate: promo.expiryDate ? new Date(promo.expiryDate) : null,
          usageLimit: promo.usageLimit ?? 100,
          isActive: promo.isActive ?? true,
        }
      });
    }

    const latestCoupon = await prisma.discountCoupon.findFirst({
      orderBy: { createdAt: "desc" }
    });

    return { ...book, coupon: latestCoupon };
  }

  static async updateBook(id: string, data: any) {
    const { promo, id: _, createdAt, updatedAt, coupon, couponId, orderItems, ...bookData } = data;

    const book = await prisma.book.update({
      where: { id },
      data: bookData
    });

    if (promo === null) {
      // Deactivate all coupons
      await prisma.discountCoupon.updateMany({
        data: { isActive: false }
      });
    } else if (promo) {
      await prisma.discountCoupon.upsert({
        where: { code: promo.code },
        create: {
          code: promo.code,
          type: promo.type,
          value: promo.value,
          minOrderAmount: promo.minOrderAmount ?? 0,
          maxDiscount: promo.maxDiscount,
          expiryDate: promo.expiryDate ? new Date(promo.expiryDate) : null,
          usageLimit: promo.usageLimit ?? 100,
          isActive: promo.isActive ?? true,
        },
        update: {
          type: promo.type,
          value: promo.value,
          minOrderAmount: promo.minOrderAmount ?? 0,
          maxDiscount: promo.maxDiscount,
          expiryDate: promo.expiryDate ? new Date(promo.expiryDate) : null,
          usageLimit: promo.usageLimit ?? 100,
          isActive: promo.isActive ?? true,
        }
      });
    }

    const latestCoupon = await prisma.discountCoupon.findFirst({
      orderBy: { createdAt: "desc" }
    });

    return { ...book, coupon: latestCoupon };
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

  // Enquiry Management
  static async getEnquiries() {
    return prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  static async getEnquiryById(id: string) {
    return prisma.enquiry.findUnique({
      where: { id }
    });
  }
}
