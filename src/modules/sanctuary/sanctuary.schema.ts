import { z } from 'zod';

export const createCommunitySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  iconEmoji: z.string().default('🌸'),
  bannerUrl: z.string().url().optional(),
  accentColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/).default('#6D28D9'),
  audience: z.enum(['TEEN', 'PARENT']),
  minAge: z.number().int().min(5).max(100).optional(),
  maxAge: z.number().int().min(5).max(100).optional(),
});

export const createRoomSchema = z.object({
  name: z.string().min(2).max(60),
  topic: z.string().max(250).optional(),
  type: z.enum(['TOPIC_ROOM', 'VOICE_LOUNGE', 'WHISPER_ROOM', 'STORY_THREAD', 'GREENHOUSE_STAGE', 'ANNOUNCEMENT']).default('TOPIC_ROOM'),
  isPrivate: z.boolean().default(false),
  allowAnonymous: z.boolean().default(false),
  hasScreenshotDRM: z.boolean().default(false),
});

export const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  isAnonymous: z.boolean().default(false),
  parentMessageId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
});

export const reactSchema = z.object({
  reaction: z.enum(['HUG', 'HELPFUL', 'WARMTH', 'SPARKLE']),
});

export const createStoryThreadSchema = z.object({
  title: z.string().min(2).max(100),
  prompt: z.string().min(5).max(300),
  maxLines: z.number().int().min(5).max(50).default(15),
});

export const appendStoryLineSchema = z.object({
  lineText: z.string().min(1).max(280),
});

export const createWhisperQuestionSchema = z.object({
  content: z.string().min(5).max(1000),
});

export const createWhisperPeerNoteSchema = z.object({
  noteText: z.string().min(1).max(500),
});

export const sproutCheckinSchema = z.object({
  contextTag: z.string().optional(),
  userResponse: z.string().optional(),
});

export const sendTrellisLetterSchema = z.object({
  receiverMotherId: z.string().uuid(),
  message: z.string().min(1).max(1000),
  cardTemplateId: z.string().optional(),
});
