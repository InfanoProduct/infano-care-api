import { z } from 'zod';

export const requestSessionSchema = z.object({
  body: z.object({
    topicIds: z.array(z.string()).min(1).max(2),
    requestVerified: z.boolean().optional(),
  }),
});

export const sessionFeedbackSchema = z.object({
  body: z.object({
    role: z.enum(['mentee', 'mentor']),
    rating: z.number().min(1).max(5),
    note: z.string().max(200).optional(),
    mentorSelfRating: z.number().min(1).max(5).optional(),
    wellbeingOk: z.boolean().optional(),
    needsSupport: z.boolean().optional(),
    readyForNext: z.boolean().optional(),
    flagForModeration: z.boolean().optional(),
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

export type RequestSessionInput = z.infer<typeof requestSessionSchema>['body'];
export type SessionFeedbackInput = z.infer<typeof sessionFeedbackSchema>['body'];
export type MentorAvailabilityInput = z.infer<typeof mentorAvailabilitySchema>['body'];
