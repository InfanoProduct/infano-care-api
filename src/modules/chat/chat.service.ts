import { PrismaClient, ChatSender, EscalationLevel } from '@prisma/client';
import { logger } from '../../config/logger.js';

const prisma = new PrismaClient();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_MODERATION_URL = 'https://api.openai.com/v1/moderations';

export class ChatService {
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
- When a PARENT or GUARDIAN asks about their daughter's status, progress, or "how is she doing":
  1. Check 'Linked Daughters/Teens Details' in [USER CONTEXT]. If empty, warmly say no daughters are linked yet.
  2. If multiple daughters exist and the parent hasn't specified, list them and ask which one.
  3. Once the daughter is known (or if only one exists), ALWAYS deliver ALL FOUR of these in one response — do NOT ask follow-up questions first:
     📚 **Learning Journey**: Her active journey name and completion % (from 'activeJourney' in her teen details).
     🎯 **Program Progress**: All her enrolled programs, e.g. "SPARK: 2/8 sessions (25%)" (from 'enrolledPrograms' in her teen details). If none, mention "no programs enrolled yet."
     📅 **Next Session**: Her next scheduled expert session date/time (from 'nextSession' in her teen details). If none, say "no upcoming session scheduled."
     💙 **Mood Insights**: Her recent mood trend from 'recentMoods' in a warm, supportive way. If no moods logged, say "no recent mood data available."

USER'S OWN STATUS QUERIES:
- When ANY user asks about their own status, progress, journey, or programs:
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
`.trim();

  /**
   * Main entry point for processing a user message
   */
  async processMessage(userId: string, content: string, sessionId?: string, moodCode?: string) {
    try {
      // 1. Layer 1: Pre-Input Moderation (OpenAI)
      const isSafe = await this.checkModeration(content);
      if (!isSafe) {
        return this.handleUnsafeInput(userId, content, sessionId);
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

      // Get all linked user IDs (parents if user is teen, teens if user is parent/guardian)
      const userLinks = await prisma.parentLink.findMany({
        where: {
          OR: [
            { parentId: userId },
            { teenId: userId }
          ],
          status: "LINKED"
        }
      });
      const linkedUserIds = userLinks
        .map(link => link.parentId === userId ? link.teenId : link.parentId)
        .filter(Boolean) as string[];
      
      const userFamilyIds = [userId, ...linkedUserIds];

      // Fetch current user's own program progress (including linked family members to share enrollments)
      const userEnrollments = await prisma.programEnrollment.findMany({
        where: { userId: { in: userFamilyIds }, status: "ACTIVE" },
        include: { program: true }
      });
      const userProgramsMap = new Map();
      for (const enrollment of userEnrollments) {
        userProgramsMap.set(enrollment.programId, enrollment.program);
      }
      const userProgramsProgress = [];
      for (const [programId, program] of userProgramsMap.entries()) {
        const totalSessions = program.sessions || 8;
        const completedSessions = await prisma.expertSessionSchedule.count({
          where: {
            userId: { in: userFamilyIds },
            programId: programId,
            status: "COMPLETED"
          }
        });
        const percentComplete = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
        const nextProgSession = await prisma.expertSessionSchedule.findFirst({
          where: {
            userId: { in: userFamilyIds },
            programId: programId,
            scheduledAt: { gte: new Date() },
            status: "SCHEDULED"
          },
          orderBy: { scheduledAt: "asc" }
        });
        userProgramsProgress.push({
          programTitle: program.title,
          completedSessions,
          totalSessions,
          percentComplete,
          nextSessionAt: nextProgSession ? nextProgSession.scheduledAt : null
        });
      }

      // Fetch current user's active journey progress (latest UserProgress)
      const userActiveProgress = await prisma.userProgress.findFirst({
        where: {
          userId: userId,
          episode: {
            journey: {
              slug: { not: "peerline-mentor-certification" }
            }
          }
        },
        orderBy: { updatedAt: "desc" },
        include: {
          episode: {
            include: {
              journey: true
            }
          }
        }
      });

      let userActiveJourney = null;
      if (userActiveProgress && userActiveProgress.episode && userActiveProgress.episode.journey) {
        const journeyId = userActiveProgress.episode.journeyId;
        const totalEpisodes = await prisma.episode.count({ where: { journeyId } });
        const completedEpisodes = await prisma.userProgress.count({
          where: {
            userId: userId,
            episode: { journeyId },
            completed: true
          }
        });
        const percentComplete = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
        userActiveJourney = {
          name: userActiveProgress.episode.journey.title,
          percentComplete
        };
      }

      // Fetch current user's next expert session
      const userNextSession = await prisma.expertSessionSchedule.findFirst({
        where: {
          userId: userId,
          scheduledAt: { gte: new Date() },
          status: "SCHEDULED"
        },
        orderBy: { scheduledAt: "asc" }
      });

      let teenStatuses: any[] = [];
      if (user && (user.role === 'PARENT' || user.role === 'GUARDIAN')) {
        const linkedTeens = await prisma.parentLink.findMany({
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

        for (const link of linkedTeens) {
          if (!link.teen) continue;
          const teenId = link.teen.id;

          // Fetch active journey progress (latest UserProgress)
          const activeProgress = await prisma.userProgress.findFirst({
            where: {
              userId: teenId,
              episode: {
                journey: {
                  slug: { not: "peerline-mentor-certification" }
                }
              }
            },
            orderBy: { updatedAt: "desc" },
            include: {
              episode: {
                include: {
                  journey: true
                }
              }
            }
          });

          let activeJourney = null;
          if (activeProgress && activeProgress.episode && activeProgress.episode.journey) {
            const journeyId = activeProgress.episode.journeyId;
            const totalEpisodes = await prisma.episode.count({ where: { journeyId } });
            const completedEpisodes = await prisma.userProgress.count({
              where: {
                userId: teenId,
                episode: { journeyId },
                completed: true
              }
            });
            const percentComplete = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
            activeJourney = {
              name: activeProgress.episode.journey.title,
              percentComplete
            };
          }

          // Fetch next expert session
          const nextSession = await prisma.expertSessionSchedule.findFirst({
            where: {
              userId: teenId,
              scheduledAt: { gte: new Date() },
              status: "SCHEDULED"
            },
            orderBy: { scheduledAt: "asc" }
          });

          // Fetch 30-day mood logs
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentLogs = await prisma.cycleLog.findMany({
            where: {
              userId: teenId,
              date: { gte: thirtyDaysAgo }
            },
            orderBy: { date: "desc" },
            select: { date: true, moodPrimary: true }
          });

          const moods = recentLogs.map(l => l.moodPrimary).filter(Boolean);

          // Fetch teen's program progress (sharing with parent userId)
          const teenEnrollments = await prisma.programEnrollment.findMany({
            where: { userId: { in: [teenId, userId] }, status: "ACTIVE" },
            include: { program: true }
          });
          const teenProgramsMap = new Map();
          for (const enrollment of teenEnrollments) {
            teenProgramsMap.set(enrollment.programId, enrollment.program);
          }
          const teenProgramsProgress = [];
          for (const [programId, program] of teenProgramsMap.entries()) {
            const totalSessions = program.sessions || 8;
            const completedSessions = await prisma.expertSessionSchedule.count({
              where: {
                userId: { in: [teenId, userId] },
                programId: programId,
                status: "COMPLETED"
              }
            });
            const percentComplete = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
            const nextProgSession = await prisma.expertSessionSchedule.findFirst({
              where: {
                userId: { in: [teenId, userId] },
                programId: programId,
                scheduledAt: { gte: new Date() },
                status: "SCHEDULED"
              },
              orderBy: { scheduledAt: "asc" }
            });
            teenProgramsProgress.push({
              programTitle: program.title,
              completedSessions,
              totalSessions,
              percentComplete,
              nextSessionAt: nextProgSession ? nextProgSession.scheduledAt : null
            });
          }

          teenStatuses.push({
            name: link.teen.profile?.displayName || link.teen.username || "Daughter",
            phone: link.teen.phone,
            activeJourney,
            nextSession: nextSession ? nextSession.scheduledAt : null,
            recentMoods: moods.slice(0, 5),
            enrolledPrograms: teenProgramsProgress
          });
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
        cyclePhase: cycle?.currentPhase,
        cycleDay: cycle?.currentCycleDay,
        goals: personalization?.goals,
        mood: moodCode
      };

      const gigiResponse = await this.callGroq(content, history, context);

      // 5. Layer 3: Post-LLM Output Filter & Distress Level update
      const sanitizedResponse = this.sanitizeOutput(gigiResponse);

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
    try {
      const response = await fetch(OPENAI_MODERATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ input: text })
      });

      const data = await response.json() as any;
      if (data.error) {
        logger.error(data.error, 'Moderation API error, failing open:');
        return true;
      }
      return !data.results[0].flagged;
    } catch (error) {
      logger.error(error as any, 'Moderation API failure, failing open:');
      return true; // Fail open to prevent blocking application
    }
  }

  private async callGroq(userMsg: string, history: any[], context: any) {
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
      if (context.cyclePhase) contextStr += ` Current Cycle Phase: ${context.cyclePhase} (Day ${context.cycleDay || '?'}).`;
      if (context.goals && context.goals.length > 0) contextStr += ` Focus/Goals: ${context.goals.join(', ')}.`;
      if (context.mood) contextStr += ` Current Mood Tracker: ${context.mood}.`;
      contextStr += ']';

      // Prepend context for PRIMACY priority
      const prompt = `${contextStr}\n\n${ChatService.SYSTEM_PROMPT}`;

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

      const data = await response.json() as any;
      if (data.error) {
        logger.error({ error: data.error }, 'Groq API returned an error');
        throw new Error(`Groq API error: ${data.error.message || 'Unknown API error'}`);
      }
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Groq returned empty response');
      }
      return data.choices[0].message.content;
    } catch (error) {
      logger.error(error as any, 'Groq API failure:');
      throw new Error('Gigi is currently taking a short break. Please try again in a few minutes.');
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

  private async handleUnsafeInput(userId: string, content: string, sessionId?: string) {
    // Log escalation for dangerous input
    await prisma.escalationEvent.create({
      data: {
        userId,
        sessionId,
        level: EscalationLevel.LEVEL_3,
        reason: 'Safety moderation triggered on user input',
      }
    });

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
