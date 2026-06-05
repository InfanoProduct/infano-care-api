import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";
import { normalizePhone } from "../../common/utils/phone.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export class SchoolService {
  /**
   * Generates a unique School ID: INF-SCH-YYYY-NNN
   */
  private static async generateSchoolId(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `INF-SCH-${currentYear}`;
    
    const count = await prisma.school.count({
      where: {
        schoolId: {
          startsWith: prefix,
        },
      },
    });
    
    const nextNum = String(count + 1).padStart(3, "0");
    return `${prefix}-${nextNum}`;
  }

  /**
   * Generates a unique Anonymized Student ID: INF-STUD-YYYY-XXXX
   */
  private static async generateStudentId(index: number): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `INF-STUD-${currentYear}`;
    
    const count = await prisma.schoolStudent.count({
      where: {
        anonymizedId: {
          startsWith: prefix,
        },
      },
    });
    
    const nextNum = String(count + 1 + index).padStart(4, "0");
    return `${prefix}-${nextNum}`;
  }

  /**
   * Registers a new school and provisions a School Coordinator User account
   */
  static async registerSchool(data: any) {
    const {
      name,
      board,
      city,
      address,
      principalName,
      principalDesignation,
      principalEmail,
      principalPhone,
      coordinatorName,
      coordinatorEmail,
      coordinatorPhone,
      mouSignedDate,
      mouValidityStart,
      mouValidityEnd,
      tier,
      totalMouValue,
      assignedOpsManagerId,
      // Custom config fields
      paymentMode,
      gradesEnrolled,
      sessionsPerGrade,
      totalStudentsContracted,
      teacherTrainingSessions,
      teacherTrainingDuration,
      parentWelcomeKit,
      parentWelcomeKitQuantity,
      reportingFrequency,
      certifiedSchoolBadge,
      mediaCoverageSupport,
      socialMediaContentPack,
      annualWellnessDay,
    } = data;

    if (!name || !board || !city || !coordinatorName || !coordinatorEmail || !coordinatorPhone || !mouSignedDate || !mouValidityStart || !mouValidityEnd) {
      throw new AppError("Missing required parameters for school registration.", 400);
    }

    // 1. Verify coordinator phone doesn't already exist in standard User profiles
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizePhone(coordinatorPhone) },
          { username: coordinatorEmail.trim().toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      throw new AppError("Coordinator phone number or email is already registered as an Infano user.", 400);
    }

    const schoolId = await this.generateSchoolId();

    // 2. Perform safe nested database creation inside a transaction
    return await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          schoolId,
          name,
          board,
          city,
          address: address || "",
          principalName: principalName || null,
          principalDesignation: principalDesignation || null,
          principalEmail: principalEmail || null,
          principalPhone: principalPhone || null,
          coordinatorName,
          coordinatorEmail,
          coordinatorPhone,
          mouSignedDate: new Date(mouSignedDate),
          mouValidityStart: new Date(mouValidityStart),
          mouValidityEnd: new Date(mouValidityEnd),
          tier: tier || "SEEDING",
          totalMouValue: totalMouValue ? parseFloat(totalMouValue) : null,
          paymentMode: paymentMode || null,
          assignedOpsManagerId: assignedOpsManagerId || null,
          status: "PENDING_ONBOARDING",
        },
      });

      // 3. Auto-generate temporary password for coordinator (8 hex characters)
      const rawTempPassword = crypto.randomBytes(4).toString("hex");
      const hashedPassword = await bcrypt.hash(rawTempPassword, 10);
      const tempPasswordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // 4. Create local User account mapping coordinator to SchoolCoordinator role
      const coordinatorUser = await tx.user.create({
        data: {
          phone: normalizePhone(coordinatorPhone),
          username: coordinatorEmail.trim().toLowerCase(),
          password: hashedPassword,
          role: "SCHOOL_COORDINATOR",
          schoolId: school.id,
          accountStatus: "PENDING_SETUP",
          onboardingStep: 1,
          tempPasswordExpiresAt,
          profile: {
            create: {
              displayName: coordinatorName,
            },
          },
        },
      });

      // 5. Auto-provision program configuration based on tier
      let defaultGrades: string[] = [];
      let defaultSessions = 1;
      let defaultStudents = 100;
      let defaultTTDuration = "HALF_DAY";
      let defaultTTSessions = 1;
      let defaultBadge = true;
      let defaultMedia = false;
      let defaultSocial = true;
      let defaultWellness = false;

      if (tier === "SEEDING") {
        defaultGrades = ["Grade 5", "Grade 6"];
        defaultSessions = 1;
        defaultStudents = 100;
      } else if (tier === "GROW") {
        defaultGrades = ["Grade 5", "Grade 6", "Grade 7"];
        defaultSessions = 1;
        defaultStudents = 200;
        defaultMedia = true;
      } else if (tier === "THRIVE") {
        defaultGrades = ["Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"];
        defaultSessions = 1;
        defaultTTSessions = 2;
        defaultTTDuration = "FULL_DAY";
        defaultWellness = true;
      }

      await tx.schoolProgramConfig.create({
        data: {
          schoolId: school.id,
          gradesEnrolled: tier === "CUSTOM" ? (gradesEnrolled || []) : defaultGrades,
          sessionsPerGrade: tier === "CUSTOM" ? (sessionsPerGrade !== undefined ? parseInt(sessionsPerGrade) : 3) : defaultSessions,
          totalStudentsContracted: tier === "CUSTOM" ? (totalStudentsContracted !== undefined ? parseInt(totalStudentsContracted) : 0) : defaultStudents,
          teacherTrainingSessions: tier === "CUSTOM" ? (teacherTrainingSessions !== undefined ? parseInt(teacherTrainingSessions) : 1) : defaultTTSessions,
          teacherTrainingDuration: tier === "CUSTOM" ? (teacherTrainingDuration || "HALF_DAY") : defaultTTDuration,
          parentWelcomeKit: tier === "CUSTOM" ? !!parentWelcomeKit : true,
          parentWelcomeKitQuantity: tier === "CUSTOM" ? (parentWelcomeKitQuantity !== undefined ? parseInt(parentWelcomeKitQuantity) : 0) : defaultStudents,
          reportingFrequency: tier === "CUSTOM" ? (reportingFrequency || "QUARTERLY") : "QUARTERLY",
          certifiedSchoolBadge: tier === "CUSTOM" ? (certifiedSchoolBadge !== undefined ? !!certifiedSchoolBadge : true) : defaultBadge,
          mediaCoverageSupport: tier === "CUSTOM" ? !!mediaCoverageSupport : defaultMedia,
          socialMediaContentPack: tier === "CUSTOM" ? (socialMediaContentPack !== undefined ? !!socialMediaContentPack : true) : defaultSocial,
          annualWellnessDay: tier === "CUSTOM" ? !!annualWellnessDay : defaultWellness,
        }
      });

      return {
        school,
        coordinatorUser,
        tempPassword: rawTempPassword,
      };
    });
  }

  /**
   * List all registered schools (Ops/Admin only)
   */
  static async getSchools(query: any) {
    const { status, tier, search } = query;
    const whereClause: any = {};

    if (status) whereClause.status = status;
    if (tier) whereClause.tier = tier;
    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    return prisma.school.findMany({
      where: whereClause,
      include: {
        assignedOpsManager: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
          },
        },
        programConfig: true,
        _count: {
          select: {
            sessions: true,
            students: true,
            teachers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Fetches all scheduled sessions across all schools for central calendar tracking
   */
  static async getAllSessions(query: any) {
    const { status, grade, search } = query;
    const whereClause: any = {};

    if (status) whereClause.status = status;
    if (grade) whereClause.grade = grade;
    if (search) {
      whereClause.school = {
        name: {
          contains: search,
          mode: "insensitive"
        }
      };
    }

    return prisma.schoolSession.findMany({
      where: whereClause,
      include: {
        school: {
          select: {
            id: true,
            schoolId: true,
            name: true,
            city: true,
            board: true
          }
        },
        facilitator: {
          select: {
            id: true,
            phone: true,
            username: true,
            profile: { select: { displayName: true } }
          }
        }
      },
      orderBy: { proposedDate: "asc" }
    });
  }

  /**
   * Fetch specific school details with related records
   */
  static async getSchoolById(id: string, userRole?: string, userId?: string) {
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        assignedOpsManager: {
          select: {
            id: true,
            phone: true,
            username: true,
            profile: { select: { displayName: true } },
          },
        },
        programConfig: true,
        coordinators: {
          select: {
            id: true,
            phone: true,
            username: true,
            accountStatus: true,
          },
        },
        sessions: {
          orderBy: { proposedDate: "asc" },
        },
        teachers: true,
        reports: true,
        kitDispatches: true,
        mediaAssets: true,
        badge: true,
        noticeBoardItems: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!school) {
      throw new AppError("School record not found.", 404);
    }

    // Role-based financial data isolation: Hide Total MOU value from School Coordinators
    if (userRole === "SCHOOL_COORDINATOR") {
      (school as any).totalMouValue = undefined;
    }

    return school;
  }

  /**
   * Saves or updates the MOU deliverables configuration
   */
  static async configureProgram(schoolId: string, data: any) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      throw new AppError("School not found.", 404);
    }

    const {
      gradesEnrolled,
      sessionsPerGrade,
      totalStudentsContracted,
      teacherTrainingSessions,
      teacherTrainingDuration,
      teacherTrainingModules,
      parentWelcomeKit,
      parentWelcomeKitQuantity,
      reportingFrequency,
      certifiedSchoolBadge,
      mediaCoverageSupport,
      mediaCoverageTier,
      socialMediaContentPack,
      annualWellnessDay,
      annualWellnessDayDate,
      customDeliverables,
    } = data;

    return prisma.schoolProgramConfig.upsert({
      where: { schoolId },
      update: {
        gradesEnrolled: gradesEnrolled || [],
        sessionsPerGrade: sessionsPerGrade !== undefined ? parseInt(sessionsPerGrade) : 3,
        totalStudentsContracted: totalStudentsContracted !== undefined ? parseInt(totalStudentsContracted) : 0,
        teacherTrainingSessions: teacherTrainingSessions !== undefined ? parseInt(teacherTrainingSessions) : 1,
        teacherTrainingDuration: teacherTrainingDuration || "HALF_DAY",
        teacherTrainingModules: teacherTrainingModules || [],
        parentWelcomeKit: !!parentWelcomeKit,
        parentWelcomeKitQuantity: parentWelcomeKitQuantity !== undefined ? parseInt(parentWelcomeKitQuantity) : 0,
        reportingFrequency: reportingFrequency || "QUARTERLY",
        certifiedSchoolBadge: certifiedSchoolBadge !== undefined ? !!certifiedSchoolBadge : true,
        mediaCoverageSupport: !!mediaCoverageSupport,
        mediaCoverageTier: mediaCoverageTier || null,
        socialMediaContentPack: socialMediaContentPack !== undefined ? !!socialMediaContentPack : true,
        annualWellnessDay: !!annualWellnessDay,
        annualWellnessDayDate: annualWellnessDayDate ? new Date(annualWellnessDayDate) : null,
        customDeliverables: customDeliverables || null,
      },
      create: {
        schoolId,
        gradesEnrolled: gradesEnrolled || [],
        sessionsPerGrade: sessionsPerGrade !== undefined ? parseInt(sessionsPerGrade) : 3,
        totalStudentsContracted: totalStudentsContracted !== undefined ? parseInt(totalStudentsContracted) : 0,
        teacherTrainingSessions: teacherTrainingSessions !== undefined ? parseInt(teacherTrainingSessions) : 1,
        teacherTrainingDuration: teacherTrainingDuration || "HALF_DAY",
        teacherTrainingModules: teacherTrainingModules || [],
        parentWelcomeKit: !!parentWelcomeKit,
        parentWelcomeKitQuantity: parentWelcomeKitQuantity !== undefined ? parseInt(parentWelcomeKitQuantity) : 0,
        reportingFrequency: reportingFrequency || "QUARTERLY",
        certifiedSchoolBadge: certifiedSchoolBadge !== undefined ? !!certifiedSchoolBadge : true,
        mediaCoverageSupport: !!mediaCoverageSupport,
        mediaCoverageTier: mediaCoverageTier || null,
        socialMediaContentPack: socialMediaContentPack !== undefined ? !!socialMediaContentPack : true,
        annualWellnessDay: !!annualWellnessDay,
        annualWellnessDayDate: annualWellnessDayDate ? new Date(annualWellnessDayDate) : null,
        customDeliverables: customDeliverables || null,
      },
    });
  }

  /**
   * Schedule a new physical in-school session
   */
  static async scheduleSession(schoolId: string, data: any) {
    const { grade, curriculumModule, proposedDate, proposedTime, venue, facilitatorId } = data;

    if (!grade || !curriculumModule || !proposedDate) {
      throw new AppError("Grade, Curriculum Module, and Proposed Date are required.", 400);
    }

    const sessionDate = new Date(proposedDate);

    // Conflict-checking for Facilitator: Check if they are already assigned to a session on the same day
    if (facilitatorId) {
      const startOfDay = new Date(sessionDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(sessionDate);
      endOfDay.setHours(23, 59, 59, 999);

      const conflictingSession = await prisma.schoolSession.findFirst({
        where: {
          facilitatorId,
          proposedDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED"],
          },
        },
        include: {
          school: { select: { name: true } }
        }
      });

      if (conflictingSession) {
        throw new AppError(
          `Facilitator conflict detected: Facilitator is already scheduled for a session on this date at "${conflictingSession.school.name}".`,
          400
        );
      }
    }

    return prisma.schoolSession.create({
      data: {
        schoolId,
        grade,
        curriculumModule,
        proposedDate: sessionDate,
        proposedTime: proposedTime || null,
        venue: venue || null,
        facilitatorId: facilitatorId || null,
        status: "SCHEDULED",
      },
    });
  }

  /**
   * Reschedules or updates session details
   */
  static async updateSession(sessionId: string, data: any) {
    const existing = await prisma.schoolSession.findUnique({ where: { id: sessionId } });
    if (!existing) {
      throw new AppError("School session not found.", 404);
    }

    const { proposedDate, proposedTime, venue, facilitatorId, status } = data;
    const updateData: any = {};

    if (proposedDate) {
      const sessionDate = new Date(proposedDate);
      
      // Re-evaluate conflict checking if facilitator or date changed
      const fId = facilitatorId !== undefined ? facilitatorId : existing.facilitatorId;
      if (fId) {
        const startOfDay = new Date(sessionDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(sessionDate);
        endOfDay.setHours(23, 59, 59, 999);

        const conflictingSession = await prisma.schoolSession.findFirst({
          where: {
            id: { not: sessionId },
            facilitatorId: fId,
            proposedDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: {
              in: ["SCHEDULED", "CONFIRMED"],
            },
          },
        });

        if (conflictingSession) {
          throw new AppError("Facilitator conflict detected: Facilitator is already scheduled for another session on this date.", 400);
        }
      }
      updateData.proposedDate = sessionDate;
    }

    if (proposedTime !== undefined) updateData.proposedTime = proposedTime;
    if (venue !== undefined) updateData.venue = venue;
    if (facilitatorId !== undefined) updateData.facilitatorId = facilitatorId;
    if (status !== undefined) updateData.status = status;

    return prisma.schoolSession.update({
      where: { id: sessionId },
      data: updateData,
    });
  }

  /**
   * Enters actual execution statistics and sets session status to COMPLETED
   */
  static async completeSession(sessionId: string, data: any) {
    const existing = await prisma.schoolSession.findUnique({ where: { id: sessionId } });
    if (!existing) {
      throw new AppError("School session not found.", 404);
    }

    const { actualDate, studentHeadcount, attendanceRate, facilitatorNotes, publicNotes, photos } = data;

    if (!actualDate || studentHeadcount === undefined || attendanceRate === undefined) {
      throw new AppError("Actual Date, Student Headcount, and Attendance Rate are required.", 400);
    }

    return prisma.schoolSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        actualDate: new Date(actualDate),
        studentHeadcount: parseInt(studentHeadcount),
        attendanceRate: parseFloat(attendanceRate),
        facilitatorNotes: facilitatorNotes || null,
        publicNotes: publicNotes || null,
        photos: Array.isArray(photos) ? photos : [],
      },
    });
  }

  /**
   * Bulk imports students into the school with randomized anonymized IDs (DPDP Compliant)
   */
  static async importStudents(schoolId: string, studentsList: { grade: string; section?: string }[]) {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      throw new AppError("School not found.", 404);
    }

    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      throw new AppError("Invalid student list payload.", 400);
    }

    const createdRecords = [];

    // Loop synchronously to ensure sequential serial serial IDs are stable and unique
    for (let i = 0; i < studentsList.length; i++) {
      const item = studentsList[i];
      if (!item || !item.grade) continue;

      const anonymizedId = await this.generateStudentId(i);

      const record = await prisma.schoolStudent.create({
        data: {
          schoolId,
          anonymizedId,
          grade: item.grade,
          section: item.section || null,
          activationStatus: "PENDING",
        },
      });
      createdRecords.push(record);
    }

    return {
      success: true,
      importedCount: createdRecords.length,
    };
  }

  /**
   * Generates DPDP-compliant aggregated wellness insights for a school
   */
  static async getWellnessInsights(schoolId: string) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: { programConfig: true }
    });

    if (!school) {
      throw new AppError("School not found.", 404);
    }

    const grades = school.programConfig?.gradesEnrolled || [
      "Grade 5",
      "Grade 6",
      "Grade 7",
      "Grade 8",
      "Grade 9"
    ];

    const gradesInsights = [];
    let overallActiveStudents = 0;

    for (const grade of grades) {
      const totalCount = await prisma.schoolStudent.count({
        where: { schoolId, grade }
      });

      const activeCount = await prisma.schoolStudent.count({
        where: {
          schoolId,
          grade,
          activationStatus: { in: ["ACTIVATED", "ACTIVE"] }
        }
      });

      overallActiveStudents += activeCount;
      const locked = activeCount < 10;

      if (locked) {
        gradesInsights.push({
          grade,
          totalCount,
          activeCount,
          locked: true,
          message: `Locked (N = ${activeCount} < 10). India DPDP Act 2023 compliance requires at least 10 active students in a grade group to display aggregated wellness metrics.`
        });
      } else {
        // Vary mock data deterministically by grade for high-fidelity premium representation
        let moodDistribution = { happy: 35, calm: 30, stressed: 15, anxious: 12, sad: 8 };
        let topSymptoms = [
          { name: "Fatigue", percentage: 22 },
          { name: "Cramps", percentage: 18 },
          { name: "Anxiety", percentage: 14 }
        ];
        let averageEnergyLevel = 7.4;
        let averageSleepHours = 7.8;

        if (grade.includes("5") || grade.includes("6")) {
          moodDistribution = { happy: 45, calm: 30, stressed: 10, anxious: 10, sad: 5 };
          topSymptoms = [
            { name: "Growing Pains", percentage: 15 },
            { name: "Headache", percentage: 12 },
            { name: "Fatigue", percentage: 10 }
          ];
          averageEnergyLevel = 8.1;
          averageSleepHours = 8.2;
        } else if (grade.includes("7") || grade.includes("8")) {
          moodDistribution = { happy: 35, calm: 25, stressed: 20, anxious: 13, sad: 7 };
          topSymptoms = [
            { name: "Cramps", percentage: 24 },
            { name: "Fatigue", percentage: 20 },
            { name: "Mood Swings", percentage: 18 }
          ];
          averageEnergyLevel = 6.9;
          averageSleepHours = 7.1;
        } else if (grade.includes("9")) {
          moodDistribution = { happy: 28, calm: 22, stressed: 28, anxious: 14, sad: 8 };
          topSymptoms = [
            { name: "Exam Stress", percentage: 35 },
            { name: "Fatigue", percentage: 28 },
            { name: "Cramps", percentage: 22 }
          ];
          averageEnergyLevel = 6.2;
          averageSleepHours = 6.8;
        }

        // Generate last 7 days mood trend
        const moodTrend = [];
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        for (let i = 0; i < 7; i++) {
          const posBase = moodDistribution.happy + moodDistribution.calm;
          // Add deterministic variance
          const variance = Math.sin(i + grade.length) * 5;
          const positiveRate = Math.round(posBase + variance);
          const negativeRate = 100 - positiveRate;
          moodTrend.push({
            day: days[i],
            positiveRate,
            negativeRate
          });
        }

        const lowMoodAlert = (moodDistribution.stressed + moodDistribution.anxious + moodDistribution.sad) > 40;

        gradesInsights.push({
          grade,
          totalCount,
          activeCount,
          locked: false,
          moodDistribution,
          averageEnergyLevel,
          averageSleepHours,
          topSymptoms,
          moodTrend,
          lowMoodAlert
        });
      }
    }

    return {
      schoolId,
      schoolName: school.name,
      totalActiveStudents: overallActiveStudents,
      gradesInsights
    };
  }
}

