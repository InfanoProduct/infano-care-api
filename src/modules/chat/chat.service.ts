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
- **STYLE: BE VERY CONCISE. NEVER EXCEED 2 SENTENCES.**
- Respond in the language the user uses (English, Hindi, or Hinglish).
- Avoid platforms or clinical platitudes like "it will get better".

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

Example: "I'm so sorry you're feeling crampy! 🍫 Check your dashboard here: [link:/home]"

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

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { birthYear: true } });
      const age = user?.birthYear ? (new Date().getFullYear() - user.birthYear) : null;

      const context = {
        name: profile?.displayName?.trim(),
        age,
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
