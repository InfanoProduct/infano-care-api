import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../../db/client.js";

function resolveSeedPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "prisma/seeds/hernext/hernext_seed_all.json"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../prisma/seeds/hernext/hernext_seed_all.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`Could not locate hernext_seed_all.json. Checked: ${candidates.join(", ")}`);
}

export async function seedHerNextCourse(): Promise<{
  courseId: string;
  chapters: number;
  lessons: number;
  activities: number;
  checkins: number;
  badges: number;
  shopItems: number;
}> {
  const seedPath = resolveSeedPath();
  const raw = JSON.parse(fs.readFileSync(seedPath, "utf-8"));

  const c = raw.course;
  await prisma.course.upsert({
    where: { id: c.id },
    update: {
      slug: c.slug || "girlhood-hernext",
      title: c.title,
      description:
        c.description ||
        "A doctor-reviewed, interactive puberty & growing-up foundation course for girls aged 9-14.",
      audience: c.audience,
      videoLanguage: c.video_language || "Hinglish",
      captionLanguage: c.caption_language || "en",
      activityLanguage: c.activity_language || "en",
      chapterCount: c.chapter_count || 4,
      lessonCount: c.lesson_count || 15,
      unlockRule: c.unlock_rule || "sequential",
      parentPreview: c.parent_preview || "all_lessons",
      lessonSteps: c.lesson_steps || ["watch", "play", "discover", "reflect"],
      playUnlockRule: c.play_unlock_rule || { step: "play", requires: "watch", min_watch_percent: 80 },
      certificateConfig: c.certificate || {},
      version: c.version || "2026-11-11",
    },
    create: {
      id: c.id,
      slug: c.slug || "girlhood-hernext",
      title: c.title,
      description:
        c.description ||
        "A doctor-reviewed, interactive puberty & growing-up foundation course for girls aged 9-14.",
      audience: c.audience,
      price: 999,
      mrp: 1998,
      isFree: false,
      isActive: true,
      videoLanguage: c.video_language || "Hinglish",
      captionLanguage: c.caption_language || "en",
      activityLanguage: c.activity_language || "en",
      chapterCount: c.chapter_count || 4,
      lessonCount: c.lesson_count || 15,
      unlockRule: c.unlock_rule || "sequential",
      parentPreview: c.parent_preview || "all_lessons",
      lessonSteps: c.lesson_steps || ["watch", "play", "discover", "reflect"],
      playUnlockRule: c.play_unlock_rule || { step: "play", requires: "watch", min_watch_percent: 80 },
      certificateConfig: c.certificate || {},
      version: c.version || "2026-11-11",
    },
  });

  // Chapters
  for (const ch of raw.chapters) {
    await prisma.courseChapter.upsert({
      where: { id: ch.id },
      update: {
        courseId: c.id,
        number: ch.number,
        worldName: ch.world_name,
        theme: ch.theme,
        sortOrder: ch.sort_order,
        colors: ch.colors || {},
        iconSvgPath: ch.icon_svg_path || "",
        expert: ch.expert || {},
        unlockRequires: ch.unlock?.requires || null,
        calmMode: Boolean(ch.calm_mode),
        contentStatus: ch.content_status || "medical_review_pending",
        images: ch.images || {},
        checkinId: ch.checkin_id || null,
        badgeId: ch.badge_id || null,
      },
      create: {
        id: ch.id,
        courseId: c.id,
        number: ch.number,
        worldName: ch.world_name,
        theme: ch.theme,
        sortOrder: ch.sort_order,
        colors: ch.colors || {},
        iconSvgPath: ch.icon_svg_path || "",
        expert: ch.expert || {},
        unlockRequires: ch.unlock?.requires || null,
        calmMode: Boolean(ch.calm_mode),
        contentStatus: ch.content_status || "medical_review_pending",
        images: ch.images || {},
        checkinId: ch.checkin_id || null,
        badgeId: ch.badge_id || null,
      },
    });
  }

  // Lessons
  for (const l of raw.lessons) {
    await prisma.courseLesson.upsert({
      where: { id: l.id },
      update: {
        code: l.code,
        chapterId: l.chapter_id,
        sortOrder: l.sort_order,
        orderInChapter: l.order_in_chapter,
        title: l.title,
        tagline: l.tagline,
        contentStatus: l.content_status || "medical_review_pending",
        calmMode: Boolean(l.calm_mode),
        unlockRequires: l.unlock?.requires || null,
        freePreview: Boolean(l.free_preview),
        video: l.video || {},
        topics: l.topics || [],
        pauseAndThink: l.pause_and_think || [],
        discoverCards: l.discover_cards || [],
        reflect: l.reflect || {},
        completion: l.completion || {},
        imageIds: l.image_ids || {},
      },
      create: {
        id: l.id,
        code: l.code,
        chapterId: l.chapter_id,
        sortOrder: l.sort_order,
        orderInChapter: l.order_in_chapter,
        title: l.title,
        tagline: l.tagline,
        contentStatus: l.content_status || "medical_review_pending",
        calmMode: Boolean(l.calm_mode),
        unlockRequires: l.unlock?.requires || null,
        freePreview: Boolean(l.free_preview),
        video: l.video || {},
        topics: l.topics || [],
        pauseAndThink: l.pause_and_think || [],
        discoverCards: l.discover_cards || [],
        reflect: l.reflect || {},
        completion: l.completion || {},
        imageIds: l.image_ids || {},
      },
    });
  }

  // Activities
  for (const act of raw.activities) {
    await prisma.courseActivity.upsert({
      where: { id: act.id },
      update: {
        lessonId: act.lesson_id,
        name: act.name,
        estMinutes: act.est_minutes || 3,
        petalsOnComplete: act.petals_on_complete ?? 10,
        engine: act.engine,
        instructions: act.instructions || act.config?.instructions || "",
        config: act.config || {},
      },
      create: {
        id: act.id,
        lessonId: act.lesson_id,
        name: act.name,
        estMinutes: act.est_minutes || 3,
        petalsOnComplete: act.petals_on_complete ?? 10,
        engine: act.engine,
        instructions: act.instructions || act.config?.instructions || "",
        config: act.config || {},
      },
    });
  }

  // Check-ins (4 chapter check-ins + bloom_challenge)
  const checkinsList = [
    ...(raw.checkins?.chapter_checkins || []),
    ...(raw.checkins?.bloom_challenge ? [raw.checkins.bloom_challenge] : []),
  ];
  for (const ck of checkinsList) {
    await prisma.courseCheckin.upsert({
      where: { id: ck.id },
      update: {
        courseId: c.id,
        chapterId: ck.chapter_id || null,
        title: ck.title,
        questionCount: ck.question_count || (ck.questions?.length ?? 10),
        passMark: ck.pass_mark ?? 7,
        timer: Boolean(ck.timer),
        lives: Boolean(ck.lives),
        hintsReducePetals: Boolean(ck.hints_reduce_petals),
        badgeOnPass: ck.badge_on_pass || null,
        perfectScoreBadge: ck.perfect_score_badge || null,
        failTitle: ck.fail_title || "Almost there!",
        reviewLinks: ck.review_links || [],
        questions: ck.questions || [],
      },
      create: {
        id: ck.id,
        courseId: c.id,
        chapterId: ck.chapter_id || null,
        title: ck.title,
        questionCount: ck.question_count || (ck.questions?.length ?? 10),
        passMark: ck.pass_mark ?? 7,
        timer: Boolean(ck.timer),
        lives: Boolean(ck.lives),
        hintsReducePetals: Boolean(ck.hints_reduce_petals),
        badgeOnPass: ck.badge_on_pass || null,
        perfectScoreBadge: ck.perfect_score_badge || null,
        failTitle: ck.fail_title || "Almost there!",
        reviewLinks: ck.review_links || [],
        questions: ck.questions || [],
      },
    });
  }

  // Badges
  for (const b of raw.badges || []) {
    await prisma.courseBadge.upsert({
      where: { id: b.id },
      update: {
        name: b.name,
        type: b.type,
        hiddenUntilEarned: Boolean(b.hidden_until_earned),
        description: b.description,
        rule: b.rule || {},
        sortOrder: b.sort_order ?? 0,
        petalsOnAward: b.petals_on_award ?? 0,
        imageId: b.image_id || null,
        shownToParent: b.shown_to_parent !== false,
        unlocksShopItem: b.unlocks_shop_item || null,
      },
      create: {
        id: b.id,
        name: b.name,
        type: b.type,
        hiddenUntilEarned: Boolean(b.hidden_until_earned),
        description: b.description,
        rule: b.rule || {},
        sortOrder: b.sort_order ?? 0,
        petalsOnAward: b.petals_on_award ?? 0,
        imageId: b.image_id || null,
        shownToParent: b.shown_to_parent !== false,
        unlocksShopItem: b.unlocks_shop_item || null,
      },
    });
  }

  // Shop Items
  for (const item of raw.petals_and_shop?.shop_items || []) {
    await prisma.courseShopItem.upsert({
      where: { id: item.id },
      update: {
        category: item.category,
        name: item.name,
        pricePetals: item.price_petals ?? 0,
        requiresBadgeId: item.requires_badge_id || null,
        freeOnSignup: Boolean(item.free_on_signup),
        placeableInGarden: item.placeable_in_garden !== false,
        imageId: item.image_id || null,
        sortOrder: item.sort_order ?? 0,
        metadata: item,
      },
      create: {
        id: item.id,
        category: item.category,
        name: item.name,
        pricePetals: item.price_petals ?? 0,
        requiresBadgeId: item.requires_badge_id || null,
        freeOnSignup: Boolean(item.free_on_signup),
        placeableInGarden: item.placeable_in_garden !== false,
        imageId: item.image_id || null,
        sortOrder: item.sort_order ?? 0,
        metadata: item,
      },
    });
  }

  // Copy & configuration pools
  const pools: Record<string, any> = {
    petal_rules: raw.petals_and_shop?.petal_rules || [],
    avatar_options: raw.petals_and_shop?.avatar_options || {},
    diary_config: raw.diary || {},
    journal_config: raw.journal || {},
    support_config: raw.support || [],
    app_copy: raw.app_copy || {},
    media_assets: raw.media_assets || {},
  };

  for (const [id, data] of Object.entries(pools)) {
    await prisma.courseCopyPool.upsert({
      where: { id },
      update: { data },
      create: { id, data },
    });
  }

  return {
    courseId: c.id,
    chapters: raw.chapters.length,
    lessons: raw.lessons.length,
    activities: raw.activities.length,
    checkins: checkinsList.length,
    badges: (raw.badges || []).length,
    shopItems: (raw.petals_and_shop?.shop_items || []).length,
  };
}

let autoSeedPromise: Promise<void> | null = null;
export async function ensureCourseSeeded(): Promise<void> {
  const count = await prisma.course.count();
  if (count > 0) return;
  if (!autoSeedPromise) {
    autoSeedPromise = seedHerNextCourse()
      .then(() => undefined)
      .finally(() => {
        autoSeedPromise = null;
      });
  }
  await autoSeedPromise;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  seedHerNextCourse()
    .then((summary) => {
      console.log("✅ Seeded HerNext interactive course:", summary);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Failed to seed HerNext course:", err);
      process.exit(1);
    });
}

