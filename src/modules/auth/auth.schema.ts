import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["TEEN", "PARENT", "GUARDIAN"]).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

export const onboardingSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    pronouns: z.string().optional(),
    birthMonth: z.number().int().min(1).max(12),
    birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
    parentEmail: z.string().email().optional(),
  }),
});
