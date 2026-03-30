import { z } from "zod";

export const dailyLogSchema = z.object({
  body: z.object({
    date: z.string().datetime(),
    isRetroactive: z.boolean().optional().default(false),
    
    // Period Flow
    flow: z.enum(["none", "light", "medium", "heavy", "spotting", "ended"]).optional(),
    
    // Symptoms
    crampIntensity: z.number().int().min(1).max(5).optional(),
    symptoms: z.array(z.string()).optional().default([]),
    
    // Mood
    moodPrimary: z.string().optional(),
    moodSecondary: z.array(z.string()).max(2).optional().default([]),
    
    // Wellbeing
    energyLevel: z.number().int().min(1).max(5).optional(),
    sleepQuality: z.number().int().min(1).max(5).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    
    // Lifestyle
    nutritionTags: z.array(z.string()).optional().default([]),
    activityTags: z.array(z.string()).optional().default([]),
    
    // Private Notes
    noteText: z.string().max(150).optional(),
    hasVoiceNote: z.boolean().optional().default(false),
  }),
});

export const trackerSetupSchema = z.object({
  body: z.object({
    lastPeriodStart: z.coerce.date().optional().nullable(),
    lastPeriodEnd: z.coerce.date().optional().nullable(),
    periodLengthDays: z.number().int().min(1).max(14).default(5),
    cycleLengthDays: z.number().int().min(21).max(45).default(28),
    trackerMode: z.enum(["active", "watching_waiting", "irregular_support"]).default("watching_waiting"),
    federatedLearningConsent: z.boolean().optional().default(false),
  }),
});
