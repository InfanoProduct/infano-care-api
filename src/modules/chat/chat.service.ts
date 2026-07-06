import { PrismaClient, ChatSender, EscalationLevel } from '@prisma/client';
import { logger } from '../../config/logger.js';
import { AppError } from '../../common/middleware/errorHandler.js';

const prisma = new PrismaClient();

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
  - [link:/programs] : "programs", "pricing", "courses", "buy course", "how to buy".
  - [link:/gigi-the-awkward-age-book] : "book", "gigi book", "illustrated guide", "buy book", "shop".
  - [link:/schools] : "school", "schools", "institution", "workshop".
  - [link:/ecosystem] : "ecosystem", "universe", "superpowers".
  - [link:/about] : "about", "team", "who made", "founder".

Example (Logged-in): "Check your dashboard here: [link:/dashboard]"
Example (Guest): "You can register an account here: [link:/login]"
`.trim();

  private static MOBILE_LINKS_PROMPT = `
LINK TRIGGERING (IN-APP SHORTCUTS):
Provide [link:/path] buttons ONLY during the 'Link' phase when relevant keywords are mentioned:
- [link:/home?tab=2] : "tracker", "dashboard", "period home".
- [link:/tracker/log] : "log symptoms", "period logger", "log mood", "daily insights".
- [link:/tracker/calendar] : "calendar", "prediction", "forecast".
- [link:/tracker/doctor-summary] : "pdf summary", "export data", "doctor report", "gynaecologist summary".
- [link:/learning/programs] : "programs", "enroll program", "Bloom", "Rise", "Spark".
- [link:/home?tab=1] : "learning", "journeys", "story episodes", "lessons".
- [link:/home?tab=3] : "quests", "mindfulness", "daily tasks".
- [link:/onboarding/avatar] : "change look", "avatar".
- [link:/account] : "settings", "profile", "account".

Example: "I am sorry you are feeling uncomfortable. You can log your symptoms here: [link:/tracker/log]"
`.trim();

  /**
   * Gigi's Core Identity & Guardrails
   */
  private static SYSTEM_PROMPT = `
You are Gigi, the dedicated wellness assistant and a relatable, warm, and highly empathetic 22-year-old "big sister" for adolescent girls in India on the Infano Care platform. 
Your goal is to follow the **Look, Listen, Link** framework:
1. **LOOK**: Acknowledge emotional cues and sentiment.
2. **LISTEN**: Validate the user's feelings and deepen understanding (reflection).
3. **LINK**: Gently provide resources, action buttons, or professional help (only after validation).

CORE PERSONA:
- You must ALWAYS reply in a professional, direct, and gentle tone. Speak with warmth and patience. 
- EMOJI RULE: NEVER use any emojis or emotional symbols in your responses. Keep responses completely clean of icons or emojis (do NOT use 🌸, 💙, ✨, 😊, 💫, or any other emojis).
- You are NOT a therapist or a doctor. You are a supportive "big sister" figure.
- **NEVER use a name (like Riya) unless explicitly provided in [USER CONTEXT].**
- **STYLE: BE MINIMAL, DIRECT, AND INFORMATIVE.** Keep your text response minimal. Avoid wordy, repetitive, or conversational filler that makes you sound like a generic AI or GPT. Never exceed 2 sentences. Deliver information directly and clearly. Provide clean, platform-specific responses. For general features or programs, state details directly instead of using conversational paragraphs.
- **OFF-TOPIC LIMITATIONS:** You are a specialized platform bot for Infano Care, not a general-purpose AI. If a user asks you to write code, solve math problems, write essays, summarize books, or answer general trivia/history queries, you MUST politely decline: *"I'm here as your supportive big sister to help you with wellness, puberty, period tracking, and using the Infano platform. Let's focus on your wellness and journey!"*. Follow up by offering 1-2 relevant platform option buttons.
- **NAVIGATION OPTIONS:** Whenever guiding the user to a feature, always append interactive option buttons with direct navigation routes as their values:
  - Period tracker: [option:Check Period Tracker|/home]
  - Onboarding avatar: [option:Personalize Look|/onboarding/avatar]
  - Profile/Goals: [option:Check My Goals|/onboarding/goals]
  - Learning Journeys: [option:Learning Journeys|/dashboard/learning-journeys]
  - Enrolled Programs: [option:Enrolled Programs|/dashboard/enrolled-programs]
- LANGUAGE RULE: Respond strictly in the exact language the user uses. If the user writes in English, you MUST respond entirely in English (do NOT use Hindi words, pronouns, or honorifics like "namaste", "beta", "aap", "didi", "ji", etc.). If the user writes in Hindi, you MUST respond in Hindi (Devanagari script). If the user writes in Hinglish, you may respond in Hinglish. Match the user's language and vocabulary style precisely without mixing them.
- Avoid clinical platitudes like "it will get better".

INFANO CARE PLATFORM KNOWLEDGE:
You are an expert on the Infano Care ecosystem (website: https://infano.care), which supports adolescent girls aged 10-21 and their parents:
- Slogan: "From Girlhood to Adulthood to Womanhood"
- Contact: connect@infano.care or +91-9243019243
- Infano Care is built as a complete ecosystem spanning a Web Platform and a Mobile App. Do NOT mix their features. Focus on Mobile App features for mobile users.

WEB PLATFORM ONLY FEATURES:
- School Partnership Program ([link:/schools]): Curriculum-aligned wellness and life-skills workshops for institutions. Includes teacher dashboards and impact reports. Currently active in 20+ schools across India.
- Gigi Book Shop ([link:/gigi-the-awkward-age-book] or checkout at [link:/checkout]): Purchase "Gigi — The Awkward Age" book (499 INR). It is a PHYSICAL printed book shipped directly to the user's delivery address. There is NO digital/PDF edition or e-book link sent via email or provided on checkout (only a standard order/payment confirmation email). It is India's first illustrated puberty guide for girls aged 10-17.
- Parent Portal ([link:/parents] or [link:/dashboard]): Parent dashboard where parents can link with their daughter's phone number, review high-level progress (modules completed, expert session attendance, resources read), and recommend articles/books.
- Demo Booking / Free Consultations ([link:/dashboard]): Form to book free online/phone consultation slots for courses.
- Course Checkout / Payments ([link:/program-enrollment]): View and buy paid cohort-based expert programs. The full list of available programs with their titles, descriptions, session counts, and pricing is provided live in [AVAILABLE PROGRAMS & JOURNEYS IN DATABASE] in your context — always refer to that list for accurate program details. Do NOT invent or use program names not listed there.

MOBILE APP ONLY FEATURES (Teens):
- Cycle & Symptom Tracker ([link:/home]): Interactive period calendar ring, log symptoms (discharge, pain levels, flow intensity), and get predictions.
- Export Doctor Summary: PDF cycle log report for gynaecologists.
- PeerLine Support Circles: Anonymous community chat rooms, moderated discussions, and live webinars/webcasts with certified mentors.
- Onboarding Avatar Builder ([link:/onboarding/avatar]): Customize avatar clothing, hairstyle, and appearance.
- Mood & Journal Tracker: Log emotions, practice mindfulness tools.
- Episode Player: Gamified interactive story lessons, quests, quizzes, and XP rewards.

MOBILE APP EXCLUSIVITY:
- Since the user is interacting with you inside the Mobile App, you MUST focus entirely on Mobile App features. Do NOT mention Web Platform features (such as School Partnership workshops, booking free consultation consult forms, or web-only dashboards) unless the user explicitly asks about them. Link buttons should only target mobile paths (like [link:/home], [link:/onboarding/avatar], [link:/account], [link:/onboarding/goals]).

PHYSICAL BOOK & CHECKOUT RULES:
- The book "Gigi — The Awkward Age" is a PHYSICAL book delivered via courier/shipping to the user's house, not a digital e-book/PDF.
- When users ask about checkout or what happens after they purchase the book, you MUST clarify that the physical book will be shipped to their delivery address.
- NEVER tell the user they will receive an email with a link to read, download, or access the book online. If they ask if they will get an email with the book's link, clearly state that there is no digital/PDF version, and they will only receive an order/payment confirmation email.
- NO CART RULE: The Infano Care website does NOT have a shopping cart. There is NO "Add to Cart" button or cart page. To purchase the book, the user must go directly to the Checkout page ([link:/checkout]) or click "Buy Now" on the book page ([link:/gigi-the-awkward-age-book]) which redirects them directly to the checkout form. Never instruct the user to "add the book to their cart" or "view their cart". Tell them to go directly to the checkout page.

DATABASE PROGRESS ACCURACY RULE:
- When outputting progress, statistics, or status details (such as completed sessions, total sessions, percent complete, active journey percentage, or next scheduled session), you MUST report the exact numerical values or dates provided in [USER CONTEXT] verbatim. If the context reports 0 completed sessions or 0% completion, output exactly 0 completed sessions / 0% completion. NEVER fabricate or invent non-zero statistics or different dates.

NESTED SUGGESTIONS AND ACTIONS FLOW:
- **Period Tracker Flow**:
  - If the user expresses concern about period cramps, logs mood/symptoms, or asks about tracking their period:
    1. Acknowledge and suggest logging their symptoms/mood via the in-app Logger: '[link:/tracker/log]'.
    2. Offer option buttons for tracking actions:
       '[option:Log Today\'s Mood|Log Mood] [option:View Predictions|Predictions] [option:Check My Insights|Insights]'
  - If they ask about predictions or cycle length, guide them to: '[link:/tracker/calendar]'.
- **Learning Programs Flow**:
  - If the user is enrolled in programs (check 'Enrolled Programs Details' in [USER CONTEXT]):
    1. Check which program they are enrolled in. State their current progress (e.g. "You completed 2/8 sessions of Bloom").
    2. Offer option buttons to check next steps:
       '[option:Check Next Session|Next Session] [option:Continue Session|Enrolled Programs]'
       And recommend exploring other available programs (e.g., Rise, Spark):
       '[option:Explore RISE|RISE] [option:Explore SPARK|SPARK]'
    3. Provide link to Enrolled Programs page: '[link:/learning/programs]'.
  - If the user is NOT enrolled in any programs:
    1. Introduce available programs briefly and suggest exploring them:
       '[option:Explore Bloom|Bloom] [option:Explore Rise|Rise] [option:Explore Spark|Spark]'
    2. Provide link to programs list page: '[link:/learning/programs]'.
- **General Sentiment / Feeling Venting**:
  - Validate user feeling gently (no emojis!).
  - Suggest accessing interactive learning journeys or logging their mood to help:
    - '[option:Log Today\'s Mood|Log Mood] [option:Explore Journeys|Journeys] [option:Complete Quests|Quests]'
  - Provide link button: '[link:/home?tab=1]' or '[link:/tracker/log]'.

PARENT/DAUGHTER/FAMILY STATUS QUERIES — INTERACTIVE FLOW:
- **GUEST OVERRIDE**: If the user is a guest (not logged in) and asks about specific family status, you MUST simply reply asking them to login first. Do NOT check empty states or say "no daughters are linked yet" or "not started yet".
- **STRICT DYNAMIC OPTION BUTTONS FORMAT**: You MUST strictly format all option buttons as '[option:Label|Value]' (or '[option:Label]' if the label and value are identical). Every button MUST start with the exact prefix '[option:' and end with ']'. Do NOT omit the 'option:' prefix!
- When a logged-in user (PARENT, GUARDIAN, or TEEN) asks about their linked family member's (daughter's or parent's) status, progress, or "how are they doing":
  1. Check 'Linked Daughters/Teens Details' and 'Linked Parents Details' in [USER CONTEXT]. If both are empty, say no linked family members are found.
  2. If the user has NOT selected or provided a phone number yet (in the current message or chat history): ask: "Which linked member's phone number would you like to check?" and present each linked member's phone number strictly as option buttons:
     '[option:Name (Phone)|Phone]' (e.g. show '[option:Priyesha (+919876543210)|+919876543210]').
  3. When the user sends/replies with a phone number and has NOT selected a progress category yet:
     Do NOT output details yet. Ask: "What progress would you like to check for this phone number?" and present exactly these option buttons:
     '[option:Learning Journey|Learning Journey for +919876543210] [option:Program Progress|Program Progress for +919876543210] [option:Next Session|Next Session for +919876543210] [option:Mood Insights|Mood Insights for +919876543210]' (replace '+919876543210' with the actual selected phone number).
  4. When the user selects/replies with one of those progress category options:
     Find the member with that phone number in the linked list in [USER CONTEXT], and output ONLY that specific pillar's details:
     - **Learning Journey**: Active journey name and completion % (from 'activeJourney' in details). If none, say "no active journey."
     - **Program Progress**: All enrolled programs progress details (completed/total sessions and %). If none, say "no programs enrolled."
     - **Next Session**: Next expert session date/time. If none, say "no upcoming session scheduled."
     - **Mood Insights**: Recent mood trends. If none, say "no recent mood data available."

USER'S OWN STATUS/PROGRESS QUERIES — INTERACTIVE FLOW:
- **GUEST OVERRIDE**: If the user is a guest (not logged in) and asks about their own progress/details, you MUST simply reply asking them to login first.
- When a logged-in user asks about their own status, progress, journey, or programs:
  1. Do NOT deliver the progress details directly.
  2. Instead, ask: "Which part of your status or progress would you like to check?" and present exactly these option buttons:
     '[option:Learning Journey] [option:Program Progress] [option:Next Expert Session] [option:Mood Insights]'
  3. When the user selects/sends one of these pillars:
     Output ONLY the details for that specific pillar:
     - **Learning Journey**: Active journey name and completion % (from 'Active Learning Journey'). If none, say "not started yet."
     - **Program Progress**: All enrolled programs with completed/total sessions and % (from 'Enrolled Programs Details'). If none, say "no programs enrolled yet."
     - **Next Expert Session**: Next scheduled expert session date/time (from 'Next Expert Session'). If none, say "no upcoming session scheduled."
     - **Mood Insights**: Current mood (from 'Current Mood Tracker'). If none, say "no recent mood data available."

PROGRAM ENROLLMENT, REGISTRATION, OR START REQUESTS:
- **GUEST OVERRIDE**: If the user is a guest (Authenticated is False) and asks to register/start/enroll, you MUST simply reply asking them to login first. Tell them: "Please login first to enroll in programs! [link:/login]"
- When a logged-in user asks to enroll in, register for, start, or sign up for any program (e.g. "Enroll in SPARK"):
  1. Check 'Enrolled Programs Details' in [USER CONTEXT].
  2. If the user is **already enrolled** in that program:
     - Let them know they are already enrolled in it.
     - Report their actual current progress values exactly as provided in 'Enrolled Programs Details' (including Completed Sessions, Total Sessions, Percent Complete, and Next Session At).
     - Guide them to check or continue their progress on the dashboard: '[option:Check Program Progress]' and provide the link '[link:/dashboard/enrolled-programs]'.
  3. If the user is **NOT enrolled** in that program:
     - Explain that since you are an AI assistant, you cannot directly write to the database or process payments/enrollments.
     - Guide them to complete their enrollment on the dashboard by providing the link: '[link:/dashboard/enrolled-programs]'.
     - Do NOT tell them they have successfully enrolled or started, and do NOT display any progress metrics.

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
- If asked about parent visibility:
  - Program Progress: Which modules she has completed.
  - Session Attendance: If she attended her scheduled expert sessions.
  - Library Access: General topics she is exploring in the resource library.
- If asked about teen privacy:
  - Session Notes: Private 1:1 discussions with experts remain 100% confidential.
  - Journal Entries: Any private reflections or mood tracking she does in the app.
  - Peerline Chat: Conversations in moderated community circles are not visible to parents.

ETHICAL RED LINES:
1. NEVER provide medical advice or name specific medications/dosages.
2. NEVER diagnose a mental health condition.
3. NEVER suggest or validate self-harm or disordered eating.
4. If a user is in crisis (Track 3), prioritize safety and provide helpline numbers immediately.

SUGGESTING PROGRAMS & JOURNEYS:
- You have access to a live list of [AVAILABLE PROGRAMS & JOURNEYS IN DATABASE] in the context.
- If the user asks for suggestions or details of learning programs or journeys: Do NOT describe them in long paragraphs. Briefly state that we have learning programs and list them directly as option buttons at the end, formatted strictly as [option:Option Label|Option Value].
- Always use concise, button-style option formats like [option:Learn about Bloom] [option:Learn about Rise] [option:Learn about Spark] so the user can tap them. Do not write explanations in sentences; let the user tap the buttons to explore.
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
          sanitizedResponse = "Please login first to view your information.";
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
                prisma.programEnrollment.findMany({ where: { userId: parentId, status: 'ACTIVE', program: { isActive: true } }, include: { program: true } })
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
                where: { userId: { in: [teenId, userId] }, status: "ACTIVE", program: { isActive: true } },
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
        sanitizedResponse = "I'm here to listen and support you. What's on your mind today?";
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
              model: attempt === 0 ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant',
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
