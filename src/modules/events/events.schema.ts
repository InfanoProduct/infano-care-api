import { z } from 'zod';

export const submitQuestionSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(300),
    isAnonymous: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const eventReminderSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});
