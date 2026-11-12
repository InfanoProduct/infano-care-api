import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { ensureCourseSeeded } from "./course.seed.js";

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
      if (p.completedAt) completedSet.add(p.lessonId);
    }

    const passedCheckins = new Set<string>();
    const bestCheckinScores: Record<string, number> = {};
    for (const att of checkinRows) {
      if (att.passed) passedCheckins.add(att.checkinId);
      if (bestCheckinScores[att.checkinId] === undefined || att.score > bestCheckinScores[att.checkinId]) {
        bestCheckinScores[att.checkinId] = att.score;
      }
    }

    // Compute chapter and lesson unlocks sequentially
    const unlockedChapters: string[] = [];
    const unlockedLessons: string[] = [];
    let nextLessonId: string | null = null;

    for (const ch of chapters) {
      let chUnlocked = false;
      if (!ch.unlockRequires) {
        chUnlocked = true;
      } else if (ch.unlockRequires.endsWith("_passed")) {
        const reqCheckinId = ch.unlockRequires.replace(/_passed$/, "");
        chUnlocked = passedCheckins.has(reqCheckinId);
      }

      if (chUnlocked) {
        unlockedChapters.push(ch.id);
      }

      for (let i = 0; i < ch.lessons.length; i++) {
        const l = ch.lessons[i];
        let lessonUnlocked = false;
        if (chUnlocked) {
          if (!l.unlockRequires) {
            lessonUnlocked = true;
          } else if (completedSet.has(l.unlockRequires)) {
            lessonUnlocked = true;
          } else if (i === 0) {
            // First lesson of an unlocked chapter is unlocked
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
    }

    const totalPetals = Math.max(learner.petalsCount || 0, ledgerSum._sum.delta || 0);
    const completedLessonsList = Array.from(completedSet);

    return {
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
      nextLessonId: nextLessonId || "l1-1",
      bloomChallengeUnlocked:
        passedCheckins.has("checkin-ch1") &&
        passedCheckins.has("checkin-ch2") &&
        passedCheckins.has("checkin-ch3") &&
        passedCheckins.has("checkin-ch4"),
      certificateUnlocked:
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

    let progress = null;
    let activityResult = null;

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
      if (bestScores[att.checkinId] === undefined || att.score > bestScores[att.checkinId]) {
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
}

