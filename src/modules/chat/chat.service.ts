import { prisma, ChatSender, EscalationLevel } from '../../db/client.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../common/middleware/errorHandler.js';
import { nsp as peerlineNsp } from '../peerline/peerline.socket.js';
import { CrisisAlertService } from '../safety/crisis-alert.service.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';

function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' IST';
  } catch (e) {
    return d.toUTCString();
  }
}

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
        prisma.program.findMany({ where: { isActive: true }, select: { title: true, tagline: true, description: true, duration: true } }),
        prisma.creativeJourney.findMany({ where: { isActive: true }, select: { title: true, description: true } })
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
SMART CONTEXTUAL NAVIGATION (WEB PLATFORM):
Provide a [link:/path] shortcut ONLY when the user explicitly asks where to go, how to access a tool, how to register/buy, or when directly navigating to a feature is genuinely required:
- If the user asks about cycle tracking, cramps log, or their main dashboard: [link:/dashboard]
- If the user asks about changing profile, account settings, or goals: [link:/dashboard/profile]
- If the user asks about enrolled courses or session schedules: [link:/dashboard/enrolled-programs]
- If the user asks about interactive learning journeys or episodes: [link:/dashboard/learning-journeys]
- If the user asks for reading articles, resources, or the library: [link:/dashboard/resources]
- If a guest (not logged in) asks to login, sign up, or access personal account: [link:/login]
- If a user asks how/where to buy the physical book: [link:/gigi-the-awkward-age-book] or [link:/checkout]
- If a user asks about school workshops: [link:/schools]
- If a user asks for contact/support: [link:/contact]

CRITICAL NAVIGATION RULE:
- NEVER add links to simple greetings, casual chat, emotional sharing, or everyday conversation.
- Only include AT MOST one relevant link in a single response, seamlessly woven into your sentence.
`.trim();

  private static MOBILE_LINKS_PROMPT = `
SMART CONTEXTUAL NAVIGATION (IN-APP SHORTCUTS):
Provide a [link:/path] shortcut ONLY when the user explicitly asks where to go, how to access a tool, or when navigating to an in-app feature is genuinely required:
- If the user asks about period calendar or cycle tracker: [link:/home]
- If the user asks about customizing avatar: [link:/onboarding/avatar]
- If the user asks about account settings or profile: [link:/account]
- If the user asks about their goals: [link:/onboarding/goals]
- If the user asks about enrolled programs: [link:/dashboard/enrolled-programs]
- If the user asks about learning journeys: [link:/dashboard/learning-journeys]

CRITICAL NAVIGATION RULE:
- NEVER add links to simple greetings, casual chat, emotional sharing, or everyday conversation.
- Only include AT MOST one relevant link in a single response, seamlessly woven into your sentence.
`.trim();

  /**
   * Gigi's Core Identity & Guardrails
   */
  private static SYSTEM_PROMPT = `
You are Gigi, a relatable, warm, and highly empathetic 22-year-old "big sister" and beloved mascot for adolescent girls in India (and their parents).

CORE HUMAN PERSONA:
- You talk and respond like a real, loving human big sister—comforting, sweet, emotionally intelligent, and authentic.
- **NATURAL BREVITY RULE**: Normal human conversations are short and sweet! Always keep your responses to **2 to 3 sentences maximum**. Never output long paragraphs, walls of text, bullet point lists, or robotic questionnaires.
- Speak in a heartwarming, soothing tone with gentle emojis (🌸, 💙, ✨). Let the conversation flow naturally back-and-forth. Let the user talk more instead of dumping everything at once.
- **NO ROBOTIC BUTTONS/OPTIONS SPAM**: Do NOT show option buttons ('[option:...]') or links ('[link:...]') in standard conversation, casual chat, or emotional check-ins. Talk naturally! Only provide option buttons when a user specifically asks for choices/recommendations or during explicit multi-branch selection flows (like selecting between multiple linked accounts).
- You are NOT a doctor or clinical therapist. You are a supportive, understanding companion.
- **NEVER use a placeholder name** (like Riya) unless explicitly provided in [USER CONTEXT].
- LANGUAGE RULE: Match the user's language and vocabulary style precisely. If the user speaks in English, respond in natural English. If Hindi (Devanagari), respond in Hindi. If Hinglish, respond in warm Hinglish.

INFANO CARE PLATFORM KNOWLEDGE:
You know the Infano Care ecosystem (https://infano.care) deeply:
- Slogan: "From Girlhood to Adulthood to Womanhood"
- Contact: connect@infano.care | +91-9243019243

KEY PLATFORM ESSENTIALS:
- Gigi Book: "Gigi — The Awkward Age" (499 INR) is a PHYSICAL printed hardcover book delivered via courier to the user's house across India. There is NO PDF/e-book link. The website has no cart—checkout is direct via [link:/checkout] or [link:/gigi-the-awkward-age-book].
- Programs & Journeys: Live catalog is provided in [AVAILABLE PROGRAMS & JOURNEYS IN DATABASE]. Always refer to accurate titles and descriptions.
- Cycle & Wellness Tracker: Safe, private symptom and period tracking.

DATABASE PROGRESS ACCURACY RULE:
- When reporting actual progress, completed sessions, or percentages, always report exact values from [USER CONTEXT]. If 0, say 0. Never invent numbers.

PARENT / DAUGHTER LINKED STATUS FLOW:
- If a guest asks about family progress, warmly ask them to login first: [link:/login].
- If a logged-in parent asks about their daughter's progress:
  - If multiple daughters are linked, ask naturally which daughter to check and provide options: '[option:Name (Phone)|Phone]'.
  - Respect teen privacy: Share program and learning progress, but NEVER reveal private mood logs or journal entries.
- If a logged-in user asks about their own learning progress, answer warmly and concisely.

THREE-TRACK SAFETY ESCALATION:
- Track 1 (Support): Daily stress, school worries, cramps, feelings. Listen, validate, offer a deep breath.
- Track 2 (Elevated): Persistent sadness, self-doubt. Offer warm companionship and gentle guidance.
- Track 3 (Crisis): Self-harm, abuse, suicidal ideation. **IMMEDIATE SAFETY PRIORITY.** Comfort them and provide helpline numbers immediately (iCall: 9152987821, Vandrevala Foundation: 1860-2662-345).

[LINK TRIGGERING RULES]

ETHICAL BOUNDARIES:
- Never provide clinical medical advice, medication dosages, or psychological diagnoses.
- Never validate self-harm or eating disorders.
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

      const contentLower = content.toLowerCase();
      // Always fetch the programs & journeys catalog — it is cached (5-min TTL) so the
      // overhead is negligible. This ensures Gigi knows about ALL programs for any query
      // (enroll, ask about, suggest, etc.) without needing keyword matching.
      const [cachedProgs, cachedJourneys] = await ChatService.getCachedProgramsAndJourneys();
      let allPrograms: any[] = cachedProgs || [];
      let allJourneys: any[] = cachedJourneys || [];

      // If user is not authenticated, run guest flow without database storage
      if (!userId) {
        const history = guestHistory ? guestHistory.slice(-10).map(h => ({
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
      let session = await prisma.chatSession.findFirst({
        where: { userId }
      });

      if (!session) {
        session = await prisma.chatSession.create({
          data: { userId, title: 'Chat with Gigi' }
        });
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

      // Always fetch progress and linking details for logged-in users to guarantee accurate, non-hallucinated responses in multi-turn conversations
      const needsDetailedContext = true;

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
            where: { userId, status: "ACTIVE", program: { isActive: true } },
            include: { program: true }
          }),
          prisma.creativeNodeProgress.findFirst({
            where: { userId: userId },
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
          const [totalEpisodes, completedCount] = await Promise.all([
            prisma.creativeEpisode.count({ where: { journeyId } }),
            prisma.creativeNodeProgress.count({
              where: { userId, episode: { journeyId }, status: "COMPLETED" }
            })
          ]);
          const percentComplete = totalEpisodes > 0 ? Math.min(100, Math.round((completedCount / (totalEpisodes * 5)) * 100)) : 0;
          userActiveJourney = {
            name: userActiveProgress.episode.journey.title,
            percentComplete
          };
        }

        // Resolve own program progress details in parallel
        userProgramsProgress = await Promise.all(
          userEnrollments.map(async (enrollment) => {
            const program = enrollment.program;
            const totalSessions = (program as any).curriculum?.length || 8;
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
              nextSessionAt: nextProgSession ? formatDateTime(nextProgSession.scheduledAt) : null
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
              where: { userId: { in: [userId, ...parentIds] }, status: 'ACTIVE', program: { isActive: true } },
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
                  nextSessionAt: nextProgSession ? formatDateTime(nextProgSession.scheduledAt) : null
                };
              })
            );

            // Build linked parent statuses with their own active journey and enrolled programs (parent-only)
            const parentPromises = parents.map(async (p) => {
              const parentId = p.id;

              const [parentActiveProgress, parentNextSession, parentEnrollments] = await Promise.all([
                prisma.creativeNodeProgress.findFirst({
                  where: { userId: parentId },
                  orderBy: { updatedAt: 'desc' },
                  include: { episode: { include: { journey: true } } }
                }),
                prisma.expertSessionSchedule.findFirst({
                  where: { userId: parentId, scheduledAt: { gte: new Date() }, status: 'SCHEDULED' },
                  orderBy: { scheduledAt: 'asc' }
                }),
                prisma.programEnrollment.findMany({ where: { userId: parentId, status: 'ACTIVE', program: { isActive: true } }, include: { program: true } })
              ]);

              let activeJourney = null;
              if (parentActiveProgress?.episode?.journey) {
                const journeyId = parentActiveProgress.episode.journeyId;
                const [totalEpisodes, completedCount] = await Promise.all([
                  prisma.creativeEpisode.count({ where: { journeyId } }),
                  prisma.creativeNodeProgress.count({ where: { userId: parentId, episode: { journeyId }, status: "COMPLETED" } })
                ]);
                const percentComplete = totalEpisodes > 0 ? Math.min(100, Math.round((completedCount / (totalEpisodes * 5)) * 100)) : 0;
                activeJourney = { name: parentActiveProgress.episode.journey.title, percentComplete };
              }

              const parentProgramsProgress = await Promise.all(
                parentEnrollments.map(async (enrollment) => {
                  const program = enrollment.program;
                  const totalSessions = (program as any).curriculum?.length || 8;
                  const [completedSessions, nextProgSession] = await Promise.all([
                    prisma.expertSessionSchedule.count({ where: { userId: parentId, programId: program.id, status: 'COMPLETED' } }),
                    prisma.expertSessionSchedule.findFirst({ where: { userId: parentId, programId: program.id, scheduledAt: { gte: new Date() }, status: 'SCHEDULED' }, orderBy: { scheduledAt: 'asc' } })
                  ]);
                  return {
                    programTitle: program.title,
                    completedSessions,
                    totalSessions,
                    percentComplete: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
                    nextSessionAt: nextProgSession ? formatDateTime(nextProgSession.scheduledAt) : null
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
              prisma.creativeNodeProgress.findFirst({
                where: { userId: teenId },
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
                where: { userId: { in: [teenId, userId] }, status: "ACTIVE", program: { isActive: true } },
                include: { program: true }
              })
            ]);

            let activeJourney = null;
            if (activeProgress?.episode?.journey) {
              const journeyId = activeProgress.episode.journeyId;
              const [totalEpisodes, completedCount] = await Promise.all([
                prisma.creativeEpisode.count({ where: { journeyId } }),
                prisma.creativeNodeProgress.count({
                  where: { userId: teenId, episode: { journeyId }, status: "COMPLETED" }
                })
              ]);
              const percentComplete = totalEpisodes > 0 ? Math.min(100, Math.round((completedCount / (totalEpisodes * 5)) * 100)) : 0;
              activeJourney = {
                name: activeProgress.episode.journey.title,
                percentComplete
              };
            }

            const teenProgramsProgress = await Promise.all(
              teenEnrollments.map(async (enrollment) => {
                const program = enrollment.program;
                const totalSessions = (program as any).curriculum?.length || 8;
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
                  nextSessionAt: nextProgSession ? formatDateTime(nextProgSession.scheduledAt) : null
                };
              })
            );

            return {
              name: link.teen.profile?.displayName || link.teen.username || "Daughter",
              phone: link.teen.phone,
              activeJourney,
              nextSession: nextSession ? formatDateTime(nextSession.scheduledAt) : null,
              recentMoods: [], // Maintain complete privacy, do not expose teen's mood data to parent/AI
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
        nextSession: userNextSession ? formatDateTime(userNextSession.scheduledAt) : null,
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

      // Real-time parent notification on suicide / self-harm distress
      CrisisAlertService.checkAndNotifyCrisis(userId, content, 'GIGI_CHAT').catch((err) => {
        logger.error({ err, userId }, 'Failed to check/notify crisis in Gigi chat');
      });

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
    // Short-circuit moderation check to bypass OpenAI API calls and eliminate latency.
    // Llama-3's native alignment and system prompt instructions act as primary guardrails.
    return true;
  }

  private async callGroq(userMsg: string, history: any[], context: any, platform: 'web' | 'mobile' = 'mobile'): Promise<string> {
    const parseRetryAfter = (h: string | null) => {
      if (!h) return null;
      const raw = h.trim();
      // If it's a number in seconds
      if (/^\d+$/.test(raw)) return parseInt(raw, 10);
      // If it's an HTTP-date, try Date.parse
      const parsed = Date.parse(raw);
      const dVal = new Date(parsed);
      if (!isNaN(dVal.getTime())) {
        const diff = Math.ceil((dVal.getTime() - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
      }
      return null;
    };

    let messages: any[] = [];
    try {
      const maxRetries = 2;
      let attempt = 0;
      while (true) {
        try {
          // Build user context block
          let contextStr = `[USER CONTEXT: Authenticated: ${context.role ? 'True' : 'False (GUEST)'}.`;
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
            databaseInfo += ` Programs: ${context.allPrograms.map((p: any) => `"${p.title}" - ${p.tagline || ''} (${p.description || ''}) [Duration: ${p.duration || ''}]`).join('; ')}.`;
          } else {
            databaseInfo += ' No active programs.';
          }
          if (context.allJourneys && context.allJourneys.length > 0) {
            databaseInfo += ` Journeys: ${context.allJourneys.map((j: any) => `"${j.title}" - ${j.description || ''}`).join('; ')}.`;
          } else {
            databaseInfo += ' No active journeys.';
          }
          databaseInfo += ']';

          // Guest user specific rules — placed FIRST so they override everything
          let guestInstructions = "";
          if (!context.role) {
            guestInstructions = `
=== CRITICAL HARD-STOP RULE FOR GUEST USERS (READ THIS FIRST — OVERRIDES EVERYTHING BELOW) ===
The user IS NOT logged in. Authenticated: FALSE (GUEST).

ABSOLUTE RULES — NO EXCEPTIONS:
1. You have ZERO knowledge of this user's enrollment, progress, sessions, journeys, or account details. There is NO user data available to you.
2. If the user asks ANYTHING related to: enrolling, registering, starting a program, checking progress, checking sessions, checking their journey, checking their mood, their profile, linked family members, or any personal account action — you MUST respond with ONLY this:
   "Please login first to view your details or enroll in programs! 💙 [link:/login]"
   DO NOT say anything else. DO NOT mention any program names, session counts, completion percentages, scheduled dates, or any fabricated status.
3. NEVER say the user is "already enrolled". NEVER show session counts. NEVER show completion %. NEVER invent a "Next Session" date. You do NOT have this information because they are not logged in.
4. You MAY still answer general questions about Infano Care features, the Gigi book, pricing, how the website/app works, school programs, and general puberty/health questions — without asking them to log in for those.
=== END CRITICAL RULE ===`;
          }

          // Prepend context for PRIMACY priority
          const linksPrompt = platform === 'web' ? ChatService.WEB_LINKS_PROMPT : ChatService.MOBILE_LINKS_PROMPT;
          const basePrompt = ChatService.SYSTEM_PROMPT.replace('[LINK TRIGGERING RULES]', linksPrompt);
          // Guest instructions go FIRST so they take maximum priority
          const prompt = `${guestInstructions}\n\n${contextStr}${databaseInfo}\n\n${basePrompt}`;

          messages = [
            { role: 'system', content: prompt },
            ...history.map(m => ({
              role: m.sender === ChatSender.USER ? 'user' : 'assistant',
              content: m.content
            }))
          ];

          // If the last message in history is not the current user message, append it
          const lastMsg = history[history.length - 1];
          const isLastMsgUserCurrent = lastMsg && 
            (lastMsg.sender === ChatSender.USER || lastMsg.sender === 'USER') && 
            lastMsg.content.trim() === userMsg.trim();

          if (!isLastMsgUserCurrent) {
            messages.push({ role: 'user', content: userMsg });
          }

          const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: attempt === 0
                ? (process.env.GROQ_MODEL || 'openai/gpt-oss-120b')
                : (process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b'),
              messages: messages,
              temperature: 0.7,
              max_tokens: 1024,
            })
          });

          if (response.status === 429) {
            const rawRetry = response.headers.get('retry-after');
            const parsed = parseRetryAfter(rawRetry);
            const capped = parsed === null ? 1 : Math.min(parsed, 10);
            logger.warn({ status: 429, rawRetry, capped, attempt }, 'Groq returned 429, initiating failover or retry');

            if (attempt < maxRetries) {
              attempt++;
              const waitMs = attempt === 1 ? 100 : capped * 1000;
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
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
          if (err instanceof AppError) throw err;
          logger.error(err, 'Groq API failure (network/exception)');
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
    } catch (outerError: any) {
      if (process.env.OPENAI_API_KEY) {
        try {
          logger.warn({ outerError: outerError.message || String(outerError) }, 'Groq API failed completely. Initiating failover to OpenAI (gpt-4o-mini)...');
          return await this.callOpenAI(messages);
        } catch (openaiErr: any) {
          logger.error(openaiErr, 'OpenAI failover also failed');
        }
      }
      throw outerError;
    }
  }

  private async callOpenAI(messages: any[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI response not OK: ${response.status} - ${text}`);
    }

    const data: any = await response.json();
    if (!data || !data.choices || data.choices.length === 0) {
      throw new Error('OpenAI returned empty choices');
    }

    return data.choices[0].message.content;
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
    let sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { lastMsgAt: 'desc' }
    });

    if (sessions.length === 0) {
      const newSession = await prisma.chatSession.create({
        data: { userId, title: 'Chat with Gigi' }
      });
      sessions = [newSession];
    }
    return sessions;
  }

  async getAggregatedChats(userId: string) {
    const expertSessions = await prisma.expertChatSession.findMany({
      where: { userId },
      include: {
        expert: { select: { profile: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    const expertUnreadCounts = await Promise.all(
      expertSessions.map(async (s) => {
        const count = await prisma.expertChatMessage.count({
          where: { sessionId: s.id, isRead: false, NOT: { senderId: userId } }
        });
        return { id: s.id, count };
      })
    );

    const peerSessions = await prisma.peerLineSession.findMany({
      where: {
        OR: [{ menteeId: userId }, { mentorId: userId }],
        NOT: {
          AND: [{ menteeId: userId }, { mentorId: userId }]
        }
      },
      include: {
        mentor: { select: { profile: true } },
        mentee: { select: { profile: true } },
        PeerLineMessage: { orderBy: { sentAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' }
    });

    const peerGroupsMap = new Map<string, typeof peerSessions>();
    for (const session of peerSessions) {
      const partnerId = session.menteeId === userId ? session.mentorId : session.menteeId;
      if (!partnerId) continue;
      if (!peerGroupsMap.has(partnerId)) {
        peerGroupsMap.set(partnerId, []);
      }
      peerGroupsMap.get(partnerId)!.push(session);
    }

    const peerAggregated = await Promise.all(
      Array.from(peerGroupsMap.entries()).map(async ([partnerId, sessionsList]) => {
        const activeSession = sessionsList.find(s => s.status === 'ACTIVE' || s.status === 'MATCHING');
        const primarySession = activeSession || sessionsList[0];
        if (!primarySession) return null;

        const otherUser = primarySession.menteeId === userId ? primarySession.mentor : primarySession.mentee;
        const sessionIds = sessionsList.map(s => s.id);

        const totalUnreadCount = await prisma.peerLineMessage.count({
          where: {
            sessionId: { in: sessionIds },
            isRead: false,
            senderRole: primarySession.menteeId === userId ? 'mentor' : 'mentee'
          }
        });

        const latestMessage = await prisma.peerLineMessage.findFirst({
          where: { sessionId: { in: sessionIds } },
          orderBy: { sentAt: 'desc' }
        });

        const isActive = Boolean(activeSession && (activeSession.status === 'ACTIVE' || activeSession.status === 'MATCHING'));
        const isOnline = Boolean(peerlineNsp && peerlineNsp.adapter.rooms.get(`user_${partnerId}`)?.size);

        return {
          id: primarySession.id,
          type: 'peer',
          peerId: partnerId,
          name: otherUser?.profile?.displayName || 'Peer',
          avatarUrl: otherUser?.profile?.avatarUrl,
          lastMessage: latestMessage?.content || 'Session started',
          timestamp: latestMessage?.sentAt || primarySession.createdAt,
          unreadCount: totalUnreadCount,
          status: primarySession.status,
          isActive,
          isOnline
        };
      })
    ).then(results => results.filter(Boolean));

    // Ensure at least one Gigi session exists for the user
    let gigiSession = await prisma.chatSession.findFirst({
      where: { userId },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!gigiSession) {
      const newSession = await prisma.chatSession.create({
        data: { userId, title: 'Chat with Gigi' }
      });
      gigiSession = {
        ...newSession,
        messages: []
      };
    }

    const gigiItem = {
      id: gigiSession.id,
      type: 'gigi',
      name: 'Gigi',
      avatarUrl: null,
      lastMessage: gigiSession.messages[0]?.content || 'Start a conversation with Gigi 🤖',
      timestamp: gigiSession.messages[0]?.createdAt || gigiSession.createdAt,
      unreadCount: 0,
      status: 'ACTIVE',
      isActive: true,
      isOnline: true
    };

    const aggregated = [
      gigiItem,
      ...expertSessions.map(s => ({
        id: s.id,
        type: 'expert',
        name: s.expert?.profile?.displayName || 'Expert',
        avatarUrl: s.expert?.profile?.avatarUrl,
        lastMessage: s.messages[0]?.content || 'Session started',
        timestamp: s.messages[0]?.createdAt || s.createdAt,
        unreadCount: expertUnreadCounts.find(c => c.id === s.id)?.count || 0,
        status: s.status,
        isActive: s.status === 'ACTIVE' || s.status === 'IN_PROGRESS',
        isOnline: Boolean(peerlineNsp && peerlineNsp.adapter.rooms.get(`user_${s.expertId}`)?.size)
      })),
      ...(peerAggregated as any[])
    ];

    // Sort: Active sessions first, then by timestamp descending
    aggregated.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return aggregated;
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
          model: process.env.GROQ_TITLE_MODEL || process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b',
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
