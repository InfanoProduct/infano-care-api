import { z } from 'zod';

// A teen sending a connection request to a specific peer mentor
export const connectRequestSchema = z.object({
  body: z.object({
    mentorId: z.string().uuid(),
    topicIds: z.array(z.string()).optional().default([]),
    message: z.string().max(300).optional(), // Optional intro message
  }),
});

// Keep for backward-compat with existing API consumers
export const requestSessionSchema = z.object({
  body: z.object({
    topicIds: z.array(z.string()).optional().default([]),
    requestVerified: z.boolean().optional(),
    requestedMentorId: z.string().uuid().optional(),
  }),
});

export const sessionFeedbackSchema = z.object({
  body: z.object({
    role: z.enum(['mentee', 'mentor']),
    rating: z.number().min(1).max(5),
    note: z.string().max(200).nullable().optional(),
    mentorSelfRating: z.number().min(1).max(5).nullable().optional(),
    wellbeingOk: z.boolean().nullable().optional(),
    needsSupport: z.boolean().nullable().optional(),
    readyForNext: z.boolean().nullable().optional(),
    flagForModeration: z.boolean().nullable().optional(),
  }),
  params: z.object({
    sessionId: z.string().uuid(),
  }),
});

export const mentorAvailabilitySchema = z.object({
  body: z.object({
    isAvailable: z.boolean(),
  }),
});

export const mentorOnboardSchema = z.object({
  body: z.object({
    topicIds: z.array(z.string()).default([]),
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
  }),
});

export const mentorApplySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(1).optional(),
    personalStatement: z.string().trim().optional(),
    scenarioResponses: z.array(z.string().trim()).optional().default([]),
    topicIds: z.array(z.string()).optional().default([]),
    age: z.number().optional(),
    eligibility: z.record(z.string(), z.boolean()).optional().default({}),
  }),
});

export type ConnectRequestInput = z.infer<typeof connectRequestSchema>['body'];
export type RequestSessionInput = z.infer<typeof requestSessionSchema>['body'];
export type SessionFeedbackInput = z.infer<typeof sessionFeedbackSchema>['body'];
export type MentorAvailabilityInput = z.infer<typeof mentorAvailabilitySchema>['body'];
export type MentorOnboardInput = z.infer<typeof mentorOnboardSchema>['body'];
export type MentorApplyInput = z.infer<typeof mentorApplySchema>['body'];
