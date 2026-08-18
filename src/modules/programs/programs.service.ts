import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class ProgramsService {
  static getMockSessionsForProgram(title: string) {
    const uppercaseTitle = title.toUpperCase();

    const sessionsMap: Record<string, { title: string; description: string }[]> = {
      'SPARK': [
        {
          title: "Session 1: The Blueprint of You",
          description: "Understanding human growth as a natural, unique, and positive timeline for every individual."
        },
        {
          title: "Session 2: Body Unfiltered",
          description: "Demystifying the physical shifts, developmental stages, and growth spurts of early adolescence."
        },
        {
          title: "Session 3: Period. Full Stop.",
          description: "A complete, shame-free first period survival guide, from biological facts to practical management and comfort."
        },
        {
          title: "Session 4: Myth Busters: Family Edition",
          description: "Breaking down ancient taboos and cultural legends, and starting positive, open conversations at home."
        },
        {
          title: "Session 5: My Body, My Boundary",
          description: "Establishing strong, comfortable personal zones and mastering the art of the confident boundary."
        },
        {
          title: "Session 6: The Filter Lie",
          description: "Decoding social media perfection, airbrushing, and cultivating love for your authentic, unfiltered self."
        },
        {
          title: "Session 7: Feel It to Deal It",
          description: "Understanding emotional tides, mapping mood patterns, and practicing healthy coping mechanisms."
        },
        {
          title: "Session 8: Becoming My Own Champion",
          description: "Celebrating personal milestones, practicing self-compassion, and designing a path of ongoing confidence."
        }
      ],
      'RISE': [
        {
          title: "Session 1: Who Am I When No One is Watching?",
          description: "Deeply exploring self-identity, personal values, and defining your own core character."
        },
        {
          title: "Session 2: Consent is Not Just a Buzzword",
          description: "Setting robust rules for your own physical, emotional, and social boundaries."
        },
        {
          title: "Session 3: Grooming Has a Script",
          description: "Learning to spot early manipulation patterns, unsafe environments, and protect boundaries."
        },
        {
          title: "Session 4: Your Digital Footprint is Permanent",
          description: "Smart management of online reputation, private data, sharing habits, and screen ethics."
        },
        {
          title: "Session 5: Red Flags & Green Flags",
          description: "Identifying healthy, collaborative dynamics vs. toxic, manipulative patterns in peer relationships."
        },
        {
          title: "Session 6: The Hormone Weather Report",
          description: "Decoding chemical shifts and emotional weather reports to manage mood variability."
        },
        {
          title: "Session 7: Digital Wellness & Screen Balance",
          description: "Strategies to beat screen fatigue, doomscrolling, and establishing high-yield offline hobbies."
        },
        {
          title: "Session 8: Negotiating Peer Pressure",
          description: "Mastering custom scripts and assertive verbal templates to stay safe and true to yourself."
        },
        {
          title: "Session 9: The Power of Trusted Circles",
          description: "How to audit, assemble, and safely leverage your support system of parents and mentors."
        },
        {
          title: "Session 10: Stepping Into Your Voice",
          description: "Synthesizing the Rise curriculum with a personal boundary action plan and graduation."
        }
      ],
      'BLOOM': [
        {
          title: "Session 1: Mental Health is Not 'Drama'",
          description: "De-stigmatizing intense stress, mood fluctuations, and identifying the spectrum of anxiety and wellness."
        },
        {
          title: "Session 2: Depression Doesn't Look Like the Movies",
          description: "Spotting signs of prolonged sadness in yourself and friends, and understanding when to seek active help."
        },
        {
          title: "Session 3: Friendship Expiry Dates",
          description: "Gracefully navigating changing social dynamics, outgrowing school circles, and ending relationships safely."
        },
        {
          title: "Session 4: The Comparison Trap",
          description: "Breaking free from the toxic patterns of comparing grades, bodies, lifestyles, and aesthetics online."
        },
        {
          title: "Session 5: PCOS & Pain: Unfiltered",
          description: "Understanding reproductive health disorders, hormonal balance, and talking confidently to doctors."
        },
        {
          title: "Session 6: Safe Havens & Professional Support",
          description: "Demystifying therapy, student counseling, medical resources, and removing the fear of asking."
        },
        {
          title: "Session 7: Emotional First Aid",
          description: "Practical mindfulness, vagus nerve stimulation, and quick breathing techniques to halt panic states."
        },
        {
          title: "Session 8: Self-Compassion in Action",
          description: "Silencing the harsh inner critic and implementing daily habits of authentic self-acceptance."
        },
        {
          title: "Session 9: Parent-Teen Bridge Building",
          description: "Formulating mutual respect pathways, managing daily friction, and communicating emotional needs."
        },
        {
          title: "Session 10: Blooming Into Resilience",
          description: "Constructing a strong bounce-back architecture for academic and personal life, with graduation."
        }
      ],
      'IGNITE': [
        {
          title: "Session 1: Feminism: Decoded & Debunked",
          description: "Examining equity, historic struggles, modern stereotypes, and cultivating sisterhood and allyship."
        },
        {
          title: "Session 2: Financial Literacy: Part 1",
          description: "Understanding money flow, power of compound interest, basic personal savings, and budgeting."
        },
        {
          title: "Session 3: Financial Literacy: Part 2",
          description: "Decoding digital banking, cards, online safety, investment assets, and financial independence goals."
        },
        {
          title: "Session 4: Negotiating Your Worth",
          description: "Learning confident advocacy in academic, family, and social environments with structured talk paths."
        },
        {
          title: "Session 5: Unmasking Media Influence",
          description: "Analyzing hidden agendas, advertising psychology, body norms, and media bias."
        },
        {
          title: "Session 6: Leadership Under Pressure",
          description: "Making crucial, ethical choices, maintaining team performance, and staying resilient under crisis."
        },
        {
          title: "Session 7: Designing Your Future Vision",
          description: "Formulating long-term visions, career tracking, and identifying your natural passions and strengths."
        },
        {
          title: "Session 8: Communication Mastery",
          description: "Assertive body language, tone modulation, public confidence, and active listening scripts."
        },
        {
          title: "Session 9: Time Management & Focus Hacks",
          description: "Beating procrastination through custom workflows, calendars, and digital prioritization."
        },
        {
          title: "Session 10: Public Speaking & Pitching",
          description: "Structuring short speeches, presenting school projects, and pitching ideas with absolute poise."
        },
        {
          title: "Session 11: Mentor Relationship Building",
          description: "Identifying, approaching, and building collaborative relationships with professional mentors."
        },
        {
          title: "Session 12: Sparking Your Ignite Pitch",
          description: "Showcasing your personal leadership project, graduation celebration, and looking forward."
        }
      ],
      'UNSTOPPABLE': [
        {
          title: "Session 1: Life on My Own Terms",
          description: "Developing your personal manifesto, establishing independent core values, and charting growth."
        },
        {
          title: "Session 2: Adulting 101: The Basics",
          description: "Essential home skills, nutrition planning, laundry, space organization, and independent routine setup."
        },
        {
          title: "Session 3: Adulting 101: Taxes & Rent",
          description: "Practical guide to rental agreements, tenant laws, tax brackets, utilities, and emergency funds."
        },
        {
          title: "Session 4: Healthy Intimacy & Love",
          description: "Safe boundaries, relationship safety, healthy dating patterns, and signs of mutual growth."
        },
        {
          title: "Session 5: Recognizing Toxic Dynamics",
          description: "Spotting manipulation, narcissism, gaslighting, emotional abuse, and enforcing swift exits."
        },
        {
          title: "Session 6: Career Blueprinting & CVs",
          description: "Crafting modern resumes, optimization of digital footprints (LinkedIn), and job interview simulation."
        },
        {
          title: "Session 7: Networking & Professional Circles",
          description: "Effective follow-ups, informational interviews, and leveraging standard professional networks."
        },
        {
          title: "Session 8: Bounce-Back Resilience",
          description: "Handling academic failure, job rejection, personal setbacks, and coping with dynamic shifts."
        },
        {
          title: "Session 9: Safe Travel & Solo Survival",
          description: "Navigating new cities, public transit safety, personal protection plans, and emergency response."
        },
        {
          title: "Session 10: Becoming Your Own Anchor",
          description: "Managing solitary transitions, building deep self-comfort, and prioritizing long-term mental wellness."
        },
        {
          title: "Session 11: Healthy Lifelong Habits",
          description: "Maintaining sleep integrity, periodic medical tests, balanced routines, and structural work-life harmony."
        },
        {
          title: "Session 12: Unstoppable Graduation",
          description: "Final reflection presentation, sharing positive cohort affirmations, and official program graduation."
        }
      ]
    };

    const foundKey = Object.keys(sessionsMap).find(k => uppercaseTitle.includes(k));
    if (foundKey) {
      return sessionsMap[foundKey];
    }

    return sessionsMap[uppercaseTitle] || sessionsMap['SPARK'] || [];
  }

  private static slugifyTitle(title: string): string {
    return (title || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /**
   * List all active programs, optionally showing user eligibility
   */
  static async listActive(userId?: string) {
    const programs = await prisma.program.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
    });

    return programs.map(p => ({
      ...p,
      slug: this.slugifyTitle(p.title),
      isEligible: true,
      sessionsList: p.curriculum && Array.isArray(p.curriculum) && p.curriculum.length > 0
        ? (p.curriculum as any[])
        : this.getMockSessionsForProgram(p.title)
    }));
  }

  /**
   * Get single program details
   */
  static async getById(idOrTitle: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrTitle);

    let program;
    if (isUuid) {
      program = await prisma.program.findUnique({
        where: { id: idOrTitle },
      });
    } else {
      const decoded = decodeURIComponent(idOrTitle).trim();
      program = await prisma.program.findFirst({
        where: {
          title: {
            equals: decoded,
            mode: "insensitive"
          }
        }
      });

      if (!program) {
        const targetSlug = this.slugifyTitle(decoded);
        const allPrograms = await prisma.program.findMany();
        program = allPrograms.find(p => this.slugifyTitle(p.title) === targetSlug || p.id === idOrTitle);
      }
    }

    if (!program) {
      throw new AppError("Program not found", 404);
    }

    return {
      ...program,
      slug: this.slugifyTitle(program.title),
      sessionsList: program.curriculum && Array.isArray(program.curriculum) && program.curriculum.length > 0
        ? (program.curriculum as any[])
        : this.getMockSessionsForProgram(program.title)
    };
  }

  /**
   * Enroll a user in a program
   */
  static async enrollUser(userId: string, programId: string) {
    // 1. Fetch program
    const program = await prisma.program.findUnique({
      where: { id: programId },
    });
    if (!program) {
      throw new AppError("Program not found", 404);
    }
    if (!program.isActive) {
      throw new AppError("This program is currently not active", 400);
    }

    // 2. Fetch user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    // 3. Determine price
    const pricePaid = program.price;

    // 4. Create enrollment (upsert or simple create with catch for duplicates)
    try {
      const enrollment = await prisma.programEnrollment.create({
        data: {
          userId,
          programId,
          pricePaid,
          status: "ACTIVE"
        },
        include: {
          program: true
        }
      });
      return { success: true, message: "Enrolled successfully", enrollment };
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new AppError("You are already enrolled in this program", 400);
      }
      throw e;
    }
  }

  /**
   * Fetch all enrollments for a user
   */
  static async getUserEnrollments(userId: string) {
    // Check if the user is a teen with a linked parent
    const links = await prisma.parentLink.findMany({
      where: {
        OR: [
          { teenId: userId },
          { parentId: userId }
        ],
        status: "LINKED"
      },
      select: { parentId: true, teenId: true }
    });

    const relatedIds = [userId];
    links.forEach(link => {
      if (link.parentId) relatedIds.push(link.parentId);
      if (link.teenId) relatedIds.push(link.teenId);
    });

    const uniqueIds = [...new Set(relatedIds)];

    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        userId: { in: uniqueIds },
        status: "ACTIVE",
        program: { isActive: true }
      },
      include: {
        program: true,
        batch: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            maxCapacity: true
          }
        },
        user: {
          select: {
            id: true,
            role: true,
            username: true,
            phone: true,
            email: true,
            parentEmail: true,
            profile: {
              select: { displayName: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const batchIds = enrollments.map(e => e.batchId).filter((id): id is string => Boolean(id));

    const allSessions = await prisma.expertSessionSchedule.findMany({
      where: {
        OR: [
          { userId: { in: uniqueIds } },
          ...(batchIds.length > 0 ? [{ batchId: { in: batchIds } }] : [])
        ],
        status: { in: ["SCHEDULED", "COMPLETED"] }
      }
    });

    return enrollments.map(enr => {
      const programSessions = allSessions.filter(s =>
        s.programId === enr.programId && (s.userId === enr.userId || (enr.batchId && s.batchId === enr.batchId))
      );
      return {
        ...enr,
        program: {
          ...enr.program,
          sessionsList: this.getMockSessionsForProgram(enr.program.title)
        },
        user: {
          ...enr.user,
          scheduledSessions: programSessions
        }
      };
    });
  }

  /* =========================================
   * Admin-Only Methods
   * ========================================= */

  static async adminList() {
    const programs = await prisma.program.findMany({
      orderBy: { title: "asc" }
    });
    return programs.map(p => ({
      ...p,
      sessionsList: p.curriculum && Array.isArray(p.curriculum) && p.curriculum.length > 0
        ? (p.curriculum as any[])
        : this.getMockSessionsForProgram(p.title)
    }));
  }

  static async adminCreate(data: any) {
    // Validate required fields
    if (!data.title || !data.duration) {
      throw new AppError("Missing required fields for creating a program", 400);
    }

    return prisma.program.create({
      data: {
        title: data.title,
        tagline: data.tagline || "",
        description: data.description || "",
        classRange: data.classRange || null,
        minClass: data.minClass !== undefined && data.minClass !== null ? parseInt(data.minClass) : null,
        maxClass: data.maxClass !== undefined && data.maxClass !== null ? parseInt(data.maxClass) : null,
        thumbnailUrl: data.thumbnailUrl || null,
        duration: data.duration,
        topics: Array.isArray(data.topics) ? data.topics : [],
        price: parseFloat(data.price) || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        curriculum: data.curriculum !== undefined ? data.curriculum : [],
        consultations: data.consultations !== undefined ? data.consultations : [],
        features: Array.isArray(data.features) ? data.features : [],
        enrolledCount: data.enrolledCount !== undefined ? parseInt(data.enrolledCount) : 1200
      }
    });
  }

  static async adminUpdate(id: string, data: any) {
    const existing = await prisma.program.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Program not found", 404);
    }

    return prisma.program.update({
      where: { id },
      data: {
        title: data.title,
        tagline: data.tagline,
        description: data.description,
        classRange: data.classRange !== undefined ? data.classRange : undefined,
        minClass: data.minClass !== undefined ? (data.minClass !== null ? parseInt(data.minClass) : null) : undefined,
        maxClass: data.maxClass !== undefined ? (data.maxClass !== null ? parseInt(data.maxClass) : undefined) : undefined,
        thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl : undefined,
        duration: data.duration,
        topics: Array.isArray(data.topics) ? data.topics : undefined,
        price: data.price !== undefined ? parseFloat(data.price) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        curriculum: data.curriculum !== undefined ? data.curriculum : undefined,
        consultations: data.consultations !== undefined ? data.consultations : undefined,
        features: Array.isArray(data.features) ? data.features : undefined,
        enrolledCount: data.enrolledCount !== undefined ? parseInt(data.enrolledCount) : undefined
      }
    });
  }

  static async adminDelete(id: string) {
    const existing = await prisma.program.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Program not found", 404);
    }
    return prisma.program.delete({
      where: { id }
    });
  }

  static async adminListEnrollments() {
    return prisma.programEnrollment.findMany({
      include: {
        program: {
          select: {
            id: true,
            title: true
          }
        },
        batch: {
          select: {
            id: true,
            name: true,
            status: true,
            maxCapacity: true,
            expert: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            role: true,
            username: true,
            phone: true,
            parentEmail: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async adminUpdateEnrollment(id: string, data: { status?: string; batchId?: string | null }) {
    const existing = await prisma.programEnrollment.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Enrollment record not found", 404);
    }

    const updateData: any = {};
    if (data.status !== undefined && data.status !== null) {
      updateData.status = data.status;
    }

    if (data.batchId !== undefined) {
      if (data.batchId && data.batchId !== "" && data.batchId !== "unassigned") {
        const batch = await prisma.programBatch.findUnique({ where: { id: data.batchId } });
        if (!batch) {
          throw new AppError("Batch not found", 404);
        }
        if (batch.programId !== existing.programId) {
          throw new AppError("Selected batch does not belong to this enrollment's program", 400);
        }
        updateData.batchId = data.batchId;
      } else {
        updateData.batchId = null;
      }
    }

    return prisma.programEnrollment.update({
      where: { id },
      data: updateData,
      include: {
        program: {
          select: {
            id: true,
            title: true
          }
        },
        batch: {
          select: {
            id: true,
            name: true,
            status: true,
            maxCapacity: true,
            expert: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    displayName: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            role: true,
            username: true,
            phone: true,
            parentEmail: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }

  static async adminCreateEnrollment(data: any) {
    const { studentName, phone, email, role, programId, batchId, pricePaid } = data;

    if (!studentName || !phone || !programId) {
      throw new AppError("Missing required fields: studentName, phone, programId", 400);
    }

    // 1. Fetch program
    const program = await prisma.program.findUnique({
      where: { id: programId },
    });
    if (!program) {
      throw new AppError("Program not found", 404);
    }

    // Optional batch validation
    if (batchId) {
      const batch = await prisma.programBatch.findUnique({
        where: { id: batchId }
      });
      if (!batch || batch.programId !== programId) {
        throw new AppError("Selected batch does not belong to this program", 400);
      }
    }

    // Normalize phone
    const { normalizePhone } = await import("../../common/utils/phone.js");
    const normalizedPhone = normalizePhone(phone);

    // 2. Find or create user
    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          email: email || null,
          role: role as any,
          accountStatus: "PENDING_SETUP",
          onboardingStep: 1,
          profile: {
            create: {
              displayName: studentName,
              totalPoints: 0,
            }
          }
        }
      });
    } else {
      // If user exists, optionally update email if not set
      if (email && !user.email) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email }
        });
      }
      // Check if profile exists
      const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
      if (!profile) {
        await prisma.profile.create({
          data: {
            userId: user.id,
            displayName: studentName,
            totalPoints: 0
          }
        });
      } else if (!profile.displayName) {
        await prisma.profile.update({
          where: { userId: user.id },
          data: { displayName: studentName }
        });
      }
    }

    // Determine price
    const finalPrice = pricePaid !== undefined && pricePaid !== "" ? Number(pricePaid) : program.price;

    // 3. Create program enrollment
    try {
      const enrollment = await prisma.programEnrollment.create({
        data: {
          userId: user.id,
          programId,
          batchId: batchId || null,
          pricePaid: finalPrice,
          status: "ACTIVE",
          guestName: studentName,
          guestEmail: email || null,
        },
        include: {
          program: {
            select: {
              title: true
            }
          },
          batch: {
            select: {
              id: true,
              name: true
            }
          },
          user: {
            select: {
              role: true,
              username: true,
              phone: true,
              parentEmail: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      });

      return { success: true, message: "Enrolled successfully", enrollment };
    } catch (e: any) {
      if (e.code === "P2002") {
        throw new AppError("Student is already enrolled in this program", 400);
      }
      throw e;
    }
  }

  /* =========================================
   * Demo Sessions Methods
   * ========================================= */

  static async getBookedSlots(date: string) {
    const bookedDemos = await prisma.demoSession.findMany({
      where: {
        slotDate: date,
      },
      select: {
        slotTime: true,
      },
    });
    return bookedDemos.map((d) => d.slotTime);
  }

  static async bookDemoSession(data: any, loggedInUserId?: string) {
    if (!data.parentName || !data.phone || !data.slotDate || !data.slotTime) {
      throw new AppError("Missing required fields for booking a demo session (parentName, phone, slotDate, slotTime)", 400);
    }

    const bookingCount = await prisma.demoSession.count({
      where: {
        slotDate: data.slotDate,
        slotTime: data.slotTime,
      }
    });
    if (bookingCount >= 2) {
      throw new AppError("This slot is already fully booked. Please choose a different date or time.", 400);
    }

    const { normalizePhone } = await import("../../common/utils/phone.js");
    const normalizedPhone = normalizePhone(data.phone);

    // Resolve email to send confirmation to
    let emailToSend = data.email || null;

    // If logged in, prioritize retrieving email from their user record
    if (!emailToSend && loggedInUserId) {
      const loggedInUser = await prisma.user.findUnique({
        where: { id: loggedInUserId }
      });
      if (loggedInUser) {
        emailToSend = loggedInUser.email || loggedInUser.parentEmail || null;
      }
    }

    // If not resolved yet (e.g. guest or missing field), check by phone search matching existing user
    if (!emailToSend && data.phone) {
      const rawPhone = data.phone.replace(/[^\d]/g, '');
      const last10Digits = rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;

      const matchingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: data.phone },
            { phone: { endsWith: last10Digits } }
          ]
        }
      });
      if (matchingUser) {
        emailToSend = matchingUser.email || matchingUser.parentEmail || null;
      }
    }

    const demo = await prisma.demoSession.create({
      data: {
        parentName: data.parentName,
        phone: normalizedPhone,
        email: emailToSend,
        classRange: data.classRange || null,
        confidence: data.confidence || "",
        interests: Array.isArray(data.interests) ? data.interests : [],
        hasMentor: data.hasMentor || "",
        challenges: Array.isArray(data.challenges) ? data.challenges : [],
        learningPref: data.learningPref || "",
        parentInvolvement: data.parentInvolvement || "",
        suggestedPrograms: Array.isArray(data.suggestedPrograms) ? data.suggestedPrograms : [],
        slotDate: data.slotDate || null,
        slotTime: data.slotTime || null,
        status: "PENDING"
      }
    });

    if (emailToSend) {
      // Trigger confirmation email asynchronously
      try {
        let programsList: any[] = [];
        if (Array.isArray(data.suggestedPrograms) && data.suggestedPrograms.length > 0) {
          programsList = await prisma.program.findMany({
            where: {
              OR: [
                { id: { in: data.suggestedPrograms } },
                { title: { in: data.suggestedPrograms } }
              ]
            }
          });
        }

        const { sendDemoSessionBookedEmail } = await import("../../common/services/email.service.js");
        await sendDemoSessionBookedEmail(emailToSend, {
          parent_name: data.parentName,
          phone: normalizedPhone,
          email: emailToSend,
          slot_date: data.slotDate,
          slot_time: data.slotTime,
          comment: data.comment || data.confidence || "",
          programs: await Promise.all(programsList.map(async p => {
            let imgUrl = p.thumbnailUrl || "";
            if (imgUrl && !imgUrl.startsWith("http")) {
              const baseUrl = process.env.APP_URL || process.env.IMAGE_BASE_URL || "https://api.infano.care";
              imgUrl = `${baseUrl.replace(/\/$/, '')}${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
            }
            if (imgUrl.includes("api-dev.infano.care")) {
              try {
                const res = await fetch(imgUrl, { method: "HEAD" });
                if (!res.ok) {
                  const altUrl = imgUrl.replace("api-dev.infano.care", "api.infano.care");
                  const res2 = await fetch(altUrl, { method: "HEAD" });
                  if (res2.ok) imgUrl = altUrl;
                }
              } catch (e) {}
            } else if (imgUrl.includes("api.infano.care")) {
              try {
                const res = await fetch(imgUrl, { method: "HEAD" });
                if (!res.ok) {
                  const altUrl = imgUrl.replace("api.infano.care", "api-dev.infano.care");
                  const res2 = await fetch(altUrl, { method: "HEAD" });
                  if (res2.ok) imgUrl = altUrl;
                }
              } catch (e) {}
            }
            if (!imgUrl) {
              imgUrl = "https://api.infano.care/uploads/assets/Page-1.png";
            }
            return {
              title: p.title,
              duration: p.duration,
              thumbnailUrl: imgUrl
            };
          }))
        });
      } catch (emailErr) {
        console.error("Failed to send demo booking email confirmation:", emailErr);
      }
    }

    return demo;
  }

  static async getUserDemosForUser(userId: string) {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    // Find the user to get their phone
    const loggedInUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true }
    });

    if (!loggedInUser || !loggedInUser.phone) {
      return [];
    }

    const allPhones = [loggedInUser.phone];

    // Find all related user IDs via ParentLink
    try {
      const links = await prisma.parentLink.findMany({
        where: {
          OR: [
            { teenId: userId },
            { parentId: userId }
          ],
          status: "LINKED"
        },
        select: { parentId: true, teenId: true }
      });

      const relatedIds = [userId];
      links.forEach(link => {
        if (link.parentId) relatedIds.push(link.parentId);
        if (link.teenId) relatedIds.push(link.teenId);
      });

      const uniqueIds = Array.from(new Set(relatedIds.filter(Boolean)));

      // Fetch phone numbers for all linked users
      const users = await prisma.user.findMany({
        where: { id: { in: uniqueIds } },
        select: { phone: true }
      });

      users.forEach(u => {
        if (u.phone) allPhones.push(u.phone);
      });
    } catch (err) {
      console.error("Failed to query parent links for demo sessions:", err);
    }

    const { normalizePhone } = await import("../../common/utils/phone.js");

    // Generate possible database variations of all phone numbers to handle inconsistent formatting
    const possiblePhones: string[] = [];
    for (const p of allPhones) {
      const normalizedPhone = normalizePhone(p);
      const phoneDigits = p.replace(/\D/g, '');
      const tenDigits = phoneDigits.length >= 10 ? phoneDigits.substring(phoneDigits.length - 10) : phoneDigits;
      const zeroTenDigits = '0' + tenDigits;

      possiblePhones.push(p);
      possiblePhones.push(normalizedPhone);
      possiblePhones.push(tenDigits);
      possiblePhones.push(zeroTenDigits);
      possiblePhones.push(`+91${tenDigits}`);
      possiblePhones.push(`91${tenDigits}`);
    }

    const uniquePhones = Array.from(new Set(possiblePhones.filter(Boolean)));

    return prisma.demoSession.findMany({
      where: {
        phone: {
          in: uniquePhones
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }


  static async adminListDemos() {
    return prisma.demoSession.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  static async adminUpdateDemoStatus(id: string, payload: { status?: string; isReadyToEnroll?: boolean; comment?: string; meetLink?: string; slotDate?: string; slotTime?: string }) {
    const existing = await prisma.demoSession.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Demo session booking not found", 404);
    }
    const data: any = {};
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.isReadyToEnroll !== undefined) data.isReadyToEnroll = payload.isReadyToEnroll;
    if (payload.comment !== undefined) data.comment = payload.comment;
    if (payload.meetLink !== undefined) data.meetLink = payload.meetLink;
    if (payload.slotDate !== undefined) data.slotDate = payload.slotDate;
    if (payload.slotTime !== undefined) data.slotTime = payload.slotTime;
    return prisma.demoSession.update({
      where: { id },
      data
    });
  }

  static async adminGetDemo(id: string) {
    const demo = await prisma.demoSession.findUnique({
      where: { id }
    });
    if (!demo) {
      throw new AppError("Demo session booking not found", 404);
    }
    return demo;
  }

  static async checkUserByPhone(phone: string) {
    if (!phone) {
      throw new AppError("Phone number is required", 400);
    }
    const { normalizePhone } = await import("../../common/utils/phone.js");
    const normalizedPhone = normalizePhone(phone);

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        profile: true,
        programEnrollments: {
          select: {
            programId: true
          }
        }
      }
    });

    if (!user) {
      return {
        exists: false,
        user: null,
        enrolledProgramIds: []
      };
    }

    const typedUser = user as any;
    return {
      exists: true,
      user: {
        id: typedUser.id,
        phone: typedUser.phone,
        email: typedUser.email || typedUser.parentEmail || "",
        role: typedUser.role,
        name: typedUser.profile?.displayName || ""
      },
      enrolledProgramIds: (typedUser.programEnrollments || []).map((e: any) => e.programId)
    };
  }
}

