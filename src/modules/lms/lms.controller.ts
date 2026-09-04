import { Request, Response } from "express";
import { prisma } from "../../db/client.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../../config/env.js";

export class LmsController {
  // --- Admin Endpoints ---

  static async createCourse(req: Request, res: Response) {
    try {
      const { title, description, timeDuration, thumbnailUrl, price, isFree, highlights, category } = req.body;
      const course = await prisma.lmsCourse.create({
        data: { title, description, timeDuration: Number(timeDuration) || 0, thumbnailUrl, price: Number(price) || 0, isFree: Boolean(isFree), highlights: highlights || [], category },
      });
      res.status(201).json(course);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create course" });
    }
  }

  static async getAdminCourses(req: Request, res: Response) {
    try {
      const courses = await prisma.lmsCourse.findMany({
        include: { modules: { include: { chapters: true } } },
      });
      res.json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  }

  static async getAdminEnrollments(req: Request, res: Response) {
    try {
      const enrollments = await prisma.lmsEnrollment.findMany({
        include: {
          user: true,
          course: true,
        },
        orderBy: { createdAt: "desc" }
      });
      res.json(enrollments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  }

  static async addModule(req: Request, res: Response) {
    try {
      const courseId = req.params.courseId as string;
      const { title, description, timeDuration, thumbnailUrl, order } = req.body;
      const moduleData = await prisma.lmsModule.create({
        data: { courseId, title, description, timeDuration: Number(timeDuration) || 0, thumbnailUrl, order: Number(order) || 0 },
      });
      res.status(201).json(moduleData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to add module" });
    }
  }

  static async addChapter(req: Request, res: Response) {
    try {
      const moduleId = req.params.moduleId as string;
      const { title, description, thumbnailUrl, type, order, videoUrl, videoDuration, assessmentQuestions, passingScore, goodToKnowPoints, faqs } = req.body;

      const chapter = await prisma.lmsChapter.create({
        data: { moduleId, title, description, thumbnailUrl, type, order: Number(order) || 0, goodToKnowPoints: goodToKnowPoints || [], faqs: faqs || [] },
      });

      if (type === "VIDEO" && videoUrl) {
        await prisma.lmsVideo.create({
          data: { chapterId: chapter.id, videoUrl, duration: Number(videoDuration) || 0 },
        });
      } else if (type === "ASSESSMENT" && assessmentQuestions) {
        await prisma.lmsAssessment.create({
          data: { chapterId: chapter.id, questions: assessmentQuestions, passingScore: Number(passingScore) || 80 },
        });
      }

      res.status(201).json(chapter);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to add chapter" });
    }
  }

  static async updateCourse(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { title, description, timeDuration, thumbnailUrl, price, isFree, isActive, highlights, category } = req.body;
      const course = await prisma.lmsCourse.update({
        where: { id },
        data: { title, description, timeDuration: Number(timeDuration) || 0, thumbnailUrl, price: Number(price) || 0, isFree: Boolean(isFree), isActive: Boolean(isActive), highlights: highlights || [], category },
      });
      res.json(course);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update course" });
    }
  }

  static async deleteCourse(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await prisma.lmsCourse.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete course" });
    }
  }

  static async updateModule(req: Request, res: Response) {
    try {
      const id = req.params.moduleId as string;
      const { title, description, timeDuration, order } = req.body;
      const moduleData = await prisma.lmsModule.update({
        where: { id },
        data: { title, description, timeDuration: Number(timeDuration) || 0, order: Number(order) || 0 },
      });
      res.json(moduleData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update module" });
    }
  }

  static async deleteModule(req: Request, res: Response) {
    try {
      const id = req.params.moduleId as string;
      await prisma.lmsModule.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete module" });
    }
  }

  static async updateChapter(req: Request, res: Response) {
    try {
      const id = req.params.chapterId as string;
      const { title, description, type, order, videoUrl, videoDuration, assessmentQuestions, passingScore, goodToKnowPoints, faqs } = req.body;

      const chapter = await prisma.lmsChapter.update({
        where: { id },
        data: { title, description, type, order: Number(order) || 0, goodToKnowPoints: goodToKnowPoints || [], faqs: faqs || [] },
      });

      if (type === "VIDEO" && videoUrl) {
        await prisma.lmsVideo.upsert({
          where: { chapterId: id },
          create: { chapterId: id, videoUrl, duration: Number(videoDuration) || 0 },
          update: { videoUrl, duration: Number(videoDuration) || 0 }
        });
      } else if (type === "ASSESSMENT" && assessmentQuestions) {
        await prisma.lmsAssessment.upsert({
          where: { chapterId: id },
          create: { chapterId: id, questions: assessmentQuestions, passingScore: Number(passingScore) || 80 },
          update: { questions: assessmentQuestions, passingScore: Number(passingScore) || 80 }
        });
      }

      res.json(chapter);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update chapter" });
    }
  }

  static async deleteChapter(req: Request, res: Response) {
    try {
      const id = req.params.chapterId as string;
      await prisma.lmsChapter.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete chapter" });
    }
  }

  // --- User Endpoints ---

  static async exploreCourses(req: Request, res: Response) {
    try {
      const courses = await prisma.lmsCourse.findMany({
        where: { isActive: true },
        include: { modules: true },
      });
      res.json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  }

  static async myCourses(req: Request, res: Response) {
    try {
      const userId = ((req as any).user?.id || (req as any).userId) as string;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const enrollments = await prisma.lmsEnrollment.findMany({
        where: { userId },
        include: {
          course: { include: { modules: { include: { chapters: true } } } },
          progress: true,
        },
      });
      res.json(enrollments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch your courses" });
    }
  }

  static async getCourseDetails(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const course = await prisma.lmsCourse.findUnique({
        where: { id },
        include: {
          modules: { include: { chapters: { include: { video: true, assessment: true } } } },
        },
      });
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }
      res.json(course);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch course details" });
    }
  }

  static async purchaseCourse(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const course = await prisma.lmsCourse.findUnique({ where: { id } });
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }

      // Check if already enrolled
      const existing = await prisma.lmsEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId: id } }
      });
      if (existing && existing.status === "ACTIVE") {
        res.status(400).json({ error: "Already enrolled in this course" });
        return;
      }

      let razorpayOrderId = null;
      let finalStatus = course.isFree ? "ACTIVE" : "PENDING";
      let rzpOrderDetails = null;

      const resolvedCurrency = (req.body.currency || "INR").toUpperCase();
      let finalPrice = req.body.amount;
      if (!finalPrice) {
        if (resolvedCurrency === "USD") {
          finalPrice = Math.round((course.price / 83) * 100) / 100;
        } else if (resolvedCurrency === "GBP") {
          finalPrice = Math.round((course.price / 105) * 100) / 100;
        } else {
          finalPrice = course.price;
        }
      }

      if (!course.isFree) {
        const razorpay = new Razorpay({
          key_id: env.RAZORPAY_KEY_ID || "",
          key_secret: env.RAZORPAY_KEY_SECRET || "",
        });

        const options = {
          amount: Math.round(finalPrice * 100),
          currency: resolvedCurrency,
          receipt: `rcpt_lms_${Date.now()}`,
          notes: {
            product_type: "digital_course",
            rbi_purpose_code: "P1006",
            course_id: course.id,
          }
        };
        const rpOrder = await razorpay.orders.create(options);
        razorpayOrderId = rpOrder.id;
        rzpOrderDetails = {
          orderId: razorpayOrderId,
          keyId: env.RAZORPAY_KEY_ID || "",
          amount: finalPrice,
          currency: resolvedCurrency
        };
      }

      let enrollment = null;

      if (existing) {
        enrollment = await prisma.lmsEnrollment.update({
          where: { id: existing.id },
          data: {
            status: finalStatus,
            razorpayOrderId,
            currency: resolvedCurrency,
            pricePaid: finalPrice,
          }
        });
      } else {
        enrollment = await prisma.lmsEnrollment.create({
          data: {
            userId,
            courseId: id,
            pricePaid: finalPrice,
            currency: resolvedCurrency,
            status: finalStatus,
            razorpayOrderId,
          },
        });
      }

      res.status(201).json({ enrollment, message: "Purchase initiated", razorpay: rzpOrderDetails });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to purchase course" });
    }
  }

  static async verifyPurchase(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      const userId = ((req as any).user?.id || (req as any).userId) as string;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        res.status(400).json({ error: "Missing Razorpay verification data" });
        return;
      }

      // Verify Signature
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", env.RAZORPAY_KEY_SECRET || "")
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        res.status(400).json({ error: "Invalid payment signature" });
        return;
      }

      const enrollment = await prisma.lmsEnrollment.findFirst({
        where: { razorpayOrderId }
      });

      if (!enrollment) {
        res.status(404).json({ error: "Enrollment not found for this order" });
        return;
      }

      await prisma.lmsEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "ACTIVE",
          razorpayPaymentId
        }
      });

      res.json({ success: true, message: "Payment verified and course activated" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to verify purchase" });
    }
  }

  static async publicCheckEnrollment(req: Request, res: Response) {
    try {
      const { email, phone, courseId } = req.body;
      if (!email && !phone) {
        res.status(400).json({ error: "Email or phone number is required" });
        return;
      }

      const conditions: any[] = [];
      if (email) conditions.push({ email: email.trim().toLowerCase() });
      if (phone) conditions.push({ phone: phone.trim() });

      const user = await prisma.user.findFirst({
        where: {
          OR: conditions
        }
      });

      if (!user) {
        res.json({ enrolled: false, exists: false });
        return;
      }

      const enrollment = await prisma.lmsEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId
          }
        }
      });

      if (enrollment && enrollment.status === "ACTIVE") {
        res.json({
          enrolled: true,
          exists: true,
          message: "An account with this email/phone is already enrolled in this course. Please login to start learning."
        });
      } else {
        res.json({ enrolled: false, exists: true });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to check enrollment" });
    }
  }

  static async publicPurchaseCourse(req: Request, res: Response) {
    try {
      const { name, email, phone, courseId } = req.body;
      if (!name || !email || !phone || !courseId) {
        res.status(400).json({ error: "Name, email, phone, and courseId are required" });
        return;
      }

      const finalPhone = phone.trim();

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email.trim().toLowerCase() },
            { phone: finalPhone }
          ]
        }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            phone: finalPhone,
            email: email.trim().toLowerCase(),
            accountStatus: "PENDING_SETUP",
            onboardingStep: 1,
            profile: {
              create: {
                displayName: name.trim(),
                totalPoints: 0,
              }
            }
          }
        });
      }

      const course = await prisma.lmsCourse.findUnique({ where: { id: courseId } });
      if (!course) {
        res.status(404).json({ error: "Course not found" });
        return;
      }

      const existing = await prisma.lmsEnrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId } }
      });

      if (existing && existing.status === "ACTIVE") {
        res.status(400).json({ error: "Already enrolled in this course. Please login." });
        return;
      }

      let razorpayOrderId = null;
      let finalStatus = course.isFree ? "ACTIVE" : "PENDING";
      let rzpOrderDetails = null;

      const resolvedCurrency = (req.body.currency || "INR").toUpperCase();
      let finalPrice = req.body.amount;
      if (!finalPrice) {
        if (resolvedCurrency === "USD") {
          finalPrice = Math.round((course.price / 83) * 100) / 100;
        } else if (resolvedCurrency === "GBP") {
          finalPrice = Math.round((course.price / 105) * 100) / 100;
        } else {
          finalPrice = course.price;
        }
      }

      if (!course.isFree) {
        const razorpay = new Razorpay({
          key_id: env.RAZORPAY_KEY_ID || "",
          key_secret: env.RAZORPAY_KEY_SECRET || "",
        });

        const options = {
          amount: Math.round(finalPrice * 100),
          currency: resolvedCurrency,
          receipt: `rcpt_lms_pub_${Date.now()}`,
          notes: {
            product_type: "digital_course",
            rbi_purpose_code: "P1006",
            course_id: course.id,
            customer_phone: phone || "",
          }
        };
        const rpOrder = await razorpay.orders.create(options);
        razorpayOrderId = rpOrder.id;
        rzpOrderDetails = {
          orderId: razorpayOrderId,
          keyId: env.RAZORPAY_KEY_ID || "",
          amount: finalPrice,
          currency: resolvedCurrency
        };
      }

      let enrollment = null;
      if (existing) {
        enrollment = await prisma.lmsEnrollment.update({
          where: { id: existing.id },
          data: {
            status: finalStatus,
            razorpayOrderId,
            currency: resolvedCurrency,
            pricePaid: finalPrice,
          }
        });
      } else {
        enrollment = await prisma.lmsEnrollment.create({
          data: {
            userId: user.id,
            courseId,
            pricePaid: finalPrice,
            currency: resolvedCurrency,
            status: finalStatus,
            razorpayOrderId,
          },
        });
      }

      res.status(201).json({ enrollment, message: "Purchase initiated", razorpay: rzpOrderDetails });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to initiate purchase" });
    }
  }

  static async publicVerifyPurchase(req: Request, res: Response) {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        res.status(400).json({ error: "Missing Razorpay verification data" });
        return;
      }

      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", env.RAZORPAY_KEY_SECRET || "")
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        res.status(400).json({ error: "Invalid payment signature" });
        return;
      }

      const enrollment = await prisma.lmsEnrollment.findFirst({
        where: { razorpayOrderId }
      });

      if (!enrollment) {
        res.status(404).json({ error: "Enrollment not found for this order" });
        return;
      }

      await prisma.lmsEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "ACTIVE",
          razorpayPaymentId
        }
      });

      res.json({ success: true, message: "Payment verified and course activated" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to verify purchase" });
    }
  }


  static async getCourseProgress(req: Request, res: Response) {
    try {
      const courseId = req.params.courseId as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const enrollment = await prisma.lmsEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: { progress: true }
      });

      if (!enrollment) {
        res.status(404).json({ error: "Enrollment not found" });
        return;
      }

      res.json({ progress: (enrollment as any).progress });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  }

  static async markChapterComplete(req: Request, res: Response) {
    try {
      const courseId = req.params.courseId as string;
      const chapterId = req.params.chapterId as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;
      const { score, watchTime, answers } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const enrollment = await prisma.lmsEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } }
      });

      if (!enrollment || enrollment.status !== "ACTIVE") {
        res.status(403).json({ error: "Active enrollment required" });
        return;
      }

      const chapter = await prisma.lmsChapter.findUnique({
        where: { id: chapterId },
        include: { assessment: true }
      });

      if (!chapter) {
        res.status(404).json({ error: "Chapter not found" });
        return;
      }

      let calculatedScore = score !== undefined && score !== null ? Number(score) : null;

      if (chapter.type === "ASSESSMENT" && chapter.assessment?.questions) {
        const questions = chapter.assessment.questions as any[];
        if (Array.isArray(questions) && questions.length > 0) {
          if (!Array.isArray(answers) || answers.length < questions.length) {
            res.status(400).json({ error: "All quiz questions must be answered to complete this assessment." });
            return;
          }

          let correctCount = 0;
          for (let i = 0; i < questions.length; i++) {
            if (Number(answers[i]) === Number(questions[i]?.correctAnswerIndex)) {
              correctCount++;
            }
          }
          calculatedScore = correctCount;
        }
      }

      const progress = await prisma.lmsProgress.upsert({
        where: { enrollmentId_chapterId: { enrollmentId: enrollment.id, chapterId } },
        create: {
          enrollmentId: enrollment.id,
          chapterId,
          isCompleted: true,
          score: calculatedScore,
          answers: answers || null,
          watchTime: watchTime !== undefined && watchTime !== null ? Number(watchTime) : null,
          completedAt: new Date()
        },
        update: {
          isCompleted: true,
          score: calculatedScore !== null ? calculatedScore : undefined,
          answers: answers !== undefined ? answers : undefined,
          watchTime: watchTime !== undefined ? Number(watchTime) : undefined,
          completedAt: new Date()
        }

      });

      res.json({ success: true, progress });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to mark chapter complete" });
    }
  }

  static async getChapterComments(req: Request, res: Response) {
    try {
      const chapterId = req.params.chapterId as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;

      const comments = await prisma.lmsComment.findMany({
        where: { chapterId },
        orderBy: { createdAt: "desc" }
      });

      const formattedComments = comments.map(c => ({
        id: c.id,
        chapterId: c.chapterId,
        authorName: c.authorName,
        authorInitials: c.authorInitials,
        text: c.text,
        timestamp: c.createdAt,
        likes: c.likes,
        liked: userId ? c.likedUsers.includes(userId) : false
      }));

      res.json(formattedComments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  }

  static async postChapterComment(req: Request, res: Response) {
    try {
      const chapterId = req.params.chapterId as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;
      const { text } = req.body;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!text || !text.trim()) {
        res.status(400).json({ error: "Comment text is required" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true }
      });

      const authorName = (user as any)?.profile?.displayName || (user as any)?.username || "User";
      const authorInitials = authorName.slice(0, 2).toUpperCase();

      const comment = await prisma.lmsComment.create({
        data: {
          chapterId,
          authorId: userId,
          authorName,
          authorInitials,
          text: text.trim(),
        }
      });

      res.status(201).json({
        id: comment.id,
        chapterId: comment.chapterId,
        authorName: comment.authorName,
        authorInitials: comment.authorInitials,
        text: comment.text,
        timestamp: comment.createdAt,
        likes: 0,
        liked: false
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to post comment" });
    }
  }

  static async toggleCommentLike(req: Request, res: Response) {
    try {
      const commentId = req.params.commentId as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const comment = await prisma.lmsComment.findUnique({
        where: { id: commentId }
      });

      if (!comment) {
        res.status(404).json({ error: "Comment not found" });
        return;
      }

      const likedUsers = comment.likedUsers || [];
      const index = likedUsers.indexOf(userId);
      let updatedLikedUsers = [...likedUsers];
      let likes = comment.likes;

      if (index >= 0) {
        updatedLikedUsers.splice(index, 1);
        likes = Math.max(0, likes - 1);
      } else {
        updatedLikedUsers.push(userId);
        likes += 1;
      }

      const updated = await prisma.lmsComment.update({
        where: { id: commentId },
        data: {
          likedUsers: updatedLikedUsers,
          likes
        }
      });

      res.json({
        id: updated.id,
        likes: updated.likes,
        liked: updatedLikedUsers.includes(userId)
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  }

  static async getChapterLikes(req: Request, res: Response) {
    try {
      const chapterId = req.params.chapterId as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;

      const realLikesCount = await prisma.lmsChapterLike.count({
        where: { chapterId }
      });

      let liked = false;
      if (userId) {
        const like = await prisma.lmsChapterLike.findUnique({
          where: { chapterId_userId: { chapterId, userId } }
        });
        liked = !!like;
      }

      res.json({ likesCount: 128 + realLikesCount, liked });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch chapter likes" });
    }
  }

  static async toggleChapterLike(req: Request, res: Response) {
    try {
      const chapterId = req.params.chapterId as string;
      const userId = ((req as any).user?.id || (req as any).userId) as string;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const existingLike = await prisma.lmsChapterLike.findUnique({
        where: { chapterId_userId: { chapterId, userId } }
      });

      let liked = false;
      if (existingLike) {
        await prisma.lmsChapterLike.delete({
          where: { id: existingLike.id }
        });
      } else {
        await prisma.lmsChapterLike.create({
          data: { chapterId, userId }
        });
        liked = true;
      }

      const realLikesCount = await prisma.lmsChapterLike.count({
        where: { chapterId }
      });

      res.json({ likesCount: 128 + realLikesCount, liked });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to toggle chapter like" });
    }
  }
}
