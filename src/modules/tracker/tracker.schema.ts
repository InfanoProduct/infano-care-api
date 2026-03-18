import { z } from "zod";

export const dailyLogSchema = z.object({
  body: z.object({
    date: z.string().datetime(),
    flow: z.enum(["NOT_STARTED", "LIGHT", "MEDIUM", "HEAVY", "SPOTTING", "ENDED"]).optional(),
    symptoms: z.array(z.string()).optional(),
    mood: z.string().optional(),
    energy: z.number().int().min(1).max(5).optional(),
    sleepDuration: z.number().optional(),
    notes: z.string().max(150).optional(),
  }),
});
