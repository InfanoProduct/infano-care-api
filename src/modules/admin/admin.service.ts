import { prisma } from "../../db/client.js";
import { ShopService } from "../shop/shop.service.js";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { normalizePhone } from "../../common/utils/phone.js";
import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import { AppError } from "../../common/middleware/errorHandler.js";

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

    const whereClause: any = { role: { in: ["TEEN", "PARENT", "PEER"] } };
    if (peerOnboarding !== undefined) {
      whereClause.peerOnboarding = peerOnboarding;
    }

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
  static async getOrders(
    page: number = 1,
    limit: number = 25,
    filters?: {
      search?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      paymentMethod?: string;
      paymentStatus?: string;
      isActive?: boolean;
    }
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { guestName: { contains: filters.search, mode: 'insensitive' } },
        { guestEmail: { contains: filters.search, mode: 'insensitive' } },
        { guestPhone: { contains: filters.search, mode: 'insensitive' } },
        { user: { username: { contains: filters.search, mode: 'insensitive' } } },
        { user: { phone: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        const [year, month, day] = filters.dateFrom.split('-').map(Number) as [number, number, number];
        const fromDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        fromDate.setMinutes(fromDate.getMinutes() - 330); // Offset to 00:00:00 IST in UTC
        where.createdAt.gte = fromDate;
      }
      if (filters.dateTo) {
        const [year, month, day] = filters.dateTo.split('-').map(Number) as [number, number, number];
        const toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        toDate.setMinutes(toDate.getMinutes() - 330); // Offset to 23:59:59 IST in UTC
        where.createdAt.lte = toDate;
      }
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'ALL') {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters?.status && filters.status !== 'ALL') {
      if (filters.status === 'FAILED') {
        // Find explicitly FAILED or (ONLINE, no paymentId, not CANCELLED)
        const failedCondition = {
          OR: [
            {
              paymentMethod: 'ONLINE',
              razorpayPaymentId: null,
              orderStatus: { not: 'CANCELLED' }
            }
          ]
        };
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            failedCondition
          ];
          delete where.OR;
        } else {
          where.OR = failedCondition.OR;
        }
      } else {
        where.orderStatus = filters.status;
        if (filters.status === 'PLACED') {
          // exclude FAILED logic
          where.NOT = {
            paymentMethod: 'ONLINE',
            razorpayPaymentId: null
          };
        }
      }
    }

    const [orders, total, allMatchingOrders] = await Promise.all([
      prisma.order.findMany({
        where,
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
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        select: {
          totalAmount: true,
          orderStatus: true,
          paymentMethod: true,
          razorpayPaymentId: true
        }
      })
    ]);

    let totalRevenue = 0;
    let onlineRevenue = 0;
    let codRevenue = 0;

    let onlineCount = 0;
    let codCount = 0;

    let placedCount = 0;
    let processingCount = 0;
    let onHoldCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;
    let cancelledCount = 0;

    let activeOrdersCount = 0;
    for (const o of allMatchingOrders) {
      const amount = Number(o.totalAmount) || 0;
      totalRevenue += amount;

      if (o.paymentMethod === 'ONLINE' && !!o.razorpayPaymentId) {
        onlineCount++;
        onlineRevenue += amount;
      } else if (o.paymentMethod === 'COD') {
        codCount++;
        codRevenue += amount;
      }

      const isFailed = (o.paymentMethod === 'ONLINE' && !o.razorpayPaymentId && o.orderStatus !== 'CANCELLED') || (o as any).orderStatus === 'FAILED';
      const isCancelled = o.orderStatus === 'CANCELLED';

      if (isFailed) {
        failedCount++;
      } else if (o.orderStatus === 'PLACED') {
        placedCount++;
      } else if (o.orderStatus === 'PROCESSING') {
        processingCount++;
      } else if (o.orderStatus === 'ON_HOLD') {
        onHoldCount++;
      } else if (o.orderStatus === 'SHIPPED') {
        shippedCount++;
      } else if (o.orderStatus === 'DELIVERED') {
        deliveredCount++;
      } else if (o.orderStatus === 'CANCELLED') {
        cancelledCount++;
      }

      if (!isFailed && !isCancelled) {
        activeOrdersCount++;
      }
    }

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalOrders: activeOrdersCount,
        totalRevenue,
        onlineRevenue,
        codRevenue,
        onlineCount,
        codCount,
        placedCount,
        processingCount,
        onHoldCount,
        shippedCount,
        deliveredCount,
        failedCount,
        cancelledCount
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

  static async updateOrderStatus(id: string, status: any, awbNumber?: string) {
    return ShopService.updateStatus(id, status, awbNumber);
  }

  static async updateOrderAwb(id: string, awbNumber: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new Error("Order not found");
    return prisma.order.update({
      where: { id },
      data: { awbNumber }
    });
  }

  static async updateOrderActiveStatus(id: string, isActive: boolean) {
    return prisma.order.update({
      where: { id },
      data: { isActive }
    });
  }

  static async addOrderComment(id: string, text: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new Error("Order not found");

    const comments = Array.isArray(order.comments) ? order.comments : [];
    comments.push({ text, createdAt: new Date().toISOString() });

    return prisma.order.update({
      where: { id },
      data: { comments }
    });
  }

  static async convertToCod(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    if (order.paymentStatus === 'COMPLETED') throw new Error("Order is already paid");

    return prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED'
      }
    });
  }

  static async verifyManualPayment(orderId: string, transactionId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { book: true } } }
    });

    if (!order) throw new AppError("Order not found", 404);
    if (order.paymentStatus === 'COMPLETED') throw new AppError("Order is already paid", 400);

    try {
      const payment = await razorpay.payments.fetch(transactionId);

      // Security Check 1: Ensure payment ID is not already used by another order
      const existingOrderWithPayment = await prisma.order.findFirst({
        where: { razorpayPaymentId: transactionId }
      });

      if (existingOrderWithPayment && existingOrderWithPayment.id !== orderId) {
        throw new AppError("Security Error: This payment ID is already associated with another order.", 400);
      }

      // Security Check 2: Ensure payment belongs to the correct Razorpay order (if applicable)
      if (order.razorpayOrderId && payment.order_id && payment.order_id !== order.razorpayOrderId) {
        throw new AppError("Security Error: This payment ID belongs to a different Razorpay order.", 400);
      }

      if (payment.status !== 'captured') {
        throw new AppError(`Payment is not captured. Current status: ${payment.status}`, 400);
      }

      const expectedAmount = Math.round(order.totalAmount * 100);
      if (Number(payment.amount) < expectedAmount) {
        throw new AppError(`Payment amount mismatch. Expected at least ₹${order.totalAmount}, but got ₹${(Number(payment.amount) / 100).toFixed(2)}`, 400);
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
      if (error instanceof AppError) throw error;
      throw new AppError(`Razorpay Verification Failed: ${error.message || 'Invalid Transaction ID'}`, 400);
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

  // Expert Management
  static async getExperts() {
    return prisma.user.findMany({
      where: { role: "EXPERT" },
      include: { profile: true },
      orderBy: { createdAt: "desc" }
    });
  }

  static async createExpert(data: any) {
    const { email, phone, displayName, specialisation, consultationPrice, bio } = data;
    
    // Generate default password and hash it
    const defaultPassword = "Expert@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Check for existing user
    if (email) {
      const existingEmail = await prisma.user.findFirst({ where: { email } });
      if (existingEmail) throw new Error('An account with this email already exists.');
    }
    if (phone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone } });
      if (existingPhone) throw new Error('An account with this phone number already exists.');
    }
    
    // Create base user and profile in transaction
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          phone: phone || `expert-${Date.now()}`,
          password: hashedPassword,
          role: "EXPERT",
          accountStatus: "ACTIVE",
          username: email
        }
      });
      
      await tx.profile.create({
        data: {
          userId: user.id,
          displayName,
          specialisation,
          consultationPrice: consultationPrice ? parseFloat(consultationPrice) : 500,
          bio: bio || "Expert Consultant",
          ...(data.avatarUrl && { avatarUrl: data.avatarUrl })
        }
      });
      
      return tx.user.findUnique({
        where: { id: user.id },
        include: { profile: true }
      });
    });
  }

  static async updateExpert(id: string, data: any) {
    const { email, phone, displayName, specialisation, consultationPrice, bio } = data;

    // Check for existing user
    if (email) {
      const existingEmail = await prisma.user.findFirst({ where: { email, id: { not: id } } });
      if (existingEmail) throw new Error('An account with this email already exists.');
    }
    if (phone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone, id: { not: id } } });
      if (existingPhone) throw new Error('An account with this phone number already exists.');
    }
    
    return prisma.$transaction(async (tx) => {
      // Update User
      await tx.user.update({
        where: { id },
        data: {
          ...(email && { email, username: email }),
          ...(phone && { phone })
        }
      });
      
      // Update Profile
      await tx.profile.update({
        where: { userId: id },
        data: {
          ...(displayName && { displayName }),
          ...(specialisation && { specialisation }),
          ...(consultationPrice && { consultationPrice: parseFloat(consultationPrice) }),
          ...(bio && { bio }),
          ...(data.avatarUrl && { avatarUrl: data.avatarUrl })
        }
      });
      
      return tx.user.findUnique({
        where: { id },
        include: { profile: true }
      });
    });
  }

  static async deleteExpert(id: string) {
    // Delete user. Because profile has onDelete: Cascade, it's removed too.
    return prisma.user.delete({
      where: { id }
    });
  }

  // Expert Session Schedule Management
  static async getExpertSessions() {
    return prisma.expertSessionSchedule.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            profile: { select: { displayName: true } }
          }
        },
        expert: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, specialisation: true, consultationPrice: true } }
          }
        },
        program: {
          select: { id: true, title: true }
        }
      },
      orderBy: { scheduledAt: "desc" }
    });
  }

  static async updateSessionMeetLink(id: string, meetLink: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id } });
    if (!session) throw new Error("Session not found");
    return prisma.expertSessionSchedule.update({
      where: { id },
      data: { meetLink }
    });
  }

  static async updateSessionStatus(id: string, status: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id } });
    if (!session) throw new Error("Session not found");
    return prisma.expertSessionSchedule.update({
      where: { id },
      data: { status }
    });
  }

  static async rescheduleSession(id: string, scheduledAt: string) {
    const session = await prisma.expertSessionSchedule.findUnique({ where: { id } });
    if (!session) throw new Error("Session not found");
    return prisma.expertSessionSchedule.update({
      where: { id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: "RESCHEDULED"
      }
    });
  }
}
