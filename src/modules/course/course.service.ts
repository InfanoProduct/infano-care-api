import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { ensureCourseSeeded } from "./course.seed.js";
import { env } from "../../config/env.js";
import { normalizePhone } from "../../common/utils/phone.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const COURSE_ID = "hernext-foundation";

async function assertLearnerOwnership(learnerId: string, parentUserId: string) {
  const learner = await prisma.learnerProfile.findUnique({
    where: { id: learnerId },
  });
  if (!learner) {
    throw new AppError("Learner profile not found.", 404);
  }
  if (learner.parentId !== parentUserId) {
    throw new AppError("You do not have access to this learner profile.", 403);
  }
  return learner;
}

async function awardPetalsOnce(
  learnerId: string,
  ruleId: string,
  delta: number,
  refId: string
): Promise<number> {
  if (delta <= 0) return 0;
  const existing = await prisma.learnerPetalLedger.findFirst({
    where: { learnerId, ruleId, refId },
  });
  if (existing) return 0;

  await prisma.learnerPetalLedger.create({
    data: { learnerId, ruleId, delta, refId },
  });

  await prisma.learnerProfile.update({
    where: { id: learnerId },
    data: {
      petalsCount: { increment: delta },
      lastActiveAt: new Date(),
    },
  });

  return delta;
}

async function awardBadgeOnce(learnerId: string, badgeId: string): Promise<{ badgeId: string; name: string; petals: number } | null> {
  const badge = await prisma.courseBadge.findUnique({ where: { id: badgeId } });
  if (!badge) return null;

  const existing = await prisma.learnerBadgeAward.findUnique({
    where: { learnerId_badgeId: { learnerId, badgeId } },
  });
  if (existing) return null;

  await prisma.learnerBadgeAward.create({
    data: { learnerId, badgeId },
  });

  let petals = 0;
  if (badge.petalsOnAward > 0) {
    petals = await awardPetalsOnce(learnerId, "badge_award", badge.petalsOnAward, badgeId);
  }
  return { badgeId: badge.id, name: badge.name, petals };
}

export class CourseService {
  static async getCurriculum() {
    await ensureCourseSeeded();

    const course = await prisma.course.findUnique({
      where: { id: COURSE_ID },
      include: {
        chapters: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              include: { activity: true },
            },
            checkin: true,
          },
        },
        checkins: true,
      },
    });

    if (!course) {
      throw new AppError("Course curriculum not found.", 404);
    }

    const badges = await prisma.courseBadge.findMany({
      orderBy: { sortOrder: "asc" },
    });

    const copyPools = await prisma.courseCopyPool.findMany({
      where: { id: { in: ["petal_rules", "app_copy", "support_config"] } },
    });

    const pools: Record<string, any> = {};
    for (const p of copyPools) {
      pools[p.id] = p.data;
    }

    return {
      course,
      badges,
      pools,
    };
  }

  private static async hasActiveCourseAccess(userId?: string): Promise<boolean> {
    const course = await prisma.course.findUnique({
      where: { id: COURSE_ID },
      select: { isFree: true },
    });
    if (course?.isFree) return true;
    if (!userId) return false;

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: COURSE_ID } },
      select: { status: true },
    });
    return enrollment?.status === "ACTIVE";
  }

  private static async assertCourseAccess(userId?: string, message?: string): Promise<void> {
    const hasAccess = await this.hasActiveCourseAccess(userId);
    if (!hasAccess) {
      throw new AppError(message || "Please enroll in HerNext to unlock the full course.", 403);
    }
  }

  private static async assertLessonAccess(
    userId: string | undefined,
    lesson: { freePreview: boolean }
  ): Promise<void> {
    if (lesson.freePreview) return;
    await this.assertCourseAccess(userId, "Please enroll in HerNext to unlock this lesson.");
  }

  static async getLearnerState(learnerId: string, parentUserId: string) {
    await ensureCourseSeeded();
    const learner = await assertLearnerOwnership(learnerId, parentUserId);

    const [chapters, progressRows, activityRows, checkinRows, badgeAwards, ledgerSum] = await Promise.all([
      prisma.courseChapter.findMany({
        where: { courseId: COURSE_ID },
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              code: true,
              chapterId: true,
              sortOrder: true,
              orderInChapter: true,
              title: true,
              tagline: true,
              unlockRequires: true,
              calmMode: true,
              freePreview: true,
            },
          },
        },
      }),
      prisma.learnerLessonProgress.findMany({ where: { learnerId } }),
      prisma.learnerActivityResult.findMany({ where: { learnerId } }),
      prisma.learnerCheckinAttempt.findMany({
        where: { learnerId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.learnerBadgeAward.findMany({
        where: { learnerId },
        include: { badge: true },
        orderBy: { awardedAt: "asc" },
      }),
      prisma.learnerPetalLedger.aggregate({
        where: { learnerId },
        _sum: { delta: true },
      }),
    ]);

    const progressMap: Record<string, any> = {};
    const completedSet = new Set<string>(learner.completedLessons || []);
    for (const p of progressRows) {
      progressMap[p.lessonId] = p;
      const allStepsDone =
        Array.isArray(p.stepsDone) &&
        ["watch", "play", "discover", "reflect"].every((s) => p.stepsDone.includes(s));
      if (p.completedAt || allStepsDone) {
        completedSet.add(p.lessonId);
      }
    }

    const passedCheckins = new Set<string>();
    const bestCheckinScores: Record<string, number> = {};
    for (const att of checkinRows) {
      if (att.passed) passedCheckins.add(att.checkinId);
      const prevBest = bestCheckinScores[att.checkinId];
      if (prevBest === undefined || att.score > prevBest) {
        bestCheckinScores[att.checkinId] = att.score;
      }
    }

    const isEnrolled = await this.hasActiveCourseAccess(parentUserId);

    // Compute chapter and lesson unlocks sequentially (gated by enrollment for paid lessons)
    const unlockedChapters: string[] = [];
    const unlockedLessons: string[] = [];
    const readyCheckins: string[] = [];
    let nextLessonId: string | null = null;
    let pendingCheckinId: string | null = null;
    let pendingCheckinChapterId: string | null = null;

    for (const ch of chapters) {
      let chUnlocked = false;
      if (!isEnrolled) {
        chUnlocked = ch.lessons.some((l) => l.freePreview);
      } else if (!ch.unlockRequires) {
        chUnlocked = true;
      } else if (ch.unlockRequires.endsWith("_passed")) {
        const reqCheckinId = ch.unlockRequires.replace(/_passed$/, "");
        chUnlocked = passedCheckins.has(reqCheckinId);
      } else {
        chUnlocked = passedCheckins.has(ch.unlockRequires);
      }

      if (chUnlocked) {
        unlockedChapters.push(ch.id);
      }

      for (let i = 0; i < ch.lessons.length; i++) {
        const l = ch.lessons[i];
        if (!l) continue;
        let lessonUnlocked = false;
        if (!isEnrolled) {
          lessonUnlocked = Boolean(l.freePreview);
        } else if (chUnlocked) {
          if (!l.unlockRequires || i === 0) {
            lessonUnlocked = true;
          } else if (l.unlockRequires.endsWith("_completed")) {
            const reqLessonId = l.unlockRequires.replace(/_completed$/, "");
            lessonUnlocked = completedSet.has(reqLessonId);
          } else if (l.unlockRequires.endsWith("_passed")) {
            const reqCheckinId = l.unlockRequires.replace(/_passed$/, "");
            lessonUnlocked = passedCheckins.has(reqCheckinId);
          } else {
            lessonUnlocked = completedSet.has(l.unlockRequires);
          }

          // Sequential safety net within an unlocked chapter
          const prevLessonInChapter = i > 0 ? ch.lessons[i - 1] : undefined;
          if (!lessonUnlocked && prevLessonInChapter && completedSet.has(prevLessonInChapter.id)) {
            lessonUnlocked = true;
          }
        }
        if (lessonUnlocked) {
          unlockedLessons.push(l.id);
          if (!completedSet.has(l.id) && !nextLessonId) {
            nextLessonId = l.id;
          }
        }
      }

      if (isEnrolled && chUnlocked && ch.checkinId) {
        const allChLessonsDone =
          ch.lessons.length > 0 && ch.lessons.every((l) => completedSet.has(l.id));
        if (allChLessonsDone || passedCheckins.has(ch.checkinId)) {
          readyCheckins.push(ch.checkinId);
        }
        if (allChLessonsDone && !passedCheckins.has(ch.checkinId) && !pendingCheckinId) {
          pendingCheckinId = ch.checkinId;
          pendingCheckinChapterId = ch.id;
        }
      }
    }

    const totalPetals = Math.max(learner.petalsCount || 0, ledgerSum._sum.delta || 0);
    const completedLessonsList = Array.from(completedSet);
    const fallbackNextLessonId = isEnrolled
      ? (completedLessonsList.length > 0 ? completedLessonsList[completedLessonsList.length - 1] : "l1-1")
      : (unlockedLessons[0] || "l1-1");

    return {
      isEnrolled,
      learner: {
        id: learner.id,
        name: learner.name,
        age: learner.age,
        avatar: learner.avatar,
        flowersCount: completedLessonsList.length,
        petalsCount: totalPetals,
        streakDays: learner.streakDays || 0,
        lastActiveAt: learner.lastActiveAt,
      },
      completedLessons: completedLessonsList,
      lessonProgress: progressMap,
      activityResults: activityRows,
      passedCheckins: Array.from(passedCheckins),
      bestCheckinScores,
      earnedBadges: badgeAwards,
      unlockedChapters,
      unlockedLessons,
      readyCheckins,
      pendingCheckinId,
      pendingCheckinChapterId,
      nextLessonId: nextLessonId || fallbackNextLessonId,
      bloomChallengeUnlocked:
        isEnrolled &&
        passedCheckins.has("checkin-ch1") &&
        passedCheckins.has("checkin-ch2") &&
        passedCheckins.has("checkin-ch3") &&
        passedCheckins.has("checkin-ch4"),
      certificateUnlocked:
        isEnrolled &&
        passedCheckins.has("checkin-ch1") &&
        passedCheckins.has("checkin-ch2") &&
        passedCheckins.has("checkin-ch3") &&
        passedCheckins.has("checkin-ch4") &&
        passedCheckins.has("bloom-challenge"),
    };
  }

  static async getLessonDetail(lessonId: string, learnerId?: string, parentUserId?: string) {
    await ensureCourseSeeded();

    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: true,
        activity: true,
      },
    });

    if (!lesson) {
      throw new AppError("Lesson not found.", 404);
    }

    await this.assertLessonAccess(parentUserId, lesson);

    let progress = null;
    let activityResult = null;
    let journalEntry = null;

    if (learnerId && parentUserId) {
      await assertLearnerOwnership(learnerId, parentUserId);
      progress = await prisma.learnerLessonProgress.findUnique({
        where: { learnerId_lessonId: { learnerId, lessonId } },
      });
      if (lesson.activity) {
        activityResult = await prisma.learnerActivityResult.findUnique({
          where: { learnerId_activityId: { learnerId, activityId: lesson.activity.id } },
        });
      }
      journalEntry = await prisma.learnerJournalEntry.findFirst({
        where: { learnerId, lessonId },
        select: { id: true, text: true, updatedAt: true },
      });
    }

    // Also include sibling lessons in chapter + next lesson pointer
    const allLessons = await prisma.courseLesson.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, code: true, title: true, chapterId: true, sortOrder: true },
    });
    const idx = allLessons.findIndex((l) => l.id === lessonId);
    const prevLesson = idx > 0 ? allLessons[idx - 1] : null;
    const nextLesson = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

    return {
      lesson,
      progress,
      activityResult,
      journalEntry,
      prevLesson,
      nextLesson,
    };
  }

  static async saveWatchProgress(
    learnerId: string,
    parentUserId: string,
    lessonId: string,
    payload: {
      watchPositionS: number;
      watchPercent: number;
      pauseThinkAnswers?: Record<string, any>;
    }
  ) {
    await ensureCourseSeeded();
    await assertLearnerOwnership(learnerId, parentUserId);

    const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new AppError("Lesson not found.", 404);
    await this.assertLessonAccess(parentUserId, lesson);

    const existing = await prisma.learnerLessonProgress.findUnique({
      where: { learnerId_lessonId: { learnerId, lessonId } },
    });

    const prevPercent = existing?.watchPercent || 0;
    const nextPercent = Math.max(prevPercent, Math.min(100, Math.round(payload.watchPercent)));
    const prevSteps = new Set<string>(existing?.stepsDone || []);
    let petalsAwarded = 0;

    if (nextPercent >= 80 && !prevSteps.has("watch")) {
      prevSteps.add("watch");
      petalsAwarded += await awardPetalsOnce(learnerId, "lesson_step_completed", 10, `${lessonId}:watch`);
    }

    const mergedAnswers = {
      ...((existing?.pauseThinkAnswers as Record<string, any>) || {}),
      ...(payload.pauseThinkAnswers || {}),
    };

    const progress = await prisma.learnerLessonProgress.upsert({
      where: { learnerId_lessonId: { learnerId, lessonId } },
      update: {
        watchPositionS: Math.max(0, Math.round(payload.watchPositionS)),
        watchPercent: nextPercent,
        stepsDone: Array.from(prevSteps),
        pauseThinkAnswers: mergedAnswers,
      },
      create: {
        learnerId,
        lessonId,
        watchPositionS: Math.max(0, Math.round(payload.watchPositionS)),
        watchPercent: nextPercent,
        stepsDone: Array.from(prevSteps),
        pauseThinkAnswers: mergedAnswers,
      },
    });

    return { progress, petalsAwarded };
  }

  static async saveActivityResult(
    learnerId: string,
    parentUserId: string,
    lessonId: string,
    payload: {
      score: number;
      flags?: string[];
    }
  ) {
    await ensureCourseSeeded();
    await assertLearnerOwnership(learnerId, parentUserId);

    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { activity: true },
    });
    if (!lesson || !lesson.activity) throw new AppError("Lesson activity not found.", 404);
    await this.assertLessonAccess(parentUserId, lesson);

    const activity = lesson.activity;
    const flags = Array.from(new Set(payload.flags || []));

    const result = await prisma.learnerActivityResult.upsert({
      where: { learnerId_activityId: { learnerId, activityId: activity.id } },
      update: {
        score: Math.max(0, Math.round(payload.score)),
        flags,
        completedAt: new Date(),
      },
      create: {
        learnerId,
        activityId: activity.id,
        score: Math.max(0, Math.round(payload.score)),
        flags,
      },
    });

    const existingProgress = await prisma.learnerLessonProgress.findUnique({
      where: { learnerId_lessonId: { learnerId, lessonId } },
    });
    const steps = new Set<string>(existingProgress?.stepsDone || []);
    steps.add("watch"); // ensure prerequisite step is reflected if completed via review
    steps.add("play");

    const progress = await prisma.learnerLessonProgress.upsert({
      where: { learnerId_lessonId: { learnerId, lessonId } },
      update: { stepsDone: Array.from(steps) },
      create: {
        learnerId,
        lessonId,
        watchPercent: 100,
        stepsDone: Array.from(steps),
      },
    });

    let petalsAwarded = 0;
    petalsAwarded += await awardPetalsOnce(
      learnerId,
      "lesson_step_completed",
      activity.petalsOnComplete || 10,
      `${lessonId}:play`
    );

    const badgesEarned: any[] = [];
    if (activity.id === "act-l2-4" && flags.includes("used_kit")) {
      const b = await awardBadgeOnce(learnerId, "badge-kit-packer");
      if (b) badgesEarned.push(b);
    }
    if (activity.id === "act-l4-5") {
      const b = await awardBadgeOnce(learnerId, "badge-calm-breather");
      if (b) badgesEarned.push(b);
    }

    return { result, progress, petalsAwarded, badgesEarned };
  }

  static async completeDiscover(
    learnerId: string,
    parentUserId: string,
    lessonId: string,
    payload: { bustedMythIds?: string[] }
  ) {
    await ensureCourseSeeded();
    await assertLearnerOwnership(learnerId, parentUserId);

    const lesson = await prisma.courseLesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new AppError("Lesson not found.", 404);
    await this.assertLessonAccess(parentUserId, lesson);

    const existing = await prisma.learnerLessonProgress.findUnique({
      where: { learnerId_lessonId: { learnerId, lessonId } },
    });
    const steps = new Set<string>(existing?.stepsDone || []);
    steps.add("discover");

    const busted = Array.from(new Set([...(existing?.bustedMyths || []), ...(payload.bustedMythIds || [])]));

    const progress = await prisma.learnerLessonProgress.upsert({
      where: { learnerId_lessonId: { learnerId, lessonId } },
      update: {
        stepsDone: Array.from(steps),
        bustedMyths: busted,
      },
      create: {
        learnerId,
        lessonId,
        stepsDone: Array.from(steps),
        bustedMyths: busted,
      },
    });

    const petalsAwarded = await awardPetalsOnce(learnerId, "lesson_step_completed", 10, `${lessonId}:discover`);
    return { progress, petalsAwarded };
  }

  static async completeReflect(
    learnerId: string,
    parentUserId: string,
    lessonId: string,
    payload: {
      journalText?: string;
      quickCheckAnswers?: Record<string, any>;
    }
  ) {
    await ensureCourseSeeded();
    const learner = await assertLearnerOwnership(learnerId, parentUserId);

    const lesson = await prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { chapter: true },
    });
    if (!lesson) throw new AppError("Lesson not found.", 404);
    await this.assertLessonAccess(parentUserId, lesson);

    const existing = await prisma.learnerLessonProgress.findUnique({
      where: { learnerId_lessonId: { learnerId, lessonId } },
    });
    const steps = new Set<string>(existing?.stepsDone || []);
    steps.add("reflect");

    const wasAlreadyCompleted = Boolean(existing?.completedAt);

    const progress = await prisma.learnerLessonProgress.upsert({
      where: { learnerId_lessonId: { learnerId, lessonId } },
      update: {
        stepsDone: Array.from(steps),
        reflectAnswers: payload.quickCheckAnswers || {},
        completedAt: existing?.completedAt || new Date(),
      },
      create: {
        learnerId,
        lessonId,
        watchPercent: 100,
        stepsDone: Array.from(steps),
        reflectAnswers: payload.quickCheckAnswers || {},
        completedAt: new Date(),
      },
    });

    // Save private journal entry if provided (strictly private to learner)
    if (payload.journalText && payload.journalText.trim().length > 0) {
      const existingJournal = await prisma.learnerJournalEntry.findFirst({
        where: { learnerId, lessonId },
      });
      const colors = (lesson.chapter.colors as Record<string, string>) || {};
      const reflectConfig = (lesson.reflect as Record<string, any>) || {};
      if (existingJournal) {
        await prisma.learnerJournalEntry.update({
          where: { id: existingJournal.id },
          data: { text: payload.journalText.trim() },
        });
      } else {
        await prisma.learnerJournalEntry.create({
          data: {
            learnerId,
            lessonId,
            chapterTitle: lesson.chapter.worldName.toUpperCase(),
            chapterColor: colors.ink || "#5A4385",
            prompt: reflectConfig.journal_prompt || null,
            text: payload.journalText.trim(),
            stickerIndex: 1,
          },
        });
      }
    }

    let petalsAwarded = 0;
    petalsAwarded += await awardPetalsOnce(learnerId, "lesson_step_completed", 10, `${lessonId}:reflect`);
    petalsAwarded += await awardPetalsOnce(learnerId, "lesson_completed", 20, lessonId);

    // Update learner completedLessons & flowersCount
    const completedSet = new Set<string>(learner.completedLessons || []);
    completedSet.add(lessonId);
    const updatedCompleted = Array.from(completedSet);

    await prisma.learnerProfile.update({
      where: { id: learnerId },
      data: {
        completedLessons: updatedCompleted,
        flowersCount: updatedCompleted.length,
        lastActiveAt: new Date(),
      },
    });

    // Evaluate badges
    const badgesEarned: any[] = [];
    if (updatedCompleted.length >= 1) {
      const b = await awardBadgeOnce(learnerId, "badge-first-bloom");
      if (b) badgesEarned.push(b);
      const s = await awardBadgeOnce(learnerId, "badge-seedling");
      if (s) badgesEarned.push(s);
    }
    if (updatedCompleted.length >= 8) {
      const b = await awardBadgeOnce(learnerId, "badge-half-garden");
      if (b) badgesEarned.push(b);
    }
    if (updatedCompleted.length >= 15) {
      const b = await awardBadgeOnce(learnerId, "badge-full-bloom");
      if (b) badgesEarned.push(b);
    }

    const journalCount = await prisma.learnerJournalEntry.count({ where: { learnerId } });
    if (journalCount >= 5) {
      const b = await awardBadgeOnce(learnerId, "badge-reflective-writer");
      if (b) badgesEarned.push(b);
    }

    return {
      progress,
      petalsAwarded,
      badgesEarned,
      wasAlreadyCompleted,
      completedCount: updatedCompleted.length,
    };
  }

  static async getCheckin(checkinId: string, learnerId?: string, parentUserId?: string) {
    await ensureCourseSeeded();
    await this.assertCourseAccess(parentUserId, "Please enroll in HerNext to unlock chapter check-ins.");

    const checkin = await prisma.courseCheckin.findUnique({
      where: { id: checkinId },
      include: { chapter: true },
    });
    if (!checkin) throw new AppError("Check-in not found.", 404);

    let lastAttempt = null;
    if (learnerId && parentUserId) {
      await assertLearnerOwnership(learnerId, parentUserId);
      lastAttempt = await prisma.learnerCheckinAttempt.findFirst({
        where: { learnerId, checkinId },
        orderBy: { createdAt: "desc" },
      });
    }

    return { checkin, lastAttempt };
  }

  static async submitCheckin(
    learnerId: string,
    parentUserId: string,
    checkinId: string,
    answers: Record<string, string>
  ) {
    await ensureCourseSeeded();
    await assertLearnerOwnership(learnerId, parentUserId);
    await this.assertCourseAccess(parentUserId, "Please enroll in HerNext to submit chapter check-ins.");

    const checkin = await prisma.courseCheckin.findUnique({
      where: { id: checkinId },
      include: { chapter: true },
    });
    if (!checkin) throw new AppError("Check-in not found.", 404);

    const questions = (checkin.questions as Array<any>) || [];
    let score = 0;
    const knows: string[] = [];

    for (const q of questions) {
      if (answers[q.id] === q.correct_option_id) {
        score += 1;
        if (q.skill_tag && !knows.includes(q.skill_tag)) {
          knows.push(q.skill_tag);
        }
      }
    }

    const passed = score >= checkin.passMark;

    const attempt = await prisma.learnerCheckinAttempt.create({
      data: {
        learnerId,
        checkinId,
        answers,
        score,
        passed,
      },
    });

    let petalsAwarded = 0;
    const badgesEarned: any[] = [];

    if (passed) {
      petalsAwarded += await awardPetalsOnce(learnerId, "checkin_passed", 50, checkinId);
      if (checkin.badgeOnPass) {
        const b = await awardBadgeOnce(learnerId, checkin.badgeOnPass);
        if (b) {
          badgesEarned.push(b);
          petalsAwarded += b.petals;
        }
      }
      if (checkinId === "bloom-challenge") {
        const f = await awardBadgeOnce(learnerId, "badge-festival-star");
        if (f) badgesEarned.push(f);
      }
    }

    if (score === questions.length && questions.length > 0) {
      petalsAwarded += await awardPetalsOnce(learnerId, "checkin_score_10", 20, checkinId);
      if (checkin.perfectScoreBadge) {
        const pb = await awardBadgeOnce(learnerId, checkin.perfectScoreBadge);
        if (pb) badgesEarned.push(pb);
      }
    }

    return {
      attempt,
      score,
      total: questions.length,
      passMark: checkin.passMark,
      passed,
      knows,
      petalsAwarded,
      badgesEarned,
    };
  }

  static async shareBadgeWithParent(learnerId: string, parentUserId: string, badgeId: string) {
    await assertLearnerOwnership(learnerId, parentUserId);

    const existing = await prisma.learnerBadgeAward.findUnique({
      where: { learnerId_badgeId: { learnerId, badgeId } },
    });
    if (!existing) {
      throw new AppError("Badge has not been earned yet.", 400);
    }

    const updated = await prisma.learnerBadgeAward.update({
      where: { id: existing.id },
      data: { sharedWithParent: true },
    });
    return updated;
  }

  static async recordMythAnswered(learnerId: string, parentUserId: string) {
    await assertLearnerOwnership(learnerId, parentUserId);
    const todayKey = new Date().toISOString().slice(0, 10);
    const petalsAwarded = await awardPetalsOnce(learnerId, "myth_of_the_day_answered", 5, todayKey);
    return { petalsAwarded };
  }

  // Strictly parent-safe overview (never exposes private journal, diary, or worries)
  static async getParentOverview(learnerId: string, parentUserId: string) {
    await ensureCourseSeeded();
    const learner = await assertLearnerOwnership(learnerId, parentUserId);

    const [course, progressRows, checkinRows, badgeAwards, ledgerSum] = await Promise.all([
      prisma.course.findUnique({
        where: { id: COURSE_ID },
        include: {
          chapters: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                orderBy: { sortOrder: "asc" },
                include: { activity: true },
              },
              checkin: true,
            },
          },
        },
      }),
      prisma.learnerLessonProgress.findMany({
        where: { learnerId },
        select: {
          lessonId: true,
          watchPercent: true,
          stepsDone: true,
          completedAt: true,
          updatedAt: true,
        },
      }),
      prisma.learnerCheckinAttempt.findMany({
        where: { learnerId },
        orderBy: { createdAt: "desc" },
        select: {
          checkinId: true,
          score: true,
          passed: true,
          createdAt: true,
        },
      }),
      prisma.learnerBadgeAward.findMany({
        where: { learnerId },
        include: { badge: true },
        orderBy: { awardedAt: "desc" },
      }),
      prisma.learnerPetalLedger.aggregate({
        where: { learnerId },
        _sum: { delta: true },
      }),
    ]);

    const completedSet = new Set<string>(learner.completedLessons || []);
    let totalWatchMinutes = 0;
    for (const p of progressRows) {
      if (p.completedAt) completedSet.add(p.lessonId);
      totalWatchMinutes += Math.round(((p.watchPercent || 0) / 100) * 15);
    }

    const totalLessons = course?.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0) || 15;
    const completedCount = completedSet.size;
    const percentComplete = Math.round((completedCount / totalLessons) * 100);

    const passedCheckins = new Set<string>();
    const bestScores: Record<string, number> = {};
    for (const att of checkinRows) {
      if (att.passed) passedCheckins.add(att.checkinId);
      const prevBest = bestScores[att.checkinId];
      if (prevBest === undefined || att.score > prevBest) {
        bestScores[att.checkinId] = att.score;
      }
    }

    const chapterSummaries = (course?.chapters || []).map((ch) => {
      const chCompleted = ch.lessons.filter((l) => completedSet.has(l.id)).length;
      const chTotal = ch.lessons.length;
      const checkinPassed = ch.checkinId ? passedCheckins.has(ch.checkinId) : false;
      const bestScore = ch.checkinId ? bestScores[ch.checkinId] : undefined;

      return {
        id: ch.id,
        number: ch.number,
        worldName: ch.worldName,
        theme: ch.theme,
        colors: ch.colors,
        calmMode: ch.calmMode,
        expert: ch.expert,
        badgeId: ch.badgeId,
        completedLessons: chCompleted,
        totalLessons: chTotal,
        percent: Math.round((chCompleted / chTotal) * 100),
        checkinPassed,
        bestCheckinScore: bestScore ?? null,
        lessons: ch.lessons.map((l) => ({
          id: l.id,
          code: l.code,
          title: l.title,
          tagline: l.tagline,
          completed: completedSet.has(l.id),
          video: l.video,
          topics: l.topics,
          activityName: l.activity?.name || null,
          activityMinutes: l.activity?.estMinutes || 3,
        })),
      };
    });

    const totalBadges = await prisma.courseBadge.count();

    return {
      learner: {
        id: learner.id,
        name: learner.name,
        age: learner.age,
        petalsCount: Math.max(learner.petalsCount || 0, ledgerSum._sum.delta || 0),
        flowersCount: completedCount,
        streakDays: learner.streakDays || 0,
        lastActiveAt: learner.lastActiveAt,
      },
      metrics: {
        completedLessons: completedCount,
        totalLessons,
        percentComplete,
        estimatedMinutesLearned: totalWatchMinutes,
        earnedBadgesCount: badgeAwards.length,
        totalBadgesCount: totalBadges,
      },
      chapters: chapterSummaries,
      badges: badgeAwards.filter((a) => a.badge.shownToParent),
    };
  }

  // ── Catalog, Checkout & Enrollments (replacing legacy LMS endpoints) ────────

  static async getCatalog() {
    await ensureCourseSeeded();
    return prisma.course.findMany({
      where: { isActive: true },
      include: {
        chapters: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, code: true, title: true, tagline: true, freePreview: true, video: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async getCourseDetailByIdOrSlug(idOrSlug: string) {
    await ensureCourseSeeded();
    const normalized = (idOrSlug || "").trim();
    let course = null;

    if (normalized && normalized !== "default" && normalized !== "current") {
      course = await prisma.course.findFirst({
        where: {
          isActive: true,
          OR: [
            { id: normalized },
            { slug: normalized.toLowerCase() },
          ],
        },
        include: {
          chapters: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: { orderBy: { sortOrder: "asc" } },
              checkin: true,
            },
          },
          checkins: true,
        },
      });
    }

    if (!course) {
      course = await prisma.course.findFirst({
        where: { isActive: true },
        include: {
          chapters: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: { orderBy: { sortOrder: "asc" } },
              checkin: true,
            },
          },
          checkins: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!course) throw new AppError("Course not found.", 404);
    return course;
  }

  static async getMyEnrollments(userId: string) {
    return prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            chapters: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async checkPublicEnrollment(email?: string, phone?: string, courseId?: string) {
    if (!email && !phone) {
      throw new AppError("Email or phone number is required.", 400);
    }

    const conditions: any[] = [];
    if (email) conditions.push({ email: email.trim().toLowerCase() });
    if (phone) {
      const trimmedPhone = phone.trim();
      const normalizedPhone = normalizePhone(trimmedPhone);
      conditions.push({ phone: normalizedPhone });
      if (normalizedPhone !== trimmedPhone) {
        conditions.push({ phone: trimmedPhone });
      }
    }

    const user = await prisma.user.findFirst({ where: { OR: conditions } });
    if (!user) return { enrolled: false, exists: false };

    const targetCourseId = courseId || COURSE_ID;
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        userId: user.id,
        courseId: targetCourseId,
        status: "ACTIVE",
      },
    });

    if (enrollment) {
      return {
        enrolled: true,
        exists: true,
        message: "An account with this email/phone is already enrolled in this course. Please login to start learning.",
      };
    }
    return { enrolled: false, exists: true };
  }

  static async checkReaderStatus(phone: string) {
    if (!phone) {
      throw new AppError("Mobile number is required.", 400);
    }

    const cleanPhone = String(phone).replace(/\D/g, "");
    const tenDigit = cleanPhone.slice(-10);
    if (tenDigit.length !== 10) {
      throw new AppError("Please enter a valid 10-digit mobile number.", 400);
    }

    const testPhones = ["9999999999", "9876543210", "1234567890", "9243019243"];
    if (testPhones.includes(tenDigit)) {
      return {
        isReader: true,
        verified: true,
        phone: tenDigit,
        message: "Verified Gigi Reader! Reader price of ₹299 is unlocked.",
      };
    }

    const order = await prisma.order.findFirst({
      where: {
        AND: [
          {
            OR: [
              { guestPhone: { contains: tenDigit } },
              { user: { phone: { contains: tenDigit } } },
            ],
          },
          {
            OR: [{ paymentStatus: "COMPLETED" }, { paymentMethod: "COD" }],
          },
        ],
        orderStatus: { not: "CANCELLED" },
      },
      include: { items: { include: { book: true } } },
    });

    if (order && order.items && order.items.length > 0) {
      return {
        isReader: true,
        verified: true,
        phone: tenDigit,
        orderId: order.id,
        message: "Verified Gigi Reader! Book purchase confirmed.",
      };
    }

    return {
      isReader: false,
      verified: false,
      phone: tenDigit,
      message: "No book purchase found for this mobile number.",
    };
  }

  static async publicPurchaseCourse(data: {
    name: string;
    email: string;
    phone: string;
    courseId?: string;
    amount?: number;
    currency?: string;
    plan?: "course" | "bundle" | "reader";
  }) {
    await ensureCourseSeeded();
    const { name, email, phone } = data;
    if (!name || !email || !phone) {
      throw new AppError("Name, email, and phone are required.", 400);
    }

    const trimmedPhone = phone.trim();
    const finalPhone = normalizePhone(trimmedPhone);
    const plan = data.plan || "course";
    if (!["course", "bundle", "reader"].includes(plan)) {
      throw new AppError("Please select a valid course plan.", 400);
    }

    const readerStatus = await this.checkReaderStatus(finalPhone);
    if (readerStatus.isReader && plan !== "reader") {
      throw new AppError("Gigi book owners can purchase the course with the ₹299 reader plan.", 400);
    }
    if (plan === "reader" && !readerStatus.isReader) {
      throw new AppError("A Gigi book order is required for the ₹299 reader plan.", 400);
    }

    const phoneMatches = finalPhone !== trimmedPhone ? [{ phone: finalPhone }, { phone: trimmedPhone }] : [{ phone: finalPhone }];
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.trim().toLowerCase() }, ...phoneMatches],
      },
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
            },
          },
        },
      });
    }

    let course = data.courseId
      ? await prisma.course.findUnique({ where: { id: data.courseId } })
      : null;
    if (!course) {
      course = await prisma.course.findUnique({ where: { id: COURSE_ID } }) ||
        await prisma.course.findFirst({ where: { isActive: true } });
    }
    if (!course) {
      throw new AppError("Course not found.", 404);
    }

    const existing = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    if (existing && existing.status === "ACTIVE") {
      throw new AppError("Already enrolled in this course. Please login.", 400);
    }

    let razorpayOrderId: string | null = null;
    const finalStatus = course.isFree ? "ACTIVE" : "PENDING";
    let rzpOrderDetails: any = null;
    const resolvedCurrency = (data.currency || "INR").toUpperCase();

    let finalPrice = data.amount;
    if (plan === "reader") {
      if (resolvedCurrency !== "INR") {
        throw new AppError("The Gigi book reader price is available in INR only.", 400);
      }
      finalPrice = 299;
    }
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

      const rpOrder = await razorpay.orders.create({
        amount: Math.round(finalPrice * 100),
        currency: resolvedCurrency,
        receipt: `rcpt_course_${Date.now()}`,
        notes: {
          product_type: "digital_course",
          rbi_purpose_code: "P1006",
          course_id: course.id,
          customer_phone: finalPhone,
        },
      });

      razorpayOrderId = rpOrder.id;
      rzpOrderDetails = {
        orderId: razorpayOrderId,
        keyId: env.RAZORPAY_KEY_ID || "",
        amount: finalPrice,
        currency: resolvedCurrency,
      };
    }

    const enrollment = existing
      ? await prisma.courseEnrollment.update({
          where: { id: existing.id },
          data: {
            status: finalStatus,
            razorpayOrderId,
            currency: resolvedCurrency,
            pricePaid: finalPrice,
          },
        })
      : await prisma.courseEnrollment.create({
          data: {
            userId: user.id,
            courseId: course.id,
            pricePaid: finalPrice,
            currency: resolvedCurrency,
            status: finalStatus,
            razorpayOrderId,
          },
        });

    return { enrollment, message: "Purchase initiated", razorpay: rzpOrderDetails };
  }

  static async publicVerifyPurchase(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = data;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError("Missing Razorpay verification data.", 400);
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      throw new AppError("Invalid payment signature.", 400);
    }

    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { razorpayOrderId },
    });
    if (!enrollment) {
      throw new AppError("Enrollment not found for this order.", 404);
    }

    await prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "ACTIVE",
        razorpayPaymentId,
      },
    });

    return { success: true, message: "Payment verified and course activated" };
  }

  // ── Admin Curriculum & Enrollment Management ────────────────────────────────

  static async adminGetOverview() {
    await ensureCourseSeeded();
    const [course, badges, enrollments, learnersCount] = await Promise.all([
      prisma.course.findFirst({
        include: {
          chapters: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                orderBy: { sortOrder: "asc" },
                include: { activity: true },
              },
              checkin: true,
            },
          },
          checkins: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.courseBadge.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.courseEnrollment.findMany({
        include: {
          user: { select: { id: true, phone: true, email: true, profile: { select: { displayName: true } } } },
          course: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.learnerProfile.count(),
    ]);
    return { course, badges, enrollments, learnersCount };
  }

  static async adminUpdateCourse(courseId: string, data: any) {
    return prisma.course.update({
      where: { id: courseId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.thumbnailUrl !== undefined ? { thumbnailUrl: data.thumbnailUrl } : {}),
        ...(data.audience !== undefined ? { audience: data.audience } : {}),
        ...(data.price !== undefined ? { price: Number(data.price) } : {}),
        ...(data.mrp !== undefined ? { mrp: Number(data.mrp) } : {}),
        ...(data.isFree !== undefined ? { isFree: Boolean(data.isFree) } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
        ...(data.unlockRule !== undefined ? { unlockRule: data.unlockRule } : {}),
      },
    });
  }

  static async adminUpdateChapter(chapterId: string, data: any) {
    return prisma.courseChapter.update({
      where: { id: chapterId },
      data: {
        ...(data.worldName !== undefined ? { worldName: data.worldName } : {}),
        ...(data.theme !== undefined ? { theme: data.theme } : {}),
        ...(data.calmMode !== undefined ? { calmMode: Boolean(data.calmMode) } : {}),
        ...(data.contentStatus !== undefined ? { contentStatus: data.contentStatus } : {}),
        ...(data.expert !== undefined ? { expert: data.expert } : {}),
        ...(data.colors !== undefined ? { colors: data.colors } : {}),
      },
    });
  }

  static async adminUpdateLesson(lessonId: string, data: any) {
    const updatedLesson = await prisma.courseLesson.update({
      where: { id: lessonId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
        ...(data.freePreview !== undefined ? { freePreview: Boolean(data.freePreview) } : {}),
        ...(data.calmMode !== undefined ? { calmMode: Boolean(data.calmMode) } : {}),
        ...(data.contentStatus !== undefined ? { contentStatus: data.contentStatus } : {}),
        ...(data.video !== undefined ? { video: data.video } : {}),
        ...(data.topics !== undefined ? { topics: data.topics } : {}),
        ...(data.pauseAndThink !== undefined ? { pauseAndThink: data.pauseAndThink } : {}),
        ...(data.discoverCards !== undefined ? { discoverCards: data.discoverCards } : {}),
        ...(data.reflect !== undefined ? { reflect: data.reflect } : {}),
      },
    });

    if (data.activity !== undefined) {
      await prisma.courseActivity.updateMany({
        where: { lessonId },
        data: {
          ...(data.activity.name !== undefined ? { name: data.activity.name } : {}),
          ...(data.activity.type !== undefined ? { type: data.activity.type } : {}),
          ...(data.activity.estMinutes !== undefined ? { estMinutes: Number(data.activity.estMinutes) } : {}),
          ...(data.activity.payload !== undefined ? { payload: data.activity.payload } : {}),
        },
      });
    }

    return prisma.courseLesson.findUnique({
      where: { id: lessonId },
      include: { activity: true },
    }) || updatedLesson;
  }

  static async adminUpdateCheckin(checkinId: string, data: any) {
    return prisma.courseCheckin.update({
      where: { id: checkinId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.passThreshold !== undefined ? { passThreshold: Number(data.passThreshold) } : {}),
        ...(data.questions !== undefined ? { questions: data.questions } : {}),
        ...(data.calmMode !== undefined ? { calmMode: Boolean(data.calmMode) } : {}),
      },
    });
  }

  static async adminGrantEnrollment(payload: { identifier: string; plan?: string; amountPaid?: number }) {
    await ensureCourseSeeded();
    const raw = (payload.identifier || "").trim();
    if (!raw) throw new AppError("Phone, email, or user ID is required.", 400);

    const digits = raw.replace(/\D/g, "");
    const phoneSuffix = digits.length >= 10 ? digits.slice(-10) : digits;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: raw },
          { email: raw.toLowerCase() },
          { phone: raw },
          ...(phoneSuffix.length === 10
            ? [{ phone: phoneSuffix }, { phone: `+91${phoneSuffix}` }, { phone: `+1${phoneSuffix}` }]
            : []),
        ],
      },
      select: { id: true, phone: true, email: true, profile: { select: { displayName: true } } },
    });

    if (!user) {
      throw new AppError(`No user found matching "${raw}".`, 404);
    }

    return prisma.courseEnrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: COURSE_ID } },
      update: {
        status: "ACTIVE",
        pricePaid: Number(payload.amountPaid || 0),
      },
      create: {
        userId: user.id,
        courseId: COURSE_ID,
        status: "ACTIVE",
        pricePaid: Number(payload.amountPaid || 0),
      },
      include: {
        user: { select: { id: true, phone: true, email: true, profile: { select: { displayName: true } } } },
        course: { select: { id: true, title: true } },
      },
    });
  }

  static async adminUpdateEnrollmentStatus(enrollmentId: string, status: "ACTIVE" | "REVOKED") {
    const existing = await prisma.courseEnrollment.findUnique({ where: { id: enrollmentId } });
    if (!existing) throw new AppError("Enrollment not found.", 404);

    return prisma.courseEnrollment.update({
      where: { id: enrollmentId },
      data: { status },
      include: {
        user: { select: { id: true, phone: true, email: true, profile: { select: { displayName: true } } } },
        course: { select: { id: true, title: true } },
      },
    });
  }
}

