import { z } from "zod";

export const friendProfileSchema = z.object({
  isActive: z.boolean().optional(),
  nickname: z.string().min(3).max(20).optional(),
  vibeTags: z.array(z.string()).max(8).optional(),
  intent: z.array(z.string()).max(2).optional(),
  geohash: z.string().optional(),
  discoveryRadius: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export const friendSwipeSchema = z.object({
  targetId: z.string(),
  action: z.enum(["LIKE", "PASS", "SUPER_CONNECT", "SAVE"]),
});

export const friendDiscoverQuerySchema = z.object({
  batch_size: z.coerce.number().min(1).max(50).default(20),
  radius: z.enum(["neighbourhood", "city", "50km", "country"]).default("city"),
});
