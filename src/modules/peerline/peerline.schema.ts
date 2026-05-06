import { z } from 'zod';

export const requestSessionSchema = z.object({
  body: z.object({
    topicIds: z.array(z.string()).min(1).max(2),
    requestVerified: z.boolean().optional(),
    requestedMentorId: z.string().uuid().optional(),
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
    name: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: z.string().trim().min(1),
    personalStatement: z.string().trim().min(50),
    scenarioResponses: z.array(z.string().trim()).length(2),
    eligibility: z.object({
      isOver18: z.boolean(),
      hasLivedExperience: z.boolean(),
      isFluent: z.boolean(),
      isStable: z.boolean(),
      isDigitallyLiterate: z.boolean(),
      canCommit: z.boolean(),
      agreesToVerification: z.boolean(),
    }),
  }),
});

export type RequestSessionInput = z.infer<typeof requestSessionSchema>['body'];
export type SessionFeedbackInput = z.infer<typeof sessionFeedbackSchema>['body'];
export type MentorAvailabilityInput = z.infer<typeof mentorAvailabilitySchema>['body'];
export type MentorOnboardInput = z.infer<typeof mentorOnboardSchema>['body'];
export type MentorApplyInput = z.infer<typeof mentorApplySchema>['body'];
