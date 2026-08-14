import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

// ─── Prompt Bank Seed Data ────────────────────────────────────────────────────
export const PROMPT_BANK = [
  // ── Guided Reflection ──────────────────────────────────────────────────────
  {
    category: "Daily Reflection",
    text: "How are you feeling about your day so far?",
    bestModes: ["guided_prompt", "free_write"],
    options: [
      "🌟 Peaceful & balanced",
      "⚡ Energized & productive",
      "🧘 Calmer than yesterday",
      "😴 A bit tired / overwhelmed",
      "🌧️ Needing some quiet rest",
      "✨ Grateful & hopeful"
    ]
  },
  {
    category: "Daily Reflection",
    text: "What was the highlight or best moment of your day today?",
    bestModes: ["guided_prompt", "free_write"],
    options: [
      "💬 A sweet conversation with someone",
      "☕ Enjoying a quiet warm drink",
      "🎯 Completing a personal goal or task",
      "☀️ Spending time outdoors in fresh air",
      "🎨 Doing something fun & creative",
      "💖 Feeling loved, seen & supported"
    ]
  },
  {
    category: "Daily Reflection",
    text: "What helped you handle a challenging or tough moment today?",
    bestModes: ["guided_prompt", "free_write"],
    options: [
      "🧘 Taking slow, deep breaths",
      "🎧 Listening to comforting music",
      "🤝 Talking it out with a trusted friend",
      "🚶 Taking a short walk & stepping away",
      "💜 Being patient & gentle with myself",
      "☀️ Reminding myself this feeling will pass"
    ]
  },
  {
    category: "Daily Reflection",
    text: "What is something you appreciate about yourself today?",
    bestModes: ["guided_prompt", "free_write"],
    options: [
      "💖 My kindness and care towards others",
      "🛡️ My strength & resilience under pressure",
      "🧠 My open mind & willingness to learn",
      "🌸 My positive attitude despite hurdles",
      "🏃 My dedication and energy",
      "🎨 My unique creativity & perspective"
    ]
  },
  {
    category: "Daily Reflection",
    text: "What is a personal intention or focus for tomorrow?",
    bestModes: ["guided_prompt", "free_write"],
    options: [
      "🌊 Prioritize peace and mental calm",
      "🏃 Move my body & stay energized",
      "🎯 Stay focused on one key priority",
      "💖 Practice extra self-care & rest",
      "💬 Connect deeply with a friend",
      "📱 Disconnect early from screen time"
    ]
  },
  {
    category: "Daily Reflection",
    text: "What made you feel connected to others today?",
    bestModes: ["guided_prompt", "free_write"],
    options: [
      "🤗 A warm hug or thoughtful gesture",
      "😂 Sharing a genuine laugh together",
      "💬 Having a deep, meaningful chat",
      "💌 Receiving an encouraging message",
      "🌟 Helping someone when they needed it",
      "🤝 Feeling heard & truly understood"
    ]
  },
  {
    category: "Gratitude",
    text: "Name 3 good things that happened today, big or tiny.",
    bestModes: ["free_write", "guided_prompt"],
    options: [
      "🌟 Grateful for tiny small wins today",
      "☀️ Took time to rest and recharge",
      "💖 Felt really supported by someone",
      "🎯 Made progress on my personal goals",
      "🌿 Learned something new & brave",
      "✨ Smiling about a sweet moment"
    ]
  },
  {
    category: "Gratitude",
    text: "Who made you smile today? What did they do?",
    bestModes: ["free_write", "letter_mode", "guided_prompt"],
    options: [
      "😊 A close friend shared a laugh",
      "💌 A family member checked in",
      "👩‍🏫 A mentor gave warm encouragement",
      "🐕 A cute pet or animal",
      "🌟 A kind stranger made my day",
      "💬 Got a sweet, unexpected text"
    ]
  },
  {
    category: "Friendship",
    text: "Was there a hard moment with a friend today? How did you handle it?",
    bestModes: ["free_write", "voice_note", "guided_prompt"],
    options: [
      "🤝 Talked it out calmly",
      "⏳ Took space to cool down",
      "💬 Expressed how I felt clearly",
      "🫂 Listened to their point of view",
      "💜 Forgave and moved forward",
      "📝 Decided to reflect before talking"
    ]
  },
  {
    category: "Big Feelings",
    text: "What's the strongest feeling you had today? Where did you feel it in your body?",
    bestModes: ["free_write", "voice_note", "guided_prompt"],
    options: [
      "💓 Warmth/racing in my chest",
      "🦋 Butterflies/tightness in tummy",
      "🧠 Mind buzzing with thoughts",
      "😴 Heavy or tired shoulders",
      "✨ Light & joyful energy",
      "🌧️ Feeling quiet & reflective"
    ]
  },
  {
    category: "Dreams & Goals",
    text: "What's something you want to try before the year ends?",
    bestModes: ["free_write", "guided_prompt"],
    options: [
      "🎨 Start a creative hobby or art",
      "✈️ Travel or visit somewhere new",
      "📚 Read a great book or learn a skill",
      "👥 Make new friends & connect",
      "🎯 Hit a personal goal",
      "🌟 Step out of my comfort zone"
    ]
  },
  {
    category: "Silly & Fun",
    text: "If today was a snack, which snack would it be and why?",
    bestModes: ["free_write", "doodle", "guided_prompt"],
    options: [
      "🍩 Sweet & delightful",
      "🌶️ Spicy & full of surprises",
      "🥨 Crunchy & busy",
      "🍵 Warm & comforting",
      "🍿 Light & fun to share",
      "🍋 Sour then sweet"
    ]
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────
export class JournalService {
  // ─── Entries ────────────────────────────────────────────────────────────────

  static async createEntry(userId: string, dto: {
    mode: string;
    content: any;
    promptId?: string;
    moodTag?: string;
    moodColor?: string;
    title?: string;
    isSealedTimeCapsule?: boolean;
    capsuleRevealDate?: string;
    visibility?: string;
    linkedLearningEpisodeId?: string;
  }) {
    const streak = await this.getOrCreateStreak(userId);

    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        mode: dto.mode as any,
        content: dto.content,
        promptId: dto.promptId ?? null,
        moodTag: dto.moodTag ?? null,
        moodColor: dto.moodColor ?? null,
        title: dto.title ?? null,
        isSealedTimeCapsule: dto.isSealedTimeCapsule ?? false,
        capsuleRevealDate: dto.capsuleRevealDate ? new Date(dto.capsuleRevealDate) : null,
        visibility: (dto.visibility as any) ?? "private",
        linkedLearningEpisodeId: dto.linkedLearningEpisodeId ?? null,
        pointsAwarded: 0,
      },
      include: { prompt: true },
    });

    // Update streak
    await this._updateStreak(userId, streak, dto.mode);

    // Trigger quest evaluation
    try {
      const { QuestService } = await import("../quest/quest.service.js");
      await QuestService.evaluateCompletion(userId, { type: "journal_entry_created" });
    } catch (e) {
      console.error("[JOURNAL] Quest evaluation failed:", e);
    }

    return entry;
  }

  static async listEntries(userId: string, params: {
    page?: number;
    limit?: number;
    mode?: string;
    from?: string;
    to?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: any = { userId, isDeleted: false };
    if (params.mode) where.mode = params.mode;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { prompt: true },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return { entries, total, page, limit, pages: Math.ceil(total / limit) };
  }

  static async getEntry(userId: string, id: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, userId, isDeleted: false },
      include: { prompt: true },
    });
    if (!entry) throw new AppError("Entry not found", 404);
    return entry;
  }

  static async updateEntry(userId: string, id: string, dto: Partial<{
    content: any;
    moodTag: string;
    moodColor: string;
    title: string;
    isSealedTimeCapsule: boolean;
    capsuleRevealDate: string;
    visibility: string;
  }>) {
    const existing = await prisma.journalEntry.findFirst({ where: { id, userId, isDeleted: false } });
    if (!existing) throw new AppError("Entry not found", 404);

    return prisma.journalEntry.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.moodTag !== undefined && { moodTag: dto.moodTag }),
        ...(dto.moodColor !== undefined && { moodColor: dto.moodColor }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.isSealedTimeCapsule !== undefined && { isSealedTimeCapsule: dto.isSealedTimeCapsule }),
        ...(dto.capsuleRevealDate !== undefined && { capsuleRevealDate: dto.capsuleRevealDate ? new Date(dto.capsuleRevealDate) : null }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility as any }),
      },
      include: { prompt: true },
    });
  }

  static async deleteEntry(userId: string, id: string) {
    const existing = await prisma.journalEntry.findFirst({ where: { id, userId, isDeleted: false } });
    if (!existing) throw new AppError("Entry not found", 404);
    return prisma.journalEntry.update({ where: { id }, data: { isDeleted: true } });
  }

  // ─── Prompts ─────────────────────────────────────────────────────────────────

  static async getDailyPrompt(userId?: string) {
    const prompts = await prisma.journalPrompt.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    if (prompts.length === 0) return null;

    let answeredPromptIds: string[] = [];
    if (userId) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayEntries = await prisma.journalEntry.findMany({
        where: {
          userId,
          isDeleted: false,
          createdAt: { gte: startOfDay },
        },
        select: { promptId: true },
      });

      answeredPromptIds = todayEntries
        .map((e) => e.promptId)
        .filter((id): id is string => Boolean(id));
    }

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );

    // Pick the first active prompt starting from today's index that hasn't been answered today
    for (let i = 0; i < prompts.length; i++) {
      const candidate = prompts[(dayOfYear + i) % prompts.length];
      if (candidate && !answeredPromptIds.includes(candidate.id)) {
        return candidate;
      }
    }

    return null;
  }

  static async getRandomPrompt(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    const prompts = await prisma.journalPrompt.findMany({ where });
    if (prompts.length === 0) return null;
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  static async getAllPrompts() {
    return prisma.journalPrompt.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  }

  // ─── Streak ──────────────────────────────────────────────────────────────────

  static async getStreak(userId: string) {
    return this.getOrCreateStreak(userId);
  }

  static async getOrCreateStreak(userId: string) {
    const existing = await prisma.journalStreak.findUnique({ where: { userId } });
    if (existing) return existing;
    return prisma.journalStreak.create({ data: { userId } });
  }

  private static async _updateStreak(userId: string, streak: any, mode: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = streak.lastEntryDate ? new Date(streak.lastEntryDate) : null;
    if (lastDate) lastDate.setHours(0, 0, 0, 0);

    const isToday = lastDate?.getTime() === today.getTime();
    const isYesterday = lastDate?.getTime() === today.getTime() - 86400000;

    let newStreak = streak.currentStreak;
    if (!isToday) {
      newStreak = isYesterday ? streak.currentStreak + 1 : 1;
    }

    const modesUsed = streak.modesUsed.includes(mode)
      ? streak.modesUsed
      : [...streak.modesUsed, mode];

    await prisma.journalStreak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, streak.longestStreak),
        lastEntryDate: isToday ? streak.lastEntryDate : new Date(),
        totalEntries: { increment: 1 },
        modesUsed,
      },
    });
  }

  // ─── Mood Weather ─────────────────────────────────────────────────────────────

  static async getMoodWeather(userId: string, months: number = 3) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const entries = await prisma.journalEntry.findMany({
      where: { userId, isDeleted: false, createdAt: { gte: since } },
      select: { createdAt: true, moodColor: true, moodTag: true, mode: true, content: true },
      orderBy: { createdAt: "asc" },
    });

    const modeColorMap: Record<string, string> = {
      guided_prompt: '#7C3AED',
      free_write: '#EC4899',
      mood_color: '#F59E0B',
      voice_note: '#EF4444',
      video_diary: '#EC4899',
      photo_board: '#0D9488',
      blackout_poetry: '#1E1B4B',
      doodle: '#F59E0B',
    };

    const modeTagMap: Record<string, string> = {
      guided_prompt: '💡 Guided Prompt',
      free_write: '✏️ Free Write',
      mood_color: '🎨 Mood Canvas',
      voice_note: '🎙️ Voice Reflection',
      video_diary: '🎬 Video Story',
      photo_board: '📸 Photo Board',
      blackout_poetry: '✒️ Blackout Poetry',
      doodle: '🎨 Doodle',
    };

    const heatmap: Record<string, { color: string; tag: string }> = {};

    for (const e of entries) {
      const year = e.createdAt.getFullYear();
      const month = String(e.createdAt.getMonth() + 1).padStart(2, '0');
      const day = String(e.createdAt.getDate()).padStart(2, '0');
      
      const localKey = `${year}-${month}-${day}`;
      const isoKey = e.createdAt.toISOString().slice(0, 10);

      let color = e.moodColor;
      let tag = e.moodTag;

      if (!color && e.mode === 'mood_color' && e.content && typeof e.content === 'object') {
        const contentObj = e.content as any;
        const colors = contentObj.colors as string[] | undefined;
        if (colors && colors.length > 0) color = colors[0] ?? null;
        if (!tag && contentObj.label) tag = String(contentObj.label);
      }

      color = color || modeColorMap[e.mode] || '#7C3AED';
      tag = tag || modeTagMap[e.mode] || 'Journal Entry';

      const item = { color, tag };
      heatmap[localKey] = item;
      heatmap[isoKey] = item;
    }

    return heatmap;
  }

  // ─── Time Capsules ────────────────────────────────────────────────────────────

  static async getTimeCapsules(userId: string) {
    const today = new Date();
    const [sealed, revealed] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { userId, isDeleted: false, isSealedTimeCapsule: true, capsuleRevealDate: { gt: today } },
        orderBy: { capsuleRevealDate: "asc" },
        select: { id: true, createdAt: true, capsuleRevealDate: true, mode: true, title: true },
      }),
      prisma.journalEntry.findMany({
        where: { userId, isDeleted: false, isSealedTimeCapsule: true, capsuleRevealDate: { lte: today } },
        orderBy: { capsuleRevealDate: "desc" },
        include: { prompt: true },
      }),
    ]);
    return { sealed, revealed };
  }

  // ─── On This Day ──────────────────────────────────────────────────────────────

  static async getOnThisDay(userId: string) {
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();

    // Find entries from same month+day in past years
    const entries = await prisma.journalEntry.findMany({
      where: { userId, isDeleted: false },
      include: { prompt: true },
    });

    return entries.filter(e => {
      const d = new Date(e.createdAt);
      const yearDiff = today.getFullYear() - d.getFullYear();
      return yearDiff >= 1 && d.getMonth() === month && d.getDate() === day;
    });
  }

  // ─── Share to Community ────────────────────────────────────────────────────────

  static async shareToCommunity(userId: string, entryId: string, options: {
    circleId?: string;
    caption?: string;
    isAnonymous?: boolean;
  }) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id: entryId, userId, isDeleted: false },
    });
    if (!entry) throw new AppError("Journal entry not found", 404);

    // Update entry visibility
    await prisma.journalEntry.update({
      where: { id: entryId },
      data: { visibility: "shared_to_connect" },
    });

    // Find default circle if none specified
    let targetCircleId = options.circleId;
    if (!targetCircleId) {
      const circle = await prisma.communityCircle.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      targetCircleId = circle?.id;
    }

    if (!targetCircleId) throw new AppError("No active community circle found to share to", 400);

    const postContent = options.caption?.trim() || `Shared a ${entry.mode.replace('_', ' ')} journal entry 📖✨`;

    // Create CommunityPost
    const post = await prisma.communityPost.create({
      data: {
        circleId: targetCircleId,
        authorId: userId,
        content: postContent,
        status: "APPROVED",
        publishedAt: new Date(),
        journalEntryId: entry.id,
        journalData: {
          id: entry.id,
          mode: entry.mode,
          moodColor: entry.moodColor,
          moodTag: entry.moodTag,
          content: entry.content,
          title: entry.title,
          createdAt: entry.createdAt,
        },
      },
    });

    // Trigger quest evaluation
    try {
      const { QuestService } = await import("../quest/quest.service.js");
      await QuestService.evaluateCompletion(userId, { type: "journal_entry_created" });
    } catch (e) {
      console.error("[JOURNAL] Quest evaluation failed on share:", e);
    }

    return { success: true, postId: post.id, circleId: targetCircleId };
  }

  // ─── Seed ─────────────────────────────────────────────────────────────────────

  static async seedPrompts() {
    const existing = await prisma.journalPrompt.count();
    if (existing > 0) {
      console.log(`[JOURNAL] Prompt bank already seeded (${existing} prompts). Skipping.`);
      return;
    }
    await prisma.journalPrompt.createMany({
      data: PROMPT_BANK.map((p, i) => ({
        category: p.category,
        text: p.text,
        bestModes: p.bestModes as any[],
        options: p.options || [],
        isActive: true,
        sortOrder: i,
      })),
    });
    console.log(`[JOURNAL] Seeded ${PROMPT_BANK.length} prompts ✅`);
  }
}
