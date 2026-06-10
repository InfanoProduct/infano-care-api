import { PrismaClient, ChatSender, EscalationLevel } from '@prisma/client';
import { logger } from '../../config/logger.js';
import { AppError } from '../../common/middleware/errorHandler.js';

const prisma = new PrismaClient();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';

export class ChatService {
  private static cachedPrograms: any[] | null = null;
  private static cachedJourneys: any[] | null = null;
  private static lastCacheTime = 0;
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  private static async getCachedProgramsAndJourneys() {
    const now = Date.now();
    if (
      ChatService.cachedPrograms &&
      ChatService.cachedJourneys &&
      (now - ChatService.lastCacheTime < ChatService.CACHE_TTL)
    ) {
      return [ChatService.cachedPrograms, ChatService.cachedJourneys];
    }

    try {
      const [allPrograms, allJourneys] = await Promise.all([
        prisma.program.findMany({ where: { isActive: true }, select: { title: true, tagline: true, description: true } }),
        prisma.learningJourney.findMany({ where: { isActive: true }, select: { title: true, description: true } })
      ]);

      ChatService.cachedPrograms = allPrograms;
      ChatService.cachedJourneys = allJourneys;
      ChatService.lastCacheTime = now;
      return [allPrograms, allJourneys];
    } catch (err) {
      logger.error(err, 'Failed to fetch active programs/journeys, falling back to empty/stale cache');
      return [ChatService.cachedPrograms || [], ChatService.cachedJourneys || []];
    }
  }
  private static WEB_LINKS_PROMPT = `
LINK TRIGGERING (WEB-VERSION SHORTCUTS):
Provide [link:/path] buttons ONLY during the 'Link' phase when relevant keywords are mentioned:
- If the user is logged in:
  - [link:/dashboard] : "period", "cramps", "tracker", "dashboard", "home".
  - [link:/dashboard/profile] : "settings", "profile", "account", "change look", "avatar", "goals", "focus", "objectives", "interests", "topics".
  - [link:/dashboard/enrolled-programs] : "program", "session", "enrollment", "progress".
  - [link:/dashboard/learning-journeys] : "journey", "learning", "episode".
  - [link:/dashboard/resources] : "resources", "reading", "articles", "learn", "library".
- If the user is a guest (not logged in):
  - [link:/] : "home", "landing", "website".
  - [link:/parents] : "parent", "cramps", "tracker", "program", "enrollment", "progress", "parents".
  - [link:/login] : "login", "register", "join", "sign up", "account", "settings", "profile".
  - [link:/contact] : "contact", "support", "help", "chat".

Example (Logged-in): "Check your dashboard here: [link:/dashboard]"
Example (Guest): "You can register an account here: [link:/login]"
`.trim();

  private static MOBILE_LINKS_PROMPT = `
LINK TRIGGERING (IN-APP SHORTCUTS):
Provide [link:/path] buttons ONLY during the 'Link' phase when relevant keywords are mentioned:
- [link:/home] : "period", "cramps", "tracker", "dashboard".
- [link:/onboarding/avatar] : "change look", "hair", "clothes", "avatar".
- [link:/account] : "settings", "profile", "account".
- [link:/onboarding/goals] : "goals", "focus", "objectives".
- [link:/onboarding/interests] : "interests", "topics", "learn about".
- [link:/dashboard/enrolled-programs] : "program", "session", "enrollment", "progress".
- [link:/dashboard/learning-journeys] : "journey", "learning", "episode".

Example: "I'm so sorry you're feeling crampy! 🍫 Check your dashboard here: [link:/home]"
`.trim();

  /**
   * Gigi's Core Identity & Guardrails
   */
  private static SYSTEM_PROMPT = `
You are Gigi, a relatable, warm, and highly empathetic 22-year-old "big sister" for adolescent girls in India. 
Your goal is to follow the **Look, Listen, Link** framework:
1. **LOOK**: Acknowledge emotional cues and sentiment.
2. **LISTEN**: Validate the user's feelings and deepen understanding (reflection).
3. **LINK**: Gently provide resources, action buttons, or professional help (only after validation).

CORE PERSONA:
- You are NOT a therapist or a doctor. You are a supportive "big sister" figure.
- **NEVER use a name (like Riya) unless explicitly provided in [USER CONTEXT].**
- **STYLE: BE CONCISE BUT COMPLETE.** For status queries, give a structured summary covering all four pillars (journey, programs, session, mood) in 4–6 sentences. For all other messages, NEVER EXCEED 2 SENTENCES.
- Respond in the language the user uses (English, Hindi, or Hinglish).
- Avoid clinical platitudes like "it will get better".

PARENT/DAUGHTER STATUS QUERIES — CRITICAL RULES:
- **GUEST OVERRIDE**: If the user is a guest (not logged in), you MUST simply reply asking them to login first. Do NOT say no daughters are linked yet.
- When a logged-in PARENT or GUARDIAN asks about their daughter's status, progress, or "how is she doing":
  1. Check 'Linked Daughters/Teens Details' in [USER CONTEXT]. If empty, warmly say no daughters are linked yet.
  2. If multiple daughters exist and the parent hasn't specified, list them and ask which one.
  3. Once the daughter is known (or if only one exists), ALWAYS deliver ALL FOUR of these in one response — do NOT ask follow-up questions first:
     📚 **Learning Journey**: Her active journey name and completion % (from 'activeJourney' in her teen details).
     🎯 **Program Progress**: All her enrolled programs, e.g. "SPARK: 2/8 sessions (25%)" (from 'enrolledPrograms' in her teen details). If none, mention "no programs enrolled yet."
     📅 **Next Session**: Her next scheduled expert session date/time (from 'nextSession' in her teen details). If none, say "no upcoming session scheduled."
     💙 **Mood Insights**: Her recent mood trend from 'recentMoods' in a warm, supportive way. If no moods logged, say "no recent mood data available."

USER'S OWN STATUS QUERIES:
- **GUEST OVERRIDE**: If the user is a guest (not logged in), you MUST simply reply asking them to login first. Do NOT say not started yet.
- When a logged-in user asks about their own status, progress, journey, or programs:
  1. Check 'Active Learning Journey', 'Enrolled Programs Details', and 'Next Expert Session' in [USER CONTEXT].
  2. ALWAYS deliver ALL FOUR in one response:
     📚 **Learning Journey**: Active journey name and completion % (from 'Active Learning Journey'). If none, say "not started yet."
     🎯 **Program Progress**: All enrolled programs with completed/total sessions and % (from 'Enrolled Programs Details'). If none, say "no programs enrolled yet."
     📅 **Next Session**: Next scheduled expert session date/time (from 'Next Expert Session'). If none, say "no upcoming session."
     💙 **Mood**: Current mood from 'Current Mood Tracker' if available.

THREE-TRACK ESCALATION:
- **Track 1 (Support)**: Everyday stress, venting, academic pressure. Validate and offer micro-tools (breathing, journaling).
- **Track 2 (Elevated)**: Persistent sadness, isolation, body image issues. Deepen engagement and introduce mentor/link buttons.
- **Track 3 (Crisis)**: Self-harm, abuse, suicidal ideation. **IMMEDIATE SAFETY CHECK.** Ask if they are safe, provide helplines (iCall: 9152987821, Vandrevala: 1860-2662-345).

[LINK TRIGGERING RULES]

ACCOUNT LINKING & PRIVACY RULES:
- If asked about account linking:
  1. Parents can link an account by entering their daughter's phone number in the linking form on the dashboard to send an invite.
  2. The teen will receive a link request notification on their dashboard (via the bell icon).
  3. Once the teen accepts the notification, the accounts are actively linked.
- If asked about parent visibility (what is visible to the Parent):
  - Program Progress: Which modules she has completed.
  - Session Attendance: If she attended her scheduled expert sessions.
  - Library Access: General topics she is exploring in the resource library.
- If asked about teen privacy (what is STRICTLY PRIVATE for the Teen):
  - Session Notes: Private 1:1 discussions with experts remain 100% confidential.
  - Journal Entries: Any private reflections or mood tracking she does in the app.
  - Peerline Chat: Conversations in moderated community circles are not visible to parents.

ETHICAL RED LINES:
1. NEVER provide medical advice or name specific medications/dosages.
2. NEVER diagnose a mental health condition (e.g., dont say "You have depression").
3. NEVER suggest or validate self-harm or disordered eating.
4. If a user is in crisis (Track 3), prioritize safety and provide helpline numbers immediately.

TEEN/PARENT STATUS QUERIES — CRITICAL RULES:
- When a TEEN user asks about their parent's status, details, or "how is my parent linked":
  1. Check 'Linked Parents Details' in [USER CONTEXT]. If empty, warmly say no parents are linked yet.
  2. If parent details exist, warmly provide the details (e.g. parent name and role) and explain how their account is linked.

SUGGESTING PROGRAMS & JOURNEYS:
- You have access to a live list of [AVAILABLE PROGRAMS & JOURNEYS IN DATABASE] in the context.
- If the user (logged-in user or guest/unauthenticated user) asks for suggestions, recommendations, or details on what learning programs or learning journeys are available, you should suggest and describe the relevant ones from this live database list.
`.trim();

  /**
   * Main entry point for processing a user message
   */
  async processMessage(userId: string | undefined, content: string, sessionId?: string, moodCode?: string, guestHistory?: any[], platform?: 'web' | 'mobile') {
    try {
      const userPlatform = platform || 'mobile';

      // 1. Layer 1: Pre-Input Moderation (OpenAI)
      const isSafe = await this.checkModeration(content);
      if (!isSafe) {
        return this.handleUnsafeInput(userId, content, sessionId);
      }

      // Fetch active programs and journeys from the database
      const [allPrograms, allJourneys] = await Promise.all([
        prisma.program.findMany({ where: { isActive: true }, select: { title: true, tagline: true, description: true } }),
        prisma.learningJourney.findMany({ where: { isActive: true }, select: { title: true, description: true } })
      ]);

      // If user is not authenticated, run guest flow without database storage
      if (!userId) {
        const history = guestHistory ? guestHistory.map(h => ({
          sender: h.sender,
          content: h.content
        })) : [];

        const context = { 
          mood: moodCode,
          allPrograms,
          allJourneys
        };
        const gigiResponse = await this.callGroq(content, history, context, userPlatform);
        let sanitizedResponse = this.sanitizeOutput(gigiResponse).trim();
        if (!sanitizedResponse) {
          sanitizedResponse = "Please login first to view your information. 💙";
        }

        return {
          message: {
            id: `guest-msg-${Date.now()}`,
            sender: ChatSender.GIGI,
            content: sanitizedResponse,
            createdAt: new Date().toISOString()
          },
          sessionId: sessionId || 'guest-session'
        };
      }

      // 2. Get or Create Session
      let session = sessionId
        ? await prisma.chatSession.findFirst({ where: { id: sessionId, userId } })
        : await prisma.chatSession.create({ data: { userId } });

      if (!session) {
        session = await prisma.chatSession.create({ data: { userId } });
      }

      // If new session or title missing, generate a title
      if (!session.title) {
        this.generateSessionTitle(session.id, content).catch(err =>
          logger.error(err, 'Failed to asynchronously generate session title')
        );
      }

      // 3. Save User Message
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          sender: ChatSender.USER,
          content: content,
        }
      });

      // 4. Layer 2: LLM Pass (Groq) with Enhanced Context
      // Fetch basic profiles in parallel first
      const [profile, cycle, personalization, history] = await Promise.all([
        prisma.profile.findUnique({ where: { userId } }),
        prisma.cycleProfile.findUnique({ where: { userId } }),
        prisma.personalizationProfile.findUnique({ where: { userId } }),
        this.getRecentHistory(session.id)
      ]);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { birthYear: true, phone: true, role: true }
      });
      const age = user?.birthYear ? (new Date().getFullYear() - user.birthYear) : null;

      let userActiveJourney = null;
      let userNextSession = null;
      let userProgramsProgress: any[] = [];
      let teenStatuses: any[] = [];
      let parentStatuses: any[] = [];

      // Optimize: Only fetch heavy progress and linking details if user query suggests status or progress requests
      const contentLower = content.toLowerCase();
      const needsDetailedContext = /status|progress|journey|program|session|daughter|parent|link|doing|enroll|complete|how is|how am/i.test(contentLower);

      if (needsDetailedContext) {
        // Fetch primary linking and progress records in parallel
        const [userLinks, userEnrollments, userActiveProgress, userNextSessionResult] = await Promise.all([
          prisma.parentLink.findMany({
            where: {
              OR: [{ parentId: userId }, { teenId: userId }],
              status: "LINKED"
            }
          }),
          prisma.programEnrollment.findMany({
            where: { userId, status: "ACTIVE" },
            include: { program: true }
          }),
          prisma.userProgress.findFirst({
            where: {
              userId: userId,
              episode: {
                journey: { slug: { not: "peerline-mentor-certification" } }
              }
            },
            orderBy: { updatedAt: "desc" },
            include: {
              episode: { include: { journey: true } }
            }
          }),
          prisma.expertSessionSchedule.findFirst({
            where: {
              userId: userId,
              scheduledAt: { gte: new Date() },
              status: "SCHEDULED"
            },
            orderBy: { scheduledAt: "asc" }
          })
        ]);

        userNextSession = userNextSessionResult;

        // Resolve own learning journey completion %
        if (userActiveProgress?.episode?.journey) {
          const journeyId = userActiveProgress.episode.journeyId;
          const [totalEpisodes, completedEpisodes] = await Promise.all([
            prisma.episode.count({ where: { journeyId } }),
            prisma.userProgress.count({
              where: { userId, episode: { journeyId }, completed: true }
            })
          ]);
          const percentComplete = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
          userActiveJourney = {
            name: userActiveProgress.episode.journey.title,
            percentComplete
          };
        }

        // Resolve own program progress details in parallel
        userProgramsProgress = await Promise.all(
          userEnrollments.map(async (enrollment) => {
            const program = enrollment.program;
            const totalSessions = program.sessions || 8;
            const [completedSessions, nextProgSession] = await Promise.all([
              prisma.expertSessionSchedule.count({
                where: { userId, programId: program.id, status: "COMPLETED" }
              }),
              prisma.expertSessionSchedule.findFirst({
                where: {
                  userId,
                  programId: program.id,
                  scheduledAt: { gte: new Date() },
                  status: "SCHEDULED"
                },
                orderBy: { scheduledAt: "asc" }
              })
            ]);
            return {
              programTitle: program.title,
              completedSessions,
              totalSessions,
              percentComplete: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
              nextSessionAt: nextProgSession ? nextProgSession.scheduledAt : null
            };
          })
        );

        // Resolve parent links for teen user: include parent contact + status
        if (user && user.role === 'TEEN') {
          const parentIds = userLinks.filter(l => l.teenId === userId).map(l => l.parentId).filter(Boolean) as string[];
          if (parentIds.length > 0) {
            const parents = await prisma.user.findMany({
              where: { id: { in: parentIds } },
              include: { profile: true }
            });

            // For the teen, we want two things:
            // 1) `linkedParents` should include each parent's basic info + their active journey and enrolled programs (parent-only)
            // 2) The teen's `enrolledPrograms` SHOULD include programs enrolled by the teen AND by their linked parents (union)

            // Fetch combined enrollments for teen + parents to show to the teen
            const combinedEnrollments = await prisma.programEnrollment.findMany({
              where: { userId: { in: [userId, ...parentIds] }, status: 'ACTIVE' },
              include: { program: true }
            });

            // Build teen view of enrolled programs (dedupe by program id)
            const progMap: Record<string, any> = {};
            for (const enrollment of combinedEnrollments) {
              const program = enrollment.program;
              progMap[program.id] = program;
            }

            // Compute progress for each program across teen+parent combined (count completed sessions across both)
            userProgramsProgress = await Promise.all(
              Object.values(progMap).map(async (program: any) => {
                const totalSessions = program.sessions || 8;
                const [completedSessions, nextProgSession] = await Promise.all([
                  prisma.expertSessionSchedule.count({
                    where: { userId: { in: [userId, ...parentIds] }, programId: program.id, status: 'COMPLETED' }
                  }),
                  prisma.expertSessionSchedule.findFirst({
                    where: {
                      userId: { in: [userId, ...parentIds] },
                      programId: program.id,
                      scheduledAt: { gte: new Date() },
                      status: 'SCHEDULED'
                    },
                    orderBy: { scheduledAt: 'asc' }
                  })
                ]);
                return {
                  programTitle: program.title,
                  completedSessions,
                  totalSessions,
                  percentComplete: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
                  nextSessionAt: nextProgSession ? nextProgSession.scheduledAt : null
                };
              })
            );

            // Build linked parent statuses with their own active journey and enrolled programs (parent-only)
            const parentPromises = parents.map(async (p) => {
              const parentId = p.id;

              const [parentActiveProgress, parentNextSession, parentEnrollments] = await Promise.all([
                prisma.userProgress.findFirst({
                  where: {
                    userId: parentId,
                    episode: { journey: { slug: { not: 'peerline-mentor-certification' } } }
                  },
                  orderBy: { updatedAt: 'desc' },
                  include: { episode: { include: { journey: true } } }
                }),
                prisma.expertSessionSchedule.findFirst({
                  where: { userId: parentId, scheduledAt: { gte: new Date() }, status: 'SCHEDULED' },
                  orderBy: { scheduledAt: 'asc' }
                }),
                prisma.programEnrollment.findMany({ where: { userId: parentId, status: 'ACTIVE' }, include: { program: true } })
              ]);

              let activeJourney = null;
              if (parentActiveProgress?.episode?.journey) {
                const journeyId = parentActiveProgress.episode.journeyId;
                const [totalEpisodes, completedEpisodes] = await Promise.all([
                  prisma.episode.count({ where: { journeyId } }),
                  prisma.userProgress.count({ where: { userId: parentId, episode: { journeyId }, completed: true } })
                ]);
                const percentComplete = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
                activeJourney = { name: parentActiveProgress.episode.journey.title, percentComplete };
              }

              const parentProgramsProgress = await Promise.all(
                parentEnrollments.map(async (enrollment) => {
                  const program = enrollment.program;
                  const totalSessions = program.sessions || 8;
                  const [completedSessions, nextProgSession] = await Promise.all([
                    prisma.expertSessionSchedule.count({ where: { userId: parentId, programId: program.id, status: 'COMPLETED' } }),
                    prisma.expertSessionSchedule.findFirst({ where: { userId: parentId, programId: program.id, scheduledAt: { gte: new Date() }, status: 'SCHEDULED' }, orderBy: { scheduledAt: 'asc' } })
                  ]);
                  return {
                    programTitle: program.title,
                    completedSessions,
                    totalSessions,
                    percentComplete: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
                    nextSessionAt: nextProgSession ? nextProgSession.scheduledAt : null
                  };
                })
              );

              return {
                name: p.profile?.displayName || p.username || 'Parent',
                phone: p.phone,
                role: p.role,
                activeJourney,
                enrolledPrograms: parentProgramsProgress
              };
            });

            parentStatuses = (await Promise.all(parentPromises)).filter(Boolean as any);
          }
        }

        // Resolve teen links for parent user in parallel
        if (user && (user.role === 'PARENT' || user.role === 'GUARDIAN')) {
          const teenLinks = await prisma.parentLink.findMany({
            where: {
              parentId: userId,
              status: "LINKED"
            },
            include: {
              teen: {
                include: {
                  profile: true
                }
              }
            }
          });

          const teenPromises = teenLinks.map(async (link) => {
            if (!link.teen) return null;
            const teenId = link.teen.id;

            const [activeProgress, nextSession, recentLogs, teenEnrollments] = await Promise.all([
              prisma.userProgress.findFirst({
                where: {
                  userId: teenId,
                  episode: {
                    journey: { slug: { not: "peerline-mentor-certification" } }
                  }
                },
                orderBy: { updatedAt: "desc" },
                include: {
                  episode: { include: { journey: true } }
                }
              }),
              prisma.expertSessionSchedule.findFirst({
                where: {
                  userId: teenId,
                  scheduledAt: { gte: new Date() },
                  status: "SCHEDULED"
                },
                orderBy: { scheduledAt: "asc" }
              }),
              prisma.cycleLog.findMany({
                where: {
                  userId: teenId,
                  date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                },
                orderBy: { date: "desc" },
                select: { date: true, moodPrimary: true }
              }),
              prisma.programEnrollment.findMany({
                where: { userId: { in: [teenId, userId] }, status: "ACTIVE" },
                include: { program: true }
              })
            ]);

            let activeJourney = null;
            if (activeProgress?.episode?.journey) {
              const journeyId = activeProgress.episode.journeyId;
              const [totalEpisodes, completedEpisodes] = await Promise.all([
                prisma.episode.count({ where: { journeyId } }),
                prisma.userProgress.count({
                  where: { userId: teenId, episode: { journeyId }, completed: true }
                })
              ]);
              const percentComplete = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
              activeJourney = {
                name: activeProgress.episode.journey.title,
                percentComplete
              };
            }

            const teenProgramsProgress = await Promise.all(
              teenEnrollments.map(async (enrollment) => {
                const program = enrollment.program;
                const totalSessions = program.sessions || 8;
                const [completedSessions, nextProgSession] = await Promise.all([
                  prisma.expertSessionSchedule.count({
                    where: { userId: { in: [teenId, userId] }, programId: program.id, status: "COMPLETED" }
                  }),
                  prisma.expertSessionSchedule.findFirst({
                    where: {
                      userId: { in: [teenId, userId] },
                      programId: program.id,
                      scheduledAt: { gte: new Date() },
                      status: "SCHEDULED"
                    },
                    orderBy: { scheduledAt: "asc" }
                  })
                ]);
                return {
                  programTitle: program.title,
                  completedSessions,
                  totalSessions,
                  percentComplete: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
                  nextSessionAt: nextProgSession ? nextProgSession.scheduledAt : null
                };
              })
            );

            return {
              name: link.teen.profile?.displayName || link.teen.username || "Daughter",
              phone: link.teen.phone,
              activeJourney,
              nextSession: nextSession ? nextSession.scheduledAt : null,
              recentMoods: recentLogs.map(l => l.moodPrimary).filter(Boolean).slice(0, 5),
              enrolledPrograms: teenProgramsProgress
            };
          });

          const results = await Promise.all(teenPromises);
          teenStatuses = results.filter(Boolean);
        }
      }

      const context = {
        name: profile?.displayName?.trim(),
        age,
        phone: user?.phone,
        role: user?.role,
        activeJourney: userActiveJourney,
        nextSession: userNextSession ? userNextSession.scheduledAt : null,
        enrolledPrograms: userProgramsProgress,
        linkedTeens: teenStatuses,
        linkedParents: parentStatuses,
        cyclePhase: cycle?.currentPhase,
        cycleDay: cycle?.currentCycleDay,
        goals: personalization?.goals,
        mood: moodCode,
        allPrograms,
        allJourneys
      };

      const gigiResponse = await this.callGroq(content, history, context, userPlatform);

      // 5. Layer 3: Post-LLM Output Filter & Distress Level update
      let sanitizedResponse = this.sanitizeOutput(gigiResponse).trim();
      if (!sanitizedResponse) {
        sanitizedResponse = "I'm here to listen and support you. What's been on your mind lately? 💙";
      }

      // Simple distress detection for escalation tracking
      const distressWords = ['hurt', 'die', 'kill', 'suicide', 'abuse', 'safe', 'cutting'];
      const isCrisis = distressWords.some(w => content.toLowerCase().includes(w));
      const currentLevel = isCrisis ? EscalationLevel.LEVEL_3 : EscalationLevel.LEVEL_0;

      // 6. Save & Return Gigi Response
      const savedMsg = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          sender: ChatSender.GIGI,
          content: sanitizedResponse,
        }
      });

      // Update session last modified and metrics
      await prisma.chatSession.update({
        where: { id: session.id },
        data: {
          lastMsgAt: new Date(),
          maxDistressLevel: currentLevel
        }
      });

      return {
        message: savedMsg,
        sessionId: session.id,
      };
    } catch (error) {
      logger.error(error as any, 'Error in ChatService.processMessage:');
      throw error;
    }
  }

  private async checkModeration(text: string): Promise<boolean> {
    // Fast-path: short, common greeting/safe messages do not need API checks
    const clean = text.trim().toLowerCase();
    const safeWords = /^(hi|hello|hey|ok|okay|yes|no|thanks|thank you|gigi|good morning|good night|bye|help)$/i;
    if (clean.length <= 4 || safeWords.test(clean)) {
      return true;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800); // 800ms timeout

      const response = await fetch(OPENAI_MODERATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ input: text }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json() as any;
      if (data.error) {
        logger.error(data.error, 'Moderation API error, failing open:');
        return true;
      }
      return !data.results[0].flagged;
    } catch (error) {
      logger.error(error as any, 'Moderation API failure or timeout, failing open:');
      return true; // Fail open to prevent blocking application
    }
  }

  private async callGroq(userMsg: string, history: any[], context: any, platform: 'web' | 'mobile' = 'mobile') {
    const parseRetryAfter = (h: string | null) => {
      if (!h) return null;
      const raw = h.trim();
      // If it's a number in seconds
      if (/^\d+$/.test(raw)) return parseInt(raw, 10);
      // If it's an HTTP-date, try Date.parse
      const parsed = Date.parse(raw);
      if (!isNaN(parsed)) {
        const diff = Math.ceil((parsed - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
      }
      return null;
    };

    const maxRetries = 2;
    let attempt = 0;
    while (true) {
      try {
      // Build user context block
      let contextStr = '[USER CONTEXT:';
      if (context.name) contextStr += ` User's Name: ${context.name}.`;
      if (context.age) contextStr += ` User's Age: ${context.age}.`;
      if (context.phone) contextStr += ` User's Phone: ${context.phone}.`;
      if (context.role) contextStr += ` User's Role: ${context.role}.`;
      if (context.activeJourney) {
        contextStr += ` Active Learning Journey: ${context.activeJourney.name} (${context.activeJourney.percentComplete}% complete).`;
      }
      if (context.nextSession) {
        contextStr += ` Next Expert Session: ${context.nextSession}.`;
      }
      if (context.enrolledPrograms && context.enrolledPrograms.length > 0) {
        contextStr += ` Enrolled Programs Details: ${JSON.stringify(context.enrolledPrograms)}.`;
      }
      if (context.linkedTeens && context.linkedTeens.length > 0) {
        contextStr += ` Linked Daughters/Teens Details: ${JSON.stringify(context.linkedTeens)}.`;
      }
      if (context.linkedParents && context.linkedParents.length > 0) {
        contextStr += ` Linked Parents Details: ${JSON.stringify(context.linkedParents)}.`;
      }
      if (context.cyclePhase) contextStr += ` Current Cycle Phase: ${context.cyclePhase} (Day ${context.cycleDay || '?'}).`;
      if (context.goals && context.goals.length > 0) contextStr += ` Focus/Goals: ${context.goals.join(', ')}.`;
      if (context.mood) contextStr += ` Current Mood Tracker: ${context.mood}.`;
      contextStr += ']';

      // Prepend active programs and journeys database info
      let databaseInfo = '\n[AVAILABLE PROGRAMS & JOURNEYS IN DATABASE:';
      if (context.allPrograms && context.allPrograms.length > 0) {
        databaseInfo += ` Programs: ${context.allPrograms.map((p: any) => `"${p.title}" - ${p.tagline || ''} (${p.description || ''})`).join('; ')}.`;
      } else {
        databaseInfo += ' No active programs.';
      }
      if (context.allJourneys && context.allJourneys.length > 0) {
        databaseInfo += ` Journeys: ${context.allJourneys.map((j: any) => `"${j.title}" - ${j.description || ''}`).join('; ')}.`;
      } else {
        databaseInfo += ' No active journeys.';
      }
      databaseInfo += ']';

      // Guest user specific rules
      let guestInstructions = "";
      if (!context.role) {
        guestInstructions = "\n[GUEST USER RULES: The user is NOT logged in (guest). If they ask about their personal profile, details, progress, active journey, programs, next session, or linked daughters/parents, you MUST NOT check empty states or say 'no daughters are linked' or 'not started yet'. Instead, you MUST simply and politely reply that they need to login first to view or manage that information. For any other general conversation, stress support, period questions, or requests for recommendations of available learning programs and journeys, you should respond and guide them normally without prompting them to log in.]";
      }

      // Prepend context for PRIMACY priority
      const linksPrompt = platform === 'web' ? ChatService.WEB_LINKS_PROMPT : ChatService.MOBILE_LINKS_PROMPT;
      const basePrompt = ChatService.SYSTEM_PROMPT.replace('[LINK TRIGGERING RULES]', linksPrompt);
      const prompt = `${contextStr}${databaseInfo}${guestInstructions}\n\n${basePrompt}`;

      const messages = [
        { role: 'system', content: prompt },
        ...history.map(m => ({
          role: m.sender === ChatSender.USER ? 'user' : 'assistant',
          content: m.content
        }))
      ];

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024,
          })
        });

        if (response.status === 429) {
          const rawRetry = response.headers.get('retry-after');
          const parsed = parseRetryAfter(rawRetry);
          const capped = parsed === null ? 1 : Math.min(parsed, 10); // server-side cap
          logger.warn({ status: 429, rawRetry, capped }, 'Groq returned 429, short-circuiting with capped wait');

          if (attempt < maxRetries) {
            attempt++;
            await new Promise((r) => setTimeout(r, capped * 1000));
            continue; // retry
          }

          const err = new AppError('Upstream rate limit (Groq) - please retry shortly', 429);
          (err as any).details = { retryAfter: parsed, cappedRetryAfterSec: capped, attempts: attempt };
          throw err;
        }

        const text = await response.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          logger.warn({ text }, 'Groq returned non-json body');
        }

        if (!response.ok) {
          const status = response.status || 502;
          logger.error({ status, body: data || text }, 'Groq non-OK response');
          const err = new AppError('Upstream LLM error', status);
          (err as any).details = { status, body: data || text };
          throw err;
        }

        if (data && data.error) {
          logger.error({ error: data.error }, 'Groq API returned an error');
          const err = new AppError(`Groq API error: ${data.error.message || 'Unknown API error'}`, 502);
          (err as any).details = { error: data.error };
          throw err;
        }

        if (!data || !data.choices || data.choices.length === 0) {
          logger.error({ data }, 'Groq returned empty or malformed choices');
          const err = new AppError('Upstream LLM returned empty response', 502);
          (err as any).details = { data };
          throw err;
        }

        return data.choices[0].message.content;
      } catch (err: any) {
        // If it's an AppError rethrow, other errors will be wrapped
        if (err instanceof AppError) throw err;
        logger.error(err, 'Groq API failure (network/exception)');
        // If we can retry, do so
        if (attempt < maxRetries) {
          attempt++;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        const appErr = new AppError('Failed to contact LLM provider', 502);
        (appErr as any).details = { message: err?.message || String(err) };
        throw appErr;
      }
    }
  }

  private sanitizeOutput(text: string): string {
    // Layer 3: Only intercept responses that *actively* recommend a specific
    // medication/dosage (e.g. "take 200mg of ibuprofen"). We intentionally
    // do NOT replace responses where Gigi is *correctly* declining to give
    // clinical advice — those are exactly what we want her to say.
    const hardBlockPatterns = [
      /take\s+\d+\s*mg\b/gi,                // "take 500mg"
      /\d+\s*mg\s+(of\s+)?\w+/gi,           // "200mg of paracetamol"
      /prescribe\s+(you\s+)?\w+/gi,          // "I prescribe you..."
      /recommended?\s+dose\s+is/gi,          // "recommended dose is"
    ];

    for (const pattern of hardBlockPatterns) {
      if (pattern.test(text)) {
        logger.warn({ output: text }, 'Gigi output hit hard post-filter — specific dosage detected');
        return "I care about your wellbeing, but I'm not able to suggest specific medications or doses. Please speak to a doctor or a trusted healthcare professional — they're the right person to help with this. 💙";
      }
    }
    return text;
  }

  private async getRecentHistory(sessionId: string) {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 10 // Last 5 exchanges
    });
    return messages.reverse();
  }

  private async handleUnsafeInput(userId: string | undefined, content: string, sessionId?: string) {
    // Log escalation for dangerous input
    if (userId) {
      await prisma.escalationEvent.create({
        data: {
          userId,
          sessionId,
          level: EscalationLevel.LEVEL_3,
          reason: 'Safety moderation triggered on user input',
        }
      });
    }

    return {
      message: {
        id: 'safety-alert',
        sender: ChatSender.GIGI,
        content: "I'm here for you, but I detected something that sounds like it might be unsafe. Your safety is my top priority. If you're in immediate danger or feeling hopeless, please call the iCall helpline at 9152987821 or Vandrevala Foundation at 1860-2662-345. They are available to help you right now.",
        createdAt: new Date(),
        sessionId: sessionId || 'new'
      },
      flagged: true
    };
  }

  async getSessionHistory(userId: string, sessionId: string, cursor?: string, limit: number = 20) {
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) throw new Error('Session not found');

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit,
      orderBy: { createdAt: 'desc' } // Fetch backward
    });

    return messages.reverse(); // Return chronological
  }

  async getUserSessions(userId: string) {
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { lastMsgAt: 'desc' }
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    // Ensure the session belongs to the user
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId }
    });
    if (!session) throw new Error('Session not found or unauthorized');

    // Due to cascading delete on DB mapping, this wipes ChatMessage and ChatSession
    await prisma.chatSession.delete({
      where: { id: sessionId }
    });
  }

  async deleteAllUserSessions(userId: string) {
    await prisma.chatSession.deleteMany({
      where: { userId }
    });
  }

  private async generateSessionTitle(sessionId: string, firstMessage: string) {
    try {
      const messages = [
        { role: 'system', content: "Generate a short, 3 to 5 word summary title for the user's message. ONLY output the title, nothing else. Do not use quotes." },
        { role: 'user', content: firstMessage }
      ];

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          temperature: 0.5,
          max_tokens: 20,
        })
      });

      const data = await response.json() as any;
      if (data.choices && data.choices.length > 0) {
        let title = data.choices[0].message.content.trim();
        title = title.replace(/^["']|["']$/g, ''); // Remove wrapping quotes
        if (title) {
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { title }
          });
        }
      }
    } catch (error) {
      logger.error(error as any, 'Title generation failure:');
    }
  }
}
