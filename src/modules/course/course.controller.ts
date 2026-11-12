import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CourseService } from "./course.service.js";
import { seedHerNextCourse } from "./course.seed.js";

const watchSchema = z.object({
  watchPositionS: z.number().min(0),
  watchPercent: z.number().min(0).max(100),
  pauseThinkAnswers: z.record(z.string(), z.any()).optional(),
});

const activitySchema = z.object({
  score: z.number().min(0).default(100),
  flags: z.array(z.string()).optional().default([]),
});

const discoverSchema = z.object({
  bustedMythIds: z.array(z.string()).optional().default([]),
});

const reflectSchema = z.object({
  journalText: z.string().optional(),
  quickCheckAnswers: z.record(z.string(), z.any()).optional(),
});

const checkinSubmitSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export class CourseController {
  static async getCurriculum(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.getCurriculum();
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getLearnerState(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const userId = (req as any).userId as string;
      const data = await CourseService.getLearnerState(learnerId, userId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getLessonDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const lessonId = req.params.lessonId as string;
      const learnerId = req.query.learnerId as string | undefined;
      const userId = (req as any).userId as string | undefined;
      const data = await CourseService.getLessonDetail(lessonId, learnerId, userId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async saveWatchProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const lessonId = req.params.lessonId as string;
      const userId = (req as any).userId as string;
      const body = watchSchema.parse(req.body);
      const data = await CourseService.saveWatchProgress(learnerId, userId, lessonId, body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async saveActivityResult(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const lessonId = req.params.lessonId as string;
      const userId = (req as any).userId as string;
      const body = activitySchema.parse(req.body);
      const data = await CourseService.saveActivityResult(learnerId, userId, lessonId, body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async completeDiscover(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const lessonId = req.params.lessonId as string;
      const userId = (req as any).userId as string;
      const body = discoverSchema.parse(req.body || {});
      const data = await CourseService.completeDiscover(learnerId, userId, lessonId, body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async completeReflect(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const lessonId = req.params.lessonId as string;
      const userId = (req as any).userId as string;
      const body = reflectSchema.parse(req.body || {});
      const data = await CourseService.completeReflect(learnerId, userId, lessonId, body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getCheckin(req: Request, res: Response, next: NextFunction) {
    try {
      const checkinId = req.params.checkinId as string;
      const learnerId = req.query.learnerId as string | undefined;
      const userId = (req as any).userId as string | undefined;
      const data = await CourseService.getCheckin(checkinId, learnerId, userId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async submitCheckin(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const checkinId = req.params.checkinId as string;
      const userId = (req as any).userId as string;
      const body = checkinSubmitSchema.parse(req.body);
      const data = await CourseService.submitCheckin(learnerId, userId, checkinId, body.answers);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async shareBadge(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const badgeId = req.params.badgeId as string;
      const userId = (req as any).userId as string;
      const data = await CourseService.shareBadgeWithParent(learnerId, userId, badgeId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async recordMythAnswered(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const userId = (req as any).userId as string;
      const data = await CourseService.recordMythAnswered(learnerId, userId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getParentOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const learnerId = req.params.learnerId as string;
      const userId = (req as any).userId as string;
      const data = await CourseService.getParentOverview(learnerId, userId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async seedCourse(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await seedHerNextCourse();
      res.json({ ok: true, summary });
    } catch (e) {
      next(e);
    }
  }

  // ── Catalog, Public Checkout & Enrollments ─────────────────────────────────

  static async getCatalog(_req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      const data = await CourseService.getCatalog();
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getCourseDetail(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      const data = await CourseService.getCourseDetailByIdOrSlug(req.params.idOrSlug as string);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async getMyEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId as string;
      const data = await CourseService.getMyEnrollments(userId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async checkPublicEnrollment(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, phone, courseId } = req.body;
      const data = await CourseService.checkPublicEnrollment(email, phone, courseId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async checkReaderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.checkReaderStatus(req.body?.phone);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async publicPurchaseCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.publicPurchaseCourse(req.body);
      res.status(201).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async publicVerifyPurchase(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.publicVerifyPurchase(req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  // ── Admin Course Management ────────────────────────────────────────────────

  static async adminGetOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.adminGetOverview();
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async adminUpdateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.adminUpdateCourse(req.params.courseId as string, req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async adminUpdateChapter(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.adminUpdateChapter(req.params.chapterId as string, req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async adminUpdateLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.adminUpdateLesson(req.params.lessonId as string, req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async adminUpdateCheckin(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.adminUpdateCheckin(req.params.checkinId as string, req.body);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async adminGrantEnrollment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CourseService.adminGrantEnrollment({
        identifier: String(req.body?.identifier || ""),
        plan: req.body?.plan ? String(req.body.plan) : undefined,
        amountPaid: req.body?.amountPaid !== undefined ? Number(req.body.amountPaid) : undefined,
      });
      res.json(data);
    } catch (e) {
      next(e);
    }
  }

  static async adminUpdateEnrollmentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = String(req.body?.status || "").toUpperCase() === "REVOKED" ? "REVOKED" : "ACTIVE";
      const data = await CourseService.adminUpdateEnrollmentStatus(req.params.enrollmentId as string, status);
      res.json(data);
    } catch (e) {
      next(e);
    }
  }
}

