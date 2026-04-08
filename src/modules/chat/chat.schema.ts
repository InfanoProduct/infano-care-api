import { z } from 'zod';

export const chatRequestSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
    sessionId: z.string().uuid().optional(),
    moodCode: z.string().optional(),
  })
});

export type ChatRequest = z.infer<typeof chatRequestSchema>['body'];

export const historyRequestSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
  })
});
