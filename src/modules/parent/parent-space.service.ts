import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

function generateRef(prefix: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${yy}${mm}-${rand}`;
}

export class ParentSpaceService {
  static async getOrdersSummary(userId: string) {
    const [orders, lmsEnrollments, programEnrollments, refunds, issueReports, learners] = await Promise.all([
      prisma.order.findMany({
        where: { userId, isActive: true },
        include: { items: { include: { book: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.lmsEnrollment.findMany({
        where: { userId },
        include: { course: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.programEnrollment.findMany({
        where: { userId },
        include: { program: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.orderRefundRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.orderIssueReport.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.learnerProfile.findMany({
        where: { parentId: userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, age: true },
      }),
    ]);

    const refundByOrder: Record<string, any> = {};
    for (const r of refunds) {
      if (!refundByOrder[r.orderId]) refundByOrder[r.orderId] = r;
    }
    const issuesByOrder: Record<string, any[]> = {};
    for (const ir of issueReports) {
      if (!issuesByOrder[ir.orderId]) issuesByOrder[ir.orderId] = [];
      issuesByOrder[ir.orderId].push(ir);
    }

    return {
      orders: orders.map((o) => ({
        ...o,
        refundRequest: refundByOrder[o.id] || null,
        issueReports: issuesByOrder[o.id] || [],
      })),
      lmsEnrollments,
      programEnrollments,
      refunds,
      learners,
    };
  }

  static async requestRefund(
    userId: string,
    orderId: string,
    data: { reason: string; feedback?: string; dataOption?: "keep" | "delete" }
  ) {
    const existing = await prisma.orderRefundRequest.findFirst({
      where: { userId, orderId },
    });
    if (existing) {
      return existing;
    }

    // Order can be a physical Book Order or an Enrollment ID
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    const lms = !order ? await prisma.lmsEnrollment.findFirst({ where: { id: orderId, userId } }) : null;
    const prog = !order && !lms ? await prisma.programEnrollment.findFirst({ where: { id: orderId, userId } }) : null;

    if (!order && !lms && !prog) {
      throw new AppError("Order not found.", 404);
    }

    const createdAt = (order?.createdAt || lms?.createdAt || prog?.createdAt) as Date;
    const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 7) {
      throw new AppError("The 7-day happiness promise window has closed for this order.", 400);
    }

    const amount = order ? order.totalAmount : lms ? lms.pricePaid : (prog?.pricePaid || 0);

    const refund = await prisma.orderRefundRequest.create({
      data: {
        orderId,
        userId,
        referenceCode: generateRef("RF"),
        reason: data.reason,
        feedback: data.feedback || null,
        dataOption: data.dataOption || "keep",
        amount,
        status: "REQUESTED",
      },
    });

    return refund;
  }

  static async reportOrderIssue(
    userId: string,
    orderId: string,
    data: { issueType: string; notes?: string }
  ) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    const report = await prisma.orderIssueReport.create({
      data: {
        orderId,
        userId,
        referenceCode: generateRef("TK"),
        issueType: data.issueType,
        notes: data.notes || null,
        status: "OPEN",
      },
    });

    return report;
  }

  static async updateOrderAddress(
    userId: string,
    orderId: string,
    data: { shippingAddress: string; city: string; pincode: string; phone?: string }
  ) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    if (order.orderStatus !== "PLACED" && order.orderStatus !== "PROCESSING") {
      throw new AppError("Address cannot be changed once the book has shipped.", 400);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingAddress: data.shippingAddress,
        city: data.city,
        pincode: data.pincode,
        ...(data.phone ? { guestPhone: data.phone } : {}),
      },
    });
    return updated;
  }

  static async getParentSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        parentEmail: true,
        parentConsent: true,
        coppaConsentAt: true,
        createdAt: true,
        pinAskMode: true,
        whatsappWeeklySummary: true,
        whatsappLessonNudge: true,
        whatsappNudgeTime: true,
        notifyOrderUpdates: true,
        marketingOptIn: true,
        improveCourseOptIn: true,
        communityWaitlist: true,
        profile: { select: { displayName: true } },
        learners: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            age: true,
            periodStatus: true,
            completedLessons: true,
            createdAt: true,
          },
        },
      },
    });
    if (!user) throw new AppError("User not found.", 404);
    return user;
  }

  static async updateParentSettings(
    userId: string,
    data: {
      displayName?: string;
      email?: string;
      whatsappWeeklySummary?: boolean;
      whatsappLessonNudge?: boolean;
      notifyOrderUpdates?: boolean;
      marketingOptIn?: boolean;
      improveCourseOptIn?: boolean;
      pinAskMode?: "always" | "every_24h";
      communityWaitlist?: boolean;
    }
  ) {
    const userUpdates: any = {};
    if (data.email !== undefined) userUpdates.parentEmail = data.email;
    if (data.whatsappWeeklySummary !== undefined) userUpdates.whatsappWeeklySummary = data.whatsappWeeklySummary;
    if (data.whatsappLessonNudge !== undefined) userUpdates.whatsappLessonNudge = data.whatsappLessonNudge;
    if (data.notifyOrderUpdates !== undefined) userUpdates.notifyOrderUpdates = data.notifyOrderUpdates;
    if (data.marketingOptIn !== undefined) userUpdates.marketingOptIn = data.marketingOptIn;
    if (data.improveCourseOptIn !== undefined) userUpdates.improveCourseOptIn = data.improveCourseOptIn;
    if (data.pinAskMode !== undefined) userUpdates.pinAskMode = data.pinAskMode;
    if (data.communityWaitlist !== undefined) userUpdates.communityWaitlist = data.communityWaitlist;

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: userUpdates });
    }

    if (data.displayName !== undefined) {
      await prisma.profile.upsert({
        where: { userId },
        update: { displayName: data.displayName },
        create: { userId, displayName: data.displayName },
      });
    }

    return this.getParentSettings(userId);
  }

  static async changeParentPin(userId: string, currentPin: string, newPin: string) {
    if (!/^\d{4}$/.test(newPin)) {
      throw new AppError("New PIN must be exactly 4 digits.", 400);
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentPin: true },
    });
    if (!user) throw new AppError("User not found.", 404);
    if (user.parentPin && user.parentPin !== currentPin) {
      throw new AppError("Current PIN is incorrect.", 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { parentPin: newPin },
    });
    return { success: true };
  }

  static async updateLearnerProfile(
    userId: string,
    learnerId: string,
    data: { name?: string; age?: string }
  ) {
    const learner = await prisma.learnerProfile.findUnique({ where: { id: learnerId } });
    if (!learner || learner.parentId !== userId) {
      throw new AppError("Learner profile not found.", 404);
    }
    return prisma.learnerProfile.update({
      where: { id: learnerId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.age ? { age: data.age } : {}),
      },
    });
  }

  static async clearLearnerHealthAnswers(userId: string, learnerId: string) {
    const learner = await prisma.learnerProfile.findUnique({ where: { id: learnerId } });
    if (!learner || learner.parentId !== userId) {
      throw new AppError("Learner profile not found.", 404);
    }
    await prisma.learnerProfile.update({
      where: { id: learnerId },
      data: { periodStatus: null, worries: [] },
    });
    return { success: true };
  }

  static async deleteLearnerProfile(userId: string, learnerId: string) {
    const learner = await prisma.learnerProfile.findUnique({ where: { id: learnerId } });
    if (!learner || learner.parentId !== userId) {
      throw new AppError("Learner profile not found.", 404);
    }
    await prisma.learnerProfile.delete({ where: { id: learnerId } });
    return { success: true };
  }

  static async submitConcern(userId: string, data: { message: string; learnerId?: string }) {
    if (!data.message || data.message.trim().length < 5) {
      throw new AppError("Please share a little more detail about your concern.", 400);
    }
    return prisma.parentConcern.create({
      data: {
        userId,
        learnerId: data.learnerId || null,
        message: data.message.trim(),
      },
    });
  }
}

