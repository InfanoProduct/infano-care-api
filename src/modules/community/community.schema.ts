import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Post cannot be empty').max(500, 'Post too long (max 500 characters)'),
    isChallengeResponse: z.boolean().optional(),
    challengeId: z.string().uuid().optional(),
  }),
  params: z.object({
    circleId: z.string().uuid(),
  }),
});

export const createReplySchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Reply cannot be empty').max(280, 'Reply too long (max 280 characters)'),
    parentReplyId: z.string().uuid().optional(),
  }),
  params: z.object({
    postId: z.string().uuid(),
  }),
});

export const reactSchema = z.object({
  body: z.object({
    reaction: z.enum(['heart', 'hug', 'bulb', 'fist']),
    contentType: z.enum(['post', 'reply']),
  }),
  params: z.object({
    contentId: z.string().uuid(),
  }),
});

export const reportSchema = z.object({
  body: z.object({
    category: z.enum(['harmful', 'bullying', 'spam', 'misinformation', 'other']),
    note: z.string().max(200).optional(),
    contentType: z.enum(['post', 'reply']),
  }),
  params: z.object({
    contentId: z.string().uuid(),
  }),
});

export const appealSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'Please provide a reason').max(200, 'Reason too long (max 200 characters)'),
    contentType: z.enum(['post', 'reply']),
  }),
  params: z.object({
    contentId: z.string().uuid(),
  }),
});

export type CreatePostInput = z.infer<typeof createPostSchema>['body'];
export type CreateReplyInput = z.infer<typeof createReplySchema>['body'];
export type ReactInput = z.infer<typeof reactSchema>['body'];
export type ReportInput = z.infer<typeof reportSchema>['body'];
export type AppealInput = z.infer<typeof appealSchema>['body'];
